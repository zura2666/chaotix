import { NextRequest, NextResponse } from "next/server";
import { getCompetitionLeaderboard, getRankTitle, type CompetitionMetric } from "@/lib/competition";

const PERIODS = ["daily", "weekly", "monthly", "season"] as const;
const METRICS = ["roi", "volume", "narrative"] as const;

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "weekly";
  const metric = req.nextUrl.searchParams.get("metric") ?? "volume";
  const seasonId = req.nextUrl.searchParams.get("seasonId") || undefined;
  const limit = Math.min(100, Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50));

  if (!PERIODS.includes(period as (typeof PERIODS)[number])) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  if (!METRICS.includes(metric as (typeof METRICS)[number])) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const result = await getCompetitionLeaderboard(
    period as (typeof PERIODS)[number],
    metric as (typeof METRICS)[number],
    limit,
    seasonId
  );
  const metricTyped = metric as CompetitionMetric;
  const rowsWithTitles = result.rows.map((r) => ({
    ...r,
    rankTitle: r.rank ? getRankTitle(metricTyped, r.rank) : null,
  }));
  return NextResponse.json({ ...result, rows: rowsWithTitles });
}
