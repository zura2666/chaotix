/**
 * Whale protection: max position size, max trade vs liquidity, dynamic slippage guard.
 */

import {
  MAX_POSITION_PCT_OF_SUPPLY,
  MAX_TRADE_PCT_OF_LIQUIDITY,
  MIN_LIQUIDITY_FOR_LARGE_TRADE,
} from "./constants";
import { roundShares } from "./position-pnl";

export type TradeGuardResult =
  | { ok: true; cappedShares?: number }
  | { ok: false; error: string };

/**
 * Total supply = sum of all position shares (for pool AMM, reserveShares is the pool side;
 * "supply" of shares in circulation = initial - reserveShares, or we use positions sum).
 */
export function tradeGuardBuy(params: {
  userId: string;
  marketId: string;
  currentUserShares: number;
  totalSupplyFromPositions: number;
  reserveTokens: number;
  reserveShares: number;
  requestedAmount: number;
  sharesOut: number;
}): TradeGuardResult {
  const {
    currentUserShares,
    totalSupplyFromPositions,
    reserveTokens,
    reserveShares,
    sharesOut,
  } = params;

  const liquidity =
    reserveTokens > 0 && reserveShares > 0
      ? reserveTokens * (reserveTokens / reserveShares)
      : 0;

  if (totalSupplyFromPositions > 0) {
    const maxNewShares =
      totalSupplyFromPositions * MAX_POSITION_PCT_OF_SUPPLY - currentUserShares;
    if (maxNewShares <= 0) {
      return { ok: false, error: "Max position size for this market reached" };
    }
    if (sharesOut > maxNewShares) {
      return {
        ok: true,
        cappedShares: roundShares(maxNewShares),
      };
    }
  }

  if (liquidity >= MIN_LIQUIDITY_FOR_LARGE_TRADE) {
    const maxTradeByLiquidity = liquidity * MAX_TRADE_PCT_OF_LIQUIDITY;
    if (params.requestedAmount > maxTradeByLiquidity) {
      return {
        ok: false,
        error: `Trade size exceeds ${MAX_TRADE_PCT_OF_LIQUIDITY * 100}% of liquidity. Max ~${Math.floor(maxTradeByLiquidity)}`,
      };
    }
  }

  return { ok: true };
}

export function tradeGuardSell(params: {
  currentUserShares: number;
  sharesToSell: number;
}): TradeGuardResult {
  const { currentUserShares, sharesToSell } = params;
  if (sharesToSell > currentUserShares) {
    return { ok: false, error: "Insufficient shares" };
  }
  return { ok: true };
}
