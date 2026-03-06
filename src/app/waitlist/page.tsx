import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WaitlistForm } from "./WaitlistForm";

export default async function WaitlistPage() {
  const user = await getSession();
  if (!user) redirect("/");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Back
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-white">Closed Beta</h1>
      <p className="mb-8 text-slate-500">
        Trading is invite-only. Join the waitlist or redeem an invite code to start trading.
      </p>
      <WaitlistForm
        waitlistStatus={user.waitlistStatus ?? "none"}
        inviteCodeUsed={user.inviteCodeUsed ?? null}
      />
    </div>
  );
}
