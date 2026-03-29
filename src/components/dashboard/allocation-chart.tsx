"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

interface Position {
  name: string;
  symbol: string;
  currentValue: number | null;
}

interface AllocationChartProps {
  positions: Position[];
  baseCurrency: string;
}

export function AllocationChart({
  positions,
  baseCurrency,
}: AllocationChartProps) {
  const chartData = useMemo(() => {
    return positions
      .filter((p) => p.currentValue != null && p.currentValue > 0)
      .map((p) => ({
        name: p.name || p.symbol,
        value: p.currentValue!,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [positions]);

  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="col-span-1 glass-card min-h-[300px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-2">Allocation</h3>
      <div className="flex-1 w-full relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="rgba(0,0,0,0)"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f8fafc",
                  borderRadius: "0.75rem",
                }}
                formatter={(value) =>
                  formatCurrency(Number(value), baseCurrency)
                }
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No allocation data
          </div>
        )}
        {chartData.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(totalValue, baseCurrency)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
