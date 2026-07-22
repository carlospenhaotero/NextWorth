import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { cn, formatPercent } from "@/lib/utils";

/**
 * One labelled price variation (e.g. today / 7d) with an up/down arrow and a
 * color-coded percentage. Shared by the add-asset catalog grid and the
 * portfolio asset list so both read the same way.
 * - loading: shows a shimmer placeholder while the quote is in flight.
 * - pct null/undefined: shows an em dash (variation not derivable).
 */
export function VarPill({
  label,
  pct,
  loading,
}: {
  label: string;
  pct: number | null | undefined;
  loading: boolean;
}) {
  const up = (pct ?? 0) >= 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-neutral-500">{label}</span>
      {loading ? (
        <span className="inline-block h-3 w-10 animate-pulse rounded bg-neutral-800" />
      ) : pct == null ? (
        <span className="text-neutral-600">—</span>
      ) : (
        <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-danger")}>
          {up ? <TrendUp size={11} /> : <TrendDown size={11} />}
          {formatPercent(pct)}
        </span>
      )}
    </span>
  );
}
