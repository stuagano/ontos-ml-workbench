-- ============================================================================
-- Table: templates
-- ============================================================================
-- Reusable prompt templates for Q&A generation
-- Each template has a label_type that connects to canonical labels
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.templates (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Template content
  system_prompt STRING NOT NULL COMMENT 'System message for Foundation Model API',
  user_prompt_template STRING NOT NULL COMMENT 'Jinja2 template with {{column_name}} placeholders',

  -- Label type configuration (CRITICAL FIELD)
  label_type STRING NOT NULL COMMENT 'Type of label produced (e.g., entities, defect_type, sentiment)',
  label_schema VARIANT COMMENT 'JSON schema for expected label structure',

  -- Generation parameters
  model_name STRING DEFAULT 'databricks-meta-llama-3-1-70b-instruct' COMMENT 'Foundation Model to use',
  temperature DOUBLE DEFAULT 0.0 COMMENT 'Generation temperature (0.0 = deterministic)',
  max_tokens INT DEFAULT 2048 COMMENT 'Maximum tokens to generate',

  -- Validation rules
  output_format STRING DEFAULT 'json' COMMENT 'Expected output format: json, text, structured',
  validation_rules VARIANT COMMENT 'JSON rules for validating generated outputs',

  -- Example few-shot examples (inline)
  examples VARIANT COMMENT 'Array of {input, output} example pairs for few-shot learning',

  -- Usage governance
  allowed_uses ARRAY<STRING> COMMENT 'Approved use cases for this template',
  prohibited_uses ARRAY<STRING> COMMENT 'Explicitly prohibited uses',

  -- Version tracking
  version INT NOT NULL DEFAULT 1,
  parent_template_id STRING COMMENT 'ID of template this was forked from',
  is_latest BOOLEAN DEFAULT true COMMENT 'Is this the latest version?',

  -- Status
  status STRING DEFAULT 'draft' COMMENT 'Status: draft, active, archived',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_templates PRIMARY KEY (id)
)
COMMENT 'Prompt templates with label_type for Q&A generation'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_templates_label_type ON home_stuart_gano.mirion_vital_workbench.templates(label_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON home_stuart_gano.mirion_vital_workbench.templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_latest ON home_stuart_gano.mirion_vital_workbench.templates(is_latest) WHERE is_latest = true;
