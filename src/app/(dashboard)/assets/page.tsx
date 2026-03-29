import { requireSession } from "@/server/require-session";
import { getPortfolioForUser } from "@/queries/portfolio";
import { AssetListView } from "@/components/dashboard/asset-list-view";

export default async function AssetsPage() {
  const session = await requireSession();
  const portfolio = await getPortfolioForUser(session.user.id);

  return <AssetListView portfolio={portfolio} />;
}
