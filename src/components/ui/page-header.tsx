import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned actions (e.g. a primary CTA). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Top-of-page title block. Dashboard routes previously rendered content
 * with no heading; this gives every page a consistent anchor and hierarchy.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-display)]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-neutral-400">{subtitle}</p>}
      </div>
      {actions != null && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
