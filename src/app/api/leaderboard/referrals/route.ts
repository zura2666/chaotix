import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const earnings = await prisma.referralEarning.groupBy({
    by: ["referrerId"],
    _sum: { amount: true },
    _count: true,
  });
  const referrerIds = earnings.map((e) => e.referrerId);
  const users = await prisma.user.findMany({
    where: { id: { in: referrerIds } },
    select: { id: true, name: true, email: true, referralCode: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const list = earnings
    .map((e) => ({
      user: byId.get(e.referrerId),
      totalEarnings: e._sum.amount ?? 0,
      referralCount: e._count,
    }))
    .filter((e) => e.totalEarnings > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 20);
  return NextResponse.json({ leaderboard: list });
}
