import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";
import {
  generateVerificationToken,
  getTokenExpiry,
  sendVerificationEmail,
} from "@/lib/email";

export const POST = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    const verificationToken = generateVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry: getTokenExpiry(),
      },
    });

    const emailSent = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    return NextResponse.json({
      emailSent,
      message: emailSent
        ? "Verification email sent. Please check your inbox."
        : "Could not send email — check server logs for the verification link.",
    });
  } catch (e) {
    console.error("Resend verification error:", e);
    return errorResponse("Internal server error", 500);
  }
});
