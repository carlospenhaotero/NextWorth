import * as React from "react";

import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export interface PillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: Size;
}

/**
 * Single toggle pill — the one control behind every filter chip, chart
 * range selector, prediction-horizon and segmented button in the app.
 * Active = accent fill; idle = neutral surface with a hover.
 */
export const Pill = React.forwardRef<HTMLButtonElement, PillProps>(
  ({ className, active, size = "sm", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        "rounded-lg font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        active
          ? "bg-accent text-accent-foreground shadow-sm shadow-accent/25"
          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
        className,
      )}
      {...props}
    />
  ),
);
Pill.displayName = "Pill";
