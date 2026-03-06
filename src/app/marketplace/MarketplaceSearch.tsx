"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

type SortOption = "newest" | "trending" | "volume" | "demand" | "liquidity" | "price";

export function MarketplaceSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get("sortBy") as SortOption) ?? "newest");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  const apply = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    router.push(`/marketplace${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="trending">Trending</option>
          <option value="volume">Volume</option>
          <option value="demand">Demand</option>
          <option value="liquidity">Liquidity</option>
          <option value="price">Price</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${showFilters ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
        <button
          onClick={apply}
          className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
        >
          Search
        </button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div>
            <label className="block text-xs text-slate-500">Category</label>
            <input
              type="text"
              placeholder="e.g. player, collectible"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-40 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Min price</label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Max price</label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1 w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
