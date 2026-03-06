"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { SearchBar } from "./SearchBar";
import { SearchOverlay } from "./SearchOverlay";
import { NotificationBell } from "./NotificationBell";
import { MaxContainer } from "./MaxContainer";
import { clsx } from "clsx";

const NAV_LINK = "text-sm text-gray-400 transition-colors hover:text-white";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, openAuth } = useAuthModal();
  const [dropdown, setDropdown] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const profileTriggerRef = useRef<HTMLDivElement>(null);
  const [profilePosition, setProfilePosition] = useState({ top: 0, right: 0 });

  const logout = async () => {
    setDropdown(false);
    setMenuOpen(false);
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  };

  const closeMenu = () => setMenuOpen(false);
  const closeSearch = () => setSearchOverlayOpen(false);

  const handleCreateMarketRequest = (canonical: string) => {
    router.push(`/create?string=${encodeURIComponent(canonical)}`);
  };

  // Fetch portfolio total when user is logged in (for header stats)
  useEffect(() => {
    if (!user) {
      setPortfolioValue(null);
      return;
    }
    fetch("/api/portfolio", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d != null && typeof d.totalValue === "number" ? setPortfolioValue(d.totalValue) : setPortfolioValue(null)))
      .catch(() => setPortfolioValue(null));
  }, [user?.id]);

  useLayoutEffect(() => {
    if (!dropdown || !profileTriggerRef.current) return;
    const update = () => {
      if (profileTriggerRef.current) {
        const r = profileTriggerRef.current.getBoundingClientRect();
        setProfilePosition({ top: r.bottom + 12, right: window.innerWidth - r.right });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [dropdown]);

  return (
    <header className="sticky top-0 z-50 h-14 shrink-0 overflow-visible border-b border-white/5 bg-black/80 backdrop-blur-md">
      <MaxContainer className="max-w-7xl overflow-visible">
        <div className="flex h-14 items-center justify-between gap-2 md:gap-4 overflow-visible">
          {/* Left: Logo + Nav (Trending, Newest) */}
          <div className="flex min-w-0 flex-shrink-0 items-center gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center font-semibold tracking-tighter text-chaos-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Chaotix home"
            >
              CHAOTIX
            </Link>
            <nav className="hidden items-center gap-4 md:flex" aria-label="Main navigation">
              <Link href="/discover?sort=trending" className={NAV_LINK}>
                Trending
              </Link>
              <Link href="/discover?sort=newest" className={NAV_LINK}>
                Newest
              </Link>
              <Link href="/categories" className={NAV_LINK}>
                Categories
              </Link>
            </nav>
          </div>

          {/* Center: Search (desktop only; compact, centered) */}
          <div className="hidden flex-1 items-center justify-center overflow-visible px-4 md:flex">
            <SearchBar
              user={user}
              onOpenAuth={openAuth}
              onCreateMarketRequest={handleCreateMarketRequest}
              compact
              shortcutHint=" / "
            />
          </div>

          {/* Mobile: Search icon → overlay */}
          <button
            type="button"
            onClick={() => setSearchOverlayOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Right: User section */}
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                {/* Portfolio, Cash, optional Wallet address (desktop only) */}
                <div className="hidden items-baseline gap-4 md:flex">
                  {user.walletAddress && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Wallet</p>
                      <p className="font-mono text-xs font-medium text-slate-400" title={user.walletAddress}>
                        {user.walletAddress.length > 12
                          ? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`
                          : user.walletAddress}
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Portfolio</p>
                    <p className="font-mono text-sm font-medium text-green-500">
                      {portfolioValue != null ? `$${portfolioValue.toFixed(0)}` : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Balance</p>
                    <p className="font-mono text-sm font-medium text-green-500">
                      ${user.balance.toFixed(0)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/wallet"
                  className="hidden rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:inline-block"
                >
                  Wallet
                </Link>
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center md:flex">
                  <NotificationBell />
                </div>
                <div className="relative" ref={profileTriggerRef}>
                  <button
                    type="button"
                    onClick={() => setDropdown((d) => !d)}
                    className="flex h-9 items-center gap-1 rounded-full border border-white/10 bg-slate-800 pl-1 pr-2 transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-expanded={dropdown}
                    aria-haspopup="true"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold leading-none text-white">
                      {(user.name ?? user.username ?? user.email ?? "?")[0].toUpperCase()}
                    </span>
                    <ChevronDown className={clsx("h-4 w-4 text-gray-400 transition-transform", dropdown && "rotate-180")} strokeWidth={2} />
                  </button>
                  {dropdown &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div data-header-dropdown-root>
                        <div
                          className="fixed inset-0 z-[90] bg-transparent"
                          onClick={() => setDropdown(false)}
                          aria-hidden
                        />
                        <div
                          className="fixed z-[100] flex max-h-[400px] w-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1A] shadow-2xl"
                          style={{
                            top: profilePosition.top,
                            right: profilePosition.right,
                            left: "auto",
                          }}
                        >
                          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                            <div className="flex items-center gap-3 pb-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-lg font-semibold text-white">
                                {(user.name ?? user.username ?? user.email ?? "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">
                                  @{user.username ?? "user"}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {user.email ?? "No email"}
                                </p>
                                <p className="mt-0.5 font-mono text-xs leading-none text-emerald-400">
                                  {user.balance.toFixed(0)} balance
                                </p>
                              </div>
                            </div>
                            <div className="h-px bg-white/10" />
                            <nav className="py-3" aria-label="App navigation">
                              <Link href="/leaderboard" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Leaderboard</Link>
                              <Link href="/competitions" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Competitions</Link>
                              <Link href="/governance/proposals" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Market Proposals</Link>
                              {user.isAdmin && (
                                <Link href="/create" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Create Market</Link>
                              )}
                              <Link href="/docs" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>APIs</Link>
                              <Link href="/wallet" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Wallet</Link>
                              <Link href="/portfolio" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Portfolio</Link>
                              {user.isAdmin && (
                                <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white" onClick={() => setDropdown(false)}>Admin</Link>
                              )}
                            </nav>
                            <div className="h-px bg-white/10" />
                            <div className="flex gap-4 py-3">
                              <Link href="/terms" className="text-xs text-slate-500 transition-colors hover:text-emerald-400" onClick={() => setDropdown(false)}>Terms</Link>
                              <Link href="/privacy" className="text-xs text-slate-500 transition-colors hover:text-emerald-400" onClick={() => setDropdown(false)}>Privacy</Link>
                            </div>
                            <div className="h-px bg-white/10" />
                            <button type="button" onClick={logout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10">
                              Log out
                            </button>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50 text-gray-400 outline-none transition hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("LOGIN")}
                className="rounded-lg bg-chaos-emerald px-4 py-2 text-sm font-semibold text-black transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </MaxContainer>

      <SearchOverlay
        open={searchOverlayOpen}
        onClose={closeSearch}
        user={user}
        onOpenAuth={openAuth}
        onCreateMarketRequest={handleCreateMarketRequest}
      />

      {menuOpen && user && (
          <>
            <div
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md md:hidden"
              onClick={closeMenu}
              aria-hidden
            />
            <aside
              className="fixed right-0 top-0 z-[160] flex h-full w-[min(320px,85vw)] flex-col border-l border-white/10 bg-[#0B0F1A] shadow-2xl md:hidden"
              role="dialog"
              aria-label="Navigation menu"
            >
              <div className="flex h-14 items-center justify-between border-b border-white/5 px-4 md:h-16">
                <span className="font-semibold text-slate-100">Menu</span>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="App navigation">
                <Link href="/" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Home</Link>
                <Link href="/discover" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Discover</Link>
                <Link href="/categories" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Categories</Link>
                <Link href="/leaderboard" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Leaderboard</Link>
                <Link href="/competitions" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Competitions</Link>
                <Link href="/governance/proposals" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Market Proposals</Link>
                {user?.isAdmin && (
                  <Link href="/create" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Create Market</Link>
                )}
                <Link href="/wallet" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Wallet</Link>
                <Link href="/portfolio" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Portfolio</Link>
                <Link href="/create" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Create Market</Link>
                <Link href="/profile" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Profile</Link>
                <Link href="/docs" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">APIs</Link>
                {user?.isAdmin && (
                  <Link href="/admin" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:bg-white/5 hover:text-white">Admin</Link>
                )}
                <div className="my-2 h-px bg-white/5" />
                <button type="button" onClick={() => { closeMenu(); logout(); }} className="flex min-h-11 items-center rounded-lg px-4 text-left text-sm text-red-400 hover:bg-red-500/10">
                  Log out
                </button>
              </nav>
              <div className="shrink-0 border-t border-white/5 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-white">
                    {(user?.name ?? user?.username ?? user?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-100">@{user?.username ?? "user"}</p>
                    <p className="font-mono text-sm text-emerald-400">{user?.balance.toFixed(0)} balance</p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
    </header>
  );
}
