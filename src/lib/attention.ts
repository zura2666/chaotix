/**
 * Attention signal engine: internal_trading, comment_activity, market_views, unique_visitors.
 */

import { prisma } from "./db";
import { ATTENTION_WINDOW_MS } from "./constants";

const SOURCES = ["internal_trading", "comment_activity", "market_views", "unique_visitors"] as const;

export async function recordAttention(params: {
  marketId: string;
  source: (typeof SOURCES)[number];
  value?: number;
}) {
  const { marketId, source, value = 1 } = params;
  await prisma.attentionSignal.create({
    data: {
      marketId,
      source,
      attentionScore: value,
      attentionVelocity: value,
      attentionTrend: 0,
      windowStart: new Date(Date.now() - ATTENTION_WINDOW_MS),
      windowEnd: new Date(),
    },
  });
}

export async function updateAttentionAfterTrade(marketId: string, volumeDelta: number): Promise<void> {
  recordAttention({ marketId, source: "internal_trading", value: volumeDelta }).catch(() => {});
}

export async function updateAttentionAfterComment(marketId: string): Promise<void> {
  recordAttention({ marketId, source: "comment_activity", value: 1 }).catch(() => {});
}

export async function getMarketAttention(marketId: string) {
  const windowStart = new Date(Date.now() - ATTENTION_WINDOW_MS);
  const signals = await prisma.attentionSignal.findMany({
    where: { marketId, createdAt: { gte: windowStart } },
    select: { source: true, attentionScore: true, createdAt: true },
  });

  const bySource: Record<string, number> = {};
  let totalScore = 0;
  let velocity = 0;
  const recent = signals.filter((s) => s.createdAt.getTime() > Date.now() - 60 * 60 * 1000);
  for (const s of signals) {
    bySource[s.source] = (bySource[s.source] ?? 0) + s.attentionScore;
    totalScore += s.attentionScore;
  }
  for (const s of recent) {
    velocity += s.attentionScore;
  }
  const prevWindow = signals.filter(
    (s) => s.createdAt.getTime() < Date.now() - ATTENTION_WINDOW_MS / 2
  );
  const prevScore = prevWindow.reduce((a, b) => a + b.attentionScore, 0);
  const trend = prevScore > 0 ? (totalScore - prevScore) / prevScore : 0;

  return {
    attentionScore: totalScore,
    attentionVelocity: velocity,
    attentionTrend: Math.round(trend * 100) / 100,
    bySource,
  };
}

export async function getAttentionRanked(limit = 50) {
  const windowStart = new Date(Date.now() - ATTENTION_WINDOW_MS);
  const grouped = await prisma.attentionSignal.groupBy({
    by: ["marketId"],
    where: { createdAt: { gte: windowStart } },
    _sum: { attentionScore: true },
  });
  const sorted = grouped
    .filter((g) => (g._sum.attentionScore ?? 0) > 0)
    .sort((a, b) => (b._sum.attentionScore ?? 0) - (a._sum.attentionScore ?? 0))
    .slice(0, limit);
  return sorted.map((g) => ({ marketId: g.marketId, attentionScore: g._sum.attentionScore ?? 0 }));
}
