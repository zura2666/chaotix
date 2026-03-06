/**
 * Simple in-memory TTL cache for server-side data.
 * For production consider Redis or Next.js unstable_cache.
 */

const cache = new Map<string, { value: unknown; expires: number }>();
const DEFAULT_TTL_MS = 30 * 1000; // 30s

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.value as T;
  }
  const value = await fetcher();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function invalidateCache(keyPrefix: string): void {
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  });
}
