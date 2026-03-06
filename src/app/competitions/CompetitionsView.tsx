"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Percent, TrendingUp, Sparkles, Crown, Award, Calendar } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { getBadgeLabel } from "@/lib/reputation";

type CompetitionRow = {
  userId: string;
  user: { id: string; name: string | null; email: string | null; username?: string | null; badges?: string } | null;
  roi: number;
  volume: number;
  narrativeDiscovery: number;
  rank: number;
};

type Season = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  topRankCount?: number;
};

const PERIODS = [
  { id: "daily", label: "Daily", icon: Calendar },
  { id: "weekly", label: "Weekly", icon: Trophy },
  { id: "monthly", label: "Monthly", icon: Calendar },
  { id: "season", label: "Season", icon: Crown },
] as const;

const METRICS = [
  { id: "roi", label: "Highest ROI", icon: Percent, color: "text-sky-400" },
  { id: "volume", label: "Trading Volume", icon: TrendingUp, color: "text-emerald-400" },
  { id: "narrative", label: "Narrative Discovery", icon: Sparkles, color: "text-amber-400" },
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

function BadgePills({ badges }: { badges?: string }) {
  const list = parseBadges(badges);
  if (list.length === 0) return null;
  return (
    <span className="ml-2 flex flex-wrap gap-1">
      {list.slice(0, 3).map((b) => (
        <span
          key={b}
          className="inline-flex rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400"
          title={getBadgeLabel(b)}
        >
          {getBadgeLabel(b)}
        </span>
      ))}
    </span>
  );
}

function UserCell({ user }: { user?: CompetitionRow["user"] }) {
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

type Props = {
  initialSeason: Season | null;
  initialSeasons: Season[];
};

export function CompetitionsView({ initialSeason, initialSeasons }: Props) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("weekly");
  const [metric, setMetric] = useState<(typeof METRICS)[number]["id"]>("volume");
  const [seasonId, setSeasonId] = useState<string | null>(initialSeason?.id ?? null);
  const [season, setSeason] = useState<Season | null>(initialSeason);
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [window, setWindow] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [seasonRanks, setSeasonRanks] = useState<Array<{
    rank: number;
    user: { id: string; name: string | null; email: string | null; username?: string | null; badges?: string };
    permanentRankTitle: string | null;
    badgeAwarded: string | null;
    roiScore: number;
    volumeScore: number;
    narrativeScore: number;
  }>>([]);

  useEffect(() => {
    setSeason(initialSeason);
    setSeasonId(initialSeason?.id ?? null);
  }, [initialSeason]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      period,
      metric,
      limit: "50",
    });
    if (period === "season" && seasonId) params.set("seasonId", seasonId);
    fetch(`/api/competition/leaderboard?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        setWindow(d.window ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period, metric, seasonId]);

  useEffect(() => {
    if (period !== "season" || !seasonId) {
      setSeasonRanks([]);
      return;
    }
    fetch(`/api/competition/season/${seasonId}/ranks?limit=100`)
      .then((r) => r.json())
      .then((d) => setSeasonRanks(d.ranks ?? []));
  }, [period, seasonId]);

  const metricLabel = METRICS.find((m) => m.id === metric)?.label ?? metric;
  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? period;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
      >
        ← Home
      </Link>
      <h1 className="text-xl font-semibold tracking-tighter text-slate-100 md:text-3xl">
        Seasonal Trading Competitions
      </h1>

      {season && (
        <ChaotixCard as="div" className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Crown className="h-5 w-5 text-amber-400" />
            {season.name}
          </h2>
          {season.description && (
            <p className="mb-2 text-sm text-slate-400">{season.description}</p>
          )}
          <p className="text-xs text-slate-500">
            {new Date(season.startAt).toLocaleDateString()} – {new Date(season.endAt).toLocaleDateString()}
            {season.topRankCount != null && (
              <> · Top {season.topRankCount} earn permanent rank & badge</>
            )}
          </p>
        </ChaotixCard>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-400">Rewards</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ChaotixCard as="div" className="p-4">
            <Award className="mb-2 h-8 w-8 text-amber-400" />
            <h3 className="font-medium text-slate-200">Profile badges</h3>
            <p className="text-xs text-slate-500">Season Top 100 badge (e.g. Narrative Wars Top 100) on your profile.</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <Trophy className="mb-2 h-8 w-8 text-amber-400" />
            <h3 className="font-medium text-slate-200">Permanent rank</h3>
            <p className="text-xs text-slate-500">Special trader rank title visible on leaderboards and profile.</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <Sparkles className="mb-2 h-8 w-8 text-amber-400" />
            <h3 className="font-medium text-slate-200">Exclusive features</h3>
            <p className="text-xs text-slate-500">Early access and recognition in future seasons.</p>
          </ChaotixCard>
        </div>
      </section>

      <div className="overflow-x-auto border-b border-white/5 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <p className="mb-2 text-xs font-medium text-slate-500">Period</p>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(({ id, label, icon: Icon }) => (
            <ChaotixButton
              key={id}
              type="button"
              variant={period === id ? "primary" : "secondary"}
              onClick={() => setPeriod(id)}
              className="min-h-[44px] gap-1.5 px-4 py-2 text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </ChaotixButton>
          ))}
        </div>
        {period === "season" && seasons.length > 1 && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500">Season</label>
            <select
              value={seasonId ?? ""}
              onChange={(e) => setSeasonId(e.target.value || null)}
              className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-chaos-primary focus:outline-none"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border-b border-white/5 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <p className="mb-2 text-xs font-medium text-slate-500">Metric</p>
        <div className="flex flex-wrap gap-2">
          {METRICS.map(({ id, label, icon: Icon, color }) => (
            <ChaotixButton
              key={id}
              type="button"
              variant={metric === id ? "primary" : "secondary"}
              onClick={() => setMetric(id)}
              className={`min-h-[44px] gap-1.5 px-4 py-2 text-sm ${metric === id ? color : ""}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </ChaotixButton>
          ))}
        </div>
      </div>

      {window && (
        <p className="text-xs text-slate-500">
          Window: {new Date(window.start).toLocaleString()} – {new Date(window.end).toLocaleString()}
        </p>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Trophy className="h-5 w-5 text-amber-400" />
          {periodLabel} leaderboard · {metricLabel}
        </h2>
        <ChaotixCard as="div" className="overflow-hidden p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No data for this period yet. Trade to climb the board.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                    <th className="p-3">#</th>
                    <th className="p-3">Trader</th>
                    <th className="p-3 text-right">ROI %</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3 text-right">Discovery</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.userId} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-slate-400">{r.rank}</td>
                      <UserCell user={r.user} />
                      <td className="p-3 text-right font-mono text-sky-400">{r.roi.toFixed(1)}%</td>
                      <td className="p-3 text-right font-mono text-slate-300">${r.volume.toFixed(0)}</td>
                      <td className="p-3 text-right font-mono text-amber-400">{r.narrativeDiscovery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChaotixCard>
      </section>

      {period === "season" && seasonRanks.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Award className="h-5 w-5 text-amber-400" />
            Final ranks & permanent rewards
          </h2>
          <ChaotixCard as="div" className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Trader</th>
                    <th className="p-3 text-right">Permanent rank</th>
                    <th className="p-3 text-right">ROI</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3 text-right">Discovery</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonRanks.map((r) => (
                    <tr key={r.user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-amber-400">{r.rank}</td>
                      <UserCell user={r.user} />
                      <td className="p-3 text-right text-slate-300">{r.permanentRankTitle ?? "—"}</td>
                      <td className="p-3 text-right font-mono text-sky-400">{r.roiScore.toFixed(1)}%</td>
                      <td className="p-3 text-right font-mono text-slate-300">${r.volumeScore.toFixed(0)}</td>
                      <td className="p-3 text-right font-mono text-amber-400">{r.narrativeScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChaotixCard>
        </section>
      )}

      <p className="text-center text-sm text-slate-500">
        <Link href="/leaderboard" className="underline hover:text-slate-300">View all leaderboards</Link>
      </p>
    </div>
  );
}
