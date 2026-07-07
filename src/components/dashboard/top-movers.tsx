import { useTranslations, useLocale } from "next-intl";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import { AssetLogo } from "@/components/shared/asset-logo";
import { SectionHeader } from "@/components/ui/section-header";
import type { PortfolioMover } from "@/server/portfolio-history";

interface TopMoversProps {
  movers: PortfolioMover[];
  baseCurrency: string;
  periodLabel: string;
}

export function TopMovers({ movers, baseCurrency, periodLabel }: TopMoversProps) {
  const t = useTranslations("topMovers");
  const intlLocale = localeToIntl(useLocale());
  return (
    <div>
      <SectionHeader title={t("title")} hint={periodLabel} />
      {movers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {movers.map((m) => {
            const up = m.pnlPct >= 0;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-3 bg-neutral-800/30 hover:bg-neutral-800/50 rounded-xl transition-colors border border-neutral-800/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AssetLogo
                    symbol={m.symbol}
                    assetType={m.assetType}
                    name={m.name}
                    fallbackLabel={m.symbol.substring(0, 3)}
                    className="w-9 h-9 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white leading-tight">{m.name}</p>
                    <p className="text-xs text-neutral-500">
                      {m.symbol} · {formatCurrency(m.value, baseCurrency, intlLocale)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold ${up ? "text-green-400" : "text-red-400"}`}>
                    {formatPercent(m.pnlPct)}
                  </div>
                  <div className={`text-xs ${up ? "text-green-500/70" : "text-red-500/70"}`}>
                    {formatCurrency(m.pnl, baseCurrency, intlLocale)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-neutral-500 text-sm">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
