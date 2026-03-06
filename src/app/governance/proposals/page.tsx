import { listProposals } from "@/lib/governance";
import { getFeatureFlag } from "@/lib/feature-flags";
import { ProposalsView } from "./ProposalsView";

export const metadata = {
  title: "Market Proposals · Governance · Chaotix",
  description: "Propose markets for community upvotes. When threshold is reached, the market is created.",
};

export default async function GovernanceProposalsPage() {
  const governanceDisabled = getFeatureFlag("governance_proposals") === "future";
  const [pending, approved] = governanceDisabled
    ? [[], []]
    : await Promise.all([
        listProposals({ status: "pending", limit: 30 }),
        listProposals({ status: "approved", limit: 10 }),
      ]);
  return (
    <ProposalsView
      pendingProposals={pending}
      approvedProposals={approved}
      featureFlagFuture={governanceDisabled}
    />
  );
}
