import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateAssetForm } from "./CreateAssetForm";

export const metadata = {
  title: "List asset · Marketplace · Chaotix",
  description: "Create a tradable asset for the marketplace.",
};

export default async function CreateAssetPage() {
  const user = await getSession();
  if (!user) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">List an asset</h1>
      <p className="mt-1 text-sm text-slate-400">
        Create a universal tradable item (player, collectible, service, etc.). Others can place bids and asks.
      </p>
      <CreateAssetForm />
    </div>
  );
}
