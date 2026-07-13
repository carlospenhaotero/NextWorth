import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userPortfolio: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/market-data", () => ({
  getAssetHistory: vi.fn(),
  getFxRate: vi.fn(),
}));

import { prisma } from "@/server/db";
import { getAssetHistory, getFxRate } from "@/server/market-data";
import { getPortfolioHistory, getPortfolioKpis } from "@/server/portfolio-history";

const findUnique = prisma.user.findUnique as unknown as Mock;
const findMany = prisma.userPortfolio.findMany as unknown as Mock;
const mockHistory = getAssetHistory as unknown as Mock;
const mockFx = getFxRate as unknown as Mock;

const DAY = 86_400_000;

function dayStartUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const TODAY = dayStartUTC(new Date());

function daysAgo(n: number): Date {
  return new Date(TODAY.getTime() - n * DAY);
}

/** A row as returned by prisma.userPortfolio.findMany({ include: { asset: true } }). */
function row(overrides: {
  id?: number;
  symbol: string;
  assetType: string;
  currency?: string;
  quantity: number;
  avgBuyPrice?: number | null;
  faceValue?: number | null;
  tae?: number | null;
  createdAt: Date;
}) {
  return {
    id: overrides.id ?? 1,
    quantity: overrides.quantity,
    avgBuyPrice: overrides.avgBuyPrice ?? null,
    faceValue: overrides.faceValue ?? null,
    tae: overrides.tae ?? null,
    couponFrequency: null,
    maturityDate: null,
    createdAt: overrides.createdAt,
    asset: {
      symbol: overrides.symbol,
      name: overrides.symbol,
      assetType: overrides.assetType,
      currency: overrides.currency ?? "USD",
    },
  };
}

/** Daily closes keyed at UTC day boundaries, from `fromDaysAgo` down to today. */
function dailyHistory(fromDaysAgo: number, closeFor: (daysAgo: number) => number) {
  const series = [];
  for (let i = fromDaysAgo; i >= 0; i--) {
    series.push({ date: daysAgo(i).toISOString().split("T")[0], close: closeFor(i) });
  }
  return { series };
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue({ baseCurrency: "USD" });
  mockFx.mockResolvedValue(1);
});

describe("getPortfolioHistory — empty portfolio", () => {
  it("returns zeroed data and a null startDate", async () => {
    findMany.mockResolvedValue([]);
    const h = await getPortfolioHistory("u1", "all");
    expect(h.series).toEqual([]);
    expect(h.currentValue).toBe(0);
    expect(h.totalInvested).toBe(0);
    expect(h.profitLoss).toBe(0);
    expect(h.startDate).toBeNull();
    expect(h.movers).toEqual([]);
  });
});

describe("getPortfolioHistory — cash is flat at cost", () => {
  it("keeps every point at the invested amount and zero P/L", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "CASH", assetType: "cash", quantity: 5000, createdAt: daysAgo(30) }),
    ]);
    const h = await getPortfolioHistory("u1", "all");
    expect(h.totalInvested).toBe(5000);
    expect(h.currentValue).toBe(5000);
    expect(h.profitLoss).toBe(0);
    expect(h.series.every((p) => p.value === 5000)).toBe(true);
    // Cash is not a market asset: no history fetch.
    expect(mockHistory).not.toHaveBeenCalled();
  });
});

describe("getPortfolioHistory — savings compounds by TAE", () => {
  it("grows above cost following (1 + tae)^years", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "SAV", assetType: "savings", quantity: 1000, tae: 5, createdAt: daysAgo(365) }),
    ]);
    const h = await getPortfolioHistory("u1", "all");
    // principal 1000 at 5% for ~1 year -> ~1050.
    expect(h.totalInvested).toBe(1000);
    expect(h.currentValue).toBeGreaterThan(1045);
    expect(h.currentValue).toBeLessThan(1055);
    expect(h.profitLoss).toBeCloseTo(h.currentValue - 1000, 5);
  });
});

describe("getPortfolioHistory — market asset follows history with forward-fill", () => {
  it("values the position at the latest close and nets deposits out of P/L", async () => {
    findMany.mockResolvedValue([
      row({
        symbol: "AAPL",
        assetType: "stock",
        quantity: 10,
        avgBuyPrice: 100,
        createdAt: daysAgo(60),
      }),
    ]);
    // Rises linearly from 100 (60d ago) to 120 (today).
    mockHistory.mockResolvedValue(
      dailyHistory(60, (d) => 120 - (d / 60) * 20)
    );

    const h = await getPortfolioHistory("u1", "all");
    expect(h.totalInvested).toBe(1000); // 10 * 100
    expect(h.currentValue).toBeCloseTo(1200, 0); // 10 * 120
    // First point anchors to cost, deposits inside the "all" window net to 0.
    expect(h.series[0].value).toBe(1000);
    expect(h.profitLoss).toBeCloseTo(200, 0);
    expect(h.profitLossPct).toBeCloseTo(20, 0);
  });

  it("applies FX to a non-base-currency position", async () => {
    mockFx.mockResolvedValue(1.1); // EUR->USD
    findMany.mockResolvedValue([
      row({
        symbol: "SAP.DE",
        assetType: "stock",
        currency: "EUR",
        quantity: 10,
        avgBuyPrice: 100,
        createdAt: daysAgo(60),
      }),
    ]);
    mockHistory.mockResolvedValue(dailyHistory(60, () => 100));
    const h = await getPortfolioHistory("u1", "all");
    // 10 * 100 EUR * 1.1 = 1100 USD, flat price so P/L ~ 0.
    expect(h.currentValue).toBeCloseTo(1100, 0);
    expect(h.totalInvested).toBeCloseTo(1100, 0);
    expect(h.profitLoss).toBeCloseTo(0, 0);
  });
});

describe("getPortfolioHistory — falls back to cost when history is unavailable", () => {
  it("does not drop the position when getAssetHistory throws", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "AAPL", assetType: "stock", quantity: 10, avgBuyPrice: 100, createdAt: daysAgo(60) }),
    ]);
    mockHistory.mockRejectedValue(new Error("SERVICE_UNAVAILABLE"));
    const h = await getPortfolioHistory("u1", "all");
    // Flat at cost -> current value equals invested, no crash.
    expect(h.currentValue).toBeCloseTo(1000, 0);
    expect(h.profitLoss).toBeCloseTo(0, 0);
  });
});

describe("getPortfolioKpis", () => {
  it("derives today's move from the last two daily points", async () => {
    findMany.mockResolvedValue([
      row({ symbol: "AAPL", assetType: "stock", quantity: 10, avgBuyPrice: 100, createdAt: daysAgo(200) }),
    ]);
    // +1 per share per day toward today: today close 200, yesterday 199.
    mockHistory.mockResolvedValue(dailyHistory(45, (d) => 200 - d));

    const kpis = await getPortfolioKpis("u1");
    expect(kpis.invested).toBe(1000);
    // today's delta = 10 shares * (200 - 199) = 10.
    expect(kpis.todayChange).toBeCloseTo(10, 0);
    expect(kpis.todayChange).toBeGreaterThan(0);
    // 30d move is positive over a rising series.
    expect(kpis.change30d).toBeGreaterThan(0);
    expect(kpis.baseCurrency).toBe("USD");
  });
});
