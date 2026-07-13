import "server-only";
import { predictFromHistory } from "./prediction";

/**
 * Preview forecasts for the add-asset flow.
 *
 * Unlike getAssetPrediction, this path never touches the database: the asset a
 * user is browsing may not exist in the `assets` table yet (it is only created
 * on save). We therefore run Chronos straight from Yahoo history and cache the
 * result in memory, keyed by symbol+horizon, with a short TTL. In-flight
 * requests are deduped so opening the same asset twice doesn't hit the ML
 * service twice.
 */

interface PreviewPoint {
  date: string;
  predicted_close: number;
}

export interface PreviewPredictionResponse {
  symbol: string;
  horizon: string;
  predictions: PreviewPoint[];
  source: "ml_service" | "cache";
  modelVersion: string;
  warning: string | null;
}

// 2h, same cadence as the DB-cached prediction path.
const TTL_MS = 7_200_000;

interface CacheEntry {
  value: PreviewPredictionResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PreviewPredictionResponse | null>>();

export async function getPreviewPrediction(
  symbol: string,
  horizon: string
): Promise<PreviewPredictionResponse | null> {
  const key = `${symbol.toUpperCase()}:${horizon}`;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, source: "cache" };
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = computePreview(symbol, horizon, key);
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

async function computePreview(
  symbol: string,
  horizon: string,
  key: string
): Promise<PreviewPredictionResponse | null> {
  const computed = await predictFromHistory(symbol, horizon, { persist: false });
  if (!computed) return null;

  const value: PreviewPredictionResponse = {
    symbol: symbol.toUpperCase(),
    horizon,
    predictions: computed.predictions,
    source: "ml_service",
    modelVersion: computed.modelVersion,
    warning: null,
  };

  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}
