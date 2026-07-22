import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, ChartPie } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/require-session";
import { getPortfolioForUser } from "@/queries/portfolio";
import { AssetListView } from "@/components/dashboard/asset-list-view";
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
  const tList = await getTranslations("assetList");

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
      {portfolio.positions.length > 0 && (
        <Link
          href="/overview"
          className="inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:text-accent-hover outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded"
        >
          <ChartPie size={16} weight="bold" />
          {tList("viewBreakdown")}
        </Link>
      )}
    </>
  );
}
