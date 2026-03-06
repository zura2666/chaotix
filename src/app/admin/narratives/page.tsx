import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { NarrativeManagementView } from "./NarrativeManagementView";

export default async function AdminNarrativesPage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");

  const coreMarkets = await prisma.market.findMany({
    where: { isCoreMarket: true },
    select: {
      id: true,
      canonical: true,
      displayName: true,
      status: true,
      volume: true,
      tradeCount: true,
      createdAt: true,
    },
    orderBy: { canonical: "asc" },
  });

  const allActive = await prisma.market.findMany({
    where: { status: "active" },
    select: { id: true, canonical: true, displayName: true, isCoreMarket: true },
    orderBy: { volume: "desc" },
    take: 500,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Admin
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-white">Narrative Management</h1>
      <p className="mb-8 text-sm text-slate-500">
        Curated narrative markets. Create new narratives, retire markets, or{" "}
        <Link href="/admin/market-merge" className="underline text-emerald-400 hover:text-emerald-300">
          merge duplicates
        </Link>.
      </p>
      <NarrativeManagementView
        coreMarkets={coreMarkets.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        allMarkets={allActive}
      />
    </div>
  );
}
