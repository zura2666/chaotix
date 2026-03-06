import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { getUnreadManipulationAlerts } from "@/lib/manipulation";

export default async function AdminManipulationPage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");

  const alerts = await getUnreadManipulationAlerts(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Admin
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-white">Manipulation alerts</h1>
      {alerts.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-slate-500">
          No unread alerts.
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-white/10 bg-slate-900/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-400">{a.type}</span>
                <span className="text-sm text-slate-500">{a.severity}</span>
              </div>
              <p className="mt-2 text-white">{a.message}</p>
              {a.resourceId && (
                <p className="mt-1 text-sm text-slate-500">
                  {a.resource}: {a.resourceId}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
