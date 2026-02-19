-- ============================================================================
-- Table: model_evaluations
-- ============================================================================
-- Stores per-metric evaluation results from mlflow.evaluate() and other
-- evaluation harnesses. One row per metric per evaluation run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.model_evaluations (
  -- Identity
  id STRING NOT NULL,

  -- Model reference
  job_id STRING COMMENT 'Training job that produced the model',
  model_name STRING NOT NULL COMMENT 'Unity Catalog model name',
  model_version STRING NOT NULL COMMENT 'Unity Catalog model version',

  -- Evaluation context
  eval_dataset_id STRING COMMENT 'Training Sheet ID used as eval set',
  eval_type STRING COMMENT 'post_training, scheduled, manual',
  evaluator STRING COMMENT 'mlflow_evaluate, custom, llm_judge',

  -- Metric data (one row per metric)
  metric_name STRING NOT NULL COMMENT 'e.g., accuracy, f1_score, relevance',
  metric_value DOUBLE NOT NULL COMMENT 'The metric value',

  -- Full evaluation details
  eval_config VARIANT COMMENT 'JSON evaluation parameters',
  eval_results VARIANT COMMENT 'Full mlflow.evaluate() output',

  -- MLflow tracking
  mlflow_run_id STRING COMMENT 'MLflow run ID for the evaluation',
  mlflow_experiment_id STRING COMMENT 'MLflow experiment ID',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_model_evaluations PRIMARY KEY (id)
)
COMMENT 'Per-metric evaluation results from mlflow.evaluate() and other harnesses'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'gold'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_eval_model ON ${CATALOG}.${SCHEMA}.model_evaluations(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_eval_job ON ${CATALOG}.${SCHEMA}.model_evaluations(job_id);
