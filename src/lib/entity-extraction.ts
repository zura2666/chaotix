/**
 * Phase 8: Market entity extraction and linking.
 * Extracts entities (person, event, topic) from market canonical/title and links to market.
 */

import { prisma } from "./db";
import { normalizeForLookup } from "./identifiers";

const ENTITY_TYPES = ["person", "event", "topic", "org"] as const;
const MIN_ENTITY_LEN = 2;
const MAX_ENTITY_LEN = 80;

/** Normalize entity name for lookup/storage: same rules as canonical identifiers. */
function normalizeEntity(name: string): string {
  return normalizeForLookup(name).slice(0, 200) || name.trim().toLowerCase().slice(0, 200);
}

/** Heuristic: capitalized multi-word or single notable word. */
function extractCandidates(text: string): { name: string; type: (typeof ENTITY_TYPES)[number] }[] {
  const out: { name: string; type: (typeof ENTITY_TYPES)[number] }[] = [];
  const seen = new Set<string>();
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/^[@#"'.,:;!?]+|['".,:;!?]+$/g, "");
    if (w.length < MIN_ENTITY_LEN || w.length > MAX_ENTITY_LEN) continue;
    const norm = normalizeEntity(w);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push({ name: w, type: "topic" });
    }
  }
  for (let len = 2; len <= 4 && len <= words.length; len++) {
    const phrase = words.slice(0, len).join(" ");
    const cleaned = phrase.replace(/^[@#"'.,:;!?]+|['".,:;!?]+$/g, "");
    if (cleaned.length < MIN_ENTITY_LEN || cleaned.length > MAX_ENTITY_LEN) continue;
    const norm = normalizeEntity(cleaned);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push({ name: cleaned, type: len === 1 ? "topic" : "event" });
    }
  }
  const fullNorm = normalizeEntity(text);
  if (fullNorm && fullNorm.length >= MIN_ENTITY_LEN && fullNorm.length <= MAX_ENTITY_LEN && !seen.has(fullNorm)) {
    out.push({ name: text.trim(), type: "event" });
  }
  return out.slice(0, 15);
}

export async function extractEntitiesFromMarket(marketId: string): Promise<{ entityId: string; relevance: number }[]> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { canonical: true, displayName: true, title: true },
  });
  if (!market) return [];
  const text = [market.canonical, market.displayName, market.title].filter(Boolean).join(" ");
  const candidates = extractCandidates(text);
  const linked: { entityId: string; relevance: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const { name, type } = candidates[i];
    const normalized = normalizeEntity(name);
    if (!normalized) continue;
    const entity = await prisma.marketEntity.upsert({
      where: { normalized },
      create: { name, type, normalized },
      update: {},
    });
    const relevance = 1 - i * 0.05;
    linked.push({ entityId: entity.id, relevance: Math.max(0.2, relevance) });
  }
  return linked;
}

export async function linkEntitiesToMarket(marketId: string): Promise<void> {
  const linked = await extractEntitiesFromMarket(marketId);
  await prisma.marketEntityLink.deleteMany({ where: { marketId } });
  if (linked.length === 0) return;
  await prisma.marketEntityLink.createMany({
    data: linked.map(({ entityId, relevance }) => ({ marketId, entityId, relevance })),
  });
}
