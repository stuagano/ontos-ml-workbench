#!/usr/bin/env python3
"""
Migrate sheets table from old schema to new PRD v2.3 schema
WARNING: This drops and recreates the table, losing existing data
"""

from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")
warehouse_id = "387bcda0f2ece20c"
schema = "`erp-demonstrations`.ontos_ml_workbench"

print("🔄 Migrating sheets table to new schema...\n")

# Step 1: Backup existing data (optional)
print("📋 Checking existing sheets...")
result = w.statement_execution.execute_statement(
    statement=f"SELECT COUNT(*) as count FROM {schema}.sheets",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
if result.result and result.result.data_array:
    old_count = result.result.data_array[0][0]
    print(f"   Found {old_count} sheets in old schema")
else:
    old_count = 0
    print("   Table is empty or inaccessible")

# Step 2: Drop old table
print("\n💥 Dropping old sheets table...")
result = w.statement_execution.execute_statement(
    statement=f"DROP TABLE IF EXISTS {schema}.sheets",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
print("   ✓ Old table dropped")

# Step 3: Create new table with PRD v2.3 schema
print("\n📝 Creating new sheets table with PRD v2.3 schema...")
create_table_sql = f"""
CREATE TABLE {schema}.sheets (
  -- Identity
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,

  -- Data source configuration
  source_type STRING NOT NULL COMMENT 'Type: uc_table, uc_volume, or external',
  source_table STRING COMMENT 'Unity Catalog table reference (e.g., catalog.schema.table)',
  source_volume STRING COMMENT 'Unity Catalog volume path (e.g., /Volumes/catalog/schema/volume)',
  source_path STRING COMMENT 'Path within volume if source_type is uc_volume',

  -- Schema information
  item_id_column STRING COMMENT 'Column name to use as item_ref in canonical labels',
  text_columns ARRAY<STRING> COMMENT 'Column names containing text data',
  image_columns ARRAY<STRING> COMMENT 'Column names with image paths (in volumes)',
  metadata_columns ARRAY<STRING> COMMENT 'Additional columns to include as context',

  -- Configuration
  sampling_strategy STRING DEFAULT 'all' COMMENT 'Options: all, random, stratified',
  sample_size INT COMMENT 'Number of items to sample (null = all)',
  filter_expression STRING COMMENT 'SQL WHERE clause to filter items',

  -- Status tracking
  status STRING DEFAULT 'active' COMMENT 'Status: active, archived, deleted',
  item_count INT COMMENT 'Cached count of items in dataset',
  last_validated_at TIMESTAMP COMMENT 'Last time source was validated',

  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,

  -- Constraints
  CONSTRAINT pk_sheets PRIMARY KEY (id)
)
COMMENT 'Dataset definitions that reference Unity Catalog tables or volumes - PRD v2.3'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'quality' = 'bronze'
)
"""

result = w.statement_execution.execute_statement(
    statement=create_table_sql, warehouse_id=warehouse_id, wait_timeout="30s"
)
print("   ✓ New table created")

# Step 4: Verify new schema
print("\n🔍 Verifying new schema...")
result = w.statement_execution.execute_statement(
    statement=f"DESCRIBE TABLE {schema}.sheets",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)
if result.result and result.result.data_array:
    print(f"   ✓ Table has {len(result.result.data_array)} columns:")
    key_columns = [
        "id",
        "name",
        "source_type",
        "source_table",
        "source_volume",
        "text_columns",
        "image_columns",
        "item_count",
        "status",
    ]
    for row in result.result.data_array:
        if row[0] in key_columns:
            print(f"      - {row[0]:25s} {row[1]}")

print("\n✅ Migration complete!")
print(f"   - Old schema: {old_count} sheets (dropped)")
print(f"   - New schema: Ready for data")
print(f"\nNext: Run seed_sheets_production.py to populate with sample data")
