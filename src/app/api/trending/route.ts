import { NextResponse } from "next/server";
import { getTrendingMarkets, getNewestMarkets, getBiggestMovers } from "@/lib/trending";
import { withQueryMetric } from "@/lib/query-metrics";

export async function GET() {
  try {
    const [trending, newest, movers] = await withQueryMetric("trending", () =>
      Promise.all([
        getTrendingMarkets(10),
        getNewestMarkets(10),
        getBiggestMovers(10),
      ])
    );
    return NextResponse.json({ trending, newest, movers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
