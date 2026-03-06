/**
 * Aether AMM: constant-product (x * y = k) with 1% fee.
 * Use for quotes and validation; actual execution in lib/markets (executeBuy/executeSell) uses pool-amm.
 * Fee is applied as: feeBps = 100 (1%), so output is reduced by 1%.
 */

import { buyQuote, sellQuote, getPriceFromReserves } from "./pool-amm";

const FEE_BPS = 100; // 1%

function applyFee(amount: number, feeBps: number): number {
  return Math.max(0, amount * (1 - feeBps / 10000));
}

/**
 * Buy: tokens in -> shares out (after 1% fee).
 */
export function getBuyPrice(
  tokenAmount: number,
  reserveTokens: number,
  reserveShares: number
): { sharesOut: number; fee: number; newReserveTokens: number; newReserveShares: number } {
  if (tokenAmount <= 0 || reserveTokens <= 0 || reserveShares <= 0) {
    return { sharesOut: 0, fee: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const { sharesOut: rawOut, newReserveTokens, newReserveShares } = buyQuote(
    reserveTokens,
    reserveShares,
    tokenAmount
  );
  const fee = rawOut * (FEE_BPS / 10000);
  const sharesOut = applyFee(rawOut, FEE_BPS);
  return {
    sharesOut,
    fee,
    newReserveTokens,
    newReserveShares,
  };
}

/**
 * Sell: shares in -> tokens out (after 1% fee).
 */
export function getSellPrice(
  shareAmount: number,
  reserveTokens: number,
  reserveShares: number
): { tokensOut: number; fee: number; newReserveTokens: number; newReserveShares: number } {
  if (shareAmount <= 0 || reserveTokens <= 0 || reserveShares <= 0) {
    return { tokensOut: 0, fee: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const { tokensOut: rawOut, newReserveTokens, newReserveShares } = sellQuote(
    reserveTokens,
    reserveShares,
    shareAmount
  );
  const fee = rawOut * (FEE_BPS / 10000);
  const tokensOut = applyFee(rawOut, FEE_BPS);
  return {
    tokensOut,
    fee,
    newReserveTokens,
    newReserveShares,
  };
}

export { getPriceFromReserves } from "./pool-amm";
export { getInitialReserves } from "./pool-amm";
