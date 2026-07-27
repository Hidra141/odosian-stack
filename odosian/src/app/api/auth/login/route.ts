import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { loginSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(loginSchema, request);
    if ("error" in validation) return validation.error;
    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        emailVerified: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    if (!user.isActive) {
      return errorResponse("Account has been deactivated", 401);
    }

    // Email verification check disabled
    // if (!user.emailVerified) {
    //   return errorResponse(
    //     "Please verify your email address before logging in. Check your inbox for the verification link.",
    //     403
    //   );
    // }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      return errorResponse(
        `Account is locked. Try again in ${remainingMin} minute(s).`,
        423
      );
    }

    const passwordValid = await comparePassword(password, user.password);
    const ip = getClientIp(request);

    if (!passwordValid) {
      const newAttempts = user.failedAttempts + 1;
      const updateData: Record<string, unknown> = {
        failedAttempts: newAttempts,
      };

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        targetType: "user",
        targetId: user.id,
        details: { attempt: newAttempts },
        ipAddress: ip,
      });

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        return errorResponse(
          "Account locked due to too many failed attempts. Try again in 15 minutes.",
          423
        );
      }

      return errorResponse("Invalid credentials", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      targetType: "user",
      targetId: user.id,
      ipAddress: ip,
    });

    dispatchWebhookEvent("user.login", { userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    });

    setAuthCookie(response, token);
    return response;
  } catch (e) {
    console.error("Login error:", e);
    return errorResponse("Internal server error", 500);
  }
}
