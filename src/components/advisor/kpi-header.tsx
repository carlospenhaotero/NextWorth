import { formatCurrency, formatPercent } from "@/lib/utils";
import type { RiskBand } from "@/server/advisor/metrics";

const BAND_LABELS: Record<RiskBand, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  balanced: "Balanced",
  growth: "Growth",
  aggressive: "Aggressive",
};

interface KpiHeaderProps {
  totalValue: number;
  totalProfitLoss: number;
  profitLossPct: number | null;
  baseCurrency: string;
  riskScore: number;
  riskBand: RiskBand;
}

export function KpiHeader({
  totalValue,
  totalProfitLoss,
  profitLossPct,
  baseCurrency,
  riskScore,
  riskBand,
}: KpiHeaderProps) {
  const positive = totalProfitLoss >= 0;

  return (
    <div className="glass-card shrink-0 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs text-neutral-500">Net worth</p>
        <p className="text-2xl font-bold text-white tabular-nums">
          {formatCurrency(totalValue, baseCurrency)}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">Total P/L</p>
        <p
          className={`text-lg font-semibold tabular-nums ${
            positive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {positive ? "+" : ""}
          {formatCurrency(totalProfitLoss, baseCurrency)}
          {profitLossPct != null && (
            <span className="text-sm ml-1.5 text-neutral-400">
              ({formatPercent(profitLossPct)})
            </span>
          )}
        </p>
      </div>

      <div className="min-w-[160px]">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">Risk profile</p>
          <p className="text-xs text-neutral-300">
            {BAND_LABELS[riskBand]} · {riskScore}
          </p>
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-neutral-200"
            style={{ width: `${Math.max(0, Math.min(100, riskScore))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
