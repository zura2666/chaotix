/**
 * Position PnL: round shares to fixed precision, compute realized/unrealized.
 */

import { SHARE_PRECISION } from "./constants";

export function roundShares(shares: number): number {
  const factor = Math.pow(10, SHARE_PRECISION);
  return Math.round(shares * factor) / factor;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Realized PnL on sell = proceeds (after fee) - cost basis of shares sold. */
export function realizedPnLOnSell(
  sharesSold: number,
  avgCostBasis: number,
  netProceeds: number
): number {
  const costBasis = avgCostBasis * sharesSold;
  return roundMoney(netProceeds - costBasis);
}

/** Unrealized PnL = current value of position - cost basis. */
export function unrealizedPnL(
  shares: number,
  avgPrice: number,
  currentPrice: number
): number {
  if (shares <= 0) return 0;
  const costBasis = shares * avgPrice;
  const currentValue = shares * currentPrice;
  return roundMoney(currentValue - costBasis);
}
