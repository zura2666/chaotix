/**
 * Cron: market activity simulation — small system trades to keep early-stage markets visibly active.
 * Runs every 5 minutes. Requires CRON_SECRET (min 16 chars). Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { runMarketActivitySimulation } from "@/lib/market-activity-simulation";
import { auditCronRun } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authError = assertCronAuth(req);
  if (authError) return authError;
  const start = Date.now();
  const result = await runMarketActivitySimulation();
  await auditCronRun("market-activity-simulation", result, Date.now() - start);
  return NextResponse.json(result);
}
