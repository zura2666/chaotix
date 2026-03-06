/**
 * Phase 10: Background job system for trend updates, cluster updates, entity extraction,
 * liquidity rewards, market lifecycle. Can integrate with Redis queue via env.
 */

import { prisma } from "./db";
import { linkEntitiesToMarket } from "./entity-extraction";
import { computeClustersForMarket } from "./market-clustering";
import { updateMarketStage } from "./market-lifecycle-stage";
import { updateMarketMetrics } from "./market-metrics";
import { updateMarketSentiment } from "./market-sentiment";

const JOB_QUEUE_PROVIDER = process.env.JOB_QUEUE_PROVIDER ?? "memory";

export type JobType =
  | "trend_updates"
  | "cluster_updates"
  | "entity_extraction"
  | "liquidity_rewards"
  | "market_lifecycle"
  | "market_metrics"
  | "market_sentiment";

export interface JobPayload {
  type: JobType;
  marketId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
  /** Retry count; used for backoff. */
  _attempt?: number;
}

const MAX_JOB_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runJob(payload: JobPayload): Promise<void> {
  switch (payload.type) {
    case "entity_extraction":
      if (payload.marketId) await linkEntitiesToMarket(payload.marketId);
      break;
    case "cluster_updates":
      if (payload.marketId) await computeClustersForMarket(payload.marketId);
      break;
    case "market_lifecycle":
      if (payload.marketId) await updateMarketStage(payload.marketId);
      break;
    case "market_metrics":
      if (payload.marketId) await updateMarketMetrics(payload.marketId);
      break;
    case "market_sentiment":
      if (payload.marketId) await updateMarketSentiment(payload.marketId);
      break;
    case "liquidity_rewards":
      try {
        const { distributeLiquidityRewards } = await import("./liquidity-rewards");
        await distributeLiquidityRewards?.();
      } catch {
        // optional module
      }
      break;
    case "trend_updates":
      // Trends are computed on-demand; no persistent cache to refresh
      break;
    default:
      break;
  }
}

const memoryQueue: JobPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function runJobWithRetry(payload: JobPayload): Promise<void> {
  const attempt = payload._attempt ?? 0;
  try {
    await runJob(payload);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[job failed]", payload.type, payload.marketId ?? payload.userId ?? "", "attempt", attempt + 1, err.message, err.stack);
    try {
      const { auditJobFailed } = await import("./audit");
      await auditJobFailed(payload.type, payload.marketId ?? payload.userId, err.message);
    } catch {
      // ignore
    }
    if (attempt < MAX_JOB_ATTEMPTS - 1) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
      await delay(backoffMs);
      memoryQueue.push({ ...payload, _attempt: attempt + 1 });
    }
  }
}

function flushMemoryQueue(): void {
  if (memoryQueue.length === 0) return;
  const batch = memoryQueue.splice(0, 50);
  Promise.all(batch.map((j) => runJobWithRetry(j))).then(() => {
    if (memoryQueue.length > 0) flushMemoryQueue();
  });
}

/**
 * Enqueue a job. With JOB_QUEUE_PROVIDER=redis, could push to Redis; otherwise in-memory.
 */
export function enqueueJob(payload: JobPayload): void {
  if (JOB_QUEUE_PROVIDER === "redis") {
    try {
      const { publishJob } = require("./redis-job-queue");
      publishJob(payload);
      return;
    } catch {
      // fallback to memory
    }
  }
  memoryQueue.push(payload);
  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushMemoryQueue();
    }, 5000);
  }
}

/**
 * Run a single job immediately (e.g. from cron or API).
 */
export async function runJobNow(payload: JobPayload): Promise<void> {
  await runJob(payload);
}

/**
 * Process all active markets for a given job type (batch).
 */
export async function runBatchJob(type: JobType, limit = 100): Promise<number> {
  if (type === "liquidity_rewards" || type === "trend_updates") {
    await runJob({ type });
    return 1;
  }
  const markets = await prisma.market.findMany({
    where: { status: "active" },
    select: { id: true },
    take: limit,
  });
  for (const m of markets) {
    await runJob({ type, marketId: m.id }).catch(() => {});
  }
  return markets.length;
}
