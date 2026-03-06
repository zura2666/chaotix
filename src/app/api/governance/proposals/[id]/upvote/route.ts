/**
 * POST /api/governance/proposals/[id]/upvote — upvote a proposal (creates market when threshold reached)
 * Early-stage: featureFlag "future" — governance proposals disabled.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { upvoteProposal } from "@/lib/governance";
import { assertCsrf } from "@/lib/csrf";
import { getFeatureFlag, futureFeatureResponse } from "@/lib/feature-flags";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = assertCsrf(_req);
  if (csrfError) return csrfError;
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance proposals are temporarily disabled."),
      { status: 503 }
    );
  }
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: proposalId } = await params;
  const result = await upvoteProposal(proposalId, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to upvote" }, { status: 400 });
  }
  return NextResponse.json({
    upvoted: true,
    market: result.market ?? undefined,
    message: result.market
      ? "Proposal reached threshold; market was created."
      : "Upvote recorded.",
  });
}
