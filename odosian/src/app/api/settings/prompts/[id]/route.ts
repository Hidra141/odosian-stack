import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { promptUpdateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const PUT = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };

    const validated = await validateRequest(promptUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const existing = await prisma.prompt.findUnique({ where: { id } });
    if (!existing) return errorResponse("Prompt not found", 404);

    if (validated.data.isDefault) {
      await prisma.prompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        ...validated.data,
        version: existing.version + 1,
      },
    });

    logAudit({
      userId: request.user.id,
      action: "PROMPT_UPDATED",
      targetType: "prompt",
      targetId: id,
      details: { name: prompt.name, version: prompt.version },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ prompt });
  } catch (e) {
    console.error("Failed to update prompt:", e);
    return errorResponse("Failed to update prompt", 500);
  }
});
