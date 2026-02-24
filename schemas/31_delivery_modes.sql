-- G12: Delivery Modes
-- Governance layer for managing how deployments are delivered (direct, indirect/GitOps, manual)
-- Table 1: delivery_modes - Reusable delivery mode configurations
-- Table 2: delivery_records - Tracks actual deliveries with mode + approval metadata

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.delivery_modes (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  mode_type STRING NOT NULL COMMENT 'direct | indirect | manual',
  is_default BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approved_roles STRING COMMENT 'JSON array of role names that can approve',
  git_repo_url STRING COMMENT 'Git repo URL for indirect mode',
  git_branch STRING COMMENT 'Target branch for indirect mode',
  git_path STRING COMMENT 'Path within repo for config files',
  yaml_template STRING COMMENT 'YAML config template for indirect mode',
  manual_instructions STRING COMMENT 'Step-by-step instructions for manual mode',
  environment STRING COMMENT 'Target environment: dev | staging | production',
  config STRING COMMENT 'JSON: additional mode-specific configuration',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_delivery_modes PRIMARY KEY (id),
  CONSTRAINT uq_delivery_modes_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.delivery_records (
  id STRING NOT NULL,
  delivery_mode_id STRING NOT NULL COMMENT 'FK to delivery_modes.id',
  model_name STRING NOT NULL,
  model_version STRING,
  endpoint_name STRING,
  status STRING NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | in_progress | completed | failed | rejected',
  requested_by STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  approved_by STRING,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes STRING,
  result STRING COMMENT 'JSON: deployment result details',
  CONSTRAINT pk_delivery_records PRIMARY KEY (id)
);

-- Seed 3 default delivery modes
INSERT INTO ${CATALOG}.${SCHEMA}.delivery_modes
(id, name, description, mode_type, is_default, requires_approval, approved_roles, environment, is_active, created_at, created_by, updated_at, updated_by)
VALUES
('dm-direct', 'Direct Deploy', 'Deploy directly to Databricks Model Serving via SDK. Immediate deployment with automated provisioning.', 'direct', true, false, NULL, 'dev', true, CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
('dm-gitops', 'GitOps Deploy', 'Push deployment configuration to Git repository. CI/CD pipeline handles actual deployment. Requires approval for production.', 'indirect', false, true, '["admin", "data_steward"]', 'production', true, CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
('dm-manual', 'Manual Deploy', 'Generate deployment instructions and configuration files for manual execution. Used for airgap or restricted environments.', 'manual', false, true, '["admin"]', 'production', true, CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system');
