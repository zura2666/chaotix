/**
 * Market lifecycle: inactive detection and archive.
 * Archived markets are read-only.
 */

import { prisma } from "./db";
import { getMarketHealthScore } from "./markets";
import {
  ARCHIVE_NO_TRADE_DAYS,
  ARCHIVE_MIN_LIQUIDITY,
  ARCHIVE_MIN_ACTIVITY_SCORE,
  MARKET_STATUS_ACTIVE,
  MARKET_STATUS_INACTIVE,
  MARKET_STATUS_ARCHIVED,
} from "./constants";

const ARCHIVE_MS = ARCHIVE_NO_TRADE_DAYS * 24 * 60 * 60 * 1000;

export async function detectAndArchiveMarkets(): Promise<number> {
  const cutoff = new Date(Date.now() - ARCHIVE_MS);
  const candidates = await prisma.market.findMany({
    where: {
      status: { in: [MARKET_STATUS_ACTIVE, MARKET_STATUS_INACTIVE] },
      lastTradeAt: { lt: cutoff },
    },
    select: { id: true, volume: true, tradeCount: true, lastTradeAt: true },
  });
  let archived = 0;
  for (const m of candidates) {
    const health = getMarketHealthScore({
      volume: m.volume,
      tradeCount: m.tradeCount,
      lastTradeAt: m.lastTradeAt,
    });
    if (health < ARCHIVE_MIN_ACTIVITY_SCORE || m.volume < ARCHIVE_MIN_LIQUIDITY) {
      await prisma.market.update({
        where: { id: m.id },
        data: {
          status: MARKET_STATUS_ARCHIVED,
          archivedAt: new Date(),
        },
      });
      archived++;
    } else {
      await prisma.market.update({
        where: { id: m.id },
        data: { status: MARKET_STATUS_INACTIVE },
      });
    }
  }
  return archived;
}

export async function markInactiveStale(): Promise<number> {
  const cutoff = new Date(Date.now() - ARCHIVE_MS);
  const result = await prisma.market.updateMany({
    where: {
      status: MARKET_STATUS_ACTIVE,
      lastTradeAt: { lt: cutoff },
    },
    data: { status: MARKET_STATUS_INACTIVE },
  });
  return result.count;
}
