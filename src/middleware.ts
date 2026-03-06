import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCsrfToken, csrfCookieHeader, COOKIE_NAME } from "@/lib/csrf";

const GLOBAL_RATE_LIMIT = 300;
const globalCounts = new Map<string, { count: number; resetAt: number }>();

function getClientId(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export function middleware(request: NextRequest) {
  const key = getClientId(request);
  const now = Date.now();
  const windowMs = 60 * 1000;
  let entry = globalCounts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    globalCounts.set(key, entry);
  }
  entry.count++;
  if (entry.count > GLOBAL_RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-Request-Id", crypto.randomUUID?.() ?? String(Date.now()));

  if (process.env.CSRF_PROTECTION !== "0" && !request.cookies.get(COOKIE_NAME)) {
    res.cookies.set(COOKIE_NAME, generateCsrfToken(), {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  }
  return res;
}
