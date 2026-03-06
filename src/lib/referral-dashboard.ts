import { prisma } from "./db";

export async function getReferralDashboardData() {
  const [earnings, referredVolume] = await Promise.all([
    prisma.referralEarning.groupBy({
      by: ["referrerId"],
      _sum: { amount: true },
      _count: true,
    }),
    prisma.trade.groupBy({
      by: ["userId"],
      where: { user: { referredById: { not: null } } },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  const referrerIds = Array.from(new Set(earnings.map((e) => e.referrerId)));
  const users = await prisma.user.findMany({
    where: { id: { in: referrerIds } },
    select: { id: true, name: true, email: true, referralCode: true },
  });
  const [referredByUser, referredUserIds] = await Promise.all([
    prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { not: null } },
      _count: true,
    }),
    prisma.user.findMany({
      where: { id: { in: referredVolume.map((r) => r.userId) } },
      select: { id: true, referredById: true },
    }),
  ]);
  const volumeByReferrer = new Map<string, { volume: number; trades: number }>();
  const referredByIdMap = new Map(referredUserIds.map((u) => [u.id, u.referredById]));
  for (const r of referredVolume) {
    const referrerId = referredByIdMap.get(r.userId);
    if (referrerId) {
      const cur = volumeByReferrer.get(referrerId) ?? { volume: 0, trades: 0 };
      cur.volume += r._sum.total ?? 0;
      cur.trades += r._count;
      volumeByReferrer.set(referrerId, cur);
    }
  }
  const byReferrer = new Map(referredByUser.map((r) => [r.referredById!, r._count]));
  const byId = new Map(users.map((u) => [u.id, u]));
  const list = referrerIds
    .map((referrerId) => {
      const e = earnings.find((x) => x.referrerId === referrerId);
      const totalEarnings = e?._sum.amount ?? 0;
      const referralCount = byReferrer.get(referrerId) ?? 0;
      const { volume, trades } = volumeByReferrer.get(referrerId) ?? { volume: 0, trades: 0 };
      const conversionRate = referralCount > 0 ? (trades > 0 ? (trades / referralCount) * 100 : 0) : 0;
      return {
        user: byId.get(referrerId),
        totalEarnings,
        referralCount,
        volumeGenerated: volume,
        tradesGenerated: trades,
        conversionRate: Math.round(conversionRate * 10) / 10,
      };
    })
    .filter((x) => x.totalEarnings > 0 || x.volumeGenerated > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 50);
  return {
    leaderboard: list,
    metrics: {
      totalReferrers: list.length,
      totalVolumeFromReferrals: list.reduce((s, x) => s + x.volumeGenerated, 0),
      totalFeesFromReferrals: list.reduce((s, x) => s + x.totalEarnings, 0),
    },
  };
}
