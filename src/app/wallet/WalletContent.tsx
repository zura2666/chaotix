"use client";

import { useState, useEffect, useCallback } from "react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { Copy, Wallet, CreditCard, Loader2, ChevronDown, ChevronUp } from "lucide-react";

type WalletData = {
  balance: number;
  lockedBalance: number;
  available: number;
  depositAddresses: { id: string; chain: string; address: string }[];
};

type TxItem =
  | { id: string; type: "deposit"; method: string; asset: string; amount: number; status: string; txHash?: string | null; createdAt: string }
  | { id: string; type: "trade"; side: string; shares: number; price: number; total: number; fee: number; marketCanonical?: string; marketDisplayName?: string | null; createdAt: string };

const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];

export function WalletContent() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [depositTab, setDepositTab] = useState<"crypto" | "paypal" | "card">("crypto");
  const [cryptoChain, setCryptoChain] = useState("ethereum");
  const [cryptoAddress, setCryptoAddress] = useState<string | null>(null);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [paypalAmount, setPaypalAmount] = useState("25");
  const [cardAmount, setCardAmount] = useState("25");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState(true);

  const fetchWallet = useCallback(async () => {
    const res = await fetch("/api/wallet", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setWallet(data);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    const res = await fetch("/api/wallet/transactions?page=0", { credentials: "include" });
    setTxLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setTransactions(data.transactions ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchTransactions()]);
      setLoading(false);
    })();
  }, [fetchWallet, fetchTransactions]);

  const getCryptoAddress = async () => {
    setCryptoLoading(true);
    setDepositError(null);
    try {
      const res = await fetch("/api/deposit/crypto", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: cryptoChain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.error ?? "Failed to get address");
        setCryptoAddress(null);
        return;
      }
      setCryptoAddress(data.address);
      await fetchWallet();
    } catch {
      setDepositError("Request failed");
      setCryptoAddress(null);
    } finally {
      setCryptoLoading(false);
    }
  };

  const handlePaypalDeposit = async () => {
    const amount = parseFloat(paypalAmount);
    if (!Number.isFinite(amount) || amount < 5) {
      setDepositError("Minimum $5");
      return;
    }
    setDepositLoading(true);
    setDepositError(null);
    try {
      const res = await fetch("/api/deposit/paypal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.error ?? "Failed");
        return;
      }
      if (data.placeholder) {
        setDepositError("PayPal not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
        return;
      }
      setDepositError("Complete payment in the popup. Balance updates after confirmation.");
    } catch {
      setDepositError("Request failed");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleCardDeposit = async () => {
    const amount = parseFloat(cardAmount);
    if (!Number.isFinite(amount) || amount < 5) {
      setDepositError("Minimum $5");
      return;
    }
    setDepositLoading(true);
    setDepositError(null);
    try {
      const res = await fetch("/api/deposit/card", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          successUrl: typeof window !== "undefined" ? `${window.location.origin}/wallet?deposit=success` : undefined,
          cancelUrl: typeof window !== "undefined" ? `${window.location.origin}/wallet` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.error ?? "Failed");
        return;
      }
      if (data.placeholder) {
        setDepositError("Stripe not configured. Set STRIPE_SECRET_KEY.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setDepositError("Redirect URL not returned.");
    } catch {
      setDepositError("Request failed");
    } finally {
      setDepositLoading(false);
    }
  };

  const copyAddress = () => {
    if (cryptoAddress) {
      navigator.clipboard.writeText(cryptoAddress);
    }
  };

  if (loading || !wallet) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Balance */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Balance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Available</p>
            <p className="text-2xl font-semibold text-slate-100">${wallet.available.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Locked (in trades)</p>
            <p className="text-2xl font-semibold text-slate-100">${wallet.lockedBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-semibold text-slate-100">${wallet.balance.toFixed(2)}</p>
          </div>
        </div>
      </ChaotixCard>

      {/* Deposit */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Deposit</h2>
        <div className="mt-4 flex gap-2 border-b border-white/10 pb-4">
          {(["crypto", "paypal", "card"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDepositTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                depositTab === tab
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab === "crypto" && <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Crypto</span>}
              {tab === "paypal" && "PayPal"}
              {tab === "card" && <span className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Card</span>}
            </button>
          ))}
        </div>

        {depositTab === "crypto" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500">Network</label>
              <select
                value={cryptoChain}
                onChange={(e) => { setCryptoChain(e.target.value); setCryptoAddress(null); }}
                className="mt-1 w-full max-w-xs rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
              >
                {CHAINS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <ChaotixButton
              onClick={getCryptoAddress}
              disabled={cryptoLoading}
              className="flex items-center gap-2"
            >
              {cryptoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Show deposit address
            </ChaotixButton>
            {cryptoAddress && (
              <div className="rounded-lg border border-white/10 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-500">Send only supported assets to this address. Min deposit may apply.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-black/30 px-2 py-1.5 text-sm text-emerald-400">
                    {cryptoAddress}
                  </code>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="shrink-0 rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label="Copy address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {depositTab === "paypal" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500">Amount (USD)</label>
              <input
                type="number"
                min={5}
                max={5000}
                value={paypalAmount}
                onChange={(e) => setPaypalAmount(e.target.value)}
                className="mt-1 w-full max-w-[200px] rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
              />
            </div>
            <ChaotixButton onClick={handlePaypalDeposit} disabled={depositLoading} className="flex items-center gap-2">
              {depositLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with PayPal
            </ChaotixButton>
          </div>
        )}

        {depositTab === "card" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500">Amount (USD)</label>
              <input
                type="number"
                min={5}
                max={10000}
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                className="mt-1 w-full max-w-[200px] rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
              />
            </div>
            <ChaotixButton onClick={handleCardDeposit} disabled={depositLoading} className="flex items-center gap-2">
              {depositLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Pay with card (Stripe)
            </ChaotixButton>
          </div>
        )}

        {depositError && (
          <p className="mt-4 text-sm text-amber-400">{depositError}</p>
        )}
      </ChaotixCard>

      {/* Withdraw placeholder */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Withdraw</h2>
        <p className="mt-2 text-sm text-slate-400">Withdrawals are not yet available. Use your balance to trade on Chaotix.</p>
      </ChaotixCard>

      {/* Transaction history */}
      <ChaotixCard as="div" className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setTxOpen((o) => !o)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Transaction history</h2>
          {txOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </button>
        {txOpen && (
          <div className="border-t border-white/10">
            {txLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    {tx.type === "deposit" ? (
                      <>
                        <div>
                          <p className="font-medium text-slate-200">Deposit ({tx.method})</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString()} · {tx.status}
                          </p>
                        </div>
                        <span className="font-mono text-emerald-400">+${tx.amount.toFixed(2)}</span>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium text-slate-200">{tx.side === "buy" ? "Buy" : "Sell"} · {tx.marketDisplayName ?? tx.marketCanonical ?? "—"}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString()} · {tx.shares} @ ${tx.price.toFixed(2)}
                          </p>
                        </div>
                        <span className={`font-mono ${tx.side === "buy" ? "text-slate-300" : "text-emerald-400"}`}>
                          {tx.side === "buy" ? "-" : "+"}${Math.abs(tx.total).toFixed(2)}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ChaotixCard>
    </div>
  );
}
