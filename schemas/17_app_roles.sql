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

-- ============================================================================
-- Seed Default Roles (6 built-in RBAC roles)
-- ============================================================================
-- Permission levels: none, read, write, admin
-- Feature areas: sheets, templates, labels, training, deploy, monitor,
--                improve, labeling_jobs, registries, admin, governance
-- ============================================================================

MERGE INTO ${CATALOG}.${SCHEMA}.app_roles AS target
USING (
  SELECT * FROM (VALUES
    ('role-admin', 'admin', 'Full platform access',
     '{"sheets":"admin","templates":"admin","labels":"admin","training":"admin","deploy":"admin","monitor":"admin","improve":"admin","labeling_jobs":"admin","registries":"admin","admin":"admin","governance":"admin"}',
     '["data","label","curate","train","deploy","monitor","improve"]',
     false, 'system', 'system'),
    ('role-data-steward', 'data_steward', 'Data governance and quality oversight',
     '{"sheets":"write","templates":"write","labels":"admin","training":"write","deploy":"read","monitor":"read","improve":"write","labeling_jobs":"admin","registries":"write","admin":"none","governance":"read"}',
     '["data","label","curate","train","monitor","improve"]',
     false, 'system', 'system'),
    ('role-data-producer', 'data_producer', 'Creates and manages datasets and models',
     '{"sheets":"write","templates":"write","labels":"write","training":"write","deploy":"write","monitor":"read","improve":"write","labeling_jobs":"write","registries":"write","admin":"none","governance":"none"}',
     '["data","label","curate","train","deploy","improve"]',
     false, 'system', 'system'),
    ('role-data-consumer', 'data_consumer', 'Read-only access to platform assets',
     '{"sheets":"read","templates":"read","labels":"read","training":"read","deploy":"read","monitor":"read","improve":"read","labeling_jobs":"none","registries":"read","admin":"none","governance":"none"}',
     '["data","label","curate","train","deploy","monitor","improve"]',
     true, 'system', 'system'),
    ('role-labeler', 'labeler', 'Labels data items in labeling workflows',
     '{"sheets":"read","templates":"read","labels":"write","training":"none","deploy":"none","monitor":"none","improve":"read","labeling_jobs":"read","registries":"none","admin":"none","governance":"none"}',
     '["data","label","improve"]',
     false, 'system', 'system'),
    ('role-reviewer', 'reviewer', 'Reviews and approves labeled data',
     '{"sheets":"read","templates":"read","labels":"write","training":"none","deploy":"none","monitor":"none","improve":"read","labeling_jobs":"read","registries":"none","admin":"none","governance":"none"}',
     '["data","label","improve"]',
     false, 'system', 'system')
  ) AS vals(id, name, description, feature_permissions, allowed_stages, is_default, created_by, updated_by)
) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, feature_permissions, allowed_stages, is_default,
  created_at, created_by, updated_at, updated_by
) VALUES (
  source.id, source.name, source.description, source.feature_permissions,
  source.allowed_stages, source.is_default,
  current_timestamp(), source.created_by, current_timestamp(), source.updated_by
);
