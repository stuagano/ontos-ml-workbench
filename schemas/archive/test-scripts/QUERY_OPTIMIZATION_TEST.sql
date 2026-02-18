-- ============================================================================
-- Sheet Query Optimization Test Queries
-- ============================================================================
-- These queries can be run directly in Databricks SQL Editor to verify
-- performance improvements.
--
-- Expected improvements:
-- 1. Column selection: ~50% faster than SELECT *
-- 2. LIMIT clause: Prevents runaway queries
-- 3. Proper indexing on 'status' and 'created_at' columns
-- ============================================================================

-- Change this to your catalog and schema
USE CATALOG your_catalog;
USE SCHEMA ontos_ml_workbench;

-- ============================================================================
-- Test 1: OLD query (SLOW) - SELECT * without column filtering
-- ============================================================================
-- Expected: Fetches all columns including potentially large JSON fields
-- Time: Baseline for comparison
-- ============================================================================

SELECT *
FROM sheets
WHERE status != 'deleted'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- Test 2: NEW query (FAST) - Selective columns only
-- ============================================================================
-- Expected: ~50% faster due to reduced data transfer
-- Improvement: Fetches only required columns
-- ============================================================================

SELECT id, name, description, status, source_type, source_table, source_volume,
       item_count, created_at, created_by, updated_at, updated_by
FROM sheets
WHERE status != 'deleted'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- Test 3: With status filter (most common use case)
-- ============================================================================
-- Expected: Faster due to WHERE clause filtering
-- Note: Ensure index exists on 'status' column for best performance
-- ============================================================================

SELECT id, name, description, status, source_type, source_table, source_volume,
       item_count, created_at, created_by, updated_at, updated_by
FROM sheets
WHERE status != 'deleted' AND status = 'active'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- Test 4: Single sheet retrieval (get_sheet query)
-- ============================================================================
-- Expected: Very fast (<1s) with proper index on 'id' column
-- ============================================================================

SELECT id, name, description, status, source_type, source_table, source_volume,
       item_count, created_at, created_by, updated_at, updated_by
FROM sheets
WHERE id = 'your-sheet-id-here' AND status != 'deleted'
LIMIT 1;

-- ============================================================================
-- Test 5: Check table statistics
-- ============================================================================
-- This shows table size and helps explain query performance
-- ============================================================================

DESCRIBE DETAIL sheets;

-- ============================================================================
-- Test 6: Analyze query plan
-- ============================================================================
-- Use EXPLAIN to understand query execution plan
-- ============================================================================

EXPLAIN
SELECT id, name, description, status, source_type, source_table, source_volume,
       item_count, created_at, created_by, updated_at, updated_by
FROM sheets
WHERE status != 'deleted'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- Performance Optimization Tips
-- ============================================================================
-- 1. Create indexes on frequently queried columns:
--    - status (for filtering)
--    - created_at (for sorting)
--    - id (for lookups)
--
-- 2. Run OPTIMIZE command periodically to compact small files:
--    OPTIMIZE sheets;
--
-- 3. Run ANALYZE TABLE to update statistics:
--    ANALYZE TABLE sheets COMPUTE STATISTICS;
--
-- 4. Consider ZORDER for common query patterns:
--    OPTIMIZE sheets ZORDER BY (status, created_at);
-- ============================================================================

-- ============================================================================
-- Additional Diagnostics
-- ============================================================================

-- Check number of files (many small files = slow queries)
DESCRIBE DETAIL sheets;

-- Check row count
SELECT COUNT(*) as total_sheets,
       COUNT(CASE WHEN status != 'deleted' THEN 1 END) as active_sheets,
       COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_sheets
FROM sheets;

-- Check column sizes (identify heavy columns)
SELECT
    COUNT(*) as row_count,
    AVG(LENGTH(CAST(name AS STRING))) as avg_name_size,
    AVG(LENGTH(CAST(description AS STRING))) as avg_description_size
FROM sheets;
