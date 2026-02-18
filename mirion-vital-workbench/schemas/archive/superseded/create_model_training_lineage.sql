-- ============================================================================
-- Migration: Create model_training_lineage table
-- ============================================================================
-- Purpose: Create the model_training_lineage table for tracking which models
--          were trained with which Training Sheets, enabling full traceability
--          from deployed model back to source data.
--
-- Usage:
--   This script should be executed against your Databricks workspace
--   with appropriate catalog and schema substitution.
--
-- Prerequisites:
--   - Catalog and schema must exist
--   - User must have CREATE TABLE permissions on the schema
--   - training_sheets table should exist (referenced by lineage)
--
-- ============================================================================

-- Replace these variables with your actual catalog and schema names
-- Example:
--   catalog: erp-demonstrations (or home_stuart_gano for dev)
--   schema: ontos_ml_workbench (or ontos_ml_workbench for dev)

CREATE TABLE IF NOT EXISTS `${catalog}`.`${schema}`.model_training_lineage (
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
) USING DELTA
COMMENT 'Tracks model training runs and their Training Sheet lineage'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'gold'
);

-- ============================================================================
-- Create indexes for common queries
-- ============================================================================

-- Note: Delta Lake on Databricks automatically creates indexes on primary keys.
-- Additional indexes can be created using OPTIMIZE ZORDER BY commands.
-- Examples:

-- Optimize for model lookups
-- OPTIMIZE `${catalog}`.`${schema}`.model_training_lineage
-- ZORDER BY (model_name, model_version);

-- Optimize for training sheet lineage
-- OPTIMIZE `${catalog}`.`${schema}`.model_training_lineage
-- ZORDER BY (training_sheet_id);

-- Optimize for deployment status queries
-- OPTIMIZE `${catalog}`.`${schema}`.model_training_lineage
-- ZORDER BY (deployment_status);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table was created successfully
DESCRIBE TABLE EXTENDED `${catalog}`.`${schema}`.model_training_lineage;

-- Check table is empty (expected on first creation)
SELECT COUNT(*) as row_count FROM `${catalog}`.`${schema}`.model_training_lineage;

-- Example: View model lineage after data is populated
-- SELECT
--   model_name,
--   model_version,
--   training_sheet_name,
--   deployment_status,
--   training_examples_count,
--   created_at
-- FROM `${catalog}`.`${schema}`.model_training_lineage
-- ORDER BY created_at DESC;
