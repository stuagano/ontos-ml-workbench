-- ============================================================================
-- Data Domains - Hierarchical organizational domains for data governance
-- ============================================================================
-- Part of Ontos Governance G3: Domain Management
-- Domains organize assets (sheets, templates, training sheets) into
-- logical groupings. Supports parent-child hierarchy via parent_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.data_domains (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  parent_id STRING COMMENT 'Self-referential FK for hierarchy',
  owner_email STRING,
  icon STRING,
  color STRING COMMENT 'Hex color for UI',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_data_domains PRIMARY KEY (id),
  CONSTRAINT uq_data_domains_name UNIQUE (name)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
