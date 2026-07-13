import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { getPortfolioHistory, getPortfolioKpis } from "@/server/portfolio-history";
import { getAdvisorMetrics } from "@/server/advisor/metrics";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PortfolioKpis } from "@/components/dashboard/portfolio-kpis";
import { StackedAllocation } from "@/components/advisor/stacked-allocation";
import { OnboardingEmpty } from "@/components/dashboard/onboarding-empty";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.overview");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function OverviewPage() {
  const session = await requireSession();
  const history = await getPortfolioHistory(session.user.id, "all");
  const t = await getTranslations("metadata.overview");

  // Sin posiciones aun: mostramos la bienvenida guiada en lugar del dashboard.
  if (history.startDate == null) {
    return (
      <>
        <PageHeader title={t("title")} subtitle={t("description")} />
        <OnboardingEmpty />
      </>
    );
  }

  const locale = await getLocale();
  const [kpis, metrics] = await Promise.all([
    getPortfolioKpis(session.user.id),
    getAdvisorMetrics(session.user.id, locale),
  ]);
  const tAllocation = await getTranslations("allocation");
  const tOverview = await getTranslations("overview");

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("description")} />
      <div className="flex flex-col gap-6">
        <PortfolioKpis kpis={kpis} />
        <DashboardOverview initialData={history} />
        {metrics.totalValue > 0 && (
          <StackedAllocation
            dimensions={[
              { title: tAllocation("byAssetType"), slices: metrics.byAssetType, byAssetClass: true },
              { title: tAllocation("bySector"), slices: metrics.bySector },
              { title: tAllocation("byCountry"), slices: metrics.byCountry },
            ]}
          />
        )}
        <p className="text-xs text-neutral-500">{tOverview("sourceFooter")}</p>
      </div>
    </>
  );
}
