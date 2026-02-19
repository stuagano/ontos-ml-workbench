-- ============================================================================
-- Table: workspace_users
-- ============================================================================
-- Labeling workspace users — labelers, reviewers, and managers
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.workspace_users (
  -- Identity
  id STRING NOT NULL,
  email STRING NOT NULL COMMENT 'Databricks workspace email',
  display_name STRING NOT NULL COMMENT 'Human-readable name',

  -- Role and capacity
  role STRING DEFAULT 'labeler' COMMENT 'labeler | reviewer | manager | admin',
  max_concurrent_tasks INT DEFAULT 5 COMMENT 'Max tasks assignable at once (1–20)',
  current_task_count INT DEFAULT 0 COMMENT 'Number of currently assigned tasks',

  -- Performance stats
  total_labeled INT DEFAULT 0 COMMENT 'Lifetime items labeled',
  total_reviewed INT DEFAULT 0 COMMENT 'Lifetime items reviewed',
  accuracy_score DOUBLE COMMENT 'Labeling accuracy vs canonical labels (0.0–1.0)',
  avg_time_per_item DOUBLE COMMENT 'Average labeling time in seconds',

  -- Status
  is_active BOOLEAN DEFAULT true COMMENT 'Whether user is active in the workspace',
  last_active_at TIMESTAMP COMMENT 'Last labeling or review activity',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_workspace_users PRIMARY KEY (id),
  CONSTRAINT uq_workspace_users_email UNIQUE (email)
)
COMMENT 'Labeling workspace users — labelers, reviewers, and managers'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_users_role ON ${CATALOG}.${SCHEMA}.workspace_users(role);
CREATE INDEX IF NOT EXISTS idx_workspace_users_active ON ${CATALOG}.${SCHEMA}.workspace_users(is_active) WHERE is_active = true;
