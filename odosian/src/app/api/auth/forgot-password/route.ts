import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema, validateRequest } from "@/lib/validation";
import { generateVerificationToken } from "@/lib/email";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(forgotPasswordSchema, request);
    if ("error" in validation) return validation.error;
    const { email } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (user && user.isActive) {
      const resetToken = generateVerificationToken();
      const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      await sendPasswordResetEmail(user.email, user.name, resetToken);
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  }
}
