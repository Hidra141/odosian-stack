import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";

export const GET = authenticate(async (_request: AuthenticatedRequest) => {
  try {
    const [tacticGroups, techniqueGroups] = await Promise.all([
      prisma.mitreMapping.groupBy({ by: ["tacticId"], _count: true }),
      prisma.mitreMapping.groupBy({ by: ["techniqueId"], _count: true }),
    ]);

    const tacticCounts: Record<string, number> = {};
    for (const g of tacticGroups) {
      tacticCounts[g.tacticId] = g._count;
    }

    const techniqueCounts: Record<string, number> = {};
    for (const g of techniqueGroups) {
      techniqueCounts[g.techniqueId] = g._count;
    }

    return NextResponse.json({
      tacticCounts,
      techniqueCounts,
      totalMappings: techniqueGroups.reduce((sum, g) => sum + g._count, 0),
      coveredTactics: tacticGroups.length,
      coveredTechniques: techniqueGroups.length,
    });
  } catch (e) {
    console.error("Failed to fetch MITRE data:", e);
    return errorResponse("Failed to fetch MITRE data", 500);
  }
});
