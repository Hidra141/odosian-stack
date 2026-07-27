import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { userUpdateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  emailVerified: true,
  failedAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { rules: true, analyses: true, projects: true } },
};

export const GET = requireRole("ADMIN")(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) return errorResponse("User not found", 404);
    return NextResponse.json({ user });
  } catch (e) {
    console.error("Failed to fetch user:", e);
    return errorResponse("Failed to fetch user", 500);
  }
});

export const PATCH = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    if (id === request.user.id) {
      return errorResponse("Cannot modify your own account", 400);
    }

    const validated = await validateRequest(userUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse("User not found", 404);

    const user = await prisma.user.update({
      where: { id },
      data: validated.data,
      select: USER_SELECT,
    });

    logAudit({
      userId: request.user.id,
      action: "USER_UPDATED",
      targetType: "user",
      targetId: id,
      details: validated.data,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("Failed to update user:", e);
    return errorResponse("Failed to update user", 500);
  }
});

export const DELETE = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    if (id === request.user.id) {
      return errorResponse("Cannot delete your own account", 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse("User not found", 404);

    await prisma.user.delete({ where: { id } });

    logAudit({
      userId: request.user.id,
      action: "USER_DELETED",
      targetType: "user",
      targetId: id,
      details: { email: existing.email },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "User deleted" });
  } catch (e) {
    console.error("Failed to delete user:", e);
    return errorResponse("Failed to delete user", 500);
  }
});
