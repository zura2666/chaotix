import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TreasuryDashboard } from "./TreasuryDashboard";

export default async function AdminTreasuryPage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Platform Treasury</h1>
      <TreasuryDashboard />
    </div>
  );
}
