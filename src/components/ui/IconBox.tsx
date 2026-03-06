"use client";

/**
 * Wraps a Lucide (or any) icon in a fixed-size flex container for pixel-perfect centering.
 * Use for consistent 20x20 or 24x24 icon alignment across the site (Linear/Polymarket style).
 */
export function IconBox({
  size = 24,
  className = "",
  children,
}: {
  size?: 20 | 24;
  className?: string;
  children: React.ReactNode;
}) {
  const dim = size === 20 ? "h-5 w-5" : "h-6 w-6";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${dim} ${className}`.trim()}>
      {children}
    </span>
  );
}
