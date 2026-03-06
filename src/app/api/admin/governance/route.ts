import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { onProposalPassed } from "@/lib/governance-treasury";
import { getFeatureFlag, futureFeatureResponse } from "@/lib/feature-flags";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance proposals are temporarily disabled."),
      { status: 503 }
    );
  }
  const proposals = await prisma.governanceProposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { votes: true },
  });
  return NextResponse.json({ proposals });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance proposals are temporarily disabled."),
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 2000) : "";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const proposal = await prisma.governanceProposal.create({
    data: { title, description, createdBy: user.id, status: "active" },
  });
  return NextResponse.json({ proposal });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance proposals are temporarily disabled."),
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const proposalId = body.proposalId ?? body.id;
  const status = body.status;
  if (!proposalId || typeof proposalId !== "string") {
    return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  }
  const validStatuses = ["active", "passed", "rejected", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "status must be one of: " + validStatuses.join(", ") }, { status: 400 });
  }
  const proposal = await prisma.governanceProposal.update({
    where: { id: proposalId },
    data: { status },
  });
  if (status === "passed") {
    await onProposalPassed(proposalId);
  }
  return NextResponse.json({ proposal });
}
