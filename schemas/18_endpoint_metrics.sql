-- ============================================================================
-- Endpoint Metrics Table
-- ============================================================================
-- Captures per-request performance metrics for deployed model endpoints.
-- Enables real latency percentiles, error rate tracking, and cost analysis.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.endpoint_metrics (
  id STRING NOT NULL DEFAULT uuid(),
  endpoint_id STRING NOT NULL,
  endpoint_name STRING,
  request_id STRING,
  model_name STRING,
  model_version STRING,
  latency_ms DOUBLE NOT NULL,
  status_code INT DEFAULT 200,
  error_message STRING,
  input_tokens INT,
  output_tokens INT,
  total_tokens INT,
  cost_dollars DOUBLE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_endpoint_metrics PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
