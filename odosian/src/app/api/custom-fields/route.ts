import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { customFieldCreateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

export const GET = requireRole("ADMIN")(async (_request: AuthenticatedRequest) => {
  try {
    const fields = await prisma.customFieldDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      fields: fields.map((f) => {
        const parsed = { ...f } as Record<string, unknown>;
        if (typeof parsed.options === "string") {
          try { parsed.options = JSON.parse(parsed.options as string); } catch {}
        }
        return parsed;
      }),
    });
  } catch (e) {
    console.error("Failed to fetch custom fields:", e);
    return errorResponse("Failed to fetch custom fields", 500);
  }
});

export const POST = requireRole("ADMIN")(async (request: AuthenticatedRequest) => {
  try {
    const validated = await validateRequest(customFieldCreateSchema, request);
    if ("error" in validated) return validated.error;

    try {
      const field = await prisma.customFieldDefinition.create({
        data: validated.data,
      });

      logAudit({
        userId: request.user.id,
        action: "CUSTOM_FIELD_CREATED",
        targetType: "custom_field",
        targetId: field.id,
        details: { fieldName: field.fieldName, label: field.label },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ field }, { status: 201 });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        return errorResponse("A field with this name already exists", 409);
      }
      throw e;
    }
  } catch (e) {
    console.error("Failed to create custom field:", e);
    return errorResponse("Failed to create custom field", 500);
  }
});
