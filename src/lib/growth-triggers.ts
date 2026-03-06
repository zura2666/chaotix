/**
 * Push growth engine: trigger-based notifications and discovery/trending boosts.
 * Call from: gravity update, price double, market verified, influencer join.
 */

import { createNotification } from "./notifications";
import { prisma } from "./db";
import { eventBus, CHANNELS } from "./event-bus";
import { GRAVITY_THRESHOLD } from "./constants";

/** When a market reaches gravity threshold: notify followers / discovery, boost trending. */
export async function onGravityThresholdReached(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { canonical: true, displayName: true, gravityScore: true },
  });
  if (!market || (market.gravityScore ?? 0) < GRAVITY_THRESHOLD) return;
  const positions = await prisma.position.findMany({
    where: { marketId, shares: { gt: 0 } },
    select: { userId: true },
  });
  const title = `High gravity: ${market.displayName}`;
  const body = `This market crossed the gravity threshold and is trending.`;
  const link = `/market/${market.canonical}`;
  await Promise.all(
    positions.map((p) =>
      createNotification({
        userId: p.userId,
        type: "gravity_market",
        title,
        body,
        link,
        payload: { marketId },
      })
    )
  );
  eventBus.publish(CHANNELS.TRENDING, { type: "gravity_boost", marketId });
}

/** When a market doubles in price: notify holders, highlight in discovery. */
export async function onMarketPriceDoubled(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { canonical: true, displayName: true, price: true },
  });
  if (!market) return;
  const positions = await prisma.position.findMany({
    where: { marketId, shares: { gt: 0 } },
    select: { userId: true },
  });
  const title = `Price spike: ${market.displayName}`;
  const body = `Price has moved significantly. Check your position.`;
  const link = `/market/${market.canonical}`;
  await Promise.all(
    positions.map((p) =>
      createNotification({
        userId: p.userId,
        type: "price_spike",
        title,
        body,
        link,
        payload: { marketId, price: market.price },
      })
    )
  );
  eventBus.publish(CHANNELS.TRENDING, { type: "price_double_boost", marketId });
}

/** When a market gets verified: notify and boost. */
export async function onMarketVerified(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { canonical: true, displayName: true },
  });
  if (!market) return;
  const positions = await prisma.position.findMany({
    where: { marketId },
    select: { userId: true },
  });
  const title = `Market verified: ${market.displayName}`;
  const link = `/market/${market.canonical}`;
  await Promise.all(
    positions.map((p) =>
      createNotification({
        userId: p.userId,
        type: "gravity_market",
        title,
        body: "This market is now verified.",
        link,
        payload: { marketId },
      })
    )
  );
  eventBus.publish(CHANNELS.TRENDING, { type: "verified_boost", marketId });
}

/** When an influencer joins (e.g. first trade or flag): platform-wide highlight. */
export async function onInfluencerJoined(userId: string): Promise<void> {
  eventBus.publish(CHANNELS.SYSTEM, { type: "influencer_joined", userId });
  // Could create notifications for followers; for now we only publish to system channel.
}

/** Notify referrer when someone they referred trades. */
export async function onReferralTrade(referrerId: string, tradeId: string, amount: number): Promise<void> {
  await createNotification({
    userId: referrerId,
    type: "referral_trade",
    title: "Referral trade",
    body: `Someone you referred just traded. You earned a share of the fee.`,
    link: "/profile",
    payload: { tradeId, amount },
  });
}
