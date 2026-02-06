# Databricks notebook source
# MAGIC %md
# MAGIC # Quick Setup - Create Tables in serverless_dxukih_catalog.mirion_vital_workbench

# COMMAND ----------
# Create schema
spark.sql("CREATE SCHEMA IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench")
print("✅ Schema created: serverless_dxukih_catalog.mirion_vital_workbench")

# COMMAND ----------
# Import datetime and user info
from datetime import datetime
user_email = spark.sql("SELECT current_user()").collect()[0][0]
now = datetime.now()

print(f"Setting up as: {user_email}")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Create All Tables

# COMMAND ----------
# Sheets table
spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.sheets (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  source_type STRING NOT NULL,
  source_table STRING,
  source_volume STRING,
  source_path STRING,
  item_id_column STRING NOT NULL,
  text_columns ARRAY<STRING>,
  image_columns ARRAY<STRING>,
  metadata_columns ARRAY<STRING>,
  sampling_strategy STRING NOT NULL,
  sample_size INT,
  sample_seed INT,
  status STRING NOT NULL,
  item_count BIGINT,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_sheets PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.templates (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  label_type STRING NOT NULL,
  prompt_template STRING NOT NULL,
  input_schema VARIANT,
  output_schema VARIANT,
  few_shot_count INT,
  model_name STRING NOT NULL,
  temperature DOUBLE,
  status STRING NOT NULL,
  version INT NOT NULL,
  use_case STRING,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_templates PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.canonical_labels (
  id STRING NOT NULL,
  sheet_id STRING NOT NULL,
  item_ref STRING NOT NULL,
  label_type STRING NOT NULL,
  label_data VARIANT NOT NULL,
  labeled_by STRING NOT NULL,
  review_notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_canonical_labels PRIMARY KEY (id),
  CONSTRAINT unique_label UNIQUE (sheet_id, item_ref, label_type)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.training_sheets (
  id STRING NOT NULL,
  name STRING NOT NULL,
  sheet_id STRING NOT NULL,
  template_id STRING NOT NULL,
  status STRING NOT NULL,
  qa_pair_count INT,
  approved_count INT,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_training_sheets PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.qa_pairs (
  id STRING NOT NULL,
  training_sheet_id STRING NOT NULL,
  sheet_id STRING NOT NULL,
  item_ref STRING NOT NULL,
  messages VARIANT NOT NULL,
  canonical_label_id STRING,
  review_status STRING NOT NULL,
  allowed_uses ARRAY<STRING>,
  prohibited_uses ARRAY<STRING>,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_qa_pairs PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.model_training_lineage (
  id STRING NOT NULL,
  model_name STRING NOT NULL,
  training_sheet_ids ARRAY<STRING> NOT NULL,
  training_started_at TIMESTAMP,
  training_completed_at TIMESTAMP,
  model_version STRING,
  hyperparameters VARIANT,
  metrics VARIANT,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  CONSTRAINT pk_model_training_lineage PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

spark.sql("""
CREATE TABLE IF NOT EXISTS serverless_dxukih_catalog.mirion_vital_workbench.example_store (
  id STRING NOT NULL,
  template_id STRING NOT NULL,
  example_type STRING NOT NULL,
  input_data VARIANT NOT NULL,
  output_data VARIANT NOT NULL,
  quality_score DOUBLE,
  usage_count INT,
  notes STRING,
  created_at TIMESTAMP NOT NULL,
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by STRING NOT NULL,
  CONSTRAINT pk_example_store PRIMARY KEY (id)
) USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

print("✅ All tables created!")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Seed Sample Data Pointing to Your Existing Mirion Tables

# COMMAND ----------
# Get list of existing tables in serverless_dxukih_catalog.mirion
mirion_tables = spark.sql("SHOW TABLES IN serverless_dxukih_catalog.mirion").collect()

print(f"Found {len(mirion_tables)} existing Mirion tables:")
for table in mirion_tables:
    print(f"  - {table.tableName}")

# COMMAND ----------
# Create sheets pointing to existing tables
sheets_data = []

for table in mirion_tables:
    table_name = table.tableName
    full_path = f"serverless_dxukih_catalog.mirion.{table_name}"

    try:
        # Get row count
        count = spark.sql(f"SELECT COUNT(*) as cnt FROM {full_path}").collect()[0].cnt

        # Get columns
        columns_df = spark.sql(f"DESCRIBE {full_path}")
        columns = [row.col_name for row in columns_df.collect() if not row.col_name.startswith('#')]

        sheets_data.append({
            "id": f"sheet-mirion-{table_name}",
            "name": f"Mirion {table_name.replace('_', ' ').title()}",
            "description": f"Points to existing table: {full_path}",
            "source_type": "uc_table",
            "source_table": full_path,
            "source_volume": None,
            "source_path": None,
            "item_id_column": columns[0] if columns else "id",
            "text_columns": columns[1:6] if len(columns) > 1 else [],
            "image_columns": [],
            "metadata_columns": [],
            "sampling_strategy": "all",
            "sample_size": None,
            "sample_seed": None,
            "status": "active",
            "item_count": count,
            "notes": f"Auto-discovered from serverless_dxukih_catalog.mirion with {count} rows"
        })

        print(f"✅ Will create sheet for: {table_name} ({count} rows)")

    except Exception as e:
        print(f"⚠️  Skipping {table_name}: {e}")

# Add volume sheet if it exists
sheets_data.append({
    "id": "sheet-mirion-raw-volume",
    "name": "Mirion Raw Data Volume",
    "description": "Points to /Volumes/serverless_dxukih_catalog/mirion/raw_datak",
    "source_type": "uc_volume",
    "source_table": None,
    "source_volume": "/Volumes/serverless_dxukih_catalog/mirion/raw_datak",
    "source_path": "",
    "item_id_column": "filename",
    "text_columns": [],
    "image_columns": [],
    "metadata_columns": [],
    "sampling_strategy": "all",
    "sample_size": None,
    "sample_seed": None,
    "status": "active",
    "item_count": None,
    "notes": "Volume storage for raw files"
})

# Insert sheets
if sheets_data:
    sheets_df = spark.createDataFrame([
        (
            s["id"], s["name"], s["description"], s["source_type"],
            s["source_table"], s["source_volume"], s["source_path"],
            s["item_id_column"], s["text_columns"], s["image_columns"],
            s["metadata_columns"], s["sampling_strategy"], s["sample_size"],
            s["sample_seed"], s["status"], s["item_count"], s["notes"],
            now, user_email, now, user_email
        )
        for s in sheets_data
    ], ["id", "name", "description", "source_type", "source_table",
        "source_volume", "source_path", "item_id_column", "text_columns",
        "image_columns", "metadata_columns", "sampling_strategy", "sample_size",
        "sample_seed", "status", "item_count", "notes",
        "created_at", "created_by", "updated_at", "updated_by"])

    sheets_df.write.mode("append").saveAsTable("serverless_dxukih_catalog.mirion_vital_workbench.sheets")
    print(f"\n✅ Created {len(sheets_data)} sheets!")

# COMMAND ----------
# Create sample template
templates_data = [{
    "id": "tmpl-generic-001",
    "name": "Generic Data Classification",
    "description": "Classify and analyze data from Mirion tables",
    "label_type": "classification",
    "prompt_template": "Analyze this data and provide classification:\n\n{data}\n\nProvide category and confidence.",
    "input_schema": {"type": "object", "properties": {"data": {"type": "string"}}},
    "output_schema": {"type": "object", "properties": {"category": {"type": "string"}, "confidence": {"type": "number"}}},
    "few_shot_count": 3,
    "model_name": "gpt-4o",
    "temperature": 0.1,
    "status": "active",
    "version": 1,
    "use_case": "general",
    "notes": "Generic template for testing"
}]

templates_df = spark.createDataFrame([
    (
        t["id"], t["name"], t["description"], t["label_type"],
        t["prompt_template"], t["input_schema"], t["output_schema"],
        t["few_shot_count"], t["model_name"], t["temperature"],
        t["status"], t["version"], t["use_case"], t["notes"],
        now, user_email, now, user_email
    )
    for t in templates_data
], ["id", "name", "description", "label_type", "prompt_template",
    "input_schema", "output_schema", "few_shot_count", "model_name",
    "temperature", "status", "version", "use_case", "notes",
    "created_at", "created_by", "updated_at", "updated_by"])

templates_df.write.mode("append").saveAsTable("serverless_dxukih_catalog.mirion_vital_workbench.templates")
print("✅ Created 1 template!")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Verify Setup

# COMMAND ----------
print("\n📊 Final Status:\n")
print("Sheets:")
display(spark.sql("SELECT id, name, source_type, source_table, item_count, status FROM serverless_dxukih_catalog.mirion_vital_workbench.sheets"))

print("\nTemplates:")
display(spark.sql("SELECT id, name, label_type, status FROM serverless_dxukih_catalog.mirion_vital_workbench.templates"))

print("\n✅ Setup complete! Your app is ready to run.")
print("\nRun ./start-dev.sh to start the application")
