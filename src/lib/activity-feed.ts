/**
 * Phase 9: Activity feed — trade, market_created, market_trending, liquidity_added, referral_joined.
 */

import { prisma } from "./db";

const ACTIVITY_TYPES = [
  "trade",
  "market_created",
  "market_trending",
  "liquidity_added",
  "referral_joined",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export async function recordActivity(
  userId: string,
  type: ActivityType,
  payload: Record<string, unknown>
): Promise<void> {
  await prisma.activity.create({
    data: {
      userId,
      type,
      payload: JSON.stringify(payload),
    },
  });
}

export async function getFeedForUser(
  userId: string,
  limit = 50
): Promise<{ id: string; userId: string; type: string; payload: unknown; createdAt: Date; user?: { name: string | null; username: string | null } }[]> {
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  const allIds = [userId, ...followingIds];
  const activities = await prisma.activity.findMany({
    where: { userId: { in: allIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, username: true } } },
  });
  return activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    type: a.type,
    payload: a.payload ? JSON.parse(a.payload) : {},
    createdAt: a.createdAt,
    user: a.user,
  }));
}

export async function getPublicFeed(limit = 30): Promise<{ id: string; type: string; payload: unknown; createdAt: Date; user?: { name: string | null } }[]> {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });
  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    payload: a.payload ? JSON.parse(a.payload) : {},
    createdAt: a.createdAt,
    user: a.user,
  }));
}
