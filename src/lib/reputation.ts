/**
 * Reputation: score changes and badge awards.
 */

import { prisma } from "./db";

const REP_PROFITABLE_TRADE = 2;
const REP_MARKET_CREATED_ACTIVE = 10;
const REP_REFERRAL_QUALITY = 5;
const REP_HOLDING_BONUS = 0.5;
const REP_SUSPICIOUS_PENALTY = -20;
const REP_WASH_PENALTY = -50;
const REP_SPAM_MARKET_PENALTY = -5;

export async function updateReputationAfterTrade(
  userId: string,
  realizedPnL: number,
  isProfit: boolean
): Promise<void> {
  const delta = isProfit ? REP_PROFITABLE_TRADE : -1;
  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: delta } },
  });
}

export async function updateReputationMarketCreated(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { createdById: true, tradeCount: true, volume: true },
  });
  if (!market?.createdById || market.tradeCount < 1) return;
  await prisma.user.update({
    where: { id: market.createdById },
    data: { reputationScore: { increment: REP_MARKET_CREATED_ACTIVE } },
  });
}

export async function applySuspiciousPenalty(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: REP_SUSPICIOUS_PENALTY } },
  });
}

export async function applyWashTradingPenalty(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: REP_WASH_PENALTY } },
  });
}

const BADGES = [
  "market_creator",
  "early_discoverer",
  "liquidity_provider",
  "top_trader",
  "referral_champion",
  "founding_trader",
] as const;

function parseBadges(badges: string): string[] {
  try {
    const a = JSON.parse(badges);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function awardBadge(userId: string, badge: string): Promise<boolean> {
  if (!BADGES.includes(badge as (typeof BADGES)[number])) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  if (!user) return false;
  const list = parseBadges(user.badges);
  if (list.includes(badge)) return false;
  list.push(badge);
  await prisma.user.update({
    where: { id: userId },
    data: { badges: JSON.stringify(list) },
  });
  return true;
}

export async function evaluateBadges(userId: string): Promise<void> {
  const [user, agg, referred] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true, reputationScore: true, referralCode: true },
    }),
    prisma.trade.aggregate({
      where: { userId },
      _sum: { total: true },
      _count: true,
    }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  if (!user) return;
  const current = parseBadges(user.badges);

  if (referred >= 5 && !current.includes("referral_champion")) {
    await awardBadge(userId, "referral_champion");
  }
  const createdMarkets = await prisma.market.count({
    where: { createdById: userId, tradeCount: { gt: 0 } },
  });
  if (createdMarkets >= 1 && !current.includes("market_creator")) {
    await awardBadge(userId, "market_creator");
  }
  const totalVolume = agg._sum.total ?? 0;
  if (totalVolume >= 1000 && user.reputationScore >= 10 && !current.includes("top_trader")) {
    await awardBadge(userId, "top_trader");
  }
}
