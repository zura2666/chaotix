/**
 * MarketMetrics: 24h volume, trader count, price change for fast discovery.
 */

import { prisma } from "./db";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function updateMarketMetrics(marketId: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [market, trades24h, firstPricePoint] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: { price: true },
    }),
    prisma.trade.findMany({
      where: { marketId, createdAt: { gte: since } },
      select: { userId: true, total: true },
    }),
    prisma.pricePoint.findFirst({
      where: { marketId, timestamp: { lte: since } },
      orderBy: { timestamp: "desc" },
      select: { price: true },
    }),
  ]);
  if (!market) return;

  const volume24h = trades24h.reduce((s, t) => s + t.total, 0);
  const traderIds = new Set(trades24h.map((t) => t.userId));
  const traderCount24h = traderIds.size;
  const price24hAgo = firstPricePoint?.price ?? market.price;
  const priceChange24h =
    price24hAgo > 0
      ? (market.price - price24hAgo) / price24hAgo
      : 0;

  await prisma.marketMetrics.upsert({
    where: { marketId },
    create: {
      marketId,
      volume24h,
      traderCount24h,
      priceChange24h,
    },
    update: {
      volume24h,
      traderCount24h,
      priceChange24h,
    },
  });
}
