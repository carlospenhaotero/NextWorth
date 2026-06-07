import { requireSession } from "@/server/require-session";
import { getPortfolioHistory } from "@/server/portfolio-history";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function OverviewPage() {
  const session = await requireSession();
  const history = await getPortfolioHistory(session.user.id, "all");

  return <DashboardOverview initialData={history} />;
}
