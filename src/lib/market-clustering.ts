/**
 * Phase 8: Market clustering by conceptHash, entities, and semantic similarity.
 */

import { prisma } from "./db";
import { conceptSimilarity, normalizeMarketConcept } from "./market-concept";

const MIN_SIMILARITY = 0.35;
const MAX_CLUSTER_SIZE = 50;

export async function computeClustersForMarket(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { entityLinks: { include: { entity: { select: { normalized: true } } } } },
  });
  if (!market) return;

  const entityNormals = market.entityLinks.map((l) => l.entity.normalized).filter(Boolean);
  const concept = market.conceptHash ?? normalizeMarketConcept(market.canonical);

  const candidates = await prisma.market.findMany({
    where: {
      id: { not: marketId },
      status: "active",
    },
    include: { entityLinks: { include: { entity: { select: { normalized: true } } } } },
    take: 200,
  });

  const scores: { marketId: string; similarity: number }[] = [];
  for (const c of candidates) {
    let sim = conceptSimilarity(market.canonical, c.canonical);
    const otherConcept = c.conceptHash ?? normalizeMarketConcept(c.canonical);
    if (concept && otherConcept) {
      const conceptSim = concept === otherConcept ? 1 : conceptSimilarity(market.canonical, c.canonical);
      sim = (sim + conceptSim) / 2;
    }
    const otherNormals = new Set(c.entityLinks.map((l) => l.entity.normalized));
    let entityOverlap = 0;
    if (entityNormals.length > 0) {
      const match = entityNormals.filter((n) => otherNormals.has(n)).length;
      entityOverlap = match / Math.max(entityNormals.length, otherNormals.size);
    }
    const combined = sim * 0.7 + entityOverlap * 0.3;
    if (combined >= MIN_SIMILARITY) scores.push({ marketId: c.id, similarity: Math.round(combined * 100) / 100 });
  }
  scores.sort((a, b) => b.similarity - a.similarity);

  const clusterName = market.canonical.slice(0, 100);
  const existing = await prisma.marketCluster.findFirst({
    where: { name: clusterName },
    select: { id: true },
  });
  const clusterId = existing?.id ?? (await prisma.marketCluster.create({ data: { name: clusterName } })).id;

  await prisma.marketClusterMember.deleteMany({ where: { marketId } });
  const self = { marketId, similarity: 1 };
  const others = scores.filter((s) => s.marketId !== marketId).slice(0, MAX_CLUSTER_SIZE - 1);
  const toAdd = [self, ...others];
  if (toAdd.length > 0) {
    await prisma.marketClusterMember.createMany({
      data: toAdd.map((s) => ({ clusterId, marketId: s.marketId, similarity: s.similarity })),
    });
  }
}

export async function getMarketsInCluster(clusterId: string, limit = 20) {
  return prisma.marketClusterMember.findMany({
    where: { clusterId },
    orderBy: { similarity: "desc" },
    take: limit,
    include: { market: true },
  });
}

export async function getClustersForEntity(entityNormalized: string, limit = 10) {
  const entity = await prisma.marketEntity.findFirst({
    where: { normalized: entityNormalized },
    select: { id: true },
  });
  if (!entity) return [];
  const links = await prisma.marketEntityLink.findMany({
    where: { entityId: entity.id },
    select: { marketId: true },
    take: 50,
  });
  const marketIds = links.map((l) => l.marketId);
  if (marketIds.length === 0) return [];
  const members = await prisma.marketClusterMember.findMany({
    where: { marketId: { in: marketIds } },
    select: { clusterId: true, cluster: { select: { name: true } } },
  });
  const byCluster = new Map<string, { name: string; count: number }>();
  for (const m of members) {
    const cur = byCluster.get(m.clusterId) ?? { name: m.cluster.name, count: 0 };
    cur.count++;
    byCluster.set(m.clusterId, cur);
  }
  return Array.from(byCluster.entries())
    .map(([id, v]) => ({ clusterId: id, name: v.name, marketCount: v.count }))
    .sort((a, b) => b.marketCount - a.marketCount)
    .slice(0, limit);
}
