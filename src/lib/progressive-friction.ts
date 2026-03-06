/**
 * Progressive friction: market creation limits by trust level.
 */

import {
  DEFAULT_MARKET_CREATION_LIMIT,
  MAX_MARKET_CREATION_LIMIT,
  TRUST_LEVEL_FOR_MAX_LIMIT,
  MAX_NEW_MARKETS_PER_USER_PER_HOUR,
} from "./constants";

export function getMarketCreationLimit(user: {
  marketCreationLimit?: number | null;
  trustLevel?: number | null;
}): number {
  const limit = user.marketCreationLimit ?? DEFAULT_MARKET_CREATION_LIMIT;
  const trust = user.trustLevel ?? 0;
  if (trust >= TRUST_LEVEL_FOR_MAX_LIMIT) {
    return Math.max(limit, MAX_MARKET_CREATION_LIMIT);
  }
  return Math.min(limit, MAX_MARKET_CREATION_LIMIT);
}

export function getHourlyMarketLimit(user: {
  trustLevel?: number | null;
}): number {
  const trust = user.trustLevel ?? 0;
  return Math.min(
    MAX_NEW_MARKETS_PER_USER_PER_HOUR,
    Math.max(2, 2 + Math.floor(trust / 2))
  );
}
