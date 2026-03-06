import { prisma } from "./db";
import { MIN_INITIAL_BUY_TO_ACTIVATE } from "./constants";
import { MARKET_STATUS_ACTIVE } from "./constants";

const MAX_RECOMMENDED = 20;
const EMERGING_DAYS = 7;
const SIMILAR_TRADER_MARKETS = 15;

export async function getRecommendedMarkets(userId: string | null) {
  const baseCandidates = await prisma.market.findMany({
    where: {
      status: MARKET_STATUS_ACTIVE,
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    select: {
      id: true,
      canonical: true,
      displayName: true,
      title: true,
      price: true,
      volume: true,
      tradeCount: true,
      momentumScore: true,
      createdAt: true,
    },
    orderBy: { momentumScore: "desc" },
    take: 100,
  });

  const seen = new Set<string>();
  const out: Array<Record<string, unknown>> = [];

  if (userId) {
    const userTrades = await prisma.trade.findMany({
      where: { userId },
      select: { marketId: true },
      distinct: ["marketId"],
    });
    const userMarketSet = new Set(userTrades.map((x) => x.marketId));

    for (const m of baseCandidates) {
      if (userMarketSet.has(m.id) && !seen.has(m.id)) {
        seen.add(m.id);
        out.push({ ...m, reason: "you_traded" });
      }
    }

    const similarTraders = await prisma.trade.groupBy({
      by: ["userId"],
      where: {
        marketId: { in: Array.from(userMarketSet) },
        userId: { not: userId },
      },
      _count: true,
    });
    const similarUserIds = similarTraders
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map((x) => x.userId);
    if (similarUserIds.length > 0) {
      const similarMarkets = await prisma.trade.findMany({
        where: { userId: { in: similarUserIds } },
        select: { marketId: true },
        distinct: ["marketId"],
      });
      const similarMarketIds = Array.from(new Set(similarMarkets.map((x) => x.marketId))).filter(
        (id) => !userMarketSet.has(id)
      );
      const similarSet = new Set(similarMarketIds.slice(0, SIMILAR_TRADER_MARKETS));
      for (const m of baseCandidates) {
        if (out.length >= MAX_RECOMMENDED) break;
        if (similarSet.has(m.id) && !seen.has(m.id)) {
          seen.add(m.id);
          out.push({ ...m, reason: "similar_traders" });
        }
      }
    }
  }

  const emergingCutoff = new Date(Date.now() - EMERGING_DAYS * 24 * 60 * 60 * 1000);
  for (const m of baseCandidates) {
    if (out.length >= MAX_RECOMMENDED) break;
    if (seen.has(m.id)) continue;
    if (m.createdAt >= emergingCutoff && m.tradeCount >= 1) {
      seen.add(m.id);
      out.push({ ...m, reason: "emerging" });
    }
  }

  for (const m of baseCandidates) {
    if (out.length >= MAX_RECOMMENDED) break;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({ ...m, reason: "high_engagement" });
  }

  return out.slice(0, MAX_RECOMMENDED);
}
