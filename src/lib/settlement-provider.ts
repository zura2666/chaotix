/**
 * On-chain settlement abstraction.
 * noopSettlementProvider: no verification. productionSettlementProvider: DB-backed settlement + optional wallet check.
 */

import { prisma } from "./db";

export type SettlementStatus = "pending" | "submitted" | "confirmed" | "failed";

export interface SettlementRequest {
  tradeId: string;
  userId: string;
  marketId: string;
  side: "buy" | "sell";
  amount: number;
  shares: number;
  chain?: string;
}

export interface SettlementResult {
  ok: boolean;
  settlementId?: string;
  status: SettlementStatus;
  txHash?: string;
  error?: string;
}

export interface ISettlementProvider {
  submit(request: SettlementRequest): Promise<SettlementResult>;
  getStatus(settlementId: string): Promise<{ status: SettlementStatus; txHash?: string }>;
  submitTrade?(request: SettlementRequest): Promise<SettlementResult>;
  confirmTrade?(settlementId: string): Promise<{ status: SettlementStatus; txHash?: string }>;
  syncBalance?(userId: string, chain?: string): Promise<{ balance: number }>;
}

export const noopSettlementProvider: ISettlementProvider = {
  async submit(): Promise<SettlementResult> {
    return { ok: true, status: "pending" };
  },
  async getStatus(): Promise<{ status: SettlementStatus }> {
    return { status: "pending" };
  },
  async submitTrade(req): Promise<SettlementResult> {
    return this.submit(req);
  },
  async confirmTrade(id): Promise<{ status: SettlementStatus }> {
    return this.getStatus(id);
  },
  async syncBalance(): Promise<{ balance: 0 }> {
    return { balance: 0 };
  },
};

/** DB-backed settlement: updates TradeSettlement; optionally requires verified wallet when SETTLEMENT_REQUIRE_WALLET=1. */
export function createProductionSettlementProvider(): ISettlementProvider {
  const requireWallet = process.env.SETTLEMENT_REQUIRE_WALLET === "1";
  return {
    async submit(req: SettlementRequest): Promise<SettlementResult> {
      if (requireWallet) {
        const verified = await prisma.walletAccount.findFirst({
          where: { userId: req.userId, verifiedAt: { not: null } },
          select: { id: true },
        });
        if (!verified) {
          return { ok: false, status: "failed", error: "Wallet verification required for settlement" };
        }
      }
      try {
        await prisma.tradeSettlement.upsert({
          where: { tradeId: req.tradeId },
          create: { tradeId: req.tradeId, status: "submitted" },
          update: { status: "submitted" },
        });
        return { ok: true, status: "submitted", settlementId: req.tradeId };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Settlement failed";
        try {
          const { auditSettlementFailure } = await import("./audit");
          await auditSettlementFailure(req.tradeId, msg);
          const { alertSettlementFailure } = await import("./admin-alerts");
          await alertSettlementFailure(req.tradeId, msg);
        } catch {
          // ignore
        }
        return { ok: false, status: "failed", error: msg };
      }
    },
    async getStatus(settlementId: string): Promise<{ status: SettlementStatus; txHash?: string }> {
      const s = await prisma.tradeSettlement.findUnique({
        where: { tradeId: settlementId },
        select: { status: true, txHash: true },
      });
      return { status: (s?.status as SettlementStatus) ?? "pending", txHash: s?.txHash ?? undefined };
    },
    async submitTrade(req: SettlementRequest): Promise<SettlementResult> {
      return this.submit(req);
    },
    async confirmTrade(settlementId: string): Promise<{ status: SettlementStatus; txHash?: string }> {
      try {
        await prisma.tradeSettlement.update({
          where: { tradeId: settlementId },
          data: { status: "confirmed", settledAt: new Date() },
        });
        return this.getStatus(settlementId);
      } catch {
        return this.getStatus(settlementId);
      }
    },
    async syncBalance(userId: string): Promise<{ balance: number }> {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      return { balance: u?.balance ?? 0 };
    },
  };
}

let provider: ISettlementProvider =
  process.env.SETTLEMENT_PROVIDER === "production" ? createProductionSettlementProvider() : noopSettlementProvider;

export function setSettlementProvider(p: ISettlementProvider): void {
  provider = p;
}

export function getSettlementProvider(): ISettlementProvider {
  return provider;
}
