/**
 * Public API: Narrative index time-series for charts.
 * GET /api/index/narratives/history?days=30
 * Returns snapshots: { createdAt, globalIndex, aiIndex, cryptoIndex, geopoliticsIndex, technologyIndex }[]
 */

import { NextRequest, NextResponse } from "next/server";
import { getIndexHistory } from "@/lib/narrative-index";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10) || 30));
  const rows = await getIndexHistory(days);
  const data = rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    globalIndex: r.globalIndex,
    aiIndex: r.aiIndex,
    cryptoIndex: r.cryptoIndex,
    geopoliticsIndex: r.geopoliticsIndex,
    technologyIndex: r.technologyIndex,
  }));
  const response = NextResponse.json({ history: data });
  response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  return response;
}
