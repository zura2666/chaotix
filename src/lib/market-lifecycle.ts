/**
 * Market phases and lifecycle.
 * creation -> discovery (first trades) -> active -> dormant (no activity).
 */

import {
  MARKET_PHASE_CREATION,
  MARKET_PHASE_DISCOVERY,
  MARKET_PHASE_ACTIVE,
  MARKET_PHASE_DORMANT,
  MIN_INITIAL_BUY_TO_ACTIVATE,
  DORMANT_THRESHOLD_MS,
  CIRCUIT_BREAKER_PCT,
  CIRCUIT_BREAKER_COOLDOWN_MS,
  MAX_PRICE_IMPACT_BPS,
} from "./constants";

export type MarketPhase =
  | "creation"
  | "discovery"
  | "active"
  | "dormant";

export function getMarketPhase(market: {
  volume: number;
  tradeCount: number;
  lastTradeAt: Date | null;
  circuitBreakerUntil: Date | null;
  phase: string | null;
}): MarketPhase {
  if (market.circuitBreakerUntil && market.circuitBreakerUntil > new Date()) {
    return "active"; // still active but paused
  }
  const phase = (market.phase as MarketPhase) || MARKET_PHASE_CREATION;
  if (phase === MARKET_PHASE_DORMANT) return "dormant";
  if (market.tradeCount === 0 || market.volume < MIN_INITIAL_BUY_TO_ACTIVATE) {
    return MARKET_PHASE_CREATION;
  }
  if (phase === MARKET_PHASE_CREATION) return MARKET_PHASE_DISCOVERY;
  if (market.lastTradeAt) {
    const inactiveMs = Date.now() - market.lastTradeAt.getTime();
    if (inactiveMs >= DORMANT_THRESHOLD_MS) return MARKET_PHASE_DORMANT;
  }
  return MARKET_PHASE_ACTIVE;
}

export function phaseForDbAfterTrade(
  currentPhase: string,
  volume: number,
  tradeCount: number
): string {
  if (tradeCount > 0 && volume >= MIN_INITIAL_BUY_TO_ACTIVATE) {
    if (currentPhase === MARKET_PHASE_CREATION) return MARKET_PHASE_DISCOVERY;
    return MARKET_PHASE_ACTIVE;
  }
  return currentPhase;
}

export function shouldTriggerCircuitBreaker(
  prevPrice: number,
  newPrice: number
): boolean {
  if (prevPrice <= 0) return false;
  const pct = Math.abs((newPrice - prevPrice) / prevPrice) * 100;
  return pct >= CIRCUIT_BREAKER_PCT;
}

export function circuitBreakerCooldownMs(): number {
  return CIRCUIT_BREAKER_COOLDOWN_MS;
}

/**
 * Cap price impact for a trade (dampening).
 * Returns multiplier in (0, 1] for how much of the trade to allow, or 1 if under cap.
 */
export function priceImpactDampening(
  prevPrice: number,
  newPrice: number,
  isBuy: boolean
): number {
  if (prevPrice <= 0) return 1;
  const pctBps = Math.abs((newPrice - prevPrice) / prevPrice) * 10000;
  if (pctBps <= MAX_PRICE_IMPACT_BPS) return 1;
  return MAX_PRICE_IMPACT_BPS / pctBps;
}

export function isMarketTradingPaused(market: {
  circuitBreakerUntil: Date | null;
}): boolean {
  return !!(market.circuitBreakerUntil && market.circuitBreakerUntil > new Date());
}
