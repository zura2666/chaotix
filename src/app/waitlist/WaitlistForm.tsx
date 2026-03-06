"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  waitlistStatus: string;
  inviteCodeUsed: string | null;
};

export function WaitlistForm({ waitlistStatus, inviteCodeUsed }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canTrade = waitlistStatus === "active";
  const isWaitlisted = waitlistStatus === "waitlisted";

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist/join", { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to redeem");
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (canTrade) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-slate-900/40 p-6">
        <p className="font-medium text-chaos-neon">You have access to trade.</p>
        {inviteCodeUsed && (
          <p className="mt-1 text-sm text-slate-500">Invite code: {inviteCodeUsed}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleRedeem} className="rounded-xl border border-chaos-border bg-chaos-card p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Redeem invite code</h2>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          className="mb-3 w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
        />
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {success && <p className="mb-2 text-sm text-chaos-neon">Code redeemed. You can now trade.</p>}
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-lg bg-chaos-neon py-2 font-medium text-chaos-bg disabled:opacity-50"
        >
          {loading ? "..." : "Redeem"}
        </button>
      </form>
      {!isWaitlisted ? (
        <div className="rounded-xl border border-chaos-border bg-chaos-card p-6 text-center">
          <p className="mb-3 text-sm text-slate-500">No invite code yet?</p>
          <button
            type="button"
            onClick={handleJoinWaitlist}
            disabled={loading}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
          >
            Join waitlist
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-500">
          You are on the waitlist. Browse markets until you receive an invite.
        </p>
      )}
    </div>
  );
}
