import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getInfluencerMetrics } from "@/lib/influencer-metrics";
import { BarChart3, Users, DollarSign, TrendingUp, Zap } from "lucide-react";

export default async function InfluencerPage() {
  const user = await getSession();
  if (!user) redirect("/");

  const metrics = await getInfluencerMetrics(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Home
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-white">Influencer dashboard</h1>
      <p className="mb-8 text-slate-500">
        Your impact: markets created, volume, traders, referrals, attention.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Markets created</span>
          </div>
          <p className="mt-2 text-2xl font-mono text-white">{metrics.marketsCreated}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Volume on your markets</span>
          </div>
          <p className="mt-2 text-2xl font-mono text-emerald-400">{metrics.volumeOnMyMarkets.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" />
            <span className="text-sm">Unique traders</span>
          </div>
          <p className="mt-2 text-2xl font-mono text-white">{metrics.uniqueTradersOnMyMarkets}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Referral earnings</span>
          </div>
          <p className="mt-2 text-2xl font-mono text-emerald-400">{metrics.referralEarnings.toFixed(0)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Zap className="h-4 w-4" />
          <span>Attention score (your markets)</span>
        </div>
        <p className="text-2xl font-mono text-emerald-400">{metrics.attentionScore}</p>
      </div>

      {metrics.markets.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Your markets</h2>
          <ul className="space-y-2">
            {metrics.markets.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/market/${encodeURIComponent(m.canonical)}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 text-sm hover:border-emerald-500/40"
                >
                  <span className="text-white">{m.displayName}</span>
                  <span className="text-slate-500">vol {m.volume.toFixed(0)} · {m.tradeCount} trades</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
