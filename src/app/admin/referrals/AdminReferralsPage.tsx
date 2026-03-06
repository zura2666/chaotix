"use client";

import { useState, useEffect } from "react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

type Application = {
  id: string;
  twitterHandle: string | null;
  discordHandle: string | null;
  telegramHandle: string | null;
  pitch: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    username: string | null;
    referralCode: string;
    referralStatus: string;
  };
};

export function AdminReferralsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchApplications = () => {
    fetch("/api/admin/referrals", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = (applicationId: string) => {
    setActing(applicationId);
    fetch("/api/admin/referrals/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ applicationId }),
    })
      .then((r) => r.json())
      .then(() => {
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      })
      .finally(() => setActing(null));
  };

  const handleReject = (applicationId: string) => {
    setActing(applicationId);
    fetch("/api/admin/referrals/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ applicationId }),
    })
      .then((r) => r.json())
      .then(() => {
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      })
      .finally(() => setActing(null));
  };

  if (loading) {
    return (
      <div className="text-slate-500">Loading referral applications…</div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold tracking-tighter text-white text-xl">
        Referral applications
      </h2>
      {applications.length === 0 ? (
        <ChaotixCard as="div" className="p-10">
          <p className="text-slate-500">No pending applications.</p>
        </ChaotixCard>
      ) : (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id}>
              <ChaotixCard as="div" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">
                      {app.user.name ?? app.user.username ?? app.user.email ?? app.user.id}
                    </p>
                    <p className="text-sm text-slate-500">
                      {app.user.email} · @{app.user.username ?? "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      {app.twitterHandle && (
                        <span className="rounded-lg border border-white/10 bg-slate-800/50 px-2 py-1 text-slate-300">
                          Twitter: {app.twitterHandle}
                        </span>
                      )}
                      {app.discordHandle && (
                        <span className="rounded-lg border border-white/10 bg-slate-800/50 px-2 py-1 text-slate-300">
                          Discord: {app.discordHandle}
                        </span>
                      )}
                      {app.telegramHandle && (
                        <span className="rounded-lg border border-white/10 bg-slate-800/50 px-2 py-1 text-slate-300">
                          Telegram: {app.telegramHandle}
                        </span>
                      )}
                    </div>
                    {app.pitch && (
                      <div className="mt-3 rounded-lg border border-white/5 bg-slate-900/40 p-3">
                        <p className="text-xs font-medium text-slate-500">Pitch</p>
                        <p className="mt-1 text-sm text-slate-300">{app.pitch}</p>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Applied {new Date(app.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(app.id)}
                      disabled={acting === app.id}
                      className="h-12 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white transition-all hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {acting === app.id ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(app.id)}
                      disabled={acting === app.id}
                      className="h-12 rounded-xl border border-white/10 px-4 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </ChaotixCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
