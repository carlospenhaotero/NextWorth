import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "neutral" | "accent" | "success" | "danger";

const variants: Record<Variant, string> = {
  neutral: "bg-neutral-800 text-neutral-300",
  accent: "bg-accent-soft text-accent-hover",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
