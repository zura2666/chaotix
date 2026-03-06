/**
 * Seasonal Trading Competitions: daily, weekly, and season leaderboards.
 * Metrics: highest ROI, highest narrative discovery, highest trading volume.
 * Rewards: profile badges, permanent ranks (e.g. Narrative Wars Top 100).
 */

import { prisma } from "./db";
import { awardBadgeUnchecked } from "./reputation";

export type CompetitionPeriod = "daily" | "weekly" | "monthly" | "season";
export type CompetitionMetric = "roi" | "volume" | "narrative";

/** Special rank titles for top performers (profile badges, exclusive UI). */
export const RANK_TITLES: Record<CompetitionMetric, Record<number, string>> = {
  roi: { 1: "Signal Trader", 2: "Alpha Hunter", 3: "ROI Champion" },
  volume: { 1: "Market Architect", 2: "Volume King", 3: "Liquidity Legend" },
  narrative: { 1: "Narrative Hunter", 2: "Story Scout", 3: "Discovery Lead" },
};

export function getRankTitle(metric: CompetitionMetric, rank: number): string | null {
  const byMetric = RANK_TITLES[metric];
  return (byMetric && byMetric[rank]) ?? null;
}

function getWindow(period: CompetitionPeriod, season?: { startAt: Date; endAt: Date } | null): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;
  if (period === "season" && season) {
    start = new Date(season.startAt);
    const endSeason = new Date(season.endAt);
    if (endSeason < end) return { start, end: endSeason };
    return { start, end };
  }
  if (period === "daily") {
    start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === "monthly") {
    start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

export type CompetitionRow = {
  userId: string;
  user: { id: string; name: string | null; email: string | null; username?: string | null; badges?: string } | null;
  roi: number;
  volume: number;
  narrativeDiscovery: number;
  rank: number;
};

/** Get leaderboard for a time window: ROI, volume, narrative discovery. */
async function getLeaderboardInWindow(
  start: Date,
  end: Date,
  limit: number,
  metric: CompetitionMetric
): Promise<CompetitionRow[]> {
  const trades = await prisma.trade.findMany({
    where: { createdAt: { gte: start, lte: end }, isSystemTrade: false },
    select: {
      userId: true,
      side: true,
      total: true,
      realizedPnLContribution: true,
      marketId: true,
      createdAt: true,
    },
  });

  const volumeByUser = new Map<string, number>();
  const costByUser = new Map<string, number>();
  const pnlByUser = new Map<string, number>();
  for (const t of trades) {
    volumeByUser.set(t.userId, (volumeByUser.get(t.userId) ?? 0) + t.total);
    if (t.side === "buy") {
      costByUser.set(t.userId, (costByUser.get(t.userId) ?? 0) + t.total);
    } else if (t.side === "sell" && t.realizedPnLContribution != null) {
      pnlByUser.set(t.userId, (pnlByUser.get(t.userId) ?? 0) + t.realizedPnLContribution);
    }
  }

  const firstTradePerMarket = new Map<string, { userId: string; at: Date }>();
  for (const t of trades) {
    const key = t.marketId;
    const existing = firstTradePerMarket.get(key);
    if (!existing || t.createdAt < existing.at) {
      firstTradePerMarket.set(key, { userId: t.userId, at: t.createdAt });
    }
  }
  const narrativeByUser = new Map<string, number>();
  for (const { userId } of firstTradePerMarket.values()) {
    narrativeByUser.set(userId, (narrativeByUser.get(userId) ?? 0) + 1);
  }

  const userIds = new Set<string>([
    ...volumeByUser.keys(),
    ...pnlByUser.keys(),
    ...narrativeByUser.keys(),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, email: true, username: true, badges: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows: CompetitionRow[] = Array.from(userIds).map((userId) => {
    const cost = costByUser.get(userId) ?? 0;
    const pnl = pnlByUser.get(userId) ?? 0;
    const roi = cost >= 10 ? (pnl / cost) * 100 : 0;
    const volume = volumeByUser.get(userId) ?? 0;
    const narrativeDiscovery = narrativeByUser.get(userId) ?? 0;
    return {
      userId,
      user: userMap.get(userId) ?? null,
      roi,
      volume,
      narrativeDiscovery,
      rank: 0,
    };
  });

  if (metric === "roi") {
    rows.sort((a, b) => b.roi - a.roi);
  } else if (metric === "volume") {
    rows.sort((a, b) => b.volume - a.volume);
  } else {
    rows.sort((a, b) => b.narrativeDiscovery - a.narrativeDiscovery);
  }
  const limited = rows.slice(0, limit);
  limited.forEach((r, i) => {
    r.rank = i + 1;
  });
  return limited;
}

export async function getCompetitionLeaderboard(
  period: CompetitionPeriod,
  metric: CompetitionMetric,
  limit: number,
  seasonId?: string | null
): Promise<{ rows: CompetitionRow[]; season: { id: string; name: string; slug: string; startAt: string; endAt: string } | null; window: { start: string; end: string } }> {
  let season: { id: string; name: string; slug: string; startAt: Date; endAt: Date } | null = null;
  if (period === "season") {
    if (seasonId) {
      const s = await prisma.season.findUnique({ where: { id: seasonId } });
      season = s;
    } else {
      season = await prisma.season.findFirst({
        where: { endAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
      });
      if (!season) {
        season = await prisma.season.findFirst({ orderBy: { endAt: "desc" } });
      }
    }
  }

  const window = getWindow(period, season ?? undefined);
  const rows = await getLeaderboardInWindow(window.start, window.end, limit, metric);

  return {
    rows,
    season: season
      ? {
          id: season.id,
          name: season.name,
          slug: season.slug,
          startAt: season.startAt.toISOString(),
          endAt: season.endAt.toISOString(),
        }
      : null,
    window: { start: window.start.toISOString(), end: window.end.toISOString() },
  };
}

/** Get current active season (or latest past). */
export async function getCurrentSeason() {
  const active = await prisma.season.findFirst({
    where: { startAt: { lte: new Date() }, endAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });
  if (active) return active;
  return prisma.season.findFirst({ orderBy: { endAt: "desc" } });
}

/** Get all seasons for dropdown. */
export async function getSeasons(limit = 10) {
  return prisma.season.findMany({
    orderBy: { startAt: "desc" },
    take: limit,
  });
}

/** Get finalized season ranks (top N with permanent rank/badge). */
export async function getSeasonRanks(seasonId: string, limit = 100) {
  const ranks = await prisma.seasonRank.findMany({
    where: { seasonId },
    orderBy: { rank: "asc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true, username: true, badges: true } },
      season: { select: { name: true, slug: true } },
    },
  });
  return ranks.map((r) => ({
    rank: r.rank,
    userId: r.userId,
    user: r.user,
    roiScore: r.roiScore,
    narrativeScore: r.narrativeScore,
    volumeScore: r.volumeScore,
    permanentRankTitle: r.permanentRankTitle,
    badgeAwarded: r.badgeAwarded,
    season: r.season,
  }));
}

/**
 * Refresh current-period ranks on User (weekly by default). Call from cron or on-demand for near real-time leaderboards.
 * Sets roiRank, volumeRank, narrativeRank, seasonScore, rankTitle for users in top 100 per metric.
 */
export async function refreshUserCompetitionRanks(period: CompetitionPeriod = "weekly"): Promise<{ updated: number }> {
  const window = getWindow(period, null);
  const limit = 500;
  const [byRoi, byVolume, byNarrative] = await Promise.all([
    getLeaderboardInWindow(window.start, window.end, limit, "roi"),
    getLeaderboardInWindow(window.start, window.end, limit, "volume"),
    getLeaderboardInWindow(window.start, window.end, limit, "narrative"),
  ]);

  const roiRankByUser = new Map<string, number>();
  byRoi.forEach((r, i) => roiRankByUser.set(r.userId, i + 1));
  const volumeRankByUser = new Map<string, number>();
  byVolume.forEach((r, i) => volumeRankByUser.set(r.userId, i + 1));
  const narrativeRankByUser = new Map<string, number>();
  byNarrative.forEach((r, i) => narrativeRankByUser.set(r.userId, i + 1));

  const userIds = new Set([...roiRankByUser.keys(), ...volumeRankByUser.keys(), ...narrativeRankByUser.keys()]);
  let updated = 0;
  for (const userId of userIds) {
    const roiRank = roiRankByUser.get(userId) ?? 0;
    const volumeRank = volumeRankByUser.get(userId) ?? 0;
    const narrativeRank = narrativeRankByUser.get(userId) ?? 0;
    const composite = (roiRank ? 1 / roiRank : 0) + (volumeRank ? 1 / volumeRank : 0) + (narrativeRank ? 1 / narrativeRank : 0);
    const bestRoi = getRankTitle("roi", roiRank);
    const bestVol = getRankTitle("volume", volumeRank);
    const bestNarr = getRankTitle("narrative", narrativeRank);
    const rankTitle = bestRoi ?? bestVol ?? bestNarr ?? null;
    await prisma.user.update({
      where: { id: userId },
      data: {
        seasonScore: Math.round(composite * 1000) / 1000,
        roiRank,
        volumeRank,
        narrativeRank,
        rankTitle,
      },
    });
    updated++;
  }
  return { updated };
}

/** Compute and save season ranks (cron): call when season ends. */
export async function finalizeSeasonRanks(seasonId: string): Promise<void> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return;
  const start = new Date(season.startAt);
  const end = new Date(season.endAt);
  const topN = season.topRankCount;

  const [byRoi, byVolume, byNarrative] = await Promise.all([
    getLeaderboardInWindow(start, end, topN * 2, "roi"),
    getLeaderboardInWindow(start, end, topN * 2, "volume"),
    getLeaderboardInWindow(start, end, topN * 2, "narrative"),
  ]);

  const pointsByUser = new Map<string, { roi: number; volume: number; narrative: number; roiRank: number; volRank: number; narrRank: number }>();
  byRoi.forEach((r, i) => {
    pointsByUser.set(r.userId, {
      roi: r.roi,
      volume: 0,
      narrative: 0,
      roiRank: i + 1,
      volRank: 0,
      narrRank: 0,
    });
  });
  byVolume.forEach((r, i) => {
    const cur = pointsByUser.get(r.userId);
    if (cur) {
      cur.volume = r.volume;
      cur.volRank = i + 1;
    } else {
      pointsByUser.set(r.userId, { roi: 0, volume: r.volume, narrative: 0, roiRank: 0, volRank: i + 1, narrRank: 0 });
    }
  });
  byNarrative.forEach((r, i) => {
    const cur = pointsByUser.get(r.userId);
    if (cur) {
      cur.narrative = r.narrativeDiscovery;
      cur.narrRank = i + 1;
    } else {
      pointsByUser.set(r.userId, { roi: 0, volume: 0, narrative: r.narrativeDiscovery, roiRank: 0, volRank: 0, narrRank: i + 1 });
    }
  });

  const combined = Array.from(pointsByUser.entries()).map(([userId, p]) => ({
    userId,
    roiScore: p.roi,
    volumeScore: p.volume,
    narrativeScore: p.narrative,
    compositeScore: (p.roiRank ? 1 / p.roiRank : 0) + (p.volRank ? 1 / p.volRank : 0) + (p.narrRank ? 1 / p.narrRank : 0),
  }));
  combined.sort((a, b) => b.compositeScore - a.compositeScore);
  const ranked = combined.slice(0, topN);

  const slug = season.slug;
  const name = season.name;
  const badgeAwarded = `${slug.replace(/-/g, "_")}_top_100`;
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const rank = i + 1;
    const permanentRankTitle = `${name} Top ${rank}`;
    await prisma.seasonRank.upsert({
      where: {
        seasonId_userId: { seasonId, userId: r.userId },
      },
      create: {
        seasonId,
        userId: r.userId,
        rank,
        roiScore: r.roiScore,
        narrativeScore: r.narrativeScore,
        volumeScore: r.volumeScore,
        permanentRankTitle,
        badgeAwarded,
      },
      update: {
        rank,
        roiScore: r.roiScore,
        narrativeScore: r.narrativeScore,
        volumeScore: r.volumeScore,
        permanentRankTitle,
        badgeAwarded,
      },
    });
    await awardBadgeUnchecked(r.userId, badgeAwarded);
  }
}
