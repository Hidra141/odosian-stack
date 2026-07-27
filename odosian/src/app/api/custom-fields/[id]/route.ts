import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { customFieldUpdateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const PUT = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const existing = await prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!existing) return errorResponse("Custom field not found", 404);

    const validated = await validateRequest(customFieldUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const field = await prisma.customFieldDefinition.update({
      where: { id },
      data: validated.data,
    });

    logAudit({
      userId: request.user.id,
      action: "CUSTOM_FIELD_UPDATED",
      targetType: "custom_field",
      targetId: id,
      details: { fieldName: field.fieldName },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ field });
  } catch (e) {
    console.error("Failed to update custom field:", e);
    return errorResponse("Failed to update custom field", 500);
  }
});

export const DELETE = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const existing = await prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!existing) return errorResponse("Custom field not found", 404);

    await prisma.ruleCustomField.deleteMany({ where: { fieldName: existing.fieldName } });
    await prisma.customFieldDefinition.delete({ where: { id } });

    logAudit({
      userId: request.user.id,
      action: "CUSTOM_FIELD_DELETED",
      targetType: "custom_field",
      targetId: id,
      details: { fieldName: existing.fieldName, label: existing.label },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Custom field deleted" });
  } catch (e) {
    console.error("Failed to delete custom field:", e);
    return errorResponse("Failed to delete custom field", 500);
  }
});
