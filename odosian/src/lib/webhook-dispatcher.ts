import { prisma } from "./prisma";

export async function dispatchWebhookEvent(
  event: string,
  payload: Record<string, unknown>
) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { isActive: true },
    });

    const matching = webhooks.filter((w) => {
      try {
        const events = JSON.parse(w.events) as string[];
        return events.includes(event);
      } catch {
        return false;
      }
    });

    for (const webhook of matching) {
      fireWebhook(webhook, event, payload);
    }
  } catch {
    console.error("Failed to dispatch webhook event:", event);
  }
}

async function fireWebhook(
  webhook: { id: string; url: string; secret: string; headers: string },
  event: string,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

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
  } catch {
    status = 0;
  }

  try {
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastFiredAt: new Date(), lastStatus: status },
    });
  } catch {}
}
