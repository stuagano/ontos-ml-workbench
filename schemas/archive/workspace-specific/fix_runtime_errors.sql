-- ============================================================================
-- Ontos ML Workbench: Runtime Error Fixes
-- ============================================================================
-- Execute this script in Databricks SQL Editor to fix all runtime errors
-- Warehouse: <your-warehouse-id>
-- ============================================================================

-- Fix 1: Create monitor_alerts table (if not exists)
CREATE TABLE IF NOT EXISTS `your_catalog`.`ontos_ml_workbench`.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,
  alert_type STRING NOT NULL,
  threshold DOUBLE,
  condition STRING,
  status STRING DEFAULT 'active',
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,
  current_value DOUBLE,
  message STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  CONSTRAINT monitor_alerts_pk PRIMARY KEY (id)
) USING DELTA
COMMENT 'Monitoring alerts for deployed model endpoints';

-- Fix 2: Add flagged column to feedback_items (if not exists)
ALTER TABLE `your_catalog`.`ontos_ml_workbench`.feedback_items
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify monitor_alerts table exists
SELECT 'monitor_alerts table exists' as status, COUNT(*) as row_count
FROM `your_catalog`.`ontos_ml_workbench`.monitor_alerts;

-- Verify flagged column exists in feedback_items
DESCRIBE TABLE `your_catalog`.`ontos_ml_workbench`.feedback_items;

-- Show all tables in schema
SHOW TABLES IN `your_catalog`.`ontos_ml_workbench`;
