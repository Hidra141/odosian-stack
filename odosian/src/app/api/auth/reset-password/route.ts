import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema, validateRequest } from "@/lib/validation";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(resetPasswordSchema, request);
    if ("error" in validation) return validation.error;
    const { token, newPassword } = validation.data;

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
      select: { id: true, resetTokenExpiry: true },
    });

    if (!user) {
      return errorResponse("Invalid or expired reset token", 400);
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      });
      return errorResponse("Reset token has expired. Please request a new one.", 400);
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (e) {
    console.error("Reset password error:", e);
    return errorResponse("Failed to reset password", 500);
  }
}
