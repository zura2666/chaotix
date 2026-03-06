/**
 * Narrative Catalyst: real-world events (news, social trends) that move markets.
 * Events influence attentionVelocity and momentumScore for trending.
 */

import { prisma } from "./db";

const CATALYST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Apply recent narrative events to market's attentionVelocity and momentumScore.
 * Called after adding an event or periodically.
 */
export async function applyNarrativeCatalystToMarket(marketId: string): Promise<void> {
  const since = new Date(Date.now() - CATALYST_WINDOW_MS);
  const events = await prisma.narrativeEvent.findMany({
    where: { marketId, timestamp: { gte: since } },
    orderBy: { timestamp: "desc" },
    take: 50,
    select: { impactScore: true, reactionCount: true, timestamp: true },
  });

  if (events.length === 0) return;

  const now = Date.now();
  let velocityBoost = 0;
  let momentumBoost = 0;
  for (const e of events) {
    const ageHours = (now - e.timestamp.getTime()) / (60 * 60 * 1000);
    const decay = Math.exp(-ageHours / 48);
    velocityBoost += (e.impactScore || 0) * decay * 0.15;
    momentumBoost += (e.impactScore || 0) * decay * 2 + Math.log(1 + e.reactionCount) * 0.5;
  }

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { attentionVelocity: true, momentumScore: true },
  });
  if (!market) return;

  await prisma.market.update({
    where: { id: marketId },
    data: {
      attentionVelocity: market.attentionVelocity + velocityBoost,
      momentumScore: Math.max(0, market.momentumScore + momentumBoost),
    },
  });
}
