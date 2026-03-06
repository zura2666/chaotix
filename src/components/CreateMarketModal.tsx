"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MIN_IDENTIFIER_LEN, MAX_IDENTIFIER_LEN } from "@/lib/validation-hints";

type Props = {
  open: boolean;
  onClose: () => void;
  initialCanonical?: string;
};

function normalize(s: string): string {
  let t = String(s).trim().toLowerCase();
  t = t
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, MAX_IDENTIFIER_LEN);
  return t;
}

function validateCanonical(s: string): string | null {
  const t = normalize(s);
  if (t.length < MIN_IDENTIFIER_LEN)
    return `Use at least ${MIN_IDENTIFIER_LEN} characters.`;
  if (!/^[a-z0-9_-]+$/.test(t))
    return "Only letters, numbers, _ and - allowed.";
  return null;
}

export function CreateMarketModal({
  open,
  onClose,
  initialCanonical = "",
}: Props) {
  const router = useRouter();
  const [raw, setRaw] = useState(initialCanonical);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validateCanonical(raw);
    if (err) {
      setError(err);
      return;
    }
    const canonical = normalize(raw);
    onClose();
    setRaw("");
    router.push(`/market/${encodeURIComponent(canonical)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-4 text-lg font-bold text-white">Create Market</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="e.g. elon_musk"
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            maxLength={100}
          />
          {error && (
            <p className="mt-2 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-400"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
