-- ============================================================================
-- Table: labeling_jobs
-- ============================================================================
-- Labeling job definitions — projects created from sheets for annotation
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.labeling_jobs (
  -- Identity
  id STRING NOT NULL,

  -- Job definition
  name STRING NOT NULL COMMENT 'Human-readable job name',
  description STRING COMMENT 'Job description and scope',
  sheet_id STRING NOT NULL COMMENT 'FK to sheets.id — source data for labeling',
  target_columns ARRAY<STRING> NOT NULL COMMENT 'Column IDs from the sheet to label',
  label_schema VARIANT NOT NULL COMMENT 'JSON schema defining label fields (types, options, validation)',
  instructions STRING COMMENT 'Markdown instructions for labelers',

  -- AI assist
  ai_assist_enabled BOOLEAN DEFAULT true COMMENT 'Whether to pre-label with AI suggestions',
  ai_model STRING COMMENT 'Model used for AI-assisted pre-labeling',

  -- Assignment configuration
  assignment_strategy STRING DEFAULT 'manual' COMMENT 'manual | round_robin | load_balanced',
  default_batch_size INT DEFAULT 50 COMMENT 'Default number of items per task batch',

  -- Status
  status STRING DEFAULT 'draft' COMMENT 'draft | active | paused | completed | archived',

  -- Progress stats (denormalized for query performance)
  total_items INT DEFAULT 0,
  labeled_items INT DEFAULT 0,
  reviewed_items INT DEFAULT 0,
  approved_items INT DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_labeling_jobs PRIMARY KEY (id)
)
COMMENT 'Labeling job definitions — annotation projects created from sheets'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labeling_jobs_status ON ${CATALOG}.${SCHEMA}.labeling_jobs(status);
CREATE INDEX IF NOT EXISTS idx_labeling_jobs_sheet ON ${CATALOG}.${SCHEMA}.labeling_jobs(sheet_id);
