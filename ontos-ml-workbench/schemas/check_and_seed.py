# Databricks notebook source
# MAGIC %md
# MAGIC # Ontos ML Workbench - Database Check and Seed
# MAGIC
# MAGIC This notebook checks the database state and seeds initial data if needed.
# MAGIC
# MAGIC **Schema:** `home_stuart_gano.ontos_ml_workbench`

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 1: Check if Tables Exist

# COMMAND ----------
# Check if schema exists
try:
    tables = spark.sql("SHOW TABLES IN home_stuart_gano.ontos_ml_workbench").collect()
    print(f"✅ Schema exists with {len(tables)} tables:")
    for table in tables:
        print(f"  - {table.tableName}")
except Exception as e:
    print(f"❌ Schema not found: {e}")
    print("\nRun this to create schema:")
    print("CREATE SCHEMA IF NOT EXISTS home_stuart_gano.ontos_ml_workbench")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 2: Check Table Row Counts

# COMMAND ----------
tables_to_check = [
    "sheets",
    "templates",
    "canonical_labels",
    "training_sheets",
    "qa_pairs",
    "model_training_lineage",
    "example_store"
]

print("Current data state:\n")
for table in tables_to_check:
    try:
        count = spark.sql(f"SELECT COUNT(*) as cnt FROM home_stuart_gano.ontos_ml_workbench.{table}").collect()[0].cnt
        status = "✅" if count > 0 else "⚠️ "
        print(f"{status} {table}: {count} rows")
    except Exception as e:
        print(f"❌ {table}: NOT FOUND")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 3: Seed Sample Data
# MAGIC
# MAGIC Run this to add initial test data.

# COMMAND ----------
from datetime import datetime
from pyspark.sql.functions import lit, current_timestamp

# Current user
user_email = spark.sql("SELECT current_user()").collect()[0][0]
now = datetime.now()

print(f"Seeding data as: {user_email}\n")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Seed Sheets

# COMMAND ----------
# Create sample sheets
sheets_data = [
    {
        "id": "sheet-defect-images-001",
        "name": "PCB Defect Detection Images",
        "description": "Microscope images of PCB inspection with sensor context",
        "source_type": "uc_volume",
        "source_table": None,
        "source_volume": "/Volumes/home_stuart_gano/ontos_ml_workbench/pcb_images",
        "source_path": "defects/",
        "item_id_column": "filename",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp", "temperature"],
        "sampling_strategy": "all",
        "sample_size": None,
        "sample_seed": None,
        "status": "active",
        "item_count": 150,
        "notes": "Year 1 Priority - Reduce manual inspection time by 80%"
    },
    {
        "id": "sheet-sensor-telemetry-001",
        "name": "Equipment Sensor Telemetry",
        "description": "Real-time sensor readings for predictive maintenance",
        "source_type": "uc_table",
        "source_table": "home_stuart_gano.ontos_ml_workbench.sensor_readings",
        "source_volume": None,
        "source_path": None,
        "item_id_column": "reading_id",
        "text_columns": ["equipment_id", "sensor_type"],
        "image_columns": [],
        "metadata_columns": ["temperature", "vibration", "pressure", "humidity"],
        "sampling_strategy": "recent",
        "sample_size": 10000,
        "sample_seed": None,
        "status": "active",
        "item_count": 50000,
        "notes": "Year 1 Priority - Prevent unplanned downtime"
    },
    {
        "id": "sheet-anomaly-stream-001",
        "name": "Radiation Sensor Anomalies",
        "description": "Continuous monitoring stream for anomaly detection",
        "source_type": "uc_table",
        "source_table": "home_stuart_gano.ontos_ml_workbench.radiation_readings",
        "source_volume": None,
        "source_path": None,
        "item_id_column": "event_id",
        "text_columns": ["detector_id", "isotope"],
        "image_columns": [],
        "metadata_columns": ["counts_per_second", "energy_level", "background_rate"],
        "sampling_strategy": "all",
        "sample_size": None,
        "sample_seed": None,
        "status": "active",
        "item_count": 25000,
        "notes": "Year 1-2 Priority - Early warning for drift/issues"
    }
]

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

# Insert or merge
sheets_df.write.mode("append").saveAsTable("home_stuart_gano.ontos_ml_workbench.sheets")
print(f"✅ Seeded {len(sheets_data)} sheets")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Seed Templates

# COMMAND ----------
templates_data = [
    {
        "id": "tmpl-defect-classify-001",
        "name": "PCB Defect Classification",
        "description": "Classify PCB defects from microscope images with sensor context",
        "label_type": "defect_class",
        "prompt_template": """Analyze this PCB inspection image and classify any defects.

Image: {image_path}
Sensor Context:
- Temperature: {temperature}°C
- Timestamp: {timestamp}

Classify the defect type as one of:
- solder_bridge
- cold_joint
- missing_component
- cracked_trace
- contamination
- none

Provide your classification and confidence level.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "image_path": {"type": "string"},
                "temperature": {"type": "number"},
                "timestamp": {"type": "string"}
            },
            "required": ["image_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "defect_type": {"type": "string", "enum": ["solder_bridge", "cold_joint", "missing_component", "cracked_trace", "contamination", "none"]},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            }
        },
        "few_shot_count": 3,
        "model_name": "gpt-4o",
        "temperature": 0.1,
        "status": "active",
        "version": 1,
        "use_case": "defect_detection",
        "notes": "Template for Year 1 Priority use case"
    },
    {
        "id": "tmpl-predictive-maint-001",
        "name": "Equipment Failure Prediction",
        "description": "Predict equipment failure probability from sensor telemetry",
        "label_type": "failure_risk",
        "prompt_template": """Analyze this equipment sensor data and predict failure probability.

Equipment ID: {equipment_id}
Sensor Type: {sensor_type}
Readings:
- Temperature: {temperature}°C
- Vibration: {vibration} Hz
- Pressure: {pressure} PSI
- Humidity: {humidity}%

Based on these readings, provide:
1. Failure probability (0-1)
2. Risk level (low/medium/high/critical)
3. Recommended action
4. Confidence in prediction""",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipment_id": {"type": "string"},
                "sensor_type": {"type": "string"},
                "temperature": {"type": "number"},
                "vibration": {"type": "number"},
                "pressure": {"type": "number"},
                "humidity": {"type": "number"}
            },
            "required": ["equipment_id", "temperature", "vibration"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "failure_probability": {"type": "number", "minimum": 0, "maximum": 1},
                "risk_level": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                "recommended_action": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            }
        },
        "few_shot_count": 5,
        "model_name": "gpt-4o",
        "temperature": 0.0,
        "status": "active",
        "version": 1,
        "use_case": "predictive_maintenance",
        "notes": "Template for Year 1 Priority use case"
    },
    {
        "id": "tmpl-anomaly-detect-001",
        "name": "Radiation Anomaly Detection",
        "description": "Detect anomalies in radiation sensor streams",
        "label_type": "anomaly_alert",
        "prompt_template": """Analyze this radiation sensor reading for anomalies.

Detector ID: {detector_id}
Isotope: {isotope}
Current Reading:
- Counts per second: {counts_per_second}
- Energy level: {energy_level} keV
- Background rate: {background_rate} CPS

Determine if this is an anomaly and provide:
1. Is this anomalous? (yes/no)
2. Severity (low/medium/high)
3. Explanation
4. Recommended response""",
        "input_schema": {
            "type": "object",
            "properties": {
                "detector_id": {"type": "string"},
                "isotope": {"type": "string"},
                "counts_per_second": {"type": "number"},
                "energy_level": {"type": "number"},
                "background_rate": {"type": "number"}
            },
            "required": ["detector_id", "counts_per_second"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "is_anomaly": {"type": "boolean"},
                "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                "explanation": {"type": "string"},
                "recommended_response": {"type": "string"}
            }
        },
        "few_shot_count": 3,
        "model_name": "gpt-4o",
        "temperature": 0.1,
        "status": "active",
        "version": 1,
        "use_case": "anomaly_detection",
        "notes": "Template for Year 1-2 Priority use case"
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

templates_df.write.mode("append").saveAsTable("home_stuart_gano.ontos_ml_workbench.templates")
print(f"✅ Seeded {len(templates_data)} templates")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Seed Canonical Labels

# COMMAND ----------
canonical_labels_data = [
    {
        "id": "label-defect-001",
        "sheet_id": "sheet-defect-images-001",
        "item_ref": "pcb_0001.jpg",
        "label_type": "defect_class",
        "label_data": {
            "defect_type": "solder_bridge",
            "confidence": 0.95,
            "reviewer": "expert_physicist_1"
        },
        "labeled_by": "expert_physicist_1@example.com",
        "review_notes": "Clear solder bridge between pins 3 and 4"
    },
    {
        "id": "label-defect-002",
        "sheet_id": "sheet-defect-images-001",
        "item_ref": "pcb_0002.jpg",
        "label_type": "defect_class",
        "label_data": {
            "defect_type": "cold_joint",
            "confidence": 0.88,
            "reviewer": "expert_physicist_1"
        },
        "labeled_by": "expert_physicist_1@example.com",
        "review_notes": "Dull appearance indicates cold solder joint"
    },
    {
        "id": "label-defect-003",
        "sheet_id": "sheet-defect-images-001",
        "item_ref": "pcb_0003.jpg",
        "label_type": "defect_class",
        "label_data": {
            "defect_type": "none",
            "confidence": 0.99,
            "reviewer": "expert_physicist_2"
        },
        "labeled_by": "expert_physicist_2@example.com",
        "review_notes": "Clean board, no defects detected"
    }
]

canonical_labels_df = spark.createDataFrame([
    (
        cl["id"], cl["sheet_id"], cl["item_ref"], cl["label_type"],
        cl["label_data"], cl["labeled_by"], cl.get("review_notes"),
        now, user_email, now, user_email
    )
    for cl in canonical_labels_data
], ["id", "sheet_id", "item_ref", "label_type", "label_data",
    "labeled_by", "review_notes",
    "created_at", "created_by", "updated_at", "updated_by"])

canonical_labels_df.write.mode("append").saveAsTable("home_stuart_gano.ontos_ml_workbench.canonical_labels")
print(f"✅ Seeded {len(canonical_labels_data)} canonical labels")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Step 4: Verify Seeded Data

# COMMAND ----------
print("Verification:\n")

# Check sheets
print("📊 Sheets:")
display(spark.sql("SELECT id, name, source_type, status, item_count FROM home_stuart_gano.ontos_ml_workbench.sheets"))

print("\n📝 Templates:")
display(spark.sql("SELECT id, name, label_type, status, use_case FROM home_stuart_gano.ontos_ml_workbench.templates"))

print("\n🏷️  Canonical Labels:")
display(spark.sql("SELECT id, sheet_id, item_ref, label_type, labeled_by FROM home_stuart_gano.ontos_ml_workbench.canonical_labels"))

# COMMAND ----------
# MAGIC %md
# MAGIC ## ✅ Done!
# MAGIC
# MAGIC Your database is now seeded with sample data. You can start the application with:
# MAGIC
# MAGIC ```bash
# MAGIC # Backend
# MAGIC cd backend
# MAGIC uvicorn app.main:app --reload
# MAGIC
# MAGIC # Frontend (in another terminal)
# MAGIC cd frontend
# MAGIC npm run dev
# MAGIC ```
