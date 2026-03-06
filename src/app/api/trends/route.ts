import { NextRequest, NextResponse } from "next/server";
import { parseLimitParam } from "@/lib/api-utils";
import { getPredictedTrendingMarkets } from "@/lib/trend-engine";

export async function GET(req: NextRequest) {
  const limit = parseLimitParam(req.nextUrl.searchParams, 20, 50);
  const markets = await getPredictedTrendingMarkets(limit);
  return NextResponse.json({ trends: markets });
}
