-- Databits Workbench Schema Initialization
-- Run this against your Unity Catalog to create all required tables

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS ${catalog}.${schema};

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- AI Sheets (Spreadsheet-style datasets with imported and AI-generated columns)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.sheets (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  version STRING NOT NULL DEFAULT '1.0.0',
  status STRING NOT NULL DEFAULT 'draft',  -- draft, published, archived

  -- Column definitions stored as JSON array
  -- Each column: {id, name, data_type, source_type, import_config?, generation_config?, order}
  columns STRING,  -- JSON array of ColumnDefinition

  -- Row count (cached for display)
  row_count INT,

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT sheets_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Sheet Data (stores generated and manually edited cell values)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.sheet_data (
  id STRING NOT NULL,
  sheet_id STRING NOT NULL,
  row_index INT NOT NULL,
  column_id STRING NOT NULL,

  -- Cell value (stored as JSON)
  value STRING,

  -- Source of the value
  source STRING NOT NULL DEFAULT 'imported',  -- imported, generated, manual

  -- Timestamps for tracking
  generated_at TIMESTAMP,  -- When AI generated this value
  edited_at TIMESTAMP,     -- When manually edited (becomes few-shot example)

  CONSTRAINT sheet_data_pk PRIMARY KEY (id),
  CONSTRAINT sheet_data_sheet_fk FOREIGN KEY (sheet_id) REFERENCES ${catalog}.${schema}.sheets(id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Index for fast lookups by sheet and row
-- Note: Delta Lake handles this via Z-ordering, added as comment for reference
-- ZORDER BY (sheet_id, row_index);


-- Databits (Prompt Templates) - Legacy, being replaced by AI Sheets
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.templates (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  version STRING NOT NULL DEFAULT '1.0.0',
  status STRING NOT NULL DEFAULT 'draft',  -- draft, published, archived

  -- Schema definition for input/output
  input_schema MAP<STRING, STRING>,  -- field_name -> type
  output_schema MAP<STRING, STRING>, -- field_name -> type

  -- Prompt configuration
  prompt_template STRING,
  system_prompt STRING,

  -- Few-shot examples stored as JSON array
  examples STRING,  -- JSON: [{input: {}, output: {}, explanation: ""}]

  -- Model configuration
  base_model STRING DEFAULT 'databricks-meta-llama-3-1-70b-instruct',
  temperature DOUBLE DEFAULT 0.7,
  max_tokens INT DEFAULT 1024,

  -- Source data reference
  source_catalog STRING,
  source_schema STRING,
  source_table STRING,
  source_volume STRING,

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT templates_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Curation Items
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.curation_items (
  id STRING NOT NULL,
  template_id STRING NOT NULL,

  -- Source reference
  item_ref STRING,  -- Row ID or file path
  item_data STRING,  -- JSON of actual data matching template schema

  -- AI labeling results
  agent_label STRING,  -- JSON of AI-generated labels
  agent_confidence DOUBLE,
  agent_model STRING,
  agent_reasoning STRING,

  -- Human review
  human_label STRING,  -- JSON of human-corrected labels
  status STRING NOT NULL DEFAULT 'pending',  -- pending, auto_approved, needs_review, approved, rejected, flagged
  quality_score DOUBLE,

  -- Review metadata
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_notes STRING,

  -- Timestamps
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT curation_items_pk PRIMARY KEY (id),
  CONSTRAINT curation_items_template_fk FOREIGN KEY (template_id) REFERENCES ${catalog}.${schema}.templates(id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Job Runs
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.job_runs (
  id STRING NOT NULL,
  job_type STRING NOT NULL,  -- labeling, training, evaluation, deployment, etc.
  job_name STRING,

  -- Reference to what triggered this job
  template_id STRING,
  model_id STRING,
  endpoint_id STRING,

  -- Databricks job reference
  databricks_run_id STRING,
  databricks_job_id STRING,

  -- Status tracking
  status STRING NOT NULL DEFAULT 'pending',  -- pending, running, succeeded, failed, cancelled
  progress DOUBLE DEFAULT 0.0,  -- 0.0 to 1.0

  -- Configuration used
  config STRING,  -- JSON of job parameters

  -- Results
  result STRING,  -- JSON of job output
  error_message STRING,

  -- Metrics
  items_processed INT,
  duration_seconds INT,

  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  created_by STRING,

  CONSTRAINT job_runs_pk PRIMARY KEY (id)
) USING DELTA;

-- ============================================================================
-- REGISTRY TABLES
-- ============================================================================

-- Tools Registry (UC Functions)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.tools_registry (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- UC Function reference
  uc_function_path STRING,  -- catalog.schema.function_name

  -- Function signature
  parameters_schema STRING,  -- JSON Schema for parameters
  return_type STRING,

  -- Documentation
  documentation STRING,
  examples STRING,  -- JSON array of usage examples

  -- Versioning
  version STRING DEFAULT '1.0.0',
  status STRING DEFAULT 'draft',  -- draft, published, deprecated

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT tools_registry_pk PRIMARY KEY (id)
) USING DELTA;

-- Agents Registry
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.agents_registry (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Model configuration
  model_endpoint STRING,  -- Serving endpoint name
  system_prompt STRING,

  -- Tools this agent can use
  tools STRING,  -- JSON array of tool IDs

  -- Linked template (for prompt/examples)
  template_id STRING,

  -- Configuration
  temperature DOUBLE DEFAULT 0.7,
  max_tokens INT DEFAULT 2048,

  -- Versioning
  version STRING DEFAULT '1.0.0',
  status STRING DEFAULT 'draft',  -- draft, deployed, archived

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT agents_registry_pk PRIMARY KEY (id)
) USING DELTA;

-- Endpoints Registry
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.endpoints_registry (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Databricks serving endpoint
  endpoint_name STRING NOT NULL,
  endpoint_type STRING NOT NULL,  -- model, agent, chain

  -- What's deployed
  agent_id STRING,
  model_name STRING,
  model_version STRING,

  -- Traffic configuration
  traffic_config STRING,  -- JSON: {"model_a": 0.9, "model_b": 0.1}

  -- Status
  status STRING DEFAULT 'creating',  -- creating, ready, updating, failed, stopped

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT endpoints_registry_pk PRIMARY KEY (id)
) USING DELTA;

-- ============================================================================
-- MONITORING & FEEDBACK TABLES
-- ============================================================================

-- Feedback Items
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.feedback_items (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,

  -- Request reference
  request_id STRING,
  trace_id STRING,

  -- Request/Response data
  input_data STRING,  -- JSON
  output_data STRING,  -- JSON

  -- Feedback
  rating INT,  -- 1-5 or thumbs (1=down, 5=up)
  feedback_text STRING,
  feedback_labels STRING,  -- JSON array of tags
  flagged BOOLEAN DEFAULT FALSE,

  -- Context
  user_id STRING,
  session_id STRING,

  -- Timestamps
  created_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT feedback_items_pk PRIMARY KEY (id)
) USING DELTA;

-- Monitor Alerts
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,

  -- Alert definition
  alert_type STRING NOT NULL,  -- drift, latency, error_rate, quality
  threshold DOUBLE,
  condition STRING,  -- gt, lt, eq

  -- Alert state
  status STRING DEFAULT 'active',  -- active, acknowledged, resolved
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,

  -- Alert details
  current_value DOUBLE,
  message STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT monitor_alerts_pk PRIMARY KEY (id)
) USING DELTA;

-- ============================================================================
-- LINEAGE TABLE (for custom lineage beyond UC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.lineage_edges (
  id STRING NOT NULL,

  -- Source
  source_type STRING NOT NULL,  -- template, item, model, endpoint, job
  source_id STRING NOT NULL,

  -- Target
  target_type STRING NOT NULL,
  target_id STRING NOT NULL,

  -- Relationship
  relationship STRING NOT NULL,  -- trained_from, deployed_as, derived_from, etc.

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),
  created_by STRING,

  CONSTRAINT lineage_edges_pk PRIMARY KEY (id)
) USING DELTA;


-- ============================================================================
-- GAP ANALYSIS TABLES (Phase 3)
-- ============================================================================

-- Identified Gaps
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.identified_gaps (
  gap_id STRING NOT NULL,

  -- Context
  model_name STRING,
  model_version STRING,
  template_id STRING,

  -- Gap classification
  gap_type STRING NOT NULL,  -- coverage, quality, distribution, capability, edge_case
  severity STRING NOT NULL,  -- critical, high, medium, low
  description STRING NOT NULL,

  -- Evidence
  evidence_type STRING,  -- error_clustering, coverage_analysis, quality_analysis, etc.
  evidence_query STRING,
  evidence_summary STRING,
  evidence_records ARRAY<STRING>,

  -- Impact metrics
  affected_queries_count INT DEFAULT 0,
  error_rate DOUBLE,

  -- Resolution
  suggested_action STRING,
  suggested_bit_name STRING,
  suggested_capability_tags ARRAY<STRING>,
  estimated_records_needed INT DEFAULT 0,

  -- Status tracking
  status STRING NOT NULL DEFAULT 'identified',  -- identified, task_created, in_progress, resolved, wont_fix
  priority INT DEFAULT 50,  -- 0-100, higher = more urgent

  -- Resolution tracking
  resolution_task_id STRING,
  resolved_bit_id STRING,
  resolution_notes STRING,

  -- Timestamps
  identified_at TIMESTAMP DEFAULT current_timestamp(),
  identified_by STRING DEFAULT 'system',
  resolved_at TIMESTAMP,

  CONSTRAINT identified_gaps_pk PRIMARY KEY (gap_id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Annotation Tasks
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.annotation_tasks (
  task_id STRING NOT NULL,
  task_type STRING NOT NULL,  -- gap_fill, quality_review, labeling, etc.
  title STRING NOT NULL,

  -- Description and instructions
  description STRING,
  instructions STRING,

  -- Source reference
  source_gap_id STRING,
  source_bit_id STRING,

  -- Schema for annotations
  target_schema STRING,  -- JSON schema
  required_fields ARRAY<STRING>,
  example_records STRING,  -- JSON array

  -- Targets
  target_record_count INT DEFAULT 100,

  -- Assignment
  assigned_to STRING,
  assigned_team STRING,
  priority STRING DEFAULT 'medium',  -- low, medium, high, critical
  due_date TIMESTAMP,

  -- Progress
  status STRING NOT NULL DEFAULT 'pending',  -- pending, assigned, in_progress, review, completed, cancelled
  records_completed INT DEFAULT 0,

  -- Output
  output_bit_id STRING,

  -- Timestamps
  created_at TIMESTAMP DEFAULT current_timestamp(),
  created_by STRING,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  CONSTRAINT annotation_tasks_pk PRIMARY KEY (task_id)
) USING DELTA;

-- Annotation Records (work done within a task)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.annotation_records (
  record_id STRING NOT NULL,
  task_id STRING NOT NULL,

  -- The annotation data
  input_data STRING,  -- JSON
  output_data STRING,  -- JSON

  -- Quality metadata
  confidence DOUBLE,
  difficulty STRING,  -- easy, medium, hard
  time_spent_seconds INT,

  -- Annotator info
  annotator_id STRING,
  annotated_at TIMESTAMP DEFAULT current_timestamp(),

  -- Review
  reviewed_by STRING,
  review_status STRING,  -- pending, approved, rejected
  review_notes STRING,

  CONSTRAINT annotation_records_pk PRIMARY KEY (record_id),
  CONSTRAINT annotation_records_task_fk FOREIGN KEY (task_id) REFERENCES ${catalog}.${schema}.annotation_tasks(task_id)
) USING DELTA;


-- ============================================================================
-- ATTRIBUTION TABLES (Phase 4)
-- ============================================================================

-- Model-Bit Lineage (which bits trained which models)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.model_bits (
  id STRING NOT NULL,

  -- Model reference
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,

  -- Assembly used
  assembly_id STRING,
  assembly_version INT,

  -- Bit reference
  bit_id STRING NOT NULL,
  bit_version INT NOT NULL,

  -- Training contribution
  record_count INT,
  weight DOUBLE DEFAULT 1.0,

  -- MLflow reference
  training_run_id STRING,

  -- Template reference (if applicable)
  template_id STRING,

  -- Timestamp
  trained_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT model_bits_pk PRIMARY KEY (id)
) USING DELTA;

-- Bit Attribution Scores
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.bit_attribution (
  id STRING NOT NULL,

  -- Model reference
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,

  -- Bit reference
  bit_id STRING NOT NULL,
  bit_version INT NOT NULL,

  -- Attribution method
  attribution_method STRING NOT NULL,  -- ablation, shapley, influence, gradient

  -- Impact scores (positive = helps, negative = hurts)
  accuracy_impact DOUBLE DEFAULT 0.0,
  precision_impact DOUBLE DEFAULT 0.0,
  recall_impact DOUBLE DEFAULT 0.0,
  f1_impact DOUBLE DEFAULT 0.0,
  custom_metrics STRING,  -- JSON map of metric -> impact

  -- Capability attribution
  capabilities ARRAY<STRING>,
  capability_scores STRING,  -- JSON map of capability -> score

  -- Importance ranking
  importance_rank INT,
  importance_score DOUBLE DEFAULT 0.0,
  confidence DOUBLE DEFAULT 0.0,

  -- Computation metadata
  computed_at TIMESTAMP DEFAULT current_timestamp(),
  compute_time_seconds DOUBLE,
  mlflow_run_id STRING,

  CONSTRAINT bit_attribution_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Bit Diffs (changes between bit versions)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.bit_diffs (
  diff_id STRING NOT NULL,

  -- Bit reference
  bit_id STRING NOT NULL,
  version_from INT NOT NULL,
  version_to INT NOT NULL,

  -- Change summary
  records_added INT DEFAULT 0,
  records_removed INT DEFAULT 0,
  records_modified INT DEFAULT 0,

  -- Content changes
  added_categories ARRAY<STRING>,
  removed_categories ARRAY<STRING>,

  -- Quality changes
  quality_from DOUBLE,
  quality_to DOUBLE,
  quality_delta DOUBLE,

  -- Summary
  summary STRING,

  -- Timestamp
  computed_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT bit_diffs_pk PRIMARY KEY (diff_id)
) USING DELTA;

-- Model Evaluations (for tracking metrics over time)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.model_evaluations (
  id STRING NOT NULL,

  -- Model reference
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,

  -- Evaluation metadata
  eval_dataset STRING,
  eval_run_id STRING,

  -- Metrics
  metric_name STRING NOT NULL,
  metric_value DOUBLE NOT NULL,

  -- Timestamp
  evaluated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT model_evaluations_pk PRIMARY KEY (id)
) USING DELTA;


-- ============================================================================
-- LABELING WORKFLOW TABLES
-- ============================================================================

-- Labeling Jobs (projects created from sheets)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.labeling_jobs (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  sheet_id STRING NOT NULL,

  -- Column IDs to label (JSON array)
  target_columns STRING,

  -- Label configuration (JSON LabelSchema)
  label_schema STRING,

  -- Markdown instructions for labelers
  instructions STRING,

  -- AI-Assist configuration
  ai_assist_enabled BOOLEAN DEFAULT TRUE,
  ai_model STRING,

  -- Assignment configuration
  assignment_strategy STRING DEFAULT 'manual',  -- manual | round_robin | load_balanced
  default_batch_size INT DEFAULT 50,

  -- Status
  status STRING DEFAULT 'draft',  -- draft | active | paused | completed | archived

  -- Stats (computed, cached)
  total_items INT DEFAULT 0,
  labeled_items INT DEFAULT 0,
  reviewed_items INT DEFAULT 0,
  approved_items INT DEFAULT 0,

  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT labeling_jobs_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Labeling Tasks (batches assigned to labelers)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.labeling_tasks (
  id STRING NOT NULL,
  job_id STRING NOT NULL,
  name STRING,

  -- Items in this task (JSON array of row indices)
  item_indices STRING,
  item_count INT,

  -- Assignment
  assigned_to STRING,  -- User email
  assigned_at TIMESTAMP,

  -- Status
  status STRING DEFAULT 'pending',  -- pending | assigned | in_progress | submitted | review | approved | rejected | rework

  -- Progress
  labeled_count INT DEFAULT 0,
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,

  -- Review
  reviewer STRING,
  reviewed_at TIMESTAMP,
  review_notes STRING,
  rejection_reason STRING,

  -- Priority and scheduling
  priority STRING DEFAULT 'normal',  -- low | normal | high | urgent
  due_date TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT labeling_tasks_pk PRIMARY KEY (id),
  CONSTRAINT labeling_tasks_job_fk FOREIGN KEY (job_id) REFERENCES ${catalog}.${schema}.labeling_jobs(id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Labeled Items (individual item annotations)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.labeled_items (
  id STRING NOT NULL,
  task_id STRING NOT NULL,
  job_id STRING NOT NULL,
  row_index INT NOT NULL,

  -- AI suggestions (pre-labeling)
  ai_labels STRING,  -- JSON
  ai_confidence DOUBLE,

  -- Human labels
  human_labels STRING,  -- JSON
  labeled_by STRING,
  labeled_at TIMESTAMP,

  -- Status
  status STRING DEFAULT 'pending',  -- pending | ai_labeled | human_labeled | reviewed | flagged | skipped

  -- Review
  review_status STRING,  -- approved | rejected | needs_correction
  review_notes STRING,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,

  -- Flags
  is_difficult BOOLEAN DEFAULT FALSE,
  needs_discussion BOOLEAN DEFAULT FALSE,
  skip_reason STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT labeled_items_pk PRIMARY KEY (id),
  CONSTRAINT labeled_items_task_fk FOREIGN KEY (task_id) REFERENCES ${catalog}.${schema}.labeling_tasks(id),
  CONSTRAINT labeled_items_job_fk FOREIGN KEY (job_id) REFERENCES ${catalog}.${schema}.labeling_jobs(id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Workspace Users (labelers, reviewers, managers)
CREATE TABLE IF NOT EXISTS ${catalog}.${schema}.workspace_users (
  id STRING NOT NULL,
  email STRING NOT NULL,
  display_name STRING,

  -- Role
  role STRING DEFAULT 'labeler',  -- labeler | reviewer | manager | admin

  -- Capacity
  max_concurrent_tasks INT DEFAULT 5,
  current_task_count INT DEFAULT 0,

  -- Stats
  total_labeled INT DEFAULT 0,
  total_reviewed INT DEFAULT 0,
  accuracy_score DOUBLE,
  avg_time_per_item DOUBLE,  -- Seconds

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp(),

  CONSTRAINT workspace_users_pk PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
