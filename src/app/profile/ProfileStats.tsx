"use client";

import { useState, useEffect } from "react";
import { Wallet, DollarSign, TrendingUp } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

type Props = {
  balance: number;
};

type ReferralData = {
  referredUsers: { id: string }[];
  totalEarnings: number;
  referralVolume: number;
};

export function ProfileStats({ balance }: Props) {
  const [refData, setRefData] = useState<ReferralData | null>(null);

  useEffect(() => {
    fetch("/api/user/referrals")
      .then((r) => r.json())
      .then((d) =>
        setRefData({
          referredUsers: d.referredUsers ?? [],
          totalEarnings: d.totalEarnings ?? 0,
          referralVolume: d.referralVolume ?? 0,
        })
      );
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
      <ChaotixCard as="div" className="p-3 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Balance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100 font-mono">
              {balance.toFixed(0)}
            </p>
          </div>
        </div>
      </ChaotixCard>
      <ChaotixCard as="div" className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Referral count</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100 font-mono">
              {refData?.referredUsers?.length ?? 0}
            </p>
          </div>
        </div>
      </ChaotixCard>
      <ChaotixCard as="div" className="p-3 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Referral volume</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100 font-mono">
              {(refData?.referralVolume ?? 0).toFixed(0)}
            </p>
          </div>
        </div>
      </ChaotixCard>
    </div>
  );
}
