-- ============================================================================
-- Ontos ML Workbench - Unity Catalog Setup
-- ============================================================================
-- Creates the schema for all Ontos ML Workbench tables
-- Run this first before creating any tables
-- ============================================================================
-- CONFIGURATION:
--   ${CATALOG} and ${SCHEMA} are replaced automatically by execute_schemas.py
--   Values come from DATABRICKS_CATALOG and DATABRICKS_SCHEMA env vars
--   (set in backend/.env or exported before running)
-- ============================================================================

-- Create the workbench schema in main catalog
CREATE SCHEMA IF NOT EXISTS ${CATALOG}.${SCHEMA}
COMMENT 'Ontos ML Workbench - Training data curation and management for AI-powered radiation safety systems';

-- Grant usage permissions (adjust as needed for your workspace)
-- GRANT USAGE ON SCHEMA ${CATALOG}.${SCHEMA} TO `<your-group>`;
-- GRANT CREATE TABLE ON SCHEMA ${CATALOG}.${SCHEMA} TO `<your-group>`;

-- Verify creation
SHOW TABLES IN ${CATALOG}.${SCHEMA};
