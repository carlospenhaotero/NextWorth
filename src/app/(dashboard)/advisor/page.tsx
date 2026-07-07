import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { getAdvisorMetrics } from "@/server/advisor/metrics";
import { KpiHeader } from "@/components/advisor/kpi-header";
import { StackedAllocation } from "@/components/advisor/stacked-allocation";
import { InsightsPanel } from "@/components/advisor/insights-panel";
import { AdvisorChat } from "@/components/advisor/advisor-chat";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.advisor");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdvisorPage() {
  const session = await requireSession();
  const locale = await getLocale();
  const metrics = await getAdvisorMetrics(session.user.id, locale);
  const t = await getTranslations("advisor");
  const tAllocation = await getTranslations("allocation");

  if (metrics.totalValue <= 0) {
    return (
      <>
        <PageHeader title={t("empty.title")} subtitle={t("empty.subtitle")} />
        <div className="glass-card flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="max-w-sm text-sm text-neutral-400">{t("empty.subtitle")}</p>
          <Link href="/add-asset" className={buttonClasses("primary", "md")}>
            {t("empty.cta")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-5rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left: chat (only the history scrolls) */}
        <div className="min-h-0 h-full">
          <AdvisorChat />
        </div>

        {/* Right: dashboard, fits without page scroll */}
        <div className="min-h-0 h-full flex flex-col gap-4 overflow-hidden">
          <KpiHeader
            totalValue={metrics.totalValue}
            totalProfitLoss={metrics.totalProfitLoss}
            profitLossPct={metrics.profitLossPct}
            baseCurrency={metrics.baseCurrency}
            riskScore={metrics.riskProfile.score}
            riskBand={metrics.riskProfile.band}
          />
          <StackedAllocation
            dimensions={[
              { title: tAllocation("byAssetType"), slices: metrics.byAssetType, byAssetClass: true },
              { title: tAllocation("bySector"), slices: metrics.bySector },
              { title: tAllocation("byCountry"), slices: metrics.byCountry },
            ]}
          />
          <InsightsPanel insights={metrics.insights} />
        </div>
      </div>
    </div>
  );
}
