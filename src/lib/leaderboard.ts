import { prisma } from "./db";
import { getSystemUserId } from "./system-user";

export async function getTopTraders(limit = 20) {
  const traders = await prisma.trade.groupBy({
    by: ["userId"],
    where: { isSystemTrade: false },
    _sum: { total: true },
    _count: true,
  });
  const userIds = traders.map((t) => t.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return traders
    .map((t) => ({
      user: byId.get(t.userId),
      volume: t._sum.total ?? 0,
      tradeCount: t._count,
    }))
    .filter((t) => t.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/** Top by realized PnL (profit) */
export async function getTopTradersByProfit(limit = 20) {
  const systemUserId = await getSystemUserId();
  const positions = await prisma.position.findMany({
    where: {
      realizedPnL: { gt: 0 },
      ...(systemUserId ? { userId: { not: systemUserId } } : {}),
    },
    select: { userId: true, realizedPnL: true },
  });
  const byUser = new Map<string, number>();
  for (const p of positions) {
    byUser.set(p.userId, (byUser.get(p.userId) ?? 0) + p.realizedPnL);
  }
  const sorted = Array.from(byUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: sorted.map(([id]) => id) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return sorted.map(([userId, profit]) => ({
    user: byId.get(userId),
    profit,
    volume: 0,
    tradeCount: 0,
  }));
}

/** Best ROI: realized PnL / total cost basis (totalBought) */
export async function getTopTradersByROI(limit = 20) {
  const systemUserId = await getSystemUserId();
  const positions = await prisma.position.findMany({
    where: systemUserId ? { userId: { not: systemUserId } } : undefined,
    select: { userId: true, realizedPnL: true, totalBought: true },
  });
  const byUser = new Map<string, { realized: number; cost: number }>();
  for (const p of positions) {
    const cur = byUser.get(p.userId) ?? { realized: 0, cost: 0 };
    cur.realized += p.realizedPnL;
    cur.cost += p.totalBought;
    byUser.set(p.userId, cur);
  }
  const withRoi = Array.from(byUser.entries())
    .filter(([, v]) => v.cost >= 10)
    .map(([userId, v]) => ({
      userId,
      roi: v.cost ? (v.realized / v.cost) * 100 : 0,
      profit: v.realized,
      cost: v.cost,
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: withRoi.map((x) => x.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return withRoi.map((x) => ({
    user: byId.get(x.userId),
    roi: x.roi,
    profit: x.profit,
    cost: x.cost,
  }));
}

/** Early discoverers: first to trade in many markets (high unique market count, early entry) */
export async function getTopEarlyDiscoverers(limit = 20) {
  const trades = await prisma.trade.findMany({
    where: { isSystemTrade: false },
    orderBy: { createdAt: "asc" },
    select: { userId: true, marketId: true, createdAt: true },
  });
  const firstTradePerMarket = new Map<string, string>();
  for (const t of trades) {
    if (!firstTradePerMarket.has(t.marketId)) firstTradePerMarket.set(t.marketId, t.userId);
  }
  const discovererCount = new Map<string, number>();
  Array.from(firstTradePerMarket.values()).forEach((uid) => {
    discovererCount.set(uid, (discovererCount.get(uid) ?? 0) + 1);
  });
  const sorted = Array.from(discovererCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: sorted.map(([id]) => id) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return sorted.map(([userId, marketsDiscovered]) => ({
    user: byId.get(userId),
    marketsDiscovered,
  }));
}

export async function getTopReferrers(limit = 20) {
  const earnings = await prisma.referralEarning.groupBy({
    by: ["referrerId"],
    _sum: { amount: true },
    _count: true,
  });
  const referrerIds = earnings.map((e) => e.referrerId);
  const users = await prisma.user.findMany({
    where: { id: { in: referrerIds } },
    select: { id: true, name: true, email: true, referralCode: true, badges: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return earnings
    .map((e) => ({
      user: byId.get(e.referrerId),
      totalEarnings: e._sum.amount ?? 0,
      referralCount: e._count,
    }))
    .filter((e) => e.totalEarnings > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, limit);
}

/** Phase 7: Leaderboard by user reputation score. */
export async function getTopByReputation(limit = 20) {
  const users = await prisma.user.findMany({
    where: { reputationScore: { gt: 0 } },
    select: {
      id: true,
      name: true,
      email: true,
      reputationScore: true,
      marketsCreated: true,
      successfulMarkets: true,
      successfulTrades: true,
      marketInfluenceScore: true,
      badges: true,
    },
    orderBy: { reputationScore: "desc" },
    take: limit,
  });
  return users.map((u) => ({
    user: { id: u.id, name: u.name, email: u.email, badges: u.badges },
    reputationScore: u.reputationScore,
    marketsCreated: u.marketsCreated,
    successfulMarkets: u.successfulMarkets,
    successfulTrades: u.successfulTrades,
    marketInfluenceScore: u.marketInfluenceScore,
  }));
}

/** Top Narrative Traders: by reputation + market influence (narrative discovery, early trades, profit). */
export async function getTopNarrativeTraders(limit = 20) {
  const systemUserId = await getSystemUserId();
  const users = await prisma.user.findMany({
    where: {
      OR: [{ reputationScore: { gt: 0 } }, { marketInfluenceScore: { gt: 0 } }],
      ...(systemUserId ? { id: { not: systemUserId } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      reputationScore: true,
      marketInfluenceScore: true,
      successfulTrades: true,
      badges: true,
    },
    orderBy: [{ reputationScore: "desc" }, { marketInfluenceScore: "desc" }],
    take: limit * 2,
  });
  const withScore = users.map((u) => ({
    user: { id: u.id, name: u.name, email: u.email, username: u.username, badges: u.badges },
    narrativeScore: (u.reputationScore ?? 0) * 0.6 + (u.marketInfluenceScore ?? 0) * 0.4,
    reputationScore: u.reputationScore,
    marketInfluenceScore: u.marketInfluenceScore,
    successfulTrades: u.successfulTrades ?? 0,
  }));
  withScore.sort((a, b) => b.narrativeScore - a.narrativeScore);
  return withScore.slice(0, limit);
}

/** Top Market Creators: by count of markets created that have activity (tradeCount > 0). */
export async function getTopMarketCreators(limit = 20) {
  const created = await prisma.market.groupBy({
    by: ["createdById"],
    where: { createdById: { not: null }, tradeCount: { gt: 0 } },
    _count: true,
    _sum: { volume: true },
  });
  const creatorIds = created.map((c) => c.createdById!).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true, email: true, username: true, badges: true, marketsCreated: true, successfulMarkets: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return created
    .map((c) => ({
      user: byId.get(c.createdById!),
      marketsCreated: c._count,
      totalVolume: c._sum.volume ?? 0,
    }))
    .filter((r) => r.user)
    .sort((a, b) => b.marketsCreated - a.marketsCreated)
    .slice(0, limit);
}
