# Asset Price History - Usage Examples

This document provides practical code examples for working with the `asset_price_history` table in NextWorth controllers and services.

## Table of Contents

1. [Basic CRUD Operations](#basic-crud-operations)
2. [Controller Integration](#controller-integration)
3. [Cache Management](#cache-management)
4. [Batch Operations](#batch-operations)
5. [Common Query Patterns](#common-query-patterns)

---

## Basic CRUD Operations

### 1. Insert Single Month Data

```javascript
import pool from '../config/db.js';

async function insertMonthlyPrice(assetId, monthData) {
  const query = `
    INSERT INTO asset_price_history (
      asset_id, month, open, high, low, close, volume, currency, fetched_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *;
  `;

  const values = [
    assetId,
    monthData.date, // e.g., '2024-01-01'
    monthData.open,
    monthData.high,
    monthData.low,
    monthData.close,
    monthData.volume,
    monthData.currency
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Example usage
const data = {
  date: '2024-01-01',
  open: 150.5,
  high: 152.3,
  low: 149.8,
  close: 151.2,
  volume: 45000000,
  currency: 'USD'
};

const inserted = await insertMonthlyPrice(5, data);
console.log('Inserted:', inserted);
```

### 2. Upsert (Insert or Update)

```javascript
async function upsertMonthlyPrice(assetId, monthData) {
  const query = `
    INSERT INTO asset_price_history (
      asset_id, month, open, high, low, close, volume, currency, fetched_at
    )
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
    RETURNING *;
  `;

  const values = [
    assetId,
    monthData.date,
    monthData.open,
    monthData.high,
    monthData.low,
    monthData.close,
    monthData.volume,
    monthData.currency
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Example usage
const updated = await upsertMonthlyPrice(5, data);
console.log('Upserted:', updated);
```

### 3. Get Historical Data for Asset

```javascript
async function getAssetHistory(assetId, months = 24) {
  const query = `
    SELECT
      TO_CHAR(month, 'YYYY-MM-DD') AS date,
      EXTRACT(EPOCH FROM month)::bigint * 1000 AS timestamp,
      open,
      high,
      low,
      close,
      volume,
      currency,
      fetched_at
    FROM asset_price_history
    WHERE asset_id = $1
    ORDER BY month ASC
    LIMIT $2;
  `;

  const result = await pool.query(query, [assetId, months]);
  return result.rows;
}

// Example usage
const history = await getAssetHistory(5, 24);
console.log(`Found ${history.length} data points`);
```

---

## Controller Integration

### Complete Market History Controller

```javascript
// backend/src/controllers/marketHistoryController.js

import pool from '../config/db.js';
import yahooFinance from 'yahoo-finance2';

/**
 * GET /api/market/history/:symbol
 * Returns historical monthly price data for the last 24 months
 */
export async function getAssetHistory(req, res) {
  try {
    const { symbol } = req.params;
    const range = req.query.range || '24m';
    const interval = req.query.interval || '1mo';

    // Validate parameters
    const validRanges = ['6m', '12m', '24m', '60m'];
    const validIntervals = ['1d', '1wk', '1mo'];

    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: `Rango inválido. Valores permitidos: ${validRanges.join(', ')}`
      });
    }

    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        error: `Intervalo inválido. Valores permitidos: ${validIntervals.join(', ')}`
      });
    }

    // Map range to number of months
    const rangeMap = { '6m': 6, '12m': 12, '24m': 24, '60m': 60 };
    const monthsCount = rangeMap[range];

    // Get asset from database
    const assetQuery = `
      SELECT id, symbol, name, asset_type, currency
      FROM assets
      WHERE symbol = $1
      LIMIT 1;
    `;
    const assetResult = await pool.query(assetQuery, [symbol]);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Símbolo no encontrado en la base de datos'
      });
    }

    const asset = assetResult.rows[0];

    // Check cache freshness (TTL: 1 hour for monthly data)
    const cacheCheckQuery = `
      SELECT COUNT(*) AS cached_count
      FROM asset_price_history
      WHERE asset_id = $1
        AND month >= NOW() - INTERVAL '${monthsCount} months'
        AND fetched_at > NOW() - INTERVAL '1 hour';
    `;
    const cacheResult = await pool.query(cacheCheckQuery, [asset.id]);
    const cachedCount = parseInt(cacheResult.rows[0].cached_count);

    // If cache is stale or incomplete, fetch from Yahoo Finance
    if (cachedCount < monthsCount) {
      console.log(`Cache miss for ${symbol}, fetching from Yahoo Finance...`);

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsCount);

        const yahooData = await yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1mo'
        });

        // Upsert historical data into database
        for (const dataPoint of yahooData) {
          const monthDate = new Date(dataPoint.date);
          const monthFirstDay = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            1
          ).toISOString().split('T')[0];

          const upsertQuery = `
            INSERT INTO asset_price_history (
              asset_id, month, open, high, low, close, volume, currency, fetched_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (asset_id, month)
            DO UPDATE SET
              open = EXCLUDED.open,
              high = EXCLUDED.high,
              low = EXCLUDED.low,
              close = EXCLUDED.close,
              volume = EXCLUDED.volume,
              fetched_at = NOW();
          `;

          await pool.query(upsertQuery, [
            asset.id,
            monthFirstDay,
            dataPoint.open || 0,
            dataPoint.high || 0,
            dataPoint.low || 0,
            dataPoint.close || 0,
            dataPoint.volume || 0,
            asset.currency
          ]);
        }

        console.log(`Upserted ${yahooData.length} data points for ${symbol}`);
      } catch (yahooError) {
        console.error('Yahoo Finance error:', yahooError.message);
        // Continue to serve cached data if available
      }
    }

    // Fetch historical data from database
    const historyQuery = `
      SELECT
        TO_CHAR(month, 'YYYY-MM-DD') AS date,
        EXTRACT(EPOCH FROM month)::bigint * 1000 AS timestamp,
        open,
        high,
        low,
        close,
        volume,
        currency
      FROM asset_price_history
      WHERE asset_id = $1
        AND month >= NOW() - INTERVAL '${monthsCount} months'
      ORDER BY month ASC;
    `;
    const historyResult = await pool.query(historyQuery, [asset.id]);

    if (historyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Sin datos históricos disponibles para este activo'
      });
    }

    // Build response matching API contract
    const response = {
      symbol: asset.symbol,
      yahooSymbol: asset.symbol,
      name: asset.name,
      assetType: asset.asset_type,
      currency: asset.currency,
      currentPrice: historyResult.rows[historyResult.rows.length - 1]?.close || 0,
      range,
      interval,
      dataPoints: historyResult.rows.length,
      series: historyResult.rows.map(row => ({
        date: row.date,
        timestamp: parseInt(row.timestamp),
        close: parseFloat(row.close),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        volume: parseInt(row.volume),
        currency: row.currency
      })),
      source: 'yahoo',
      cachedAt: new Date().toISOString(),
      ttl: 3600 // 1 hour
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in getAssetHistory:', error);
    return res.status(500).json({
      error: 'Error obteniendo datos históricos del activo'
    });
  }
}
```

### Add Route to Express App

```javascript
// backend/src/routes/market.routes.js

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getAssetHistory } from '../controllers/marketHistoryController.js';

const router = express.Router();

// Protected route (requires JWT)
router.get('/history/:symbol', authRequired, getAssetHistory);

export default router;
```

---

## Cache Management

### 1. Check Cache Validity

```javascript
async function isCacheValid(assetId, months, ttlSeconds) {
  const query = `
    SELECT COUNT(*) AS valid_count
    FROM asset_price_history
    WHERE asset_id = $1
      AND month >= NOW() - INTERVAL '${months} months'
      AND fetched_at > NOW() - INTERVAL '${ttlSeconds} seconds';
  `;

  const result = await pool.query(query, [assetId]);
  const validCount = parseInt(result.rows[0].valid_count);

  // Cache is valid if we have the expected number of data points
  return validCount >= months;
}

// Example usage
const isValid = await isCacheValid(5, 24, 3600); // Check 24 months with 1h TTL
console.log('Cache valid:', isValid);
```

### 2. Invalidate Cache for Asset

```javascript
async function invalidateAssetCache(assetId) {
  const query = `
    UPDATE asset_price_history
    SET fetched_at = NOW() - INTERVAL '2 hours'
    WHERE asset_id = $1;
  `;

  const result = await pool.query(query, [assetId]);
  return result.rowCount;
}

// Example usage
const invalidated = await invalidateAssetCache(5);
console.log(`Invalidated ${invalidated} cache entries`);
```

### 3. Clear Old Cache Globally

```javascript
async function clearStaleCache(daysOld = 30) {
  const query = `
    DELETE FROM asset_price_history
    WHERE fetched_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING asset_id, month;
  `;

  const result = await pool.query(query);
  console.log(`Deleted ${result.rowCount} stale cache entries`);
  return result.rows;
}

// Example usage (run as cron job)
const deleted = await clearStaleCache(30);
```

---

## Batch Operations

### 1. Bulk Insert from Yahoo Finance

```javascript
async function bulkInsertHistory(assetId, yahooData, currency) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const dataPoint of yahooData) {
      const monthDate = new Date(dataPoint.date);
      const monthFirstDay = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      ).toISOString().split('T')[0];

      const query = `
        INSERT INTO asset_price_history (
          asset_id, month, open, high, low, close, volume, currency, fetched_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (asset_id, month)
        DO UPDATE SET
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          fetched_at = NOW();
      `;

      await client.query(query, [
        assetId,
        monthFirstDay,
        dataPoint.open || 0,
        dataPoint.high || 0,
        dataPoint.low || 0,
        dataPoint.close || 0,
        dataPoint.volume || 0,
        currency
      ]);
    }

    await client.query('COMMIT');
    return yahooData.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Example usage
const inserted = await bulkInsertHistory(5, yahooData, 'USD');
console.log(`Inserted ${inserted} data points`);
```

### 2. Backfill Missing Data for All Assets

```javascript
async function backfillAllAssets() {
  // Get all assets
  const assetsQuery = 'SELECT id, symbol, currency FROM assets;';
  const assetsResult = await pool.query(assetsQuery);

  const results = [];

  for (const asset of assetsResult.rows) {
    try {
      console.log(`Backfilling ${asset.symbol}...`);

      // Check how many months we have
      const countQuery = `
        SELECT COUNT(*) AS count
        FROM asset_price_history
        WHERE asset_id = $1;
      `;
      const countResult = await pool.query(countQuery, [asset.id]);
      const existingCount = parseInt(countResult.rows[0].count);

      if (existingCount >= 24) {
        console.log(`${asset.symbol} already has ${existingCount} months, skipping`);
        continue;
      }

      // Fetch from Yahoo Finance
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 24);

      const yahooData = await yahooFinance.historical(asset.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1mo'
      });

      // Insert data
      const inserted = await bulkInsertHistory(asset.id, yahooData, asset.currency);

      results.push({
        symbol: asset.symbol,
        inserted,
        success: true
      });

      console.log(`✅ ${asset.symbol}: ${inserted} data points`);

      // Rate limiting delay (avoid Yahoo Finance throttling)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error backfilling ${asset.symbol}:`, error.message);
      results.push({
        symbol: asset.symbol,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

// Run backfill (can be a separate script)
// node backend/src/scripts/backfill_history.js
const results = await backfillAllAssets();
console.log('Backfill complete:', results);
```

---

## Common Query Patterns

### 1. Get Latest Price for Asset

```javascript
async function getLatestPrice(assetId) {
  const query = `
    SELECT close, currency, month AS date
    FROM asset_price_history
    WHERE asset_id = $1
    ORDER BY month DESC
    LIMIT 1;
  `;

  const result = await pool.query(query, [assetId]);
  return result.rows[0] || null;
}

// Example usage
const latestPrice = await getLatestPrice(5);
console.log('Latest price:', latestPrice);
// Output: { close: 151.2, currency: 'USD', date: '2024-12-01' }
```

### 2. Calculate Price Change (Monthly)

```javascript
async function getPriceChange(assetId) {
  const query = `
    WITH latest AS (
      SELECT close, month
      FROM asset_price_history
      WHERE asset_id = $1
      ORDER BY month DESC
      LIMIT 2
    )
    SELECT
      (SELECT close FROM latest ORDER BY month DESC LIMIT 1) AS current_price,
      (SELECT close FROM latest ORDER BY month ASC LIMIT 1) AS previous_price,
      (
        (SELECT close FROM latest ORDER BY month DESC LIMIT 1) -
        (SELECT close FROM latest ORDER BY month ASC LIMIT 1)
      ) AS change,
      (
        (
          (SELECT close FROM latest ORDER BY month DESC LIMIT 1) -
          (SELECT close FROM latest ORDER BY month ASC LIMIT 1)
        ) / (SELECT close FROM latest ORDER BY month ASC LIMIT 1) * 100
      ) AS change_percent;
  `;

  const result = await pool.query(query, [assetId]);
  return result.rows[0];
}

// Example usage
const change = await getPriceChange(5);
console.log('Price change:', change);
// Output: { current_price: 151.2, previous_price: 149.5, change: 1.7, change_percent: 1.14 }
```

### 3. Calculate Moving Average (3-month SMA)

```javascript
async function getMovingAverage(assetId, windowSize = 3) {
  const query = `
    SELECT
      TO_CHAR(month, 'YYYY-MM-DD') AS date,
      close,
      AVG(close) OVER (
        ORDER BY month
        ROWS BETWEEN ${windowSize - 1} PRECEDING AND CURRENT ROW
      ) AS sma
    FROM asset_price_history
    WHERE asset_id = $1
    ORDER BY month ASC;
  `;

  const result = await pool.query(query, [assetId]);
  return result.rows;
}

// Example usage
const sma = await getMovingAverage(5, 3);
console.log('3-month SMA:', sma);
```

### 4. Find Data Gaps (Missing Months)

```javascript
async function findMissingMonths(assetId, months = 24) {
  const query = `
    WITH expected_months AS (
      SELECT generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '${months} months'),
        DATE_TRUNC('month', NOW()),
        '1 month'::interval
      )::date AS month
    )
    SELECT TO_CHAR(em.month, 'YYYY-MM-DD') AS missing_month
    FROM expected_months em
    LEFT JOIN asset_price_history aph
      ON aph.asset_id = $1 AND aph.month = em.month
    WHERE aph.id IS NULL
    ORDER BY em.month ASC;
  `;

  const result = await pool.query(query, [assetId]);
  return result.rows.map(row => row.missing_month);
}

// Example usage
const missingMonths = await findMissingMonths(5, 24);
console.log('Missing months:', missingMonths);
// Output: ['2023-03-01', '2023-07-01']
```

### 5. Get Volatility (Standard Deviation)

```javascript
async function getVolatility(assetId, months = 12) {
  const query = `
    SELECT
      STDDEV(close) AS volatility,
      AVG(close) AS avg_price,
      MIN(close) AS min_price,
      MAX(close) AS max_price,
      COUNT(*) AS data_points
    FROM asset_price_history
    WHERE asset_id = $1
      AND month >= NOW() - INTERVAL '${months} months';
  `;

  const result = await pool.query(query, [assetId]);
  return result.rows[0];
}

// Example usage
const volatility = await getVolatility(5, 12);
console.log('Volatility:', volatility);
```

---

## Testing Examples

### Unit Test for Upsert Function

```javascript
// backend/src/tests/assetPriceHistory.test.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../config/db.js';

describe('Asset Price History', () => {
  let testAssetId;

  beforeAll(async () => {
    // Create test asset
    const result = await pool.query(`
      INSERT INTO assets (symbol, name, asset_type, currency)
      VALUES ('TEST', 'Test Asset', 'stocks', 'USD')
      RETURNING id;
    `);
    testAssetId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM assets WHERE symbol = $1', ['TEST']);
    await pool.end();
  });

  it('should insert new monthly price', async () => {
    const data = {
      date: '2024-01-01',
      open: 100,
      high: 105,
      low: 98,
      close: 103,
      volume: 1000000,
      currency: 'USD'
    };

    const result = await pool.query(`
      INSERT INTO asset_price_history (
        asset_id, month, open, high, low, close, volume, currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      testAssetId,
      data.date,
      data.open,
      data.high,
      data.low,
      data.close,
      data.volume,
      data.currency
    ]);

    expect(result.rows[0].asset_id).toBe(testAssetId);
    expect(parseFloat(result.rows[0].close)).toBe(103);
  });

  it('should update existing monthly price on conflict', async () => {
    const updatedData = {
      date: '2024-01-01',
      open: 105,
      high: 110,
      low: 103,
      close: 108,
      volume: 2000000,
      currency: 'USD'
    };

    const result = await pool.query(`
      INSERT INTO asset_price_history (
        asset_id, month, open, high, low, close, volume, currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (asset_id, month)
      DO UPDATE SET
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
      RETURNING *;
    `, [
      testAssetId,
      updatedData.date,
      updatedData.open,
      updatedData.high,
      updatedData.low,
      updatedData.close,
      updatedData.volume,
      updatedData.currency
    ]);

    expect(parseFloat(result.rows[0].close)).toBe(108);
    expect(parseInt(result.rows[0].volume)).toBe(2000000);
  });

  it('should reject invalid OHLC data', async () => {
    const invalidData = {
      date: '2024-02-01',
      open: 100,
      high: 95, // Invalid: high < low
      low: 98,
      close: 97,
      volume: 1000000,
      currency: 'USD'
    };

    await expect(
      pool.query(`
        INSERT INTO asset_price_history (
          asset_id, month, open, high, low, close, volume, currency
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [
        testAssetId,
        invalidData.date,
        invalidData.open,
        invalidData.high,
        invalidData.low,
        invalidData.close,
        invalidData.volume,
        invalidData.currency
      ])
    ).rejects.toThrow();
  });
});
```

---

## Performance Monitoring

### Query Performance Analysis

```javascript
async function analyzeQueryPerformance(assetId) {
  const query = `
    EXPLAIN ANALYZE
    SELECT *
    FROM asset_price_history
    WHERE asset_id = $1
    ORDER BY month DESC
    LIMIT 24;
  `;

  const result = await pool.query(query, [assetId]);
  console.log('Query Plan:');
  result.rows.forEach(row => console.log(row['QUERY PLAN']));
}

// Example usage
await analyzeQueryPerformance(5);
```

### Index Usage Stats

```javascript
async function getIndexUsageStats() {
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan AS index_scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched
    FROM pg_stat_user_indexes
    WHERE tablename = 'asset_price_history'
    ORDER BY idx_scan DESC;
  `;

  const result = await pool.query(query);
  return result.rows;
}

// Example usage
const stats = await getIndexUsageStats();
console.log('Index usage:', stats);
```

---

## Related Documentation

- [Asset Price History Table Design](./asset-price-history-table.md)
- [Asset History API Contract](../api/asset-history.md)
- [Database Configuration](../../backend/src/config/db.js)

---

**Last Updated**: 2025-12-21
