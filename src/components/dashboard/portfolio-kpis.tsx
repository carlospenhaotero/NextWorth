import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import type { PortfolioKpis as Kpis } from "@/server/portfolio-history";

interface PortfolioKpisProps {
  kpis: Kpis;
}

/**
 * Fixed KPI row for the overview: total invested plus the realized moves for
 * today and the last 30 days. Mirrors the advisor's KpiHeader styling so both
 * dashboards read consistently.
 */
export async function PortfolioKpis({ kpis }: PortfolioKpisProps) {
  const t = await getTranslations("overview.kpi");
  const intlLocale = localeToIntl(await getLocale());
  const { baseCurrency } = kpis;

  const deltas = [
    { key: "today", value: kpis.todayChange, pct: kpis.todayChangePct },
    { key: "last30d", value: kpis.change30d, pct: kpis.change30dPct },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="glass-card">
        <p className="text-xs text-muted">{t("invested")}</p>
        <p className="mt-1 text-2xl font-bold text-white tabular-nums">
          {formatCurrency(kpis.invested, baseCurrency, intlLocale)}
        </p>
      </div>

      {deltas.map((d) => {
        const positive = d.value >= 0;
        return (
          <div key={d.key} className="glass-card">
            <p className="text-xs text-muted">{t(d.key)}</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                positive ? "text-success" : "text-danger"
              }`}
            >
              {positive ? "+" : ""}
              {formatCurrency(d.value, baseCurrency, intlLocale)}
              <span className="ml-1.5 text-sm text-neutral-400">
                ({formatPercent(d.pct)})
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
