-- ============================================================================
-- Identified Gaps Table
-- ============================================================================
-- Stores gap analysis results: coverage, quality, distribution, capability,
-- and edge case gaps identified by automated analysis or expert review.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.identified_gaps (
  gap_id STRING NOT NULL,
  model_name STRING,
  template_id STRING,
  gap_type STRING NOT NULL,                          -- coverage, quality, distribution, capability, edge_case
  severity STRING NOT NULL,                           -- critical, high, medium, low
  description STRING NOT NULL,
  evidence_type STRING,
  evidence_summary STRING,
  affected_queries_count INT DEFAULT 0,
  error_rate DOUBLE,
  suggested_action STRING,
  suggested_bit_name STRING,
  estimated_records_needed INT DEFAULT 0,
  status STRING DEFAULT 'identified',                 -- identified, task_created, in_progress, resolved, wont_fix
  priority INT DEFAULT 50,
  resolution_task_id STRING,
  resolution_notes STRING,
  identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  identified_by STRING DEFAULT 'gap_analysis_service',
  CONSTRAINT pk_identified_gaps PRIMARY KEY (gap_id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
