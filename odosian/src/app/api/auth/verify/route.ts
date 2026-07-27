import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("Verification token is required", 400);
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        verificationTokenExpiry: true,
      },
    });

    if (!user) {
      return errorResponse("Invalid verification token", 400);
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email already verified",
        alreadyVerified: true,
      });
    }

    if (
      user.verificationTokenExpiry &&
      user.verificationTokenExpiry < new Date()
    ) {
      return errorResponse(
        "Verification token has expired. Please request a new one.",
        410
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    await logAudit({
      userId: user.id,
      action: "EMAIL_VERIFIED",
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json({
      message: "Email verified successfully. You can now log in.",
      verified: true,
    });
  } catch (e) {
    console.error("Verify error:", e);
    return errorResponse("Internal server error", 500);
  }
}
