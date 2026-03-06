/**
 * Influencer/creator dashboard: markets created, volume on their name, trader count, referral earnings, attention.
 */

import { prisma } from "./db";
import { getMarketAttention } from "./attention";

const ATTENTION_WINDOW = 24 * 60 * 60 * 1000;

export async function getInfluencerMetrics(userId: string) {
  const markets = await prisma.market.findMany({
    where: { createdById: userId },
    select: { id: true, canonical: true, displayName: true, volume: true, tradeCount: true },
  });

  const marketIds = markets.map((m) => m.id);
  const [tradesOnMarkets, referralEarnings, attentionByMarket] = await Promise.all([
    prisma.trade.findMany({
      where: { marketId: { in: marketIds } },
      select: { userId: true, total: true, marketId: true },
    }),
    prisma.referralEarning.aggregate({
      where: { referrerId: userId },
      _sum: { amount: true },
      _count: true,
    }),
    Promise.all(markets.map((m) => getMarketAttention(m.id))),
  ]);

  const uniqueTraders = new Set(tradesOnMarkets.map((t) => t.userId)).size;
  const totalVolumeOnMyMarkets = tradesOnMarkets.reduce((s, t) => s + t.total, 0);
  const totalAttention = attentionByMarket.reduce((s, a) => s + a.attentionScore, 0);

  return {
    marketsCreated: markets.length,
    markets: markets.map((m) => ({
      ...m,
      volume: m.volume,
      tradeCount: m.tradeCount,
    })),
    volumeOnMyMarkets: totalVolumeOnMyMarkets,
    uniqueTradersOnMyMarkets: uniqueTraders,
    referralEarnings: referralEarnings._sum.amount ?? 0,
    referralCount: referralEarnings._count,
    attentionScore: Math.round(totalAttention * 100) / 100,
  };
}
