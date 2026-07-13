import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

vi.mock("@/server/yahoo-finance", () => ({
  getYahooQuote: vi.fn(),
  getHistoricalData: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    asset: { upsert: vi.fn() },
    assetPriceHistory: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

import { getHistoricalData } from "@/server/yahoo-finance";
import { prisma } from "@/server/db";
import { getAssetHistory, getFxRate } from "@/server/market-data";

const mockYahoo = getHistoricalData as unknown as Mock;
const assetUpsert = prisma.asset.upsert as unknown as Mock;
const historyFindMany = prisma.assetPriceHistory.findMany as unknown as Mock;
const historyUpsert = prisma.assetPriceHistory.upsert as unknown as Mock;

/** A Yahoo daily/monthly datapoint. */
function yahooPoint(date: string, close: number) {
  return { date, open: close, high: close, low: close, close, volume: 1000, currency: "USD" };
}

/** A cached AssetPriceHistory row. */
function cacheRow(month: string, close: number) {
  return {
    month: new Date(month),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
    currency: "USD",
    fetchedAt: new Date(),
  };
}

function yahooSeries(n: number): ReturnType<typeof yahooPoint>[] {
  return Array.from({ length: n }, (_, i) =>
    yahooPoint(`2025-${String((i % 12) + 1).padStart(2, "0")}-01`, 100 + i)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  assetUpsert.mockResolvedValue({ id: 1, symbol: "AAPL", name: "AAPL", assetType: "stock", currency: "USD" });
  historyUpsert.mockResolvedValue({});
});

describe("getFxRate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("short-circuits to 1 for the same currency without a network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getFxRate("USD", "usd")).resolves.toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses the rate from the Frankfurter response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: { USD: 1.08 } }) })
    );
    await expect(getFxRate("EUR", "USD")).resolves.toBe(1.08);
  });

  it("throws when the API responds non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(getFxRate("EUR", "USD")).rejects.toThrow(/Frankfurter API error/);
  });

  it("throws when the target rate is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: {} }) })
    );
    await expect(getFxRate("EUR", "USD")).rejects.toThrow(/No FX rate/);
  });
});

describe("getAssetHistory — tier 2: DB cache", () => {
  it("serves from cache when enough fresh points exist, without calling Yahoo", async () => {
    // 24 fresh rows >= 80% of 24 expected monthly points.
    historyFindMany.mockResolvedValueOnce(
      Array.from({ length: 24 }, (_, i) => cacheRow(`2024-${String((i % 12) + 1).padStart(2, "0")}-01`, 100 + i))
    );
    const res = await getAssetHistory("AAPL", 24, "1mo", 3600);
    expect(res.source).toBe("cache");
    expect(res.series.length).toBe(24);
    expect(mockYahoo).not.toHaveBeenCalled();
  });
});

describe("getAssetHistory — tier 3: Yahoo fetch on cold cache", () => {
  it("fetches from Yahoo, upserts, and re-reads with source 'yahoo'", async () => {
    historyFindMany
      .mockResolvedValueOnce([]) // cold cache
      .mockResolvedValueOnce(
        Array.from({ length: 12 }, (_, i) => cacheRow(`2025-${String(i + 1).padStart(2, "0")}-01`, 100 + i))
      ); // re-read after upsert
    mockYahoo.mockResolvedValue(yahooSeries(12));

    const res = await getAssetHistory("AAPL", 12, "1mo", 3600);
    expect(mockYahoo).toHaveBeenCalledOnce();
    expect(historyUpsert).toHaveBeenCalledTimes(12);
    expect(res.source).toBe("yahoo");
    expect(res.series.length).toBe(12);
  });

  it("throws SYMBOL_NOT_FOUND when Yahoo returns nothing", async () => {
    historyFindMany.mockResolvedValueOnce([]);
    mockYahoo.mockResolvedValue([]);
    await expect(getAssetHistory("NOPE", 12, "1mo", 3600)).rejects.toThrow("SYMBOL_NOT_FOUND");
  });
});

describe("getAssetHistory — stale fallback", () => {
  it("serves stale cache with a warning when Yahoo fails", async () => {
    historyFindMany
      .mockResolvedValueOnce([]) // fresh cache empty
      .mockResolvedValueOnce([cacheRow("2025-01-01", 100), cacheRow("2025-02-01", 105)]); // stale
    mockYahoo.mockRejectedValue(new Error("network"));

    const res = await getAssetHistory("AAPL", 12, "1mo", 3600);
    expect(res.source).toBe("stale_cache");
    expect(res.warning).toBeDefined();
    expect(res.series.length).toBe(2);
  });

  it("throws SERVICE_UNAVAILABLE when Yahoo fails and there is no stale cache", async () => {
    historyFindMany
      .mockResolvedValueOnce([]) // fresh
      .mockResolvedValueOnce([]); // stale empty
    mockYahoo.mockRejectedValue(new Error("network"));
    await expect(getAssetHistory("AAPL", 12, "1mo", 3600)).rejects.toThrow("SERVICE_UNAVAILABLE");
  });
});

describe("getAssetHistory — persist:false (preview path)", () => {
  it("goes straight to Yahoo and never touches the DB", async () => {
    mockYahoo.mockResolvedValue(yahooSeries(6));
    const res = await getAssetHistory("TSLA", 6, "1mo", 3600, { persist: false });
    expect(res.source).toBe("yahoo");
    expect(res.series.length).toBe(6);
    expect(assetUpsert).not.toHaveBeenCalled();
    expect(historyFindMany).not.toHaveBeenCalled();
    expect(historyUpsert).not.toHaveBeenCalled();
  });
});

describe("getAssetHistory — tier 1: in-flight dedup", () => {
  it("shares one fetch across concurrent identical requests", async () => {
    let resolveYahoo!: (v: unknown) => void;
    mockYahoo.mockReturnValue(new Promise((r) => (resolveYahoo = r)));

    const p1 = getAssetHistory("NVDA", 6, "1mo", 3600, { persist: false });
    const p2 = getAssetHistory("NVDA", 6, "1mo", 3600, { persist: false });
    resolveYahoo(yahooSeries(6));
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(mockYahoo).toHaveBeenCalledOnce();
    expect(r1.series.length).toBe(6);
    expect(r2.series.length).toBe(6);
  });
});
