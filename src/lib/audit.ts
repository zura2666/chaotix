/**
 * Audit logging for cron, failed jobs, and critical operations.
 */

import { prisma } from "./db";

export async function auditLog(params: {
  userId?: string | null;
  action: string;
  resource?: string | null;
  details?: string | null;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        resource: params.resource ?? undefined,
        details: params.details ?? undefined,
        ip: params.ip ?? undefined,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write", params.action, e);
  }
}

export async function auditCronRun(cronName: string, result: unknown, durationMs?: number): Promise<void> {
  await auditLog({
    action: "cron_run",
    resource: cronName,
    details: JSON.stringify({ result: typeof result === "object" ? result : { value: result }, durationMs }),
  });
}

export async function auditJobFailed(jobType: string, marketIdOrUserId: string | undefined, errorMessage: string): Promise<void> {
  await auditLog({
    action: "job_failed",
    resource: jobType,
    details: JSON.stringify({ marketId: marketIdOrUserId, error: errorMessage }),
  });
}

export async function auditSettlementFailure(tradeId: string, errorMessage: string): Promise<void> {
  await auditLog({
    action: "settlement_failure",
    resource: tradeId,
    details: errorMessage,
  });
}
