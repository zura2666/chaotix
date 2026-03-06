import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMarketByCanonical } from "@/lib/markets";
import { prisma } from "@/lib/db";
import { MarketView } from "./MarketView";
import { toDisplayName } from "@/lib/strings";

type Props = { params: Promise<{ canonical: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const market = await getMarketByCanonical(decoded);
  const name = market?.displayName ?? toDisplayName(decoded.replace(/\s+/g, " "));
  const nsi = market?.narrativeScore ?? market?.price ?? 0;
  return {
    title: `${name} — ${nsi.toFixed(2)} Narrative Strength · Chaotix`,
    description: `Narrative Strength ${nsi.toFixed(2)} for "${name}". Collective attention and belief of traders.`,
    openGraph: {
      title: `${name} — ${nsi.toFixed(2)} Narrative Strength · Chaotix`,
      description: `Narrative Strength ${nsi.toFixed(2)}. Trade Nothing. Trade Everything.`,
    },
  };
}

export default async function MarketPage({ params }: Props) {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const market = await getMarketByCanonical(decoded);
  if (!market) notFound();
  const [recentTrades, relatedMarkets, narrativeEvents, topPosts, recentPosts, traderInsights] =
    await Promise.all([
      prisma.trade.findMany({
        where: { marketId: market.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      market.categoryId
        ? prisma.market.findMany({
            where: { categoryId: market.categoryId, id: { not: market.id }, status: "active" },
            orderBy: [{ volume: "desc" }, { tradeCount: "desc" }],
            take: 6,
            select: { id: true, canonical: true, displayName: true, price: true, volume: true, tradeCount: true },
          })
        : prisma.market.findMany({
            where: { id: { not: market.id }, status: "active" },
            orderBy: [{ volume: "desc" }],
            take: 6,
            select: { id: true, canonical: true, displayName: true, price: true, volume: true, tradeCount: true },
          }),
      prisma.narrativeEvent.findMany({
        where: { marketId: market.id },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
      prisma.marketPost.findMany({
        where: { marketId: market.id },
        orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
          trade: { select: { id: true, side: true, shares: true, price: true, createdAt: true } },
        },
      }),
      prisma.marketPost.findMany({
        where: { marketId: market.id },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          user: { select: { id: true, name: true, email: true } },
          trade: { select: { id: true, side: true, shares: true, price: true, createdAt: true } },
        },
      }),
      prisma.marketPost.findMany({
        where: { marketId: market.id, tradeId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
          trade: { select: { id: true, side: true, shares: true, price: true, createdAt: true } },
        },
      }),
    ]);
  const serializePost = (p: (typeof topPosts)[number]) => ({
    id: p.id,
    userId: p.userId,
    marketId: p.marketId,
    content: p.content,
    likes: p.likes,
    tradeId: p.tradeId,
    createdAt: p.createdAt.toISOString(),
    user: p.user,
    trade: p.trade
      ? {
          id: p.trade.id,
          side: p.trade.side,
          shares: p.trade.shares,
          price: p.trade.price,
          createdAt: p.trade.createdAt.toISOString(),
        }
      : null,
  });
  const serialized = {
    ...market,
    recentTrades: recentTrades.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    priceHistory: market.priceHistory.map((p) => ({
      ...p,
      timestamp: p.timestamp.toISOString(),
    })),
    relatedMarkets,
    narrativeEvents: narrativeEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      source: e.source,
      timestamp: e.timestamp.toISOString(),
      impactScore: e.impactScore,
      reactionCount: e.reactionCount,
    })),
    postsTop: topPosts.map(serializePost),
    postsRecent: recentPosts.map(serializePost),
    postsInsights: traderInsights.map(serializePost),
  };
  return <MarketView market={serialized} />;
}
