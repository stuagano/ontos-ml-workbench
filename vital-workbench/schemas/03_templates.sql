-- ============================================================================
-- Table: templates
-- ============================================================================
-- Reusable prompt templates for Q&A generation
-- Each template has a label_type that connects to canonical labels
--
-- VERIFIED SCHEMA: Matches actual database as of 2026-02-11
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.templates (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Template content
  system_prompt STRING COMMENT 'System instructions for the LLM',
  user_prompt_template STRING COMMENT 'Template with placeholders like {text}, {image_url}',
  output_schema STRING COMMENT 'JSON schema defining expected output structure',

  -- Label type configuration (CRITICAL FIELD)
  label_type STRING COMMENT 'Type of label produced: classification, entity_extraction, QA, etc.',

  -- ML column configuration (supervised learning)
  feature_columns ARRAY<STRING> COMMENT 'Independent variables (input features) - columns used to make predictions',
  target_column STRING COMMENT 'Dependent variable (output/target) - the column we are trying to predict',

  -- Few-shot examples
  few_shot_examples ARRAY<STRING> COMMENT 'Array of example prompt/completion pairs',

  -- Version tracking
  version STRING,
  parent_template_id STRING COMMENT 'ID of template this was derived from',

  -- Status
  status STRING COMMENT 'Status: draft, active, archived',

  -- Audit fields
  created_at TIMESTAMP,
  created_by STRING,
  updated_at TIMESTAMP,
  updated_by STRING,

  -- Constraints
  CONSTRAINT pk_templates PRIMARY KEY (id)
)
COMMENT 'Prompt templates with label_type for Q&A generation'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- ============================================================================
-- IMPORTANT: Model Configuration (temperature, max_tokens, etc.) is NOT
-- stored in the database. These are passed at runtime when generating.
-- ============================================================================
