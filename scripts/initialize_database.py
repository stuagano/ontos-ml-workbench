#!/usr/bin/env python3
"""Initialize Ontos ML Workbench database schema and seed data."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load backend .env file
backend_path = Path(__file__).parent.parent / "backend"
env_file = backend_path / ".env"
if env_file.exists():
    print(f"Loading environment from: {env_file}")
    load_dotenv(env_file)

# Add backend to path
sys.path.insert(0, str(backend_path))

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState


def execute_sql(w: WorkspaceClient, warehouse_id: str, sql: str, description: str):
    """Execute a single SQL statement."""
    print(f"\n{description}...")
    print(f"SQL: {sql[:200]}...")

    try:
        response = w.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=sql,
            wait_timeout="50s"
        )

        if response.status.state == StatementState.SUCCEEDED:
            print(f"✓ {description} succeeded")
            if response.result and response.result.data_array:
                print(f"  Rows: {len(response.result.data_array)}")
                return response.result.data_array
            return []
        else:
            print(f"✗ {description} failed: {response.status.state}")
            if response.status.error:
                print(f"  Error: {response.status.error.message}")
            return None

    except Exception as e:
        print(f"✗ Error: {e}")
        return None


def main():
    """Main execution."""
    # Load backend config
    from app.core.config import get_settings
    settings = get_settings()

    print("=" * 80)
    print("Ontos ML Workbench - Database Initialization")
    print("=" * 80)
    print(f"Workspace: {settings.databricks_host}")
    print(f"Catalog: {settings.databricks_catalog}")
    print(f"Schema: {settings.databricks_schema}")
    print(f"Warehouse: {settings.databricks_warehouse_id}")
    print("=" * 80)

    # Initialize Databricks client
    w = WorkspaceClient(
        host=settings.databricks_host,
        profile=settings.databricks_config_profile
    )

    catalog = settings.databricks_catalog
    schema = settings.databricks_schema

    # Step 1: Create catalog if it doesn't exist
    execute_sql(w, settings.databricks_warehouse_id,
                f"CREATE CATALOG IF NOT EXISTS `{catalog}`",
                "Creating catalog")

    # Step 2: Create schema if it doesn't exist
    execute_sql(w, settings.databricks_warehouse_id,
                f"CREATE SCHEMA IF NOT EXISTS `{catalog}`.`{schema}`",
                "Creating schema")

    # Step 3: Use the schema
    execute_sql(w, settings.databricks_warehouse_id,
                f"USE CATALOG `{catalog}`",
                "Using catalog")

    execute_sql(w, settings.databricks_warehouse_id,
                f"USE SCHEMA `{schema}`",
                "Using schema")

    # Step 4: Create sheets table
    sheets_ddl = """
    CREATE TABLE IF NOT EXISTS sheets (
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
      sampling_strategy STRING,
      sample_size INT,
      filter_expression STRING,
      status STRING DEFAULT 'draft',
      item_count INT,
      last_validated_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      created_by STRING NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      updated_by STRING NOT NULL,
      CONSTRAINT sheets_pk PRIMARY KEY(id)
    ) USING DELTA
    TBLPROPERTIES (
      'delta.enableChangeDataFeed' = 'true',
      'delta.minReaderVersion' = '2',
      'delta.minWriterVersion' = '5'
    )
    """

    execute_sql(w, settings.databricks_warehouse_id, sheets_ddl, "Creating sheets table")

    # Step 5: Seed sample data
    print("\n" + "=" * 80)
    print("Seeding sample data...")
    print("=" * 80)

    seed_sql = f"""
    INSERT INTO `{catalog}`.`{schema}`.sheets (
      id, name, description, source_type, source_table, source_volume, source_path,
      item_id_column, text_columns, image_columns, metadata_columns,
      sampling_strategy, sample_size, filter_expression, status, item_count,
      last_validated_at, created_at, created_by, updated_at, updated_by
    ) VALUES
    ('sheet-pcb-defects-001',
     'PCB Defect Detection Dataset',
     'Microscope images of PCBs with labeled defects for computer vision training',
     'uc_volume', NULL, '/Volumes/{catalog}/{schema}/pcb_images', 'defect_images/',
     'image_filename', ARRAY(), ARRAY('image_path'),
     ARRAY('sensor_reading', 'timestamp', 'station_id', 'shift'),
     'all', NULL, NULL, 'active', 150, NULL,
     CURRENT_TIMESTAMP(), 'admin@example.com',
     CURRENT_TIMESTAMP(), 'admin@example.com'),

    ('sheet-sensor-telemetry-001',
     'Radiation Sensor Telemetry',
     'Time-series sensor data from radiation detectors for anomaly detection',
     'uc_table', '{catalog}.{schema}.sensor_readings', NULL, NULL,
     'reading_id', ARRAY('notes', 'alert_message'), ARRAY(),
     ARRAY('sensor_id', 'location', 'timestamp', 'calibration_date', 'reading_value'),
     'random', 1000, 'status = "active" AND reading_value > 0', 'active', 5000, NULL,
     CURRENT_TIMESTAMP(), 'admin@example.com',
     CURRENT_TIMESTAMP(), 'admin@example.com'),

    ('sheet-medical-invoices-001',
     'Medical Invoice Entity Extraction',
     'Healthcare billing invoices (PDFs + structured data) for entity extraction',
     'uc_table', '{catalog}.{schema}.parsed_invoices', NULL, NULL,
     'invoice_id', ARRAY('invoice_text', 'patient_notes'), ARRAY('pdf_path'),
     ARRAY('invoice_date', 'total_amount', 'patient_id', 'provider_id'),
     'stratified', 500, 'invoice_date >= "2024-01-01"', 'active', 2500, NULL,
     CURRENT_TIMESTAMP(), 'admin@example.com',
     CURRENT_TIMESTAMP(), 'admin@example.com'),

    ('sheet-maintenance-logs-001',
     'Equipment Maintenance Logs',
     'Service records and maintenance notes for predictive maintenance',
     'uc_table', '{catalog}.{schema}.maintenance_logs', NULL, NULL,
     'log_id', ARRAY('technician_notes', 'issue_description', 'resolution'), ARRAY(),
     ARRAY('equipment_id', 'service_date', 'downtime_hours', 'parts_replaced'),
     'all', NULL, NULL, 'active', 1200, NULL,
     CURRENT_TIMESTAMP(), 'admin@example.com',
     CURRENT_TIMESTAMP(), 'admin@example.com'),

    ('sheet-qc-inspections-001',
     'Quality Control Inspection Photos',
     'Final product inspection images from manufacturing line',
     'uc_volume', NULL, '/Volumes/{catalog}/{schema}/qc_images', 'inspections/',
     'inspection_id', ARRAY(), ARRAY('photo_path'),
     ARRAY('product_sku', 'line_number', 'inspector_id', 'timestamp', 'passed'),
     'all', NULL, NULL, 'active', 800, NULL,
     CURRENT_TIMESTAMP(), 'admin@example.com',
     CURRENT_TIMESTAMP(), 'admin@example.com')
    """

    execute_sql(w, settings.databricks_warehouse_id, seed_sql, "Inserting sample sheets")

    # Step 6: Verify data
    verify_sql = f"SELECT id, name, source_type, status, item_count FROM `{catalog}`.`{schema}`.sheets ORDER BY created_at DESC"
    results = execute_sql(w, settings.databricks_warehouse_id, verify_sql, "Verifying seeded data")

    if results:
        print("\n" + "=" * 80)
        print("Seeded Sheets:")
        print("=" * 80)
        for row in results:
            print(f"  {row}")

    print("\n" + "=" * 80)
    print("✓ Database initialization completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    main()
