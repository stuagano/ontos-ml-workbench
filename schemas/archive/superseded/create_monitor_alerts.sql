-- ============================================================================
-- Migration: Create monitor_alerts table
-- ============================================================================
-- Purpose: Create the monitor_alerts table for tracking monitoring alerts
--          on deployed model endpoints.
--
-- Usage:
--   This script should be executed against your Databricks workspace
--   with appropriate catalog and schema substitution.
--
-- Prerequisites:
--   - Catalog and schema must exist
--   - User must have CREATE TABLE permissions on the schema
--   - endpoints_registry table should exist (referenced by alerts)
--
-- ============================================================================

-- Replace these variables with your actual catalog and schema names
-- Example:
--   catalog: your_catalog (or your_catalog for dev)
--   schema: ontos_ml_workbench (or ontos_ml_workbench for dev)

CREATE TABLE IF NOT EXISTS `${catalog}`.`${schema}`.monitor_alerts (
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
-- Verification Queries
-- ============================================================================

-- Verify table was created successfully
DESCRIBE TABLE EXTENDED `${catalog}`.`${schema}`.monitor_alerts;

-- Check table is empty (expected on first creation)
SELECT COUNT(*) as row_count FROM `${catalog}`.`${schema}`.monitor_alerts;
