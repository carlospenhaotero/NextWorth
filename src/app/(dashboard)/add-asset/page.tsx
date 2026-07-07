import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { getExistingPositionsLite } from "@/queries/portfolio";
import { AddAssetFlow } from "@/components/dashboard/add-asset-flow";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.addAsset");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AddAssetPage() {
  const session = await requireSession();
  const baseCurrency = session.user.baseCurrency || "USD";
  const existingPositions = await getExistingPositionsLite(session.user.id);
  const t = await getTranslations("metadata.addAsset");

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("description")} />
      <AddAssetFlow baseCurrency={baseCurrency} existingPositions={existingPositions} />
    </>
  );
}
