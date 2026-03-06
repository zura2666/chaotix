"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { Input } from "@/components/ui/Input";
import { normalizeTag } from "@/lib/tags";

function normalize(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

type Category = { id: string; slug: string; name: string };

export function CreateMarketForm({ initialString }: { initialString: string }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawString, setRawString] = useState(initialString);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonical = rawString.trim() ? normalize(rawString) : "";

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()).then((d) => d.user ?? null),
      fetch("/api/categories").then((r) => r.json()).then((d) => d.categories ?? []),
    ]).then(([u, cats]) => {
      setUser(u);
      setCategories(cats);
      setCategoryId((prev) => (prev || (cats.length > 0 ? cats[0].id : "")));
    }).finally(() => setLoading(false));
  }, []);

  const parsedTags = tagsStr
    .split(/[\n,]+/)
    .map((t) => normalizeTag(t.trim()))
    .filter((t) => t.length > 0);
  const uniqueTags = Array.from(new Set(parsedTags)).slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (canonical.length < 3) {
      setError("Canonical string must be at least 3 characters after normalization.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          categoryId,
          tags: uniqueTags,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create market.");
        return;
      }
      router.push(`/market/${encodeURIComponent(data.market.canonical)}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ChaotixCard as="div" className="p-10 text-center text-slate-500">
        Loading…
      </ChaotixCard>
    );
  }

  if (!user) {
    return (
      <ChaotixCard as="div" className="p-10 text-center">
        <p className="mb-4 text-slate-500">You must be logged in to create a market.</p>
        <ChaotixButton href="/" variant="primary">
          Go to home and sign in
        </ChaotixButton>
      </ChaotixCard>
    );
  }

  return (
    <ChaotixCard as="div" className="p-6 md:p-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="create-canonical" className="mb-1 block text-sm text-slate-400">
            String (canonical)
          </label>
          <Input
            id="create-canonical"
            type="text"
            value={rawString}
            onChange={(e) => setRawString(e.target.value)}
            placeholder="e.g. united_states or nvidia"
            containerClassName="!h-14 min-h-[3.5rem] w-full"
            className="text-base"
          />
          {canonical ? (
            <p className="mt-1 text-xs text-slate-500">
              Normalized: <span className="font-mono text-emerald-400">{canonical}</span>
            </p>
          ) : (
            rawString.trim() && (
              <p className="mt-1 text-sm text-red-400">Canonical must be at least 3 characters after normalization.</p>
            )
          )}
        </div>
        <div>
          <label htmlFor="create-title" className="mb-1 block text-sm text-slate-400">
            Title (optional)
          </label>
          <Input
            id="create-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Display title"
            maxLength={200}
            containerClassName="!h-14 min-h-[3.5rem] w-full"
            className="text-base"
          />
        </div>
        <div>
          <label htmlFor="create-description" className="mb-1 block text-sm text-slate-400">
            Description (optional)
          </label>
          <textarea
            id="create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 min-h-[3.5rem]"
          />
        </div>
        <div>
          <label htmlFor="create-category" className="mb-1 block text-sm text-slate-400">
            Category
          </label>
          <select
            id="create-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="h-14 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 text-base text-slate-100 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="create-tags" className="mb-1 block text-sm text-slate-400">
            Tags (optional, max 5 — lowercase, letters numbers and dashes)
          </label>
          <textarea
            id="create-tags"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="crypto, ai, defi"
            rows={2}
            maxLength={120}
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 min-h-[3.5rem]"
          />
          {uniqueTags.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {uniqueTags.length}/5 tags: {uniqueTags.join(", ")}
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <ChaotixButton
            type="submit"
            disabled={submitting || canonical.length < 3 || !categoryId}
            variant="primary"
            className="h-14 min-h-[3.5rem] w-full"
          >
            {submitting ? "Creating…" : "Create Market"}
          </ChaotixButton>
          <ChaotixButton href="/" variant="secondary" className="min-h-[44px] shrink-0 sm:w-auto w-full">
            Cancel
          </ChaotixButton>
        </div>
      </form>
    </ChaotixCard>
  );
}
