import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/require-session";
import { getPortfolioForUser } from "@/queries/portfolio";
import { AssetListView } from "@/components/dashboard/asset-list-view";
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

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("description")}
        actions={
          <Link href="/add-asset" className={buttonClasses("primary", "sm")}>
            <Plus size={16} weight="bold" />
            {nav("addAsset")}
          </Link>
        }
      />
      <AssetListView portfolio={portfolio} />
    </>
  );
}
