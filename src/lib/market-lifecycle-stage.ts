/**
 * Market lifecycle stages: emerging -> active -> established -> legendary | dead.
 */

import { prisma } from "./db";
import { getMarketReputation } from "./market-reputation";
import { createNotification } from "./notifications";
import {
  MARKET_STAGE_EMERGING,
  MARKET_STAGE_ACTIVE,
  MARKET_STAGE_ESTABLISHED,
  MARKET_STAGE_LEGENDARY,
  MARKET_STAGE_DEAD,
  STAGE_ACTIVE_TRADERS,
  STAGE_ESTABLISHED_TRADERS,
  STAGE_LEGENDARY_REPUTATION,
  STAGE_DEAD_DAYS,
} from "./constants";

const DEAD_MS = STAGE_DEAD_DAYS * 24 * 60 * 60 * 1000;
const STAGE_LABELS: Record<string, string> = {
  [MARKET_STAGE_EMERGING]: "Emerging",
  [MARKET_STAGE_ACTIVE]: "Active",
  [MARKET_STAGE_ESTABLISHED]: "Established",
  [MARKET_STAGE_LEGENDARY]: "Legendary",
  [MARKET_STAGE_DEAD]: "Dead",
};

export type MarketStage =
  | typeof MARKET_STAGE_EMERGING
  | typeof MARKET_STAGE_ACTIVE
  | typeof MARKET_STAGE_ESTABLISHED
  | typeof MARKET_STAGE_LEGENDARY
  | typeof MARKET_STAGE_DEAD;

export async function updateMarketStage(marketId: string): Promise<MarketStage> {
  const [market, distinctTraders, reputation] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: { tradeCount: true, lastTradeAt: true, stage: true, createdById: true, displayName: true, canonical: true },
    }),
    prisma.trade.findMany({
      where: { marketId },
      select: { userId: true },
      distinct: ["userId"],
    }),
    getMarketReputation(marketId),
  ]);
  if (!market) return MARKET_STAGE_EMERGING;

  const traders = distinctTraders.length;
  const repScore = reputation?.reputationScore ?? 0;
  const noTradeMs = market.lastTradeAt
    ? Date.now() - market.lastTradeAt.getTime()
    : Infinity;

  const oldStage = (market.stage as MarketStage) ?? MARKET_STAGE_EMERGING;
  let stage: MarketStage = oldStage;

  if (noTradeMs >= DEAD_MS) {
    stage = MARKET_STAGE_DEAD;
  } else if (stage !== MARKET_STAGE_DEAD) {
    if (repScore >= STAGE_LEGENDARY_REPUTATION) stage = MARKET_STAGE_LEGENDARY;
    else if (traders >= STAGE_ESTABLISHED_TRADERS) stage = MARKET_STAGE_ESTABLISHED;
    else if (traders >= STAGE_ACTIVE_TRADERS) stage = MARKET_STAGE_ACTIVE;
    else stage = MARKET_STAGE_EMERGING;
  }

  await prisma.market.update({
    where: { id: marketId },
    data: { stage },
  });

  if (market.createdById && stage !== MARKET_STAGE_DEAD && stage !== oldStage) {
    try {
      await createNotification({
        userId: market.createdById,
        type: "market_stage_upgrade",
        title: `Market stage: ${STAGE_LABELS[stage] ?? stage}`,
        body: `"${market.displayName}" upgraded to ${STAGE_LABELS[stage] ?? stage}.`,
        link: `/market/${market.canonical}`,
        payload: { marketId, oldStage, stage },
      });
    } catch {
      // ignore
    }
  }
  return stage;
}
