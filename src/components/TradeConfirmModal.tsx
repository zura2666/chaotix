"use client";

import { X } from "lucide-react";

type Props = {
  open: boolean;
  side: "buy" | "sell";
  amount?: number;
  shares?: number;
  price: number;
  total: number;
  fee: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function TradeConfirmModal({
  open,
  side,
  amount,
  shares,
  price,
  total,
  fee,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Confirm {side === "buy" ? "Buy" : "Sell"}
          </h3>
          <button
            onClick={onCancel}
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="space-y-2 text-sm mb-6">
          {side === "buy" && amount != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Spend</span>
              <span className="font-mono text-white">{amount.toFixed(2)}</span>
            </div>
          )}
          {side === "sell" && shares != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Shares</span>
              <span className="font-mono text-white">{shares.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Price</span>
            <span className="font-mono text-emerald-400">
              ${price.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total</span>
            <span className="font-mono text-white">{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fee (1%)</span>
            <span className="font-mono text-slate-500">{fee.toFixed(2)}</span>
          </div>
          {side === "sell" && (
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="text-slate-500">You receive</span>
              <span className="font-mono text-emerald-400">
                {(total - fee).toFixed(2)}
              </span>
            </div>
          )}
        </dl>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-slate-500 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
