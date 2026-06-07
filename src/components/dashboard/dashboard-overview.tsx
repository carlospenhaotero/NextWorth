"use client";

import { useState, useCallback, useEffect } from "react";
import { PortfolioChart } from "./portfolio-chart";
import { TopMovers } from "./top-movers";
import type { PortfolioHistoryData, PortfolioRange } from "@/server/portfolio-history";

const RANGE_SUFFIX: Record<PortfolioRange, string> = {
  "1w": "última semana",
  "1m": "último mes",
  "3m": "últimos 3 meses",
  "6m": "últimos 6 meses",
  "1y": "último año",
  all: "desde tu entrada",
};

interface DashboardOverviewProps {
  initialData: PortfolioHistoryData;
}

export function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const [data, setData] = useState<PortfolioHistoryData>(initialData);
  const [range, setRange] = useState<PortfolioRange>(initialData.range as PortfolioRange);
  const [loading, setLoading] = useState(false);

  const onRangeChange = useCallback(async (next: PortfolioRange) => {
    setRange(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/history?range=${next}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Keep previous data on failure.
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh if the server ever hands down a new snapshot.
  useEffect(() => {
    setData(initialData);
    setRange(initialData.range as PortfolioRange);
  }, [initialData]);

  const periodLabel = RANGE_SUFFIX[range];

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <PortfolioChart
        data={data}
        range={range}
        loading={loading}
        periodLabel={periodLabel}
        onRangeChange={onRangeChange}
      />
      <div className="mt-6 border-t border-neutral-800 pt-6">
        <TopMovers
          movers={data.movers}
          baseCurrency={data.baseCurrency}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
