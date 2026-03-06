/**
 * Feature flags for early-stage vs full platform.
 * Disabled systems are marked featureFlag: "future" for clarity in APIs and docs.
 */

export type FeatureFlagStatus = "enabled" | "future";

export type FeatureFlagKey =
  | "governance_proposals"
  | "settlement_providers"
  | "treasury_transfer"
  | "complex_risk_engine";

const FLAGS: Record<FeatureFlagKey, FeatureFlagStatus> = {
  /** Market creation via proposals + upvotes; when "future", use direct create only. */
  governance_proposals: "future",
  /** DB/wallet-backed settlement; when "future", noop settlement only. */
  settlement_providers: "future",
  /** Admin treasury transfers and governance-triggered transfers; when "future", disabled. */
  treasury_transfer: "future",
  /** Position %, daily loss, market exposure limits; when "future", use simplified rules only. */
  complex_risk_engine: "future",
};

export function getFeatureFlag(key: FeatureFlagKey): FeatureFlagStatus {
  return FLAGS[key] ?? "enabled";
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlag(key) === "enabled";
}

/** Standard response body when a feature is disabled (future). */
export function futureFeatureResponse(message?: string) {
  return {
    error: message ?? "This feature is temporarily disabled.",
    featureFlag: "future" as const,
  };
}
