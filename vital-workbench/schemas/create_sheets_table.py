#!/usr/bin/env python3
"""
Create sheets table with PRD v2.3 schema in erp-demonstrations.vital_workbench
"""

from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")
warehouse_id = "387bcda0f2ece20c"

print("📝 Creating sheets table with PRD v2.3 schema...\n")

# Use identifier escaping for catalog with hyphen
create_table_sql = """
CREATE TABLE IF NOT EXISTS `erp-demonstrations`.vital_workbench.sheets (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  source_type STRING NOT NULL COMMENT 'Type: uc_table, uc_volume, or external',
  source_table STRING COMMENT 'Unity Catalog table reference',
  source_volume STRING COMMENT 'Unity Catalog volume path',
  source_path STRING COMMENT 'Path within volume',
  item_id_column STRING COMMENT 'Column name to use as item_ref',
  text_columns ARRAY<STRING> COMMENT 'Column names containing text',
  image_columns ARRAY<STRING> COMMENT 'Column names with image paths',
  metadata_columns ARRAY<STRING> COMMENT 'Additional columns for context',
  sampling_strategy STRING COMMENT 'Sampling: all, random, stratified',
  sample_size INT COMMENT 'Number of items to sample',
  filter_expression STRING COMMENT 'SQL WHERE clause',
  status STRING COMMENT 'Status: active, archived, deleted',
  item_count INT COMMENT 'Cached count of items',
  last_validated_at TIMESTAMP COMMENT 'Last validation time',
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_sheets PRIMARY KEY (id)
)
COMMENT 'Dataset definitions - PRD v2.3'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true', 'quality' = 'bronze')
"""

try:
    result = w.statement_execution.execute_statement(
        statement=create_table_sql, warehouse_id=warehouse_id, wait_timeout="30s"
    )
    if result.status.state == "SUCCEEDED":
        print("✓ Table created successfully")
    else:
        print(f"✗ Failed: {result.status.state}")
        if result.status.error:
            print(f"  Error: {result.status.error.message}")
except Exception as e:
    print(f"✗ Exception: {str(e)}")

# Verify
print("\n🔍 Verifying table exists...")
result = w.statement_execution.execute_statement(
    statement="SHOW TABLES IN `erp-demonstrations`.vital_workbench LIKE 'sheets'",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
if result.result and result.result.data_array:
    print("✓ Table found in catalog")
else:
    print("✗ Table not found")

print("\n✅ Done!")
