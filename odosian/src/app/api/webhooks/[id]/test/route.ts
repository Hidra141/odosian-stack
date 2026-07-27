import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";

export const POST = requireRole("ADMIN")(async (_request: AuthenticatedRequest, context) => {
  try {
    const { id } = await context.params as { id: string };
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) return errorResponse("Webhook not found", 404);

    const body = JSON.stringify({
      event: "webhook.test",
      payload: { message: "This is a test event from Odosian", webhookId: webhook.id },
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    try {
      const custom = JSON.parse(webhook.headers) as Record<string, string>;
      Object.assign(headers, custom);
    } catch {}

    if (webhook.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      headers["X-Webhook-Signature"] = `sha256=${hex}`;
    }

    let status = 0;
    let responseText = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      status = res.status;
      responseText = await res.text().catch(() => "");
    } catch (e) {
      responseText = e instanceof Error ? e.message : "Connection failed";
    }

    await prisma.webhook.update({
      where: { id },
      data: { lastFiredAt: new Date(), lastStatus: status },
    });

    return NextResponse.json({ status, response: responseText.slice(0, 500) });
  } catch (e) {
    console.error("Failed to test webhook:", e);
    return errorResponse("Failed to test webhook", 500);
  }
});
