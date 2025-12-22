# Asset Price History Database Schema

Version: 1.0
Last Updated: 2025-12-21
Related API: [Asset History API Contract](../api/asset-history.md)

---

## Overview

The `asset_price_history` table stores monthly OHLCV (Open, High, Low, Close, Volume) historical price data for assets. This table supports the asset detail page historical price charts and is optimized for time-range queries.

**Key Design Principles**:
1. Optimized for primary query pattern: "get last 24 months by asset_id ORDER BY month ASC"
2. Natural deduplication via UNIQUE constraint on (asset_id, month)
3. Cache TTL tracking via `fetched_at` timestamp
4. Strong data integrity with CHECK constraints
5. Idempotent creation compatible with auto-create workflow

---

## Table Schema

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

  -- Natural deduplication: one row per asset per month
  CONSTRAINT asset_price_history_asset_month_uq UNIQUE (asset_id, month),

  -- Data integrity constraints
  CONSTRAINT asset_price_history_open_chk CHECK (open >= 0),
  CONSTRAINT asset_price_history_high_chk CHECK (high >= 0),
  CONSTRAINT asset_price_history_low_chk CHECK (low >= 0),
  CONSTRAINT asset_price_history_close_chk CHECK (close >= 0),
  CONSTRAINT asset_price_history_volume_chk CHECK (volume >= 0),
  CONSTRAINT asset_price_history_currency_chk CHECK (currency IN ('USD', 'EUR')),

  -- OHLC logical constraint: low <= open/close <= high
  CONSTRAINT asset_price_history_ohlc_chk CHECK (
    low <= high AND
    open >= low AND open <= high AND
    close >= low AND close <= high
  )
);
```

---

## Column Definitions

| Column       | Type            | Constraints      | Description                                           |
|--------------|-----------------|------------------|-------------------------------------------------------|
| id           | SERIAL          | PRIMARY KEY      | Auto-incrementing unique identifier                   |
| asset_id     | INTEGER         | NOT NULL, FK     | Foreign key to assets table (CASCADE DELETE)          |
| month        | DATE            | NOT NULL         | First day of month (e.g., 2024-01-01)                 |
| open         | NUMERIC(20,8)   | NOT NULL, >= 0   | Opening price for the month                           |
| high         | NUMERIC(20,8)   | NOT NULL, >= 0   | Highest price during the month                        |
| low          | NUMERIC(20,8)   | NOT NULL, >= 0   | Lowest price during the month                         |
| close        | NUMERIC(20,8)   | NOT NULL, >= 0   | Closing price for the month                           |
| volume       | BIGINT          | NOT NULL, >= 0   | Trading volume for the month                          |
| currency     | TEXT            | NOT NULL         | Price currency (USD or EUR)                           |
| fetched_at   | TIMESTAMPTZ     | NOT NULL         | When data was last fetched (for cache invalidation)   |
| created_at   | TIMESTAMPTZ     | NOT NULL         | When record was first created                         |

---

## Indexes

Three strategic indexes for optimal query performance:

```sql
-- Primary query pattern: fast range queries ordered by month
-- Covers: SELECT * FROM asset_price_history WHERE asset_id = ? ORDER BY month ASC/DESC
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_month
  ON asset_price_history(asset_id, month DESC);

-- Cache invalidation queries by fetched_at
-- Covers: SELECT * FROM asset_price_history WHERE fetched_at < NOW() - INTERVAL '1 hour'
CREATE INDEX IF NOT EXISTS idx_asset_price_history_fetched
  ON asset_price_history(fetched_at);

-- Finding stale data per asset
-- Covers: SELECT * FROM asset_price_history WHERE asset_id = ? AND fetched_at < ?
CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_fetched
  ON asset_price_history(asset_id, fetched_at);
```

**Index Usage Patterns**:
- `idx_asset_price_history_asset_month`: Primary index for all time-range queries (covers 99% of reads)
- `idx_asset_price_history_fetched`: Background cache invalidation jobs
- `idx_asset_price_history_asset_fetched`: Per-asset cache freshness checks

---

## Constraints Explained

### Uniqueness
```sql
CONSTRAINT asset_price_history_asset_month_uq UNIQUE (asset_id, month)
```
- Prevents duplicate records for the same asset and month
- Enables efficient UPSERT operations with ON CONFLICT
- Natural business constraint: one price record per asset per month

### Price Validation
```sql
CONSTRAINT asset_price_history_open_chk CHECK (open >= 0)
CONSTRAINT asset_price_history_high_chk CHECK (high >= 0)
CONSTRAINT asset_price_history_low_chk CHECK (low >= 0)
CONSTRAINT asset_price_history_close_chk CHECK (close >= 0)
```
- Prevents negative prices
- Enforces financial data sanity

### OHLC Logical Integrity
```sql
CONSTRAINT asset_price_history_ohlc_chk CHECK (
  low <= high AND
  open >= low AND open <= high AND
  close >= low AND close <= high
)
```
- Ensures OHLC data is internally consistent
- Prevents invalid data like low > high or open > high
- Critical for accurate charting

### Currency Validation
```sql
CONSTRAINT asset_price_history_currency_chk CHECK (currency IN ('USD', 'EUR'))
```
- Restricts to supported currencies (matches system design)
- Easy to extend by adding more currencies to the IN clause

---

## UPSERT Strategy

The UNIQUE constraint enables efficient UPSERT operations:

```sql
-- Insert new record or update if (asset_id, month) exists
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

**Use Cases**:
- Initial backfill: Insert 24 months of historical data
- Cache refresh: Update existing months with fresh data
- Incremental updates: Add current month as it completes

**Benefits**:
- Single query handles both insert and update
- Atomic operation (no race conditions)
- Automatic fetched_at timestamp update for cache tracking

---

## Query Patterns

### 1. Get Last 24 Months (Primary Use Case)

```sql
-- Fetch last 24 months of monthly prices for charting
SELECT
  month,
  open,
  high,
  low,
  close,
  volume,
  currency,
  fetched_at
FROM asset_price_history
WHERE asset_id = $1
  AND month >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
ORDER BY month ASC;
```

**Performance**: Index-covered query, expects < 10ms on 1M rows

**Usage**: Asset detail page historical chart endpoint

---

### 2. Get History with Asset Metadata

```sql
-- Join with assets table for complete asset context
SELECT
  a.symbol,
  a.name,
  a.asset_type,
  aph.month,
  aph.close,
  aph.open,
  aph.high,
  aph.low,
  aph.volume,
  aph.currency
FROM asset_price_history aph
JOIN assets a ON a.id = aph.asset_id
WHERE aph.asset_id = $1
  AND aph.month >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
ORDER BY aph.month ASC;
```

**Performance**: Fast join on primary key (assets.id)

**Usage**: Controller layer when asset metadata is needed alongside history

---

### 3. Check Cache Freshness

```sql
-- Get most recent cached month and last fetch time
SELECT
  asset_id,
  MAX(month) as latest_month,
  MAX(fetched_at) as last_fetched
FROM asset_price_history
WHERE asset_id = $1
GROUP BY asset_id;
```

**Usage**: Determine if cache refresh is needed before querying Yahoo Finance

**Logic**:
- If `last_fetched < NOW() - INTERVAL '1 hour'` → Refresh from Yahoo
- If `latest_month < DATE_TRUNC('month', NOW())` → Missing current month, fetch

---

### 4. Find Stale Assets (Background Job)

```sql
-- Find all assets with outdated cache (> 1 hour old)
SELECT DISTINCT asset_id
FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '1 hour';
```

**Usage**: Background cache warming job to proactively refresh stale data

**Index Used**: `idx_asset_price_history_fetched`

---

### 5. Batch Insert for Backfill

```sql
-- Insert multiple months at once (for initial data population)
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES
  ($1, '2024-01-01', 187.15, 191.05, 180.17, 184.40, 48744405, 'USD', NOW()),
  ($1, '2024-02-01', 183.99, 184.98, 179.25, 181.42, 41089593, 'USD', NOW()),
  ($1, '2024-03-01', 180.75, 185.50, 178.90, 183.20, 52341200, 'USD', NOW())
ON CONFLICT (asset_id, month) DO NOTHING;
```

**Usage**: Initial data backfill when adding new assets to catalog

**Note**: `DO NOTHING` avoids overwriting existing data during bulk imports

---

### 6. Dynamic Range Queries

```sql
-- Support different time ranges (6m, 12m, 24m, 60m)
SELECT
  month,
  close,
  volume,
  currency
FROM asset_price_history
WHERE asset_id = $1
  AND month >= DATE_TRUNC('month', NOW() - INTERVAL $2)  -- $2 = '6 months', '12 months', etc.
ORDER BY month ASC;
```

**Usage**: API endpoint with `?range=6m|12m|24m|60m` query parameter

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Yahoo Finance API                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ Fetch OHLCV data
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Market Data Service (Backend)                   │
│  - Fetch last 24 months from Yahoo                          │
│  - Transform to monthly data points                          │
│  - Normalize currency                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ UPSERT batch
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           asset_price_history Table (PostgreSQL)             │
│  - Store OHLCV + metadata                                   │
│  - Track fetched_at for TTL                                 │
│  - Enforce UNIQUE (asset_id, month)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ SELECT query
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Market History Controller                       │
│  - Check cache freshness (fetched_at < 1 hour ago?)        │
│  - Return cached data if fresh                              │
│  - Refresh from Yahoo if stale                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ JSON response
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Frontend Chart Component                    │
│  - Render line/candlestick chart                            │
│  - Handle multi-currency display                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Cache TTL Strategy

### TTL Configuration by Interval

| Interval | TTL     | Rationale                                              |
|----------|---------|--------------------------------------------------------|
| 1mo      | 1 hour  | Monthly data changes infrequently, 1 hour is adequate  |
| 1wk      | 30 min  | Weekly data updates more often                         |
| 1d       | 15 min  | Daily data needs more frequent updates                 |

### Cache Logic

```javascript
// Pseudo-code for cache check
const lastFetched = await getLastFetchedTime(assetId);
const TTL_SECONDS = interval === '1mo' ? 3600 : interval === '1wk' ? 1800 : 900;

if (!lastFetched || (Date.now() - lastFetched) > TTL_SECONDS * 1000) {
  // Cache miss or stale - fetch from Yahoo
  const freshData = await fetchFromYahoo(symbol, range, interval);
  await upsertPriceHistory(assetId, freshData);
  return freshData;
} else {
  // Cache hit - return from DB
  return await queryPriceHistory(assetId, range);
}
```

---

## Performance Considerations

### Index Efficiency

**Query**: `SELECT * FROM asset_price_history WHERE asset_id = 123 ORDER BY month DESC LIMIT 24`

**Execution Plan** (Expected):
```
Index Only Scan using idx_asset_price_history_asset_month on asset_price_history
  Index Cond: (asset_id = 123)
  Rows: 24
  Cost: 0.42..12.50
```

**Notes**:
- Index-only scan (no table access needed)
- ORDER BY month DESC uses index ordering
- LIMIT 24 stops after reading 24 index entries

### Storage Estimates

**Row Size**: ~120 bytes per row (8 columns, mostly numeric)

**Growth Rate**:
- Per asset: 12 rows/year (monthly)
- 1000 assets: 12,000 rows/year = ~1.4 MB/year
- 10,000 assets (large scale): 120,000 rows/year = ~14 MB/year

**Conclusion**: Storage growth is minimal. No partitioning needed for foreseeable future.

### Scalability Limits

| Assets    | Years | Total Rows | Table Size | Query Time |
|-----------|-------|------------|------------|------------|
| 1,000     | 5     | 60,000     | ~7 MB      | < 5ms      |
| 10,000    | 5     | 600,000    | ~70 MB     | < 10ms     |
| 100,000   | 5     | 6,000,000  | ~700 MB    | < 50ms     |

**Note**: PostgreSQL can efficiently handle millions of rows with proper indexing.

---

## Migration & Deployment

### Safe Deployment Strategy

1. **No Breaking Changes**: Table uses `CREATE TABLE IF NOT EXISTS`
2. **Idempotent Indexes**: Indexes use `CREATE INDEX IF NOT EXISTS`
3. **Backward Compatible**: Does not alter existing tables
4. **No Data Migration**: New table, starts empty

### Deployment Steps

```bash
# 1. Pull latest code with updated db.js
git pull origin main

# 2. Restart backend (auto-creates table)
cd backend
npm run dev
# or
npm start

# 3. Verify table creation
psql -d nextworth_db -c "\d asset_price_history"

# 4. Verify indexes
psql -d nextworth_db -c "\d+ asset_price_history"
```

**Expected Output**:
```
✅ Conectado a PostgreSQL
✅ Tabla 'users' lista (creada o ya existente)
✅ Tabla 'assets' lista (creada o ya existente)
✅ Tabla 'user_portfolio' lista (creada o ya existente)
✅ Tabla 'asset_price_history' lista (creada o ya existente)
✅ Índices para 'asset_price_history' listos
```

### Rollback Strategy

If issues arise, the table can be safely dropped without affecting existing functionality:

```sql
-- Safe rollback (only if history feature causes issues)
DROP TABLE IF EXISTS asset_price_history CASCADE;

-- Remove from db.js and restart backend
```

**Impact**: Asset detail page historical charts will fail, but core portfolio functionality remains intact.

---

## Future Enhancements (Optional)

### 1. Add Support for More Currencies

```sql
-- Extend currency constraint (easy change)
ALTER TABLE asset_price_history
DROP CONSTRAINT asset_price_history_currency_chk;

ALTER TABLE asset_price_history
ADD CONSTRAINT asset_price_history_currency_chk
CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'BTC'));
```

### 2. Store Adjusted Close for Dividends/Splits

```sql
-- Add adjusted_close column
ALTER TABLE asset_price_history
ADD COLUMN adjusted_close NUMERIC(20, 8);

-- Update CHECK constraint
ALTER TABLE asset_price_history
ADD CONSTRAINT asset_price_history_adj_close_chk
CHECK (adjusted_close IS NULL OR adjusted_close >= 0);
```

### 3. Add Metadata JSON Field

```sql
-- Store additional Yahoo Finance metadata (market cap, P/E, etc.)
ALTER TABLE asset_price_history
ADD COLUMN metadata JSONB;

-- Index for JSONB queries
CREATE INDEX idx_asset_price_history_metadata
ON asset_price_history USING GIN (metadata);
```

### 4. Partition by Month (for Very Large Scale)

```sql
-- If table grows to 10M+ rows, consider partitioning
CREATE TABLE asset_price_history_partitioned (
  -- same columns
) PARTITION BY RANGE (month);

CREATE TABLE asset_price_history_2024_q1
PARTITION OF asset_price_history_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- Repeat for each quarter...
```

**Note**: Only needed if query performance degrades at scale (unlikely with current indexes).

---

## Testing Checklist

### Functional Tests

- [ ] Table creation is idempotent (run backend twice, no errors)
- [ ] UNIQUE constraint prevents duplicate (asset_id, month)
- [ ] CHECK constraints reject negative prices
- [ ] CHECK constraint rejects invalid OHLC (e.g., low > high)
- [ ] CHECK constraint rejects invalid currency
- [ ] UPSERT correctly updates existing rows
- [ ] UPSERT correctly inserts new rows
- [ ] ON DELETE CASCADE works (delete asset → history deleted)

### Performance Tests

- [ ] Query 24 months uses idx_asset_price_history_asset_month
- [ ] Query returns < 50ms for 1000 assets with 5 years data
- [ ] Batch insert 100 rows completes < 100ms
- [ ] Cache freshness query completes < 10ms

### Integration Tests

- [ ] Backend startup creates table without errors
- [ ] API endpoint returns correct OHLCV data
- [ ] Cache TTL logic works (stale data triggers refresh)
- [ ] Frontend chart renders historical data correctly

---

## Related Files

- **Schema Definition**: `backend/src/config/db.js` (lines 56-95)
- **API Contract**: `docs/api/asset-history.md`
- **Controller** (to be implemented): `backend/src/controllers/marketController.js`
- **Service** (to be implemented): `backend/src/services/yahooFinanceService.js`

---

## Changelog

### v1.0 (2025-12-21)
- Initial schema design
- Added OHLC fields with validation constraints
- Created three strategic indexes for query optimization
- Implemented UPSERT strategy for cache updates
- Added fetched_at for TTL tracking
- Integrated into auto-create workflow
