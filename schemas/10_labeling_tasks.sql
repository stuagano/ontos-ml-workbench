-- ============================================================================
-- Table: labeling_tasks
-- ============================================================================
-- Task batches within labeling jobs — assigned to labelers for annotation
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.labeling_tasks (
  -- Identity
  id STRING NOT NULL,
  job_id STRING NOT NULL COMMENT 'FK to labeling_jobs.id',

  -- Task definition
  name STRING COMMENT 'Optional task name (auto-generated if omitted)',
  item_indices VARIANT NOT NULL COMMENT 'JSON array of row indices from the source sheet',
  item_count INT NOT NULL COMMENT 'Number of items in this batch',

  -- Assignment
  assigned_to STRING COMMENT 'Email of the assigned labeler',
  assigned_at TIMESTAMP,

  -- Status
  status STRING DEFAULT 'pending' COMMENT 'pending | assigned | in_progress | submitted | review | approved | rejected | rework',

  -- Progress
  labeled_count INT DEFAULT 0 COMMENT 'Number of items labeled so far',
  started_at TIMESTAMP COMMENT 'When the labeler began working',
  submitted_at TIMESTAMP COMMENT 'When the labeler submitted for review',

  -- Review
  reviewer STRING COMMENT 'Email of the reviewer',
  reviewed_at TIMESTAMP,
  review_notes STRING,
  rejection_reason STRING,

  -- Priority and scheduling
  priority STRING DEFAULT 'normal' COMMENT 'low | normal | high | urgent',
  due_date TIMESTAMP,

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_labeling_tasks PRIMARY KEY (id)
)
COMMENT 'Labeling task batches — items assigned to labelers within a job'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labeling_tasks_job ON ${CATALOG}.${SCHEMA}.labeling_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_labeling_tasks_status ON ${CATALOG}.${SCHEMA}.labeling_tasks(status);
CREATE INDEX IF NOT EXISTS idx_labeling_tasks_assigned ON ${CATALOG}.${SCHEMA}.labeling_tasks(assigned_to);
