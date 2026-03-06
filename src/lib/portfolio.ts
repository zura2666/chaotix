/**
 * Portfolio: positions, total value, PnL, best/worst markets.
 */

import { prisma } from "./db";
import { unrealizedPnL as unrealizedPnLFn } from "./position-pnl";

export type PortfolioPosition = {
  id: string;
  marketId: string;
  marketCanonical: string;
  marketDisplayName: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
};

export type Portfolio = {
  positions: PortfolioPosition[];
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  bestMarket: PortfolioPosition | null;
  worstMarket: PortfolioPosition | null;
};

export async function getPortfolio(userId: string): Promise<Portfolio> {
  const [user, positions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    }),
    prisma.position.findMany({
      where: { userId, shares: { gt: 0 } },
      include: { market: { select: { id: true, canonical: true, displayName: true, price: true } } },
    }),
  ]);
  const balance = user?.balance ?? 0;
  const positionsWithPnL: PortfolioPosition[] = positions.map((p) => {
    const currentPrice = p.market.price;
    const costBasis = p.shares * p.avgPrice;
    const currentValue = p.shares * currentPrice;
    const unrealized = unrealizedPnLFn(p.shares, p.avgPrice, currentPrice);
    return {
      id: p.id,
      marketId: p.marketId,
      marketCanonical: p.market.canonical,
      marketDisplayName: p.market.displayName,
      shares: p.shares,
      avgPrice: p.avgPrice,
      currentPrice,
      costBasis,
      currentValue,
      unrealizedPnL: unrealized,
      realizedPnL: p.realizedPnL,
    };
  });
  const totalPositionValue = positionsWithPnL.reduce((s, p) => s + p.currentValue, 0);
  const totalValue = balance + totalPositionValue;
  const unrealizedPnL = positionsWithPnL.reduce((s, p) => s + p.unrealizedPnL, 0);
  const realizedPnL = positionsWithPnL.reduce((s, p) => s + p.realizedPnL, 0);
  const bestMarket =
    positionsWithPnL.length === 0
      ? null
      : positionsWithPnL.reduce((a, b) => (a.unrealizedPnL >= b.unrealizedPnL ? a : b));
  const worstMarket =
    positionsWithPnL.length === 0
      ? null
      : positionsWithPnL.reduce((a, b) => (a.unrealizedPnL <= b.unrealizedPnL ? a : b));
  return {
    positions: positionsWithPnL,
    totalValue,
    unrealizedPnL,
    realizedPnL,
    bestMarket,
    worstMarket,
  };
}
