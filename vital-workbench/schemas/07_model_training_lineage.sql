-- ============================================================================
-- Table: model_training_lineage
-- ============================================================================
-- Tracks which models were trained with which Training Sheets
-- Enables traceability from deployed model back to source data
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.model_training_lineage (
  -- Identity
  id STRING NOT NULL,

  -- Model information
  model_name STRING NOT NULL COMMENT 'Name of the trained model',
  model_version STRING COMMENT 'Version or checkpoint identifier',
  model_registry_path STRING COMMENT 'Unity Catalog model path (e.g., catalog.schema.model)',

  -- Training Sheet reference
  training_sheet_id STRING NOT NULL COMMENT 'Reference to training_sheets.id',
  training_sheet_name STRING COMMENT 'Denormalized for easy reporting',

  -- Training job information
  training_job_id STRING COMMENT 'Databricks Job ID that ran the training',
  training_run_id STRING COMMENT 'MLflow run ID',
  training_started_at TIMESTAMP,
  training_completed_at TIMESTAMP,
  training_duration_seconds INT,

  -- Training configuration
  base_model STRING COMMENT 'Foundation model used as base',
  training_params VARIANT COMMENT 'JSON with epochs, batch_size, learning_rate, etc.',

  -- Training metrics
  final_loss DOUBLE,
  final_accuracy DOUBLE,
  training_metrics VARIANT COMMENT 'JSON with all training metrics',

  -- Dataset statistics
  training_examples_count INT COMMENT 'Number of Q&A pairs used',
  validation_examples_count INT,

  -- Deployment information
  deployment_status STRING COMMENT 'Status: training, completed, deployed, deprecated',
  deployed_at TIMESTAMP,
  deployed_by STRING,
  deployment_endpoint STRING COMMENT 'Model serving endpoint if deployed',

  -- Governance
  data_lineage VARIANT COMMENT 'JSON documenting full data lineage (Sheet → Template → Training Sheet → Model)',
  compliance_notes STRING,

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_model_training_lineage PRIMARY KEY (id)
)
COMMENT 'Tracks model training runs and their Training Sheet lineage'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'gold'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lineage_model ON home_stuart_gano.mirion_vital_workbench.model_training_lineage(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_lineage_training_sheet ON home_stuart_gano.mirion_vital_workbench.model_training_lineage(training_sheet_id);
CREATE INDEX IF NOT EXISTS idx_lineage_status ON home_stuart_gano.mirion_vital_workbench.model_training_lineage(deployment_status);
