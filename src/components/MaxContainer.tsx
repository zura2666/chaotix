"use client";

/**
 * Aether design system: global root container.
 * max-w-[1440px], px-6 md:px-12 lg:px-20 — content never touches the edge.
 */
export function MaxContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`max-container ${className}`.trim()}>{children}</div>;
}
