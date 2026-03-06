/**
 * Narrative Intelligence Layer: global index, rising/collapsing narratives, derived cluster indexes.
 * Computes indexes using cluster averages and market narrative metrics.
 */

import { prisma } from "./db";
import { MIN_INITIAL_BUY_TO_ACTIVATE } from "./constants";

export type NarrativeIndexRow = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  index: number;           // 0–100 scale cluster average narrative strength
  momentum: number;         // average priceChange24h
  marketCount: number;
  totalVolume24h: number;
  clusterStrengthIndex: number;
};

export type NarrativeIndexResponse = {
  globalNarrativeIndex: number;
  topRisingNarratives: NarrativeIndexRow[];
  topCollapsingNarratives: NarrativeIndexRow[];
  indexes: {
    aiNarrativeIndex: number;
    cryptoNarrativeIndex: number;
    geopoliticsIndex: number;
    technologyIndex: number;
  };
  updatedAt: string;
};

const INDEX_SCALE = 100;  // scale narrative strength to 0–100 for display
const RISING_COLLAPSING_LIMIT = 10;
const CLUSTER_SLUG_AI = "artificial-intelligence";
const CLUSTER_SLUG_CRYPTO = "crypto";
const CLUSTER_SLUG_GEOPOLITICS = "geopolitics";
const CLUSTER_SLUG_TECHNOLOGY = "technology";

/**
 * Compute narrative strength for a market (0–1): NSI or price, blended with gravity.
 */
function marketNarrativeStrength(m: {
  narrativeScore?: number | null;
  price: number;
  gravityScore?: number | null;
  volume24h?: number | null;
}): number {
  const nsi = m.narrativeScore ?? m.price;
  const gravity = Math.min(1, (m.gravityScore ?? 0) / 10);
  return Math.min(1, Math.max(0, nsi * 0.7 + gravity * 0.3));
}

/**
 * Global Narrative Index: volume-weighted average of narrative strength across active markets, 0–100.
 */
async function computeGlobalNarrativeIndex(): Promise<number> {
  const markets = await prisma.market.findMany({
    where: {
      status: "active",
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    select: {
      price: true,
      narrativeScore: true,
      gravityScore: true,
      volume: true,
      volume24h: true,
    },
  });
  if (markets.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const m of markets) {
    const strength = marketNarrativeStrength(m);
    const w = Math.log(1 + (m.volume ?? 0) + (m.volume24h ?? 0) * 2);
    weightedSum += strength * w;
    totalWeight += w;
  }
  const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return Math.round(avg * INDEX_SCALE * 100) / 100;
}

/**
 * Load all clusters with member market metrics and compute per-cluster index (average strength) and momentum.
 */
async function getClustersWithIndexes(): Promise<NarrativeIndexRow[]> {
  const clusters = await prisma.narrativeCluster.findMany({
    include: {
      members: {
        include: {
          market: {
            select: {
              id: true,
              price: true,
              narrativeScore: true,
              gravityScore: true,
              volume: true,
              volume24h: true,
              priceChange24h: true,
              uniqueTraders24h: true,
              attentionVelocity: true,
            },
          },
        },
      },
    },
  });

  return clusters
    .filter((c) => c.members.length > 0)
    .map((c) => {
      const markets = c.members.map((m) => m.market);
      const totalVolume24h = markets.reduce((s, m) => s + (m.volume24h ?? 0), 0);
      const avgMomentum =
        markets.length > 0
          ? markets.reduce((s, m) => s + (m.priceChange24h ?? 0), 0) / markets.length
          : 0;
      const strengths = markets.map((m) => marketNarrativeStrength(m));
      const avgStrength = strengths.length > 0
        ? strengths.reduce((a, b) => a + b, 0) / strengths.length
        : 0;
      const index = Math.round(avgStrength * INDEX_SCALE * 100) / 100;
      const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
      const clusterStrengthIndex =
        totalVolume <= 0
          ? avgStrength
          : markets.reduce((s, m) => {
              const w = Math.log(1 + m.volume) + ((m.priceChange24h ?? 0) >= 0 ? 0.1 : 0);
              return s + (m.narrativeScore ?? m.price) * w;
            }, 0) / markets.reduce((s, m) => s + Math.log(1 + m.volume) + 0.1, 0);
      return {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        index,
        momentum: Math.round(avgMomentum * 10000) / 10000,
        marketCount: markets.length,
        totalVolume24h: Math.round(totalVolume24h * 100) / 100,
        clusterStrengthIndex: Math.round(clusterStrengthIndex * 100) / 100,
      };
    });
}

/**
 * Get derived index for a cluster slug (0–100). Returns 0 if cluster missing or no members.
 */
function getDerivedIndex(rows: NarrativeIndexRow[], slug: string): number {
  const row = rows.find((r) => r.slug === slug);
  return row?.index ?? 0;
}

/**
 * Build full Narrative Intelligence response: global index, rising, collapsing, derived indexes.
 */
export async function getNarrativeIndex(): Promise<NarrativeIndexResponse> {
  const [globalNarrativeIndex, clusterRows] = await Promise.all([
    computeGlobalNarrativeIndex(),
    getClustersWithIndexes(),
  ]);

  const byMomentum = [...clusterRows].sort((a, b) => b.momentum - a.momentum);
  const topRisingNarratives = byMomentum
    .filter((r) => r.momentum >= 0)
    .slice(0, RISING_COLLAPSING_LIMIT);
  const topCollapsingNarratives = [...byMomentum]
    .filter((r) => r.momentum < 0)
    .sort((a, b) => a.momentum - b.momentum)
    .slice(0, RISING_COLLAPSING_LIMIT);

  return {
    globalNarrativeIndex: Math.round(globalNarrativeIndex * 100) / 100,
    topRisingNarratives,
    topCollapsingNarratives,
    indexes: {
      aiNarrativeIndex: getDerivedIndex(clusterRows, CLUSTER_SLUG_AI),
      cryptoNarrativeIndex: getDerivedIndex(clusterRows, CLUSTER_SLUG_CRYPTO),
      geopoliticsIndex: getDerivedIndex(clusterRows, CLUSTER_SLUG_GEOPOLITICS),
      technologyIndex: getDerivedIndex(clusterRows, CLUSTER_SLUG_TECHNOLOGY),
    },
    updatedAt: new Date().toISOString(),
  };
}

// --- Index history for charts (clusterIndex = average(narrativeStrength) of cluster markets) ---

const SNAPSHOT_THROTTLE_MS = 15 * 60 * 1000; // record at most one snapshot per 15 min

export type NarrativeIndexSnapshotRow = {
  id: string;
  createdAt: Date;
  globalIndex: number;
  aiIndex: number;
  cryptoIndex: number;
  geopoliticsIndex: number;
  technologyIndex: number;
};

/** Record a snapshot if last one is older than throttle. Call after getNarrativeIndex() when serving API. */
export async function maybeRecordIndexSnapshot(data: NarrativeIndexResponse): Promise<void> {
  const last = await prisma.narrativeIndexSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < SNAPSHOT_THROTTLE_MS) return;
  await prisma.narrativeIndexSnapshot.create({
    data: {
      globalIndex: data.globalNarrativeIndex,
      aiIndex: data.indexes.aiNarrativeIndex,
      cryptoIndex: data.indexes.cryptoNarrativeIndex,
      geopoliticsIndex: data.indexes.geopoliticsIndex,
      technologyIndex: data.indexes.technologyIndex,
    },
  });
}

/** Get index history for charts (e.g. last N days). */
export async function getIndexHistory(days: number): Promise<NarrativeIndexSnapshotRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(365, days)));
  const rows = await prisma.narrativeIndexSnapshot.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    globalIndex: r.globalIndex,
    aiIndex: r.aiIndex,
    cryptoIndex: r.cryptoIndex,
    geopoliticsIndex: r.geopoliticsIndex,
    technologyIndex: r.technologyIndex,
  }));
}
