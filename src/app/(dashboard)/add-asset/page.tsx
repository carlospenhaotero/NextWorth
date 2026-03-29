import { requireSession } from "@/server/require-session";
import { AddAssetFlow } from "@/components/dashboard/add-asset-flow";

export default async function AddAssetPage() {
  const session = await requireSession();
  const baseCurrency = session.user.baseCurrency || "USD";

  return <AddAssetFlow baseCurrency={baseCurrency} />;
}
