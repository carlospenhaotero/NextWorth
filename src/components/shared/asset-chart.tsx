"use client";

import type { CSSProperties } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import { chartTheme } from "@/lib/chart-theme";

export interface AssetChartPoint {
  date: string;
  close: number | null;
  predicted: number | null;
  /** Lower edge of the p10-p90 confidence band (forecast points only). */
  predLow?: number | null;
  /** Upper edge of the p10-p90 confidence band (forecast points only). */
  predHigh?: number | null;
  /** [low, high] pair Recharts renders as a shaded range area. */
  predBand?: [number, number] | null;
}

/**
 * How to render the forecast uncertainty:
 * - "none": no band (default, backwards compatible).
 * - "shaded": just the translucent p10-p90 area (compact charts).
 * - "full": shaded area + dashed p10/p90 edges + endpoint labels.
 */
type BandStyle = "full" | "shaded" | "none";

interface TooltipLabels {
  close: string;
  predicted: string;
  range: string;
}

interface AssetChartProps {
  /** Combined series: historical `close` points followed by `predicted` points. */
  data: AssetChartPoint[];
  /** Render the forecast area + the "today" divider. */
  showPredictions: boolean;
  /** X value where history ends and the forecast starts (null hides the divider). */
  todayLabel: string | null;
  todayText: string;
  noDataText: string;
  /** Confidence-band treatment. Defaults to "none". */
  bandStyle?: BandStyle;
  /** Optional caption shown under the chart, e.g. "80% confidence band". */
  bandLabel?: string;
  /** Tooltip row labels; falls back to English when omitted. */
  tooltipLabels?: TooltipLabels;
}

const DEFAULT_TOOLTIP_LABELS: TooltipLabels = {
  close: "Close",
  predicted: "Forecast",
  range: "p10-p90 range",
};

const fmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface ChartTooltipPayloadItem {
  payload: AssetChartPoint;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  labels: TooltipLabels;
}

function ChartTooltip({ active, payload, labels }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  const rows: Array<{ label: string; value: string }> = [];
  if (point.close != null) {
    rows.push({ label: labels.close, value: fmt(point.close) });
  }
  if (point.predicted != null) {
    rows.push({ label: labels.predicted, value: fmt(point.predicted) });
    if (point.predLow != null && point.predHigh != null) {
      rows.push({
        label: labels.range,
        value: `${fmt(point.predLow)} – ${fmt(point.predHigh)}`,
      });
    }
  }
  if (rows.length === 0) return null;

  const boxStyle: CSSProperties = {
    ...(chartTheme.tooltip as CSSProperties),
    padding: "0.5rem 0.75rem",
    fontSize: 12,
  };

  return (
    <div style={boxStyle}>
      <p style={{ marginBottom: 4, color: chartTheme.axisTick }}>{point.date}</p>
      {rows.map((row) => (
        <p key={row.label} style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
          <span style={{ color: chartTheme.axisTick }}>{row.label}</span>
          <span style={{ fontWeight: 600 }}>{row.value}</span>
        </p>
      ))}
    </div>
  );
}

interface EdgeLabelProps {
  x?: number | string;
  y?: number | string;
  index?: number;
}

/** Renders a small band label ("p10"/"p90") only at the last forecast point. */
function edgeLabel(text: string, lastIndex: number) {
  return function EdgeLabel({ x, y, index }: EdgeLabelProps) {
    if (index !== lastIndex || x == null || y == null) return null;
    return (
      <text
        x={Number(x)}
        y={Number(y)}
        dx={-4}
        dy={4}
        textAnchor="end"
        fill={chartTheme.axisTick}
        fontSize={10}
      >
        {text}
      </text>
    );
  };
}

/**
 * Presentational history + forecast chart. No data fetching or state: callers
 * pass an already-combined series. Shared by the asset detail page and the
 * add-asset preview so both render identically. Fills its parent's height.
 */
export function AssetChart({
  data,
  showPredictions,
  todayLabel,
  todayText,
  noDataText,
  bandStyle = "none",
  bandLabel,
  tooltipLabels = DEFAULT_TOOLTIP_LABELS,
}: AssetChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        {noDataText}
      </div>
    );
  }

  const showBand = showPredictions && bandStyle !== "none";
  const showEdges = showPredictions && bandStyle === "full";
  const lastIndex = data.length - 1;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3a3a3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartTheme.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartTheme.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="date"
            stroke={chartTheme.axis}
            tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
          />
          <YAxis
            stroke={chartTheme.axis}
            tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<ChartTooltip labels={tooltipLabels} />} />
          {/* Confidence band drawn first so the median line sits on top. */}
          {showBand && (
            <Area
              type="monotone"
              dataKey="predBand"
              stroke="none"
              fill={chartTheme.accent}
              fillOpacity={0.15}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
          )}
          {showEdges && (
            <>
              <Area
                type="monotone"
                dataKey="predHigh"
                stroke={chartTheme.accent}
                strokeWidth={1}
                strokeDasharray="2 3"
                strokeOpacity={0.7}
                fill="none"
                connectNulls={false}
                isAnimationActive={false}
                activeDot={false}
              >
                <LabelList content={edgeLabel("p90", lastIndex)} />
              </Area>
              <Area
                type="monotone"
                dataKey="predLow"
                stroke={chartTheme.accent}
                strokeWidth={1}
                strokeDasharray="2 3"
                strokeOpacity={0.7}
                fill="none"
                connectNulls={false}
                isAnimationActive={false}
                activeDot={false}
              >
                <LabelList content={edgeLabel("p10", lastIndex)} />
              </Area>
            </>
          )}
          <Area
            type="monotone"
            dataKey="close"
            stroke="#fafafa"
            fill="url(#colorClose)"
            strokeWidth={2}
            connectNulls={false}
          />
          {showPredictions && (
            <>
              <Area
                type="monotone"
                dataKey="predicted"
                stroke={chartTheme.accent}
                fill={showBand ? "none" : "url(#colorPredicted)"}
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={false}
              />
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke={chartTheme.reference}
                  strokeDasharray="3 3"
                  label={{ value: todayText, fill: "#a3a3a3", fontSize: 11 }}
                />
              )}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
      </div>
      {showBand && bandLabel && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className="inline-block h-2 w-3 rounded-sm"
            style={{ backgroundColor: chartTheme.accent, opacity: 0.25 }}
            aria-hidden="true"
          />
          {bandLabel}
        </p>
      )}
    </div>
  );
}
