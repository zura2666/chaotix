"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, UserPlus, DollarSign, Percent, Sparkles, TrendingUp, PlusCircle, Calendar, RefreshCw } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { getBadgeLabel } from "@/lib/reputation";

type User = { id: string; name: string | null; email: string | null; referralCode?: string; username?: string | null; badges?: string };
type RepRow = { user?: User; reputationScore: number; marketsCreated: number; successfulMarkets: number };
type TraderRow = { user?: User; volume: number; tradeCount: number };
type ProfitRow = { user?: User; profit: number };
type RoiRow = { user?: User; roi: number; profit: number };
type DiscovererRow = { user?: User; marketsDiscovered: number };
type ReferralRow = { user?: User; totalEarnings: number; referralCount: number };
type NarrativeTraderRow = { user?: User; narrativeScore: number; reputationScore: number; marketInfluenceScore: number; successfulTrades: number };
type MarketCreatorRow = { user?: User; marketsCreated: number; totalVolume: number };

type CompetitionRow = {
  userId: string;
  user: User | null;
  roi: number;
  volume: number;
  narrativeDiscovery: number;
  rank: number;
  rankTitle?: string | null;
};

type Props = {
  traders: TraderRow[];
  referrals: ReferralRow[];
  byProfit: ProfitRow[];
  byRoi: RoiRow[];
  discoverers: DiscovererRow[];
  byReputation: RepRow[];
  narrativeTraders: NarrativeTraderRow[];
  marketCreators: MarketCreatorRow[];
};

const TABS = [
  { id: "volume", label: "Top Traders", icon: Trophy, color: "text-emerald-400" },
  { id: "discoverers", label: "Top Narrative Discoverers", icon: Sparkles, color: "text-amber-400" },
  { id: "referrals", label: "Top Referrers", icon: UserPlus, color: "text-emerald-400" },
  { id: "seasonal", label: "Seasonal Competitions", icon: Calendar, color: "text-sky-400" },
  { id: "narrative", label: "Top Narrative Traders", icon: TrendingUp, color: "text-amber-400" },
  { id: "creators", label: "Top Market Creators", icon: PlusCircle, color: "text-emerald-400" },
  { id: "reputation", label: "Reputation", icon: Trophy, color: "text-amber-400" },
  { id: "profit", label: "Profit", icon: DollarSign, color: "text-emerald-400" },
  { id: "roi", label: "ROI", icon: Percent, color: "text-sky-400" },
] as const;

const POLL_INTERVAL_MS = 30_000;
const SEASONAL_PERIODS = [{ id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }, { id: "season", label: "Season" }] as const;
const SEASONAL_METRICS = [
  { id: "roi", label: "Highest ROI" },
  { id: "narrative", label: "Narrative Discovery" },
  { id: "volume", label: "Trading Volume" },
] as const;

function parseBadges(badges: string | undefined): string[] {
  if (!badges) return [];
  try {
    const a = JSON.parse(badges);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function BadgePills({ badges }: { badges: string | undefined }) {
  const list = parseBadges(badges);
  if (list.length === 0) return null;
  return (
    <span className="ml-2 flex flex-wrap gap-1">
      {list.map((b) => (
        <span
          key={b}
          className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20"
          title={getBadgeLabel(b)}
        >
          {getBadgeLabel(b)}
        </span>
      ))}
    </span>
  );
}

function UserCell({ user }: { user?: User }) {
  const name = user?.name || user?.email || user?.username || "Anonymous";
  return (
    <td className="p-3 text-slate-100">
      <span className="inline-flex flex-wrap items-center gap-1">
        {name}
        <BadgePills badges={user?.badges} />
      </span>
    </td>
  );
}

export function LeaderboardView({
  traders,
  referrals,
  byProfit,
  byRoi,
  discoverers,
  byReputation,
  narrativeTraders,
  marketCreators,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("volume");
  const [seasonalPeriod, setSeasonalPeriod] = useState<(typeof SEASONAL_PERIODS)[number]["id"]>("weekly");
  const [seasonalMetric, setSeasonalMetric] = useState<(typeof SEASONAL_METRICS)[number]["id"]>("roi");
  const [seasonalData, setSeasonalData] = useState<{ rows: CompetitionRow[]; window: { start: string; end: string }; season?: { name: string } | null } | null>(null);
  const [seasonalLoading, setSeasonalLoading] = useState(false);

  const fetchSeasonal = useCallback(async () => {
    setSeasonalLoading(true);
    try {
      const params = new URLSearchParams({ period: seasonalPeriod, metric: seasonalMetric, limit: "50" });
      const res = await fetch(`/api/competition/leaderboard?${params}`);
      const data = await res.json();
      if (res.ok && data.rows) setSeasonalData({ rows: data.rows, window: data.window, season: data.season });
    } catch {
      setSeasonalData(null);
    } finally {
      setSeasonalLoading(false);
    }
  }, [seasonalPeriod, seasonalMetric]);

  useEffect(() => {
    if (activeTab !== "seasonal") return;
    fetchSeasonal();
    const id = setInterval(fetchSeasonal, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeTab, fetchSeasonal]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/"
          className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
        >
          ← Home
        </Link>
        <Link
          href="/competitions"
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          Seasonal Competitions →
        </Link>
      </div>
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

      {activeTab === "narrative" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            Top Narrative Traders
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {narrativeTraders.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No narrative traders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3 text-right">Rep</th>
                      <th className="p-3 text-right">Influence</th>
                      <th className="p-3 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {narrativeTraders.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <UserCell user={t.user} />
                        <td className="p-3 text-right font-mono text-amber-400">{t.narrativeScore.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.reputationScore.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.marketInfluenceScore.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{t.successfulTrades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

      {activeTab === "creators" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <PlusCircle className="h-5 w-5 text-emerald-400" />
            Top Market Creators
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {marketCreators.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No market creators yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">Markets</th>
                      <th className="p-3 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketCreators.map((t, i) => (
                      <tr key={t.user?.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <UserCell user={t.user} />
                        <td className="p-3 text-right font-mono text-emerald-400">{t.marketsCreated}</td>
                        <td className="p-3 text-right font-mono text-slate-300">${t.totalVolume.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChaotixCard>
        </section>
      )}

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
                        <UserCell user={t.user} />
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
                        <UserCell user={r.user} />
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

      {activeTab === "seasonal" && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tighter text-slate-100">
            <Calendar className="h-5 w-5 text-sky-400" />
            Seasonal Trading Competitions
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Weekly, monthly, and season leaderboards. Rankings update every 5 minutes. Top ranks earn profile badges and special titles.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={seasonalPeriod}
              onChange={(e) => setSeasonalPeriod(e.target.value as (typeof SEASONAL_PERIODS)[number]["id"])}
              className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-chaos-primary focus:outline-none"
            >
              {SEASONAL_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <select
              value={seasonalMetric}
              onChange={(e) => setSeasonalMetric(e.target.value as (typeof SEASONAL_METRICS)[number]["id"])}
              className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-chaos-primary focus:outline-none"
            >
              {SEASONAL_METRICS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchSeasonal()}
              disabled={seasonalLoading}
              className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${seasonalLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {seasonalData?.window && (
              <span className="text-xs text-slate-500">
                {new Date(seasonalData.window.start).toLocaleDateString()} – {new Date(seasonalData.window.end).toLocaleDateString()}
              </span>
            )}
          </div>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            {seasonalLoading && !seasonalData ? (
              <p className="p-6 text-center text-slate-500">Loading…</p>
            ) : !seasonalData?.rows?.length ? (
              <p className="p-6 text-center text-slate-500">No data for this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                      <th className="p-3">#</th>
                      <th className="p-3">User</th>
                      <th className="p-3 text-right">ROI %</th>
                      <th className="p-3 text-right">Volume</th>
                      <th className="p-3 text-right">Discovery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonalData.rows.map((r) => (
                      <tr key={r.userId} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-slate-400">{r.rank}</td>
                        <td className="p-3">
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            {r.user?.name || r.user?.email || r.user?.username || "Anonymous"}
                            <BadgePills badges={r.user?.badges} />
                            {r.rankTitle && (
                              <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/30" title="Seasonal rank">
                                {r.rankTitle}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-sky-400">{r.roi.toFixed(1)}%</td>
                        <td className="p-3 text-right font-mono text-emerald-400">${r.volume.toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{r.narrativeDiscovery}</td>
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
