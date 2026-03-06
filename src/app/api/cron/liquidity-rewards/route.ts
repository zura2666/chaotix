import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { distributeLiquidityRewards } from "@/lib/liquidity-rewards";
import { auditCronRun } from "@/lib/audit";

/**
 * Cron: distribute LP rewards. Requires CRON_SECRET (min 16 chars). Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */
export async function GET(req: NextRequest) {
  const authError = assertCronAuth(req);
  if (authError) return authError;
  const start = Date.now();
  const result = await distributeLiquidityRewards();
  await auditCronRun("liquidity-rewards", result, Date.now() - start);
  return NextResponse.json(result);
}
