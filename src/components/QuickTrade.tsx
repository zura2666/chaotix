"use client";

import { useState, useEffect } from "react";
import { DollarSign, Layers } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { Input } from "@/components/ui/Input";

type QuickTradeProps = {
  marketId: string;
  canonical: string;
  displayName: string;
  price: number;
  userBalance: number;
  positionShares: number;
  onBuy: (amount: number) => Promise<void>;
  onSell: (shares: number) => Promise<void>;
  loading?: boolean;
  error?: string;
  /** When set, switch to sell tab and prefill shares (e.g. from position card "Sell" button). Cleared after applied. */
  triggerSellMax?: number | null;
  onTriggerSellMaxConsumed?: () => void;
};

const FEE_BPS = 100; // 1%
const PRICE_IMPACT_SAMPLE = 0.1; // placeholder %

export function QuickTrade({
  marketId: _marketId,
  canonical: _canonical,
  displayName,
  price,
  userBalance,
  positionShares,
  onBuy,
  onSell,
  loading = false,
  error: externalError,
  triggerSellMax,
  onTriggerSellMaxConsumed,
}: QuickTradeProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (triggerSellMax != null && triggerSellMax > 0) {
      setTab("sell");
      setSellShares(String(triggerSellMax));
      onTriggerSellMaxConsumed?.();
    }
  }, [triggerSellMax, onTriggerSellMaxConsumed]);

  const submit = async () => {
    setError("");
    if (tab === "buy") {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setError("Enter a valid amount.");
        return;
      }
      if (amt > userBalance) {
        setError("Insufficient balance.");
        return;
      }
      await onBuy(amt);
      setAmount("");
    } else {
      const sh = Number(sellShares);
      if (!Number.isFinite(sh) || sh <= 0 || positionShares < sh) {
        setError("Enter valid shares to sell.");
        return;
      }
      await onSell(sh);
      setSellShares("");
    }
  };

  const displayError = externalError ?? error;
  const canSubmit =
    tab === "buy"
      ? amount && Number(amount) > 0 && Number(amount) <= userBalance
      : sellShares && Number(sellShares) > 0 && Number(sellShares) <= positionShares;

  const buyAmount = Number(amount) || 0;
  const estShares = price > 0 ? buyAmount / price : 0;
  const buyFee = buyAmount * (FEE_BPS / 10000);
  const sellSh = Number(sellShares) || 0;
  const sellTotal = sellSh * price;
  const sellFee = sellTotal * (FEE_BPS / 10000);

  return (
    <ChaotixCard as="div" className="p-4 md:p-6">
      <h3 className="mb-4 text-sm font-medium text-slate-400">Quick trade</h3>
      <p className="mb-4 truncate font-semibold text-slate-100">{displayName}</p>

      {/* Buy / Sell tabs: full-width side-by-side on mobile */}
      <div className="mb-4 flex gap-2">
        <ChaotixButton
          type="button"
          variant={tab === "buy" ? "primary" : "secondary"}
          className="min-h-[44px] flex-1"
          onClick={() => setTab("buy")}
        >
          Buy
        </ChaotixButton>
        <ChaotixButton
          type="button"
          variant={tab === "sell" ? "primary" : "secondary"}
          className="min-h-[44px] flex-1"
          onClick={() => setTab("sell")}
        >
          Sell
        </ChaotixButton>
      </div>

      {tab === "buy" ? (
        <>
          <div className="mb-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Amount to spend"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step={0.01}
              leftIcon={<DollarSign className="h-5 w-5" strokeWidth={1.5} />}
              containerClassName="!h-14 min-h-[3.5rem]"
              className="text-base"
              rightSlot={
                <ChaotixButton
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] min-w-[44px] h-11 px-3 text-xs"
                  onClick={() => setAmount(String(userBalance))}
                >
                  Max
                </ChaotixButton>
              }
            />
          </div>
          <p className="mb-2 text-sm text-slate-500">
            ~{estShares.toFixed(2)} shares (est.) · Price impact ~{PRICE_IMPACT_SAMPLE}%
          </p>
          <p className="mb-4 text-sm text-slate-500">
            Fee: <span className="text-emerald-400">{buyFee.toFixed(2)}</span> (1%)
          </p>
        </>
      ) : (
        <>
          <div className="mb-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Shares to sell"
              value={sellShares}
              onChange={(e) => setSellShares(e.target.value)}
              min={0}
              max={positionShares}
              step={0.01}
              leftIcon={<Layers className="h-5 w-5" strokeWidth={1.5} />}
              containerClassName="!h-14 min-h-[3.5rem]"
              className="text-base"
              rightSlot={
                <ChaotixButton
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] min-w-[44px] h-11 px-3 text-xs"
                  onClick={() => setSellShares(String(positionShares))}
                >
                  Max
                </ChaotixButton>
              }
            />
          </div>
          <p className="mb-2 text-sm text-slate-500">
            You have: <span className="font-mono text-emerald-400">{positionShares.toFixed(2)}</span> shares
          </p>
          <p className="mb-4 text-sm text-slate-500">
            Est. proceeds: <span className="text-emerald-400">{sellTotal.toFixed(2)}</span> · Fee:{" "}
            <span className="text-emerald-400">{sellFee.toFixed(2)}</span> (1%)
          </p>
        </>
      )}

      {displayError && <p className="mb-3 text-sm text-chaos-tradeDown">{displayError}</p>}

      <ChaotixButton
        type="button"
        variant="primary"
        className="h-14 min-h-[3.5rem] w-full"
        disabled={loading || !canSubmit}
        onClick={submit}
      >
        {loading ? "..." : tab === "buy" ? "Buy" : "Sell"}
      </ChaotixButton>
    </ChaotixCard>
  );
}
