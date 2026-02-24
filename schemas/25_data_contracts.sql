-- ============================================================================
-- Data Contracts - Schema specifications with quality guarantees (ODCS v3.0.2)
-- ============================================================================
-- Part of Ontos Governance G5: Data Contracts
-- Defines schema expectations, quality SLOs, and lifecycle for datasets.
-- Lifecycle: draft → active → deprecated → retired
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.data_contracts (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  version STRING NOT NULL DEFAULT '1.0.0' COMMENT 'Semantic version of the contract',
  status STRING NOT NULL DEFAULT 'draft' COMMENT 'draft | active | deprecated | retired',
  dataset_id STRING COMMENT 'FK to sheets.id — the dataset this contract governs',
  dataset_name STRING COMMENT 'Denormalized dataset name for display',
  domain_id STRING COMMENT 'FK to data_domains.id',
  owner_email STRING,
  schema_definition STRING COMMENT 'JSON array of column specs: [{name, type, required, description, constraints}]',
  quality_rules STRING COMMENT 'JSON array of SLO rules: [{metric, operator, threshold, description}]',
  terms STRING COMMENT 'JSON object of usage terms: {purpose, limitations, retention_days}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  activated_at TIMESTAMP COMMENT 'When status changed to active',
  CONSTRAINT pk_data_contracts PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
