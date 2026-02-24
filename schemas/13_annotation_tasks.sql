-- ============================================================================
-- Annotation Tasks Table
-- ============================================================================
-- Tracks annotation tasks created to fill identified gaps.
-- Tasks can be assigned to teams/individuals and track progress
-- toward a target record count.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.annotation_tasks (
  task_id STRING NOT NULL,
  task_type STRING DEFAULT 'gap_fill',
  title STRING NOT NULL,
  description STRING,
  instructions STRING,
  source_gap_id STRING,
  target_record_count INT DEFAULT 100,
  records_completed INT DEFAULT 0,
  assigned_to STRING,
  assigned_team STRING,
  priority STRING DEFAULT 'medium',
  status STRING DEFAULT 'pending',                    -- pending, assigned, in_progress, review, completed, cancelled
  due_date TIMESTAMP,
  output_bit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING DEFAULT 'gap_analysis_service',
  CONSTRAINT pk_annotation_tasks PRIMARY KEY (task_id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
