import { requireSession } from "@/server/require-session";
import { AssetDetailView } from "@/components/dashboard/asset-detail-view";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  await requireSession();
  const { symbol } = await params;

  return <AssetDetailView symbol={decodeURIComponent(symbol)} />;
}
