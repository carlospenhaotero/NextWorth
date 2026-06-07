"use client";

import { useMemo } from "react";
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
import type { PortfolioHistoryData, PortfolioRange } from "@/server/portfolio-history";

const RANGE_OPTIONS: { value: PortfolioRange; label: string }[] = [
  { value: "1w", label: "1S" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1A" },
  { value: "all", label: "Todo" },
];

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
  const baseCurrency = data.baseCurrency;
  const isProfit = data.profitLoss >= 0;
  const accent = isProfit ? "#4ade80" : "#f87171";

  const chartData = useMemo(() => {
    const longSpan = range === "1y" || range === "all";
    return data.series.map((p) => {
      const d = new Date(p.date);
      return {
        label: longSpan
          ? d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
          : d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        value: p.value,
        invested: p.invested,
      };
    });
  }, [data.series, range]);

  const hasData = chartData.length > 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-neutral-400 font-medium mb-1">Patrimonio</h3>
          <div className="text-4xl font-bold text-white tracking-tight mb-2">
            {formatCurrency(data.currentValue, baseCurrency)}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                isProfit ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {isProfit ? <TrendUp size={14} /> : <TrendDown size={14} />}
              {formatCurrency(data.profitLoss, baseCurrency)}
            </span>
            <span className={`text-sm font-medium ${isProfit ? "text-green-400" : "text-red-400"}`}>
              {formatPercent(data.profitLossPct)}
            </span>
            <span className="text-neutral-500 text-sm">{periodLabel}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRangeChange(opt.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                range === opt.value
                  ? "bg-primary text-neutral-900"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {opt.label}
            </button>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="label"
                stroke="#525252"
                tick={{ fill: "#737373", fontSize: 11 }}
                minTickGap={32}
              />
              <YAxis
                stroke="#525252"
                tick={{ fill: "#737373", fontSize: 11 }}
                domain={["auto", "auto"]}
                width={64}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("es-ES", { notation: "compact" }).format(Number(v))
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#262626",
                  borderColor: "#404040",
                  color: "#fafafa",
                  borderRadius: "0.75rem",
                }}
                formatter={(value, name) => [
                  formatCurrency(Number(value), baseCurrency),
                  name === "value" ? "Valor" : "Invertido",
                ]}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="#737373"
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
            Añade tu primer activo para ver la evolución de tu patrimonio
          </div>
        )}
      </div>
    </div>
  );
}
