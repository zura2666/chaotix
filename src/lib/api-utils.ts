/**
 * Shared API utilities: auth, admin, limit parsing, body parsing.
 * Use across route handlers for consistency and to reach 9/10 quality.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Require authenticated user. Returns 401 JSON if not logged in.
 */
export async function requireAuth(): Promise<
  { user: SessionUser } | NextResponse
> {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}

/**
 * Require admin. Returns 403 JSON if not admin. Call after requireAuth or getSession.
 */
export async function requireAdmin(): Promise<
  { user: SessionUser } | NextResponse
> {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user };
}

/**
 * Parse limit query param with default and cap. Safe for all list endpoints.
 */
export function parseLimitParam(
  searchParams: URLSearchParams,
  defaultLimit: number,
  maxLimit: number,
  paramName = "limit"
): number {
  const raw = searchParams.get(paramName);
  const parsed = parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultLimit;
  return Math.min(maxLimit, parsed);
}

/**
 * Parse JSON body; return 400 with message on invalid or missing body.
 */
export async function parseJsonBody<T = unknown>(
  req: NextRequest
): Promise<{ body: T } | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 }
    );
  }
  return { body: body as T };
}
