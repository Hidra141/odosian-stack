import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { projectRuleSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const GET = authenticate(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return errorResponse("Project not found", 404);

    const projectRules = await prisma.projectRule.findMany({
      where: { projectId: id },
      include: {
        rule: {
          select: {
            id: true, title: true, severity: true, status: true,
            language: true, ruleType: true, riskScore: true, createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      rules: projectRules.map((pr) => pr.rule),
    });
  } catch (e) {
    console.error("Failed to fetch project rules:", e);
    return errorResponse("Failed to fetch project rules", 500);
  }
});

export const POST = authenticate(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return errorResponse("Project not found", 404);

    const validated = await validateRequest(projectRuleSchema, request);
    if ("error" in validated) return validated.error;

    const rule = await prisma.rule.findUnique({ where: { id: validated.data.ruleId } });
    if (!rule) return errorResponse("Rule not found", 404);

    try {
      await prisma.projectRule.create({
        data: { projectId: id, ruleId: validated.data.ruleId },
      });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        return errorResponse("Rule already in project", 409);
      }
      throw e;
    }

    logAudit({
      userId: request.user.id,
      action: "PROJECT_RULE_ADDED",
      targetType: "project",
      targetId: id,
      details: { ruleId: validated.data.ruleId, ruleTitle: rule.title },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Rule added to project" }, { status: 201 });
  } catch (e) {
    console.error("Failed to add rule to project:", e);
    return errorResponse("Failed to add rule to project", 500);
  }
});

export const DELETE = authenticate(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const url = new URL(request.url);
    const ruleId = url.searchParams.get("ruleId");
    if (!ruleId) return errorResponse("ruleId is required", 400);

    const projectRule = await prisma.projectRule.findUnique({
      where: { projectId_ruleId: { projectId: id, ruleId } },
    });
    if (!projectRule) return errorResponse("Rule not in project", 404);

    await prisma.projectRule.delete({ where: { id: projectRule.id } });

    logAudit({
      userId: request.user.id,
      action: "PROJECT_RULE_REMOVED",
      targetType: "project",
      targetId: id,
      details: { ruleId },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Rule removed from project" });
  } catch (e) {
    console.error("Failed to remove rule from project:", e);
    return errorResponse("Failed to remove rule from project", 500);
  }
});
