import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);
const COOKIE_NAME = "odosian_token";

const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
];

async function isTokenValid(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);

  if (PUBLIC_API_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!token || !(await isTokenValid(token))) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/analyze") || pathname.startsWith("/generate") || pathname.startsWith("/rules") || pathname.startsWith("/mitre") || pathname.startsWith("/projects") || pathname.startsWith("/templates") || pathname.startsWith("/audit-log") || pathname.startsWith("/settings")) {
    if (!token || !(await isTokenValid(token))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/verify") {
    return NextResponse.next();
  }

  if (pathname === "/forgot-password" || pathname === "/reset-password") {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
