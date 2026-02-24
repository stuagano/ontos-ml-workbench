-- ============================================================================
-- Teams - Organizational groups for data governance
-- ============================================================================
-- Part of Ontos Governance G2: Team Management
-- Teams can be associated with a data domain and have designated leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.teams (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  domain_id STRING COMMENT 'FK to data_domains.id',
  leads STRING COMMENT 'JSON array of team lead emails',
  metadata STRING COMMENT 'JSON object for team metadata (tools, integrations, etc.)',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_teams PRIMARY KEY (id),
  CONSTRAINT uq_teams_name UNIQUE (name)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
