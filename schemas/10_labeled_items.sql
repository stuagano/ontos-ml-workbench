-- ============================================================================
-- Table: labeled_items
-- ============================================================================
-- Individual item annotations within labeling tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.labeled_items (
  -- Identity
  id STRING NOT NULL,
  task_id STRING NOT NULL COMMENT 'FK to labeling_tasks.id',
  job_id STRING NOT NULL COMMENT 'FK to labeling_jobs.id (denormalized for query performance)',

  -- Item reference
  row_index INT NOT NULL COMMENT 'Row index in the source sheet',

  -- AI suggestions
  ai_labels VARIANT COMMENT 'AI-generated label suggestions (JSON dict of field_id → value)',
  ai_confidence DOUBLE COMMENT 'AI confidence score (0.0–1.0)',

  -- Human labels
  human_labels VARIANT COMMENT 'Expert-provided labels (JSON dict of field_id → value)',
  labeled_by STRING COMMENT 'Email of the human labeler',
  labeled_at TIMESTAMP,

  -- Status
  status STRING DEFAULT 'pending' COMMENT 'pending | ai_labeled | human_labeled | reviewed | flagged | skipped',

  -- Review
  review_status STRING COMMENT 'approved | rejected | needs_correction',
  review_notes STRING,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,

  -- Flags
  is_difficult BOOLEAN DEFAULT false COMMENT 'Labeler flagged as difficult',
  needs_discussion BOOLEAN DEFAULT false COMMENT 'Needs team discussion',
  skip_reason STRING COMMENT 'Reason if item was skipped',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_labeled_items PRIMARY KEY (id)
)
COMMENT 'Individual item annotations within labeling tasks'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labeled_items_task ON ${CATALOG}.${SCHEMA}.labeled_items(task_id);
CREATE INDEX IF NOT EXISTS idx_labeled_items_job ON ${CATALOG}.${SCHEMA}.labeled_items(job_id);
CREATE INDEX IF NOT EXISTS idx_labeled_items_status ON ${CATALOG}.${SCHEMA}.labeled_items(status);
CREATE INDEX IF NOT EXISTS idx_labeled_items_review ON ${CATALOG}.${SCHEMA}.labeled_items(review_status);
