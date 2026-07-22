import "server-only";
import { prisma } from "./db";
import * as chronos from "./chronos";
import { getAssetHistory } from "./market-data";

const inflightRequests = new Map<string, Promise<PredictionResponse | null>>();

interface PredictionPoint {
  date: string;
  predicted_close: number;
  confidence_low: number | null;
  confidence_high: number | null;
}

interface PredictionResponse {
  symbol: string;
  assetId: number;
  horizon: string;
  predictions: PredictionPoint[];
  source: string;
  cachedAt: string;
  ttl: number;
  modelVersion: string;
  inferenceTimeMs?: number;
  warning: string | null;
}

function parseHorizon(horizon: string): number {
  const map: Record<string, number> = {
    "3m": 3,
    "6m": 6,
    "1y": 12,
    "2y": 24,
    "5y": 60,
  };
  return map[horizon] || 6;
}

export async function getAssetPrediction(
  assetId: number,
  symbol: string,
  horizon: string,
  ttl: number
): Promise<PredictionResponse | null> {
  const cacheKey = `${assetId}:${horizon}`;

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const promise = fetchPredictionInternal(assetId, symbol, horizon, ttl);
  inflightRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

async function fetchPredictionInternal(
  assetId: number,
  symbol: string,
  horizon: string,
  ttl: number
): Promise<PredictionResponse | null> {
  // Tier 2: DB cache with TTL
  const ttlDate = new Date(Date.now() - ttl * 1000);
  const cached = await prisma.assetPrediction.findMany({
    where: {
      assetId,
      predictionHorizon: horizon,
      fetchedAt: { gt: ttlDate },
    },
    orderBy: { predictionDate: "asc" },
  });

  if (cached.length > 0) {
    return {
      symbol,
      assetId,
      horizon,
      predictions: cached.map((r) => ({
        date: r.predictionDate.toISOString().split("T")[0],
        predicted_close: Number(r.predictedClose),
        confidence_low: r.confidenceLow != null ? Number(r.confidenceLow) : null,
        confidence_high:
          r.confidenceHigh != null ? Number(r.confidenceHigh) : null,
      })),
      source: "cache",
      cachedAt: cached[0].fetchedAt.toISOString(),
      ttl,
      modelVersion: cached[0].modelVersion,
      warning: null,
    };
  }

  const computed = await predictFromHistory(symbol, horizon);
  if (!computed) return tryStaleCache(assetId, symbol, horizon);

  // Store predictions in DB
  try {
    for (const pred of computed.predictions) {
      await prisma.assetPrediction.upsert({
        where: {
          assetId_predictionHorizon_predictionDate: {
            assetId,
            predictionHorizon: horizon,
            predictionDate: new Date(pred.date),
          },
        },
        update: {
          predictedClose: pred.predicted_close,
          confidenceLow: pred.confidence_low,
          confidenceHigh: pred.confidence_high,
          modelVersion: computed.modelVersion,
          fetchedAt: new Date(),
        },
        create: {
          assetId,
          predictionHorizon: horizon,
          predictionDate: new Date(pred.date),
          predictedClose: pred.predicted_close,
          confidenceLow: pred.confidence_low,
          confidenceHigh: pred.confidence_high,
          modelVersion: computed.modelVersion,
        },
      });
    }
  } catch {
    // Non-critical: we still have the ML result
  }

  return {
    symbol,
    assetId,
    horizon,
    predictions: computed.predictions,
    source: "ml_service",
    cachedAt: new Date().toISOString(),
    ttl,
    modelVersion: computed.modelVersion,
    inferenceTimeMs: computed.inferenceTimeMs,
    warning: null,
  };
}

export interface PredictionComputation {
  predictions: PredictionPoint[];
  modelVersion: string;
  inferenceTimeMs?: number;
}

/**
 * Runs the Chronos forecast for a symbol straight from its Yahoo history.
 * No DB access: it neither reads the prediction cache nor persists anything,
 * so it works for symbols that are not (yet) in the `assets` table.
 * Returns null on any failure or insufficient history.
 */
export async function predictFromHistory(
  symbol: string,
  horizon: string,
  options: { persist?: boolean } = {}
): Promise<PredictionComputation | null> {
  const historyMonths = Math.max(24, parseHorizon(horizon) * 2);

  let historicalData;
  try {
    historicalData = await getAssetHistory(symbol, historyMonths, "1mo", 3600, {
      persist: options.persist ?? true,
    });
  } catch {
    return null;
  }
  if (!historicalData?.series || historicalData.series.length < 6) return null;

  const history = historicalData.series.map((p) => ({
    date: p.date,
    close: p.close,
  }));

  let mlResult;
  try {
    mlResult = await chronos.getPrediction(symbol, history, horizon);
  } catch {
    return null;
  }
  if (!mlResult?.predictions) return null;

  return {
    predictions: mlResult.predictions.map((p) => ({
      date: p.date,
      predicted_close: p.predicted_close,
      confidence_low: p.confidence_low ?? null,
      confidence_high: p.confidence_high ?? null,
    })),
    modelVersion: mlResult.model_version,
    inferenceTimeMs: mlResult.inference_time_ms,
  };
}

async function tryStaleCache(
  assetId: number,
  symbol: string,
  horizon: string
): Promise<PredictionResponse | null> {
  const stale = await prisma.assetPrediction.findMany({
    where: { assetId, predictionHorizon: horizon },
    orderBy: { predictionDate: "asc" },
  });

  if (stale.length > 0) {
    const ageHours = Math.floor(
      (Date.now() - stale[0].fetchedAt.getTime()) / (1000 * 60 * 60)
    );

    return {
      symbol,
      assetId,
      horizon,
      predictions: stale.map((r) => ({
        date: r.predictionDate.toISOString().split("T")[0],
        predicted_close: Number(r.predictedClose),
        confidence_low: r.confidenceLow != null ? Number(r.confidenceLow) : null,
        confidence_high:
          r.confidenceHigh != null ? Number(r.confidenceHigh) : null,
      })),
      source: "stale_cache",
      cachedAt: stale[0].fetchedAt.toISOString(),
      ttl: 0,
      modelVersion: stale[0].modelVersion,
      warning: `Predictions may be outdated (${ageHours} hours old). ML service temporarily unavailable.`,
    };
  }

  return null;
}
