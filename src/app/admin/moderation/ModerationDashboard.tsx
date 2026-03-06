"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type QueueItem = {
  id: string;
  marketId: string;
  reason: string;
  status: string;
  createdAt: string;
  market: { id: string; canonical: string; displayName: string };
};

export function ModerationDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState("pending");

  const load = () => {
    fetch(`/api/admin/moderation?status=${status}`)
      .then((r) => r.json())
      .then((d) => setQueue(d.queue ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [status]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/admin/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-chaos-muted hover:text-chaos-neon">← Admin</Link>
      <div className="flex gap-2">
        {["pending", "reviewed", "approved", "removed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1 text-sm ${status === s ? "border-chaos-neon text-chaos-neon" : "border-chaos-border text-chaos-muted hover:border-chaos-neon/50"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="overflow-auto rounded-xl border border-chaos-border bg-chaos-card">
        {queue.length === 0 ? (
          <p className="p-4 text-chaos-muted">No items</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chaos-border text-left text-chaos-muted">
                <th className="p-2">Market</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created</th>
                {status === "pending" && <th className="p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-b border-chaos-border/50">
                  <td className="p-2">
                    <Link href={`/market/${item.market.canonical}`} className="text-chaos-neon hover:underline">
                      {item.market.displayName}
                    </Link>
                  </td>
                  <td className="p-2">{item.reason}</td>
                  <td className="p-2">{item.status}</td>
                  <td className="p-2 text-chaos-muted">{new Date(item.createdAt).toLocaleString()}</td>
                  {status === "pending" && (
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => updateStatus(item.id, "approved")}
                        className="text-green-400 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, "removed")}
                        className="text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
