"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { chartTheme } from "@/lib/chart-theme";

export interface AssetChartPoint {
  date: string;
  close: number | null;
  predicted: number | null;
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
}: AssetChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        {noDataText}
      </div>
    );
  }

  return (
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
        <Tooltip contentStyle={chartTheme.tooltip} />
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
              fill="url(#colorPredicted)"
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
  );
}
