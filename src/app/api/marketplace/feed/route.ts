import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMarketplaceFeedForUser, getTrendingDiscussions } from "@/lib/marketplace-feed";

export async function GET(req: NextRequest) {
  const user = await getSession();
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10) || 30));
  const includeTrending = req.nextUrl.searchParams.get("trending") !== "0";

  const [feed, trending] = await Promise.all([
    user ? getMarketplaceFeedForUser(user.id, limit) : [],
    includeTrending ? getTrendingDiscussions(10) : [],
  ]);

  return NextResponse.json({
    feed,
    trendingDiscussions: trending,
  });
}
