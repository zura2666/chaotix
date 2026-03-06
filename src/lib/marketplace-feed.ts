/**
 * Phase 5: Marketplace activity feed — trades by followed users, new listings by followed creators, trending discussions.
 */

import { prisma } from "./db";

const MARKETPLACE_ACTIVITY_TYPES = ["asset_trade", "asset_listing_created", "asset_comment"] as const;

export async function getMarketplaceFeedForUser(
  userId: string,
  limit = 50
): Promise<
  {
    id: string;
    userId: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: Date;
    user?: { name: string | null; username: string | null };
  }[]
> {
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  const allIds = [userId, ...followingIds];

  const activities = await prisma.activity.findMany({
    where: {
      userId: { in: allIds },
      type: { in: [...MARKETPLACE_ACTIVITY_TYPES] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, username: true } } },
  });

  return activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    type: a.type,
    payload: (a.payload ? JSON.parse(a.payload) : {}) as Record<string, unknown>,
    createdAt: a.createdAt,
    user: a.user,
  }));
}

export async function getTrendingDiscussions(limit = 10): Promise<
  {
    id: string;
    title: string;
    commentCount: number;
    communitySentimentScore: number;
  }[]
> {
  const assets = await prisma.asset.findMany({
    where: { commentCount: { gt: 0 } },
    orderBy: [{ commentCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      commentCount: true,
      communitySentimentScore: true,
    },
  });
  return assets;
}
