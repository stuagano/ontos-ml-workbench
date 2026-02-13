-- ============================================================================
-- VITAL Platform Workbench - Monitor Stage Schema Fixes
-- ============================================================================
-- Purpose: Fix missing schema elements blocking the Monitor stage
--
--   Issue #1: monitor_alerts table does not exist
--   Issue #2: feedback_items table missing flagged column
--
-- Execution:
--   Run this script in Databricks SQL Editor against the workspace
--   where the VITAL Platform Workbench is deployed.
--
-- Prerequisites:
--   - Schema home_stuart_gano.mirion_vital_workbench must exist
--   - User must have CREATE TABLE and ALTER TABLE permissions
--   - feedback_items table must exist (created by init.sql)
--
-- Validation:
--   After running, verify with:
--     DESCRIBE TABLE EXTENDED home_stuart_gano.mirion_vital_workbench.monitor_alerts;
--     DESCRIBE TABLE EXTENDED home_stuart_gano.mirion_vital_workbench.feedback_items;
--
-- ============================================================================

-- Set default catalog/schema for convenience
USE CATALOG home_stuart_gano;
USE SCHEMA mirion_vital_workbench;

-- ============================================================================
-- FIX #1: Create monitor_alerts table
-- ============================================================================
-- Purpose: Track monitoring alerts for deployed model endpoints
--          Supports drift, latency, error_rate, and quality alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,

  -- Alert definition
  alert_type STRING NOT NULL,  -- drift, latency, error_rate, quality
  threshold DOUBLE,
  condition STRING,  -- gt, lt, eq

  -- Alert state
  status STRING DEFAULT 'active',  -- active, acknowledged, resolved
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,

  -- Alert details
  current_value DOUBLE,
  message STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT monitor_alerts_pk PRIMARY KEY (id)
) USING DELTA
COMMENT 'Monitoring alerts for deployed model endpoints. Tracks drift, latency, error rate, and quality alerts.';

-- ============================================================================
-- FIX #2: Add flagged column to feedback_items table
-- ============================================================================
-- Purpose: Track problematic feedback entries for review
--          Used by monitoring endpoints to identify failed requests
-- ============================================================================

-- Check if column already exists (safe to run multiple times)
-- Note: ALTER TABLE ADD COLUMN is idempotent in Databricks - it will
-- silently succeed if the column already exists

ALTER TABLE home_stuart_gano.mirion_vital_workbench.feedback_items
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify monitor_alerts table structure
SELECT
  'monitor_alerts table structure' as check_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_catalog = 'home_stuart_gano'
  AND table_schema = 'mirion_vital_workbench'
  AND table_name = 'monitor_alerts';

-- Verify feedback_items has flagged column
SELECT
  'feedback_items.flagged column exists' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as exists
FROM information_schema.columns
WHERE table_catalog = 'home_stuart_gano'
  AND table_schema = 'mirion_vital_workbench'
  AND table_name = 'feedback_items'
  AND column_name = 'flagged';

-- Check row counts (should be 0 for new installations)
SELECT 'monitor_alerts' as table_name, COUNT(*) as row_count
FROM home_stuart_gano.mirion_vital_workbench.monitor_alerts
UNION ALL
SELECT 'feedback_items' as table_name, COUNT(*) as row_count
FROM home_stuart_gano.mirion_vital_workbench.feedback_items;

-- ============================================================================
-- Expected Results
-- ============================================================================
-- After running this script successfully:
--
-- 1. monitor_alerts table exists with 13 columns
-- 2. feedback_items table has flagged column (BOOLEAN, DEFAULT FALSE)
-- 3. Both tables are empty (0 rows) for new installations
--
-- The Monitor stage API endpoints in backend/app/api/v1/endpoints/monitoring.py
-- will now work correctly:
--   - GET /api/v1/monitoring/metrics/performance
--   - GET /api/v1/monitoring/metrics/realtime/{endpoint_id}
--   - POST /api/v1/monitoring/alerts
--   - GET /api/v1/monitoring/alerts
--   - GET /api/v1/monitoring/drift/{endpoint_id}
--   - GET /api/v1/monitoring/health/{endpoint_id}
-- ============================================================================
