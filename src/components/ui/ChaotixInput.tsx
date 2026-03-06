"use client";

import { forwardRef } from "react";
import { clsx } from "clsx";

type ChaotixInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  containerClassName?: string;
};

export const ChaotixInput = forwardRef<HTMLInputElement, ChaotixInputProps>(
  ({ icon, containerClassName, className, ...props }, ref) => {
    return (
      <div
        className={clsx(
          "flex min-h-[52px] items-center rounded-xl border border-white/10 bg-slate-900/60 transition-[border-color] focus-within:border-[#10b981]/50",
          containerClassName
        )}
      >
        {icon != null && (
          <span className="flex h-full min-w-[52px] items-center justify-center text-slate-500 [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            "min-h-[52px] min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500",
            !icon && "pl-4",
            icon && "pl-2",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

ChaotixInput.displayName = "ChaotixInput";
