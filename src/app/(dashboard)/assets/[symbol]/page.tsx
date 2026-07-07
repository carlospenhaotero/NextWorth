import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { AssetDetailView } from "@/components/dashboard/asset-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  const t = await getTranslations("metadata.assetDetail");

  return {
    title: decoded,
    description: t("description", { symbol: decoded }),
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  await requireSession();
  const { symbol } = await params;

  return <AssetDetailView symbol={decodeURIComponent(symbol)} />;
}
