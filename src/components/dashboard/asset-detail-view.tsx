"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: "6m", label: "6M" },
  { value: "12m", label: "1Y" },
  { value: "24m", label: "2Y" },
  { value: "60m", label: "5Y" },
];

const HORIZON_OPTIONS = [
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

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
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState("24m");

  const [showPredictions, setShowPredictions] = useState(false);
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
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedRange]);

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
        // Non-critical
      } finally {
        setPredictionLoading(false);
      }
    };
    fetchPredictions();
  }, [symbol, predictionHorizon, showPredictions]);

  const chartData = useMemo(() => {
    if (!historyData?.series) return [];
    return historyData.series.map((p) => ({
      date: new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      close: p.close,
      predicted: null as number | null,
    }));
  }, [historyData]);

  const combinedChartData = useMemo(() => {
    if (!showPredictions || !predictionData?.predictions) return chartData;
    const predictions = predictionData.predictions.map((p) => ({
      date: new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      close: null as number | null,
      predicted: p.predicted_close,
    }));
    return [...chartData, ...predictions];
  }, [chartData, predictionData, showPredictions]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {historyData?.name || symbol}
          </h1>
          <p className="text-slate-400">{symbol}</p>
        </div>
      </div>

      {error && (
        <div className="glass-card !bg-red-500/10 border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Price Stats */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card !p-4">
            <p className="text-xs text-slate-500">Current</p>
            <p className="text-lg font-bold text-white">
              {formatCurrency(priceStats.current, historyData?.currency || "USD")}
            </p>
          </div>
          <div className="glass-card !p-4">
            <p className="text-xs text-slate-500">Change</p>
            <p className={`text-lg font-bold ${priceStats.change >= 0 ? "text-green-400" : "text-red-400"}`}>
              {priceStats.changePct >= 0 ? "+" : ""}{priceStats.changePct.toFixed(2)}%
            </p>
          </div>
          <div className="glass-card !p-4">
            <p className="text-xs text-slate-500">High</p>
            <p className="text-lg font-bold text-white">
              {formatCurrency(priceStats.high, historyData?.currency || "USD")}
            </p>
          </div>
          <div className="glass-card !p-4">
            <p className="text-xs text-slate-500">Low</p>
            <p className="text-lg font-bold text-white">
              {formatCurrency(priceStats.low, historyData?.currency || "USD")}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedRange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedRange === opt.value
                  ? "bg-primary text-slate-900"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showPredictions
                ? "bg-purple-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Sparkles size={14} />
            AI Predictions
          </button>

          {showPredictions && (
            <div className="flex gap-1">
              {HORIZON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPredictionHorizon(opt.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    predictionHorizon === opt.value
                      ? "bg-purple-500/30 text-purple-300"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ height: 400 }}>
        {predictionLoading && showPredictions && (
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-2">
            <RefreshCw className="animate-spin" size={14} />
            Loading predictions...
          </div>
        )}
        {combinedChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedChartData}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                stroke="#475569"
                tick={{ fill: "#64748b", fontSize: 11 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f8fafc",
                  borderRadius: "0.75rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                fill="url(#colorClose)"
                strokeWidth={2}
                connectNulls={false}
              />
              {showPredictions && (
                <>
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#a855f7"
                    fill="url(#colorPredicted)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                  {todayLabel && (
                    <ReferenceLine
                      x={todayLabel}
                      stroke="#64748b"
                      strokeDasharray="3 3"
                      label={{ value: "Today", fill: "#94a3b8", fontSize: 11 }}
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            No chart data available
          </div>
        )}
      </div>

      {/* Warning */}
      {historyData?.warning && (
        <div className="text-sm text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg">
          {historyData.warning}
        </div>
      )}
      {predictionData?.warning && (
        <div className="text-sm text-purple-400 bg-purple-500/10 px-4 py-2 rounded-lg">
          {predictionData.warning}
        </div>
      )}
    </div>
  );
}
