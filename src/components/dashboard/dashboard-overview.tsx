"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PortfolioChart } from "./portfolio-chart";
import { TopMovers } from "./top-movers";
import type { PortfolioHistoryData, PortfolioRange } from "@/server/portfolio-history";

interface DashboardOverviewProps {
  initialData: PortfolioHistoryData;
}

export function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const t = useTranslations("overview");
  const [data, setData] = useState<PortfolioHistoryData>(initialData);
  const [range, setRange] = useState<PortfolioRange>(initialData.range as PortfolioRange);
  const [loading, setLoading] = useState(false);

  const onRangeChange = useCallback(
    async (next: PortfolioRange) => {
      setRange(next);
      setLoading(true);
      try {
        const res = await fetch(`/api/portfolio/history?range=${next}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Keep previous data on failure.
        toast.error(t("chartError"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  // Refresh if the server ever hands down a new snapshot.
  useEffect(() => {
    setData(initialData);
    setRange(initialData.range as PortfolioRange);
  }, [initialData]);

  const periodLabel = t(`rangeSuffix.${range}`);

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card flex min-h-[22rem] flex-col">
        <PortfolioChart
          data={data}
          range={range}
          loading={loading}
          periodLabel={periodLabel}
          onRangeChange={onRangeChange}
        />
      </section>
      <section>
        <TopMovers
          movers={data.movers}
          baseCurrency={data.baseCurrency}
          periodLabel={periodLabel}
        />
      </section>
    </div>
  );
}
