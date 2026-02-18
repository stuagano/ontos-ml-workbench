#!/usr/bin/env python3
"""
Seed sheets using databricks-sql-connector
This library is specifically designed for SQL execution and may handle writes better
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from uuid import uuid4
from app.core.config import get_settings

print("🌱 Seeding sheets with databricks-sql-connector...\n")

# Check if library is available
try:
    from databricks import sql
    print("✅ databricks-sql-connector found\n")
except ImportError:
    print("❌ databricks-sql-connector not installed")
    print("   Install with: pip install databricks-sql-connector")
    print("\nAlternatively, use one of these methods:")
    print("  1. python scripts/seed_via_api.py (uses our API)")
    print("  2. python scripts/seed_sheets.py (uses Databricks Jobs)")
    sys.exit(1)

# Get settings
settings = get_settings()
catalog = settings.databricks_catalog
schema = settings.databricks_schema
table_name = f"{catalog}.{schema}.sheets"

print(f"Target: {table_name}")
print(f"Warehouse: {settings.databricks_warehouse_id}\n")

# Prepare seed data
user = "stuart.gano@databricks.com"
sheets = [
    {
        "id": f"sheet-{uuid4()}",
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of PCBs with labeled defects",
        "source_type": "uc_volume",
        "source_table": None,
        "source_volume": "/Volumes/home_stuart_gano/ontos_ml_workbench/pcb_images",
        "source_path": "defect_images/",
        "item_id_column": "image_filename",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp"],
        "sampling_strategy": "all",
        "sample_size": None,
        "filter_expression": None,
        "status": "active",
        "item_count": 150,
    },
    {
        "id": f"sheet-{uuid4()}",
        "name": "Radiation Sensor Telemetry",
        "description": "Time-series sensor data from radiation detectors",
        "source_type": "uc_table",
        "source_table": f"{catalog}.{schema}.sensor_readings",
        "source_volume": None,
        "source_path": None,
        "item_id_column": "reading_id",
        "text_columns": ["notes", "alert_message"],
        "image_columns": [],
        "metadata_columns": ["sensor_id", "location"],
        "sampling_strategy": "random",
        "sample_size": 1000,
        "filter_expression": 'status = "active"',
        "status": "active",
        "item_count": 5000,
    },
]

# Connect and insert
try:
    # Use default authentication (CLI profile or environment variables)
    connection = sql.connect(
        server_hostname=settings.databricks_host.replace("https://", ""),
        http_path=f"/sql/1.0/warehouses/{settings.databricks_warehouse_id}",
    )

    cursor = connection.cursor()
    print("✅ Connected to Databricks SQL\n")

    # Insert each sheet
    for i, sheet in enumerate(sheets, 1):
        print(f"{i}. Inserting: {sheet['name']}")

        # Build INSERT statement
        text_cols = ", ".join([f"'{c}'" for c in sheet['text_columns']])
        image_cols = ", ".join([f"'{c}'" for c in sheet['image_columns']])
        meta_cols = ", ".join([f"'{c}'" for c in sheet['metadata_columns']])

        sql_stmt = f"""
        INSERT INTO {table_name} VALUES (
          '{sheet['id']}',
          '{sheet['name']}',
          '{sheet['description']}',
          '{sheet['source_type']}',
          {f"'{sheet['source_table']}'" if sheet['source_table'] else 'NULL'},
          {f"'{sheet['source_volume']}'" if sheet['source_volume'] else 'NULL'},
          {f"'{sheet['source_path']}'" if sheet['source_path'] else 'NULL'},
          '{sheet['item_id_column']}',
          ARRAY({text_cols if text_cols else ''}),
          ARRAY({image_cols if image_cols else ''}),
          ARRAY({meta_cols if meta_cols else ''}),
          '{sheet['sampling_strategy']}',
          {sheet['sample_size'] if sheet['sample_size'] else 'NULL'},
          {f"'{sheet['filter_expression']}'" if sheet['filter_expression'] else 'NULL'},
          '{sheet['status']}',
          {sheet['item_count']},
          NULL,
          CURRENT_TIMESTAMP(),
          '{user}',
          CURRENT_TIMESTAMP(),
          '{user}'
        )
        """

        try:
            cursor.execute(sql_stmt)
            print(f"   ✅ Inserted: {sheet['id']}")
        except Exception as e:
            print(f"   ❌ Failed: {e}")

    cursor.close()
    connection.close()

    # Verify
    print("\n" + "="*60)
    print("Verifying insertions...\n")

    connection = sql.connect(
        server_hostname=settings.databricks_host.replace("https://", ""),
        http_path=f"/sql/1.0/warehouses/{settings.databricks_warehouse_id}",
    )

    cursor = connection.cursor()
    cursor.execute(f"SELECT id, name, status FROM {table_name}")

    rows = cursor.fetchall()
    if rows:
        print(f"✅ Found {len(rows)} sheets:")
        for row in rows:
            print(f"  - {row[1]} ({row[0][:13]}...) - {row[2]}")
    else:
        print("⚠️  No sheets found (inserts may still be pending)")

    cursor.close()
    connection.close()

    print("\n🎉 Seed data complete!")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nIf the connection fails, try one of these alternatives:")
    print("  1. Start backend and use: python scripts/seed_via_api.py")
    print("  2. Use Databricks workspace SQL editor (copy SQL from error above)")
    sys.exit(1)
