"use client";

/**
 * Global container for all page content.
 * Prevents content from stretching on large monitors and adds responsive padding.
 */
export function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 lg:px-12">
      {children}
    </div>
  );
}
