#!/usr/bin/env python3
"""
Create canonical_labels table with PRD v2.3 schema
"""

from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")
warehouse_id = "387bcda0f2ece20c"

print("📝 Creating canonical_labels table...\n")

create_table_sql = """
CREATE TABLE IF NOT EXISTS `erp-demonstrations`.vital_workbench.canonical_labels (
  id STRING NOT NULL,
  sheet_id STRING NOT NULL COMMENT 'Reference to sheets.id',
  item_ref STRING NOT NULL COMMENT 'Identifier for the source item',
  label_type STRING NOT NULL COMMENT 'Type of label (entity_extraction, classification, etc.)',
  label_data VARIANT NOT NULL COMMENT 'The actual label (JSON structure varies by type)',
  label_confidence STRING COMMENT 'Expert confidence: low, medium, high, verified',
  labeling_mode STRING NOT NULL COMMENT 'How labeled: during_review, standalone_tool, bulk_import',
  template_id STRING COMMENT 'Template used if labeled during Q&A review',
  training_sheet_id STRING COMMENT 'Training Sheet where this was first labeled',
  version INT NOT NULL COMMENT 'Version number for this label',
  supersedes_label_id STRING COMMENT 'Previous version this replaces',
  reviewed_by STRING COMMENT 'User who reviewed/validated this label',
  reviewed_at TIMESTAMP COMMENT 'When the label was reviewed',
  quality_score DOUBLE COMMENT 'Quality rating (0.0-1.0)',
  flags ARRAY<STRING> COMMENT 'Quality flags: ambiguous, needs_review, edge_case',
  reuse_count INT COMMENT 'Number of times this label was auto-reused',
  last_reused_at TIMESTAMP COMMENT 'Last time this label was reused',
  data_classification STRING COMMENT 'Data classification: public, internal, confidential, restricted, pii',
  allowed_uses ARRAY<STRING> COMMENT 'Allowed uses: training, validation, testing, production, research',
  prohibited_uses ARRAY<STRING> COMMENT 'Prohibited uses (overrides allowed)',
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_canonical_labels PRIMARY KEY (id)
)
COMMENT 'Canonical ground truth labels - label once, reuse everywhere (PRD v2.3)'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true', 'quality' = 'gold')
"""

try:
    result = w.statement_execution.execute_statement(
        statement=create_table_sql, warehouse_id=warehouse_id, wait_timeout="30s"
    )
    if result.status.state.value == "SUCCEEDED":
        print("✓ canonical_labels table created successfully")
    else:
        print(f"✗ Failed: {result.status.state}")
        if result.status.error:
            print(f"  Error: {result.status.error.message}")
except Exception as e:
    print(f"✗ Exception: {str(e)}")

# Verify
print("\n🔍 Verifying table exists...")
result = w.statement_execution.execute_statement(
    statement="SHOW TABLES IN `erp-demonstrations`.vital_workbench LIKE 'canonical_labels'",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
if result.result and result.result.data_array:
    print("✓ Table found in catalog")
    print("\n📋 Table schema:")
    desc_result = w.statement_execution.execute_statement(
        statement="DESCRIBE TABLE `erp-demonstrations`.vital_workbench.canonical_labels",
        warehouse_id=warehouse_id,
        wait_timeout="30s",
    )
    if desc_result.result and desc_result.result.data_array:
        key_cols = [
            "id",
            "sheet_id",
            "item_ref",
            "label_type",
            "label_data",
            "label_confidence",
            "data_classification",
            "allowed_uses",
        ]
        for row in desc_result.result.data_array:
            if row[0] in key_cols:
                print(f"   {row[0]:25s} {row[1]}")
else:
    print("✗ Table not found")

print("\n✅ Done!")
