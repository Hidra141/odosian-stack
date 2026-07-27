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

export const GET = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category) where.category = category;

    const templates = await prisma.ruleTemplate.findMany({
      where,
      orderBy: { category: "asc" },
    });

    const categories = [...new Set(templates.map((t) => t.category))].sort();

    return NextResponse.json({
      templates: templates.map((t) => parseJsonFields(t as unknown as Record<string, unknown>)),
      categories,
    });
  } catch (e) {
    console.error("Failed to fetch templates:", e);
    return errorResponse("Failed to fetch templates", 500);
  }
});
