"use client";

import { useState, useEffect } from "react";
import { Copy, Users, DollarSign } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

type Props = { referralCode: string };

export function ReferralProfile({ referralCode }: Props) {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<{
    referredUsers: { email: string | null; name: string | null; createdAt: string }[];
    totalEarnings: number;
    referralVolume: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/user/referrals")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${referralCode}`
      : `https://chaotix.app/?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ChaotixCard as="div" className="p-10">
      <h2 className="mb-2 font-semibold tracking-tighter text-white text-lg">
        Referral program
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Share your code. You earn 50% of trading fees from referred users.
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2 font-mono text-lg text-emerald-400">
          {referralCode}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="h-11 rounded-lg border border-white/10 px-4 text-sm text-slate-300 transition-all hover:border-emerald-500/40 hover:text-emerald-400"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
        <button
          type="button"
          onClick={copyUrl}
          className="h-11 rounded-lg border border-white/10 px-4 text-sm text-slate-300 transition-all hover:border-emerald-500/40 hover:text-emerald-400"
        >
          Copy signup link
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" />
            <span className="text-sm">Referred users</span>
          </div>
          <p className="mt-1 font-semibold text-white font-mono text-xl">
            {data?.referredUsers?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Referral earnings</span>
          </div>
          <p className="mt-1 font-semibold text-emerald-400 font-mono text-xl">
            {(data?.totalEarnings ?? 0).toFixed(0)}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-sm">Volume from referrals</span>
          </div>
          <p className="mt-1 font-semibold text-white font-mono text-xl">
            {(data?.referralVolume ?? 0).toFixed(0)}
          </p>
        </div>
      </div>
      {data?.referredUsers && data.referredUsers.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-500">
            Referred users
          </h3>
          <ul className="space-y-2">
            {data.referredUsers.map((u, i) => (
              <li
                key={i}
                className="flex justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
              >
                <span className="font-medium text-white">
                  {u.name || u.email || "Anonymous"}
                </span>
                <span className="text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChaotixCard>
  );
}
