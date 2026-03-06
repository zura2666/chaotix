import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { CreatorDashboard } from "./CreatorDashboard";

export default async function CreatorDashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/marketplace" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Creator dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Sales, demand, and price performance for your assets.
      </p>
      <CreatorDashboard />
    </div>
  );
}
