import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { webhookUpdateSchema, validateRequest } from "@/lib/validation";
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

export const GET = requireRole("ADMIN")(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) return errorResponse("Webhook not found", 404);

    return NextResponse.json({
      webhook: parseWebhook(webhook as unknown as Record<string, unknown>),
    });
  } catch (e) {
    console.error("Failed to fetch webhook:", e);
    return errorResponse("Failed to fetch webhook", 500);
  }
});

export const PUT = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return errorResponse("Webhook not found", 404);

    const validated = await validateRequest(webhookUpdateSchema, request);
    if ("error" in validated) return validated.error;

    const data: Record<string, unknown> = {};
    if (validated.data.name !== undefined) data.name = validated.data.name;
    if (validated.data.url !== undefined) data.url = validated.data.url;
    if (validated.data.isActive !== undefined) data.isActive = validated.data.isActive;
    if (validated.data.events !== undefined) data.events = JSON.stringify(validated.data.events);
    if (validated.data.headers !== undefined) data.headers = validated.data.headers;
    if (validated.data.secret !== undefined) data.secret = validated.data.secret;

    const webhook = await prisma.webhook.update({ where: { id }, data });

    logAudit({
      userId: request.user.id,
      action: "WEBHOOK_UPDATED",
      targetType: "webhook",
      targetId: id,
      details: { name: webhook.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      webhook: parseWebhook(webhook as unknown as Record<string, unknown>),
    });
  } catch (e) {
    console.error("Failed to update webhook:", e);
    return errorResponse("Failed to update webhook", 500);
  }
});

export const DELETE = requireRole("ADMIN")(async (request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return errorResponse("Webhook not found", 404);

    await prisma.webhook.delete({ where: { id } });

    logAudit({
      userId: request.user.id,
      action: "WEBHOOK_DELETED",
      targetType: "webhook",
      targetId: id,
      details: { name: existing.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "Webhook deleted" });
  } catch (e) {
    console.error("Failed to delete webhook:", e);
    return errorResponse("Failed to delete webhook", 500);
  }
});
