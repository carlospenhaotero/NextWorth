import { getTranslations } from "next-intl/server";
import type { AllocationSlice } from "@/server/advisor/metrics";

// Muted categorical palette (desaturated, reads well on dark, not neon).
const PALETTE = [
  "#8b93f8", // soft indigo
  "#5eb0a8", // muted teal
  "#c9a24b", // muted gold
  "#b07cc6", // muted violet
  "#7fa86b", // muted green
  "#d98b7a", // muted terracotta
  "#7f9cb5", // muted steel blue
  "#b0a08f", // muted taupe
];

// Fixed, meaningful color per asset class so they stay recognizable.
const ASSET_COLORS: Record<string, string> = {
  stock: "#8b93f8", // indigo
  etf: "#5eb0a8", // teal
  fund: "#79a8c4", // muted blue
  crypto: "#b07cc6", // violet
  commodity: "#c9a24b", // gold
  bond: "#7fa86b", // green
  cash: "#9aa3ad", // slate
  savings: "#7fa391", // gray-green
  currency: "#9aa3ad",
};

interface Dimension {
  title: string;
  slices: AllocationSlice[];
  /** When true, colors come from the fixed asset-class map keyed by slice.key. */
  byAssetClass?: boolean;
}

function colorFor(
  slice: AllocationSlice,
  index: number,
  byAssetClass: boolean
): string {
  if (byAssetClass) return ASSET_COLORS[slice.key] ?? PALETTE[index % PALETTE.length];
  return PALETTE[index % PALETTE.length];
}

function StackedRow({ title, slices, byAssetClass = false }: Dimension) {
  const data = [...slices].filter((s) => s.pct > 0);
  // Legend shows the most relevant segments; the bar shows everything.
  const legend = data.slice(0, 5);
  const hiddenCount = data.length - legend.length;

  return (
    <div>
      <p className="text-sm text-neutral-300 mb-1.5">{title}</p>
      <div className="h-3 w-full flex rounded-full overflow-hidden bg-neutral-800">
        {data.map((s, i) => (
          <div
            key={s.key}
            style={{ width: `${s.pct}%`, backgroundColor: colorFor(s, i, byAssetClass) }}
            title={`${s.label} ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {legend.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: colorFor(s, i, byAssetClass) }}
            />
            <span className="text-neutral-400">{s.label}</span>
            <span className="text-neutral-500 tabular-nums">{s.pct.toFixed(0)}%</span>
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="text-xs text-neutral-500">+{hiddenCount}</span>
        )}
      </div>
    </div>
  );
}

interface StackedAllocationProps {
  dimensions: Dimension[];
}

export async function StackedAllocation({ dimensions }: StackedAllocationProps) {
  const t = await getTranslations("allocation");
  return (
    <div className="glass-card shrink-0 space-y-4">
      <h3 className="text-neutral-400 font-medium">{t("title")}</h3>
      {dimensions.map((d) => (
        <StackedRow
          key={d.title}
          title={d.title}
          slices={d.slices}
          byAssetClass={d.byAssetClass}
        />
      ))}
    </div>
  );
}
