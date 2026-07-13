import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("next-intl/server", () => ({
  // Echo the key so assertions can target it deterministically.
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    userPortfolio: { findMany: vi.fn() },
    asset: { findMany: vi.fn() },
  },
}));

vi.mock("@/queries/portfolio", () => ({
  getPortfolioForUser: vi.fn(),
}));

vi.mock("@/server/asset-profile", () => ({
  ensureAssetProfile: vi.fn(),
}));

import { prisma } from "@/server/db";
import { getPortfolioForUser } from "@/queries/portfolio";
import { getAdvisorMetrics } from "@/server/advisor/metrics";

const findMany = prisma.userPortfolio.findMany as unknown as Mock;
const mockPortfolio = getPortfolioForUser as unknown as Mock;

interface Pos {
  id: number;
  symbol: string;
  assetType: string;
  currentValue: number;
  sector?: string | null;
  country?: string | null;
}

/** Wire up getPortfolioForUser + the profile rows so ids line up. */
function setup(positions: Pos[], totals?: { totalInvested?: number; totalProfitLoss?: number }) {
  mockPortfolio.mockResolvedValue({
    baseCurrency: "USD",
    totalInvested: totals?.totalInvested ?? 0,
    totalProfitLoss: totals?.totalProfitLoss ?? 0,
    positions: positions.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      name: p.symbol,
      assetType: p.assetType,
      currentValue: p.currentValue,
    })),
  });
  findMany.mockResolvedValue(
    positions.map((p) => ({
      id: p.id,
      asset: {
        id: p.id,
        assetType: p.assetType,
        sector: p.sector ?? null,
        country: p.country ?? null,
        sectorWeightings: null,
        profileStatus: "ok", // non-null: skip lazy enrichment
      },
    }))
  );
}

beforeEach(() => vi.clearAllMocks());

describe("getAdvisorMetrics — risk band derivation", () => {
  it("all-crypto portfolio scores aggressive", async () => {
    setup([{ id: 1, symbol: "BTC-USD", assetType: "crypto", currentValue: 1000 }]);
    const m = await getAdvisorMetrics("u1");
    expect(m.riskProfile.score).toBe(100);
    expect(m.riskProfile.band).toBe("aggressive");
  });

  it("all-cash portfolio scores conservative", async () => {
    setup([{ id: 1, symbol: "CASH", assetType: "cash", currentValue: 1000 }]);
    const m = await getAdvisorMetrics("u1");
    expect(m.riskProfile.score).toBe(0);
    expect(m.riskProfile.band).toBe("conservative");
  });

  it("a 50/50 stock+bond split scores balanced", async () => {
    setup([
      { id: 1, symbol: "AAPL", assetType: "stock", currentValue: 500, sector: "technology" },
      { id: 2, symbol: "BND", assetType: "bond", currentValue: 500 },
    ]);
    const m = await getAdvisorMetrics("u1");
    // (0.5*0.75 + 0.5*0.2)*100 = 47.5 -> balanced
    expect(m.riskProfile.score).toBe(48);
    expect(m.riskProfile.band).toBe("balanced");
  });
});

describe("getAdvisorMetrics — allocation slices", () => {
  it("byAssetType percentages sum to ~100 and are sorted desc", async () => {
    setup([
      { id: 1, symbol: "AAPL", assetType: "stock", currentValue: 700, sector: "technology" },
      { id: 2, symbol: "BTC-USD", assetType: "crypto", currentValue: 300 },
    ]);
    const m = await getAdvisorMetrics("u1");
    const sum = m.byAssetType.reduce((a, s) => a + s.pct, 0);
    expect(sum).toBeCloseTo(100, 5);
    expect(m.byAssetType[0].value).toBeGreaterThanOrEqual(m.byAssetType[1].value);
    expect(m.byAssetType[0].key).toBe("stock");
    expect(m.byAssetType[0].pct).toBeCloseTo(70, 5);
  });

  it("ignores non-positive positions", async () => {
    setup([
      { id: 1, symbol: "AAPL", assetType: "stock", currentValue: 1000, sector: "technology" },
      { id: 2, symbol: "GHOST", assetType: "stock", currentValue: 0, sector: "technology" },
    ]);
    const m = await getAdvisorMetrics("u1");
    expect(m.totalValue).toBe(1000);
  });
});

describe("getAdvisorMetrics — insights thresholds", () => {
  it("flags single-holding concentration (>=40%) and lack of defensives", async () => {
    setup([{ id: 1, symbol: "AAPL", assetType: "stock", currentValue: 1000, sector: "technology" }]);
    const m = await getAdvisorMetrics("u1");
    const ids = m.insights.map((i) => i.id);
    expect(ids).toContain("concentration-holding");
    expect(ids).toContain("no-defensive");
  });

  it("flags cash drag when cash is >=25%", async () => {
    setup([
      { id: 1, symbol: "AAPL", assetType: "stock", currentValue: 600, sector: "technology" },
      { id: 2, symbol: "MSFT", assetType: "stock", currentValue: 100, sector: "technology" },
      { id: 3, symbol: "CASH", assetType: "cash", currentValue: 300 },
    ]);
    const m = await getAdvisorMetrics("u1");
    expect(m.insights.map((i) => i.id)).toContain("cash-drag");
  });

  it("stays quiet on a diversified, balanced portfolio", async () => {
    setup([
      { id: 1, symbol: "AAPL", assetType: "stock", currentValue: 200, sector: "technology" },
      { id: 2, symbol: "XOM", assetType: "stock", currentValue: 200, sector: "energy" },
      { id: 3, symbol: "BND", assetType: "bond", currentValue: 300 },
      { id: 4, symbol: "GLD", assetType: "commodity", currentValue: 300 },
    ]);
    const m = await getAdvisorMetrics("u1");
    expect(m.insights.map((i) => i.id)).not.toContain("concentration-holding");
    expect(m.insights.map((i) => i.id)).not.toContain("no-defensive");
    expect(m.insights.map((i) => i.id)).not.toContain("cash-drag");
  });
});

describe("getAdvisorMetrics — profit/loss percentage", () => {
  it("computes pct from invested, null when nothing invested", async () => {
    setup([{ id: 1, symbol: "AAPL", assetType: "stock", currentValue: 1200, sector: "technology" }], {
      totalInvested: 1000,
      totalProfitLoss: 200,
    });
    const m = await getAdvisorMetrics("u1");
    expect(m.profitLossPct).toBeCloseTo(20, 5);

    setup([{ id: 1, symbol: "AAPL", assetType: "stock", currentValue: 1200, sector: "technology" }], {
      totalInvested: 0,
    });
    const m2 = await getAdvisorMetrics("u1");
    expect(m2.profitLossPct).toBeNull();
  });
});
