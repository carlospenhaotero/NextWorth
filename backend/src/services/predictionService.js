// src/services/predictionService.js
// Service for managing asset price predictions with 3-tier caching

import pool from "../config/db.js";
import * as chronosService from "./chronosService.js";
import { getAssetHistory } from "./marketDataService.js";

// In-memory Promise cache for concurrent request deduplication
const inflightRequests = new Map();

/**
 * Get cache key for concurrent request deduplication
 * @param {number} assetId - Asset ID
 * @param {string} horizon - Prediction horizon
 * @returns {string} Cache key
 */
function getCacheKey(assetId, horizon) {
  return `${assetId}:${horizon}`;
}

/**
 * Parse horizon string to number of months
 * @param {string} horizon - Horizon string ('3m', '6m', '1y', '2y', '5y')
 * @returns {number} Number of months
 */
function parseHorizon(horizon) {
  const horizonMap = {
    '3m': 3,
    '6m': 6,
    '1y': 12,
    '2y': 24,
    '5y': 60
  };
  return horizonMap[horizon] || 6;
}

/**
 * Get predictions for an asset with 3-tier caching
 *
 * Tier 1: In-memory promise cache (concurrent request deduplication)
 * Tier 2: PostgreSQL cache with TTL
 * Tier 3: Stale cache fallback (if ML service fails)
 *
 * @param {number} assetId - Asset ID
 * @param {string} symbol - Asset symbol
 * @param {string} horizon - Prediction horizon ('3m', '6m', '1y', '2y', '5y')
 * @param {number} ttl - Cache TTL in seconds
 * @returns {Promise<Object|null>} Prediction data with metadata
 */
export async function getAssetPrediction(assetId, symbol, horizon, ttl) {
  const cacheKey = getCacheKey(assetId, horizon);

  // Tier 1: Check if request already in-flight
  if (inflightRequests.has(cacheKey)) {
    console.log(`🔄 Returning in-flight prediction request for ${symbol} (${horizon})`);
    return await inflightRequests.get(cacheKey);
  }

  // Create new promise and cache it
  const promise = fetchPredictionInternal(assetId, symbol, horizon, ttl);
  inflightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    // Always cleanup, regardless of success or failure
    inflightRequests.delete(cacheKey);
  }
}

/**
 * Internal function that performs the actual prediction fetch logic
 * @private
 */
async function fetchPredictionInternal(assetId, symbol, horizon, ttl) {
  console.log(`🔮 Prediction request: ${symbol} (horizon: ${horizon}, ttl: ${ttl}s)`);

  // Tier 2: Check database cache with TTL
  const cacheCheckQuery = `
    SELECT prediction_date, predicted_close, confidence_low, confidence_high,
           model_version, fetched_at
    FROM asset_predictions
    WHERE asset_id = $1
      AND prediction_horizon = $2
      AND fetched_at > NOW() - INTERVAL '1 second' * $3
    ORDER BY prediction_date ASC;
  `;

  const cacheResult = await pool.query(cacheCheckQuery, [assetId, horizon, ttl]);

  // If we have fresh cached predictions, return them
  if (cacheResult.rows.length > 0) {
    console.log(`✅ Prediction cache HIT for ${symbol} (${horizon}): ${cacheResult.rows.length} points`);

    return {
      symbol,
      assetId,
      horizon,
      predictions: cacheResult.rows.map(row => ({
        date: row.prediction_date.toISOString().split('T')[0],
        predicted_close: parseFloat(row.predicted_close)
      })),
      source: 'cache',
      cachedAt: cacheResult.rows[0].fetched_at.toISOString(),
      ttl,
      modelVersion: cacheResult.rows[0].model_version,
      warning: null
    };
  }

  console.log(`❌ Prediction cache MISS for ${symbol} (${horizon}), generating...`);

  // Step 1: Fetch historical data for the asset
  // We need at least 24 months of history for good predictions
  const historyMonths = Math.max(24, parseHorizon(horizon) * 2);
  let historicalData;

  try {
    historicalData = await getAssetHistory(symbol, historyMonths, '1mo', 3600);

    if (!historicalData || !historicalData.series || historicalData.series.length < 6) {
      console.error(`❌ Insufficient historical data for ${symbol}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to fetch historical data for ${symbol}:`, error.message);
    return await tryStaleCache(assetId, symbol, horizon);
  }

  // Step 2: Format history for ML service
  const history = historicalData.series.map(point => ({
    date: point.date,
    close: point.close
  }));

  // Step 3: Call ML service for predictions
  let mlResult;
  try {
    mlResult = await chronosService.getPrediction(symbol, history, horizon);

    if (!mlResult || !mlResult.predictions) {
      console.error(`❌ ML service returned invalid result for ${symbol}`);
      return await tryStaleCache(assetId, symbol, horizon);
    }
  } catch (error) {
    console.error(`❌ ML service failed for ${symbol}:`, error.message);
    return await tryStaleCache(assetId, symbol, horizon);
  }

  // Step 4: Store predictions in database
  try {
    await storePredictions(assetId, horizon, mlResult.predictions, mlResult.model_version);
    console.log(`💾 Stored ${mlResult.predictions.length} predictions for ${symbol} (${horizon})`);
  } catch (error) {
    console.error(`⚠️ Failed to store predictions in DB:`, error.message);
    // Continue anyway - we have the predictions from ML service
  }

  // Step 5: Return formatted response
  return {
    symbol,
    assetId,
    horizon,
    predictions: mlResult.predictions.map(pred => ({
      date: pred.date,
      predicted_close: pred.predicted_close
    })),
    source: 'ml_service',
    cachedAt: new Date().toISOString(),
    ttl,
    modelVersion: mlResult.model_version,
    inferenceTimeMs: mlResult.inference_time_ms,
    warning: null
  };
}

/**
 * Try to serve stale cache when ML service fails
 * @private
 */
async function tryStaleCache(assetId, symbol, horizon) {
  console.warn(`⚠️ Attempting stale cache fallback for ${symbol} (${horizon})`);

  const staleQuery = `
    SELECT prediction_date, predicted_close, confidence_low, confidence_high,
           model_version, fetched_at
    FROM asset_predictions
    WHERE asset_id = $1
      AND prediction_horizon = $2
    ORDER BY prediction_date ASC;
  `;

  const staleResult = await pool.query(staleQuery, [assetId, horizon]);

  if (staleResult.rows.length > 0) {
    const ageInHours = Math.floor(
      (Date.now() - new Date(staleResult.rows[0].fetched_at).getTime()) / (1000 * 60 * 60)
    );

    console.warn(`⚠️ Serving stale cache for ${symbol} (${horizon}): ${staleResult.rows.length} points, ${ageInHours}h old`);

    return {
      symbol,
      assetId,
      horizon,
      predictions: staleResult.rows.map(row => ({
        date: row.prediction_date.toISOString().split('T')[0],
        predicted_close: parseFloat(row.predicted_close)
      })),
      source: 'stale_cache',
      cachedAt: staleResult.rows[0].fetched_at.toISOString(),
      ttl: 0,
      modelVersion: staleResult.rows[0].model_version,
      warning: `Predictions may be outdated (${ageInHours} hours old). ML service temporarily unavailable.`
    };
  }

  console.error(`❌ No stale cache available for ${symbol} (${horizon})`);
  return null;
}

/**
 * Store predictions in database
 * @private
 */
async function storePredictions(assetId, horizon, predictions, modelVersion) {
  // Use UPSERT to handle updates
  const upsertQuery = `
    INSERT INTO asset_predictions (
      asset_id, prediction_horizon, prediction_date,
      predicted_close, model_version, fetched_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (asset_id, prediction_horizon, prediction_date)
    DO UPDATE SET
      predicted_close = EXCLUDED.predicted_close,
      model_version = EXCLUDED.model_version,
      fetched_at = NOW();
  `;

  // Store predictions sequentially to avoid pool exhaustion
  for (const prediction of predictions) {
    await pool.query(upsertQuery, [
      assetId,
      horizon,
      prediction.date,
      prediction.predicted_close,
      modelVersion
    ]);
  }
}

/**
 * Delete old predictions (cleanup utility)
 * @param {number} daysOld - Delete predictions older than this many days
 */
export async function cleanupOldPredictions(daysOld = 90) {
  const deleteQuery = `
    DELETE FROM asset_predictions
    WHERE fetched_at < NOW() - INTERVAL '1 day' * $1;
  `;

  const result = await pool.query(deleteQuery, [daysOld]);
  console.log(`🧹 Cleaned up ${result.rowCount} old predictions (>${daysOld} days)`);
  return result.rowCount;
}
