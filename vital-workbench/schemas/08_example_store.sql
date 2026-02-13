-- ============================================================================
-- Table: example_store
-- ============================================================================
-- Few-shot examples with vector embeddings for similarity retrieval
-- P1 feature - creating schema now for future use
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.example_store (
  -- Identity
  id STRING NOT NULL,

  -- Example content
  input VARIANT NOT NULL COMMENT 'Example input (JSON structure varies by use case)',
  expected_output VARIANT NOT NULL COMMENT 'Expected output for this input',

  -- Search and retrieval
  search_keys ARRAY<STRING> COMMENT 'Keywords for text-based search',
  embedding_text STRING COMMENT 'Text representation used for vector embedding',
  embedding ARRAY<DOUBLE> COMMENT 'Vector embedding (1536-dim for databricks-bge-large-en)',

  -- Categorization
  function_name STRING COMMENT 'Function/operation this example demonstrates',
  domain STRING COMMENT 'Domain: entity_extraction, defect_detection, sentiment, etc.',
  difficulty STRING COMMENT 'Difficulty: simple, moderate, complex, edge_case',

  -- Quality and governance
  quality_score DOUBLE DEFAULT 0.5 COMMENT 'Quality rating (0.0-1.0)',
  is_verified BOOLEAN DEFAULT false COMMENT 'Has this been validated by an expert?',
  verified_by STRING,
  verified_at TIMESTAMP,

  -- Usage tracking
  usage_count INT DEFAULT 0 COMMENT 'Number of times retrieved for few-shot learning',
  last_used_at TIMESTAMP,
  effectiveness_score DOUBLE COMMENT 'How helpful is this example? (from user feedback)',

  -- Source tracking
  source STRING COMMENT 'Where this example came from: curated, training_sheet, imported',
  source_training_sheet_id STRING COMMENT 'If from training_sheet, reference to training_sheets.id',
  source_canonical_label_id STRING COMMENT 'If from canonical label, reference to canonical_labels.id',

  -- Metadata
  metadata VARIANT COMMENT 'Additional context (tags, notes, etc.)',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_example_store PRIMARY KEY (id)
)
COMMENT 'Few-shot examples with embeddings for vector similarity search (P1)'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'silver'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_example_function ON home_stuart_gano.mirion_vital_workbench.example_store(function_name);
CREATE INDEX IF NOT EXISTS idx_example_domain ON home_stuart_gano.mirion_vital_workbench.example_store(domain);
CREATE INDEX IF NOT EXISTS idx_example_quality ON home_stuart_gano.mirion_vital_workbench.example_store(quality_score) WHERE quality_score >= 0.7;
CREATE INDEX IF NOT EXISTS idx_example_verified ON home_stuart_gano.mirion_vital_workbench.example_store(is_verified) WHERE is_verified = true;

-- Note: Vector Search index will be created separately in P1
-- CREATE VECTOR SEARCH INDEX example_embeddings
--   ON home_stuart_gano.mirion_vital_workbench.example_store(embedding)
--   USING EMBEDDING_MODEL 'databricks-bge-large-en';
