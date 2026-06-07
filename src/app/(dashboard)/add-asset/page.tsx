import { requireSession } from "@/server/require-session";
import { getExistingPositionsLite } from "@/queries/portfolio";
import { AddAssetFlow } from "@/components/dashboard/add-asset-flow";

export default async function AddAssetPage() {
  const session = await requireSession();
  const baseCurrency = session.user.baseCurrency || "USD";
  const existingPositions = await getExistingPositionsLite(session.user.id);

  return <AddAssetFlow baseCurrency={baseCurrency} existingPositions={existingPositions} />;
}
