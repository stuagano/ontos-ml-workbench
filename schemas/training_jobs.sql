-- Training Jobs table for FMAPI fine-tuning job management
-- Tracks training jobs from creation through completion

CREATE TABLE IF NOT EXISTS training_jobs (
  -- Identity
  id STRING NOT NULL,
  training_sheet_id STRING NOT NULL,
  model_name STRING NOT NULL,

  -- Configuration
  base_model STRING NOT NULL,
  training_config VARIANT,  -- JSON: {epochs, learning_rate, batch_size, etc.}
  train_val_split DOUBLE DEFAULT 0.8,

  -- Status
  status STRING NOT NULL,  -- pending, queued, running, succeeded, failed, cancelled, timeout
  progress_percent INT DEFAULT 0,
  current_epoch INT,
  total_epochs INT,

  -- External IDs
  fmapi_job_id STRING,  -- Foundation Model API job ID
  fmapi_run_id STRING,  -- FMAPI run ID
  mlflow_experiment_id STRING,
  mlflow_run_id STRING,

  -- Data counts
  total_pairs INT DEFAULT 0,
  train_pairs INT DEFAULT 0,
  val_pairs INT DEFAULT 0,

  -- Unity Catalog registration
  register_to_uc BOOLEAN DEFAULT true,
  uc_catalog STRING,
  uc_schema STRING,
  uc_model_name STRING,
  uc_model_version STRING,

  -- Metrics (populated on completion)
  metrics VARIANT,  -- JSON: {train_loss, val_loss, accuracy, etc.}

  -- Error handling
  error_message STRING,
  error_details VARIANT,  -- JSON: detailed error info

  -- Audit
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP,

  -- Constraints
  CONSTRAINT pk_training_jobs PRIMARY KEY (id),
  CONSTRAINT fk_training_sheet FOREIGN KEY (training_sheet_id) REFERENCES assemblies(id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_training_jobs_sheet
ON training_jobs (training_sheet_id);

CREATE INDEX IF NOT EXISTS idx_training_jobs_status
ON training_jobs (status);

CREATE INDEX IF NOT EXISTS idx_training_jobs_created_by
ON training_jobs (created_by);

CREATE INDEX IF NOT EXISTS idx_training_jobs_fmapi
ON training_jobs (fmapi_job_id);

-- Training Job Lineage table
-- Explicit lineage tracking from training jobs to source assets
CREATE TABLE IF NOT EXISTS training_job_lineage (
  -- Identity
  id STRING NOT NULL,
  job_id STRING NOT NULL,

  -- Source assets
  training_sheet_id STRING NOT NULL,
  training_sheet_name STRING,
  sheet_id STRING,  -- Original data source
  sheet_name STRING,
  template_id STRING,  -- Prompt template used
  template_name STRING,

  -- Output
  model_name STRING NOT NULL,
  model_version STRING,

  -- Detailed lineage
  qa_pair_ids ARRAY<STRING>,  -- Specific Q&A pairs used
  canonical_label_ids ARRAY<STRING>,  -- Canonical labels referenced

  -- Metadata
  created_at TIMESTAMP NOT NULL,

  -- Constraints
  CONSTRAINT pk_training_job_lineage PRIMARY KEY (id),
  CONSTRAINT fk_lineage_job FOREIGN KEY (job_id) REFERENCES training_jobs(id),
  CONSTRAINT fk_lineage_sheet FOREIGN KEY (training_sheet_id) REFERENCES assemblies(id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Index for lineage queries
CREATE INDEX IF NOT EXISTS idx_lineage_job
ON training_job_lineage (job_id);

CREATE INDEX IF NOT EXISTS idx_lineage_training_sheet
ON training_job_lineage (training_sheet_id);

CREATE INDEX IF NOT EXISTS idx_lineage_model
ON training_job_lineage (model_name);

-- Training Job Metrics table
-- Stores detailed metrics captured during training
CREATE TABLE IF NOT EXISTS training_job_metrics (
  -- Identity
  id STRING NOT NULL,
  job_id STRING NOT NULL,

  -- Metrics
  train_loss DOUBLE,
  val_loss DOUBLE,
  train_accuracy DOUBLE,
  val_accuracy DOUBLE,
  learning_rate DOUBLE,
  epochs_completed INT,

  -- Performance
  training_duration_seconds DOUBLE,
  tokens_processed BIGINT,
  cost_dbu DOUBLE,  -- Estimated DBU cost

  -- Custom metrics (extensible)
  custom_metrics VARIANT,  -- JSON for additional metrics

  -- Timestamp
  recorded_at TIMESTAMP NOT NULL,

  -- Constraints
  CONSTRAINT pk_training_job_metrics PRIMARY KEY (id),
  CONSTRAINT fk_metrics_job FOREIGN KEY (job_id) REFERENCES training_jobs(id)
)
USING DELTA;

-- Index for metrics queries
CREATE INDEX IF NOT EXISTS idx_metrics_job
ON training_job_metrics (job_id);

-- Training Job Events table
-- Audit log of all job status changes and events
CREATE TABLE IF NOT EXISTS training_job_events (
  -- Identity
  id STRING NOT NULL,
  job_id STRING NOT NULL,

  -- Event details
  event_type STRING NOT NULL,  -- status_change, progress_update, error, metric_update
  old_status STRING,
  new_status STRING,
  event_data VARIANT,  -- JSON: additional event-specific data

  -- Message
  message STRING,

  -- Timestamp
  created_at TIMESTAMP NOT NULL,

  -- Constraints
  CONSTRAINT pk_training_job_events PRIMARY KEY (id),
  CONSTRAINT fk_event_job FOREIGN KEY (job_id) REFERENCES training_jobs(id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Index for event queries
CREATE INDEX IF NOT EXISTS idx_events_job
ON training_job_events (job_id);

CREATE INDEX IF NOT EXISTS idx_events_type
ON training_job_events (event_type);

CREATE INDEX IF NOT EXISTS idx_events_created
ON training_job_events (created_at);

-- Sample queries for common operations

-- 1. Get all training jobs for a Training Sheet
-- SELECT * FROM training_jobs WHERE training_sheet_id = 'sheet-123' ORDER BY created_at DESC;

-- 2. Get active training jobs
-- SELECT * FROM training_jobs WHERE status IN ('queued', 'running') ORDER BY started_at;

-- 3. Get model lineage (which Training Sheet produced this model?)
-- SELECT * FROM training_job_lineage WHERE model_name = 'my-model' ORDER BY created_at DESC;

-- 4. Get training history for a model
-- SELECT j.*, l.training_sheet_name, l.sheet_name, l.template_name
-- FROM training_jobs j
-- JOIN training_job_lineage l ON l.job_id = j.id
-- WHERE l.model_name = 'my-model'
-- ORDER BY j.created_at DESC;

-- 5. Get job metrics
-- SELECT m.* FROM training_job_metrics m WHERE m.job_id = 'job-123';

-- 6. Get job event history
-- SELECT * FROM training_job_events WHERE job_id = 'job-123' ORDER BY created_at;

-- 7. Compare models trained on same Training Sheet
-- SELECT
--   j.id,
--   j.model_name,
--   j.base_model,
--   j.training_config,
--   m.val_accuracy,
--   m.val_loss,
--   j.completed_at
-- FROM training_jobs j
-- LEFT JOIN training_job_metrics m ON m.job_id = j.id
-- WHERE j.training_sheet_id = 'sheet-123' AND j.status = 'succeeded'
-- ORDER BY m.val_accuracy DESC;
