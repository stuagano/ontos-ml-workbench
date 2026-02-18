#!/usr/bin/env python3
"""
Create sheets table with PRD v2.3 schema
"""

import os
from databricks.sdk import WorkspaceClient

CATALOG = os.getenv("DATABRICKS_CATALOG", "your_catalog")
SCHEMA = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")
WAREHOUSE_ID = os.getenv("DATABRICKS_WAREHOUSE_ID")
PROFILE = os.getenv("DATABRICKS_CONFIG_PROFILE", "DEFAULT")

w = WorkspaceClient(profile=PROFILE)
warehouse_id = WAREHOUSE_ID

print("📝 Creating sheets table with PRD v2.3 schema...\n")

# Use identifier escaping for catalog with hyphen
create_table_sql = f"""
CREATE TABLE IF NOT EXISTS `{CATALOG}`.{SCHEMA}.sheets (
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
    statement=f"SHOW TABLES IN `{CATALOG}`.{SCHEMA} LIKE 'sheets'",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
if result.result and result.result.data_array:
    print("✓ Table found in catalog")
else:
    print("✗ Table not found")

print("\n✅ Done!")
