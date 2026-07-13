"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PortfolioChart } from "./portfolio-chart";
import { TopMovers } from "./top-movers";
import type { PortfolioHistoryData, PortfolioRange } from "@/server/portfolio-history";
import type { PortfolioProjectionData, ProjectionHorizon } from "@/server/portfolio-projection";

interface DashboardOverviewProps {
  initialData: PortfolioHistoryData;
}

export function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const t = useTranslations("overview");
  const tChart = useTranslations("portfolioChart");
  const [data, setData] = useState<PortfolioHistoryData>(initialData);
  const [range, setRange] = useState<PortfolioRange>(initialData.range as PortfolioRange);
  const [loading, setLoading] = useState(false);

  const [projectionEnabled, setProjectionEnabled] = useState(false);
  const [projectionHorizon, setProjectionHorizon] = useState<ProjectionHorizon>("1y");
  const [projectionData, setProjectionData] = useState<PortfolioProjectionData | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(false);

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

  // Fetch (or refresh) the projection whenever it's toggled on or its horizon changes.
  useEffect(() => {
    if (!projectionEnabled) return;
    let cancelled = false;
    const run = async () => {
      setProjectionLoading(true);
      try {
        const res = await fetch(`/api/portfolio/projection?horizon=${projectionHorizon}`);
        if (!res.ok) throw new Error("Failed to load projection");
        const json = await res.json();
        if (!cancelled) setProjectionData(json);
      } catch {
        if (!cancelled) toast.error(tChart("projection.error"));
      } finally {
        if (!cancelled) setProjectionLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [projectionEnabled, projectionHorizon, tChart]);

  const onToggleProjection = useCallback(() => {
    setProjectionEnabled((prev) => !prev);
  }, []);

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
          projectionEnabled={projectionEnabled}
          projectionHorizon={projectionHorizon}
          projectionData={projectionData}
          projectionLoading={projectionLoading}
          onToggleProjection={onToggleProjection}
          onProjectionHorizonChange={setProjectionHorizon}
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
