import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { projectUpdateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const GET = authenticate(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        projectRules: {
          include: {
            rule: {
              select: { id: true, title: true, severity: true, status: true, language: true, ruleType: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!project) return errorResponse("Project not found", 404);

    return NextResponse.json({ project });
  } catch (e) {
    console.error("Failed to fetch project:", e);
    return errorResponse("Failed to fetch project", 500);
  }
});

export const PUT = authenticate(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return errorResponse("Project not found", 404);
    if (existing.ownerId !== request.user.id && request.user.role !== "ADMIN") {
      return errorResponse("Not authorized", 403);
    }

    const validated = await validateRequest(projectUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const project = await prisma.project.update({
      where: { id },
      data: validated.data,
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { projectRules: true } },
      },
    });

    logAudit({
      userId: request.user.id,
      action: "PROJECT_UPDATED",
      targetType: "project",
      targetId: id,
      details: validated.data,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ project });
  } catch (e) {
    console.error("Failed to update project:", e);
    return errorResponse("Failed to update project", 500);
  }
});

export const DELETE = authenticate(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return errorResponse("Project not found", 404);
    if (existing.ownerId !== request.user.id && request.user.role !== "ADMIN") {
      return errorResponse("Not authorized", 403);
    }

    await prisma.project.delete({ where: { id } });

    logAudit({
      userId: request.user.id,
      action: "PROJECT_DELETED",
      targetType: "project",
      targetId: id,
      details: { name: existing.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Project deleted" });
  } catch (e) {
    console.error("Failed to delete project:", e);
    return errorResponse("Failed to delete project", 500);
  }
});
