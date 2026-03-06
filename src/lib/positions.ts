/**
 * Position system: update user positions after buy/sell.
 * BUY: increase shares, update avgPrice (volume-weighted).
 * SELL: decrease shares, add realizedPnL.
 */

import type { PrismaClient } from "@prisma/client";
import { roundMoney, realizedPnLOnSell } from "./position-pnl";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * After a buy: upsert position, add shares, update average cost.
 * cost = total spent (before fee), shares = shares acquired, price = execution price.
 */
export async function updatePositionAfterBuy(
  tx: Tx,
  params: { userId: string; marketId: string; shares: number; cost: number; price: number }
): Promise<void> {
  const { userId, marketId, shares, cost, price } = params;
  const position = await tx.position.upsert({
    where: { userId_marketId: { userId, marketId } },
    create: {
      userId,
      marketId,
      shares,
      avgPrice: price,
      totalBought: cost,
      lastTradeAt: new Date(),
    },
    update: {
      shares: { increment: shares },
      totalBought: { increment: cost },
      lastTradeAt: new Date(),
    },
  });
  const prevShares = position.shares - shares;
  const newAvg =
    prevShares <= 0 ? price : (position.avgPrice * prevShares + price * shares) / position.shares;
  await tx.position.update({
    where: { id: position.id },
    data: { avgPrice: roundMoney(newAvg) },
  });
}

/**
 * After a sell: decrement shares, add realized PnL.
 * grossProceeds = total from trade (before fee), netProceeds = after fee.
 */
export async function updatePositionAfterSell(
  tx: Tx,
  params: {
    positionId: string;
    sharesSold: number;
    avgCostBasis: number;
    grossProceeds: number;
    netProceeds: number;
  }
): Promise<number> {
  const { positionId, sharesSold, avgCostBasis, netProceeds, grossProceeds } = params;
  const realized = realizedPnLOnSell(sharesSold, avgCostBasis, netProceeds);
  await tx.position.update({
    where: { id: positionId },
    data: {
      shares: { decrement: sharesSold },
      totalSold: { increment: grossProceeds },
      realizedPnL: { increment: realized },
      lastTradeAt: new Date(),
    },
  });
  return realized;
}
