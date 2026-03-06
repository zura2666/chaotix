import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminReferralsPage } from "./AdminReferralsPage";

export default async function AdminReferralsPageWrapper() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-semibold tracking-tighter text-white text-2xl">
        Partner referrals
      </h1>
      <AdminReferralsPage />
    </div>
  );
}
