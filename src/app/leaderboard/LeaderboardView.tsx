"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, UserPlus, DollarSign, Percent, Sparkles } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type User = { id: string; name: string | null; email: string | null; referralCode?: string };
type RepRow = { user?: User; reputationScore: number; marketsCreated: number; successfulMarkets: number };
type TraderRow = { user?: User; volume: number; tradeCount: number };
type ProfitRow = { user?: User; profit: number };
type RoiRow = { user?: User; roi: number; profit: number };
type DiscovererRow = { user?: User; marketsDiscovered: number };
type ReferralRow = { user?: User; totalEarnings: number; referralCount: number };

type Props = {
  traders: TraderRow[];
  referrals: ReferralRow[];
  byProfit: ProfitRow[];
  byRoi: RoiRow[];
  discoverers: DiscovererRow[];
  byReputation: RepRow[];
};

const TABS = [
  { id: "reputation", label: "Reputation", icon: Trophy, color: "text-amber-400" },
  { id: "volume", label: "Volume", icon: Trophy, color: "text-emerald-400" },
  { id: "profit", label: "Profit", icon: DollarSign, color: "text-emerald-400" },
  { id: "roi", label: "ROI", icon: Percent, color: "text-sky-400" },
  { id: "discoverers", label: "Discoverers", icon: Sparkles, color: "text-amber-400" },
  { id: "referrals", label: "Referrals", icon: UserPlus, color: "text-emerald-400" },
] as const;

export function LeaderboardView({
  traders,
  referrals,
  byProfit,
  byRoi,
  discoverers,
  byReputation,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("volume");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
      >
        ← Home
      </Link>
      <h1 className="text-xl font-semibold tracking-tighter text-slate-100 md:text-3xl">Leaderboards</h1>

      <div className="overflow-x-auto border-b border-white/5 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex flex-nowrap gap-2 min-w-0">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <ChaotixButton
              key={id}
              type="button"
              variant={activeTab === id ? "primary" : "secondary"}
              onClick={() => setActiveTab(id)}
              className={`min-h-[44px] shrink-0 gap-1.5 px-4 py-2 text-sm ${activeTab === id ? "" : "text-slate-500"}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${activeTab === id ? color : ""}`} />
              {label}
            </ChaotixButton>
          ))}
        </div>
      </div>

      {activeTab === "reputation" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <Trophy className="h-5 w-5 text-amber-400" />
            Reputation leaderboard
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {byReputation.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No reputation scores yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3 text-right">Markets</th>
                      <th className="p-3 text-right">Successful</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byReputation.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{t.user?.name || t.user?.email || "Anonymous"}</td>
                        <td className="p-3 text-right font-mono text-amber-400">{t.reputationScore.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.marketsCreated}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.successfulMarkets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "volume" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Top traders (by volume)
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {traders.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No trading activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Volume</th>
                      <th className="p-3 text-right">Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traders.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{t.user?.name || t.user?.email || "Anonymous"}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">${t.volume.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.tradeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "profit" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Top profit (realized PnL)
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {byProfit.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No realized profits yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProfit.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{t.user?.name || t.user?.email || "Anonymous"}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">+{t.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "roi" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <Percent className="h-5 w-5 text-sky-400" />
            Best ROI
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {byRoi.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No ROI data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">ROI %</th>
                      <th className="p-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRoi.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{t.user?.name || t.user?.email || "Anonymous"}</td>
                        <td className="p-3 text-right font-mono text-sky-400">{t.roi.toFixed(1)}%</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "discoverers" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Early market discoverers
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {discoverers.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Markets discovered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoverers.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{t.user?.name || t.user?.email || "Anonymous"}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.marketsDiscovered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "referrals" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Top referral earners
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {referrals.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No referral earnings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Code</th>
                      <th className="p-3 text-right">Earnings</th>
                      <th className="p-3 text-right">Referrals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-100">{r.user?.name || r.user?.email || "Anonymous"}</td>
                        <td className="p-3 font-mono text-slate-400">{r.user?.referralCode}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">{r.totalEarnings.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{r.referralCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}
    </div>
  );
}
