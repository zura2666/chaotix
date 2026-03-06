import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, governanceVoteBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";
import { getFeatureFlag, futureFeatureResponse } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  if (getFeatureFlag("governance_proposals") === "future") {
    return NextResponse.json(
      futureFeatureResponse("Governance voting is temporarily disabled."),
      { status: 503 }
    );
  }
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(governanceVoteBodySchema, {
    proposalId: body.proposalId ?? req.nextUrl.searchParams.get("proposalId"),
    vote: body.vote ?? req.nextUrl.searchParams.get("vote"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { proposalId, vote } = parsed.data;
  const proposal = await prisma.governanceProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, status: true },
  });
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.status !== "active") return NextResponse.json({ error: "Proposal not active" }, { status: 400 });
  await prisma.governanceVote.upsert({
    where: { proposalId_userId: { proposalId, userId: user.id } },
    create: { proposalId, userId: user.id, vote },
    update: { vote },
  });
  return NextResponse.json({ ok: true, vote });
}
