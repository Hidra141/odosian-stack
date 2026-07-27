import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken, clearAuthCookie } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request) {
  const token = getTokenFromRequest(request);
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await logAudit({
        userId: payload.userId,
        action: "LOGOUT",
        targetType: "user",
        targetId: payload.userId,
        ipAddress: getClientIp(request),
      });
    }
  }

  const response = NextResponse.json({ message: "Logged out" });
  clearAuthCookie(response);
  return response;
}
