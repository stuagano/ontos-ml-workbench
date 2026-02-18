#!/usr/bin/env python3
"""
Seed sheets using the Sheet Management API we just created
This calls the POST /sheets-v2 endpoint directly
"""
import requests
import json
from uuid import uuid4

API_BASE = "http://localhost:8000/api/v1"

sheets_to_create = [
    {
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of PCBs with labeled defects",
        "source_type": "uc_volume",
        "source_volume": "/Volumes/home_stuart_gano/ontos_ml_workbench/pcb_images",
        "source_path": "defect_images/",
        "item_id_column": "image_filename",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp", "station_id"],
        "sampling_strategy": "all",
        "status": "active",
    },
    {
        "name": "Radiation Sensor Telemetry",
        "description": "Time-series sensor data from radiation detectors",
        "source_type": "uc_table",
        "source_table": "home_stuart_gano.ontos_ml_workbench.sensor_readings",
        "item_id_column": "reading_id",
        "text_columns": ["notes", "alert_message"],
        "image_columns": [],
        "metadata_columns": ["sensor_id", "location", "timestamp"],
        "sampling_strategy": "random",
        "sample_size": 1000,
        "filter_expression": 'status = "active" AND reading_value > 0',
        "status": "active",
    },
]

print("🌱 Seeding sheets via API...\n")
print(f"API Base: {API_BASE}\n")

# Check if API is running
try:
    response = requests.get(f"{API_BASE}/sheets-v2", timeout=5)
    print(f"✅ API is accessible (status: {response.status_code})\n")
except requests.exceptions.ConnectionError:
    print("❌ API is not running!")
    print("   Start it with: cd backend && uvicorn app.main:app --reload")
    exit(1)

# Create sheets
created_ids = []
for i, sheet_data in enumerate(sheets_to_create, 1):
    print(f"{i}. Creating: {sheet_data['name']}")

    try:
        response = requests.post(
            f"{API_BASE}/sheets-v2",
            json=sheet_data,
            timeout=30  # Give it time
        )

        if response.status_code == 201:
            result = response.json()
            created_ids.append(result["id"])
            print(f"   ✅ Created: {result['id']}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except requests.exceptions.Timeout:
        print(f"   ⏱  Request timed out (expected due to SQL warehouse issue)")
        print(f"   Note: Sheet may still be created eventually")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()

# Verify what was created
print("="*60)
print("Verifying created sheets...\n")

try:
    response = requests.get(f"{API_BASE}/sheets-v2", timeout=10)
    if response.status_code == 200:
        result = response.json()
        sheets = result.get("sheets", [])

        if sheets:
            print(f"✅ Found {len(sheets)} sheets:\n")
            for sheet in sheets:
                print(f"  - {sheet['name']}")
                print(f"    ID: {sheet['id']}")
                print(f"    Source: {sheet['source_type']}")
                print(f"    Status: {sheet['status']}")
                print()
        else:
            print("⚠️  No sheets found yet")
            print("   This is normal if INSERT is still pending")
            print("   Try checking again in a minute")
    else:
        print(f"Failed to list sheets: {response.status_code}")

except Exception as e:
    print(f"Error listing sheets: {e}")

print("="*60)
print("\nDone! If sheets don't appear immediately, wait a moment and check:")
print(f"  curl {API_BASE}/sheets-v2")
