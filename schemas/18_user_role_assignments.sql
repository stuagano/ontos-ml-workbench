-- ============================================================================
-- User Role Assignments - Maps users to their app-level RBAC role
-- ============================================================================
-- Part of Ontos Governance G1: Role-Based Access Control
-- One role per user (enforced by UNIQUE on user_email)
-- Users without an assignment auto-receive data_consumer role
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.user_role_assignments (
  id STRING NOT NULL,
  user_email STRING NOT NULL,
  user_display_name STRING,
  role_id STRING NOT NULL COMMENT 'FK to app_roles.id',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  assigned_by STRING NOT NULL,
  CONSTRAINT pk_user_role_assignments PRIMARY KEY (id),
  CONSTRAINT uq_ura_email UNIQUE (user_email)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
