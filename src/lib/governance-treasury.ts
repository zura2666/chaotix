/**
 * When a governance proposal passes, trigger treasury/creator flows and alerting.
 */

import { prisma } from "./db";
import { createAdminAlert } from "./admin-alerts";
import { auditLog } from "./audit";

const TREASURY_REASON_GOVERNANCE_PASSED = "governance_proposal_passed";

export async function onProposalPassed(proposalId: string): Promise<void> {
  const proposal = await prisma.governanceProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, title: true, createdBy: true },
  });
  if (!proposal) return;

  await createAdminAlert({
    type: "governance_proposal_passed",
    severity: "medium",
    resource: "proposal",
    resourceId: proposalId,
    message: `Proposal passed: ${proposal.title}`,
    payload: { proposalId, title: proposal.title, createdBy: proposal.createdBy },
  });

  try {
    const transfer = await prisma.treasuryTransfer.create({
      data: {
        amount: 0,
        reason: TREASURY_REASON_GOVERNANCE_PASSED,
      },
    });
    await auditLog({
      action: "treasury_transfer",
      resource: transfer.id,
      details: JSON.stringify({ proposalId, reason: TREASURY_REASON_GOVERNANCE_PASSED, amount: 0 }),
    });
  } catch (e) {
    console.error("[governance] treasury record failed", e);
    await auditLog({
      action: "treasury_transfer_failed",
      resource: proposalId,
      details: String(e),
    });
  }
}
