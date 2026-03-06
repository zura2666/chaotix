/**
 * Founding traders: first N real traders get lower fees, badge, profile highlight.
 */

import { prisma } from "./db";
import { FOUNDING_TRADER_CAP, FOUNDING_TRADER_FEE_BPS } from "./constants";
import { awardBadge } from "./reputation";

export async function tryAwardFoundingTrader(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFoundingTrader: true },
  });
  if (user?.isFoundingTrader) return true;

  const count = await prisma.user.count({
    where: { isFoundingTrader: true },
  });
  if (count >= FOUNDING_TRADER_CAP) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { isFoundingTrader: true },
  });
  awardBadge(userId, "founding_trader").catch(() => {});
  return true;
}

export function getFoundingTraderFeeBps(isFoundingTrader: boolean): number {
  return isFoundingTrader ? FOUNDING_TRADER_FEE_BPS : 100;
}
