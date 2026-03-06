/**
 * Notification service: create and list notifications for users.
 */

import { prisma } from "./db";

export type NotificationType =
  | "price_spike"
  | "gravity_market"
  | "market_you_hold_moving"
  | "market_created_about_you"
  | "referral_trade"
  | "referral_approved"
  | "liquidity_opportunity"
  | "milestone_trades"
  | "milestone_lp"
  | "lp_reward"
  | "market_stage_upgrade";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      payload: params.payload ? JSON.stringify(params.payload) : null,
    },
  });
}

export async function getNotificationsForUser(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 50, unreadOnly = false } = options;
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function markAsRead(notificationIds: string[], userId: string): Promise<number> {
  if (notificationIds.length === 0) return 0;
  const result = await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
