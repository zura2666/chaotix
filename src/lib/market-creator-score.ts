/**
 * Market creator advantage: volume generated, unique traders, longevity, momentum.
 */

import { prisma } from "./db";

export async function getTopMarketCreators(limit = 20) {
  const markets = await prisma.market.findMany({
    where: { createdById: { not: null }, tradeCount: { gt: 0 } },
    select: {
      id: true,
      createdById: true,
      volume: true,
      tradeCount: true,
      momentumScore: true,
      createdAt: true,
      lastTradeAt: true,
    },
  });

  const byCreator = new Map<
    string,
    { volume: number; tradeCount: number; markets: number; momentum: number; longevity: number }
  >();
  for (const m of markets) {
    const cid = m.createdById!;
    const cur = byCreator.get(cid) ?? {
      volume: 0,
      tradeCount: 0,
      markets: 0,
      momentum: 0,
      longevity: 0,
    };
    cur.volume += m.volume;
    cur.tradeCount += m.tradeCount;
    cur.markets += 1;
    cur.momentum += m.momentumScore ?? 0;
    if (m.lastTradeAt) {
      cur.longevity += (m.lastTradeAt.getTime() - m.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    }
    byCreator.set(cid, cur);
  }

  const uniqueTraders = await prisma.trade.groupBy({
    by: ["marketId"],
    _count: { userId: true },
  });
  const tradersByMarket = new Map(uniqueTraders.map((t) => [t.marketId, t._count.userId]));
  const creatorMarketIds = new Map<string, string[]>();
  for (const m of markets) {
    if (!m.createdById) continue;
    const list = creatorMarketIds.get(m.createdById) ?? [];
    list.push(m.id);
    creatorMarketIds.set(m.createdById, list);
  }

  const withScore = Array.from(byCreator.entries()).map(([userId, data]) => {
    const marketIds = creatorMarketIds.get(userId) ?? [];
    const uniqueT = marketIds.reduce((s, mid) => s + (tradersByMarket.get(mid) ?? 0), 0);
    const score =
      Math.log(1 + data.volume) * 2 +
      data.tradeCount * 0.3 +
      uniqueT * 0.5 +
      Math.log(1 + data.momentum) +
      Math.min(data.longevity / 30, 2);
    return {
      userId,
      score: Math.round(score * 100) / 100,
      volume: data.volume,
      tradeCount: data.tradeCount,
      marketsCreated: data.markets,
      uniqueTraders: uniqueT,
    };
  });

  withScore.sort((a, b) => b.score - a.score);
  const top = withScore.slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: top.map((t) => t.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return top.map((t) => ({
    user: byId.get(t.userId),
    ...t,
  }));
}
