/**
 * Raw SQL helpers for User.referralStatus and User.partnerShortSlug.
 * Use these when the generated Prisma client doesn't yet include these fields
 * (e.g. before running `npx prisma generate` after schema change).
 * SQLite table name: "User" (Prisma default).
 */

import { prisma } from "./db";

export async function setUserReferralStatus(
  userId: string,
  referralStatus: string
): Promise<void> {
  await prisma.$executeRaw`UPDATE "User" SET referralStatus = ${referralStatus} WHERE id = ${userId}`;
}

export async function setUserReferralPending(
  userId: string,
  data: { twitterHandle: string | null; discordHandle: string | null; telegramHandle: string | null; referralPitch: string | null }
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET referralStatus = 'PENDING', twitterHandle = ${data.twitterHandle}, discordHandle = ${data.discordHandle}, telegramHandle = ${data.telegramHandle}, referralPitch = ${data.referralPitch}
    WHERE id = ${userId}
  `;
}

export async function setUserReferralApproved(
  userId: string,
  data: { referralCode: string; partnerShortSlug: string }
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET referralStatus = 'APPROVED', referralCode = ${data.referralCode}, partnerShortSlug = ${data.partnerShortSlug}
    WHERE id = ${userId}
  `;
}

/** Returns true if a user exists with the given referralCode or partnerShortSlug. */
export async function userExistsByReferralCodeOrSlug(
  referralCode: string,
  partnerShortSlug: string
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE referralCode = ${referralCode} OR partnerShortSlug = ${partnerShortSlug} LIMIT 1
  `;
  return rows.length > 0;
}

/** Find user id and referralCode by partnerShortSlug (for /r/[slug] redirect). */
export async function findUserByPartnerShortSlug(slug: string): Promise<{ id: string; referralCode: string } | null> {
  const rows = await prisma.$queryRaw<{ id: string; referralCode: string }[]>`
    SELECT id, referralCode FROM "User" WHERE partnerShortSlug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}
