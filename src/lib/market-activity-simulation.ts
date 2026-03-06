/**
 * Market Activity Simulation: system trading bot to keep early-stage markets visibly active.
 * - Random small trades, trend following, momentum amplification.
 * - Respects AMM mechanics; avoids large manipulations; maintains natural volatility.
 * - Trades are tagged isSystemTrade and excluded from leaderboards.
 */

import { prisma } from "./db";
import { getOrCreateSystemUser } from "./system-user";
import { executeBuy, executeSell } from "./markets";
import { MIN_TRADE_AMOUNT } from "./constants";
import { buyQuote, sellQuote, getPriceFromReserves } from "./pool-amm";

/** Max price impact for a single system trade (1% = 100 bps). */
const MAX_SYSTEM_PRICE_IMPACT_BPS = 100;
/** Base max amount for system buy (before volatilityFactor and liquidity cap). */
const SYSTEM_TRADE_MAX_BASE = 40;
/** Min amount for system buy. */
const SYSTEM_TRADE_MIN = 1;

/**
 * Run one cycle of market activity simulation. Call from cron every 5 minutes.
 * - Selects markets with minDailyTrades > 0 that are below target activity.
 * - For each, may execute one small buy or sell (random / trend / momentum).
 */
export async function runMarketActivitySimulation(): Promise<{
  marketsChecked: number;
  tradesAttempted: number;
  tradesSucceeded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let tradesAttempted = 0;
  let tradesSucceeded = 0;

  const systemUser = await getOrCreateSystemUser().catch((e) => {
    errors.push("System user: " + (e instanceof Error ? e.message : String(e)));
    return null;
  });
  if (!systemUser) {
    return { marketsChecked: 0, tradesAttempted: 0, tradesSucceeded: 0, errors };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Markets that want minimum daily activity (minDailyTrades > 0), active, not paused
  const markets = await prisma.market.findMany({
    where: {
      minDailyTrades: { gt: 0 },
      status: "active",
      circuitBreakerUntil: { or: [{ lt: now }, { equals: null }] },
      archivedAt: null,
    },
    include: {
      positions: { where: { userId: systemUser.id }, select: { shares: true } },
    },
    take: 30,
  });

  const marketIds = markets.map((m) => m.id);
  const tradeCounts =
    marketIds.length === 0
      ? []
      : await prisma.trade.groupBy({
          by: ["marketId"],
          where: { marketId: { in: marketIds }, createdAt: { gte: oneDayAgo } },
          _count: true,
        });
  const countByMarket = new Map(tradeCounts.map((c) => [c.marketId, c._count]));

  for (const market of markets) {
    const dailyTradesSoFar = countByMarket.get(market.id) ?? 0;
    const targetPerDay = market.minDailyTrades;
    if (dailyTradesSoFar >= targetPerDay) continue;

    const volatilityFactor = Math.max(0.2, Math.min(2, market.volatilityFactor ?? 1));
    const systemPosition = market.positions[0];
    const hasShares = systemPosition && systemPosition.shares >= 0.01;

    const action = decideAction(market, hasShares, volatilityFactor);
    if (!action) continue;

    if (action.side === "buy") {
      const amount = clampSystemBuyAmount(market, volatilityFactor);
      if (amount < MIN_TRADE_AMOUNT) continue;
      tradesAttempted++;
      const result = await executeBuy({
        userId: systemUser.id,
        marketId: market.id,
        amount,
        isSystemTrade: true,
      });
      if ("error" in result) {
        errors.push(`Market ${market.canonical} buy: ${result.error}`);
      } else {
        tradesSucceeded++;
      }
    } else {
      const shares = clampSystemSellShares(market, systemPosition?.shares ?? 0, volatilityFactor);
      if (shares < 0.01) continue;
      tradesAttempted++;
      const result = await executeSell({
        userId: systemUser.id,
        marketId: market.id,
        shares,
        isSystemTrade: true,
      });
      if ("error" in result) {
        errors.push(`Market ${market.canonical} sell: ${result.error}`);
      } else {
        tradesSucceeded++;
      }
    }
    // At most one trade per market per run to keep distribution natural
  }

  return {
    marketsChecked: markets.length,
    tradesAttempted,
    tradesSucceeded,
    errors: errors.slice(0, 20),
  };
}

type Action = { side: "buy" } | { side: "sell" } | null;

/**
 * Decide buy vs sell: random small trades, trend following, momentum amplification.
 */
function decideAction(
  market: {
    price: number;
    priceChange24h: number;
    momentumScore: number;
    reserveTokens: number;
    reserveShares: number;
  },
  hasShares: boolean,
  _volatilityFactor: number
): Action {
  const poolLiquid = market.reserveTokens > 0 && market.reserveShares > 0;
  if (!poolLiquid) return null;

  // Trend following: positive price change -> bias buy; negative -> bias sell
  const trendBias = Math.sign(market.priceChange24h ?? 0);
  // Momentum: positive momentum -> bias buy
  const momentumBias = Math.sign(market.momentumScore ?? 0);
  const combinedBias = trendBias + momentumBias;
  const r = Math.random();
  let buyProbability = 0.5;
  if (combinedBias > 0) buyProbability = 0.6;
  else if (combinedBias < 0) buyProbability = 0.4;

  if (!hasShares) {
    // Can only buy
    return r < buyProbability ? { side: "buy" } : null;
  }
  if (r < buyProbability) return { side: "buy" };
  return { side: "sell" };
}

/**
 * Clamp buy amount: respect AMM, volatilityFactor, and max price impact.
 */
function clampSystemBuyAmount(
  market: { reserveTokens: number; reserveShares: number; volatilityFactor?: number | null },
  volatilityFactor: number
): number {
  const { reserveTokens, reserveShares } = market;
  if (reserveTokens <= 0 || reserveShares <= 0) return 0;
  const price = getPriceFromReserves(reserveTokens, reserveShares);
  const maxByImpact = (reserveTokens * MAX_SYSTEM_PRICE_IMPACT_BPS) / 10000;
  const baseMax = SYSTEM_TRADE_MAX_BASE * volatilityFactor;
  const cap = Math.min(baseMax, maxByImpact, reserveTokens * 0.02);
  const raw = SYSTEM_TRADE_MIN + Math.random() * (cap - SYSTEM_TRADE_MIN);
  const amount = Math.round(Math.max(SYSTEM_TRADE_MIN, Math.min(cap, raw)) * 100) / 100;
  const quote = buyQuote(reserveTokens, reserveShares, amount);
  if (quote.sharesOut <= 0) return SYSTEM_TRADE_MIN;
  return amount;
}

/**
 * Clamp sell shares: don't sell more than system position; small size for natural volatility.
 */
function clampSystemSellShares(
  market: { reserveTokens: number; reserveShares: number; volatilityFactor?: number | null },
  systemShares: number,
  volatilityFactor: number
): number {
  if (systemShares < 0.01) return 0;
  const { reserveTokens, reserveShares } = market;
  if (reserveTokens <= 0 || reserveShares <= 0) return 0;
  const maxByImpact = (reserveShares * MAX_SYSTEM_PRICE_IMPACT_BPS) / 10000;
  const baseMax = SYSTEM_TRADE_MAX_BASE * volatilityFactor;
  const cap = Math.min(baseMax, maxByImpact, systemShares * 0.5, systemShares);
  const raw = 0.01 + Math.random() * (cap - 0.01);
  const shares = Math.round(Math.max(0.01, Math.min(cap, raw)) * 100) / 100;
  const quote = sellQuote(reserveTokens, reserveShares, shares);
  if (quote.tokensOut <= 0) return 0.01;
  return Math.min(shares, systemShares);
}
