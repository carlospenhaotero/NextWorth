import { describe, it, expect } from "vitest";
import { selectSuggestionCandidates } from "@/lib/diversification";
import type { AdvisorMetrics } from "@/server/advisor/metrics";
import { getAssetsByType } from "@/lib/assets-catalog";

function metrics(overrides: Partial<AdvisorMetrics> = {}): AdvisorMetrics {
  return {
    baseCurrency: "USD",
    totalValue: 1000,
    totalInvested: 1000,
    totalProfitLoss: 0,
    profitLossPct: 0,
    topHolding: null,
    byAssetType: [],
    bySector: [],
    byCountry: [],
    riskProfile: { score: 50, band: "balanced", equityPct: 100, defensivePct: 0, breakdown: [] },
    coverage: { profiledPct: 100, unknownPct: 0 },
    insights: [],
    ...overrides,
  };
}

describe("selectSuggestionCandidates", () => {
  it("fills the thin classes of an all-stock portfolio, one per class", () => {
    const m = metrics({
      byAssetType: [{ key: "stock", label: "Stocks", value: 1000, pct: 100 }],
    });
    const { picks, gapTypes } = selectSuggestionCandidates(m, new Set());

    expect(picks).toHaveLength(4);
    // Stock is well represented, so it must not be suggested.
    expect(picks.every((p) => p.assetType !== "stock")).toBe(true);
    expect(gapTypes).not.toContain("stock");
    // Broad instruments first: an ETF leads.
    expect(picks[0].assetType).toBe("etf");
    // Spread across distinct classes rather than four of the same.
    expect(new Set(picks.map((p) => p.assetType)).size).toBeGreaterThanOrEqual(3);
  });

  it("proposes a diversified core for an empty portfolio", () => {
    const m = metrics({ totalValue: 0, byAssetType: [] });
    const { picks, gapTypes } = selectSuggestionCandidates(m, new Set());

    expect(gapTypes).toEqual(["etf", "bond", "commodity"]);
    expect(picks.length).toBeGreaterThan(0);
    const types = picks.map((p) => p.assetType);
    expect(types).toContain("etf");
    expect(types).toContain("bond");
  });

  it("never suggests a symbol the user already owns", () => {
    const ownedEtf = getAssetsByType("etf")[0].symbol;
    const m = metrics({
      byAssetType: [{ key: "stock", label: "Stocks", value: 1000, pct: 100 }],
    });
    const { picks } = selectSuggestionCandidates(m, new Set([ownedEtf]));

    expect(picks.every((p) => p.symbol !== ownedEtf)).toBe(true);
  });

  it("falls back to broad ETFs when the portfolio is already diversified", () => {
    const m = metrics({
      byAssetType: [
        { key: "etf", label: "ETFs", value: 300, pct: 30 },
        { key: "bond", label: "Bonds", value: 300, pct: 30 },
        { key: "commodity", label: "Commodities", value: 200, pct: 20 },
        { key: "stock", label: "Stocks", value: 200, pct: 20 },
      ],
    });
    const { picks } = selectSuggestionCandidates(m, new Set());
    // crypto is the only class under threshold here, so at least something shows.
    expect(picks.length).toBeGreaterThan(0);
  });
});
