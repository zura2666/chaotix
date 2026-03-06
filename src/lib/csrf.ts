/**
 * CSRF protection for state-changing API routes.
 * Cookie-based double submit: cookie `csrf_token` must match header `x-csrf-token` for POST/PUT/DELETE.
 */

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "csrf_token";
const HEADER_NAME = "x-csrf-token";
const CSRF_ENABLED = process.env.CSRF_PROTECTION !== "0" && process.env.NODE_ENV === "production";

function getTokenFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

function getTokenFromHeader(req: NextRequest): string | null {
  const h = req.headers.get(HEADER_NAME);
  return h?.trim() ?? null;
}

/** Returns 403 response if CSRF check fails; null if valid or CSRF disabled. */
export function assertCsrf(req: NextRequest): NextResponse | null {
  if (!CSRF_ENABLED) return null;
  const method = req.method.toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "DELETE" && method !== "PATCH") return null;

  const cookieToken = getTokenFromCookie(req);
  const headerToken = getTokenFromHeader(req);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token. Send x-csrf-token header matching the csrf_token cookie." },
      { status: 403 }
    );
  }
  return null;
}

/** Generate a new token (e.g. for cookie). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cookie string to set on response (Path=/, SameSite=Strict). Secure only in production. */
export function csrfCookieHeader(token: string): string {
  const maxAge = 60 * 60 * 24; // 24h
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

export { COOKIE_NAME, HEADER_NAME };
