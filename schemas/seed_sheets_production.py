#!/usr/bin/env python3
"""
Seed sheets data for Ontos ML Workbench
"""

import os
import uuid
from datetime import datetime

from databricks.sdk import WorkspaceClient

CATALOG = os.getenv("DATABRICKS_CATALOG", "your_catalog")
SCHEMA_NAME = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")
WAREHOUSE_ID = os.getenv("DATABRICKS_WAREHOUSE_ID")
PROFILE = os.getenv("DATABRICKS_CONFIG_PROFILE", "DEFAULT")

# Initialize Databricks client
w = WorkspaceClient(profile=PROFILE)
warehouse_id = WAREHOUSE_ID
schema = f"`{CATALOG}`.{SCHEMA_NAME}"
user = w.current_user.me().user_name

print("🌱 Seeding sheets table with sample data...\n")

# Generate UUIDs for sheets
sheet_ids = [str(uuid.uuid4()) for _ in range(5)]

sheets_data = [
    {
        "id": sheet_ids[0],
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of printed circuit boards with labeled defects (shorts, opens, missing components)",
        "source_type": "uc_volume",
        "source_volume": f"/Volumes/{CATALOG}/{SCHEMA_NAME}/pcb_images",
        "source_path": "defects/",
        "item_id_column": "pcb_serial",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": [
            "sensor_temp",
            "sensor_vibration",
            "timestamp",
            "station_id",
        ],
        "sampling_strategy": "all",
        "status": "active",
        "item_count": 2450,
    },
    {
        "id": sheet_ids[1],
        "name": "Industrial Sensor Telemetry",
        "description": "Time-series sensor data from manufacturing equipment with anomaly labels",
        "source_type": "uc_table",
        "source_volume": None,
        "source_path": f"`{CATALOG}`.{SCHEMA_NAME}.sensor_readings",
        "item_id_column": "reading_id",
        "text_columns": ["sensor_type", "location", "status_message"],
        "image_columns": [],
        "metadata_columns": ["temperature", "pressure", "vibration", "timestamp"],
        "sampling_strategy": "all",
        "status": "active",
        "item_count": 5800,
    },
    {
        "id": sheet_ids[2],
        "name": "Medical Invoice Extraction",
        "description": "Healthcare invoices requiring entity extraction (patient ID, procedures, amounts, dates)",
        "source_type": "uc_volume",
        "source_volume": f"/Volumes/{CATALOG}/{SCHEMA_NAME}/invoices",
        "source_path": "healthcare/",
        "item_id_column": "invoice_number",
        "text_columns": ["invoice_text"],
        "image_columns": ["invoice_scan"],
        "metadata_columns": ["received_date", "processing_status", "total_amount"],
        "sampling_strategy": "stratified",
        "status": "active",
        "item_count": 1200,
    },
    {
        "id": sheet_ids[3],
        "name": "Equipment Maintenance Logs",
        "description": "Free-text maintenance reports requiring classification (routine, repair, emergency)",
        "source_type": "uc_table",
        "source_volume": None,
        "source_path": f"`{CATALOG}`.{SCHEMA_NAME}.maintenance_logs",
        "item_id_column": "log_id",
        "text_columns": ["description", "technician_notes"],
        "image_columns": [],
        "metadata_columns": ["equipment_id", "timestamp", "duration_hours", "priority"],
        "sampling_strategy": "all",
        "status": "active",
        "item_count": 3200,
    },
    {
        "id": sheet_ids[4],
        "name": "Quality Control Photos",
        "description": "Product inspection photos requiring defect localization (bounding boxes)",
        "source_type": "uc_volume",
        "source_volume": f"/Volumes/{CATALOG}/{SCHEMA_NAME}/qc_photos",
        "source_path": "inspections/",
        "item_id_column": "photo_id",
        "text_columns": [],
        "image_columns": ["photo_path"],
        "metadata_columns": [
            "product_sku",
            "inspection_station",
            "timestamp",
            "inspector_id",
        ],
        "sampling_strategy": "stratified",
        "status": "active",
        "item_count": 4100,
    },
]

# Build INSERT statements
for i, sheet in enumerate(sheets_data, 1):
    print(f"📋 Inserting sheet {i}/5: {sheet['name']}")

    # Convert arrays to SQL format
    text_cols = (
        "ARRAY(" + ", ".join([f"'{c}'" for c in sheet["text_columns"]]) + ")"
        if sheet["text_columns"]
        else "ARRAY()"
    )
    image_cols = (
        "ARRAY(" + ", ".join([f"'{c}'" for c in sheet["image_columns"]]) + ")"
        if sheet["image_columns"]
        else "ARRAY()"
    )
    meta_cols = (
        "ARRAY(" + ", ".join([f"'{c}'" for c in sheet["metadata_columns"]]) + ")"
        if sheet["metadata_columns"]
        else "ARRAY()"
    )

    source_volume_val = (
        f"'{sheet['source_volume']}'" if sheet["source_volume"] else "NULL"
    )

    sql = f"""
    INSERT INTO {schema}.sheets (
        id, name, description, source_type, source_volume, source_path,
        item_id_column, text_columns, image_columns, metadata_columns,
        sampling_strategy, status, item_count,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        '{sheet["id"]}',
        '{sheet["name"]}',
        '{sheet["description"]}',
        '{sheet["source_type"]}',
        {source_volume_val},
        '{sheet["source_path"]}',
        '{sheet["item_id_column"]}',
        {text_cols},
        {image_cols},
        {meta_cols},
        '{sheet["sampling_strategy"]}',
        '{sheet["status"]}',
        {sheet["item_count"]},
        CURRENT_TIMESTAMP(),
        '{user}',
        CURRENT_TIMESTAMP(),
        '{user}'
    )
    """

    try:
        result = w.statement_execution.execute_statement(
            statement=sql, warehouse_id=warehouse_id, wait_timeout="30s"
        )
        print(f"  ✓ Sheet inserted: {sheet['id'][:8]}...")
    except Exception as e:
        print(f"  ✗ Failed: {str(e)}")
        continue

print(f"\n✅ Seeding complete!")
print(f"   - {len(sheets_data)} sheets inserted")
print(
    f"   - Total items across all sheets: {sum(s['item_count'] for s in sheets_data):,}"
)
print(f"\nVerify with:")
print(f"  SELECT name, item_count, status FROM {schema}.sheets;")
