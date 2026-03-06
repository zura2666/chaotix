/**
 * Global rate limiter for API abuse prevention.
 * In production use Redis; here we use in-memory with a short window.
 */

const store = new Map<string, number[]>();
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_MAX_PER_MINUTE = 200;

export function checkGlobalRateLimit(identifier: string): boolean {
  const now = Date.now();
  const key = `global:${identifier}`;
  const times = store.get(key) ?? [];
  const recent = times.filter((t) => t > now - GLOBAL_WINDOW_MS);
  if (recent.length >= GLOBAL_MAX_PER_MINUTE) return false;
  recent.push(now);
  store.set(key, recent);
  return true;
}

export function getGlobalLimitRemaining(identifier: string): number {
  const now = Date.now();
  const key = `global:${identifier}`;
  const times = store.get(key) ?? [];
  const recent = times.filter((t) => t > now - GLOBAL_WINDOW_MS);
  return Math.max(0, GLOBAL_MAX_PER_MINUTE - recent.length);
}
