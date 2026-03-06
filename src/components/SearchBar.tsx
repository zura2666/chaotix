"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";
import { IconWrapper } from "@/components/ui/IconWrapper";

type User = {
  id: string;
  email: string | null;
  name: string | null;
  username?: string | null;
  referralCode: string;
  balance: number;
  isAdmin?: boolean;
};

type SearchSuggestion = {
  id: string;
  canonical: string;
  displayName: string;
};

type SearchBarProps = {
  user: User | null;
  onOpenAuth: () => void;
  onCreateMarketRequest: (canonical: string) => void;
  /** Compact mode for header: smaller height, max-width ~500px */
  compact?: boolean;
  /** Right-side shortcut hint (e.g. " / " for slash to focus) */
  shortcutHint?: string;
};

export function SearchBar({ user, onOpenAuth, onCreateMarketRequest, compact, shortcutHint }: SearchBarProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.markets ?? []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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
    setOpen(false);
    setQ("");
    router.push(`/market/${encodeURIComponent(canonical)}`);
  };

  const handleCreateMarketClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const canonical = normalize(q);
    if (canonical.length < 3) return;
    setOpen(false);
    setQ("");
    onCreateMarketRequest(canonical);
  };

  const showDropdown = open && (q.trim() || suggestions.length > 0);
  const hasQuery = q.trim().length > 0;
  const noResults = hasQuery && !loading && suggestions.length === 0;

  return (
    <div ref={ref} className={clsx("relative min-w-0", compact ? "w-full max-w-[450px]" : "flex-1")}>
      <form
        onSubmit={(e) => e.preventDefault()}
        className={clsx(
          "relative flex items-center rounded-lg border border-white/10 bg-gray-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20",
          compact ? "h-9" : "h-13 rounded-xl"
        )}
      >
        <div className={clsx("absolute top-1/2 -translate-y-1/2 text-slate-500", compact ? "left-3" : "left-4")}>
          <Search className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.5} aria-hidden />
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search markets…"
          className={clsx(
            "h-full min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500",
            compact ? "pl-8 pr-8 text-sm" : "pl-10 pr-4 text-sm"
          )}
          style={{ textIndent: 0 }}
          maxLength={500}
        />
        <div className={clsx("flex h-full items-center pointer-events-none", compact ? "pr-2.5 text-slate-500" : "pr-3")}>
          {shortcutHint != null ? (
            <span className="font-mono text-xs text-slate-500" aria-label="Shortcut">{shortcutHint}</span>
          ) : (
            <IconWrapper>
              <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-500" aria-label="Command palette shortcut">
                ⌘K
              </kbd>
            </IconWrapper>
          )}
        </div>
      </form>
      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[999] w-full max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0b0e11] py-1 shadow-2xl backdrop-blur-md">
          {loading && (
            <div className="px-4 py-4 text-center text-sm text-slate-500">
              Searching…
            </div>
          )}
          {!loading && noResults && (
            <div className="px-4 py-3 overscroll-contain">
              <p className="text-sm text-slate-500">Market not found.</p>
              <button
                type="button"
                onClick={handleCreateMarketClick}
                className="mt-2 h-13 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                {normalize(q).length >= 3 ? `Create "${q.trim().slice(0, 24)}${q.trim().length > 24 ? "…" : ""}" Market` : "Create Market"}
              </button>
            </div>
          )}
          {!loading &&
            suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMarket(m.canonical)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm leading-none text-white transition-colors hover:bg-white/5"
              >
                <span>{m.displayName}</span>
                <span className="text-xs text-slate-500">${m.canonical}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
