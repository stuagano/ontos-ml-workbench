-- ============================================================================
-- Table: training_sheets
-- ============================================================================
-- Collections of Q&A pairs generated from a Sheet + Template
-- These are the datasets that get exported for model fine-tuning
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_sheets (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Source references
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id',
  template_id STRING NOT NULL COMMENT 'Reference to templates.id',
  template_version INT COMMENT 'Version of template used',

  -- ML Configuration (copied from template at generation time)
  feature_columns ARRAY<STRING> COMMENT 'Independent variables (input features) used',
  target_column STRING COMMENT 'Dependent variable (output/target) being predicted',

  -- Domain scoping
  domain_id STRING COMMENT 'FK to data_domains.id',

  -- Generation configuration
  generation_mode STRING NOT NULL DEFAULT 'ai_generated' COMMENT 'Mode: ai_generated, manual, hybrid',
  model_used STRING COMMENT 'Foundation Model used for generation',
  generation_params VARIANT COMMENT 'JSON with temperature, max_tokens, etc.',

  -- Generation status
  status STRING DEFAULT 'generating' COMMENT 'Status: generating, review, approved, rejected, exported',
  generation_started_at TIMESTAMP,
  generation_completed_at TIMESTAMP,
  generation_error STRING COMMENT 'Error message if generation failed',

  -- Statistics
  total_items INT DEFAULT 0 COMMENT 'Total items from source Sheet',
  generated_count INT DEFAULT 0 COMMENT 'Q&A pairs generated',
  approved_count INT DEFAULT 0 COMMENT 'Q&A pairs approved',
  rejected_count INT DEFAULT 0 COMMENT 'Q&A pairs rejected',
  auto_approved_count INT DEFAULT 0 COMMENT 'Q&A pairs auto-approved via canonical labels',

  -- Review tracking
  reviewed_by STRING COMMENT 'User who completed final review',
  reviewed_at TIMESTAMP,
  approval_rate DOUBLE COMMENT 'Percentage of pairs approved (0.0-1.0)',

  -- Export tracking
  exported_at TIMESTAMP,
  exported_by STRING,
  export_path STRING COMMENT 'Volume path where JSONL was exported',
  export_format STRING DEFAULT 'jsonl' COMMENT 'Export format: jsonl, parquet, csv',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_training_sheets PRIMARY KEY (id)
)
COMMENT 'Q&A datasets generated from Sheets using Templates'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_training_sheets_sheet ON ${CATALOG}.${SCHEMA}.training_sheets(sheet_id);
CREATE INDEX IF NOT EXISTS idx_training_sheets_template ON ${CATALOG}.${SCHEMA}.training_sheets(template_id);
CREATE INDEX IF NOT EXISTS idx_training_sheets_status ON ${CATALOG}.${SCHEMA}.training_sheets(status);
