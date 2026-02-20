-- ============================================================================
-- Project Members - Users belonging to a project
-- ============================================================================
-- Part of Ontos Governance G8: Projects
-- Tracks which users have access to a project.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.project_members (
  id STRING NOT NULL,
  project_id STRING NOT NULL COMMENT 'FK to projects.id',
  user_email STRING NOT NULL,
  user_display_name STRING,
  role STRING DEFAULT 'member' COMMENT 'owner | admin | member | viewer',
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  added_by STRING NOT NULL,
  CONSTRAINT pk_project_members PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
