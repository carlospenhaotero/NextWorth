"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ArrowsClockwise, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import { getAllAssets } from "@/lib/assets-catalog";
import { AssetChart } from "@/components/shared/asset-chart";
import { AssetSignalPanel } from "@/components/dashboard/asset-signal";
import { AssetNewsPanel } from "@/components/dashboard/asset-news";
import { StatCard } from "@/components/ui/stat-card";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";

const HORIZON_VALUES = ["3m", "6m", "1y", "2y", "5y"] as const;

// The history window is derived from the forecast horizon (~2x) so the prediction
// always takes up about a third of the chart width instead of a thin sliver on the
// right. Capped at 120 months (the market-data API limit). Same monthly interval on
// both sides keeps the point density — and therefore the width ratio — consistent.
const HORIZON_TO_MONTHS: Record<string, number> = {
  "3m": 3,
  "6m": 6,
  "1y": 12,
  "2y": 24,
  "5y": 60,
};
const historyMonthsFor = (horizon: string) =>
  Math.min((HORIZON_TO_MONTHS[horizon] ?? 6) * 2, 120);

// The non-persisting history path only knows the symbol, so resolve a friendly
// name from the catalog for the header (falls back to the symbol when unknown).
const CATALOG_NAMES = new Map(
  getAllAssets().map((a) => [a.symbol.toUpperCase(), a.name])
);

interface SeriesPoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
}

interface HistoryData {
  symbol: string;
  name: string;
  currency: string;
  series: SeriesPoint[];
  source: string;
  warning?: string;
}

interface PredictionData {
  predictions: Array<{
    date: string;
    predicted_close: number;
    confidence_low: number | null;
    confidence_high: number | null;
  }>;
  source: string;
  modelVersion: string;
  warning: string | null;
}

interface AssetDetailViewProps {
  symbol: string;
}

export function AssetDetailView({ symbol }: AssetDetailViewProps) {
  const router = useRouter();
  const t = useTranslations("assetDetail");
  const intlLocale = localeToIntl(useLocale());
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPredictions, setShowPredictions] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState("6m");
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // persist=0 goes straight to Yahoo, which honours interval=1mo (monthly
      // candles, full history). The cached path serves whatever granularity sits
      // in asset_price_history — currently daily and only ~1y deep — which both
      // over-densifies the history and starves long horizons. Same source the
      // add-asset preview already uses.
      const res = await fetch(
        `/api/market/history/${encodeURIComponent(symbol)}?range=${historyMonthsFor(predictionHorizon)}m&interval=1mo&persist=0`
      );
      if (!res.ok) throw new Error(t("loadFailed"));
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailedShort"));
    } finally {
      setLoading(false);
    }
  }, [symbol, predictionHorizon, t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!showPredictions) return;
    const fetchPredictions = async () => {
      setPredictionLoading(true);
      try {
        const res = await fetch(
          `/api/predictions/${encodeURIComponent(symbol)}?horizon=${predictionHorizon}`
        );
        if (res.ok) {
          setPredictionData(await res.json());
        }
      } catch {
        toast.error(t("predictionsToast"));
      } finally {
        setPredictionLoading(false);
      }
    };
    fetchPredictions();
  }, [symbol, predictionHorizon, showPredictions, t]);

  const chartData = useMemo(() => {
    if (!historyData?.series) return [];
    // The history can come back daily (hundreds of points) while the forecast is
    // monthly. On a categorical axis, width is proportional to point count, so a
    // dense history squeezes the forecast into a thin sliver. Collapse to one point
    // per calendar month (last close wins, series is sorted ascending) so both sides
    // share the same monthly cadence and the prediction keeps a proportional share.
    const byMonth = new Map<string, SeriesPoint>();
    for (const p of historyData.series) {
      byMonth.set(p.date.slice(0, 7), p);
    }
    return [...byMonth.values()].map((p) => ({
      date: new Date(p.date).toLocaleDateString(intlLocale, { month: "short", year: "2-digit" }),
      close: p.close,
      predicted: null as number | null,
    }));
  }, [historyData, intlLocale]);

  const combinedChartData = useMemo(() => {
    if (!showPredictions || !predictionData?.predictions) return chartData;
    const predictions = predictionData.predictions.map((p) => ({
      date: new Date(p.date).toLocaleDateString(intlLocale, { month: "short", year: "2-digit" }),
      close: null as number | null,
      predicted: p.predicted_close,
      predLow: p.confidence_low,
      predHigh: p.confidence_high,
      predBand:
        p.confidence_low != null && p.confidence_high != null
          ? ([p.confidence_low, p.confidence_high] as [number, number])
          : null,
    }));
    return [...chartData, ...predictions];
  }, [chartData, predictionData, showPredictions, intlLocale]);

  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null;
    const closes = chartData.map((d) => d.close).filter((c): c is number => c != null);
    if (closes.length === 0) return null;
    const current = closes[closes.length - 1];
    const first = closes[0];
    const change = current - first;
    const changePct = first !== 0 ? (change / first) * 100 : 0;
    return {
      current,
      high: Math.max(...closes),
      low: Math.min(...closes),
      change,
      changePct,
    };
  }, [chartData]);

  const todayLabel = showPredictions && chartData.length > 0 ? chartData[chartData.length - 1]?.date : null;

  const backButton = (
    <button
      onClick={() => router.back()}
      aria-label={t("back")}
      className="shrink-0 rounded-lg p-2 -ml-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
    >
      <ArrowLeft size={22} />
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {backButton}
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-5 w-24" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        {backButton}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {CATALOG_NAMES.get(symbol.toUpperCase()) || historyData?.name || symbol}
          </h1>
          <p className="text-sm text-muted">{historyData?.symbol || symbol}</p>
        </div>
      </div>

      {error && (
        <div className="glass-card border-danger/30 bg-danger/10 text-danger">
          {error}
        </div>
      )}

      {/* Price Stats */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={t("stat.current")}
            value={formatCurrency(priceStats.current, historyData?.currency || "USD", intlLocale)}
          />
          <StatCard
            label={t("stat.change")}
            tone={priceStats.change >= 0 ? "success" : "danger"}
            value={`${priceStats.changePct >= 0 ? "+" : ""}${priceStats.changePct.toFixed(2)}%`}
          />
          <StatCard
            label={t("stat.high")}
            value={formatCurrency(priceStats.high, historyData?.currency || "USD", intlLocale)}
          />
          <StatCard
            label={t("stat.low")}
            value={formatCurrency(priceStats.low, historyData?.currency || "USD", intlLocale)}
          />
        </div>
      )}

      {/* Controls: the horizon pills set both the forecast length and the history
          window (~2x), so the two sides of the chart stay proportional. */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {HORIZON_VALUES.map((value) => (
            <Pill
              key={value}
              active={predictionHorizon === value}
              onClick={() => setPredictionHorizon(value)}
              className="px-2.5"
            >
              {t(`horizon.${value}`)}
            </Pill>
          ))}
        </div>

        <div className="ml-auto">
          <Pill
            active={showPredictions}
            onClick={() => setShowPredictions((v) => !v)}
            className="flex items-center gap-1.5"
          >
            {predictionLoading && showPredictions ? (
              <ArrowsClockwise className="animate-spin" size={14} />
            ) : (
              <Sparkle size={14} weight={showPredictions ? "fill" : "regular"} />
            )}
            {t("aiPredictions")}
          </Pill>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card h-[400px]">
        <AssetChart
          data={combinedChartData}
          showPredictions={showPredictions}
          todayLabel={todayLabel}
          todayText={t("today")}
          noDataText={t("noData")}
          bandStyle="full"
          bandLabel={t("bandLabel")}
          tooltipLabels={{
            close: t("tooltipClose"),
            predicted: t("tooltipPrediction"),
            range: t("tooltipRange"),
          }}
        />
      </div>

      {/* Data sources */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{t("dataSource")}</span>
        {showPredictions && (
          <>
            <span aria-hidden="true">·</span>
            <span>{t("forecastSource")}</span>
          </>
        )}
      </div>

      {/* Warning */}
      {historyData?.warning && (
        <div className="text-sm text-neutral-300 bg-neutral-800/60 border border-neutral-700 px-4 py-2.5 rounded-lg">
          {historyData.warning}
        </div>
      )}
      {predictionData?.warning && (
        <div className="text-sm text-neutral-400 bg-neutral-800/40 px-4 py-2.5 rounded-lg">
          {predictionData.warning}
        </div>
      )}

      {/* Educational per-asset signal (momentum, volatility, risk fit) */}
      <AssetSignalPanel symbol={symbol} />

      {/* Recent news headlines + optional AI overview */}
      <AssetNewsPanel symbol={symbol} />
    </div>
  );
}
