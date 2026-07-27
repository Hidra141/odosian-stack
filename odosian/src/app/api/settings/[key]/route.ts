import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { settingUpdateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const PUT = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { key } = await context.params as { key: string };

    const validated = await validateRequest(settingUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) return errorResponse("Setting not found", 404);

    const setting = await prisma.setting.update({
      where: { key },
      data: { value: validated.data.value },
    });

    logAudit({
      userId: request.user.id,
      action: "SETTING_UPDATED",
      targetType: "setting",
      targetId: key,
      details: { oldValue: existing.value, newValue: validated.data.value },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ setting });
  } catch (e) {
    console.error("Failed to update setting:", e);
    return errorResponse("Failed to update setting", 500);
  }
});
