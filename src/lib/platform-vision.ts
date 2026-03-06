/**
 * Foundation for future platform evolution:
 * - Event resolution markets
 * - Binary outcomes
 * - Time-based settlement
 * - Oracle system
 *
 * Not implemented yet — types and placeholders only.
 */

export type MarketOutcome = "binary" | "scalar" | "multi";
export type SettlementStatus = "open" | "resolved" | "disputed" | "void";

export interface IResolvableMarket {
  id: string;
  outcome: MarketOutcome;
  resolutionDeadline?: Date;
  settlementStatus: SettlementStatus;
  resolvedAt?: Date;
  resolvedValue?: number | string;
}

export interface IOracleResult {
  marketId: string;
  value: number | string;
  source: string;
  timestamp: Date;
}

/** Placeholder: future oracle integration. */
export function resolveMarket(
  _marketId: string,
  _value: number | string,
  _oracle: IOracleResult
): void {
  // No-op until event resolution is implemented.
}
