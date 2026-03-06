import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getAsset } from "@/lib/marketplace";
import { recordAssetView } from "@/lib/marketplace-demand";
import { TradingView } from "./TradingView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) return { title: "Asset · Marketplace" };
  return {
    title: `${asset.title} · Marketplace · Chaotix`,
    description: asset.description ?? `Trade ${asset.title}. Order-book price discovery.`,
  };
}

export default async function AssetTradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; from?: string }>;
}) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) notFound();

  const user = await getSession();
  const sp = await searchParams;
  recordAssetView(id, user?.id).catch(() => {});
  if (sp.from === "search" && sp.q) {
    const { recordAssetSearch } = await import("@/lib/marketplace-demand");
    recordAssetSearch(id, user?.id, sp.q).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Marketplace
      </Link>
      <TradingView asset={asset} />
    </div>
  );
}
