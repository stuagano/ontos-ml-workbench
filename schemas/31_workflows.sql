-- ============================================================================
-- Process Workflows - Event-driven automation engine (G7)
-- ============================================================================
-- Defines reusable workflow templates with trigger conditions and
-- ordered step sequences. Steps can be actions, approvals, notifications,
-- or conditional branches.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.workflows (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  trigger_type STRING NOT NULL DEFAULT 'manual' COMMENT 'manual | on_create | on_update | on_review | scheduled',
  trigger_config STRING COMMENT 'JSON trigger configuration: {entity_type, schedule, conditions}',
  steps STRING NOT NULL COMMENT 'JSON array of step definitions: [{step_id, name, type, action, config, next_step}]',
  status STRING NOT NULL DEFAULT 'draft' COMMENT 'draft | active | disabled',
  owner_email STRING,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_workflows PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Workflow Executions - Running instances of workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.workflow_executions (
  id STRING NOT NULL,
  workflow_id STRING NOT NULL COMMENT 'FK to workflows.id',
  workflow_name STRING COMMENT 'Denormalized for display',
  status STRING NOT NULL DEFAULT 'running' COMMENT 'running | paused | completed | failed | cancelled',
  current_step STRING COMMENT 'step_id of the currently active step',
  trigger_event STRING COMMENT 'JSON describing what triggered this execution',
  step_results STRING COMMENT 'JSON array of completed step results: [{step_id, status, output, completed_at}]',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  started_by STRING NOT NULL,
  completed_at TIMESTAMP,
  CONSTRAINT pk_workflow_executions PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
