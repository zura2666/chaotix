/**
 * Trader Reputation System: score changes, successfulTrades, marketInfluenceScore, badges.
 * Reputation increases: profitable trades, early market discovery, consistent activity.
 * Reputation decreases: wash trading, abnormal loops, sybil behavior.
 */

import { prisma } from "./db";

const REP_PROFITABLE_TRADE = 2;
const REP_LOSING_TRADE = -1;
const REP_MARKET_CREATED_ACTIVE = 10;
const REP_EARLY_DISCOVERY = 3;
const REP_CONSISTENT_ACTIVITY = 0.5;
const REP_REFERRAL_QUALITY = 5;
const REP_SUSPICIOUS_PENALTY = -20;
const REP_WASH_PENALTY = -50;
const REP_SYBIL_PENALTY = -30;
const REP_ABNORMAL_LOOP_PENALTY = -25;
const REP_SPAM_MARKET_PENALTY = -5;

const INFLUENCE_PROFITABLE_TRADE = 0.5;
const INFLUENCE_EARLY_DISCOVERY = 2;

/** Display labels for badges and rank titles (seasonal competitions). */
export const BADGE_LABELS: Record<string, string> = {
  market_creator: "Market Creator",
  early_discoverer: "Early Discoverer",
  liquidity_provider: "Liquidity Provider",
  top_trader: "Top Trader",
  referral_champion: "Referral Champion",
  founding_trader: "Founding Trader",
  signal_trader: "Signal Trader",
  narrative_hunter: "Narrative Hunter",
  market_architect: "Market Architect",
  market_maker: "Market Maker",
  narrative_wars_top_100: "Narrative Wars Top 100",
  alpha_hunter: "Alpha Hunter",
  roi_champion: "ROI Champion",
  volume_king: "Volume King",
  liquidity_legend: "Liquidity Legend",
  story_scout: "Story Scout",
  discovery_lead: "Discovery Lead",
  creator_100_trades: "100 Trades Creator",
  creator_500_trades: "500 Trades Creator",
  creator_1000_trades: "1000 Trades Creator",
  creator_10k_volume: "10k Volume Creator",
};

/** Format season badge (e.g. narrative_wars_top_100 → Narrative Wars Top 100) when not in BADGE_LABELS. */
export function getBadgeLabel(badge: string): string {
  if (BADGE_LABELS[badge]) return BADGE_LABELS[badge];
  if (badge.endsWith("_top_100")) {
    const name = badge.slice(0, -"_top_100".length).replace(/_/g, " ");
    const title = name.replace(/\b\w/g, (c) => c.toUpperCase());
    return `${title} Top 100`;
  }
  return badge.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const BADGES = [
  "market_creator",
  "early_discoverer",
  "liquidity_provider",
  "top_trader",
  "referral_champion",
  "founding_trader",
  "signal_trader",
  "narrative_hunter",
  "market_maker",
  "narrative_wars_top_100",
] as const;

function parseBadges(badges: string): string[] {
  try {
    const a = JSON.parse(badges);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function updateReputationAfterTrade(
  userId: string,
  realizedPnL: number,
  isProfit: boolean
): Promise<void> {
  const repDelta = isProfit ? REP_PROFITABLE_TRADE : REP_LOSING_TRADE;
  const data: { reputationScore: { increment: number }; successfulTrades?: { increment: number }; marketInfluenceScore?: { increment: number } } = {
    reputationScore: { increment: repDelta },
  };
  if (isProfit) {
    data.successfulTrades = { increment: 1 };
    data.marketInfluenceScore = { increment: INFLUENCE_PROFITABLE_TRADE };
  }
  await prisma.user.update({
    where: { id: userId },
    data,
  });
}

/** Call when user is among first traders in a market (early discovery). */
export async function updateReputationEarlyDiscovery(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: { increment: REP_EARLY_DISCOVERY },
      marketInfluenceScore: { increment: INFLUENCE_EARLY_DISCOVERY },
    },
  });
}

/** Call periodically or after activity for consistent-activity bonus. */
export async function updateReputationConsistentActivity(userId: string, recentTradesCount: number): Promise<void> {
  if (recentTradesCount < 3) return;
  const bonus = Math.min(5, Math.floor(recentTradesCount / 3) * REP_CONSISTENT_ACTIVITY);
  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: bonus } },
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
    data: {
      reputationScore: { increment: REP_SUSPICIOUS_PENALTY },
      marketInfluenceScore: { increment: Math.max(-10, REP_SUSPICIOUS_PENALTY * 0.5) },
    },
  });
}

export async function applyWashTradingPenalty(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: { increment: REP_WASH_PENALTY },
      marketInfluenceScore: { increment: -15 },
    },
  });
}

export async function applySybilPenalty(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: { increment: REP_SYBIL_PENALTY },
      marketInfluenceScore: { increment: -10 },
    },
  });
}

export async function applyAbnormalLoopPenalty(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: { increment: REP_ABNORMAL_LOOP_PENALTY },
      marketInfluenceScore: { increment: -8 },
    },
  });
}

export async function awardBadge(userId: string, badge: string): Promise<boolean> {
  if (!BADGES.includes(badge as (typeof BADGES)[number])) return false;
  return awardBadgeUnchecked(userId, badge);
}

/** Award a badge without BADGES list check (e.g. season rewards like narrative_wars_top_100). */
export async function awardBadgeUnchecked(userId: string, badge: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  if (!user) return false;
  const list = parseBadges(user.badges);
  if (list.includes(badge)) return true;
  list.push(badge);
  await prisma.user.update({
    where: { id: userId },
    data: { badges: JSON.stringify(list) },
  });
  return true;
}

export async function evaluateBadges(userId: string): Promise<void> {
  const [user, agg, referred, earlyDiscoveries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true, reputationScore: true, successfulTrades: true, marketInfluenceScore: true },
    }),
    prisma.trade.aggregate({
      where: { userId },
      _sum: { total: true },
      _count: true,
    }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.marketEarlyTrader.count({ where: { userId } }),
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

  const successfulTrades = user.successfulTrades ?? 0;
  if (successfulTrades >= 20 && user.reputationScore >= 25 && !current.includes("signal_trader")) {
    await awardBadge(userId, "signal_trader");
  }
  if (earlyDiscoveries >= 5 && !current.includes("narrative_hunter")) {
    await awardBadge(userId, "narrative_hunter");
  }
  const influence = user.marketInfluenceScore ?? 0;
  if (totalVolume >= 5000 && influence >= 15 && !current.includes("market_maker")) {
    await awardBadge(userId, "market_maker");
  }
}
