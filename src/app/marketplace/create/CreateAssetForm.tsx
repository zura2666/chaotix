"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

const SUPPLY_OPTIONS = [
  { value: "fixed", label: "Fixed (no new supply)" },
  { value: "limited", label: "Limited (max supply)" },
  { value: "unlimited", label: "Unlimited" },
];

export function CreateAssetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [supplyModel, setSupplyModel] = useState<"fixed" | "limited" | "unlimited">("unlimited");
  const [maxSupply, setMaxSupply] = useState("");
  const [initialSupply, setInitialSupply] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || "other",
          description: description.trim() || null,
          supplyModel,
          maxSupply: supplyModel === "limited" && maxSupply ? parseFloat(maxSupply) : null,
          initialSupply: initialSupply ? parseFloat(initialSupply) : undefined,
          metadata: imageUrl || mediaUrls
            ? { imageUrl: imageUrl.trim() || undefined, media: mediaUrls.split(",").map((u) => u.trim()).filter(Boolean) }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create asset");
        return;
      }
      router.push(`/marketplace/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChaotixCard as="form" className="mt-6 space-y-4 p-6" onSubmit={handleSubmit}>
      {error && (
        <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      <div>
        <label className="block text-sm text-slate-400">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Rare collectible #1"
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="player, collectible, service, other"
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Image URL (branding)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Media URLs (comma-separated)</label>
        <input
          type="text"
          value={mediaUrls}
          onChange={(e) => setMediaUrls(e.target.value)}
          placeholder="https://..., https://..."
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Supply model</label>
        <select
          value={supplyModel}
          onChange={(e) => setSupplyModel(e.target.value as "fixed" | "limited" | "unlimited")}
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
        >
          {SUPPLY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {supplyModel === "limited" && (
        <div>
          <label className="block text-sm text-slate-400">Max supply</label>
          <input
            type="number"
            min="1"
            step="1"
            value={maxSupply}
            onChange={(e) => setMaxSupply(e.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
      )}
      <div>
        <label className="block text-sm text-slate-400">Initial supply (optional)</label>
        <p className="text-xs text-slate-500">Give yourself units so you can list for sale.</p>
        <input
          type="number"
          min="0"
          step="1"
          value={initialSupply}
          onChange={(e) => setInitialSupply(e.target.value)}
          placeholder="0"
          className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>
      <ChaotixButton type="submit" disabled={submitting} variant="primary" className="w-full">
        {submitting ? "Creating…" : "Create asset"}
      </ChaotixButton>
    </ChaotixCard>
  );
}
