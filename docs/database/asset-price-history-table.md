# Asset Price History Table - Design Documentation

Version: 1.0
Last Updated: 2025-12-21

## Overview

The `asset_price_history` table stores monthly historical OHLC (Open, High, Low, Close) price data for assets over configurable time ranges. This table is optimized for fast retrieval of time-series data to support historical price charts on the asset detail page.

## Table Structure

### Schema Definition

```sql
CREATE TABLE IF NOT EXISTS asset_price_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  open NUMERIC(20, 8) NOT NULL,
  high NUMERIC(20, 8) NOT NULL,
  low NUMERIC(20, 8) NOT NULL,
  close NUMERIC(20, 8) NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT asset_price_history_asset_month_uq UNIQUE (asset_id, month),
  CONSTRAINT asset_price_history_open_chk CHECK (open >= 0),
  CONSTRAINT asset_price_history_high_chk CHECK (high >= 0),
  CONSTRAINT asset_price_history_low_chk CHECK (low >= 0),
  CONSTRAINT asset_price_history_close_chk CHECK (close >= 0),
  CONSTRAINT asset_price_history_volume_chk CHECK (volume >= 0),
  CONSTRAINT asset_price_history_currency_chk CHECK (currency IN ('USD', 'EUR')),
  CONSTRAINT asset_price_history_ohlc_chk CHECK (
    low <= high AND
    open >= low AND open <= high AND
    close >= low AND close <= high
  )
);
```

### Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Primary key (auto-increment) |
| asset_id | INTEGER | NO | Foreign key to `assets.id` (ON DELETE CASCADE) |
| month | DATE | NO | First day of the month (e.g., 2024-01-01) |
| open | NUMERIC(20,8) | NO | Opening price for the month |
| high | NUMERIC(20,8) | NO | Highest price during the month |
| low | NUMERIC(20,8) | NO | Lowest price during the month |
| close | NUMERIC(20,8) | NO | Closing price for the month |
| volume | BIGINT | NO | Total trading volume for the month (default: 0) |
| currency | TEXT | NO | ISO 4217 currency code (USD, EUR) |
| fetched_at | TIMESTAMPTZ | NO | Timestamp when data was fetched from external API |
| created_at | TIMESTAMPTZ | NO | Record creation timestamp |

### Constraints

#### 1. Uniqueness Constraint
```sql
UNIQUE (asset_id, month)
```
- Ensures one price record per asset per month
- Enables natural deduplication for UPSERT operations
- Prevents duplicate historical data

#### 2. Price Validation Checks
```sql
-- Individual price checks (no negative values)
CHECK (open >= 0)
CHECK (high >= 0)
CHECK (low >= 0)
CHECK (close >= 0)
CHECK (volume >= 0)

-- OHLC relationship validation
CHECK (
  low <= high AND
  open >= low AND open <= high AND
  close >= low AND close <= high
)
```
- Validates OHLC data integrity
- Ensures logical relationships (low <= high, open/close within range)

#### 3. Currency Constraint
```sql
CHECK (currency IN ('USD', 'EUR'))
```
- Restricts currency to supported values
- Can be extended when adding new currency support

#### 4. Foreign Key Constraint
```sql
asset_id REFERENCES assets(id) ON DELETE CASCADE
```
- Maintains referential integrity
- Automatically deletes historical data when asset is removed

## Indexes

### Primary Index (Optimized for Time-Series Queries)

```sql
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_month
  ON asset_price_history(asset_id, month DESC);
```

**Purpose**: Fast retrieval of historical prices for a specific asset in reverse chronological order

**Query Pattern**:
```sql
-- Get last 24 months for asset_id=5
SELECT * FROM asset_price_history
WHERE asset_id = 5
ORDER BY month DESC
LIMIT 24;
```

**Performance**: Index-only scan with O(log n) lookup + sequential read

### Cache Invalidation Index

```sql
CREATE INDEX IF NOT EXISTS idx_asset_price_history_fetched
  ON asset_price_history(fetched_at);
```

**Purpose**: Identify stale cache entries for TTL-based invalidation

**Query Pattern**:
```sql
-- Find records older than 1 hour
SELECT asset_id, month FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '1 hour';
```

### Composite Cache Index

```sql
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_fetched
  ON asset_price_history(asset_id, fetched_at);
```

**Purpose**: Check if cached data exists and is fresh for specific asset

**Query Pattern**:
```sql
-- Check if asset 5 has fresh data (cached within 1 hour)
SELECT COUNT(*) FROM asset_price_history
WHERE asset_id = 5
  AND fetched_at > NOW() - INTERVAL '1 hour';
```

## UPSERT Strategy

### Insert or Update Historical Data

When fetching new data from Yahoo Finance, use ON CONFLICT to update existing records:

```sql
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
```

**Parameters**:
- `$1`: asset_id (INT)
- `$2`: month (DATE) - e.g., '2024-01-01'
- `$3`: open (NUMERIC)
- `$4`: high (NUMERIC)
- `$5`: low (NUMERIC)
- `$6`: close (NUMERIC)
- `$7`: volume (BIGINT)
- `$8`: currency (TEXT)

**Behavior**:
- If record exists: Updates OHLC data and refreshes `fetched_at`
- If record doesn't exist: Inserts new record
- Always returns the affected row

### Batch UPSERT (Multiple Months)

For bulk inserts (e.g., importing 24 months at once):

```sql
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES
  (5, '2023-01-01', 150.5, 152.3, 149.8, 151.2, 45000000, 'USD', NOW()),
  (5, '2023-02-01', 151.2, 155.0, 150.0, 154.5, 48000000, 'USD', NOW()),
  (5, '2023-03-01', 154.5, 158.7, 153.2, 157.8, 52000000, 'USD', NOW())
  -- ... more rows
ON CONFLICT (asset_id, month)
DO UPDATE SET
  open = EXCLUDED.open,
  high = EXCLUDED.high,
  low = EXCLUDED.low,
  close = EXCLUDED.close,
  volume = EXCLUDED.volume,
  currency = EXCLUDED.currency,
  fetched_at = NOW();
```

## Query Examples for API Endpoint

### 1. Get Last 24 Months (Default Range)

```sql
SELECT
  month AS date,
  open,
  high,
  low,
  close,
  volume,
  currency,
  fetched_at
FROM asset_price_history
WHERE asset_id = $1
ORDER BY month DESC
LIMIT 24;
```

**Expected Result**:
- Returns up to 24 rows
- Sorted newest to oldest
- Ready for JSON serialization

### 2. Get Specific Date Range

```sql
SELECT
  month AS date,
  open,
  high,
  low,
  close,
  volume,
  currency,
  fetched_at
FROM asset_price_history
WHERE asset_id = $1
  AND month >= $2  -- e.g., '2023-06-01'
  AND month <= $3  -- e.g., '2024-12-01'
ORDER BY month ASC;
```

### 3. Check Cache Freshness

```sql
SELECT
  COUNT(*) AS cached_count,
  MAX(fetched_at) AS last_fetch
FROM asset_price_history
WHERE asset_id = $1
  AND month >= NOW() - INTERVAL '24 months'
  AND fetched_at > NOW() - INTERVAL '1 hour';
```

**Logic**:
- If `cached_count = 24` and `last_fetch` is recent: Use cache
- Otherwise: Fetch from Yahoo Finance and upsert

### 4. Get Latest Closing Price

```sql
SELECT close AS current_price, currency
FROM asset_price_history
WHERE asset_id = $1
ORDER BY month DESC
LIMIT 1;
```

### 5. Calculate Simple Moving Average (SMA)

```sql
SELECT
  month,
  close,
  AVG(close) OVER (
    ORDER BY month
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) AS sma_3_month
FROM asset_price_history
WHERE asset_id = $1
ORDER BY month ASC;
```

### 6. Find Missing Months (Data Gaps)

```sql
WITH expected_months AS (
  SELECT generate_series(
    DATE_TRUNC('month', NOW() - INTERVAL '24 months'),
    DATE_TRUNC('month', NOW()),
    '1 month'::interval
  ) AS month
)
SELECT em.month
FROM expected_months em
LEFT JOIN asset_price_history aph
  ON aph.asset_id = $1 AND aph.month = em.month
WHERE aph.id IS NULL
ORDER BY em.month ASC;
```

**Use Case**: Identify missing data to backfill from Yahoo Finance

## Integration with API Contract

Based on `docs/api/asset-history.md`, the endpoint should:

### Request Processing Flow

```javascript
// 1. Parse query parameters
const range = req.query.range || '24m';
const interval = req.query.interval || '1mo';
const symbol = req.params.symbol;

// 2. Map range to months
const rangeMap = { '6m': 6, '12m': 12, '24m': 24, '60m': 60 };
const months = rangeMap[range];

// 3. Get asset_id from assets table
const asset = await pool.query(
  'SELECT id, currency, name FROM assets WHERE symbol = $1',
  [symbol]
);

// 4. Check cache freshness
const cacheCheck = await pool.query(`
  SELECT COUNT(*) AS cached_count
  FROM asset_price_history
  WHERE asset_id = $1
    AND month >= NOW() - INTERVAL '${months} months'
    AND fetched_at > NOW() - INTERVAL '1 hour'
`, [asset.id]);

// 5. If cache is stale, fetch from Yahoo Finance
if (cacheCheck.rows[0].cached_count < months) {
  const yahooData = await yahooFinance.historical(symbol, {
    period1: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
    period2: new Date(),
    interval: '1mo'
  });

  // 6. Upsert historical data
  for (const dataPoint of yahooData) {
    await pool.query(`
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
        fetched_at = NOW()
    `, [
      asset.id,
      new Date(dataPoint.date).toISOString().split('T')[0],
      dataPoint.open,
      dataPoint.high,
      dataPoint.low,
      dataPoint.close,
      dataPoint.volume,
      asset.currency
    ]);
  }
}

// 7. Fetch from database
const history = await pool.query(`
  SELECT
    TO_CHAR(month, 'YYYY-MM-DD') AS date,
    EXTRACT(EPOCH FROM month) * 1000 AS timestamp,
    open,
    high,
    low,
    close,
    volume,
    currency
  FROM asset_price_history
  WHERE asset_id = $1
  ORDER BY month ASC
  LIMIT $2
`, [asset.id, months]);

// 8. Return response matching API contract
return {
  symbol,
  yahooSymbol: symbol,
  name: asset.name,
  assetType: asset.asset_type,
  currency: asset.currency,
  currentPrice: history.rows[history.rows.length - 1]?.close,
  range,
  interval,
  dataPoints: history.rows.length,
  series: history.rows,
  source: 'yahoo',
  cachedAt: new Date().toISOString(),
  ttl: 3600
};
```

## Cache TTL Strategy

### TTL Configuration by Interval

```javascript
const TTL_MAP = {
  '1d': 15 * 60,    // 15 minutes
  '1wk': 30 * 60,   // 30 minutes
  '1mo': 60 * 60    // 1 hour
};
```

### Cache Validation Query

```sql
-- Check if cache is valid for asset + range + interval
SELECT COUNT(*) AS valid_count
FROM asset_price_history
WHERE asset_id = $1
  AND month >= NOW() - INTERVAL '24 months'
  AND fetched_at > NOW() - INTERVAL '1 hour'  -- TTL for 1mo interval
HAVING COUNT(*) >= 24;  -- Expected data points
```

## Performance Considerations

### Query Performance

| Query Type | Expected Time | Index Used |
|------------|---------------|------------|
| Last 24 months | < 5ms | idx_asset_price_history_asset_month |
| Cache check | < 3ms | idx_asset_price_history_asset_fetched |
| UPSERT single row | < 10ms | UNIQUE constraint |
| Batch UPSERT (24 rows) | < 50ms | UNIQUE constraint |

### Storage Estimates

**Assumptions**:
- 1000 assets in catalog
- 24 months of history per asset
- Row size: ~150 bytes (including indexes)

**Storage Required**:
- Data: 1000 * 24 * 150 bytes = 3.6 MB
- Indexes: ~1.5 MB
- **Total: ~5 MB** (minimal footprint)

**For 5 years (60 months)**:
- Total: ~12.5 MB per 1000 assets

### Scalability Path

1. **Current (< 10K assets)**:
   - Single table with composite indexes
   - No partitioning needed
   - Estimated storage: < 200 MB

2. **Medium Scale (10K-100K assets)**:
   - Consider partitioning by asset_id range
   - Add materialized views for common aggregations
   - Estimated storage: 2-20 GB

3. **Large Scale (> 100K assets)**:
   - Partition by month (range partitioning)
   - Automatic partition creation for new months
   - Archive old partitions (> 5 years) to cold storage

## Maintenance Operations

### 1. Archive Old Data (> 5 Years)

```sql
-- Create archive table
CREATE TABLE asset_price_history_archive (LIKE asset_price_history INCLUDING ALL);

-- Move old data
INSERT INTO asset_price_history_archive
SELECT * FROM asset_price_history
WHERE month < NOW() - INTERVAL '5 years';

-- Delete from main table
DELETE FROM asset_price_history
WHERE month < NOW() - INTERVAL '5 years';
```

### 2. Vacuum and Analyze

```sql
-- After bulk operations
VACUUM ANALYZE asset_price_history;
```

### 3. Index Maintenance

```sql
-- Rebuild indexes if fragmented
REINDEX TABLE asset_price_history;
```

### 4. Clear Stale Cache

```sql
-- Delete records not updated in 30 days (stale cache)
DELETE FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '30 days';
```

## Migration Strategy

### Deployment to Existing Environments

The table creation is **idempotent** and **non-breaking**:

1. Uses `CREATE TABLE IF NOT EXISTS` - safe for existing databases
2. No changes to existing tables (`users`, `assets`, `user_portfolio`)
3. Foreign key to `assets` table uses existing `id` column
4. ON DELETE CASCADE ensures referential integrity

### Rollout Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Restart backend (auto-creates table)
cd backend
npm run dev

# 3. Verify table creation
psql -d nextworth_db -c "\d asset_price_history"

# 4. Test with sample data
psql -d nextworth_db -c "
  INSERT INTO asset_price_history (
    asset_id, month, open, high, low, close, volume, currency
  )
  SELECT id, DATE_TRUNC('month', NOW()), 100, 105, 98, 103, 1000000, currency
  FROM assets LIMIT 1;
"
```

### Rollback Plan (If Needed)

```sql
-- Drop table and all data
DROP TABLE IF EXISTS asset_price_history CASCADE;

-- Drop indexes (if table still exists)
DROP INDEX IF EXISTS idx_asset_price_history_asset_month;
DROP INDEX IF EXISTS idx_asset_price_history_fetched;
DROP INDEX IF EXISTS idx_asset_price_history_asset_fetched;
```

## Testing Checklist

- [ ] Table creation succeeds on fresh database
- [ ] Table creation is idempotent (runs safely multiple times)
- [ ] UNIQUE constraint prevents duplicate (asset_id, month)
- [ ] CHECK constraints reject invalid OHLC data
- [ ] Foreign key CASCADE deletes historical data when asset removed
- [ ] Indexes are used by query planner (EXPLAIN ANALYZE)
- [ ] UPSERT logic updates existing records correctly
- [ ] Batch insert performance is acceptable (< 100ms for 24 rows)
- [ ] Cache TTL queries return correct results
- [ ] API endpoint returns data matching contract in asset-history.md

## Related Files

- **Table Creation**: `backend/src/config/db.js` (lines 56-95)
- **API Contract**: `docs/api/asset-history.md`
- **Yahoo Finance Service**: `backend/src/services/yahooFinanceService.js`
- **Market Data Service**: `backend/src/services/marketDataService.js`

## Future Enhancements

1. **Add Weekly/Daily History Tables**
   - `asset_price_history_weekly` for 1wk interval
   - `asset_price_history_daily` for 1d interval (higher volume)

2. **Add Metadata Fields**
   - `adjusted_close` for dividend/split-adjusted prices
   - `data_quality_score` (0-100) for data completeness

3. **Materialized Views**
   - Pre-computed moving averages (SMA, EMA)
   - Pre-computed technical indicators (RSI, MACD)

4. **Partitioning**
   - Range partitioning by month when table exceeds 1M rows
   - Automatic partition creation trigger

5. **Compression**
   - Enable TOAST compression for NUMERIC columns
   - Consider columnar storage extension (cstore_fdw) for analytics

---

**Document Version**: 1.0
**Last Updated**: 2025-12-21
**Author**: NextWorth Database Team
