"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls handler when a click occurs outside the ref element.
 * Used for Auth Modal overlay and any dropdown/popover.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  enabled = true
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [handler, enabled]);

  return ref;
}
