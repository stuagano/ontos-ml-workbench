#!/usr/bin/env python3
"""
Seed canonical labels for the 5 sample sheets
Creates diverse examples across different label types
"""

import json
import uuid
from datetime import datetime

from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")
warehouse_id = "387bcda0f2ece20c"
user = "stuart.gano@databricks.com"

print("🌱 Seeding canonical labels...\n")

# First, get the sheet IDs
sheets_result = w.statement_execution.execute_statement(
    statement="SELECT id, name FROM `erp-demonstrations`.ontos_ml_workbench.sheets ORDER BY name",
    warehouse_id=warehouse_id,
    wait_timeout="30s",
)

if not sheets_result.result or not sheets_result.result.data_array:
    print("❌ No sheets found! Run seed_sheets_production.py first")
    exit(1)

sheets = {row[1]: row[0] for row in sheets_result.result.data_array}
print(f"Found {len(sheets)} sheets\n")

# Sample labels for each sheet
labels_data = []

# 1. Equipment Maintenance Logs - Classification
if "Equipment Maintenance Logs" in sheets:
    sheet_id = sheets["Equipment Maintenance Logs"]
    labels_data.extend(
        [
            {
                "sheet_id": sheet_id,
                "item_ref": "log_001",
                "label_type": "classification",
                "label_data": {
                    "category": "routine",
                    "severity": "low",
                    "estimated_hours": 2,
                },
                "label_confidence": "high",
                "data_classification": "internal",
                "allowed_uses": ["training", "validation", "testing"],
            },
            {
                "sheet_id": sheet_id,
                "item_ref": "log_042",
                "label_type": "classification",
                "label_data": {
                    "category": "emergency",
                    "severity": "high",
                    "estimated_hours": 8,
                },
                "label_confidence": "verified",
                "data_classification": "internal",
                "allowed_uses": ["training", "validation", "testing", "production"],
            },
        ]
    )

# 2. Industrial Sensor Telemetry - Anomaly Detection
if "Industrial Sensor Telemetry" in sheets:
    sheet_id = sheets["Industrial Sensor Telemetry"]
    labels_data.extend(
        [
            {
                "sheet_id": sheet_id,
                "item_ref": "reading_12345",
                "label_type": "anomaly_detection",
                "label_data": {
                    "is_anomaly": True,
                    "anomaly_type": "temperature_spike",
                    "confidence": 0.95,
                },
                "label_confidence": "high",
                "data_classification": "internal",
                "allowed_uses": ["training", "validation", "research"],
            },
            {
                "sheet_id": sheet_id,
                "item_ref": "reading_23456",
                "label_type": "anomaly_detection",
                "label_data": {
                    "is_anomaly": False,
                    "anomaly_type": None,
                    "confidence": 0.99,
                },
                "label_confidence": "verified",
                "data_classification": "internal",
                "allowed_uses": ["training", "validation", "testing"],
            },
        ]
    )

# 3. Medical Invoice Extraction - Entity Extraction
if "Medical Invoice Extraction" in sheets:
    sheet_id = sheets["Medical Invoice Extraction"]
    labels_data.extend(
        [
            {
                "sheet_id": sheet_id,
                "item_ref": "invoice_042",
                "label_type": "entity_extraction",
                "label_data": {
                    "entities": [
                        {
                            "type": "patient_id",
                            "value": "P-12345",
                            "start": 10,
                            "end": 17,
                        },
                        {
                            "type": "procedure",
                            "value": "MRI Scan",
                            "start": 45,
                            "end": 53,
                        },
                        {
                            "type": "amount",
                            "value": "$1,250.00",
                            "start": 78,
                            "end": 87,
                        },
                    ]
                },
                "label_confidence": "verified",
                "data_classification": "pii",
                "allowed_uses": ["training", "validation"],
                "prohibited_uses": ["production", "research"],
            },
            {
                "sheet_id": sheet_id,
                "item_ref": "invoice_123",
                "label_type": "entity_extraction",
                "label_data": {
                    "entities": [
                        {
                            "type": "patient_id",
                            "value": "P-67890",
                            "start": 8,
                            "end": 15,
                        },
                        {"type": "date", "value": "2026-02-01", "start": 20, "end": 30},
                        {"type": "amount", "value": "$850.00", "start": 95, "end": 102},
                    ]
                },
                "label_confidence": "high",
                "data_classification": "pii",
                "allowed_uses": ["validation"],
                "prohibited_uses": ["production", "research", "training"],
            },
        ]
    )

# 4. PCB Defect Detection - Defect Localization
if "PCB Defect Detection Dataset" in sheets:
    sheet_id = sheets["PCB Defect Detection Dataset"]
    labels_data.extend(
        [
            {
                "sheet_id": sheet_id,
                "item_ref": "pcb_001",
                "label_type": "defect_localization",
                "label_data": {
                    "defects": [
                        {
                            "type": "short",
                            "bbox": [120, 45, 135, 60],
                            "confidence": 0.92,
                        },
                        {
                            "type": "open",
                            "bbox": [200, 150, 210, 165],
                            "confidence": 0.88,
                        },
                    ]
                },
                "label_confidence": "verified",
                "data_classification": "confidential",
                "allowed_uses": ["training", "validation", "testing"],
            },
            {
                "sheet_id": sheet_id,
                "item_ref": "pcb_042",
                "label_type": "defect_localization",
                "label_data": {
                    "defects": [
                        {
                            "type": "missing_component",
                            "bbox": [85, 90, 105, 110],
                            "confidence": 0.95,
                        },
                    ]
                },
                "label_confidence": "high",
                "data_classification": "confidential",
                "allowed_uses": ["training", "validation"],
            },
        ]
    )

# 5. Quality Control Photos - Object Detection
if "Quality Control Photos" in sheets:
    sheet_id = sheets["Quality Control Photos"]
    labels_data.extend(
        [
            {
                "sheet_id": sheet_id,
                "item_ref": "photo_789",
                "label_type": "defect_localization",
                "label_data": {
                    "defects": [
                        {
                            "type": "scratch",
                            "bbox": [310, 220, 350, 240],
                            "confidence": 0.89,
                        },
                        {
                            "type": "discoloration",
                            "bbox": [400, 150, 430, 180],
                            "confidence": 0.85,
                        },
                    ]
                },
                "label_confidence": "high",
                "data_classification": "internal",
                "allowed_uses": ["training", "validation", "testing", "production"],
            },
        ]
    )

# Insert labels
print(f"Inserting {len(labels_data)} canonical labels...\n")
now = datetime.utcnow().isoformat()

for i, label in enumerate(labels_data, 1):
    label_id = str(uuid.uuid4())
    label_data_json = json.dumps(label["label_data"])

    # Convert arrays to SQL format
    allowed_uses_sql = (
        "ARRAY(" + ", ".join([f"'{u}'" for u in label.get("allowed_uses", [])]) + ")"
    )
    prohibited_uses_sql = (
        "ARRAY(" + ", ".join([f"'{u}'" for u in label.get("prohibited_uses", [])]) + ")"
        if label.get("prohibited_uses")
        else "ARRAY()"
    )

    sql = f"""
    INSERT INTO `erp-demonstrations`.ontos_ml_workbench.canonical_labels (
        id, sheet_id, item_ref, label_type, label_data, label_confidence,
        labeling_mode, version, reuse_count,
        data_classification, allowed_uses, prohibited_uses,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        '{label_id}',
        '{label["sheet_id"]}',
        '{label["item_ref"]}',
        '{label["label_type"]}',
        PARSE_JSON('{label_data_json}'),
        '{label["label_confidence"]}',
        'standalone_tool',
        1,
        0,
        '{label["data_classification"]}',
        {allowed_uses_sql},
        {prohibited_uses_sql},
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
        print(
            f"✓ {i}/{len(labels_data)}: {label['label_type']:25s} for {label['item_ref']:15s}"
        )
    except Exception as e:
        print(f"✗ {i}/{len(labels_data)}: Failed - {str(e)[:80]}")

print(f"\n✅ Seeding complete!")
print(f"\nVerify with:")
print(
    f"  SELECT label_type, count(*) FROM `erp-demonstrations`.ontos_ml_workbench.canonical_labels GROUP BY label_type;"
)
