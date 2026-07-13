"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { localeToIntl } from "@/i18n/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetChart, type AssetChartPoint } from "@/components/shared/asset-chart";

// Fixed in the add flow: 2y of history + a 1y forecast, forecast always on.
const RANGE = "24m";
const HORIZON = "1y";

interface HistorySeriesPoint {
  date: string;
  close: number;
}
interface HistoryData {
  series: HistorySeriesPoint[];
}
interface PreviewPrediction {
  predictions: Array<{ date: string; predicted_close: number }>;
}

interface AssetPreviewChartProps {
  symbol: string;
}

/**
 * History + forecast preview shown while adding a listed market asset. Fetches
 * Yahoo history and the DB-free Chronos preview independently: if the forecast
 * fails or the ML service is down, the history still renders and the add flow
 * is never blocked.
 */
export function AssetPreviewChart({ symbol }: AssetPreviewChartProps) {
  const t = useTranslations("addAsset.modal.chart");
  const intlLocale = localeToIntl(useLocale());

  const [history, setHistory] = useState<HistoryData | null>(null);
  const [prediction, setPrediction] = useState<PreviewPrediction | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [predictionFailed, setPredictionFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    setHistory(null);
    setPrediction(null);
    setHistoryLoading(true);
    setPredictionLoading(true);
    setPredictionFailed(false);

    (async () => {
      try {
        const res = await fetch(
          `/api/market/history/${encodeURIComponent(symbol)}?range=${RANGE}&interval=1mo&persist=0`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setHistory(data);
      } catch {
        // History failure surfaces as the chart's empty state.
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch(
          `/api/predictions/preview?symbol=${encodeURIComponent(symbol)}&horizon=${HORIZON}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setPrediction(data);
      } catch {
        if (!cancelled && !ctrl.signal.aborted) setPredictionFailed(true);
      } finally {
        if (!cancelled) setPredictionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [symbol]);

  const chartData = useMemo<AssetChartPoint[]>(() => {
    if (!history?.series) return [];
    return history.series.map((p) => ({
      date: new Date(p.date).toLocaleDateString(intlLocale, { month: "short", year: "2-digit" }),
      close: p.close,
      predicted: null,
    }));
  }, [history, intlLocale]);

  const combinedData = useMemo<AssetChartPoint[]>(() => {
    if (!prediction?.predictions?.length) return chartData;
    const preds = prediction.predictions.map((p) => ({
      date: new Date(p.date).toLocaleDateString(intlLocale, { month: "short", year: "2-digit" }),
      close: null,
      predicted: p.predicted_close,
    }));
    return [...chartData, ...preds];
  }, [chartData, prediction, intlLocale]);

  const showPredictions = (prediction?.predictions?.length ?? 0) > 0;
  const todayLabel =
    showPredictions && chartData.length > 0 ? chartData[chartData.length - 1].date : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t("title")}
        </p>
        {predictionLoading && (
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <ArrowsClockwise className="animate-spin" size={12} />
            {t("loadingForecast")}
          </span>
        )}
      </div>

      <div className="h-[240px] rounded-xl border border-border bg-neutral-900/40 p-2">
        {historyLoading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : (
          <AssetChart
            data={combinedData}
            showPredictions={showPredictions}
            todayLabel={todayLabel}
            todayText={t("today")}
            noDataText={t("noData")}
          />
        )}
      </div>

      <div className="space-y-0.5 text-xs text-neutral-500">
        <p>{t("priceSource")}</p>
        {showPredictions && <p>{t("disclaimer")}</p>}
        {predictionFailed && (
          <p className="text-amber-400/80">{t("forecastUnavailable")}</p>
        )}
      </div>
    </div>
  );
}
