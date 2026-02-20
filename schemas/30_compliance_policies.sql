-- ============================================================================
-- Compliance Policies - Governance rules with evaluation tracking (G6)
-- ============================================================================
-- Defines enforcement policies with structured rule conditions.
-- Categories: data_quality, access_control, retention, naming, lineage
-- Severity: info, warning, critical
-- Lifecycle: enabled / disabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.compliance_policies (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  category STRING NOT NULL DEFAULT 'data_quality' COMMENT 'data_quality | access_control | retention | naming | lineage',
  severity STRING NOT NULL DEFAULT 'warning' COMMENT 'info | warning | critical',
  status STRING NOT NULL DEFAULT 'enabled' COMMENT 'enabled | disabled',
  rules STRING NOT NULL COMMENT 'JSON array of rule conditions: [{field, operator, value, message}]',
  scope STRING COMMENT 'JSON scope definition: {catalog, schema, tables, asset_types}',
  schedule STRING COMMENT 'Cron expression for scheduled evaluation (e.g., 0 6 * * *)',
  owner_email STRING,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_compliance_policies PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Policy Evaluations - Results of policy checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.policy_evaluations (
  id STRING NOT NULL,
  policy_id STRING NOT NULL COMMENT 'FK to compliance_policies.id',
  status STRING NOT NULL COMMENT 'passed | failed | error',
  total_checks INT NOT NULL DEFAULT 0,
  passed_checks INT NOT NULL DEFAULT 0,
  failed_checks INT NOT NULL DEFAULT 0,
  results STRING COMMENT 'JSON array of per-rule results: [{rule_index, passed, actual_value, message}]',
  evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  evaluated_by STRING NOT NULL,
  duration_ms INT COMMENT 'Evaluation duration in milliseconds',
  CONSTRAINT pk_policy_evaluations PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
