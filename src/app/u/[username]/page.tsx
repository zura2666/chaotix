import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileByUsername, getProfileWithStats } from "@/lib/user-profile";
import { getBadgeLabel } from "@/lib/reputation";

function parseBadges(badges: string | undefined): string[] {
  if (!badges) return [];
  try {
    const a = JSON.parse(badges);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

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
  const badges = parseBadges(profile.badges);
  const marketplaceTrust = "marketplaceTrustScore" in profile ? (profile as { marketplaceTrustScore?: number }).marketplaceTrustScore ?? 0 : 0;
  const marketplaceCompletedTrades =
    "marketplaceCompletedTrades" in profile ? (profile as { marketplaceCompletedTrades?: number }).marketplaceCompletedTrades ?? 0 : 0;
  const isMarketplaceVerified =
    "marketplaceVerifiedAt" in profile && (profile as { marketplaceVerifiedAt?: Date | null }).marketplaceVerifiedAt != null;

  const trustLabel = (score: number) => {
    if (score >= 80) return "Elite";
    if (score >= 60) return "Verified Trader";
    if (score >= 40) return "Trusted";
    if (score >= 20) return "Rising";
    return "New";
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/leaderboard" className="mb-6 inline-block text-sm text-chaos-muted hover:text-chaos-neon">
        ← Leaderboard
      </Link>
      <div className="rounded-xl border border-chaos-border bg-chaos-card p-6">
        <h1 className="text-2xl font-bold text-white">{displayName}</h1>
        <p className="text-chaos-muted">@{profile.username || profile.referralCode}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-slate-700/40 px-2 py-0.5 text-slate-300">
            Marketplace trust: <span className="font-mono">{Math.round(marketplaceTrust)}</span> · {trustLabel(marketplaceTrust)}
          </span>
          {isMarketplaceVerified && (
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-400 font-medium">Verified creator</span>
          )}
        </div>
        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20"
              >
                {getBadgeLabel(b)}
              </span>
            ))}
          </div>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-chaos-muted">Reputation</dt>
            <dd className="font-mono text-white">{profile.reputationScore.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Successful trades</dt>
            <dd className="font-mono text-white">{"successfulTrades" in profile ? profile.successfulTrades : 0}</dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Market influence</dt>
            <dd className="font-mono text-white">{"marketInfluenceScore" in profile ? (profile.marketInfluenceScore ?? 0).toFixed(1) : "0"}</dd>
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
            <dt className="text-chaos-muted">Total volume generated</dt>
            <dd className="font-mono text-chaos-neon">
              {"creatorVolumeGenerated" in profile && typeof (profile as { creatorVolumeGenerated?: number }).creatorVolumeGenerated === "number"
                ? (profile as { creatorVolumeGenerated: number }).creatorVolumeGenerated.toFixed(0)
                : "0"}
            </dd>
          </div>
          <div>
            <dt className="text-chaos-muted">Creator tier</dt>
            <dd className="font-mono text-white">{"creatorRewardTier" in profile ? (profile as { creatorRewardTier?: number }).creatorRewardTier ?? 0 : "0"}</dd>
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
        {"topPerformingNarrative" in profile && (profile as { topPerformingNarrative?: { canonical: string; displayName: string; volume: number; tradeCount: number } | null }).topPerformingNarrative && (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-chaos-muted">Top performing narrative</h3>
            <Link
              href={`/market/${encodeURIComponent((profile as { topPerformingNarrative: { canonical: string } }).topPerformingNarrative.canonical)}`}
              className="mt-2 block font-medium text-white hover:text-chaos-neon"
            >
              {(profile as { topPerformingNarrative: { displayName: string } }).topPerformingNarrative.displayName}
            </Link>
            <p className="mt-1 text-xs text-chaos-muted">
              Vol ${(profile as { topPerformingNarrative: { volume: number } }).topPerformingNarrative.volume.toFixed(0)} · {(profile as { topPerformingNarrative: { tradeCount: number } }).topPerformingNarrative.tradeCount} trades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
