/**
 * Cron: detect inactive markets and archive them.
 * Requires CRON_SECRET (min 16 chars). Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { detectAndArchiveMarkets, markInactiveStale } from "@/lib/market-archive";
import { auditCronRun } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authError = assertCronAuth(req);
  if (authError) return authError;
  const start = Date.now();
  const [archived, markedInactive] = await Promise.all([
    detectAndArchiveMarkets(),
    markInactiveStale(),
  ]);
  const result = { archived, markedInactive };
  await auditCronRun("archive-markets", result, Date.now() - start);
  return NextResponse.json(result);
}
