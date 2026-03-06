/**
 * Query performance metrics: record slow operations for auditing.
 */

import { prisma } from "./db";

const SLOW_MS = 500;
const KIND_PREFIX = "query_slow_";

export async function recordQueryMetric(
  name: string,
  durationMs: number,
  payload?: Record<string, unknown>
): Promise<void> {
  if (durationMs < SLOW_MS) return;
  try {
    await prisma.systemHealthMetric.create({
      data: {
        kind: KIND_PREFIX + name,
        value: durationMs,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
  } catch {
    // ignore
  }
}

export function withQueryMetric<T>(
  name: string,
  fn: () => Promise<T>,
  payload?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    recordQueryMetric(name, duration, payload).catch(() => {});
  });
}
