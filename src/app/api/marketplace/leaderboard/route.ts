import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const trades = await prisma.assetTrade.findMany({
    select: { buyerId: true, sellerId: true, quantity: true, unitPrice: true },
  });
  const volumeByUser = new Map<string, number>();
  const countByUser = new Map<string, number>();
  for (const t of trades) {
    const vol = t.quantity * t.unitPrice;
    for (const uid of [t.buyerId, t.sellerId]) {
      volumeByUser.set(uid, (volumeByUser.get(uid) ?? 0) + vol);
      countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
    }
  }
  const topTraderIds = Array.from(volumeByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const creators = await prisma.asset.groupBy({
    by: ["creatorId"],
    _count: true,
    _sum: { volume24h: true },
  });
  const topCreatorIds = creators
    .sort((a, b) => (b._sum.volume24h ?? 0) - (a._sum.volume24h ?? 0))
    .slice(0, 20)
    .map((r) => r.creatorId);

  const [traderUsers, creatorUsers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: topTraderIds } },
      select: { id: true, name: true, username: true },
    }),
    prisma.user.findMany({
      where: { id: { in: topCreatorIds } },
      select: { id: true, name: true, username: true },
    }),
  ]);

  const userMap = new Map([...traderUsers, ...creatorUsers].map((u) => [u.id, u]));
  const topTraders = topTraderIds.map((id) => ({
    user: userMap.get(id),
    volume: volumeByUser.get(id) ?? 0,
    tradeCount: countByUser.get(id) ?? 0,
  }));
  const topCreators = topCreatorIds.map((id) => {
    const c = creators.find((r) => r.creatorId === id);
    return {
      user: userMap.get(id),
      assetCount: c?._count ?? 0,
      volume24h: c?._sum.volume24h ?? 0,
    };
  });

  return NextResponse.json({ topTraders, topCreators });
}
