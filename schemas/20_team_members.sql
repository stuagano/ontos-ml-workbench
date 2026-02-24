-- ============================================================================
-- Team Members - Users belonging to teams with optional role overrides
-- ============================================================================
-- Part of Ontos Governance G2: Team Management
-- Members can have a role_override that supersedes their global role
-- within the team's context (e.g., a data_consumer globally who is
-- a data_steward within their team's domain)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.team_members (
  id STRING NOT NULL,
  team_id STRING NOT NULL COMMENT 'FK to teams.id',
  user_email STRING NOT NULL,
  user_display_name STRING,
  role_override STRING COMMENT 'FK to app_roles.id - overrides global role in team context',
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  added_by STRING NOT NULL,
  CONSTRAINT pk_team_members PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
