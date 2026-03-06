import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFeedForUser } from "@/lib/activity-feed";
import { getPredictedTrendingMarkets } from "@/lib/trend-engine";
import { prisma } from "@/lib/db";
import { rateLimit429 } from "@/lib/rate-limit";
import { PORTFOLIO_FEED_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

function feedRateLimitKey(req: NextRequest, userId: string | null): string {
  return userId ? `feed:${userId}` : `feed:ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon"}`;
}

const WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const user = await getSession();
  const rl = await rateLimit429(feedRateLimitKey(req, user?.id ?? null), PORTFOLIO_FEED_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10) || 30));
  const activities = user
    ? await getFeedForUser(user.id, limit)
    : await (async () => {
        const rows = await prisma.activity.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: { user: { select: { name: true, username: true } } },
        });
        return rows.map((a) => ({
          id: a.id,
          userId: a.userId,
          type: a.type,
          payload: a.payload ? JSON.parse(a.payload) : {},
          createdAt: a.createdAt,
          user: a.user,
        }));
      })();
  const trending = await getPredictedTrendingMarkets(5);
  const gravityMarkets = await prisma.market.findMany({
    where: { status: "active", gravityScore: { gte: 5 } },
    select: { id: true, canonical: true, displayName: true, gravityScore: true },
    orderBy: { gravityScore: "desc" },
    take: 5,
  });
  return NextResponse.json({
    feed: activities,
    trending: trending.slice(0, 5),
    gravity: gravityMarkets,
  });
}
