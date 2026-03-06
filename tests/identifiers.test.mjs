/**
 * Unit tests for identifier rules (mirrors src/lib/identifiers.ts logic).
 * Run: node --test tests/identifiers.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert";

const MIN = 3;
const MAX = 32;
const PATTERN = /^[a-z0-9_-]+$/;

function normalizeIdentifier(raw) {
  let s = String(raw).replace(/[\x00-\x1f\x7f]/g, "").trim();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s.slice(0, MAX);
}

function validateIdentifierSafe(str) {
  const normalized = normalizeIdentifier(str);
  if (normalized.length < MIN) return { ok: false, error: "too short" };
  if (normalized.length > MAX) return { ok: false, error: "too long" };
  if (!PATTERN.test(normalized)) return { ok: false, error: "invalid chars" };
  return { ok: true, value: normalized };
}

function slugToDisplayName(slug) {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

describe("identifiers", () => {
  it("normalizeIdentifier: lowercases and collapses separators", () => {
    assert.strictEqual(normalizeIdentifier("Elon Musk"), "elon_musk");
    assert.strictEqual(normalizeIdentifier("  MY-MARKET  "), "my-market");
  });

  it("validateIdentifierSafe: rejects short", () => {
    const r = validateIdentifierSafe("ab");
    assert.strictEqual(r.ok, false);
  });

  it("validateIdentifierSafe: accepts valid", () => {
    const r = validateIdentifierSafe("elon_musk");
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.value, "elon_musk");
  });

  it("slugToDisplayName: converts slug to title", () => {
    assert.strictEqual(slugToDisplayName("elon_musk"), "Elon Musk");
    assert.strictEqual(slugToDisplayName("my-market"), "My Market");
  });

  it("normalizeIdentifier: caps at MAX length", () => {
    const long = "a".repeat(50);
    assert.strictEqual(normalizeIdentifier(long).length, MAX);
  });
});
