/**
 * Liquidity health: depth, slippage estimate, stability, trader distribution.
 */

import { buyQuote, sellQuote, getPriceFromReserves } from "./pool-amm";

export type LiquidityStatus = "healthy" | "thin" | "risky";

export type LiquidityHealth = {
  status: LiquidityStatus;
  liquidityDepth: number;
  slippageEstimate1Pct: number;
  slippageEstimate10Pct: number;
  stabilityScore: number;
  uniqueHolders: number;
  topHolderConcentration: number;
  message: string;
};

export function computeLiquidityHealth(
  market: {
    reserveTokens: number;
    reserveShares: number;
    price: number;
    volume: number;
    tradeCount: number;
    positions: { shares: number; userId: string }[];
  }
): LiquidityHealth {
  const { reserveTokens, reserveShares, price, positions } = market;
  const totalShares = positions.reduce((s, p) => s + p.shares, 0);

  let liquidityDepth = 0;
  let slippage1 = 0;
  let slippage10 = 0;

  if (reserveTokens > 0 && reserveShares > 0) {
    liquidityDepth = reserveTokens * price + reserveShares * price;
    const buy1 = buyQuote(reserveTokens, reserveShares, reserveTokens * 0.01);
    const buy10 = buyQuote(reserveTokens, reserveShares, reserveTokens * 0.1);
    const mid = getPriceFromReserves(reserveTokens, reserveShares);
    if (buy1.sharesOut > 0 && mid > 0) {
      const execPrice1 = (reserveTokens * 0.01) / buy1.sharesOut;
      slippage1 = Math.abs(execPrice1 - mid) / mid * 100;
    }
    if (buy10.sharesOut > 0 && mid > 0) {
      const execPrice10 = (reserveTokens * 0.1) / buy10.sharesOut;
      slippage10 = Math.abs(execPrice10 - mid) / mid * 100;
    }
  }

  const uniqueHolders = positions.length;
  let topHolderConcentration = 0;
  if (totalShares > 0 && positions.length > 0) {
    const sorted = [...positions].sort((a, b) => b.shares - a.shares);
    topHolderConcentration = (sorted[0].shares / totalShares) * 100;
  }

  const stabilityScore =
    liquidityDepth > 1000 ? 1 : liquidityDepth > 100 ? 0.6 : 0.3;
  const concPenalty = topHolderConcentration > 80 ? 0.5 : topHolderConcentration > 50 ? 0.8 : 1;
  const adjustedStability = Math.min(1, stabilityScore * concPenalty);

  let status: LiquidityStatus = "healthy";
  let message = "Liquidity is sufficient for normal trading.";

  if (liquidityDepth < 100 || slippage10 > 15) {
    status = "risky";
    message = "Low liquidity. Large trades may have significant slippage.";
  } else if (liquidityDepth < 500 || slippage10 > 8) {
    status = "thin";
    message = "Moderate liquidity. Consider smaller order sizes.";
  }

  return {
    status,
    liquidityDepth,
    slippageEstimate1Pct: slippage1,
    slippageEstimate10Pct: slippage10,
    stabilityScore: adjustedStability,
    uniqueHolders,
    topHolderConcentration,
    message,
  };
}
