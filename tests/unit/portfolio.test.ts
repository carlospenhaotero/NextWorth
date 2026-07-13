import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userPortfolio: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/market-data", () => ({
  getQuote: vi.fn(),
  getFxRate: vi.fn(),
}));

import { prisma } from "@/server/db";
import { getQuote, getFxRate } from "@/server/market-data";
import { getPortfolioForUser } from "@/queries/portfolio";

const findUnique = prisma.user.findUnique as unknown as Mock;
const findMany = prisma.userPortfolio.findMany as unknown as Mock;
const mockQuote = getQuote as unknown as Mock;
const mockFx = getFxRate as unknown as Mock;

function row(o: {
  id?: number;
  symbol: string;
  assetType: string;
  currency?: string;
  quantity: number;
  avgBuyPrice?: number | null;
  faceValue?: number | null;
  couponRate?: number | null;
  couponFrequency?: number | null;
  tae?: number | null;
  maturityDate?: Date | null;
}) {
  return {
    id: o.id ?? 1,
    quantity: o.quantity,
    avgBuyPrice: o.avgBuyPrice ?? null,
    faceValue: o.faceValue ?? null,
    couponRate: o.couponRate ?? null,
    couponFrequency: o.couponFrequency ?? null,
    tae: o.tae ?? null,
    maturityDate: o.maturityDate ?? null,
    asset: {
      symbol: o.symbol,
      name: o.symbol,
      assetType: o.assetType,
      currency: o.currency ?? "USD",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue({ baseCurrency: "USD" });
  mockFx.mockResolvedValue(1);
});

describe("getPortfolioForUser — empty", () => {
  it("returns zeroed totals", async () => {
    findMany.mockResolvedValue([]);
    const p = await getPortfolioForUser("u1");
    expect(p.positions).toEqual([]);
    expect(p.totalCurrentValue).toBe(0);
  });
});

describe("getPortfolioForUser — stock P/L", () => {
  it("computes value, P/L and pct from live quote", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "AAPL", assetType: "stock", quantity: 10, avgBuyPrice: 100 }),
    ]);
    mockQuote.mockResolvedValue({ currentPrice: 120 });
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    expect(pos.invested).toBe(1000);
    expect(pos.currentValue).toBe(1200);
    expect(pos.profitLoss).toBe(200);
    expect(pos.profitLossPct).toBeCloseTo(20, 5);
    expect(p.totalProfitLoss).toBe(200);
  });

  it("applies FX to a non-base position", async () => {
    mockFx.mockResolvedValue(1.1);
    findMany.mockResolvedValue([
      row({ symbol: "SAP.DE", assetType: "stock", currency: "EUR", quantity: 10, avgBuyPrice: 100 }),
    ]);
    mockQuote.mockResolvedValue({ currentPrice: 110 });
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    // invested 1000 EUR * 1.1 = 1100; value 10*110*1.1 = 1210.
    expect(pos.invested).toBeCloseTo(1100, 5);
    expect(pos.currentValue).toBeCloseTo(1210, 5);
    expect(pos.profitLoss).toBeCloseTo(110, 5);
  });
});

describe("getPortfolioForUser — quote failure falls back to cost", () => {
  it("marks the price estimated and reports an error", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "AAPL", assetType: "stock", quantity: 10, avgBuyPrice: 100 }),
    ]);
    mockQuote.mockRejectedValue(new Error("quote down"));
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    expect(pos.priceEstimated).toBe(true);
    expect(pos.currentValue).toBe(1000); // 10 * avgBuyPrice, flat
    expect(pos.error).toBeTruthy();
  });
});

describe("getPortfolioForUser — cash", () => {
  it("prices cash at 1 without a quote call", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "CASH", assetType: "cash", quantity: 5000, avgBuyPrice: 1 }),
    ]);
    const p = await getPortfolioForUser("u1");
    expect(p.positions[0].currentValue).toBe(5000);
    expect(mockQuote).not.toHaveBeenCalled();
  });
});

describe("getPortfolioForUser — savings derived metrics", () => {
  it("projects annual income and 1y value from TAE", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "SAV", assetType: "savings", quantity: 1000, tae: 5 }),
    ]);
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    expect(pos.projectedAnnualIncome).toBeCloseTo(50, 5); // 1000 * 5%
    expect(pos.projectedValue1y).toBeCloseTo(1050, 5);
  });
});

describe("getPortfolioForUser — bond derived metrics", () => {
  it("computes coupon income, yield, redemption and days to maturity", async () => {
    const maturity = new Date(Date.now() + 365 * 86_400_000);
    findMany.mockResolvedValue([
      row({
        symbol: "BUND",
        assetType: "bond",
        quantity: 10,
        faceValue: 1000,
        couponRate: 4,
        avgBuyPrice: 950,
        maturityDate: maturity,
      }),
    ]);
    mockQuote.mockResolvedValue({ currentPrice: 980 });
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    expect(pos.annualCouponIncome).toBeCloseTo(400, 5); // 10 * 1000 * 4%
    expect(pos.redemptionValue).toBeCloseTo(10000, 5); // 10 * 1000
    expect(pos.currentYield).toBeCloseTo((400 / (10 * 980)) * 100, 5);
    expect(pos.daysToMaturity).toBeGreaterThan(360);
    expect(pos.daysToMaturity).toBeLessThanOrEqual(365);
  });
});

describe("getPortfolioForUser — dividend metrics", () => {
  it("derives annual dividend income and yield for a stock", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "KO", assetType: "stock", quantity: 100, avgBuyPrice: 50 }),
    ]);
    mockQuote.mockResolvedValue({ currentPrice: 60, dividendRate: 1.9, dividendYield: 0.031 });
    const p = await getPortfolioForUser("u1");
    const pos = p.positions[0];
    expect(pos.annualDividendIncome).toBeCloseTo(190, 5); // 100 * 1.9
    expect(pos.dividendYield).toBeCloseTo(3.1, 5); // 0.031 * 100
  });
});
