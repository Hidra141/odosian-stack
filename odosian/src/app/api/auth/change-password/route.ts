import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { changePasswordSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const PUT = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const validation = await validateRequest(changePasswordSchema, request);
    if ("error" in validation) return validation.error;
    const { oldPassword, newPassword } = validation.data;

    const userWithPassword = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { password: true },
    });

    if (!userWithPassword) {
      return errorResponse("User not found", 404);
    }

    const oldValid = await comparePassword(
      oldPassword,
      userWithPassword.password
    );
    if (!oldValid) {
      return errorResponse("Current password is incorrect", 401);
    }

    const hashedNew = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: request.user.id },
      data: { password: hashedNew },
    });

    await logAudit({
      userId: request.user.id,
      action: "SETTINGS_CHANGE",
      targetType: "user",
      targetId: request.user.id,
      details: { field: "password" },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (e) {
    console.error("Change password error:", e);
    return errorResponse("Internal server error", 500);
  }
});
