"use client";

import { forwardRef } from "react";
import { clsx } from "clsx";
import { IconWrapper } from "./IconWrapper";

const hStandard = "h-13"; // 52px – global standard for inputs and primary buttons

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Left icon (e.g. Search, Lock). Rendered inside IconWrapper. */
  leftIcon?: React.ReactNode;
  /** Right slot (e.g. nested button, ⌘K). Use for Polymarket-style nested actions. */
  rightSlot?: React.ReactNode;
  containerClassName?: string;
};

/**
 * Atomic input: h-standard (52px), border white/10, focus border-emerald + ring.
 * Parent uses flex items-center; icon/text share same baseline.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightSlot, containerClassName, className, ...props }, ref) => {
    return (
      <div
        className={clsx(
          "flex items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow]",
          "focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20",
          "overflow-hidden",
          hStandard,
          containerClassName
        )}
      >
        {leftIcon != null && (
          <div className="flex h-full shrink-0 items-center justify-center pl-4">
            <IconWrapper className="text-slate-500">{leftIcon}</IconWrapper>
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            "min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500",
            "h-full py-0",
            leftIcon ? "pl-3" : "pl-4",
            !rightSlot && "pr-4",
            className
          )}
          {...props}
        />
        {rightSlot != null && (
          <div className="flex h-full shrink-0 items-center pr-1">{rightSlot}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { hStandard };
