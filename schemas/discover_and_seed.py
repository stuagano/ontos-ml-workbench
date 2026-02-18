# Databricks notebook source
# MAGIC %md
# MAGIC # Ontos ML Workbench - Discover Existing Data and Seed
# MAGIC
# MAGIC This notebook discovers what data already exists in your workspace and uses it to seed the application.

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 1: Discover Existing Volumes

# COMMAND ----------
# Configuration - set these for your workspace
import os
CATALOG = os.getenv("DATABRICKS_CATALOG", "your_catalog")
SCHEMA = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")

# COMMAND ----------
# List all volumes in the workspace
print("📂 Discovering volumes...\n")

try:
    volumes = spark.sql(f"SHOW VOLUMES IN {CATALOG}.{SCHEMA}").collect()
    print(f"Found {len(volumes)} volumes in {CATALOG}.{SCHEMA}:\n")
    for vol in volumes:
        print(f"  - {vol.volume_name}")
        # Try to list contents
        try:
            volume_path = f"/Volumes/{CATALOG}/{SCHEMA}/{vol.volume_name}"
            files = dbutils.fs.ls(volume_path)
            print(f"    Contents ({len(files)} items):")
            for f in files[:5]:  # Show first 5 items
                print(f"      {f.name} ({'dir' if f.isDir() else f.size})")
            if len(files) > 5:
                print(f"      ... and {len(files) - 5} more")
        except Exception as e:
            print(f"    Could not list contents: {e}")
        print()
except Exception as e:
    print(f"Could not list volumes: {e}")
    print("\nTrying to access raw_datak directly...")
    try:
        files = dbutils.fs.ls(f"/Volumes/{CATALOG}/{SCHEMA}/raw_datak")
        print(f"✅ Found raw_datak volume with {len(files)} items")
        for f in files[:10]:
            print(f"  {f.name} ({'dir' if f.isDir() else f.size})")
    except Exception as e2:
        print(f"❌ Could not access raw_datak: {e2}")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 2: Discover Existing Tables

# COMMAND ----------
print("📊 Discovering tables...\n")

# List all schemas in catalog
try:
    schemas = spark.sql(f"SHOW SCHEMAS IN {CATALOG}").collect()
    print(f"Found {len(schemas)} schemas in {CATALOG}:\n")

    for schema in schemas:
        schema_name = schema.databaseName
        print(f"Schema: {schema_name}")

        # List tables in each schema
        try:
            tables = spark.sql(f"SHOW TABLES IN {CATALOG}.{schema_name}").collect()
            if len(tables) > 0:
                print(f"  Tables ({len(tables)}):")
                for table in tables[:5]:  # Show first 5
                    table_name = table.tableName
                    # Get row count
                    try:
                        count = spark.sql(f"SELECT COUNT(*) as cnt FROM {CATALOG}.{schema_name}.{table_name}").collect()[0].cnt
                        print(f"    - {table_name} ({count} rows)")
                    except:
                        print(f"    - {table_name}")
                if len(tables) > 5:
                    print(f"    ... and {len(tables) - 5} more")
            else:
                print("  No tables")
        except Exception as e:
            print(f"  Could not list tables: {e}")
        print()

except Exception as e:
    print(f"Could not list schemas: {e}")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 3: Check Ontos ML Workbench Schema

# COMMAND ----------
print(f"🔍 Checking {CATALOG}.{SCHEMA} schema...\n")

# Check if schema exists
try:
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
    print("✅ Schema exists or created\n")

    # Check which tables exist
    tables_needed = [
        "sheets",
        "templates",
        "canonical_labels",
        "training_sheets",
        "qa_pairs",
        "model_training_lineage",
        "example_store"
    ]

    existing_tables = spark.sql(f"SHOW TABLES IN {CATALOG}.{SCHEMA}").collect()
    existing_table_names = [t.tableName for t in existing_tables]

    print("Table status:")
    for table in tables_needed:
        if table in existing_table_names:
            count = spark.sql(f"SELECT COUNT(*) as cnt FROM {CATALOG}.{SCHEMA}.{table}").collect()[0].cnt
            print(f"  ✅ {table}: {count} rows")
        else:
            print(f"  ❌ {table}: NOT CREATED")

    if len(existing_table_names) == 0:
        print("\n⚠️  No tables found. Need to create schema first!")
        print("    Run the SQL files in schemas/ directory")

except Exception as e:
    print(f"❌ Error: {e}")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 4: Create Tables (if needed)

# COMMAND ----------
print("📝 Reading schema files...\n")

# Read and execute schema files
import os

schema_files = [
    "02_sheets.sql",
    "03_templates.sql",
    "04_canonical_labels.sql",
    "05_training_sheets.sql",
    "06_qa_pairs.sql",
    "07_model_training_lineage.sql",
    "08_example_store.sql"
]

# Note: In a real scenario, you'd need to copy these files to DBFS or read from workspace
# For now, we'll create tables inline

print("Creating tables inline...\n")

# Sheets table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.sheets (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ sheets")

# Templates table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.templates (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ templates")

# Canonical Labels table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.canonical_labels (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ canonical_labels")

# Training Sheets table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.training_sheets (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ training_sheets")

# QA Pairs table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.qa_pairs (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ qa_pairs")

# Model Training Lineage table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.model_training_lineage (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ model_training_lineage")

# Example Store table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.{SCHEMA}.example_store (
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
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
""")
print("✅ example_store")

print("\n✅ All tables created!")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 5: Seed with Existing Data

# COMMAND ----------
from datetime import datetime

user_email = spark.sql("SELECT current_user()").collect()[0][0]
now = datetime.now()

print(f"🌱 Seeding data as: {user_email}\n")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Seed Sheets pointing to existing data

# COMMAND ----------
# Let's create sheets that point to the data you already have
sheets_data = [
    {
        "id": "sheet-domain-raw-001",
        "name": "Raw Data Volume",
        "description": "Existing data in raw_datak volume",
        "source_type": "uc_volume",
        "source_table": None,
        "source_volume": f"/Volumes/{CATALOG}/{SCHEMA}/raw_datak",
        "source_path": "",
        "item_id_column": "filename",
        "text_columns": [],
        "image_columns": [],
        "metadata_columns": [],
        "sampling_strategy": "all",
        "sample_size": None,
        "sample_seed": None,
        "status": "active",
        "item_count": None,  # Will be populated when we can access the volume
        "notes": "Points to existing domain data in workspace"
    }
]

# Check if there are any tables in the catalog schema
try:
    tables = spark.sql(f"SHOW TABLES IN {CATALOG}.{SCHEMA}").collect()
    for table in tables:
        table_name = table.tableName
        full_table_path = f"{CATALOG}.{SCHEMA}.{table_name}"

        # Get row count
        try:
            count = spark.sql(f"SELECT COUNT(*) as cnt FROM {full_table_path}").collect()[0].cnt

            # Get columns
            columns_df = spark.sql(f"DESCRIBE {full_table_path}")
            columns = [row.col_name for row in columns_df.collect() if not row.col_name.startswith('#')]

            # Try to identify column types
            text_cols = []
            metadata_cols = []
            for col in columns[:10]:  # First 10 columns
                if col.lower() not in ['id', 'filename']:
                    text_cols.append(col)

            sheets_data.append({
                "id": f"sheet-domain-{table_name}",
                "name": f"{table_name.replace('_', ' ').title()}",
                "description": f"Existing table: {full_table_path}",
                "source_type": "uc_table",
                "source_table": full_table_path,
                "source_volume": None,
                "source_path": None,
                "item_id_column": columns[0] if columns else "id",
                "text_columns": text_cols[:5],  # First 5 text columns
                "image_columns": [],
                "metadata_columns": metadata_cols,
                "sampling_strategy": "all",
                "sample_size": None,
                "sample_seed": None,
                "status": "active",
                "item_count": count,
                "notes": f"Auto-discovered table with {count} rows"
            })

            print(f"✅ Discovered table: {table_name} ({count} rows)")

        except Exception as e:
            print(f"⚠️  Could not analyze table {table_name}: {e}")

except Exception as e:
    print(f"⚠️  Could not discover tables: {e}")

print(f"\nCreating {len(sheets_data)} sheets...")

# Insert sheets
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

sheets_df.write.mode("append").saveAsTable(f"{CATALOG}.{SCHEMA}.sheets")
print(f"✅ Created {len(sheets_data)} sheets")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Seed Generic Templates

# COMMAND ----------
templates_data = [
    {
        "id": "tmpl-generic-classify-001",
        "name": "Generic Classification",
        "description": "Classify data into categories",
        "label_type": "classification",
        "prompt_template": """Analyze this data and classify it into the appropriate category.

Data: {text}

Provide your classification and reasoning.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"}
            },
            "required": ["text"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "reasoning": {"type": "string"}
            }
        },
        "few_shot_count": 3,
        "model_name": "gpt-4o",
        "temperature": 0.1,
        "status": "active",
        "version": 1,
        "use_case": "general",
        "notes": "Generic template for classification tasks"
    }
]

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

templates_df.write.mode("append").saveAsTable(f"{CATALOG}.{SCHEMA}.templates")
print(f"✅ Created {len(templates_data)} templates")

# COMMAND ----------
# MAGIC %md
# MAGIC ## ✅ Summary

# COMMAND ----------
print("📊 Final Status:\n")

# Show sheets
print("Sheets:")
display(spark.sql(f"SELECT id, name, source_type, source_table, source_volume, item_count FROM {CATALOG}.{SCHEMA}.sheets"))

print("\nTemplates:")
display(spark.sql(f"SELECT id, name, label_type, use_case FROM {CATALOG}.{SCHEMA}.templates"))

print("\n✅ Database seeded with your existing data!")
print("\nNext: Start the application with ./start-dev.sh")
