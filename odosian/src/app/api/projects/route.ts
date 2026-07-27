import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { projectCreateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const GET = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { projectRules: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Failed to fetch projects:", e);
    return errorResponse("Failed to fetch projects", 500);
  }
});

export const POST = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const validated = await validateRequest(projectCreateSchema, request);
    if ("error" in validated) return validated.error;

    const project = await prisma.project.create({
      data: {
        ...validated.data,
        ownerId: request.user.id,
      },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { projectRules: true } },
      },
    });

    logAudit({
      userId: request.user.id,
      action: "PROJECT_CREATED",
      targetType: "project",
      targetId: project.id,
      details: { name: project.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error("Failed to create project:", e);
    return errorResponse("Failed to create project", 500);
  }
});
