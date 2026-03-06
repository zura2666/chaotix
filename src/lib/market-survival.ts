import { prisma } from "./db";

const WINDOW_7D = 7 * 24 * 60 * 60 * 1000;

export async function updateMarketSurvivalScore(marketId: string): Promise<number> {
  const [market, tradesLast7d, attentionSignals] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: {
        reserveTokens: true,
        volume: true,
        tradeCount: true,
        lastTradeAt: true,
      },
    }),
    prisma.trade.findMany({
      where: { marketId, createdAt: { gte: new Date(Date.now() - WINDOW_7D) } },
      select: { userId: true, total: true },
    }),
    prisma.attentionSignal.findMany({
      where: { marketId, createdAt: { gte: new Date(Date.now() - WINDOW_7D) } },
      select: { attentionScore: true },
    }),
  ]);
  if (!market || market.tradeCount === 0) return 0;

  const uniqueTraders = new Set(tradesLast7d.map((t) => t.userId)).size;
  const tradeFrequency = tradesLast7d.length / 7;
  const liquidityStability = market.reserveTokens > 0 ? Math.min(1, market.volume / (market.reserveTokens * 2)) : 0;
  const attentionGrowth = attentionSignals.reduce((s, a) => s + a.attentionScore, 0);
  const recency = market.lastTradeAt
    ? Math.exp(-(Date.now() - market.lastTradeAt.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const score =
    liquidityStability * 2 +
    Math.log(1 + uniqueTraders) * 1.5 +
    Math.log(1 + attentionGrowth) * 0.5 +
    Math.min(tradeFrequency * 0.2, 2) +
    recency * 2;

  const rounded = Math.round(score * 100) / 100;
  await prisma.market.update({
    where: { id: marketId },
    data: { survivalScore: rounded },
  });
  return rounded;
}
