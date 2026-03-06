"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const fetchNotifications = () => {
    setLoading(true);
    fetch("/api/notifications?limit=20")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPosition({ top: r.bottom + 12, right: window.innerWidth - r.right });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const markRead = (ids: string[]) => {
    if (ids.length === 0) return;
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then(() => {
      setUnreadCount((c) => Math.max(0, c - ids.length));
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: new Date() } : n))
      );
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications();
        }}
        className="relative rounded-lg border border-white/10 bg-slate-900/40 p-2 text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-xs font-medium text-white" title="Unread notifications">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[100] flex max-h-[400px] w-80 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 shadow-xl md:w-[360px] md:rounded-2xl md:bg-[#0B0F1A] md:shadow-2xl"
            style={{ top: position.top, right: position.right, left: "auto" }}
          >
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/40 px-3 py-2 md:rounded-t-2xl md:bg-[#0B0F1A] md:px-4 md:py-3">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  fetch("/api/notifications/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ all: true }),
                  }).then(() => {
                    setUnreadCount(0);
                    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
                  });
                }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <li key={n.id} className={n.readAt ? "opacity-75" : ""}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="block px-3 py-2 text-left hover:bg-white/5"
                        onClick={() => {
                          if (!n.readAt) markRead([n.id]);
                          setOpen(false);
                        }}
                      >
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                      </Link>
                    ) : (
                      <div
                        className="block cursor-pointer px-3 py-2 hover:bg-white/5"
                        onClick={() => !n.readAt && markRead([n.id])}
                      >
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
