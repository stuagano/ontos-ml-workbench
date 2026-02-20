-- ============================================================================
-- Semantic Models - Knowledge graphs for business-technical mapping (G10)
-- ============================================================================
-- Semantic models connect technical data assets to business concepts using
-- a three-tier structure:
--   1. Business Concepts  - High-level domain entities (Equipment, Defect, Measurement)
--   2. Business Properties - Attributes of concepts (defect_severity, sensor_type)
--   3. Semantic Links      - Mappings between concepts/properties and data assets
--
-- This enables business users to discover data through domain terminology
-- rather than navigating raw table/column names.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.semantic_models (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  domain_id STRING COMMENT 'FK to data_domains.id',
  owner_email STRING,
  status STRING NOT NULL DEFAULT 'draft' COMMENT 'draft | published | archived',
  version STRING DEFAULT '1.0.0',
  metadata STRING COMMENT 'JSON object for extra model metadata',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_semantic_models PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Business Concepts - Domain entities within a semantic model
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.semantic_concepts (
  id STRING NOT NULL,
  model_id STRING NOT NULL COMMENT 'FK to semantic_models.id',
  name STRING NOT NULL,
  description STRING,
  parent_id STRING COMMENT 'FK to semantic_concepts.id for hierarchy',
  concept_type STRING NOT NULL DEFAULT 'entity' COMMENT 'entity | event | metric | dimension',
  tags STRING COMMENT 'JSON array of tags',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  CONSTRAINT pk_semantic_concepts PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Business Properties - Attributes of concepts
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.semantic_properties (
  id STRING NOT NULL,
  concept_id STRING NOT NULL COMMENT 'FK to semantic_concepts.id',
  model_id STRING NOT NULL COMMENT 'FK to semantic_models.id (denormalized)',
  name STRING NOT NULL,
  description STRING,
  data_type STRING COMMENT 'Logical type: string | number | boolean | date | enum',
  is_required BOOLEAN DEFAULT false,
  enum_values STRING COMMENT 'JSON array of allowed values for enum type',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  CONSTRAINT pk_semantic_properties PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- ============================================================================
-- Semantic Links - Connect concepts/properties to data assets
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.semantic_links (
  id STRING NOT NULL,
  model_id STRING NOT NULL COMMENT 'FK to semantic_models.id',
  source_type STRING NOT NULL COMMENT 'concept | property',
  source_id STRING NOT NULL COMMENT 'FK to concept or property',
  target_type STRING NOT NULL COMMENT 'table | column | sheet | contract | product',
  target_id STRING COMMENT 'FK to the referenced asset',
  target_name STRING COMMENT 'Human-readable target reference',
  link_type STRING NOT NULL DEFAULT 'maps_to' COMMENT 'maps_to | derived_from | aggregates | represents',
  confidence DOUBLE COMMENT 'Link confidence score (0.0 - 1.0)',
  notes STRING,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  CONSTRAINT pk_semantic_links PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
