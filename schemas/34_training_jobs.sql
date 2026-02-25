-- ============================================================================
-- Tables: training_jobs, training_job_lineage, training_job_metrics, training_job_events
-- ============================================================================
-- End-to-end training job tracking: submission, progress, metrics, lineage
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_jobs (
  id STRING NOT NULL,
  training_sheet_id STRING NOT NULL COMMENT 'Reference to training_sheets.id',
  model_name STRING NOT NULL COMMENT 'User-chosen model name',
  base_model STRING NOT NULL COMMENT 'Foundation model being fine-tuned',
  training_config STRING COMMENT 'JSON training hyperparameters',
  train_val_split DOUBLE,
  status STRING NOT NULL COMMENT 'pending, queued, running, succeeded, failed, cancelled',
  total_pairs INT,
  train_pairs INT,
  val_pairs INT,

  -- FMAPI integration
  fmapi_job_id STRING COMMENT 'Databricks FMAPI job ID',
  fmapi_run_id STRING COMMENT 'FMAPI run ID',

  -- MLflow integration
  mlflow_experiment_id STRING,
  mlflow_run_id STRING,

  -- Unity Catalog model registry
  register_to_uc BOOLEAN,
  uc_catalog STRING,
  uc_schema STRING,
  uc_model_name STRING COMMENT 'Registered model name in UC',
  uc_model_version STRING COMMENT 'Registered model version',

  -- Progress tracking
  metrics STRING COMMENT 'JSON latest metrics snapshot',
  progress_percent INT,
  current_epoch INT,
  total_epochs INT,

  -- Error handling
  error_message STRING,

  -- Audit fields
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT pk_training_jobs PRIMARY KEY (id)
)
COMMENT 'Fine-tuning job tracking with FMAPI and MLflow integration';


CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_job_lineage (
  id STRING NOT NULL,
  job_id STRING NOT NULL COMMENT 'Reference to training_jobs.id',
  training_sheet_id STRING NOT NULL,
  training_sheet_name STRING,
  model_name STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,

  CONSTRAINT pk_training_job_lineage PRIMARY KEY (id)
)
COMMENT 'Lineage linking training jobs to source training sheets';


CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_job_metrics (
  id STRING NOT NULL,
  job_id STRING NOT NULL COMMENT 'Reference to training_jobs.id',
  train_loss DOUBLE,
  val_loss DOUBLE,
  train_accuracy DOUBLE,
  val_accuracy DOUBLE,
  recorded_at TIMESTAMP NOT NULL,

  CONSTRAINT pk_training_job_metrics PRIMARY KEY (id)
)
COMMENT 'Per-checkpoint training metrics';


CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.training_job_events (
  id STRING NOT NULL,
  job_id STRING NOT NULL COMMENT 'Reference to training_jobs.id',
  event_type STRING NOT NULL COMMENT 'status_change, error, info',
  old_status STRING,
  new_status STRING,
  message STRING,
  created_at TIMESTAMP NOT NULL,

  CONSTRAINT pk_training_job_events PRIMARY KEY (id)
)
COMMENT 'Training job event log for auditing and debugging';
