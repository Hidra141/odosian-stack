import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const POST = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("User not found", 404);

    await prisma.user.update({
      where: { id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    logAudit({
      userId: request.user.id,
      action: "USER_UNLOCKED",
      targetType: "user",
      targetId: id,
      details: { email: user.email },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "User unlocked" });
  } catch (e) {
    console.error("Failed to unlock user:", e);
    return errorResponse("Failed to unlock user", 500);
  }
});
