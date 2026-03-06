import { prisma } from "./db";
import {
  BASE_MARKET_CREATION_COOLDOWN_MS,
  MAX_MARKET_CREATION_COOLDOWN_MS,
  PLATFORM_GROWTH_COOLDOWN_FACTOR,
} from "./constants";

const GROWTH_WINDOW_MS = 60 * 60 * 1000;
const HIGH_GROWTH_THRESHOLD = 50;

export async function getAdaptiveCooldownMs(): Promise<number> {
  const windowStart = new Date(Date.now() - GROWTH_WINDOW_MS);
  const newMarketsLastHour = await prisma.market.count({
    where: { createdAt: { gte: windowStart } },
  });
  if (newMarketsLastHour < HIGH_GROWTH_THRESHOLD) return BASE_MARKET_CREATION_COOLDOWN_MS;
  const factor = Math.min(
    PLATFORM_GROWTH_COOLDOWN_FACTOR,
    1 + (newMarketsLastHour - HIGH_GROWTH_THRESHOLD) / 100
  );
  return Math.min(MAX_MARKET_CREATION_COOLDOWN_MS, Math.round(BASE_MARKET_CREATION_COOLDOWN_MS * factor));
}
