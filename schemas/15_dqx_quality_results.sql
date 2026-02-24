-- ============================================================================
-- DQX Quality Results Table
-- ============================================================================
-- Stores data quality check results per sheet. Each run_checks() invocation
-- creates a new run_id so historical results are preserved.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.dqx_quality_results (
  id STRING NOT NULL DEFAULT uuid(),
  run_id STRING NOT NULL,
  sheet_id STRING NOT NULL,
  source_table STRING NOT NULL,
  total_rows INT NOT NULL,
  passed_rows INT NOT NULL,
  failed_rows INT NOT NULL,
  pass_rate DOUBLE NOT NULL,
  checks_run INT DEFAULT 0,
  column_results STRING,                                -- JSON array of per-check results
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_dqx_quality_results PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
