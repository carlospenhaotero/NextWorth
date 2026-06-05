import { requireSession } from "@/server/require-session";
import { getPortfolioForUser } from "@/queries/portfolio";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { TopMovers } from "@/components/dashboard/top-movers";

export default async function OverviewPage() {
  const session = await requireSession();
  const portfolio = await getPortfolioForUser(session.user.id);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-neutral-400">
          Welcome back, here&apos;s your financial overview.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PortfolioSummary
          totalValue={portfolio.totalCurrentValue}
          totalInvested={portfolio.totalInvested}
          totalProfitLoss={portfolio.totalProfitLoss}
          baseCurrency={portfolio.baseCurrency}
        />

        <AllocationChart
          positions={portfolio.positions}
          baseCurrency={portfolio.baseCurrency}
        />

        <TopMovers
          positions={portfolio.positions}
          baseCurrency={portfolio.baseCurrency}
        />
      </div>
    </div>
  );
}
