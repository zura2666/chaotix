/**
 * Market canonicalization: aliases resolve to a single canonical identifier.
 * All canonical and alias values use identifier format: a-z, 0-9, _, - (3–32 chars).
 */

import { prisma } from "./db";
import { normalizeIdentifier, normalizeForLookup } from "./identifiers";
import { normalizeString } from "./strings";

/** Normalize for clustering (legacy): lowercase, NFD, remove accents, collapse spaces. */
export function normalizeForCluster(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

/**
 * Resolve user input to canonical market string. Tries new identifier form first, then legacy.
 */
export async function resolveCanonical(aliasOrCanonical: string): Promise<string | null> {
  const trimmed = aliasOrCanonical.trim();
  if (!trimmed) return null;

  const norm = normalizeForLookup(trimmed);
  const alias = await prisma.marketAlias.findFirst({
    where: {
      OR: [{ alias: norm }, { normalized: norm }],
    },
    select: { canonical: true },
  });
  if (alias) return alias.canonical;
  const marketByNorm = await prisma.market.findUnique({
    where: { canonical: norm },
    select: { canonical: true },
  });
  if (marketByNorm) return marketByNorm.canonical;

  const legacyNorm = normalizeString(trimmed);
  const marketLegacy = await prisma.market.findUnique({
    where: { canonical: legacyNorm },
    select: { canonical: true },
  });
  return marketLegacy?.canonical ?? null;
}

/**
 * Resolve to canonical; if not found, returns normalized identifier form for new market creation.
 */
export async function resolveOrNormalize(input: string): Promise<{ canonical: string; fromAlias: boolean }> {
  const resolved = await resolveCanonical(input);
  if (resolved) return { canonical: resolved, fromAlias: true };
  const normalized = normalizeIdentifier(input.trim());
  const asCanonical = normalized || normalizeForLookup(input);
  return { canonical: asCanonical, fromAlias: false };
}

/** Add an alias for a canonical market. Alias is normalized to identifier format. */
export async function addAlias(canonical: string, alias: string): Promise<void> {
  const norm = normalizeIdentifier(alias.trim());
  if (!norm || norm.length < 3 || norm === canonical) return;
  await prisma.marketAlias.upsert({
    where: { alias: norm },
    create: { canonical, alias: norm, normalized: norm },
    update: { canonical, normalized: norm },
  });
}

/** Ensure the canonical market has variants as aliases (all normalized to identifier form). */
export async function ensureAliasesForMarket(canonical: string, variants: string[]): Promise<void> {
  for (const v of variants) {
    const norm = normalizeIdentifier(v.trim());
    if (norm.length >= 3 && norm !== canonical) await addAlias(canonical, norm).catch(() => {});
  }
}
