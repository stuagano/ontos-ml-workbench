-- ============================================================================
-- Table: sheets
-- ============================================================================
-- Dataset definitions that point to Unity Catalog tables or volumes
-- Sheets are the source data that gets labeled and turned into Training Sheets
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.sheets (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Data source configuration
  source_type STRING NOT NULL COMMENT 'Type: uc_table, uc_volume, or external',
  source_table STRING COMMENT 'Unity Catalog table reference (e.g., catalog.schema.table)',
  source_volume STRING COMMENT 'Unity Catalog volume path (e.g., /Volumes/catalog/schema/volume)',
  source_path STRING COMMENT 'Path within volume if source_type is uc_volume',

  -- Schema information
  item_id_column STRING COMMENT 'Column name to use as item_ref in canonical labels',
  text_columns ARRAY<STRING> COMMENT 'Column names containing text data',
  image_columns ARRAY<STRING> COMMENT 'Column names with image paths (in volumes)',
  metadata_columns ARRAY<STRING> COMMENT 'Additional columns to include as context',

  -- Configuration
  sampling_strategy STRING DEFAULT 'all' COMMENT 'Options: all, random, stratified',
  sample_size INT COMMENT 'Number of items to sample (null = all)',
  filter_expression STRING COMMENT 'SQL WHERE clause to filter items',

  -- Template configuration (attached via /sheets/{id}/attach-template)
  template_config STRING COMMENT 'JSON: prompt_template, system_instruction, model, temperature, max_tokens, label_type, column_mapping, etc.',

  -- Domain & join configuration
  domain_id STRING COMMENT 'FK to data_domains.id',
  join_config STRING COMMENT 'JSON: multi-source join configuration (sources, key mappings, join type, time window)',

  -- Status tracking
  status STRING DEFAULT 'active' COMMENT 'Status: active, archived, deleted',
  item_count INT COMMENT 'Cached count of items in dataset',
  last_validated_at TIMESTAMP COMMENT 'Last time source was validated',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_sheets PRIMARY KEY (id)
)
COMMENT 'Dataset definitions that reference Unity Catalog tables or volumes'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'bronze'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sheets_status ON ${CATALOG}.${SCHEMA}.sheets(status);
CREATE INDEX IF NOT EXISTS idx_sheets_source_type ON ${CATALOG}.${SCHEMA}.sheets(source_type);
