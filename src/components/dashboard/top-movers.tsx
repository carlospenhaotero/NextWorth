import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
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

// Assets without a tradable price history don't have an AI forecast either.
function canShowForecast(assetType: string) {
  return !["cash", "savings", "bond"].includes(assetType);
}

export function TopMovers({ movers, baseCurrency, periodLabel }: TopMoversProps) {
  const t = useTranslations("topMovers");
  const intlLocale = localeToIntl(useLocale());
  const router = useRouter();
  return (
    <div>
      <SectionHeader title={t("title")} hint={periodLabel} />
      {movers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {movers.map((m) => {
            const up = m.pnlPct >= 0;
            const forecastable = canShowForecast(m.assetType);
            return (
              <div
                key={m.id}
                role={forecastable ? "button" : undefined}
                tabIndex={forecastable ? 0 : undefined}
                onClick={
                  forecastable
                    ? () => router.push(`/assets/${encodeURIComponent(m.symbol)}`)
                    : undefined
                }
                onKeyDown={
                  forecastable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/assets/${encodeURIComponent(m.symbol)}`);
                        }
                      }
                    : undefined
                }
                className={`flex flex-col gap-3 p-4 bg-neutral-800/30 rounded-xl transition-colors border border-neutral-800/50 ${
                  forecastable
                    ? "cursor-pointer hover:bg-neutral-800/50 outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 min-w-0">
                  <AssetLogo
                    symbol={m.symbol}
                    assetType={m.assetType}
                    name={m.name}
                    fallbackLabel={m.symbol.substring(0, 3)}
                    className="w-10 h-10 rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white leading-tight truncate">{m.name}</p>
                    <p className="text-xs text-muted truncate">{m.symbol}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-end justify-between gap-3 pt-3 border-t border-neutral-800/50">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{t("value")}</p>
                    <p className="font-semibold text-white truncate">
                      {formatCurrency(m.value, baseCurrency, intlLocale)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold leading-tight ${up ? "text-success" : "text-danger"}`}>
                      {formatPercent(m.pnlPct)}
                    </p>
                    <p className={`text-xs ${up ? "text-success/70" : "text-danger/70"}`}>
                      {formatCurrency(m.pnl, baseCurrency, intlLocale)}
                    </p>
                  </div>
                </div>

                {/* Forecast CTA — reserved on every card so heights stay uniform */}
                <div className="flex min-h-5 items-center gap-1 text-xs text-accent-hover">
                  {forecastable && (
                    <>
                      <Sparkle size={12} weight="fill" />
                      {t("viewForecast")}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted text-sm">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
