/**
 * Viral share: auto-generated share text with price change, volume, link.
 */

import { prisma } from "./db";

export async function getViralSharePayload(canonical: string): Promise<{
  shareText: string;
  displayName: string;
  price: number;
  priceChangePct: number;
  volume: number;
  tradeCount: number;
  hoursAgo?: number;
  url: string;
}> {
  const market = await prisma.market.findUnique({
    where: { canonical },
    select: {
      displayName: true,
      price: true,
      volume: true,
      tradeCount: true,
      lastTradeAt: true,
      createdAt: true,
    },
  });
  if (!market) {
    return {
      shareText: "",
      displayName: "",
      price: 0,
      priceChangePct: 0,
      volume: 0,
      tradeCount: 0,
      url: "",
    };
  }

  const initialPrice = 0.01;
  const priceChangePct = initialPrice > 0 ? ((market.price - initialPrice) / initialPrice) * 100 : 0;
  const hoursSinceCreation = (Date.now() - market.createdAt.getTime()) / (60 * 60 * 1000);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  let shareText: string;
  if (priceChangePct >= 50 && hoursSinceCreation <= 24) {
    shareText = `${market.displayName} market just ${priceChangePct >= 100 ? "doubled" : "surged"} on Chaotix in ${Math.round(hoursSinceCreation)} hours`;
  } else if (priceChangePct >= 20) {
    shareText = `${market.displayName} is up ${Math.round(priceChangePct)}% on Chaotix — ${market.tradeCount} trades, $${Math.round(market.volume)} volume`;
  } else {
    shareText = `${market.displayName} — trade attention on Chaotix`;
  }

  return {
    shareText,
    displayName: market.displayName,
    price: market.price,
    priceChangePct,
    volume: market.volume,
    tradeCount: market.tradeCount,
    hoursAgo: market.lastTradeAt ? (Date.now() - market.lastTradeAt.getTime()) / (60 * 60 * 1000) : undefined,
    url: `${baseUrl}/market/${encodeURIComponent(canonical)}`,
  };
}
