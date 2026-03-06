/**
 * Phase 5: Record marketplace activities for social feed.
 * Phase 7: Follower activity notifications.
 */

import { recordActivity } from "./activity-feed";
import { prisma } from "./db";
import { notifyFollowerActivity } from "./marketplace-notifications";

export async function recordAssetTrade(
  buyerId: string,
  payload: { assetId: string; tradeId: string; quantity: number; unitPrice: number; sellerId: string }
): Promise<void> {
  await recordActivity(buyerId, "asset_trade", payload);
  const followers = await prisma.userFollow.findMany({
    where: { followingId: buyerId },
    select: { followerId: true },
  });
  const asset = await prisma.asset.findUnique({
    where: { id: payload.assetId },
    select: { title: true },
  });
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { name: true, username: true },
  });
  const actorName = buyer?.name || buyer?.username || "Someone";
  for (const f of followers) {
    notifyFollowerActivity(f.followerId, actorName, "bought", asset?.title ?? "asset", payload.assetId).catch(() => { });
  }
}


