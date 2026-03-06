import { CONCEPT_HASH_NORMALIZE_REGEX, CONCEPT_SIMILARITY_THRESHOLD } from "./constants";

export function normalizeMarketConcept(raw: string): string {
  const s = raw.trim().toLowerCase();
  const noAtHash = s.replace(/^[@#]+/, "").replace(CONCEPT_HASH_NORMALIZE_REGEX, " ");
  const words = noAtHash.split(/\s+/).filter(Boolean);
  const unique = Array.from(new Set(words));
  return unique.sort().join(" ");
}

export function conceptHash(concept: string): string {
  const n = normalizeMarketConcept(concept);
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h * 31 + n.charCodeAt(i)) >>> 0;
  }
  return "c" + h.toString(36);
}

export function conceptSimilarity(a: string, b: string): number {
  const na = normalizeMarketConcept(a);
  const nb = normalizeMarketConcept(b);
  if (!na || !nb) return 0;
  const setA = new Set(na.split(/\s+/));
  const setB = new Set(nb.split(/\s+/));
  let intersection = 0;
  setA.forEach((w) => {
    if (setB.has(w)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function shouldSuggestMerge(canonicalA: string, canonicalB: string): boolean {
  return conceptSimilarity(canonicalA, canonicalB) >= CONCEPT_SIMILARITY_THRESHOLD;
}
