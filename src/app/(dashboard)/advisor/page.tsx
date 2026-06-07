import Link from "next/link";
import { requireSession } from "@/server/require-session";
import { getAdvisorMetrics } from "@/server/advisor/metrics";
import { KpiHeader } from "@/components/advisor/kpi-header";
import { StackedAllocation } from "@/components/advisor/stacked-allocation";
import { InsightsPanel } from "@/components/advisor/insights-panel";
import { AdvisorChat } from "@/components/advisor/advisor-chat";

export default async function AdvisorPage() {
  const session = await requireSession();
  const metrics = await getAdvisorMetrics(session.user.id);

  if (metrics.totalValue <= 0) {
    return (
      <div className="space-y-6">
        <div className="glass-card flex flex-col items-center justify-center text-center py-16">
          <p className="text-neutral-300 font-medium mb-1">
            No holdings to analyze yet
          </p>
          <p className="text-neutral-500 text-sm mb-4">
            Add assets to see your balance by sector, country and risk profile.
          </p>
          <Link
            href="/add-asset"
            className="px-4 py-2 rounded-xl bg-primary text-neutral-900 font-medium hover:opacity-90 transition"
          >
            Add your first asset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left: chat (only the history scrolls) */}
        <div className="min-h-0 h-full">
          <AdvisorChat />
        </div>

        {/* Right: dashboard, fits without page scroll */}
        <div className="min-h-0 h-full flex flex-col gap-4 overflow-hidden">
          <KpiHeader
            totalValue={metrics.totalValue}
            totalProfitLoss={metrics.totalProfitLoss}
            profitLossPct={metrics.profitLossPct}
            baseCurrency={metrics.baseCurrency}
            riskScore={metrics.riskProfile.score}
            riskBand={metrics.riskProfile.band}
          />
          <StackedAllocation
            dimensions={[
              { title: "By asset type", slices: metrics.byAssetType, byAssetClass: true },
              { title: "By sector", slices: metrics.bySector },
              { title: "By country", slices: metrics.byCountry },
            ]}
          />
          <InsightsPanel insights={metrics.insights} />
        </div>
      </div>
    </div>
  );
}
