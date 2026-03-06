/**
 * Narrative Clusters: group related markets for concentrated liquidity and discovery.
 */

import { prisma } from "./db";

export type ClusterMarket = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  volume24h?: number | null;
  priceChange24h?: number | null;
  momentumScore?: number | null;
  uniqueTraders24h?: number | null;
};

export type NarrativeClusterWithMarkets = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  markets: ClusterMarket[];
  clusterStrengthIndex: number;
  totalVolume: number;
  totalVolume24h: number;
  narrativeMomentum: number;
};

/**
 * Cluster Strength Index: weighted average of market NSI (price) + volume and momentum.
 */
function computeClusterStrengthIndex(markets: ClusterMarket[]): number {
  if (markets.length === 0) return 0;
  const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
  if (totalVolume <= 0) {
    return markets.reduce((s, m) => s + m.price, 0) / markets.length;
  }
  let weighted = 0;
  for (const m of markets) {
    const w = Math.log(1 + m.volume) + (m.momentumScore ?? 0) * 0.1;
    weighted += m.price * w;
  }
  const sumW = markets.reduce(
    (s, m) => s + Math.log(1 + m.volume) + (m.momentumScore ?? 0) * 0.1,
    0
  );
  return sumW > 0 ? weighted / sumW : 0;
}

export async function getClusterBySlug(slug: string): Promise<NarrativeClusterWithMarkets | null> {
  const cluster = await prisma.narrativeCluster.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          market: {
            select: {
              id: true,
              canonical: true,
              displayName: true,
              price: true,
              volume: true,
              tradeCount: true,
              volume24h: true,
              priceChange24h: true,
              momentumScore: true,
              uniqueTraders24h: true,
            },
          },
        },
      },
    },
  });
  if (!cluster) return null;

  const markets: ClusterMarket[] = cluster.members.map((m) => m.market);
  const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
  const totalVolume24h = markets.reduce((s, m) => s + (m.volume24h ?? 0), 0);
  const narrativeMomentum =
    markets.length > 0
      ? markets.reduce((s, m) => s + (m.priceChange24h ?? 0), 0) / markets.length
      : 0;

  return {
    id: cluster.id,
    slug: cluster.slug,
    name: cluster.name,
    description: cluster.description,
    icon: cluster.icon,
    markets,
    clusterStrengthIndex: computeClusterStrengthIndex(markets),
    totalVolume,
    totalVolume24h,
    narrativeMomentum,
  };
}

export async function getTrendingClusters(limit = 6): Promise<NarrativeClusterWithMarkets[]> {
  const clusters = await prisma.narrativeCluster.findMany({
    include: {
      members: {
        include: {
          market: {
            select: {
              id: true,
              canonical: true,
              displayName: true,
              price: true,
              volume: true,
              tradeCount: true,
              volume24h: true,
              priceChange24h: true,
              momentumScore: true,
              uniqueTraders24h: true,
            },
          },
        },
      },
    },
  });

  const withScores: NarrativeClusterWithMarkets[] = clusters
    .filter((c) => c.members.length > 0)
    .map((c) => {
      const markets: ClusterMarket[] = c.members.map((m) => m.market);
      const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
      const totalVolume24h = markets.reduce((s, m) => s + (m.volume24h ?? 0), 0);
      const narrativeMomentum =
        markets.length > 0
          ? markets.reduce((s, m) => s + (m.priceChange24h ?? 0), 0) / markets.length
          : 0;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        markets,
        clusterStrengthIndex: computeClusterStrengthIndex(markets),
        totalVolume,
        totalVolume24h,
        narrativeMomentum,
      };
    });

  withScores.sort((a, b) => {
    const scoreA =
      a.clusterStrengthIndex * 2 +
      Math.log(1 + a.totalVolume24h) * 3 +
      a.narrativeMomentum * 10 +
      a.markets.length * 0.2;
    const scoreB =
      b.clusterStrengthIndex * 2 +
      Math.log(1 + b.totalVolume24h) * 3 +
      b.narrativeMomentum * 10 +
      b.markets.length * 0.2;
    return scoreB - scoreA;
  });

  return withScores.slice(0, limit);
}

export async function getTrendingClustersCached(limit = 6): Promise<NarrativeClusterWithMarkets[]> {
  const { getCached } = await import("./cache");
  const CACHE_TTL = 60 * 1000;
  return getCached(`trending-clusters:${limit}`, () => getTrendingClusters(limit), CACHE_TTL);
}

/** Top movers within a cluster (by absolute price change 24h). */
export function getTopMovers(cluster: NarrativeClusterWithMarkets, limit = 5): ClusterMarket[] {
  return [...cluster.markets]
    .filter((m) => m.priceChange24h != null)
    .sort((a, b) => Math.abs(b.priceChange24h ?? 0) - Math.abs(a.priceChange24h ?? 0))
    .slice(0, limit);
}

/** Top traders: markets with highest uniqueTraders24h in the cluster. */
export function getTopTraders(cluster: NarrativeClusterWithMarkets, limit = 5): ClusterMarket[] {
  return [...cluster.markets]
    .sort((a, b) => (b.uniqueTraders24h ?? 0) - (a.uniqueTraders24h ?? 0))
    .slice(0, limit);
}
