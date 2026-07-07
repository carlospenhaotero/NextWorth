import * as React from "react";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Optional secondary line (e.g. a % delta). */
  sub?: React.ReactNode;
  /** Tone of the value text. */
  tone?: "default" | "accent" | "success" | "danger";
  className?: string;
}

const tones = {
  default: "text-white",
  accent: "text-accent-hover",
  success: "text-success",
  danger: "text-danger",
} as const;

/**
 * Compact metric tile. Replaces the repeated `glass-card !p-4` +
 * `text-xs text-neutral-500` label + `text-lg font-bold` value pattern.
 */
export function StatCard({ label, value, sub, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 backdrop-blur-sm",
        "transition-colors hover:border-border-strong",
        className,
      )}
    >
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tracking-tight", tones[tone])}>{value}</p>
      {sub != null && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}
