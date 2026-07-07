import * as React from "react";

import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-xl bg-neutral-900/50 border border-neutral-700 text-neutral-100 text-sm " +
  "placeholder:text-neutral-500 transition-colors outline-none " +
  "focus:border-accent focus:ring-2 focus:ring-accent-ring " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/40";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon (rendered inside the field). */
  icon?: React.ReactNode;
  /** Optional trailing adornment (e.g. a show-password toggle). */
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, ...props }, ref) => {
    if (!icon && !trailing) {
      return (
        <input ref={ref} className={cn(inputBase, "px-4 py-3", className)} {...props} />
      );
    }
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            inputBase,
            "py-3",
            icon ? "pl-11" : "pl-4",
            trailing ? "pr-11" : "pr-4",
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {trailing}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
