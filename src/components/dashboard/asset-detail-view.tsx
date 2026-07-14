"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ArrowsClockwise, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";
import { AssetChart } from "@/components/shared/asset-chart";
import { AssetSignalPanel } from "@/components/dashboard/asset-signal";
import { StatCard } from "@/components/ui/stat-card";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";

const RANGE_VALUES = ["6m", "12m", "24m", "60m"] as const;

const HORIZON_VALUES = ["3m", "6m", "1y", "2y", "5y"] as const;

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
  predictions: Array<{ date: string; predicted_close: number }>;
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
  const [selectedRange, setSelectedRange] = useState("24m");

  const [showPredictions, setShowPredictions] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState("6m");
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/market/history/${encodeURIComponent(symbol)}?range=${selectedRange}&interval=1mo`
      );
      if (!res.ok) throw new Error(t("loadFailed"));
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailedShort"));
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedRange, t]);

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
    return historyData.series.map((p) => ({
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
            {historyData?.name || symbol}
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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {RANGE_VALUES.map((value) => (
            <Pill
              key={value}
              active={selectedRange === value}
              onClick={() => setSelectedRange(value)}
            >
              {t(`range.${value}`)}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {showPredictions &&
            HORIZON_VALUES.map((value) => (
              <Pill
                key={value}
                active={predictionHorizon === value}
                onClick={() => setPredictionHorizon(value)}
                className="px-2.5"
              >
                {t(`horizon.${value}`)}
              </Pill>
            ))}
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
    </div>
  );
}
