/**
 * Redis-backed job queue. Used when JOB_QUEUE_PROVIDER=redis.
 * Jobs are LPUSH to chaotix:job_queue; a worker or cron can process via runJobNow / runBatchJob.
 */

import type { JobPayload } from "./jobs";

export const QUEUE_KEY = "chaotix:job_queue";

function getClient(): import("./redis-client").RedisClient | null {
  try {
    const { getRedis } = require("./redis-client");
    return getRedis();
  } catch {
    return null;
  }
}

export function publishJob(payload: JobPayload): void {
  const client = getClient();
  if (!client) return;
  const value = JSON.stringify(payload);
  client.lpush(QUEUE_KEY, value).catch((e: unknown) => console.error("Redis job queue push failed", e));
}

/** Return current job queue length for health/monitoring. */
export async function getJobQueueLength(): Promise<number | null> {
  const client = getClient();
  if (!client || typeof (client as { llen?: unknown }).llen !== "function") return null;
  try {
    return await (client as { llen: (k: string) => Promise<number> }).llen(QUEUE_KEY);
  } catch {
    return null;
  }
}
