import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortfolio } from "@/lib/portfolio";
import { PortfolioChart } from "./PortfolioChart";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { EmptyState } from "@/components/EmptyState";

export default async function PortfolioPage() {
  const user = await getSession();
  if (!user) redirect("/");
  const portfolio = await getPortfolio(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 md:space-y-12">
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
      >
        ← Home
      </Link>
      <h1 className="text-xl font-semibold tracking-tighter text-slate-100 md:text-3xl">
        Portfolio
      </h1>

      {/* Summary cards: single column on mobile, stacked label/value */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <ChaotixCard as="div" className="p-4 md:p-6">
          <p className="text-sm text-slate-500">Total value</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">
            {portfolio.totalValue.toFixed(2)}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4 md:p-6">
          <p className="text-sm text-slate-500">Unrealized PnL</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              portfolio.unrealizedPnL >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"
            }`}
          >
            {portfolio.unrealizedPnL >= 0 ? "+" : ""}
            {portfolio.unrealizedPnL.toFixed(2)}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4 md:p-6">
          <p className="text-sm text-slate-500">Realized PnL</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              portfolio.realizedPnL >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"
            }`}
          >
            {portfolio.realizedPnL >= 0 ? "+" : ""}
            {portfolio.realizedPnL.toFixed(2)}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4 md:p-6">
          <p className="text-sm text-slate-500">Positions</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">
            {portfolio.positions.length}
          </p>
        </ChaotixCard>
      </div>

      {/* Chart: ChaotixCard p-4, Recharts area emerald */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
          Portfolio value
        </h2>
        <ChaotixCard as="div" className="overflow-hidden p-4">
          <PortfolioChart
            totalValue={portfolio.totalValue}
            realizedPnL={portfolio.realizedPnL}
            unrealizedPnL={portfolio.unrealizedPnL}
          />
        </ChaotixCard>
      </section>

      {/* Best / worst: mini ChaotixCards */}
      {(portfolio.bestMarket || portfolio.worstMarket) && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
            Best & worst markets
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {portfolio.bestMarket && (
              <ChaotixCard as="div" className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Best (unrealized)
                </p>
                <Link
                  href={`/market/${portfolio.bestMarket.marketCanonical}`}
                  className="mt-1 block font-medium text-slate-100 transition-colors hover:text-emerald-400"
                >
                  {portfolio.bestMarket.marketDisplayName}
                </Link>
                <p className="mt-1 text-lg font-semibold text-emerald-400">
                  +{portfolio.bestMarket.unrealizedPnL.toFixed(2)}
                </p>
              </ChaotixCard>
            )}
            {portfolio.worstMarket &&
              portfolio.worstMarket.id !== portfolio.bestMarket?.id && (
                <ChaotixCard as="div" className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Worst (unrealized)
                  </p>
                  <Link
                    href={`/market/${portfolio.worstMarket.marketCanonical}`}
                    className="mt-1 block font-medium text-slate-100 transition-colors hover:text-emerald-400"
                  >
                    {portfolio.worstMarket.marketDisplayName}
                  </Link>
                  <p className="mt-1 text-lg font-semibold text-chaos-tradeDown">
                    {portfolio.worstMarket.unrealizedPnL.toFixed(2)}
                  </p>
                </ChaotixCard>
              )}
          </div>
        </section>
      )}

      {/* Positions table: ChaotixCard overflow-x-auto, headers text-xs text-slate-500 font-medium, cells text-sm text-slate-300, View Market ghost xs */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
          Positions
        </h2>
        {portfolio.positions.length === 0 ? (
          <EmptyState
            title="No open positions"
            description="Trade markets to build your portfolio."
            ctaLabel="Start Trading"
            ctaHref="/discover"
          />
        ) : (
          <>
            {/* Mobile: position cards */}
            <div className="flex flex-col gap-4 md:hidden">
              {portfolio.positions.map((p) => (
                <ChaotixCard key={p.id} as="div" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/market/${p.marketCanonical}`}
                      className="font-medium text-slate-100 transition-colors hover:text-emerald-400"
                    >
                      {p.marketDisplayName}
                    </Link>
                    <ChaotixButton
                      href={`/market/${p.marketCanonical}`}
                      variant="ghost"
                      className="min-h-[44px] shrink-0 px-3 text-xs"
                    >
                      View
                    </ChaotixButton>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span>Shares</span>
                    <span className="font-mono text-slate-300">{p.shares.toFixed(4)}</span>
                    <span>Avg price</span>
                    <span className="font-mono text-slate-300">{p.avgPrice.toFixed(4)}</span>
                    <span>Value</span>
                    <span className="font-mono text-slate-300">{p.currentValue.toFixed(2)}</span>
                    <span>Unrealized PnL</span>
                    <span
                      className={`font-mono ${
                        p.unrealizedPnL >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"
                      }`}
                    >
                      {p.unrealizedPnL >= 0 ? "+" : ""}
                      {p.unrealizedPnL.toFixed(2)}
                    </span>
                  </div>
                </ChaotixCard>
              ))}
            </div>
            {/* Desktop: table with horizontal scroll */}
            <ChaotixCard as="div" className="hidden overflow-hidden p-0 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500">
                        Market
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Shares
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Avg price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Current
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Value
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Unrealized PnL
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/market/${p.marketCanonical}`}
                            className="text-sm text-slate-300 transition-colors hover:text-emerald-400"
                          >
                            {p.marketDisplayName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                          {p.shares.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                          {p.avgPrice.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                          {p.currentPrice.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                          {p.currentValue.toFixed(2)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono text-sm ${
                            p.unrealizedPnL >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"
                          }`}
                        >
                          {p.unrealizedPnL >= 0 ? "+" : ""}
                          {p.unrealizedPnL.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChaotixButton
                            href={`/market/${p.marketCanonical}`}
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                          >
                            View Market
                          </ChaotixButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChaotixCard>
          </>
        )}
      </section>
    </div>
  );
}
