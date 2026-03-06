/**
 * Phase 7: Create marketplace notifications (price alerts, outbid, trending, follower activity).
 */

import { createNotification } from "./notifications";

export async function maybeNotifyPriceAlert(
  assetId: string,
  assetTitle: string,
  currentPrice: number
): Promise<void> {
  const { prisma } = await import("./db");
  const alerts = await prisma.assetPriceAlert.findMany({
    where: { assetId, active: true },
    include: { asset: { select: { currentPrice: true } } },
  });
  for (const a of alerts) {
    const triggered =
      (a.direction === "above" && currentPrice >= a.threshold) ||
      (a.direction === "below" && currentPrice <= a.threshold);
    if (triggered) {
      await createNotification({
        userId: a.userId,
        type: "asset_price_alert",
        title: `Price alert: ${assetTitle}`,
        body: `Price is ${a.direction} ${a.threshold} (now ${currentPrice.toFixed(2)})`,
        link: `/marketplace/${assetId}`,
        payload: { assetId, threshold: a.threshold, direction: a.direction, currentPrice },
      });
      await prisma.assetPriceAlert.update({
        where: { id: a.id },
        data: { active: false },
      });
    }
  }
}

export async function notifyFollowerActivity(
  followerId: string,
  actorName: string,
  activityType: string,
  assetTitle: string,
  assetId: string
): Promise<void> {
  await createNotification({
    userId: followerId,
    type: "follower_activity",
    title: `${actorName} ${activityType}`,
    body: assetTitle,
    link: `/marketplace/${assetId}`,
    payload: { assetId },
  });
}

export async function notifyTrendingAsset(
  userId: string,
  assetTitle: string,
  assetId: string,
  rank: number
): Promise<void> {
  await createNotification({
    userId,
    type: "trending_asset",
    title: `Trending: ${assetTitle}`,
    body: `Now #${rank} on trending`,
    link: `/marketplace/${assetId}`,
    payload: { assetId, rank },
  });
}
