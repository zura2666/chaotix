/**
 * Centralized identifier format: URL- and API-safe, searchable, indexable.
 * Character set: a-z, 0-9, _ or -. Length: 3–32. No spaces, no special chars, no uppercase.
 */

export const MIN_IDENTIFIER_LENGTH = 3;
export const MAX_IDENTIFIER_LENGTH = 32;

const ALLOWED_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Strip control characters, trim, lowercase, remove accents, collapse non-allowed to single _.
 * Does not validate length; use validateIdentifier for that.
 */
export function normalizeIdentifier(raw: string): string {
  let s = String(raw)
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  s = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s.slice(0, MAX_IDENTIFIER_LENGTH);
}

/**
 * Validate and return normalized identifier. Throws with descriptive message if invalid.
 */
export function validateIdentifier(str: string): string {
  const normalized = normalizeIdentifier(str);
  if (normalized.length < MIN_IDENTIFIER_LENGTH) {
    throw new Error(
      `Identifier must be at least ${MIN_IDENTIFIER_LENGTH} characters (after normalization). Use only letters, numbers, and _ or -.`
    );
  }
  if (normalized.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(
      `Identifier must be at most ${MAX_IDENTIFIER_LENGTH} characters. Use only lowercase letters, numbers, and _ or -.`
    );
  }
  if (!ALLOWED_PATTERN.test(normalized)) {
    throw new Error(
      "Identifier can only contain lowercase letters (a-z), numbers (0-9), and single separators _ or -. No spaces or special characters."
    );
  }
  return normalized;
}

/**
 * Safe validation: returns error message instead of throwing. Use in API handlers.
 */
export function validateIdentifierSafe(str: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const value = validateIdentifier(str);
    return { ok: true, value };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid identifier.",
    };
  }
}

/**
 * Display name from slug: elon_musk → "Elon Musk", my-market → "My Market".
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalize for search/lookup: same as normalizeIdentifier but does not enforce length.
 * Use when matching or resolving existing data (e.g. URL segment, query param).
 */
export function normalizeForLookup(raw: string): string {
  return normalizeIdentifier(raw) || raw.trim().toLowerCase().slice(0, MAX_IDENTIFIER_LENGTH);
}

/** Validation rules description for API docs and UI. */
export const IDENTIFIER_RULES =
  "3–32 characters; only lowercase letters (a-z), numbers (0-9), and _ or -; no spaces or special characters.";

/** Alias for validateIdentifier for market canonical names. */
export function validateCanonicalName(str: string): string {
  return validateIdentifier(str);
}

/** Safe variant for canonical name. */
export function validateCanonicalNameSafe(str: string): { ok: true; value: string } | { ok: false; error: string } {
  return validateIdentifierSafe(str);
}

const MAX_DISPLAY_NAME_LENGTH = 100;

/**
 * Display names: allow letters, numbers, spaces, _ -. No leading/trailing whitespace; collapse multiple spaces.
 * Length 0–100. Use for market display names, user names, etc.
 */
export function validateDisplayName(raw: string): string {
  const s = String(raw)
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (s.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }
  return s;
}

export function validateDisplayNameSafe(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    return { ok: true, value: validateDisplayName(raw) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid display name.",
    };
  }
}
