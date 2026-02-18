-- ============================================================================
-- Table: canonical_labels
-- ============================================================================
-- Ground truth labels with composite key (sheet_id, item_ref, label_type)
-- This is the CORE INNOVATION - enables "label once, reuse everywhere"
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_stuart_gano.ontos_ml_workbench.canonical_labels (
  -- Identity
  id STRING NOT NULL,

  -- Composite key components (CRITICAL)
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id',
  item_ref STRING NOT NULL COMMENT 'Identifier for the source item (e.g., row ID, file path)',
  label_type STRING NOT NULL COMMENT 'Type of label (must match templates.label_type)',

  -- Label content
  label_data VARIANT NOT NULL COMMENT 'The actual label (JSON structure varies by label_type)',
  label_confidence DOUBLE COMMENT 'Expert confidence in this label (0.0-1.0)',

  -- Labeling context
  labeling_mode STRING NOT NULL COMMENT 'How labeled: during_review, standalone_tool, bulk_import',
  template_id STRING COMMENT 'Template used if labeled during Q&A review',
  training_sheet_id STRING COMMENT 'Training Sheet where this was first labeled',

  -- Version tracking
  version INT NOT NULL DEFAULT 1 COMMENT 'Version number for this label',
  supersedes_label_id STRING COMMENT 'Previous version this replaces',

  -- Quality and governance
  reviewed_by STRING COMMENT 'User who reviewed/validated this label',
  reviewed_at TIMESTAMP COMMENT 'When the label was reviewed',
  quality_score DOUBLE COMMENT 'Quality rating (0.0-1.0)',
  flags ARRAY<STRING> COMMENT 'Quality flags: ambiguous, needs_review, edge_case, etc.',

  -- Reuse tracking
  reuse_count INT DEFAULT 0 COMMENT 'Number of times this label was auto-reused',
  last_reused_at TIMESTAMP COMMENT 'Last time this label was reused',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_canonical_labels PRIMARY KEY (id),

  -- COMPOSITE KEY CONSTRAINT - This is what makes "label once, reuse everywhere" work
  CONSTRAINT unique_label UNIQUE (sheet_id, item_ref, label_type)
)
COMMENT 'Canonical ground truth labels with composite key for automatic reuse'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'gold'
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_canonical_composite ON home_stuart_gano.ontos_ml_workbench.canonical_labels(sheet_id, item_ref, label_type);
CREATE INDEX IF NOT EXISTS idx_canonical_sheet ON home_stuart_gano.ontos_ml_workbench.canonical_labels(sheet_id);
CREATE INDEX IF NOT EXISTS idx_canonical_label_type ON home_stuart_gano.ontos_ml_workbench.canonical_labels(label_type);
CREATE INDEX IF NOT EXISTS idx_canonical_quality ON home_stuart_gano.ontos_ml_workbench.canonical_labels(quality_score) WHERE quality_score IS NOT NULL;
