import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";

export const GET = requireRole("ADMIN")(async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const action = url.searchParams.get("action") || "";
    const targetType = url.searchParams.get("targetType") || "";
    const userId = url.searchParams.get("userId") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      where.createdAt = createdAt;
    }

    const [logs, total, actions, targetTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: sortDir },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
      prisma.auditLog.findMany({ distinct: ["targetType"], select: { targetType: true } }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        details: (() => {
          try { return JSON.parse(log.details); } catch { return {}; }
        })(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      filters: {
        actions: actions.map((a) => a.action).filter(Boolean).sort(),
        targetTypes: targetTypes.map((t) => t.targetType).filter(Boolean).sort(),
      },
    });
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return errorResponse("Failed to fetch audit logs", 500);
  }
});
