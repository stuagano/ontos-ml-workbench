-- ============================================================================
-- 37: Multi-Platform Connectors (G13)
-- ============================================================================
-- Pluggable platform adapters for cross-platform governance.
-- Supports Unity Catalog, Snowflake, Kafka, Power BI, S3, and custom.
-- ============================================================================

-- Platform connectors: configuration for external platform integrations
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.platform_connectors (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  platform STRING NOT NULL COMMENT 'unity_catalog | snowflake | kafka | power_bi | s3 | custom',
  status STRING NOT NULL DEFAULT 'inactive' COMMENT 'active | inactive | error | testing',
  connection_config STRING COMMENT 'JSON — encrypted connection parameters',
  sync_direction STRING NOT NULL DEFAULT 'inbound' COMMENT 'inbound | outbound | bidirectional',
  sync_schedule STRING COMMENT 'Cron expression for scheduled syncs',
  owner_email STRING,
  team_id STRING COMMENT 'FK to teams.id',
  last_sync_at TIMESTAMP,
  last_sync_status STRING,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_platform_connectors PRIMARY KEY (id),
  CONSTRAINT uq_platform_connectors_name UNIQUE (name)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Connector assets: external assets discovered/synced by connectors
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.connector_assets (
  id STRING NOT NULL,
  connector_id STRING NOT NULL COMMENT 'FK to platform_connectors.id',
  external_id STRING NOT NULL COMMENT 'ID in the external platform',
  external_name STRING NOT NULL,
  asset_type STRING NOT NULL COMMENT 'table | view | topic | dataset | report | file',
  local_reference STRING COMMENT 'Local reference (e.g., sheet_id, domain_id)',
  metadata STRING COMMENT 'JSON — platform-specific metadata',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_connector_assets PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Connector sync records: audit log of sync operations
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.connector_sync_records (
  id STRING NOT NULL,
  connector_id STRING NOT NULL COMMENT 'FK to platform_connectors.id',
  status STRING NOT NULL DEFAULT 'pending' COMMENT 'pending | running | completed | failed | cancelled',
  direction STRING NOT NULL DEFAULT 'inbound',
  assets_synced INT DEFAULT 0,
  assets_failed INT DEFAULT 0,
  error_message STRING,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  started_by STRING NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INT,
  CONSTRAINT pk_connector_sync_records PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Seed a default Unity Catalog connector (the native platform)
INSERT INTO ${CATALOG}.${SCHEMA}.platform_connectors
  (id, name, description, platform, status, sync_direction, owner_email, is_active, created_at, created_by, updated_at, updated_by)
VALUES
  ('conn-001', 'Unity Catalog (Native)', 'Default Databricks Unity Catalog integration', 'unity_catalog', 'active', 'bidirectional', 'system', true, CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system');
