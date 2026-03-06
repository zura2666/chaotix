import Link from "next/link";
import { getReferralDashboardData } from "@/lib/referral-dashboard";
import { BarChart3, UserPlus, DollarSign, TrendingUp } from "lucide-react";

export default async function ReferralsDashboardPage() {
  const { leaderboard, metrics } = await getReferralDashboardData();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Home
      </Link>
      <h1 className="mb-2 text-3xl font-bold text-white">Referral Dashboard</h1>
      <p className="mb-8 text-slate-500">
        Leaderboard, conversion, volume and fees from referrals.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <UserPlus className="h-5 w-5" />
            <span>Top referrers</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.totalReferrers}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-5 w-5" />
            <span>Volume from referrals</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {metrics.totalVolumeFromReferrals.toFixed(0)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <DollarSign className="h-5 w-5" />
            <span>Fees earned (referrers)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {metrics.totalFeesFromReferrals.toFixed(0)}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Referral leaderboard
        </h2>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
          {leaderboard.length === 0 ? (
            <p className="p-6 text-center text-slate-500">
              No referral activity yet. Share your link to get on the board.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-slate-500">
                  <th className="p-3">#</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Code</th>
                  <th className="p-3 text-right">Earnings</th>
                  <th className="p-3 text-right">Referrals</th>
                  <th className="p-3 text-right">Volume</th>
                  <th className="p-3 text-right">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.user?.id ?? i}
                    className="border-b border-white/5/50 hover:bg-white/[0.02]"
                  >
                    <td className="p-3 font-mono text-slate-500">{i + 1}</td>
                    <td className="p-3 text-white">
                      {row.user?.name || row.user?.email || "Anonymous"}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {row.user?.referralCode ?? "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400">
                      {row.totalEarnings.toFixed(0)}
                    </td>
                    <td className="p-3 text-right font-mono">{row.referralCount}</td>
                    <td className="p-3 text-right font-mono">
                      {row.volumeGenerated.toFixed(0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {row.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/profile" className="hover:text-emerald-400">
          Your referral stats →
        </Link>
      </p>
    </div>
  );
}
