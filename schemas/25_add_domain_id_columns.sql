-- ============================================================================
-- Migration: Add domain_id to core asset tables
-- ============================================================================
-- Links sheets, templates, and training_sheets to data_domains
-- Each asset belongs to at most one domain (simple FK, not junction table)
-- ============================================================================

ALTER TABLE ${CATALOG}.${SCHEMA}.sheets
  ADD COLUMN IF NOT EXISTS domain_id STRING COMMENT 'FK to data_domains.id';

ALTER TABLE ${CATALOG}.${SCHEMA}.templates
  ADD COLUMN IF NOT EXISTS domain_id STRING COMMENT 'FK to data_domains.id';

ALTER TABLE ${CATALOG}.${SCHEMA}.training_sheets
  ADD COLUMN IF NOT EXISTS domain_id STRING COMMENT 'FK to data_domains.id';
