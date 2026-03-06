"use client";

import Link from "next/link";
import { clsx } from "clsx";

const base =
  "inline-flex h-13 min-h-[3.25rem] items-center justify-center rounded-lg px-5 text-sm font-medium outline-none transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const variants = {
  primary:
    "bg-emerald-500 text-white hover:bg-emerald-400",
  secondary:
    "border border-white/10 bg-black/40 backdrop-blur-sm text-slate-200 hover:border-emerald-500/40 hover:text-white",
  ghost: "text-slate-500 hover:bg-white/5 hover:text-white",
} as const;

type ChaotixButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  href?: string;
  className?: string;
};

export function ChaotixButton({
  variant = "primary",
  className,
  href,
  children,
  ...props
}: ChaotixButtonProps) {
  const combined = clsx(base, variants[variant], className);

  if (href != null) {
    return <Link href={href} className={combined}>{children}</Link>;
  }

  return (
    <button type="button" className={combined} {...props}>
      {children}
    </button>
  );
}
