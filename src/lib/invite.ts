/**
 * Closed beta: invite-only access. Only invited users can trade; others browse.
 */

import { prisma } from "./db";
import {
  WAITLIST_STATUS_ACTIVE,
  WAITLIST_STATUS_WAITLISTED,
  BETA_REQUIRE_INVITE_TO_TRADE,
  PUBLIC_LAUNCH_MODE,
} from "./constants";

export function canUserTrade(waitlistStatus: string | null): boolean {
  if (PUBLIC_LAUNCH_MODE) return true;
  if (!BETA_REQUIRE_INVITE_TO_TRADE) return true;
  return waitlistStatus === WAITLIST_STATUS_ACTIVE;
}

export async function redeemInviteCode(userId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return { ok: false, error: "Invalid code" };

  const invite = await prisma.inviteCode.findUnique({
    where: { code: normalized },
  });
  if (!invite) return { ok: false, error: "Invalid or expired invite code" };
  if (invite.usedCount >= invite.maxUses) return { ok: false, error: "Invite code has reached max uses" };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { ok: false, error: "Invite code has expired" };

  await prisma.$transaction([
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        waitlistStatus: WAITLIST_STATUS_ACTIVE,
        inviteCodeUsed: normalized,
      },
    }),
  ]);
  return { ok: true };
}

export async function joinWaitlist(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { waitlistStatus: WAITLIST_STATUS_WAITLISTED },
  });
}

export async function getWaitlistConversionStats(): Promise<{
  waitlisted: number;
  invited: number;
  active: number;
  conversionRate: number;
}> {
  const [waitlisted, invited, active] = await Promise.all([
    prisma.user.count({ where: { waitlistStatus: WAITLIST_STATUS_WAITLISTED } }),
    prisma.user.count({ where: { inviteCodeUsed: { not: null }, waitlistStatus: WAITLIST_STATUS_ACTIVE } }),
    prisma.user.count({ where: { waitlistStatus: WAITLIST_STATUS_ACTIVE } }),
  ]);
  const totalWithInvite = waitlisted + active;
  const conversionRate = totalWithInvite > 0 ? (active / totalWithInvite) * 100 : 0;
  return { waitlisted, invited: active, active, conversionRate };
}
