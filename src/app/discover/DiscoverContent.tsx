"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Zap, TrendingUp, TrendingDown, Sparkles, MessageCircle } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { EmptyState } from "@/components/EmptyState";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { Input } from "@/components/ui/Input";

type FeedItem = Record<string, unknown>;

type NarrativeSectionMarket = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  priceChange24h: number;
  uniqueTraders24h: number;
  gravityScore: number;
  category?: { slug: string; name: string } | null;
  tags?: string;
};

type NarrativeSections = {
  narrativesExploding: NarrativeSectionMarket[];
  narrativesRising: NarrativeSectionMarket[];
  narrativesFalling: NarrativeSectionMarket[];
  mostTradedNarratives: NarrativeSectionMarket[];
  newNarratives: NarrativeSectionMarket[];
  mostControversial: NarrativeSectionMarket[];
};

type Props = {
  feed: FeedItem[];
  initialTag?: string;
  narrativeSections?: NarrativeSections | null;
};

function toMarket(m: FeedItem) {
  return {
    id: String(m.id),
    canonical: String(m.canonical),
    displayName: String(m.displayName),
    price: Number(m.price),
    volume: typeof m.volume === "number" ? m.volume : 0,
    tradeCount: Number(m.tradeCount),
    priceChange: typeof m.priceChange === "number" ? m.priceChange : undefined,
    category: m.category as { slug: string; name: string } | undefined,
    tags: Array.isArray(m.tags) ? (m.tags as string[]) : undefined,
  };
}

function narrativeToMarket(m: NarrativeSectionMarket) {
  return {
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange24h != null ? m.priceChange24h * 100 : undefined,
    uniqueTraders24h: m.uniqueTraders24h,
    category: m.category ?? undefined,
    tags: typeof m.tags === "string" ? (() => { try { const t = JSON.parse(m.tags!); return Array.isArray(t) ? t : []; } catch { return []; } })() : undefined,
  };
}

function NarrativeSection({
  title,
  icon: Icon,
  markets,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  markets: NarrativeSectionMarket[];
  emptyLabel: string;
}) {
  if (markets.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-200">
        <Icon className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {markets.map((m) => (
          <MarketCard key={m.id} market={narrativeToMarket(m)} />
        ))}
      </div>
    </section>
  );
}

type SortKey = "score" | "newest" | "volume" | "priceChange";

export function DiscoverContent({ feed, initialTag, narrativeSections }: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feed;
    return feed.filter((m) => {
      const name = String(m.displayName ?? "").toLowerCase();
      const can = String(m.canonical ?? "").toLowerCase();
      return name.includes(q) || can.includes(q);
    });
  }, [feed, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "newest":
        return list; // discovery feed is already time-based; keep order
      case "volume":
        return list.sort((a, b) => (Number(b.volume) ?? 0) - (Number(a.volume) ?? 0));
      case "priceChange":
        return list.sort(
          (a, b) => Math.abs(Number(b.priceChange) ?? 0) - Math.abs(Number(a.priceChange) ?? 0)
        );
      default:
        return list.sort((a, b) => (Number(b.feedScore) ?? 0) - (Number(a.feedScore) ?? 0));
    }
  }, [filtered, sort]);

  const markets = sorted.map(toMarket);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-sm text-slate-500 transition-colors hover:text-emerald-400"
        >
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-200 md:text-xl">
            <Zap className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
            Discover
          </h1>
          {initialTag && (
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
              tag: {initialTag}
            </span>
          )}
        </div>
      </div>

      {/* Filter / sort bar: Input components with proper spacing */}
      <ChaotixCard as="div" className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-5 w-5" strokeWidth={1.5} />}
              aria-label="Search markets"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="discover-sort" className="shrink-0 text-sm text-slate-400">
              Sort by
            </label>
            <select
              id="discover-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-13 rounded-xl border border-white/10 bg-slate-900/50 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            >
              <option value="score">Discovery score</option>
              <option value="volume">Volume</option>
              <option value="priceChange">24h change</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </ChaotixCard>

      {narrativeSections && !initialTag && (
        <div className="space-y-10">
          <NarrativeSection
            title="Exploding Narratives"
            icon={TrendingUp}
            markets={narrativeSections.narrativesExploding}
            emptyLabel="No exploding narratives"
          />
          <NarrativeSection
            title="Rising Narratives"
            icon={Zap}
            markets={narrativeSections.narrativesRising}
            emptyLabel="No rising narratives"
          />
          <NarrativeSection
            title="Falling Narratives"
            icon={TrendingDown}
            markets={narrativeSections.narrativesFalling}
            emptyLabel="No falling narratives"
          />
          <NarrativeSection
            title="Most Traded Narratives"
            icon={TrendingUp}
            markets={narrativeSections.mostTradedNarratives}
            emptyLabel="No traded narratives"
          />
          <NarrativeSection
            title="New Narratives"
            icon={Sparkles}
            markets={narrativeSections.newNarratives}
            emptyLabel="No new narratives"
          />
          <NarrativeSection
            title="Most Controversial"
            icon={MessageCircle}
            markets={narrativeSections.mostControversial}
            emptyLabel="No controversial narratives"
          />
        </div>
      )}

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-200">All markets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {markets.length === 0 ? (
            <EmptyState
              title={search.trim() ? "No matches" : "No markets in the feed yet"}
              description={
                search.trim()
                  ? "Try a different search term."
                  : "Markets will appear here once there is activity."
              }
              ctaLabel="Create a market"
              ctaHref="/create"
            />
          ) : (
            markets.map((m) => <MarketCard key={m.id} market={m} />)
          )}
        </div>
      </section>
    </div>
  );
}
