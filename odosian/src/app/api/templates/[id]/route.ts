import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";

const JSON_FIELDS = ["variables", "tags", "mitreTactics"];

function parseJsonFields(t: Record<string, unknown>) {
  const parsed = { ...t };
  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === "string") {
      try { parsed[field] = JSON.parse(parsed[field] as string); } catch { /* keep string */ }
    }
  }
  return parsed;
}

export const GET = authenticate(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const template = await prisma.ruleTemplate.findUnique({ where: { id } });
    if (!template) return errorResponse("Template not found", 404);

    return NextResponse.json({
      template: parseJsonFields(template as unknown as Record<string, unknown>),
    });
  } catch (e) {
    console.error("Failed to fetch template:", e);
    return errorResponse("Failed to fetch template", 500);
  }
});
