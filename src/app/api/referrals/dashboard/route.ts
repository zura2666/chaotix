/**
 * Referral dashboard: leaderboard + conversion, volume, fees.
 * GET /api/referrals/dashboard — public leaderboard.
 * Authenticated user gets personal stats via /api/user/referrals.
 */

import { NextResponse } from "next/server";
import { getReferralDashboardData } from "@/lib/referral-dashboard";

export async function GET() {
  const data = await getReferralDashboardData();
  return NextResponse.json(data);
}
