import { NextResponse } from "next/server";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";

export const GET = authenticate(async (request: AuthenticatedRequest) => {
  return NextResponse.json({ user: request.user });
});
