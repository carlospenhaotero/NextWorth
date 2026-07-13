import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/require-session";
import { getPortfolioForUser } from "@/queries/portfolio";
import { getAdvisorMetrics } from "@/server/advisor/metrics";
import { AssetListView } from "@/components/dashboard/asset-list-view";
import { StackedAllocation } from "@/components/advisor/stacked-allocation";
import { ExportPortfolio } from "@/components/dashboard/export-portfolio";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.assets");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AssetsPage() {
  const session = await requireSession();
  const portfolio = await getPortfolioForUser(session.user.id);
  const t = await getTranslations("metadata.assets");
  const nav = await getTranslations("nav");
  const locale = await getLocale();
  const metrics = await getAdvisorMetrics(session.user.id, locale);
  const tAllocation = await getTranslations("allocation");

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <ExportPortfolio portfolio={portfolio} />
            <Link href="/add-asset" className={buttonClasses("primary", "sm")}>
              <Plus size={16} weight="bold" />
              {nav("addAsset")}
            </Link>
          </div>
        }
      />
      <AssetListView portfolio={portfolio} />
      {metrics.totalValue > 0 && (
        <StackedAllocation
          dimensions={[
            { title: tAllocation("byAssetType"), slices: metrics.byAssetType, byAssetClass: true },
            { title: tAllocation("bySector"), slices: metrics.bySector },
            { title: tAllocation("byCountry"), slices: metrics.byCountry },
          ]}
        />
      )}
    </>
  );
}
