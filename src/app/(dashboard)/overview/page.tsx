import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { getPortfolioHistory } from "@/server/portfolio-history";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
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

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("description")} />
      <DashboardOverview initialData={history} />
    </>
  );
}
