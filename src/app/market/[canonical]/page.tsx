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
  return {
    title: `${name} — Chaotix`,
    description: `Trade "${name}" on Chaotix. One canonical market per string.`,
    openGraph: {
      title: `${name} — Chaotix`,
      description: `Trade "${name}". Trade Nothing. Trade Everything.`,
    },
  };
}

export default async function MarketPage({ params }: Props) {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const market = await getMarketByCanonical(decoded);
  if (!market) notFound();
  const recentTrades = await prisma.trade.findMany({
    where: { marketId: market.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, email: true } } },
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
  };
  return <MarketView market={serialized} />;
}
