-- ============================================================================
-- Asset Reviews - Generalized steward review workflow for data assets
-- ============================================================================
-- Part of Ontos Governance G4: Asset Review Workflow
-- Supports review requests for any asset type (sheet, template, training_sheet).
-- Each review record tracks one review cycle; re-reviews create new records.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.asset_reviews (
  id STRING NOT NULL,
  asset_type STRING NOT NULL COMMENT 'Asset kind: sheet, template, training_sheet',
  asset_id STRING NOT NULL COMMENT 'FK to the asset table (sheets.id, templates.id, etc.)',
  asset_name STRING COMMENT 'Denormalized asset name for display',
  status STRING NOT NULL DEFAULT 'pending' COMMENT 'pending | in_review | approved | rejected | changes_requested',
  requested_by STRING NOT NULL COMMENT 'Email of user requesting review',
  reviewer_email STRING COMMENT 'Assigned reviewer/steward email',
  review_notes STRING COMMENT 'Reviewer decision notes',
  decision_at TIMESTAMP COMMENT 'When the reviewer made a decision',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_asset_reviews PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
