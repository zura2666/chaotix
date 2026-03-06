/**
 * String helpers. Prefer identifiers.ts for canonical/username/alias validation.
 */

import {
  normalizeIdentifier,
  slugToDisplayName,
  MAX_IDENTIFIER_LENGTH,
} from "./identifiers";

const MAX_CANONICAL_LEGACY = 200;
const SANITIZE_MAX_LENGTH = 500;

/**
 * Normalize for legacy/canonical lookup: lowercase, trim, single spaces.
 * @deprecated Prefer normalizeForLookup or normalizeIdentifier from identifiers.ts for new code.
 */
export function normalizeString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, MAX_CANONICAL_LEGACY);
}

/**
 * Sanitize user input: strip control chars, trim, limit length.
 * For market canonical/identifiers use validateIdentifier from identifiers.ts instead.
 * @deprecated Use identifiers.normalizeIdentifier + validateIdentifier for identifiers.
 */
export function sanitizeMarketString(raw: string): string {
  const s = String(raw)
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, SANITIZE_MAX_LENGTH);
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Check if two values are the same after normalization (legacy or identifier).
 */
export function isNearDuplicate(a: string, b: string): boolean {
  const na = normalizeIdentifier(a) || normalizeString(a);
  const nb = normalizeIdentifier(b) || normalizeString(b);
  return na === nb;
}

/**
 * Display name from slug identifier: elon_musk → "Elon Musk".
 * For legacy canonicals with spaces, capitalizes each word.
 */
export function toDisplayName(canonicalOrSlug: string): string {
  const trimmed = canonicalOrSlug.trim();
  if (/^[a-z0-9_-]+$/i.test(trimmed)) {
    return slugToDisplayName(trimmed.toLowerCase());
  }
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export { normalizeIdentifier, normalizeForLookup } from "./identifiers";
