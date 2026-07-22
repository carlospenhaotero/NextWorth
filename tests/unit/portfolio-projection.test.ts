import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    userPortfolio: { findMany: vi.fn() },
  },
}));

vi.mock("@/queries/portfolio", () => ({
  getPortfolioForUser: vi.fn(),
}));

vi.mock("@/server/prediction", () => ({
  getAssetPrediction: vi.fn(),
}));

import { prisma } from "@/server/db";
import { getPortfolioForUser } from "@/queries/portfolio";
import { getAssetPrediction } from "@/server/prediction";
import { getPortfolioProjection } from "@/server/portfolio-projection";

const findMany = prisma.userPortfolio.findMany as unknown as Mock;
const mockPortfolio = getPortfolioForUser as unknown as Mock;
const mockPrediction = getAssetPrediction as unknown as Mock;

/** A position as exposed by getPortfolioForUser (only the fields projection reads). */
function position(overrides: {
  id?: number;
  symbol: string;
  assetType: string;
  currentValue: number | null;
  invested?: number | null;
  tae?: number | null;
  annualCouponIncome?: number | null;
}) {
  return {
    id: overrides.id ?? 1,
    symbol: overrides.symbol,
    assetType: overrides.assetType,
    currentValue: overrides.currentValue,
    invested: overrides.invested ?? null,
    tae: overrides.tae ?? null,
    annualCouponIncome: overrides.annualCouponIncome ?? null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrediction.mockResolvedValue(null); // No Chronos unless a test opts in.
});

describe("getPortfolioProjection — empty portfolio", () => {
  it("returns an empty series", async () => {
    mockPortfolio.mockResolvedValue({
      baseCurrency: "EUR",
      totalCurrentValue: 0,
      totalInvested: 0,
      totalProfitLoss: 0,
      positions: [],
    });
    const p = await getPortfolioProjection("u1", "1y");
    expect(p.series).toEqual([]);
    expect(p.startValue).toBe(0);
  });
});

describe("getPortfolioProjection — anchors to cost when live quote is missing", () => {
  it("does not collapse to 0 when currentValue is null (regression)", async () => {
    // Reproduces the load-test bug: Yahoo can't price the symbol, so
    // currentValue is null, but a cost basis (invested) is known.
    mockPortfolio.mockResolvedValue({
      baseCurrency: "USD",
      totalCurrentValue: 0,
      totalInvested: 5000,
      totalProfitLoss: 0,
      positions: [
        position({ symbol: "LOADSTOCK000", assetType: "stock", currentValue: null, invested: 5000 }),
      ],
    });
    findMany.mockResolvedValue([{ id: 1, assetId: 10 }]);

    const p = await getPortfolioProjection("u1", "1y");
    expect(p.series).toHaveLength(12);
    // No Chronos for this symbol -> flat at the cost-based anchor, NOT 0.
    expect(p.series.every((point) => point.value === 5000)).toBe(true);
  });
});

describe("getPortfolioProjection — Chronos scaling", () => {
  it("scales the current value by predicted_close[i] / predicted_close[0]", async () => {
    mockPortfolio.mockResolvedValue({
      baseCurrency: "USD",
      totalCurrentValue: 1000,
      totalInvested: 800,
      totalProfitLoss: 200,
      positions: [
        position({ symbol: "AAPL", assetType: "stock", currentValue: 1000, invested: 800 }),
      ],
    });
    findMany.mockResolvedValue([{ id: 1, assetId: 10 }]);
    // Forecast climbs 10% per month over the base.
    mockPrediction.mockResolvedValue({
      predictions: [
        { date: "2026-08-01", predicted_close: 100 },
        { date: "2026-09-01", predicted_close: 110 },
        { date: "2026-10-01", predicted_close: 121 },
      ],
    });

    const p = await getPortfolioProjection("u1", "3m");
    expect(p.series).toHaveLength(3);
    expect(p.series[0].value).toBeCloseTo(1000, 5); // factor 100/100
    expect(p.series[1].value).toBeCloseTo(1100, 5); // factor 110/100
    expect(p.series[2].value).toBeCloseTo(1210, 5); // factor 121/100
  });
});

describe("getPortfolioProjection — savings compound by TAE", () => {
  it("grows the balance monthly at (1 + tae)^(months/12)", async () => {
    mockPortfolio.mockResolvedValue({
      baseCurrency: "EUR",
      totalCurrentValue: 10000,
      totalInvested: 10000,
      totalProfitLoss: 0,
      positions: [
        position({ symbol: "SAVINGS", assetType: "savings", currentValue: 10000, tae: 12 }),
      ],
    });
    findMany.mockResolvedValue([{ id: 1, assetId: 20 }]);

    const p = await getPortfolioProjection("u1", "1y");
    expect(p.series[0].value).toBeGreaterThan(10000);
    // After 12 months at 12% TAE, ~11200.
    expect(p.series[11].value).toBeCloseTo(11200, -1);
    // Chronos is never queried for savings.
    expect(mockPrediction).not.toHaveBeenCalled();
  });
});
