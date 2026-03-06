/**
 * Create admin alerts for settlement failures, market freezes, governance, suspicious activity.
 */

import { prisma } from "./db";

export async function createAdminAlert(params: {
  type: string;
  severity?: "low" | "medium" | "high" | "critical";
  resource?: string | null;
  resourceId?: string | null;
  message: string;
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.adminAlert.create({
      data: {
        type: params.type,
        severity: params.severity ?? "medium",
        resource: params.resource ?? undefined,
        resourceId: params.resourceId ?? undefined,
        message: params.message,
        payload: params.payload ? JSON.stringify(params.payload) : undefined,
      },
    });
  } catch (e) {
    console.error("[admin-alert] failed to create", params.type, e);
  }
}

export async function alertSettlementFailure(tradeId: string, errorMessage: string): Promise<void> {
  await createAdminAlert({
    type: "settlement_failure",
    severity: "high",
    resource: "trade",
    resourceId: tradeId,
    message: `Settlement failed: ${errorMessage}`,
    payload: { tradeId, error: errorMessage },
  });
}

export async function alertMarketFreeze(marketId: string, reason: string): Promise<void> {
  await createAdminAlert({
    type: "market_freeze",
    severity: "medium",
    resource: "market",
    resourceId: marketId,
    message: `Market frozen: ${reason}`,
    payload: { marketId, reason },
  });
}

export async function alertGovernanceVote(proposalId: string, userId: string, vote: string): Promise<void> {
  await createAdminAlert({
    type: "governance_vote",
    severity: "low",
    resource: "proposal",
    resourceId: proposalId,
    message: `Vote cast: ${vote}`,
    payload: { proposalId, userId, vote },
  });
}

export async function alertSuspiciousActivity(marketId: string, details: string, payload?: Record<string, unknown>): Promise<void> {
  await createAdminAlert({
    type: "suspicious_activity",
    severity: "high",
    resource: "market",
    resourceId: marketId,
    message: details,
    payload,
  });
}
