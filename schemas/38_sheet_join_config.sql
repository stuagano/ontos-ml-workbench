-- ============================================================================
-- Migration: Add join_config to sheets
-- ============================================================================
-- Enables multi-source joins on Sheets. Stores join configuration as a JSON
-- string, following the same pattern as template_config.
-- Backward-compatible: existing sheets have join_config = NULL and work unchanged.
-- ============================================================================

ALTER TABLE ${CATALOG}.${SCHEMA}.sheets
ADD COLUMN join_config STRING COMMENT 'JSON: multi-source join configuration (sources, key mappings, join type, time window)';
