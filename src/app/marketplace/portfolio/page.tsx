import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolio } from "@/lib/marketplace";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

export const metadata = {
  title: "Portfolio · Marketplace · Chaotix",
  description: "Your asset holdings and balances.",
};

export default async function PortfolioPage() {
  const user = await getSession();
  if (!user) redirect("/api/auth/signin");

  const portfolio = await getPortfolio(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Portfolio</h1>
      <p className="mt-1 text-sm text-slate-400">Your holdings across marketplace assets.</p>

      {portfolio.length === 0 ? (
        <ChaotixCard as="div" className="mt-6 p-10 text-center text-slate-500">
          <p>No holdings yet. Buy assets on the marketplace to see them here.</p>
          <Link href="/marketplace" className="mt-2 inline-block text-emerald-400 hover:underline">
            Browse marketplace
          </Link>
        </ChaotixCard>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {portfolio.map(({ assetId, asset, quantity, value }) => (
            <li key={assetId}>
              <Link href={`/marketplace/${assetId}`}>
                <ChaotixCard as="div" className="p-4 transition-colors hover:border-emerald-500/30">
                  <h2 className="font-semibold text-white truncate">{asset.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{asset.category}</p>
                  <p className="mt-2 font-mono text-emerald-400">
                    {quantity.toFixed(2)} <span className="text-slate-500 text-sm">units</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Value: <span className="text-white">{value.toFixed(2)}</span>
                  </p>
                </ChaotixCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
