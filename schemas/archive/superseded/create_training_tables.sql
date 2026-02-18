-- Create training_sheets and qa_pairs tables for PRD v2.3
-- Target: ${CATALOG}.${SCHEMA}

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_sheets (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Source references
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id',
  template_id STRING NOT NULL COMMENT 'Reference to templates.id',
  template_version INT COMMENT 'Version of template used',

  -- Generation configuration
  generation_mode STRING NOT NULL DEFAULT 'ai_generated' COMMENT 'Mode: ai_generated, manual, hybrid',
  model_used STRING COMMENT 'Foundation Model used for generation',
  generation_params STRING COMMENT 'JSON with temperature, max_tokens, etc.',

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

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.qa_pairs (
  -- Identity
  id STRING NOT NULL,
  training_sheet_id STRING NOT NULL COMMENT 'Reference to training_sheets.id',

  -- Source reference
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id (denormalized for queries)',
  item_ref STRING NOT NULL COMMENT 'Identifier for the source item',

  -- Q&A content (following OpenAI chat format)
  messages STRING NOT NULL COMMENT 'JSON array of {role, content} messages (system, user, assistant)',

  -- Canonical label linkage (CRITICAL)
  canonical_label_id STRING COMMENT 'Reference to canonical_labels.id if label was reused',
  was_auto_approved BOOLEAN DEFAULT false COMMENT 'Was this auto-approved via canonical label?',

  -- Review status
  review_status STRING DEFAULT 'pending' COMMENT 'Status: pending, approved, edited, rejected, flagged',
  review_action STRING COMMENT 'Action taken: approve, edit, reject, flag',
  reviewed_by STRING,
  reviewed_at TIMESTAMP,

  -- If edited, store original
  original_messages STRING COMMENT 'Original messages before editing (JSON)',
  edit_reason STRING COMMENT 'Why the assistant response was edited',

  -- Quality tracking
  quality_flags STRING COMMENT 'JSON array of flags: hallucination, incomplete, ambiguous, incorrect, etc.',
  quality_score DOUBLE COMMENT 'Quality rating (0.0-1.0)',

  -- Metadata
  generation_metadata STRING COMMENT 'JSON with model, latency, tokens used, etc.',

  -- Position in Training Sheet
  sequence_number INT COMMENT 'Order within training_sheet',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_qa_pairs PRIMARY KEY (id)
)
COMMENT 'Individual Q&A pairs with canonical label linkage'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);
