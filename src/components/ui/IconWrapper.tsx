"use client";

import { clsx } from "clsx";

/**
 * Perfect alignment: every icon (Search, Lock, User, Bell) uses the same
 * 24×24px center so baselines match across the app.
 * Use strokeWidth={1.5} on Lucide icons inside for consistency.
 */
export function IconWrapper({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:[stroke-width:1.5]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
