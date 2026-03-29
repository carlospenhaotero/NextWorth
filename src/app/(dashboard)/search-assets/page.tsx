import { requireSession } from "@/server/require-session";
import { SearchAssetsView } from "@/components/dashboard/search-assets-view";

export default async function SearchAssetsPage() {
  const session = await requireSession();
  const baseCurrency = session.user.baseCurrency || "USD";

  return <SearchAssetsView baseCurrency={baseCurrency} />;
}
