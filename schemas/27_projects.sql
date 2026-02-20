-- ============================================================================
-- Projects - Workspace containers for team initiatives
-- ============================================================================
-- Part of Ontos Governance G8: Projects
-- Projects provide logical isolation for development work.
-- Types: personal (single user) or team (shared workspace).
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.projects (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  project_type STRING NOT NULL DEFAULT 'team' COMMENT 'personal | team',
  team_id STRING COMMENT 'FK to teams.id (for team projects)',
  owner_email STRING NOT NULL COMMENT 'Project owner/creator',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_projects PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
