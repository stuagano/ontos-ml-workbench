-- ============================================================================
-- Bit Attribution Table
-- ============================================================================
-- Stores computed attribution scores linking model performance to specific
-- training data (bits/training sheets). Supports ablation and Shapley methods.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.bit_attribution (
  id STRING NOT NULL DEFAULT uuid(),
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,
  bit_id STRING NOT NULL,                              -- training_sheet_id or data source identifier
  bit_version INT DEFAULT 1,
  attribution_method STRING NOT NULL,                   -- ablation, shapley
  accuracy_impact DOUBLE DEFAULT 0.0,
  precision_impact DOUBLE DEFAULT 0.0,
  recall_impact DOUBLE DEFAULT 0.0,
  f1_impact DOUBLE DEFAULT 0.0,
  importance_rank INT,
  importance_score DOUBLE DEFAULT 0.0,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_bit_attribution PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
