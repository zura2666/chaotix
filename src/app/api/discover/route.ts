import { NextResponse } from "next/server";
import { getDiscoveryFeed } from "@/lib/discovery-feed";
import { withQueryMetric } from "@/lib/query-metrics";

export async function GET() {
  const feed = await withQueryMetric("discovery_feed", () => getDiscoveryFeed(30));
  return NextResponse.json({ feed });
}
