/**
 * Phase 11: Centralized cron authorization. CRON_SECRET must be set and at least 16 characters.
 */

import { NextRequest, NextResponse } from "next/server";

const MIN_CRON_SECRET_LENGTH = 16;

export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH) return null;
  return secret;
}

export function isCronAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : headerSecret;
  return token === secret;
}

/** Use in cron route handlers: returns 503 if not configured, 401 if unauthorized, else null (proceed). */
export function assertCronAuth(req: NextRequest): NextResponse | null {
  if (!getCronSecret()) {
    return NextResponse.json(
      { error: "Cron not configured (CRON_SECRET required, min 16 characters)" },
      { status: 503 }
    );
  }
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
