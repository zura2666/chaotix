/**
 * Constant-product AMM: k = reserveTokens * reserveShares
 * Price = reserveTokens / reserveShares
 * Buy: tokens in -> shares out. Sell: shares in -> tokens out.
 */

import { INITIAL_POOL_TOKENS, INITIAL_POOL_SHARES } from "./constants";

export function getInitialReserves(): { reserveTokens: number; reserveShares: number } {
  return {
    reserveTokens: INITIAL_POOL_TOKENS,
    reserveShares: INITIAL_POOL_SHARES,
  };
}

export function getPriceFromReserves(
  reserveTokens: number,
  reserveShares: number
): number {
  if (reserveShares <= 0) return 0;
  return reserveTokens / reserveShares;
}

/**
 * Constant product k = reserveTokens * reserveShares
 * Buy: tokensIn -> newReserveT = reserveT + tokensIn, newReserveS = k / newReserveT
 * sharesOut = reserveShares - newReserveS
 */
export function buyQuote(
  reserveTokens: number,
  reserveShares: number,
  tokensIn: number
): { sharesOut: number; newReserveTokens: number; newReserveShares: number } {
  if (reserveTokens <= 0 || reserveShares <= 0 || tokensIn <= 0) {
    return { sharesOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const k = reserveTokens * reserveShares;
  const newReserveT = reserveTokens + tokensIn;
  const newReserveS = k / newReserveT;
  const sharesOut = reserveShares - newReserveS;
  if (sharesOut <= 0) {
    return { sharesOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  return {
    sharesOut,
    newReserveTokens: newReserveT,
    newReserveShares: newReserveS,
  };
}

/**
 * Sell: sharesIn -> tokensOut
 * newReserveS = reserveShares + sharesIn, newReserveT = k / newReserveS
 * tokensOut = reserveTokens - newReserveT
 */
export function sellQuote(
  reserveTokens: number,
  reserveShares: number,
  sharesIn: number
): { tokensOut: number; newReserveTokens: number; newReserveShares: number } {
  if (reserveTokens <= 0 || reserveShares <= 0 || sharesIn <= 0) {
    return { tokensOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const k = reserveTokens * reserveShares;
  const newReserveS = reserveShares + sharesIn;
  const newReserveT = k / newReserveS;
  const tokensOut = reserveTokens - newReserveT;
  if (tokensOut <= 0) {
    return { tokensOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  return {
    tokensOut,
    newReserveTokens: newReserveT,
    newReserveShares: newReserveS,
  };
}

/**
 * How many tokens needed to get at least `sharesDesired` (approximate inverse).
 */
export function tokensNeededForShares(
  reserveTokens: number,
  reserveShares: number,
  sharesDesired: number
): number {
  if (sharesDesired <= 0 || reserveShares <= 0) return 0;
  const k = reserveTokens * reserveShares;
  const newReserveS = reserveShares - sharesDesired;
  if (newReserveS <= 0) return Infinity;
  const newReserveT = k / newReserveS;
  return newReserveT - reserveTokens;
}
