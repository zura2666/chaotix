"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { EmptyState } from "@/components/EmptyState";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { Input } from "@/components/ui/Input";

type FeedItem = Record<string, unknown>;

type Props = {
  feed: FeedItem[];
  initialTag?: string;
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

type SortKey = "score" | "newest" | "volume" | "priceChange";

export function DiscoverContent({ feed, initialTag }: Props) {
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
              <option value="priceChange">Price change</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </ChaotixCard>

      <section>
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
