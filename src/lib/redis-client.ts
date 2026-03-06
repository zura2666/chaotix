/**
 * Shared Redis client for health checks, job queue, and optional rate limiting.
 * Returns null if Redis is not configured or ioredis is not available.
 */

export type RedisClient = {
  ping: () => Promise<string>;
  lpush: (key: string, ...values: string[]) => Promise<number>;
  llen: (key: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<string>;
  pexpire?: (key: string, ms: number) => Promise<string>;
};

let client: RedisClient | null | undefined;

export function getRedis(): RedisClient | null {
  if (client !== undefined) return client;
  const prov = process.env.EVENT_BUS_PROVIDER ?? process.env.JOB_QUEUE_PROVIDER;
  if (prov !== "redis" && prov !== "1") {
    client = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis") as new (url: string) => RedisClient;
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    client = new Redis(url);
    return client;
  } catch {
    client = null;
    return null;
  }
}
