"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendUp } from "@phosphor-icons/react/dist/ssr";

const data = [
  { month: "Jan", value: 82400 },
  { month: "Feb", value: 85100 },
  { month: "Mar", value: 83900 },
  { month: "Apr", value: 89600 },
  { month: "May", value: 94200 },
  { month: "Jun", value: 92800 },
  { month: "Jul", value: 99500 },
  { month: "Aug", value: 104300 },
  { month: "Sep", value: 108900 },
  { month: "Oct", value: 113200 },
  { month: "Nov", value: 119400 },
  { month: "Dec", value: 124580 },
];

export function PortfolioPreview() {
  return (
    <div className="flex h-full w-full flex-col p-5 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-neutral-400">Total Net Worth</p>
          <p className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            $124,580.32
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs md:text-sm font-medium">
          <TrendUp size={16} />
          +24.8%
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-xl bg-neutral-800/60 p-3">
          <p className="text-[10px] md:text-xs text-neutral-500">Invested</p>
          <p className="text-sm md:text-lg font-semibold text-white">$99,840</p>
        </div>
        <div className="rounded-xl bg-neutral-800/60 p-3">
          <p className="text-[10px] md:text-xs text-neutral-500">Profit</p>
          <p className="text-sm md:text-lg font-semibold text-green-400">
            +$24,740
          </p>
        </div>
        <div className="rounded-xl bg-neutral-800/60 p-3">
          <p className="text-[10px] md:text-xs text-neutral-500">Assets</p>
          <p className="text-sm md:text-lg font-semibold text-white">14</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a3a3a3" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#525252"
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={["dataMin - 5000", "dataMax + 5000"]} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#fafafa"
              fill="url(#previewFill)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
