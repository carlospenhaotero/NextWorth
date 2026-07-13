import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import type { RiskBand } from "@/server/advisor/metrics";

// Risk meter color scale — low risk (green) through high risk (red).
// This is a dedicated risk semantic, distinct from P/L green/red.
const RISK_BAR: Record<RiskBand, string> = {
  conservative: "bg-emerald-400",
  moderate: "bg-teal-400",
  balanced: "bg-accent",
  growth: "bg-amber-400",
  aggressive: "bg-red-400",
};

interface KpiHeaderProps {
  totalValue: number;
  totalProfitLoss: number;
  profitLossPct: number | null;
  baseCurrency: string;
  riskScore: number;
  riskBand: RiskBand;
}

export async function KpiHeader({
  totalValue,
  totalProfitLoss,
  profitLossPct,
  baseCurrency,
  riskScore,
  riskBand,
}: KpiHeaderProps) {
  const t = await getTranslations("advisor.kpi");
  const intlLocale = localeToIntl(await getLocale());
  const positive = totalProfitLoss >= 0;

  return (
    <div className="glass-card shrink-0 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs text-neutral-500">
          <GlossaryTerm termId="netWorth">{t("netWorth")}</GlossaryTerm>
        </p>
        <p className="text-2xl font-bold text-white tabular-nums">
          {formatCurrency(totalValue, baseCurrency, intlLocale)}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">{t("totalPL")}</p>
        <p
          className={`text-lg font-semibold tabular-nums ${
            positive ? "text-success" : "text-danger"
          }`}
        >
          {positive ? "+" : ""}
          {formatCurrency(totalProfitLoss, baseCurrency, intlLocale)}
          {profitLossPct != null && (
            <span className="text-sm ml-1.5 text-neutral-400">
              ({formatPercent(profitLossPct)})
            </span>
          )}
        </p>
      </div>

      <div className="min-w-[160px]">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            <GlossaryTerm termId="riskProfile">{t("riskProfile")}</GlossaryTerm>
          </p>
          <p className="text-xs text-neutral-300">
            {t(`bands.${riskBand}`)} · {riskScore}
          </p>
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${RISK_BAR[riskBand]}`}
            style={{ width: `${Math.max(0, Math.min(100, riskScore))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
