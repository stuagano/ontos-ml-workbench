#!/usr/bin/env python3
"""
Seed sheets table with sample data via the Sheets v2 API
This bypasses SQL warehouse INSERT issues by using the backend API
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import httpx
from app.core.config import get_settings

print("🌱 Seeding sheets via API...\n")

# Initialize
settings = get_settings()
import os
api_base_url = os.environ.get("API_BASE_URL", "http://localhost:8000") + "/api/v1"
catalog = settings.databricks_catalog
schema = settings.databricks_schema

# Sample sheets to create
sheets = [
    {
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of PCBs with labeled defects for computer vision training",
        "source_type": "uc_volume",
        "source_volume": f"/Volumes/{catalog}/{schema}/pcb_images",
        "source_path": "defect_images/",
        "item_id_column": "image_filename",
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp", "station_id", "shift"],
        "sampling_strategy": "all",
        "status": "active",
    },
    {
        "name": "Radiation Sensor Telemetry",
        "description": "Time-series sensor data from radiation detectors for anomaly detection",
        "source_type": "uc_table",
        "source_table": f"{catalog}.{schema}.sensor_readings",
        "item_id_column": "reading_id",
        "text_columns": ["notes", "alert_message"],
        "metadata_columns": ["sensor_id", "location", "timestamp", "calibration_date", "reading_value"],
        "sampling_strategy": "random",
        "sample_size": 1000,
        "filter_expression": 'status = "active" AND reading_value > 0',
        "status": "active",
    },
    {
        "name": "Medical Invoice Entity Extraction",
        "description": "Healthcare billing invoices (PDFs + structured data) for entity extraction",
        "source_type": "uc_table",
        "source_table": f"{catalog}.{schema}.parsed_invoices",
        "item_id_column": "invoice_id",
        "text_columns": ["invoice_text", "patient_notes"],
        "image_columns": ["pdf_path"],
        "metadata_columns": ["invoice_date", "total_amount", "patient_id", "provider_id"],
        "sampling_strategy": "stratified",
        "sample_size": 500,
        "filter_expression": 'invoice_date >= "2024-01-01"',
        "status": "active",
    },
    {
        "name": "Equipment Maintenance Logs",
        "description": "Service records and maintenance notes for predictive maintenance",
        "source_type": "uc_table",
        "source_table": f"{catalog}.{schema}.maintenance_logs",
        "item_id_column": "log_id",
        "text_columns": ["technician_notes", "issue_description", "resolution"],
        "metadata_columns": ["equipment_id", "service_date", "downtime_hours", "parts_replaced"],
        "sampling_strategy": "all",
        "status": "active",
    },
    {
        "name": "Quality Control Inspection Photos",
        "description": "Final product inspection images from manufacturing line",
        "source_type": "uc_volume",
        "source_volume": f"/Volumes/{catalog}/{schema}/qc_images",
        "source_path": "inspections/",
        "item_id_column": "inspection_id",
        "image_columns": ["photo_path"],
        "metadata_columns": ["product_sku", "line_number", "inspector_id", "timestamp", "passed"],
        "sampling_strategy": "all",
        "status": "active",
    },
]

print(f"Will create {len(sheets)} sample sheets\n")
print(f"Target: {catalog}.{schema}.sheets")
print(f"API Base: {api_base_url}\n")
print("="*60 + "\n")

# Create sheets via API
created_count = 0
failed_count = 0

with httpx.Client(timeout=30.0) as client:
    for i, sheet_data in enumerate(sheets, 1):
        sheet_name = sheet_data["name"]
        print(f"[{i}/{len(sheets)}] Creating: {sheet_name}")

        try:
            response = client.post(
                f"{api_base_url}/sheets-v2",
                json=sheet_data,
            )

            if response.status_code == 201:
                result = response.json()
                sheet_id = result.get("id", "unknown")
                print(f"  ✅ Created: {sheet_id}")
                created_count += 1
            else:
                print(f"  ❌ Failed: {response.status_code}")
                print(f"     {response.text}")
                failed_count += 1

        except Exception as e:
            print(f"  ❌ Error: {e}")
            failed_count += 1

        print()

print("="*60)
print(f"\n✅ Created: {created_count}")
print(f"❌ Failed: {failed_count}")
print(f"\n🎉 Seeding complete!")

if created_count > 0:
    print(f"\nVerify in UI: open the app (DATA stage)")
    print(f"Or via API: {api_base_url}/sheets-v2")


<system-reminder>
Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>
