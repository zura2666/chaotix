"use client";

import Link from "next/link";
import { MaxContainer } from "./MaxContainer";

const BRAND_GREEN = "text-chaos-emerald";
const LINK_MUTED = "text-gray-500";
const HEADING = "text-slate-300";
const HOVER = "hover:text-chaos-emerald transition-colors";

const platformLinks = [
  { label: "Categories", href: "/categories" },
  { label: "Trending", href: "/discover?sort=trending" },
  { label: "Newest", href: "/discover?sort=newest" },
  { label: "Leaderboards", href: "/leaderboard" },
  { label: "Competitions", href: "/competitions" },
  { label: "Market Proposals", href: "/governance/proposals" },
  { label: "Narrative Index", href: "/index" },
  { label: "Analytics", href: "/analytics" },
  { label: "Marketplace", href: "/marketplace" },
];

const supportLinks = [
  { label: "Documentation", href: "/docs", external: false },
  { label: "Twitter", href: "https://twitter.com", external: true },
  { label: "Discord", href: "https://discord.gg", external: true },
];

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto border-t border-white/10 bg-black/80 py-10 backdrop-blur-md"
      role="contentinfo"
    >
      <MaxContainer>
        <div className="grid grid-cols-2 gap-8 py-8 sm:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-block">
              <span className={`text-lg font-bold tracking-tight ${BRAND_GREEN}`}>
                CHAOTIX
              </span>
            </Link>
            <p className="mt-2 max-w-[240px] text-xs text-gray-500">
              Trade strings. One canonical market per idea.
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${HEADING}`}>
              Platform
            </h3>
            <ul className="space-y-2">
              {platformLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={`text-xs ${LINK_MUTED} ${HOVER}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${HEADING}`}>
              Support
            </h3>
            <ul className="space-y-2">
              {supportLinks.map(({ label, href, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs ${LINK_MUTED} ${HOVER}`}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className={`text-xs ${LINK_MUTED} ${HOVER}`}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${HEADING}`}>
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={`text-xs ${LINK_MUTED} ${HOVER}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <span className="text-xs text-gray-500">© 2026 Chaotix</span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>System Status: Operational</span>
          </div>
        </div>
      </MaxContainer>
    </footer>
  );
}
