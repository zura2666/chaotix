import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getProfileWithStats } from "@/lib/user-profile";

export default async function TraderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const base = await getProfileByUsername(username);
  if (!base) notFound();
  const profile = await getProfileWithStats(base.id);
  if (!profile) notFound();

  const displayName = profile.name || profile.username || profile.referralCode || "Trader";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/leaderboard" className="mb-6 inline-block text-sm text-chaos-muted hover:text-chaos-neon">
        ← Leaderboard
      </Link>
      <div className="rounded-xl border border-chaos-border bg-chaos-card p-6">
        <h1 className="text-2xl font-bold text-white">{displayName}</h1>
        <p className="text-chaos-muted">@{profile.username || profile.referralCode}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-chaos-muted">Reputation</dt>
            <dd className="font-mono text-white">{profile.reputationScore.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Trust score</dt>
            <dd className="font-mono text-white">{profile.trustScore.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Markets created</dt>
            <dd className="font-mono text-white">{profile.marketsCreated}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Successful markets</dt>
            <dd className="font-mono text-white">{profile.successfulMarkets}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Followers</dt>
            <dd className="font-mono text-white">{"followerCount" in profile ? profile.followerCount : "—"}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Following</dt>
            <dd className="font-mono text-white">{"followingCount" in profile ? profile.followingCount : "—"}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Portfolio value</dt>
            <dd className="font-mono text-chaos-neon">
              {"portfolioValue" in profile ? profile.portfolioValue.toFixed(2) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Realized PnL</dt>
            <dd className={`font-mono ${((profile as { realizedPnL?: number }).realizedPnL ?? 0) >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"}`}>
              {"realizedPnL" in profile ? (profile.realizedPnL as number).toFixed(2) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Total volume</dt>
            <dd className="font-mono text-white">{"totalVolume" in profile ? (profile.totalVolume as number).toFixed(0) : "—"}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Trades</dt>
            <dd className="font-mono text-white">{"tradeCount" in profile ? profile.tradeCount : "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
