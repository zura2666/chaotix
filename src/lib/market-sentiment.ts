/**
 * Phase 8: Market sentiment from comments and trade-side bias.
 */

import { prisma } from "./db";

export async function updateMarketSentiment(marketId: string): Promise<void> {
  const [comments, trades] = await Promise.all([
    prisma.marketComment.findMany({
      where: { marketId },
      select: { sentiment: true },
    }),
    prisma.trade.findMany({
      where: { marketId },
      select: { side: true },
    }),
  ]);
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  for (const c of comments) {
    const s = (c.sentiment ?? "neutral").toLowerCase();
    if (s === "bullish" || s === "positive") bullish++;
    else if (s === "bearish" || s === "negative") bearish++;
    else neutral++;
  }
  const buys = trades.filter((t) => t.side === "buy").length;
  const sells = trades.filter((t) => t.side === "sell").length;
  if (trades.length > 0) {
    bullish += (buys / trades.length) * 2;
    bearish += (sells / trades.length) * 2;
  }
  const total = bullish + bearish + neutral || 1;
  const bullishScore = Math.round((bullish / total) * 100) / 100;
  const bearishScore = Math.round((bearish / total) * 100) / 100;
  const neutralScore = Math.round((neutral / total) * 100) / 100;
  await prisma.marketSentiment.upsert({
    where: { marketId },
    create: { marketId, bullishScore, bearishScore, neutralScore },
    update: { bullishScore, bearishScore, neutralScore },
  });
}
