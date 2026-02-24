-- ============================================================================
-- App Roles - RBAC role definitions with per-feature permission levels
-- ============================================================================
-- Part of Ontos Governance G1: Role-Based Access Control
-- Each role defines permission levels (none/read/write/admin) per feature area
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.app_roles (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  feature_permissions STRING COMMENT 'JSON: {"sheets":"write","deploy":"read",...}',
  allowed_stages STRING COMMENT 'JSON array: ["data","label","train",...]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_app_roles PRIMARY KEY (id),
  CONSTRAINT uq_app_roles_name UNIQUE (name)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
