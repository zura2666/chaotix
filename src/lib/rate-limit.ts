/**
 * Rate limiter. In-memory by default; use Redis when EVENT_BUS_PROVIDER=redis or RATE_LIMIT_PROVIDER=redis.
 */

const store = new Map<string, number[]>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
function checkRateLimitMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const times = store.get(key) ?? [];
  const windowStart = now - windowMs;
  const recent = times.filter((t) => t > windowStart);
  if (recent.length >= limit) return false;
  recent.push(now);
  store.set(key, recent);
  return true;
}

const RATE_LIMIT_PREFIX = "rl:";

/**
 * Check rate limit. Uses in-memory store per process.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  return checkRateLimitMemory(key, limit, windowMs);
}

/**
 * Redis-backed rate limit for multi-instance. Always prefer this for API routes so
 * Redis is used when RATE_LIMIT_PROVIDER=redis or EVENT_BUS_PROVIDER=redis.
 * Returns true if under limit, false if over. Fixed window per key.
 */
export async function checkRateLimitAsync(key: string, limit: number, windowMs: number): Promise<boolean> {
  const useRedis = process.env.EVENT_BUS_PROVIDER === "redis" || process.env.RATE_LIMIT_PROVIDER === "redis";
  const production = process.env.NODE_ENV === "production";
  if (!useRedis) return checkRateLimitMemory(key, limit, windowMs);
  try {
    const { getRedis } = await import("./redis-client");
    const redis = getRedis();
    if (!redis || typeof (redis as { incr?: unknown }).incr !== "function") {
      if (production) return false;
      return checkRateLimitMemory(key, limit, windowMs);
    }
    const r = redis as { incr: (k: string) => Promise<number>; pexpire?: (k: string, ms: number) => Promise<string>; expire: (k: string, s: number) => Promise<string> };
    const k = RATE_LIMIT_PREFIX + key;
    const count = await r.incr(k);
    if (count === 1) {
      if (r.pexpire) await r.pexpire(k, windowMs);
      else await r.expire(k, Math.ceil(windowMs / 1000));
    }
    return count <= limit;
  } catch {
    if (production) return false;
    return checkRateLimitMemory(key, limit, windowMs);
  }
}

/** Use in API routes: const res = await rateLimit429(...); if (res) return res; */
export async function rateLimit429(
  key: string,
  limit: number,
  windowMs: number,
  message = "Too many requests"
): Promise<ReturnType<typeof import("next/server").NextResponse.json> | null> {
  const allowed = await checkRateLimitAsync(key, limit, windowMs);
  if (allowed) return null;
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": "60" } });
}

export function getRateLimitRemaining(
  key: string,
  limit: number,
  windowMs: number
): number {
  const now = Date.now();
  const times = store.get(key) ?? [];
  const recent = times.filter((t) => t > now - windowMs);
  return Math.max(0, limit - recent.length);
}

// Periodic cleanup to avoid memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    Array.from(store.keys()).forEach((key) => {
      const times = store.get(key)!;
      const filtered = times.filter((t) => t > now - 60000);
      if (filtered.length === 0) store.delete(key);
      else store.set(key, filtered);
    });
  }, CLEANUP_INTERVAL_MS);
}
