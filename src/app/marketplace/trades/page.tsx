import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTradeHistory } from "@/lib/marketplace";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

export const metadata = {
  title: "Trade history · Marketplace · Chaotix",
  description: "Your marketplace trade history.",
};

export default async function TradeHistoryPage() {
  const user = await getSession();
  if (!user) redirect("/api/auth/signin");

  const trades = await getUserTradeHistory(user.id, { limit: 100 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Trade history</h1>
      <p className="mt-1 text-sm text-slate-400">Your recent buys and sells across all assets.</p>

      {trades.length === 0 ? (
        <ChaotixCard as="div" className="mt-6 p-10 text-center text-slate-500">
          <p>No trades yet.</p>
          <Link href="/marketplace" className="mt-2 inline-block text-emerald-400 hover:underline">
            Browse marketplace
          </Link>
        </ChaotixCard>
      ) : (
        <ChaotixCard as="div" className="mt-6 overflow-hidden p-0">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-4 py-2">
                      <Link href={`/marketplace/${t.asset.id}`} className="text-emerald-400 hover:underline">
                        {t.asset.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className={t.buyerId === user.id ? "text-emerald-400" : "text-amber-400"}>
                        {t.buyerId === user.id ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{t.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono">{t.quantity.toFixed(2)}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChaotixCard>
      )}
    </div>
  );
}
