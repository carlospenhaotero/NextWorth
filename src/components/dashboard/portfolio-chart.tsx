"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendUp,
  TrendDown,
  ArrowsClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import { chartTheme } from "@/lib/chart-theme";
import { Pill } from "@/components/ui/pill";
import type { PortfolioHistoryData, PortfolioRange } from "@/server/portfolio-history";

const RANGE_VALUES: PortfolioRange[] = ["1w", "1m", "3m", "6m", "1y", "all"];

interface PortfolioChartProps {
  data: PortfolioHistoryData;
  range: PortfolioRange;
  loading: boolean;
  periodLabel: string;
  onRangeChange: (range: PortfolioRange) => void;
}

export function PortfolioChart({
  data,
  range,
  loading,
  periodLabel,
  onRangeChange,
}: PortfolioChartProps) {
  const t = useTranslations("portfolioChart");
  const intlLocale = localeToIntl(useLocale());
  const baseCurrency = data.baseCurrency;
  const isProfit = data.profitLoss >= 0;
  const accent = isProfit ? chartTheme.positive : chartTheme.negative;

  const chartData = useMemo(() => {
    const longSpan = range === "1y" || range === "all";
    return data.series.map((p) => {
      const d = new Date(p.date);
      return {
        label: longSpan
          ? d.toLocaleDateString(intlLocale, { month: "short", year: "2-digit" })
          : d.toLocaleDateString(intlLocale, { day: "numeric", month: "short" }),
        value: p.value,
        invested: p.invested,
      };
    });
  }, [data.series, range, intlLocale]);

  const hasData = chartData.length > 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-neutral-400 font-medium mb-1">{t("netWorth")}</h3>
          <div className="text-4xl font-bold text-white tracking-tight mb-2">
            {formatCurrency(data.currentValue, baseCurrency, intlLocale)}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                isProfit ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {isProfit ? <TrendUp size={14} /> : <TrendDown size={14} />}
              {formatCurrency(data.profitLoss, baseCurrency, intlLocale)}
            </span>
            <span className={`text-sm font-medium ${isProfit ? "text-green-400" : "text-red-400"}`}>
              {formatPercent(data.profitLossPct)}
            </span>
            <span className="text-neutral-500 text-sm">{periodLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_VALUES.map((value) => (
            <Pill
              key={value}
              active={range === value}
              onClick={() => onRangeChange(value)}
              disabled={loading}
            >
              {t(`range.${value}`)}
            </Pill>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1 min-h-[260px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/40 rounded-lg">
            <ArrowsClockwise className="animate-spin text-neutral-400" size={24} />
          </div>
        )}
        {hasData ? (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis
                dataKey="label"
                stroke={chartTheme.axis}
                tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                minTickGap={32}
              />
              <YAxis
                stroke={chartTheme.axis}
                tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                domain={["auto", "auto"]}
                width={64}
                tickFormatter={(v) =>
                  new Intl.NumberFormat(intlLocale, { notation: "compact" }).format(Number(v))
                }
              />
              <Tooltip
                contentStyle={chartTheme.tooltip}
                formatter={(value, name) => [
                  formatCurrency(Number(value), baseCurrency, intlLocale),
                  name === "value" ? t("tooltip.value") : t("tooltip.invested"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke={chartTheme.reference}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accent}
                fill="url(#colorNetWorth)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-500 text-sm">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
}
