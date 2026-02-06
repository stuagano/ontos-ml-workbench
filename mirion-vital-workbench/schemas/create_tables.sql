-- Create Tables for VITAL Workbench
-- Schema: erp-demonstrations.vital_workbench (ID: 8c866643-2b1e-4b8d-8497-8a009badfae3)
-- Run this FIRST before seeding demo data

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS `erp-demonstrations`.`vital_workbench`;

-- ============================================================================
-- TEMPLATES TABLE (Required for seed_templates.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`vital_workbench`.templates (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  version STRING NOT NULL DEFAULT '1.0.0',
  status STRING NOT NULL DEFAULT 'draft',  -- draft, published, archived

  -- Schema definition for input/output
  input_schema STRING,  -- JSON array
  output_schema STRING, -- JSON array

  -- Prompt configuration
  prompt_template STRING,
  system_prompt STRING,

  -- Few-shot examples stored as JSON array
  examples STRING,  -- JSON: [{input: {}, output: {}, explanation: ""}]

  -- Model configuration
  base_model STRING DEFAULT 'databricks-meta-llama-3-1-70b-instruct',
  temperature DOUBLE DEFAULT 0.7,
  max_tokens INT DEFAULT 1024,

  -- Source data reference
  source_catalog STRING,
  source_schema STRING,
  source_table STRING,
  source_volume STRING,

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT templates_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- SHEETS TABLE (Required for data sources)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`vital_workbench`.sheets (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  version STRING NOT NULL DEFAULT '1.0.0',
  status STRING NOT NULL DEFAULT 'draft',

  -- Column definitions stored as JSON array
  columns STRING,

  -- Row count (cached for display)
  row_count INT,

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT sheets_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- ASSEMBLIES TABLE (Required for curate stage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`vital_workbench`.assemblies (
  id STRING NOT NULL,
  sheet_id STRING NOT NULL,
  sheet_name STRING,

  -- Frozen template config (JSON snapshot at assembly time)
  template_config STRING NOT NULL,

  -- Status
  status STRING NOT NULL DEFAULT 'ready',

  -- Row counts
  total_rows INT DEFAULT 0,
  ai_generated_count INT DEFAULT 0,
  human_labeled_count INT DEFAULT 0,
  human_verified_count INT DEFAULT 0,
  flagged_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT current_timestamp(),
  created_by STRING,
  updated_at TIMESTAMP DEFAULT current_timestamp(),
  completed_at TIMESTAMP,

  -- Error info
  error_message STRING,

  CONSTRAINT assemblies_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- ASSEMBLY_ROWS TABLE (Required for curate data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`vital_workbench`.assembly_rows (
  id STRING NOT NULL,
  assembly_id STRING NOT NULL,
  row_index INT NOT NULL,

  -- The rendered prompt
  prompt STRING NOT NULL,

  -- Source data snapshot (JSON)
  source_data STRING,

  -- Response
  response STRING,
  response_source STRING NOT NULL DEFAULT 'empty',

  -- Generation metadata
  generated_at TIMESTAMP,
  confidence_score DOUBLE,

  -- Labeling metadata
  labeled_at TIMESTAMP,
  labeled_by STRING,
  verified_at TIMESTAMP,
  verified_by STRING,

  -- Quality flags
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason STRING,

  -- Timestamps
  created_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT assembly_rows_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- VERIFY TABLES CREATED
-- ============================================================================

SHOW TABLES IN `erp-demonstrations`.`vital_workbench`;
