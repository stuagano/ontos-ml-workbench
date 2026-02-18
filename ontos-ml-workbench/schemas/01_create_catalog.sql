-- ============================================================================
-- Ontos ML Workbench - Unity Catalog Setup
-- ============================================================================
-- Creates the schema for all Ontos ML Workbench tables in the main catalog
-- Run this first before creating any tables
-- ============================================================================
-- NOTE: Using home_stuart_gano.ontos_ml_workbench instead of ontos_ml.workbench
--       because CREATE CATALOG requires metastore admin permissions
-- ============================================================================

-- Create the workbench schema in main catalog
CREATE SCHEMA IF NOT EXISTS home_stuart_gano.ontos_ml_workbench
COMMENT 'Ontos ML Workbench - Training data curation and management for AI-powered radiation safety systems';

-- Grant usage permissions (adjust as needed for your workspace)
-- GRANT USAGE ON SCHEMA home_stuart_gano.ontos_ml_workbench TO `<your-group>`;
-- GRANT CREATE TABLE ON SCHEMA home_stuart_gano.ontos_ml_workbench TO `<your-group>`;

-- Verify creation
SHOW TABLES IN home_stuart_gano.ontos_ml_workbench;
