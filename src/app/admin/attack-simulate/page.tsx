import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AttackSimulateDashboard } from "./AttackSimulateDashboard";

export default async function AdminAttackSimulatePage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Attack simulation</h1>
      <AttackSimulateDashboard />
    </div>
  );
}
