import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { webhookCreateSchema, validateRequest } from "@/lib/validation";
import { logAudit, getClientIp } from "@/lib/audit";
import { errorResponse } from "@/lib/errors";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return "••••" + secret.slice(-4);
}

function parseWebhook(w: Record<string, unknown>) {
  const parsed = { ...w };
  parsed.secret = maskSecret(String(parsed.secret || ""));
  for (const field of ["events", "headers"]) {
    if (typeof parsed[field] === "string") {
      try { parsed[field] = JSON.parse(parsed[field] as string); } catch {}
    }
  }
  return parsed;
}

export const GET = requireRole("ADMIN")(async (_request: AuthenticatedRequest) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      webhooks: webhooks.map((w) => parseWebhook(w as unknown as Record<string, unknown>)),
    });
  } catch (e) {
    console.error("Failed to fetch webhooks:", e);
    return errorResponse("Failed to fetch webhooks", 500);
  }
});

export const POST = requireRole("ADMIN")(async (request: AuthenticatedRequest) => {
  try {
    const validated = await validateRequest(webhookCreateSchema, request);
    if ("error" in validated) return validated.error;

    const { events, headers: hdrs, ...rest } = validated.data;

    const webhook = await prisma.webhook.create({
      data: {
        ...rest,
        events: JSON.stringify(events),
        headers: hdrs || "{}",
      },
    });

    logAudit({
      userId: request.user.id,
      action: "WEBHOOK_CREATED",
      targetType: "webhook",
      targetId: webhook.id,
      details: { name: rest.name, url: rest.url },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(
      { webhook: parseWebhook(webhook as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (e) {
    console.error("Failed to create webhook:", e);
    return errorResponse("Failed to create webhook", 500);
  }
});
