import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Small muted text on the right (e.g. a period label). */
  hint?: React.ReactNode;
  /** Right-aligned actions (buttons, toggles). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent header for a card/section: title on the left, an optional
 * muted hint or actions on the right. Replaces the ad-hoc `<h3>` + span
 * markup scattered across the dashboard.
 */
export function SectionHeader({ title, hint, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
        {hint != null && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {actions != null && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
