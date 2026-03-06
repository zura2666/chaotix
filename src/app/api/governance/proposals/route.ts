/**
 * Market proposals: list and create.
 * GET /api/governance/proposals?status=pending|approved
 * POST /api/governance/proposals — create (body: { proposedCanonical, title?, description? })
 * Early-stage: featureFlag "future" — governance proposals disabled.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createProposal, listProposals, canPropose } from "@/lib/governance";
import { assertCsrf } from "@/lib/csrf";
import { getFeatureFlag, futureFeatureResponse } from "@/lib/feature-flags";

export async function GET(req: NextRequest) {
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      { proposals: [], ...futureFeatureResponse("Governance proposals are temporarily disabled.") },
      { status: 503 }
    );
  }
  const status = (req.nextUrl.searchParams.get("status") ?? "pending") as "pending" | "approved" | "rejected";
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10) || 30);
  const list = await listProposals({ status, limit });
  return NextResponse.json({ proposals: list });
}

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance proposals are temporarily disabled. Create markets directly."),
      { status: 503 }
    );
  }
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPropose(user)) {
    return NextResponse.json(
      { error: "Minimum reputation required to propose a market." },
      { status: 403 }
    );
  }
  let body: { proposedCanonical?: string; title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const proposedCanonical = typeof body.proposedCanonical === "string" ? body.proposedCanonical.trim() : "";
  if (!proposedCanonical) {
    return NextResponse.json({ error: "proposedCanonical is required" }, { status: 400 });
  }
  const result = await createProposal(
    user.id,
    proposedCanonical,
    body.title,
    body.description
  );
  if (result.error && !result.proposal) {
    const status = result.error.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({
    proposal: result.proposal,
    message: "Proposal created. Get community upvotes to create the market.",
  });
}
