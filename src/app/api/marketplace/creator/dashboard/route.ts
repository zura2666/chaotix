import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [assets, sales, demand, followers, trades] = await Promise.all([
    prisma.asset.findMany({
      where: { creatorId: user.id },
      select: {
        id: true,
        title: true,
        currentPrice: true,
        totalSupply: true,
        volume24h: true,
        tradeCount24h: true,
        demandScore: true,
        watcherCount: true,
        commentCount: true,
        priceChange24h: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assetTrade.aggregate({
      where: { sellerId: user.id },
      _sum: { quantity: true },
      _count: true,
    }),
    prisma.assetTrade.aggregate({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      _sum: { quantity: true },
      _count: true,
    }),
    prisma.userFollow.count({ where: { followingId: user.id } }),
    prisma.assetTrade.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        asset: { select: { id: true, title: true } },
        buyer: { select: { username: true, name: true } },
        seller: { select: { username: true, name: true } },
      },
    }),
  ]);

  const totalVolume = assets.reduce((s, a) => s + a.volume24h * (a.currentPrice || 1), 0);
  const pricePerformance = assets
    .filter((a) => a.priceChange24h !== 0)
    .map((a) => ({ id: a.id, title: a.title, change: a.priceChange24h }));

  return NextResponse.json({
    assets,
    sales: {
      totalTrades: sales._count,
      totalQuantity: sales._sum.quantity ?? 0,
    },
    demand: {
      totalTrades: demand._count,
      totalQuantity: demand._sum.quantity ?? 0,
    },
    followers,
    pricePerformance,
    recentTrades: trades,
    totalVolume24h: assets.reduce((s, a) => s + a.volume24h, 0),
  });
}
