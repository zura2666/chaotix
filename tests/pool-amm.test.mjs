/**
 * Unit tests for AMM pool math (mirrors pool-amm.ts).
 * Run: node --test tests/pool-amm.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert";

function getPriceFromReserves(reserveTokens, reserveShares) {
  if (reserveShares <= 0) return 0;
  return reserveTokens / reserveShares;
}

function buyQuote(reserveTokens, reserveShares, tokensIn) {
  if (reserveTokens <= 0 || reserveShares <= 0 || tokensIn <= 0) {
    return { sharesOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const k = reserveTokens * reserveShares;
  const newReserveT = reserveTokens + tokensIn;
  const newReserveS = k / newReserveT;
  const sharesOut = reserveShares - newReserveS;
  if (sharesOut <= 0) return { sharesOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  return { sharesOut, newReserveTokens: newReserveT, newReserveShares: newReserveS };
}

function sellQuote(reserveTokens, reserveShares, sharesIn) {
  if (reserveTokens <= 0 || reserveShares <= 0 || sharesIn <= 0) {
    return { tokensOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  }
  const k = reserveTokens * reserveShares;
  const newReserveS = reserveShares + sharesIn;
  const newReserveT = k / newReserveS;
  const tokensOut = reserveTokens - newReserveT;
  if (tokensOut <= 0) return { tokensOut: 0, newReserveTokens: reserveTokens, newReserveShares: reserveShares };
  return { tokensOut, newReserveTokens: newReserveT, newReserveShares: newReserveS };
}

describe("pool-amm", () => {
  it("getPriceFromReserves: initial 1000/100000 = 0.01", () => {
    assert.strictEqual(getPriceFromReserves(1000, 100_000), 0.01);
  });

  it("getPriceFromReserves: zero shares returns 0", () => {
    assert.strictEqual(getPriceFromReserves(100, 0), 0);
  });

  it("buyQuote: tokens in increases reserveT, decreases reserveS", () => {
    const r = buyQuote(1000, 100_000, 100);
    assert.ok(r.sharesOut > 0);
    assert.strictEqual(r.newReserveTokens, 1100);
    assert.ok(r.newReserveShares < 100_000);
    assert.ok(Math.abs(r.newReserveTokens * r.newReserveShares - 1000 * 100_000) < 1);
  });

  it("sellQuote: shares in increases reserveS, decreases reserveT", () => {
    const r = sellQuote(1000, 100_000, 1000);
    assert.ok(r.tokensOut > 0);
    assert.strictEqual(r.newReserveShares, 101_000);
    assert.ok(r.newReserveTokens < 1000);
    assert.ok(Math.abs(r.newReserveTokens * r.newReserveShares - 1000 * 100_000) < 1);
  });

  it("buy then sell: round-trip returns at most tokens put in (no free money)", () => {
    const buy = buyQuote(1000, 100_000, 50);
    const sell = sellQuote(buy.newReserveTokens, buy.newReserveShares, buy.sharesOut);
    assert.ok(sell.tokensOut > 0);
    assert.ok(sell.tokensOut <= 50);
  });
});
