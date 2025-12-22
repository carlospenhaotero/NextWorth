-- ============================================================
-- Asset Price History - Quick Reference SQL
-- ============================================================
-- Common queries for working with asset_price_history table
-- Database: nextworth_db (PostgreSQL)
-- ============================================================

-- ============================================================
-- TABLE STRUCTURE VERIFICATION
-- ============================================================

-- Show table structure
\d asset_price_history

-- Show all indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'asset_price_history';

-- Show all constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'asset_price_history'::regclass;

-- ============================================================
-- BASIC QUERIES
-- ============================================================

-- Get last 24 months for specific asset
SELECT
  TO_CHAR(month, 'YYYY-MM-DD') AS date,
  EXTRACT(EPOCH FROM month)::bigint * 1000 AS timestamp,
  open, high, low, close, volume, currency
FROM asset_price_history
WHERE asset_id = 1  -- Replace with actual asset_id
ORDER BY month ASC
LIMIT 24;

-- Get latest price for asset
SELECT
  close AS current_price,
  currency,
  TO_CHAR(month, 'YYYY-MM-DD') AS date
FROM asset_price_history
WHERE asset_id = 1
ORDER BY month DESC
LIMIT 1;

-- Get all assets with historical data
SELECT
  a.id,
  a.symbol,
  a.name,
  COUNT(aph.id) AS month_count,
  MIN(aph.month) AS earliest_month,
  MAX(aph.month) AS latest_month
FROM assets a
LEFT JOIN asset_price_history aph ON aph.asset_id = a.id
GROUP BY a.id, a.symbol, a.name
HAVING COUNT(aph.id) > 0
ORDER BY month_count DESC;

-- ============================================================
-- UPSERT OPERATIONS
-- ============================================================

-- Single month UPSERT
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES (
  1,                    -- asset_id
  '2024-01-01',        -- month (first day of month)
  150.5,               -- open
  152.3,               -- high
  149.8,               -- low
  151.2,               -- close
  45000000,            -- volume
  'USD',               -- currency
  NOW()                -- fetched_at
)
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

-- Batch UPSERT (multiple months)
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES
  (1, '2023-01-01', 150.5, 152.3, 149.8, 151.2, 45000000, 'USD', NOW()),
  (1, '2023-02-01', 151.2, 155.0, 150.0, 154.5, 48000000, 'USD', NOW()),
  (1, '2023-03-01', 154.5, 158.7, 153.2, 157.8, 52000000, 'USD', NOW())
ON CONFLICT (asset_id, month)
DO UPDATE SET
  open = EXCLUDED.open,
  high = EXCLUDED.high,
  low = EXCLUDED.low,
  close = EXCLUDED.close,
  volume = EXCLUDED.volume,
  currency = EXCLUDED.currency,
  fetched_at = NOW();

-- ============================================================
-- CACHE MANAGEMENT
-- ============================================================

-- Check cache freshness (1 hour TTL)
SELECT
  COUNT(*) AS cached_count,
  MAX(fetched_at) AS last_fetch
FROM asset_price_history
WHERE asset_id = 1
  AND month >= NOW() - INTERVAL '24 months'
  AND fetched_at > NOW() - INTERVAL '1 hour';

-- Find stale cache entries (older than 1 hour)
SELECT
  asset_id,
  COUNT(*) AS stale_count,
  MAX(fetched_at) AS last_update
FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '1 hour'
GROUP BY asset_id
ORDER BY stale_count DESC;

-- Invalidate cache for specific asset
UPDATE asset_price_history
SET fetched_at = NOW() - INTERVAL '2 hours'
WHERE asset_id = 1;

-- Clear very old cache (older than 30 days)
DELETE FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '30 days';

-- ============================================================
-- DATA ANALYSIS
-- ============================================================

-- Calculate monthly price change
WITH latest AS (
  SELECT close, month
  FROM asset_price_history
  WHERE asset_id = 1
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

-- Calculate 3-month Simple Moving Average (SMA)
SELECT
  TO_CHAR(month, 'YYYY-MM-DD') AS date,
  close,
  AVG(close) OVER (
    ORDER BY month
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) AS sma_3_month
FROM asset_price_history
WHERE asset_id = 1
ORDER BY month ASC;

-- Calculate volatility (standard deviation)
SELECT
  STDDEV(close) AS volatility,
  AVG(close) AS avg_price,
  MIN(close) AS min_price,
  MAX(close) AS max_price,
  COUNT(*) AS data_points
FROM asset_price_history
WHERE asset_id = 1
  AND month >= NOW() - INTERVAL '12 months';

-- Find highest and lowest months
SELECT
  TO_CHAR(month, 'YYYY-MM-DD') AS date,
  close,
  CASE
    WHEN close = MAX(close) OVER () THEN 'HIGHEST'
    WHEN close = MIN(close) OVER () THEN 'LOWEST'
    ELSE ''
  END AS mark
FROM asset_price_history
WHERE asset_id = 1
ORDER BY month DESC;

-- ============================================================
-- DATA QUALITY
-- ============================================================

-- Find missing months in expected range
WITH expected_months AS (
  SELECT generate_series(
    DATE_TRUNC('month', NOW() - INTERVAL '24 months'),
    DATE_TRUNC('month', NOW()),
    '1 month'::interval
  )::date AS month
)
SELECT TO_CHAR(em.month, 'YYYY-MM-DD') AS missing_month
FROM expected_months em
LEFT JOIN asset_price_history aph
  ON aph.asset_id = 1 AND aph.month = em.month
WHERE aph.id IS NULL
ORDER BY em.month ASC;

-- Check for invalid OHLC relationships
SELECT
  asset_id,
  TO_CHAR(month, 'YYYY-MM-DD') AS date,
  open, high, low, close,
  CASE
    WHEN low > high THEN 'Low > High'
    WHEN open < low OR open > high THEN 'Open out of range'
    WHEN close < low OR close > high THEN 'Close out of range'
    ELSE 'OK'
  END AS validation_error
FROM asset_price_history
WHERE NOT (
  low <= high AND
  open >= low AND open <= high AND
  close >= low AND close <= high
);

-- ============================================================
-- PERFORMANCE ANALYSIS
-- ============================================================

-- Analyze query performance (get last 24 months)
EXPLAIN ANALYZE
SELECT *
FROM asset_price_history
WHERE asset_id = 1
ORDER BY month DESC
LIMIT 24;

-- Check index usage statistics
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

-- Table size and row count
SELECT
  pg_size_pretty(pg_total_relation_size('asset_price_history')) AS total_size,
  pg_size_pretty(pg_relation_size('asset_price_history')) AS table_size,
  pg_size_pretty(pg_total_relation_size('asset_price_history') - pg_relation_size('asset_price_history')) AS indexes_size,
  (SELECT COUNT(*) FROM asset_price_history) AS row_count;

-- ============================================================
-- MAINTENANCE
-- ============================================================

-- Vacuum and analyze table
VACUUM ANALYZE asset_price_history;

-- Reindex table (if indexes become fragmented)
REINDEX TABLE asset_price_history;

-- Check for bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
WHERE tablename = 'asset_price_history';

-- ============================================================
-- ARCHIVE OLD DATA (> 5 YEARS)
-- ============================================================

-- Create archive table
CREATE TABLE IF NOT EXISTS asset_price_history_archive (
  LIKE asset_price_history INCLUDING ALL
);

-- Move old data to archive
INSERT INTO asset_price_history_archive
SELECT * FROM asset_price_history
WHERE month < NOW() - INTERVAL '5 years';

-- Delete archived data from main table
DELETE FROM asset_price_history
WHERE month < NOW() - INTERVAL '5 years';

-- ============================================================
-- TESTING / DEVELOPMENT
-- ============================================================

-- Insert test data for all existing assets
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
SELECT
  id,
  DATE_TRUNC('month', NOW() - INTERVAL '1 month'),
  100,
  105,
  98,
  103,
  1000000,
  currency
FROM assets
ON CONFLICT (asset_id, month) DO NOTHING;

-- Delete test data
DELETE FROM asset_price_history
WHERE close = 103 AND volume = 1000000;

-- Clear all historical data (CAUTION!)
-- TRUNCATE TABLE asset_price_history;

-- ============================================================
-- DEBUGGING
-- ============================================================

-- Count records per asset
SELECT
  a.id,
  a.symbol,
  COUNT(aph.id) AS month_count
FROM assets a
LEFT JOIN asset_price_history aph ON aph.asset_id = a.id
GROUP BY a.id, a.symbol
ORDER BY month_count DESC;

-- Find duplicate records (should be zero due to UNIQUE constraint)
SELECT
  asset_id,
  month,
  COUNT(*) AS duplicate_count
FROM asset_price_history
GROUP BY asset_id, month
HAVING COUNT(*) > 1;

-- Show recent activity
SELECT
  a.symbol,
  TO_CHAR(aph.month, 'YYYY-MM-DD') AS date,
  aph.close,
  aph.fetched_at
FROM asset_price_history aph
JOIN assets a ON a.id = aph.asset_id
ORDER BY aph.fetched_at DESC
LIMIT 20;

-- ============================================================
-- ROLLBACK (IF NEEDED)
-- ============================================================

-- Drop table and all indexes (CAUTION!)
-- DROP TABLE IF EXISTS asset_price_history CASCADE;

-- Drop indexes only (keep table)
-- DROP INDEX IF EXISTS idx_asset_price_history_asset_month;
-- DROP INDEX IF EXISTS idx_asset_price_history_fetched;
-- DROP INDEX IF EXISTS idx_asset_price_history_asset_fetched;

-- ============================================================
-- END OF QUICK REFERENCE
-- ============================================================

-- Notes:
-- 1. Replace asset_id = 1 with actual asset IDs from your database
-- 2. Adjust intervals (24 months, 1 hour, etc.) as needed
-- 3. All queries are production-safe except those marked with CAUTION!
-- 4. Use EXPLAIN ANALYZE to verify query plans use indexes
-- 5. Run VACUUM ANALYZE after bulk operations
