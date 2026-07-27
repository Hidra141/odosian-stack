import { prisma } from "./prisma";
import { v4 as uuidv4 } from "uuid";

interface AuditParams {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: params.userId,
        action: params.action,
        targetType: params.targetType || "",
        targetId: params.targetId || "",
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress || "",
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
