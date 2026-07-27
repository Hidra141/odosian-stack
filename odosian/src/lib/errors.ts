import { NextResponse } from "next/server";
import { AIError } from "./ai";

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function aiErrorResponse(e: unknown, fallbackMessage: string): NextResponse {
  if (e instanceof AIError) {
    const status =
      e.statusCode === 429 ? 429 :
      e.statusCode === 503 ? 503 :
      e.statusCode === 401 || e.statusCode === 403 ? 502 :
      e.statusCode >= 500 ? 503 :
      500;
    return errorResponse(e.message, status);
  }
  return errorResponse(
    e instanceof Error ? e.message : fallbackMessage,
    500,
  );
}
