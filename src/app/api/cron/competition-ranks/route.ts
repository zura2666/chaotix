/**
 * Cron: refresh user competition ranks (roiRank, volumeRank, narrativeRank, seasonScore, rankTitle) for near real-time leaderboards.
 * Runs every 5 minutes. Requires CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { refreshUserCompetitionRanks } from "@/lib/competition";
import { auditCronRun } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authError = assertCronAuth(req);
  if (authError) return authError;
  const start = Date.now();
  const result = await refreshUserCompetitionRanks("weekly");
  await auditCronRun("competition-ranks", result, Date.now() - start);
  return NextResponse.json(result);
}
