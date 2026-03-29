import "server-only";
import { getYahooQuote, getHistoricalData } from "./yahoo-finance";
import { prisma } from "./db";

export async function getQuote(symbol: string) {
  return getYahooQuote(symbol);
}

export async function getFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error(`No FX rate found for ${from} -> ${to}`);
  }

  return rate;
}

// In-memory promise cache for concurrent request deduplication
const inflightRequests = new Map<string, Promise<AssetHistoryResponse>>();

interface SeriesPoint {
  date: string;
  timestamp: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  currency: string;
}

interface AssetHistoryResponse {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  currentPrice: number | null;
  range: string;
  interval: string;
  dataPoints: number;
  series: SeriesPoint[];
  source: string;
  cachedAt: string;
  ttl: number;
  warning?: string;
}

function inferAssetType(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.includes("-USD")) return "crypto";
  if (upper.includes("=F")) return "commodity";
  if (upper.includes("=X")) return "currency";
  return "stock";
}

function calculateExpectedPoints(months: number, interval: string): number {
  if (interval === "1d") return months * 21;
  if (interval === "1wk") return Math.floor(months * 4.3);
  return months;
}

export async function getAssetHistory(
  symbol: string,
  months: number,
  interval: "1d" | "1wk" | "1mo",
  ttl: number
): Promise<AssetHistoryResponse> {
  const cacheKey = `${symbol.toUpperCase()}:${months}:${interval}`;

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const promise = fetchAssetHistoryInternal(symbol, months, interval, ttl);
  inflightRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

async function fetchAssetHistoryInternal(
  symbol: string,
  months: number,
  interval: "1d" | "1wk" | "1mo",
  ttl: number
): Promise<AssetHistoryResponse> {
  const symbolUpper = symbol.toUpperCase();
  const assetType = inferAssetType(symbolUpper);

  // Upsert asset
  const asset = await prisma.asset.upsert({
    where: { symbol_assetType: { symbol: symbolUpper, assetType } },
    update: {},
    create: { symbol: symbolUpper, name: symbolUpper, assetType, currency: "USD" },
  });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Check DB cache with TTL
  const ttlDate = new Date(Date.now() - ttl * 1000);
  const cached = await prisma.assetPriceHistory.findMany({
    where: {
      assetId: asset.id,
      month: { gte: startDate },
      fetchedAt: { gt: ttlDate },
    },
    orderBy: { month: "asc" },
  });

  const expectedPoints = calculateExpectedPoints(months, interval);
  if (cached.length >= expectedPoints * 0.8 && cached.length > 0) {
    return formatResponse(asset, cached, months, interval, "cache", ttl);
  }

  // Fetch from Yahoo
  let yahooData;
  try {
    yahooData = await getHistoricalData(symbolUpper, startDate, endDate, interval);
  } catch {
    // Stale cache fallback
    const stale = await prisma.assetPriceHistory.findMany({
      where: { assetId: asset.id, month: { gte: startDate } },
      orderBy: { month: "asc" },
    });

    if (stale.length > 0) {
      return formatResponse(
        asset,
        stale,
        months,
        interval,
        "stale_cache",
        ttl,
        "Data may be outdated due to external service unavailability"
      );
    }

    throw new Error("SERVICE_UNAVAILABLE");
  }

  if (yahooData.length === 0) {
    throw new Error("SYMBOL_NOT_FOUND");
  }

  // Upsert to DB
  for (const dp of yahooData) {
    try {
      await prisma.assetPriceHistory.upsert({
        where: {
          assetId_month: { assetId: asset.id, month: new Date(dp.date) },
        },
        update: {
          open: dp.open,
          high: dp.high,
          low: dp.low,
          close: dp.close,
          volume: dp.volume,
          currency: dp.currency,
          fetchedAt: new Date(),
        },
        create: {
          assetId: asset.id,
          month: new Date(dp.date),
          open: dp.open,
          high: dp.high,
          low: dp.low,
          close: dp.close,
          volume: dp.volume,
          currency: dp.currency,
        },
      });
    } catch {
      // Skip constraint violations
    }
  }

  // Re-read from DB for consistent format
  const freshData = await prisma.assetPriceHistory.findMany({
    where: { assetId: asset.id, month: { gte: startDate } },
    orderBy: { month: "asc" },
  });

  return formatResponse(asset, freshData, months, interval, "yahoo", ttl);
}

function formatResponse(
  asset: { id: number; symbol: string; name: string; assetType: string; currency: string },
  rows: Array<{
    month: Date;
    open: unknown;
    high: unknown;
    low: unknown;
    close: unknown;
    volume: bigint;
    currency: string;
    fetchedAt: Date;
  }>,
  months: number,
  interval: string,
  source: string,
  ttl: number,
  warning?: string
): AssetHistoryResponse {
  const series: SeriesPoint[] = rows
    .map((row) => ({
      date: row.month.toISOString().split("T")[0],
      timestamp: new Date(row.month).getTime(),
      close: Number(row.close),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      volume: Number(row.volume),
      currency: row.currency,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    currency: series[0]?.currency || asset.currency,
    currentPrice: series[series.length - 1]?.close || null,
    range: `${months}m`,
    interval,
    dataPoints: series.length,
    series,
    source,
    cachedAt: rows[0]?.fetchedAt?.toISOString() || new Date().toISOString(),
    ttl,
    ...(warning ? { warning } : {}),
  };
}
