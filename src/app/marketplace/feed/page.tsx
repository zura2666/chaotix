"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { Activity, MessageCircle } from "lucide-react";

type FeedItem = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  user?: { name: string | null; username: string | null };
};

type TrendingAsset = {
  id: string;
  title: string;
  commentCount: number;
  communitySentimentScore: number;
};

export default function MarketplaceFeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace/feed")
      .then((r) => r.json())
      .then((d) => {
        setFeed(d.feed ?? []);
        setTrending(d.trendingDiscussions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/marketplace" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Activity feed</h1>
      <p className="mt-1 text-sm text-slate-400">
        Trades and listings from people you follow. Follow traders to see their activity here.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <ChaotixCard as="div" className="p-8 text-center text-slate-500">Loading…</ChaotixCard>
          ) : feed.length === 0 ? (
            <ChaotixCard as="div" className="p-8 text-center text-slate-500">
              <Activity className="mx-auto h-12 w-12 text-slate-600 mb-2" />
              <p>No activity yet.</p>
              <p className="mt-1 text-sm">Follow traders to see their trades and new listings here.</p>
              <Link href="/marketplace" className="mt-3 inline-block text-emerald-400 hover:underline">
                Browse marketplace
              </Link>
            </ChaotixCard>
          ) : (
            feed.map((item) => (
              <ChaotixCard key={item.id} as="div" className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white/5 p-2">
                    <Activity className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300">
                      {item.type === "asset_trade" && (
                        <>
                          <span className="font-medium text-white">{item.user?.name || item.user?.username || "Someone"}</span>
                          {" "}bought{" "}
                          <span className="font-mono text-emerald-400">{(item.payload?.quantity as number)?.toFixed(0)}</span>
                          {" "}@ {(item.payload?.unitPrice as number)?.toFixed(2)}
                          {" "}on{" "}
                          <Link href={`/marketplace/${item.payload?.assetId}`} className="text-emerald-400 hover:underline">
                            asset
                          </Link>
                        </>
                      )}
                      {item.type === "asset_listing_created" && (
                        <>
                          <span className="font-medium text-white">{item.user?.name || item.user?.username || "Someone"}</span>
                          {" "}listed{" "}
                          <span className="font-mono text-amber-400">{(item.payload?.quantity as number)?.toFixed(0)}</span>
                          {" "}@ {(item.payload?.unitPrice as number)?.toFixed(2)}
                          {" "}on{" "}
                          <Link href={`/marketplace/${item.payload?.assetId}`} className="text-emerald-400 hover:underline">
                            asset
                          </Link>
                        </>
                      )}
                      {item.type === "asset_comment" && (
                        <>
                          <span className="font-medium text-white">{item.user?.name || item.user?.username || "Someone"}</span>
                          {" "}commented on{" "}
                          <Link href={`/marketplace/${item.payload?.assetId}`} className="text-emerald-400 hover:underline">
                            asset
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </ChaotixCard>
            ))
          )}
        </div>

        <div>
          <ChaotixCard as="div" className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
              <MessageCircle className="h-4 w-4" />
              Trending discussions
            </h2>
            {trending.length === 0 ? (
              <p className="text-sm text-slate-500">No discussions yet.</p>
            ) : (
              <ul className="space-y-2">
                {trending.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/marketplace/${a.id}`}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      <span className="font-medium">{a.title}</span>
                      <span className="ml-2 text-slate-500">{a.commentCount} comments</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ChaotixCard>
        </div>
      </div>
    </div>
  );
}
