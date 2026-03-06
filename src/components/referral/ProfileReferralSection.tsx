"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, Users, TrendingUp, DollarSign } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { Input } from "@/components/ui/Input";
import { ReferralModal } from "./ReferralModal";

type Props = {
  referralStatus: string;
  referralCode: string;
  partnerShortSlug: string | null;
};

export function ProfileReferralSection({
  referralStatus,
  referralCode,
  partnerShortSlug,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{
    referredUsers: { id: string }[];
    totalEarnings: number;
    referralVolume: number;
  } | null>(null);

  const fetchStats = () => {
    fetch("/api/user/referrals", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setStats({
          referredUsers: d.referredUsers ?? [],
          totalEarnings: d.totalEarnings ?? 0,
          referralVolume: d.referralVolume ?? 0,
        })
      );
  };

  if (referralStatus === "NONE") {
    return (
      <>
        <ChaotixCard
          as="div"
          className="border-emerald-500/20 bg-emerald-500/5 p-6 md:p-10"
        >
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-400">
              Not applied
            </span>
          </div>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tighter text-slate-100 text-lg">
                  Become a Chaotix Partner
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Get a unique partner link, earn 50% of fees from referred users, and grow the ecosystem.
                </p>
              </div>
            </div>
            <ChaotixButton
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(true)}
              className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-slate-100"
            >
              Apply to become a Partner
            </ChaotixButton>
          </div>
        </ChaotixCard>
        <ReferralModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      </>
    );
  }

  if (referralStatus === "PENDING") {
    return (
      <ChaotixCard as="div" className="border-amber-500/20 bg-amber-500/5 p-6 md:p-10">
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            Under review
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tighter text-slate-100 text-lg">
              Application under review
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              We&apos;ll notify you when your Chaotix Partner application is reviewed.
            </p>
          </div>
        </div>
      </ChaotixCard>
    );
  }

  return (
    <PartnerDashboard
      referralCode={referralCode}
      partnerShortSlug={partnerShortSlug}
      copied={copied}
      setCopied={setCopied}
      stats={stats}
      fetchStats={fetchStats}
    />
  );
}

function PartnerDashboard({
  referralCode,
  partnerShortSlug,
  copied,
  setCopied,
  stats,
  fetchStats,
}: {
  referralCode: string;
  partnerShortSlug: string | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
  stats: {
    referredUsers: { id: string }[];
    totalEarnings: number;
    referralVolume: number;
  } | null;
  fetchStats: () => void;
}) {
  useEffect(() => {
    fetchStats();
  }, []);

  const partnerLink =
    typeof window !== "undefined"
      ? partnerShortSlug
        ? `${window.location.origin}/r/${partnerShortSlug}`
        : `${window.location.origin}/?ref=${referralCode}`
      : "";

  const copyLink = () => {
    const url = partnerShortSlug
      ? `${window.location.origin}/r/${partnerShortSlug}`
      : `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ChaotixCard as="div" className="p-6 md:p-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          Partner
        </span>
      </div>
      <h2 className="mb-2 font-semibold tracking-tighter text-slate-100 text-lg">
        Chaotix Partner
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Your unique link. You earn 50% of trading fees from referred users.
      </p>

      {/* Referral code / link: full-width on mobile, copy button below */}
      <div className="mb-8">
        <label className="mb-1 block text-sm text-slate-400">Your partner link</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            readOnly
            value={partnerLink || `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${referralCode}`}
            containerClassName="flex-1 min-w-0 !h-14 min-h-[3.5rem]"
            className="text-base text-emerald-400 truncate"
            rightSlot={
              <ChaotixButton
                type="button"
                variant="ghost"
                onClick={copyLink}
                className="hidden min-h-[44px] min-w-[44px] shrink-0 gap-2 px-3 text-xs sm:inline-flex"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </ChaotixButton>
            }
          />
          <ChaotixButton
            type="button"
            variant="ghost"
            onClick={copyLink}
            className="min-h-[44px] shrink-0 gap-2 px-4 text-sm sm:hidden"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </ChaotixButton>
        </div>
      </div>

      {/* Real-time analytics: linear-aligned sparks */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Referred users</p>
            <p className="font-semibold text-slate-100 font-mono">
              {stats ? stats.referredUsers.length : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total volume generated</p>
            <p className="font-semibold text-slate-100 font-mono">
              ${stats ? stats.referralVolume.toFixed(0) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Earnings (50% of fees)</p>
            <p className="font-semibold text-emerald-400 font-mono">
              {stats ? stats.totalEarnings.toFixed(0) : "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Partner code: <span className="font-mono text-slate-400">{referralCode}</span>
      </p>
    </ChaotixCard>
  );
}
