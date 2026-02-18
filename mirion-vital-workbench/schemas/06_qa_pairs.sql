-- ============================================================================
-- Table: qa_pairs
-- ============================================================================
-- Individual question-answer pairs within Training Sheets
-- Each pair may link to a canonical label for traceability
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.ontos_ml_workbench.qa_pairs (
  -- Identity
  id STRING NOT NULL,
  training_sheet_id STRING NOT NULL COMMENT 'Reference to training_sheets.id',

  -- Source reference
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id (denormalized for queries)',
  item_ref STRING NOT NULL COMMENT 'Identifier for the source item',

  -- Q&A content (following OpenAI chat format)
  messages VARIANT NOT NULL COMMENT 'Array of {role, content} messages (system, user, assistant)',

  -- Canonical label linkage (CRITICAL)
  canonical_label_id STRING COMMENT 'Reference to canonical_labels.id if label was reused',
  was_auto_approved BOOLEAN DEFAULT false COMMENT 'Was this auto-approved via canonical label?',

  -- Review status
  review_status STRING DEFAULT 'pending' COMMENT 'Status: pending, approved, edited, rejected, flagged',
  review_action STRING COMMENT 'Action taken: approve, edit, reject, flag',
  reviewed_by STRING,
  reviewed_at TIMESTAMP,

  -- If edited, store original
  original_messages VARIANT COMMENT 'Original messages before editing',
  edit_reason STRING COMMENT 'Why the assistant response was edited',

  -- Quality tracking
  quality_flags ARRAY<STRING> COMMENT 'Flags: hallucination, incomplete, ambiguous, incorrect, etc.',
  quality_score DOUBLE COMMENT 'Quality rating (0.0-1.0)',

  -- Metadata
  generation_metadata VARIANT COMMENT 'JSON with model, latency, tokens used, etc.',

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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_qa_pairs_training_sheet ON home_stuart_gano.ontos_ml_workbench.qa_pairs(training_sheet_id);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_review_status ON home_stuart_gano.ontos_ml_workbench.qa_pairs(review_status);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_canonical_label ON home_stuart_gano.ontos_ml_workbench.qa_pairs(canonical_label_id) WHERE canonical_label_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_pairs_auto_approved ON home_stuart_gano.ontos_ml_workbench.qa_pairs(was_auto_approved) WHERE was_auto_approved = true;
CREATE INDEX IF NOT EXISTS idx_qa_pairs_item_ref ON home_stuart_gano.ontos_ml_workbench.qa_pairs(sheet_id, item_ref);
