import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { runLiquidityMaintenance } from "@/lib/liquidity-maintenance";
import { auditCronRun } from "@/lib/audit";

/**
 * Cron: liquidity-maintenance.
 * Actions: rebalance thin pools, inject minimal liquidity for trending markets.
 * Requires CRON_SECRET (min 16 chars). Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */
export async function GET(req: NextRequest) {
  const authError = assertCronAuth(req);
  if (authError) return authError;
  const start = Date.now();
  const result = await runLiquidityMaintenance();
  await auditCronRun("liquidity-maintenance", result, Date.now() - start);
  return NextResponse.json(result);
}
