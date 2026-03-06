import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-nextauth";
import { getSession } from "@/lib/auth";
import { WalletContent } from "./WalletContent";

export default async function WalletPage() {
  const nextAuth = await auth();
  const legacy = await getSession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) redirect("/");

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[44px] items-center rounded text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        ← Home
      </Link>
      <h1 className="text-xl font-semibold tracking-tighter text-slate-100 md:text-3xl">
        Wallet
      </h1>
      <WalletContent />
    </div>
  );
}
