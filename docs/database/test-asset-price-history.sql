-- Test Script for asset_price_history Table
-- Run this script after backend startup to verify table creation

-- ============================================================================
-- PART 1: Verify Table Structure
-- ============================================================================

-- Check if table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'asset_price_history';

-- View table structure
\d asset_price_history

-- View all indexes
\di *asset_price_history*

-- ============================================================================
-- PART 2: Sample Data Insert
-- ============================================================================

-- First, ensure we have a test asset
INSERT INTO assets (symbol, name, asset_type, currency, risk_level)
VALUES ('AAPL', 'Apple Inc.', 'stocks', 'USD', 3)
ON CONFLICT (symbol, asset_type) DO NOTHING;

-- Get the asset_id for AAPL
-- Replace <asset_id> below with the actual ID returned
SELECT id FROM assets WHERE symbol = 'AAPL' AND asset_type = 'stocks';

-- Insert sample historical data (last 6 months)
-- Replace <asset_id> with actual ID from above query
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES
  (1, '2024-06-01', 192.25, 196.89, 188.01, 193.12, 65432100, 'USD', NOW()),
  (1, '2024-07-01', 193.10, 197.50, 189.75, 195.50, 58901234, 'USD', NOW()),
  (1, '2024-08-01', 195.48, 199.20, 191.30, 197.80, 62345678, 'USD', NOW()),
  (1, '2024-09-01', 197.82, 201.00, 194.50, 199.25, 59876543, 'USD', NOW()),
  (1, '2024-10-01', 199.20, 202.80, 196.00, 201.50, 61234567, 'USD', NOW()),
  (1, '2024-11-01', 201.48, 205.10, 198.20, 203.85, 64567890, 'USD', NOW())
ON CONFLICT (asset_id, month) DO NOTHING;

-- ============================================================================
-- PART 3: Test UPSERT (Update Existing Row)
-- ============================================================================

-- Try to insert duplicate month - should update instead
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
VALUES
  (1, '2024-11-01', 201.99, 206.00, 199.00, 204.50, 70000000, 'USD', NOW())
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

-- ============================================================================
-- PART 4: Test Query Patterns
-- ============================================================================

-- Query 1: Get last 24 months (should return 6 rows from our sample)
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
WHERE asset_id = 1
  AND month >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
ORDER BY month ASC;

-- Query 2: Get history with asset metadata
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
WHERE aph.asset_id = 1
  AND aph.month >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
ORDER BY aph.month ASC;

-- Query 3: Check cache freshness
SELECT
  asset_id,
  MAX(month) as latest_month,
  MAX(fetched_at) as last_fetched,
  NOW() - MAX(fetched_at) as time_since_fetch
FROM asset_price_history
WHERE asset_id = 1
GROUP BY asset_id;

-- Query 4: Find stale assets (fetched more than 1 hour ago)
-- (Should return nothing with fresh sample data)
SELECT DISTINCT asset_id
FROM asset_price_history
WHERE fetched_at < NOW() - INTERVAL '1 hour';

-- ============================================================================
-- PART 5: Test Constraints
-- ============================================================================

-- Test 1: Negative price (should FAIL)
-- Expected: ERROR: new row violates check constraint "asset_price_history_close_chk"
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
VALUES (1, '2024-12-01', 100, 110, 90, -50, 1000000, 'USD');

-- Test 2: Invalid OHLC (low > high) (should FAIL)
-- Expected: ERROR: new row violates check constraint "asset_price_history_ohlc_chk"
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
VALUES (1, '2024-12-01', 100, 90, 110, 95, 1000000, 'USD');

-- Test 3: Invalid currency (should FAIL)
-- Expected: ERROR: new row violates check constraint "asset_price_history_currency_chk"
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
VALUES (1, '2024-12-01', 100, 110, 90, 105, 1000000, 'GBP');

-- Test 4: Duplicate (asset_id, month) (should FAIL without ON CONFLICT)
-- Expected: ERROR: duplicate key value violates unique constraint
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
VALUES (1, '2024-11-01', 200, 205, 195, 203, 1000000, 'USD');

-- ============================================================================
-- PART 6: Test Cascade Delete
-- ============================================================================

-- Insert a test asset that we'll delete
INSERT INTO assets (symbol, name, asset_type, currency, risk_level)
VALUES ('TEST', 'Test Asset', 'stocks', 'USD', 1)
ON CONFLICT (symbol, asset_type) DO NOTHING
RETURNING id;

-- Insert history for test asset (replace <test_asset_id>)
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency
)
VALUES
  (999, '2024-11-01', 10, 12, 9, 11, 1000, 'USD')
ON CONFLICT (asset_id, month) DO NOTHING;

-- Verify history exists
SELECT * FROM asset_price_history WHERE asset_id = 999;

-- Delete the asset (should cascade delete history)
DELETE FROM assets WHERE symbol = 'TEST' AND asset_type = 'stocks';

-- Verify history was deleted (should return 0 rows)
SELECT * FROM asset_price_history WHERE asset_id = 999;

-- ============================================================================
-- PART 7: Performance Analysis
-- ============================================================================

-- Analyze query execution plan for primary query pattern
EXPLAIN ANALYZE
SELECT
  month,
  close,
  volume,
  currency
FROM asset_price_history
WHERE asset_id = 1
  AND month >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
ORDER BY month ASC;

-- Expected plan:
-- Index Scan using idx_asset_price_history_asset_month
-- Index Cond: (asset_id = 1)
-- Filter: (month >= ...)

-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'asset_price_history';

-- ============================================================================
-- PART 8: Bulk Data Insert for Performance Testing
-- ============================================================================

-- Generate 24 months of sample data using generate_series
INSERT INTO asset_price_history (
  asset_id, month, open, high, low, close, volume, currency, fetched_at
)
SELECT
  1 as asset_id,
  DATE_TRUNC('month', NOW() - (g || ' months')::INTERVAL) as month,
  180 + (RANDOM() * 20) as open,
  200 + (RANDOM() * 10) as high,
  170 + (RANDOM() * 10) as low,
  185 + (RANDOM() * 15) as close,
  (50000000 + RANDOM() * 20000000)::BIGINT as volume,
  'USD' as currency,
  NOW() as fetched_at
FROM generate_series(0, 23) as g
ON CONFLICT (asset_id, month) DO NOTHING;

-- Verify 24 months exist
SELECT COUNT(*) FROM asset_price_history WHERE asset_id = 1;

-- ============================================================================
-- PART 9: Cleanup (Optional)
-- ============================================================================

-- Remove all test data
-- DELETE FROM asset_price_history WHERE asset_id = 1;

-- Drop table (only if needed for fresh start)
-- DROP TABLE IF EXISTS asset_price_history CASCADE;

-- ============================================================================
-- PART 10: Table Statistics
-- ============================================================================

-- View table size and row count
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename = 'asset_price_history';

-- View index sizes
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'asset_price_history';
