/**
 * Tag validation: lowercase, alphanumeric + dash, max 20 chars.
 * Max 5 tags per market.
 */
const TAG_MAX_LENGTH = 20;
const TAG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const MAX_TAGS = 5;

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, TAG_MAX_LENGTH);
}

export function validateTag(tag: string): { ok: true; value: string } | { ok: false; error: string } {
  const normalized = normalizeTag(tag);
  if (normalized.length === 0) return { ok: false, error: "Tag is empty after normalization." };
  if (normalized.length > TAG_MAX_LENGTH) return { ok: false, error: `Tag must be at most ${TAG_MAX_LENGTH} characters.` };
  if (!TAG_REGEX.test(normalized)) return { ok: false, error: "Tag must be alphanumeric with optional dashes." };
  return { ok: true, value: normalized };
}

export function validateTags(tags: string[]): { ok: true; value: string[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const r = validateTag(t);
    if (!r.ok) return r;
    if (seen.has(r.value)) continue;
    seen.add(r.value);
    out.push(r.value);
  }
  if (out.length > MAX_TAGS) return { ok: false, error: `Maximum ${MAX_TAGS} tags allowed.` };
  return { ok: true, value: out };
}

export { TAG_MAX_LENGTH, MAX_TAGS };
