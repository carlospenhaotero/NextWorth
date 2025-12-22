// src/services/marketDataService.js
// Servicio unificado para obtener datos de mercado via Yahoo Finance

import { getYahooQuote, getHistoricalData } from "./yahooFinanceService.js";
import pool from "../config/db.js";

/**
 * Obtiene la cotización actual de un símbolo via Yahoo Finance
 * @param {string} symbol - Símbolo en formato Yahoo Finance
 */
export async function getQuote(symbol) {
  const quote = await getYahooQuote(symbol);
  return quote;
}

/**
 * Obtiene tipo de cambio entre dos monedas
 * Usa Frankfurter API (gratuita y sin API key)
 */
export async function getFxRate(fromCurrency, toCurrency) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error al llamar a Frankfurter: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const rate = data.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error(
      `No se encontró tipo de cambio de ${from} a ${to} en Frankfurter`
    );
  }

  return rate;
}

// In-memory Promise cache for concurrent requests
const inflightRequests = new Map();

/**
 * Calculate expected number of data points based on time range and interval
 * @param {number} months - Number of months in the range
 * @param {string} interval - Data interval ('1d', '1wk', '1mo')
 * @returns {number} Expected number of data points
 */
function calculateExpectedPoints(months, interval) {
  if (interval === '1d') return months * 21; // ~21 trading days/month
  if (interval === '1wk') return Math.floor(months * 4.3); // ~4.3 weeks/month
  if (interval === '1mo') return months; // 1 point per month
  return months;
}

/**
 * Infer asset type from symbol format
 * @param {string} symbol - Asset symbol
 * @returns {string} Asset type
 */
function inferAssetType(symbol) {
  const upper = symbol.toUpperCase();
  if (upper.includes('-USD')) return 'crypto';
  if (upper.includes('=F')) return 'commodities';
  if (upper.includes('=X')) return 'currency';
  return 'stocks';
}

/**
 * Get cache key for concurrent request deduplication
 * @param {string} symbol - Asset symbol
 * @param {number} months - Time range in months
 * @param {string} interval - Data interval
 * @returns {string} Cache key
 */
function getCacheKey(symbol, months, interval) {
  return `${symbol.toUpperCase()}:${months}:${interval}`;
}

/**
 * Fetches historical price data for an asset with intelligent caching
 * @param {string} symbol - Asset symbol (Yahoo Finance format)
 * @param {number} months - Number of months to fetch
 * @param {string} interval - Data interval ('1d', '1wk', '1mo')
 * @param {number} ttl - Cache TTL in seconds
 * @returns {Promise<Object>} Historical data with metadata
 */
export async function getAssetHistory(symbol, months, interval, ttl) {
  const cacheKey = getCacheKey(symbol, months, interval);

  // Check if request already in-flight
  if (inflightRequests.has(cacheKey)) {
    console.log(`🔄 Returning in-flight request for ${cacheKey}`);
    return await inflightRequests.get(cacheKey);
  }

  // Create new promise and cache it
  const promise = fetchAssetHistoryInternal(symbol, months, interval, ttl);
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
 * Internal function that performs the actual fetch logic
 * @private
 */
async function fetchAssetHistoryInternal(symbol, months, interval, ttl) {
  const symbolUpper = symbol.toUpperCase();

  console.log(`📊 History request: ${symbolUpper} (${months}m, ${interval})`);

  // Step 1: Get or create asset in database
  const assetType = inferAssetType(symbolUpper);
  const assetQuery = `
    INSERT INTO assets (symbol, name, asset_type, currency)
    VALUES ($1, $1, $2, 'USD')
    ON CONFLICT (symbol, asset_type)
    DO UPDATE SET symbol = EXCLUDED.symbol
    RETURNING id, symbol, name, asset_type, currency;
  `;

  const assetResult = await pool.query(assetQuery, [symbolUpper, assetType]);
  const asset = assetResult.rows[0];

  // Step 2: Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Step 3: Check database cache with TTL
  const cacheCheckQuery = `
    SELECT month, open, high, low, close, volume, currency, fetched_at
    FROM asset_price_history
    WHERE asset_id = $1
      AND month >= $2
      AND fetched_at > NOW() - INTERVAL '1 second' * $3
    ORDER BY month ASC;
  `;

  const cacheResult = await pool.query(cacheCheckQuery, [
    asset.id,
    startDate.toISOString().split('T')[0],
    ttl
  ]);

  // Calculate if cache is sufficient
  const expectedPoints = calculateExpectedPoints(months, interval);
  const hasSufficientData = cacheResult.rows.length >= (expectedPoints * 0.8);

  if (hasSufficientData && cacheResult.rows.length > 0) {
    console.log(`✅ Cache HIT for ${symbolUpper} (${cacheResult.rows.length} points)`);
    return formatResponse(asset, cacheResult.rows, months, interval, 'cache', ttl);
  }

  console.log(`❌ Cache MISS for ${symbolUpper}, fetching from Yahoo...`);

  // Step 4: Fetch from Yahoo Finance
  let yahooData;
  try {
    yahooData = await getHistoricalData(symbolUpper, startDate, endDate, interval);
  } catch (yahooError) {
    console.error(`⚠️ Yahoo Finance failed for ${symbolUpper}:`, yahooError.message);

    // Fallback: Try to get stale cache (without TTL filter)
    const staleQuery = `
      SELECT month, open, high, low, close, volume, currency, fetched_at
      FROM asset_price_history
      WHERE asset_id = $1
        AND month >= $2
      ORDER BY month ASC;
    `;

    const staleResult = await pool.query(staleQuery, [
      asset.id,
      startDate.toISOString().split('T')[0]
    ]);

    if (staleResult.rows.length > 0) {
      console.warn(`⚠️ Serving stale cache for ${symbolUpper} (${staleResult.rows.length} points)`);
      return formatResponse(
        asset,
        staleResult.rows,
        months,
        interval,
        'stale_cache',
        ttl,
        'Data may be outdated due to external service unavailability'
      );
    }

    // No cache and Yahoo failed = service unavailable
    throw new Error('SERVICE_UNAVAILABLE');
  }

  if (yahooData.length === 0) {
    throw new Error('SYMBOL_NOT_FOUND');
  }

  // Step 5: UPSERT Yahoo data to database (sequential to avoid pool exhaustion)
  const upsertQuery = `
    INSERT INTO asset_price_history
      (asset_id, month, open, high, low, close, volume, currency, fetched_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (asset_id, month)
    DO UPDATE SET
      open = EXCLUDED.open,
      high = EXCLUDED.high,
      low = EXCLUDED.low,
      close = EXCLUDED.close,
      volume = EXCLUDED.volume,
      currency = EXCLUDED.currency,
      fetched_at = NOW()
    RETURNING month, open, high, low, close, volume, currency, fetched_at;
  `;

  const upsertedRows = [];
  for (const dataPoint of yahooData) {
    try {
      const result = await pool.query(upsertQuery, [
        asset.id,
        dataPoint.date,
        dataPoint.open,
        dataPoint.high,
        dataPoint.low,
        dataPoint.close,
        dataPoint.volume,
        dataPoint.currency
      ]);
      upsertedRows.push(result.rows[0]);
    } catch (error) {
      // Handle currency constraint violation (only USD/EUR allowed)
      if (error.message.includes('asset_price_history_currency_chk')) {
        console.warn(`⚠️ Currency ${dataPoint.currency} not supported, skipping ${symbolUpper} ${dataPoint.date}`);
        continue;
      }
      throw error;
    }
  }

  console.log(`✅ Persisted ${upsertedRows.length} data points for ${symbolUpper}`);

  // Step 6: Return formatted response
  return formatResponse(asset, upsertedRows, months, interval, 'yahoo', ttl);
}

/**
 * Format database rows to API contract response
 * @private
 */
function formatResponse(asset, rows, months, interval, source, ttl, warning = null) {
  const series = rows.map(row => ({
    date: row.month.toISOString().split('T')[0],
    timestamp: new Date(row.month).getTime(),
    close: parseFloat(row.close),
    open: parseFloat(row.open),
    high: parseFloat(row.high),
    low: parseFloat(row.low),
    volume: parseInt(row.volume || 0),
    currency: row.currency
  }));

  // Sort chronologically (oldest to newest)
  series.sort((a, b) => a.timestamp - b.timestamp);

  const response = {
    symbol: asset.symbol,
    yahooSymbol: asset.symbol,
    name: asset.name,
    assetType: asset.asset_type,
    currency: series[0]?.currency || asset.currency || 'USD',
    currentPrice: series[series.length - 1]?.close || null,
    range: `${months}m`,
    interval: interval,
    dataPoints: series.length,
    series,
    metadata: {},
    source,
    cachedAt: rows[0]?.fetched_at?.toISOString() || new Date().toISOString(),
    ttl
  };

  if (warning) {
    response.warning = warning;
  }

  return response;
}