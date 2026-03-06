"use client";

import { clsx } from "clsx";

type ChaotixCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
};

/**
 * Aether Premium Card: p-10 min, deep surface, subtle border, hover lift.
 * Use site-wide for consistent sections.
 */
export function ChaotixCard({
  children,
  className,
  as: Component = "div",
}: ChaotixCardProps) {
  return (
    <Component
      className={clsx(
        "rounded-2xl border border-white/5 bg-slate-900/40 p-10 transition-all",
        "hover:border-emerald-500/20",
        "focus-within:border-emerald-500/20",
        className
      )}
    >
      {children}
    </Component>
  );
}
