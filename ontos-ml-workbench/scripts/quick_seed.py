#!/usr/bin/env python3
"""Quick seed script - adds minimal sample data"""

import sys
from datetime import datetime
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState
import time

def exec_sql(client, warehouse_id, sql):
    result = client.statement_execution.execute_statement(
        statement=sql, warehouse_id=warehouse_id
    )
    for _ in range(30):
        status = client.statement_execution.get_statement(result.statement_id)
        if status.status.state == StatementState.SUCCEEDED:
            return True
        elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
            error = status.status.error.message if status.status.error else "Unknown error"
            print(f"Error: {error}")
            return False
        time.sleep(1)
    return False

client = WorkspaceClient(profile="fe-vm-serverless-dxukih")
warehouse_id = "387bcda0f2ece20c"
now = datetime.now().isoformat()
user = "stuart.gano@databricks.com"

print("Seeding sheets...")
success = exec_sql(client, warehouse_id, f"""
INSERT INTO serverless_dxukih_catalog.mirion.sheets (
  id, name, description, source_type, source_table, source_volume, source_path,
  item_id_column, text_columns, image_columns, metadata_columns,
  sampling_strategy, sample_size, sample_seed, status, item_count, notes,
  created_at, created_by, updated_at, updated_by
) VALUES
('sheet-001', 'Defect Detection Data', 'Inspection images with defect labels',
 'uc_table', 'serverless_dxukih_catalog.mirion.sample_defects', NULL, NULL,
 'image_id', ARRAY(), ARRAY('image_path'), ARRAY('sensor_reading', 'timestamp'),
 'all', NULL, NULL, 'active', 50, 'Sample data',
 TIMESTAMP'{now}', '{user}', TIMESTAMP'{now}', '{user}'),
('sheet-002', 'Sensor Telemetry', 'Radiation detector time-series data',
 'uc_table', 'serverless_dxukih_catalog.mirion.sample_telemetry', NULL, NULL,
 'sensor_id', ARRAY('reading_value', 'status'), ARRAY(), ARRAY('timestamp', 'location'),
 'all', NULL, NULL, 'active', 1000, 'Sample data',
 TIMESTAMP'{now}', '{user}', TIMESTAMP'{now}', '{user}'),
('sheet-003', 'Calibration Results', 'Monte Carlo simulation outputs',
 'uc_table', 'serverless_dxukih_catalog.mirion.sample_calibration', NULL, NULL,
 'calibration_id', ARRAY('efficiency', 'resolution'), ARRAY(), ARRAY('detector_model'),
 'all', NULL, NULL, 'active', 200, 'Sample data',
 TIMESTAMP'{now}', '{user}', TIMESTAMP'{now}', '{user}')
""")

if success:
    print("✅ Sheets seeded!")

    print("Seeding templates...")
    success = exec_sql(client, warehouse_id, f"""
    INSERT INTO serverless_dxukih_catalog.mirion.templates (
      id, name, description, label_type, prompt_template, input_schema, output_schema,
      few_shot_count, model_name, temperature, status, version, use_case, notes,
      created_at, created_by, updated_at, updated_by
    ) VALUES
    ('tmpl-001', 'Defect Classification', 'Classify defects in detector components',
     'defect_classification', 'Analyze the inspection data and classify defects.',
     NULL, NULL, 3, 'gpt-4o', 0.1, 'active', 1, 'defect_detection', 'Sample template',
     TIMESTAMP'{now}', '{user}', TIMESTAMP'{now}', '{user}'),
    ('tmpl-002', 'Predictive Maintenance', 'Predict equipment failures',
     'failure_prediction', 'Analyze telemetry and predict failures.',
     NULL, NULL, 5, 'gpt-4o', 0.2, 'active', 1, 'predictive_maintenance', 'Sample template',
     TIMESTAMP'{now}', '{user}', TIMESTAMP'{now}', '{user}')
    """)

    if success:
        print("✅ Templates seeded!")
        print("\n🎉 Database ready! Start the frontend to see the data.")
    else:
        print("❌ Templates seed failed")
        sys.exit(1)
else:
    print("❌ Sheets seed failed")
    sys.exit(1)
