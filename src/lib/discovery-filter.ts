/**
 * Curated narratives: discovery only shows core markets OR markets with volume above threshold.
 */

import { DISCOVERY_VOLUME_THRESHOLD } from "./constants";

/** Prisma where clause: market is discoverable (core OR volume >= threshold). */
export function discoveryWhere(extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    OR: [
      { isCoreMarket: true },
      { volume: { gte: DISCOVERY_VOLUME_THRESHOLD } },
    ],
  } as const;
}
