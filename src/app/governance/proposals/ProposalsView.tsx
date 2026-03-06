"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, PlusCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type Proposal = {
  id: string;
  proposedCanonical: string;
  resolvedCanonical: string;
  title: string | null;
  description: string | null;
  status: string;
  proposedBy: { id: string; name: string | null; email: string | null; username: string | null };
  upvoteCount: number;
  marketId: string | null;
  market?: { id: string; canonical: string; displayName: string };
  createdAt: string;
};

type Props = {
  pendingProposals: Proposal[];
  approvedProposals: Proposal[];
  /** When true, governance proposals are disabled (featureFlag "future"). */
  featureFlagFuture?: boolean;
};

export function ProposalsView({
  pendingProposals: initialPending,
  approvedProposals: initialApproved,
  featureFlagFuture = false,
}: Props) {
  const [pending, setPending] = useState(initialPending);
  const [approved] = useState(initialApproved);
  const [proposedCanonical, setProposedCanonical] = useState("");
  const [proposedTitle, setProposedTitle] = useState("");
  const [proposedDescription, setProposedDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [upvoting, setUpvoting] = useState<string | null>(null);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const raw = proposedCanonical.trim();
    if (!raw || raw.length < 3) {
      setError("Enter a market identifier (e.g. ai, gpt, artificial-intelligence).");
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          proposedCanonical: raw,
          title: proposedTitle.trim() || undefined,
          description: proposedDescription.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create proposal.");
        return;
      }
      setSuccess(data.message ?? "Proposal created.");
      setProposedCanonical("");
      setProposedTitle("");
      setProposedDescription("");
      const listRes = await fetch("/api/governance/proposals?status=pending&limit=30");
      const listData = await listRes.json();
      if (listData.proposals) setPending(listData.proposals);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (proposalId: string) => {
    setUpvoting(proposalId);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch(`/api/governance/proposals/${proposalId}/upvote`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to upvote.");
        return;
      }
      if (data.market) {
        setSuccess(`Market created: ${data.market.canonical}`);
        const listRes = await fetch("/api/governance/proposals?status=pending&limit=30");
        const listData = await listRes.json();
        if (listData.proposals) setPending(listData.proposals);
      } else {
        const listRes = await fetch("/api/governance/proposals?status=pending&limit=30");
        const listData = await listRes.json();
        if (listData.proposals) setPending(listData.proposals);
      }
    } finally {
      setUpvoting(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <Link
        href="/create"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Create Market
      </Link>
      <h1 className="text-2xl font-bold text-white">Market Proposals</h1>

      {featureFlagFuture && (
        <ChaotixCard as="div" className="border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            <strong>Coming soon.</strong> Governance proposals are temporarily disabled. Create narrative markets directly from{" "}
            <Link href="/create" className="underline text-amber-400 hover:text-amber-300">Create Market</Link>.
          </p>
          <p className="mt-1 text-xs text-slate-400">featureFlag: &quot;future&quot;</p>
        </ChaotixCard>
      )}

      {!featureFlagFuture && (
        <p className="text-sm text-slate-400">
          Propose a market for community upvotes. When the upvote threshold is reached, the market is created. Alias mapping prevents duplicate narratives (e.g. gpt and artificial-intelligence → ai).
        </p>
      )}

      <ChaotixCard as="div" className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
          <PlusCircle className="h-5 w-5 text-amber-400" />
          Propose a market
        </h2>
        <form onSubmit={handlePropose} className="space-y-4" aria-disabled={featureFlagFuture}>
          <div>
            <label className="mb-1 block text-sm text-slate-500">Identifier (e.g. ai, gpt, artificial-intelligence)</label>
            <input
              type="text"
              value={proposedCanonical}
              onChange={(e) => setProposedCanonical(e.target.value)}
              placeholder="gpt"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">Title (optional)</label>
            <input
              type="text"
              value={proposedTitle}
              onChange={(e) => setProposedTitle(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">Description (optional)</label>
            <textarea
              value={proposedDescription}
              onChange={(e) => setProposedDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <ChaotixButton type="submit" disabled={submitting || featureFlagFuture}>
            {submitting ? "Submitting…" : featureFlagFuture ? "Disabled" : "Create proposal"}
          </ChaotixButton>
        </form>
      </ChaotixCard>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
          <ThumbsUp className="h-5 w-5 text-amber-400" />
          Pending proposals (upvote to create market)
        </h2>
        {featureFlagFuture || pending.length === 0 ? (
          <ChaotixCard as="div" className="p-6 text-center text-slate-500">
            {featureFlagFuture ? "Governance proposals are temporarily disabled." : "No pending proposals. Create one above."}
          </ChaotixCard>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <ChaotixCard key={p.id} as="li" className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-200">
                    {p.proposedCanonical}
                    {p.resolvedCanonical !== p.proposedCanonical && (
                      <span className="ml-2 text-xs text-slate-500">→ {p.resolvedCanonical}</span>
                    )}
                  </p>
                  {p.title && <p className="text-sm text-slate-400">{p.title}</p>}
                  <p className="text-xs text-slate-500">
                    by {p.proposedBy?.name || p.proposedBy?.email || p.proposedBy?.username || "—"} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{p.upvoteCount} upvotes</span>
                  <ChaotixButton
                    size="sm"
                    variant="primary"
                    onClick={() => handleUpvote(p.id)}
                    disabled={upvoting === p.id}
                  >
                    {upvoting === p.id ? "…" : "Upvote"}
                  </ChaotixButton>
                </div>
              </ChaotixCard>
            ))}
          </ul>
        )}
      </section>

      {approved.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Approved (markets created)
          </h2>
          <ul className="space-y-2">
            {approved.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded border border-white/5 bg-white/5 px-4 py-2">
                <span className="text-slate-300">{p.resolvedCanonical}</span>
                {p.market && (
                  <Link
                    href={`/market/${encodeURIComponent(p.market.canonical)}`}
                    className="text-sm text-amber-400 hover:underline"
                  >
                    View market →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
