/**
 * Phase 11 + Production: Health check for DB, Redis, event bus, job queue.
 * GET /api/health returns 200 with { ok, db, redis?, eventBus?, jobQueue?, status }.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ComponentStatus = "up" | "down" | "disabled";

export async function GET() {
  const status: {
    ok: boolean;
    db: ComponentStatus;
    redis?: ComponentStatus;
    eventBus?: ComponentStatus;
    jobQueue?: ComponentStatus;
    status: string;
  } = {
    ok: true,
    db: "down",
    status: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.db = "up";
  } catch {
    status.ok = false;
    status.status = "db_unavailable";
    return NextResponse.json(status, { status: 503 });
  }

  const useRedis = process.env.EVENT_BUS_PROVIDER === "redis" || process.env.JOB_QUEUE_PROVIDER === "redis";
  if (useRedis) {
    try {
      const { getRedis } = await import("@/lib/redis-client");
      const redis = getRedis();
      if (redis) {
        await redis.ping();
        status.redis = "up";
        status.eventBus = process.env.EVENT_BUS_PROVIDER === "redis" ? "up" : "disabled";
        status.jobQueue = process.env.JOB_QUEUE_PROVIDER === "redis" ? "up" : "disabled";
      } else {
        status.redis = "down";
        status.eventBus = "down";
        status.jobQueue = "down";
        status.ok = false;
        status.status = "redis_unavailable";
        return NextResponse.json(status, { status: 503 });
      }
    } catch {
      status.redis = "down";
      status.eventBus = "down";
      status.jobQueue = "down";
      status.ok = false;
      status.status = "redis_unavailable";
      return NextResponse.json(status, { status: 503 });
    }
  } else {
    status.redis = "disabled";
    status.eventBus = "disabled";
    status.jobQueue = "disabled";
  }

  try {
    const pending = await prisma.tradeSettlement.count({
      where: { status: { in: ["pending", "submitted"] } },
    });
    (status as Record<string, unknown>).settlementPendingCount = pending;
  } catch {
    (status as Record<string, unknown>).settlementPendingCount = null;
  }

  if (process.env.JOB_QUEUE_PROVIDER === "redis") {
    try {
      const { getJobQueueLength } = await import("@/lib/redis-job-queue");
      const len = await getJobQueueLength();
      (status as Record<string, unknown>).jobQueueLength = len ?? null;
    } catch {
      (status as Record<string, unknown>).jobQueueLength = null;
    }
  }

  status.status = "ok";
  return NextResponse.json(status);
}
