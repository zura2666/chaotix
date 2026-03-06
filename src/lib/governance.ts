/**
 * Market creation governance: proposals, upvotes, min reputation, alias-based duplicate prevention.
 */

import { prisma } from "./db";
import { resolveCanonical, ensureAliasesForMarket } from "./canonicalization";
import { validateIdentifierSafe } from "./identifiers";
import { findOrCreateMarket } from "./markets";
import {
  MIN_REPUTATION_TO_PROPOSE,
  MIN_REPUTATION_TO_CREATE_DIRECT,
  PROPOSAL_UPVOTE_THRESHOLD,
  CURATED_NARRATIVE_MODE,
} from "./constants";

export { MIN_REPUTATION_TO_PROPOSE, MIN_REPUTATION_TO_CREATE_DIRECT, PROPOSAL_UPVOTE_THRESHOLD };

/** Resolve input to canonical for duplicate check. Returns resolved canonical or normalized new. */
export async function resolveCanonicalOrNormalize(input: string): Promise<{
  canonical: string;
  fromAlias: boolean;
  error?: string;
}> {
  const trimmed = input.trim();
  const resolved = await resolveCanonical(trimmed);
  if (resolved) {
    return { canonical: resolved, fromAlias: true };
  }
  const validated = validateIdentifierSafe(trimmed);
  if (!validated.ok) return { canonical: "", fromAlias: false, error: validated.error };
  return { canonical: validated.value, fromAlias: false };
}

/** Check if user can create market directly (by reputation). */
export function canCreateDirect(user: { reputationScore?: number | null }): boolean {
  const rep = user.reputationScore ?? 0;
  return rep >= MIN_REPUTATION_TO_CREATE_DIRECT;
}

/** Check if user can propose a market. */
export function canPropose(user: { reputationScore?: number | null }): boolean {
  const rep = user.reputationScore ?? 0;
  return rep >= MIN_REPUTATION_TO_PROPOSE;
}

/** Create a market proposal. Returns error if narrative already exists (resolved canonical has market). */
export async function createProposal(
  userId: string,
  proposedCanonical: string,
  title?: string | null,
  description?: string | null
): Promise<{ proposal?: { id: string; resolvedCanonical: string }; error: string }> {
  const { canonical: resolvedCanonical, fromAlias, error: normError } = await resolveCanonicalOrNormalize(proposedCanonical);
  if (normError) return { error: normError };

  const existing = await prisma.market.findUnique({
    where: { canonical: resolvedCanonical },
    select: { id: true, canonical: true },
  });
  if (existing) {
    return {
      error: `This narrative already exists as market "${existing.canonical}". Use that market or propose a different topic.`,
    };
  }

  const pendingSame = await prisma.marketProposal.findFirst({
    where: { resolvedCanonical, status: "pending" },
    select: { id: true },
  });
  if (pendingSame) {
    return { error: "A pending proposal for this narrative already exists. Upvote it instead." };
  }

  const proposal = await prisma.marketProposal.create({
    data: {
      proposedCanonical: proposedCanonical.trim().slice(0, 100),
      resolvedCanonical,
      title: title?.trim().slice(0, 200) ?? null,
      description: description?.trim().slice(0, 2000) ?? null,
      proposedById: userId,
      status: "pending",
    },
  });
  return { proposal: { id: proposal.id, resolvedCanonical }, error: "" };
}

/** Add upvote; if threshold reached, create market and approve proposal. */
export async function upvoteProposal(proposalId: string, userId: string): Promise<{ ok: boolean; error?: string; market?: { id: string; canonical: string } }> {
  const proposal = await prisma.marketProposal.findUnique({
    where: { id: proposalId },
    include: { proposer: { select: { id: true } }, upvotes: { select: { userId: true } } },
  });
  if (!proposal) return { ok: false, error: "Proposal not found" };
  if (proposal.status !== "pending") return { ok: false, error: "Proposal is no longer pending" };

  const alreadyUpvoted = proposal.upvotes.some((u) => u.userId === userId);
  if (!alreadyUpvoted) {
    await prisma.proposalUpvote.create({
      data: { proposalId, userId },
    });
  }

  const upvoteCount = await prisma.proposalUpvote.count({ where: { proposalId } });
  if (upvoteCount < PROPOSAL_UPVOTE_THRESHOLD) {
    return { ok: true };
  }

  const existingMarket = await prisma.market.findUnique({
    where: { canonical: proposal.resolvedCanonical },
    select: { id: true, canonical: true },
  });
  if (existingMarket) {
    await prisma.marketProposal.update({
      where: { id: proposalId },
      data: { status: "approved", marketId: existingMarket.id },
    });
    await ensureAliasesForMarket(existingMarket.canonical, [proposal.proposedCanonical]).catch(() => {});
    return { ok: true, market: { id: existingMarket.id, canonical: existingMarket.canonical } };
  }

  if (CURATED_NARRATIVE_MODE) {
    await prisma.marketProposal.update({
      where: { id: proposalId },
      data: { status: "approved" },
    });
    return { ok: true, message: "Proposal approved. In curated mode only admins can add new markets; this narrative may be added by an admin." };
  }

  const result = await findOrCreateMarket(proposal.resolvedCanonical, proposal.proposedById, {
    title: proposal.title ?? undefined,
    description: proposal.description ?? undefined,
  });
  if ("error" in result && result.error) {
    return { ok: true, error: result.error };
  }
  const market = result.market;
  if (!market) return { ok: true };

  await prisma.marketProposal.update({
    where: { id: proposalId },
    data: { status: "approved", marketId: market.id },
  });
  // Map proposed string to canonical so duplicate narratives resolve to same market
  await ensureAliasesForMarket(market.canonical, [proposal.proposedCanonical]).catch(() => {});
  return { ok: true, market: { id: market.id, canonical: market.canonical } };
}

/** List pending proposals (and optionally approved). */
export async function listProposals(options: { status?: "pending" | "approved" | "rejected"; limit?: number } = {}) {
  const { status = "pending", limit = 50 } = options;
  const list = await prisma.marketProposal.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      proposer: { select: { id: true, name: true, email: true, username: true } },
      _count: { select: { upvotes: true } },
      market: status === "approved" ? { select: { id: true, canonical: true, displayName: true } } : false,
    },
  });
  return list.map((p) => ({
    id: p.id,
    proposedCanonical: p.proposedCanonical,
    resolvedCanonical: p.resolvedCanonical,
    title: p.title,
    description: p.description,
    status: p.status,
    proposedBy: p.proposer,
    upvoteCount: p._count.upvotes,
    marketId: p.marketId,
    market: p.market ?? undefined,
    createdAt: p.createdAt.toISOString(),
  }));
}
