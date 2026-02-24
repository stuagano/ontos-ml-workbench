-- ============================================================================
-- Data Products - Curated asset collections with ports (G9)
-- ============================================================================
-- Data Products are curated bundles of related assets (datasets, contracts,
-- models) organized by product type:
--   Source          - Raw data assets from operational systems
--   Source-Aligned  - Cleaned/standardized versions of source data
--   Aggregate       - Combined/enriched datasets from multiple sources
--   Consumer-Aligned - Ready-to-use datasets tailored for specific consumers
--
-- Input/Output ports define the interfaces for data flow.
-- Subscriptions track consumer access and usage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.data_products (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  product_type STRING NOT NULL DEFAULT 'source' COMMENT 'source | source_aligned | aggregate | consumer_aligned',
  status STRING NOT NULL DEFAULT 'draft' COMMENT 'draft | published | deprecated | retired',
  domain_id STRING COMMENT 'FK to data_domains.id',
  owner_email STRING,
  team_id STRING COMMENT 'FK to teams.id',
  tags STRING COMMENT 'JSON array of tags for discovery',
  metadata STRING COMMENT 'JSON object of arbitrary metadata',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  published_at TIMESTAMP,
  CONSTRAINT pk_data_products PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Data Product Ports - Input/Output interfaces
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.data_product_ports (
  id STRING NOT NULL,
  product_id STRING NOT NULL COMMENT 'FK to data_products.id',
  name STRING NOT NULL,
  description STRING,
  port_type STRING NOT NULL DEFAULT 'output' COMMENT 'input | output',
  entity_type STRING COMMENT 'dataset | contract | model | endpoint',
  entity_id STRING COMMENT 'FK to the referenced entity',
  entity_name STRING COMMENT 'Denormalized for display',
  config STRING COMMENT 'JSON port configuration (format, schema, SLA)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  CONSTRAINT pk_data_product_ports PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Data Product Subscriptions - Consumer access tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.data_product_subscriptions (
  id STRING NOT NULL,
  product_id STRING NOT NULL COMMENT 'FK to data_products.id',
  subscriber_email STRING NOT NULL,
  subscriber_team_id STRING COMMENT 'FK to teams.id',
  status STRING NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected | revoked',
  purpose STRING COMMENT 'Why the subscriber needs access',
  approved_by STRING,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_data_product_subscriptions PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
