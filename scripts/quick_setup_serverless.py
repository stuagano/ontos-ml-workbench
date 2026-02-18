#!/usr/bin/env python3
"""
Quick setup for Ontos ML Workbench.
Creates schema, tables, and seeds sample data.
"""

import os
import sys
import time
from datetime import datetime
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

def execute_sql(client, warehouse_id, sql, description="SQL"):
    """Execute SQL and wait for completion"""
    print(f"Executing: {description}")

    result = client.statement_execution.execute_statement(
        statement=sql,
        warehouse_id=warehouse_id
    )

    # Poll for completion
    for _ in range(60):
        status = client.statement_execution.get_statement(result.statement_id)

        if status.status.state == StatementState.SUCCEEDED:
            print(f"✓ {description}")
            return status
        elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
            error_msg = status.status.error.message if status.status.error else "Unknown error"
            print(f"✗ {description} FAILED: {error_msg}")
            raise Exception(f"SQL failed: {error_msg}")

        time.sleep(1)

    raise TimeoutError(f"SQL timed out: {description}")

def main():
    CATALOG = os.getenv("DATABRICKS_CATALOG", "your_catalog")
    SCHEMA = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")
    WAREHOUSE_ID = os.getenv("DATABRICKS_WAREHOUSE_ID")
    PROFILE = os.getenv("DATABRICKS_CONFIG_PROFILE", "DEFAULT")

    # Initialize client
    client = WorkspaceClient(profile=PROFILE)
    warehouse_id = WAREHOUSE_ID
    catalog_schema = f"{CATALOG}.{SCHEMA}"

    print("=" * 80)
    print("Ontos ML Workbench Quick Setup")
    print("=" * 80)
    print(f"Catalog: {CATALOG}")
    print(f"Schema: {SCHEMA}")
    print(f"Warehouse: {warehouse_id}")
    print("=" * 80)

    # Step 1: Create schema
    print("\n[1/4] Creating schema...")
    execute_sql(client, warehouse_id,
        "CREATE SCHEMA IF NOT EXISTS {catalog_schema}",
        "Create schema")

    # Step 2: Create sheets table
    print("\n[2/4] Creating sheets table...")
    execute_sql(client, warehouse_id, """
        CREATE TABLE IF NOT EXISTS {catalog_schema}.sheets (
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
    """, "Create sheets table")

    # Step 3: Create templates table
    print("\n[3/4] Creating templates table...")
    execute_sql(client, warehouse_id, """
        CREATE TABLE IF NOT EXISTS {catalog_schema}.templates (
          id STRING NOT NULL,
          name STRING NOT NULL,
          description STRING,
          label_type STRING NOT NULL,
          prompt_template STRING NOT NULL,
          input_schema STRING,
          output_schema STRING,
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
    """, "Create templates table")

    # Step 4: Seed sample data
    print("\n[4/4] Seeding sample data...")
    now = datetime.now().isoformat()
    user = client.current_user.me().user_name

    execute_sql(client, warehouse_id, f"""
        INSERT INTO {catalog_schema}.sheets VALUES
        (
          'sheet-defect-001',
          'PCB Defect Detection',
          'Microscope images of PCBs with defect labels',
          'uc_table',
          '{catalog_schema}.sample_defects',
          NULL,
          NULL,
          'image_id',
          ARRAY(),
          ARRAY('image_path'),
          ARRAY('sensor_reading', 'timestamp'),
          'all',
          NULL,
          NULL,
          'active',
          50,
          'Sample defect detection data',
          TIMESTAMP'{now}',
          '{user}',
          TIMESTAMP'{now}',
          '{user}'
        ),
        (
          'sheet-telemetry-001',
          'Radiation Sensor Telemetry',
          'Time-series data from radiation detectors',
          'uc_table',
          '{catalog_schema}.sample_telemetry',
          NULL,
          NULL,
          'sensor_id',
          ARRAY('reading_value', 'status'),
          ARRAY(),
          ARRAY('timestamp', 'location', 'detector_type'),
          'all',
          NULL,
          NULL,
          'active',
          1000,
          'Sample telemetry data',
          TIMESTAMP'{now}',
          '{user}',
          TIMESTAMP'{now}',
          '{user}'
        ),
        (
          'sheet-calibration-001',
          'Calibration Results',
          'Monte Carlo simulation outputs for detector calibration',
          'uc_table',
          '{catalog_schema}.sample_calibration',
          NULL,
          NULL,
          'calibration_id',
          ARRAY('efficiency', 'resolution'),
          ARRAY(),
          ARRAY('timestamp', 'detector_model', 'energy_range'),
          'all',
          NULL,
          NULL,
          'active',
          200,
          'Sample calibration data',
          TIMESTAMP'{now}',
          '{user}',
          TIMESTAMP'{now}',
          '{user}'
        )
    """, "Insert sample sheets")

    execute_sql(client, warehouse_id, f"""
        INSERT INTO {catalog_schema}.templates VALUES
        (
          'tmpl-defect-001',
          'Defect Classification',
          'Classify defects in radiation detector components',
          'defect_classification',
          'Analyze the inspection image and sensor data. Classify any defects found.\\n\\nImage: {{image}}\\nSensor Reading: {{sensor_reading}}\\n\\nProvide: defect_type, severity, recommended_action',
          '{{"type": "object", "properties": {{"image": {{"type": "string"}}, "sensor_reading": {{"type": "number"}}}}}}',
          '{{"type": "object", "properties": {{"defect_type": {{"type": "string"}}, "severity": {{"type": "string"}}, "recommended_action": {{"type": "string"}}}}}}',
          3,
          'gpt-4o',
          0.1,
          'active',
          1,
          'defect_detection',
          'Template for radiation detector defect classification',
          TIMESTAMP'{now}',
          '{user}',
          TIMESTAMP'{now}',
          '{user}'
        ),
        (
          'tmpl-predict-001',
          'Predictive Maintenance',
          'Predict equipment failures from telemetry',
          'failure_prediction',
          'Analyze the sensor telemetry data and predict potential failures.\\n\\nTelemetry: {{telemetry}}\\n\\nProvide: failure_probability, time_to_failure, maintenance_recommendation',
          '{{"type": "object", "properties": {{"telemetry": {{"type": "array"}}}}}}',
          '{{"type": "object", "properties": {{"failure_probability": {{"type": "number"}}, "time_to_failure": {{"type": "string"}}, "maintenance_recommendation": {{"type": "string"}}}}}}',
          5,
          'gpt-4o',
          0.2,
          'active',
          1,
          'predictive_maintenance',
          'Template for equipment failure prediction',
          TIMESTAMP'{now}',
          '{user}',
          TIMESTAMP'{now}',
          '{user}'
        )
    """, "Insert sample templates")

    # Verify
    print("\n" + "=" * 80)
    print("Setup complete! Verifying...")
    print("=" * 80)

    sheets_count = execute_sql(client, warehouse_id,
        "SELECT COUNT(*) as count FROM {catalog_schema}.sheets",
        "Count sheets")

    templates_count = execute_sql(client, warehouse_id,
        "SELECT COUNT(*) as count FROM {catalog_schema}.templates",
        "Count templates")

    print("\n✅ Setup complete!")
    print(f"   - Catalog.Schema: {catalog_schema}")
    print(f"   - Sheets: 3 sample sheets")
    print(f"   - Templates: 2 sample templates")
    print("\n🚀 Backend server is ready. Restart if it's already running.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Setup failed: {e}", file=sys.stderr)
        sys.exit(1)
