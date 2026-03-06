"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { IconWrapper } from "@/components/ui/IconWrapper";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

type User = {
  id: string;
  email: string | null;
  name: string | null;
  username?: string | null;
  referralCode: string;
  balance: number;
  isAdmin?: boolean;
};

type SearchMarket = { id: string; canonical: string; displayName: string };
type SearchCategory = { id: string; slug: string; name: string };

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onCreateMarketRequest: (canonical: string) => void;
};

export function SearchOverlay({
  open,
  onClose,
  user,
  onOpenAuth,
  onCreateMarketRequest,
}: SearchOverlayProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [markets, setMarkets] = useState<SearchMarket[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setMarkets([]);
      setCategories([]);
      setTags([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setMarkets(d.markets ?? []);
          setCategories(d.categories ?? []);
          const rawTags = d.tags ?? [];
          setTags(Array.isArray(rawTags) ? rawTags : []);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setMarkets([]);
      setCategories([]);
      setTags([]);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const normalize = (s: string) => {
    let t = String(s).trim().toLowerCase();
    t = t
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32);
    return t;
  };

  const handleSelectMarket = (canonical: string) => {
    onClose();
    setQ("");
    router.push(`/market/${encodeURIComponent(canonical)}`);
  };

  const handleCreateMarketClick = () => {
    if (!user) {
      onClose();
      onOpenAuth();
      return;
    }
    const canonical = normalize(q);
    if (canonical.length < 3) return;
    onClose();
    setQ("");
    onCreateMarketRequest(canonical);
  };

  const hasQuery = q.trim().length > 0;
  const noResults =
    hasQuery && !loading && markets.length === 0 && categories.length === 0 && tags.length === 0;

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlayContent = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Search markets"
    >
      <div className="flex min-h-14 shrink-0 items-center gap-2 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <Input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search markets…"
              leftIcon={<Search strokeWidth={1.5} aria-hidden />}
              containerClassName="h-14 min-h-[3.5rem]"
              className="text-base"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 outline-none transition hover:bg-white/10 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Close search"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-8 sm:px-4">
          {loading && (
            <div className="py-8 text-center text-sm text-slate-500">Searching…</div>
          )}
          {!loading && !hasQuery && (
            <p className="py-8 text-center text-sm text-slate-500">Type to search markets.</p>
          )}
          {!loading && noResults && (
            <div className="space-y-3 py-4 overscroll-contain">
              <p className="text-sm text-slate-500">Market not found.</p>
              <button
                type="button"
                onClick={handleCreateMarketClick}
                className="h-14 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-base font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 min-h-[44px]"
              >
                {normalize(q).length >= 3 ? `Create "${q.trim().slice(0, 24)}${q.trim().length > 24 ? "…" : ""}" Market` : "Create Market"}
              </button>
            </div>
          )}
          {!loading && (markets.length > 0 || categories.length > 0 || tags.length > 0) && (
            <div className="space-y-6 py-2">
              {categories.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Categories
                  </h3>
                  <ul className="space-y-2">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <ChaotixCard as="div" className="p-4">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setQ("");
                              router.push(`/category/${c.slug}`);
                            }}
                            className="flex w-full items-center gap-3 text-left min-h-[44px]"
                          >
                            <span className="font-medium text-slate-100">{c.name}</span>
                            <span className="text-xs text-slate-500">Category</span>
                          </button>
                        </ChaotixCard>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {tags.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tags
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <li key={tag}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setQ("");
                            router.push(`/discover?tag=${encodeURIComponent(tag)}`);
                          }}
                          className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                        >
                          {tag}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {markets.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Markets
                  </h3>
                  <ul className="space-y-2">
                    {markets.map((m) => (
                      <li key={m.id}>
                        <ChaotixCard as="div" className="p-4">
                          <button
                            type="button"
                            onClick={() => handleSelectMarket(m.canonical)}
                            className="flex w-full items-center justify-between gap-3 text-left min-h-[44px]"
                          >
                            <span className="font-medium text-slate-100 truncate">{m.displayName}</span>
                            <span className="text-xs text-slate-500 shrink-0">#{m.canonical}</span>
                          </button>
                        </ChaotixCard>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
