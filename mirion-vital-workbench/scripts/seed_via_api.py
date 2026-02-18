#!/usr/bin/env python3
"""Seed demo data via Databricks SQL Statement Execution API."""

import json
import os
import time

import requests
from databricks.sdk import WorkspaceClient

# Configuration
CATALOG = "erp-demonstrations"
SCHEMA = "ontos_ml_workbench"


def get_client():
    """Get Databricks workspace client."""
    return WorkspaceClient(
        profile=os.environ.get("DATABRICKS_CONFIG_PROFILE", "fe-vm-serverless-dxukih")
    )


def execute_sql(client, warehouse_id: str, sql: str):
    """Execute SQL statement and wait for completion."""
    response = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id, statement=sql, wait_timeout="30s"
    )
    if response.status.state.value == "FAILED":
        print(f"  ERROR: {response.status.error}")
        return False
    return True


def seed_templates(client, warehouse_id: str):
    """Seed prompt templates."""
    templates = [
        {
            "id": "tpl-sensor-anomaly-001",
            "name": "Sensor Anomaly Detection",
            "description": "Classify sensor readings as normal, warning, or critical",
            "version": "1.0.0",
            "status": "published",
            "system_prompt": "You are an expert industrial IoT analyst. Analyze sensor readings and classify equipment status based on temperature (normal: 65-85F, warning: 90-100F, critical: >100F) and humidity (normal: 40-60%).",
            "prompt_template": "Analyze: Sensor {{sensor_id}}, Temp {{temperature}}F, Humidity {{humidity}}%, Status: {{status}}. Respond with JSON: classification, confidence, anomaly_detected, reasoning.",
            "input_schema": json.dumps(
                [
                    {"name": "sensor_id", "type": "string"},
                    {"name": "temperature", "type": "number"},
                    {"name": "humidity", "type": "number"},
                    {"name": "status", "type": "string"},
                ]
            ),
            "output_schema": json.dumps(
                [
                    {"name": "classification", "type": "string"},
                    {"name": "confidence", "type": "number"},
                    {"name": "anomaly_detected", "type": "boolean"},
                    {"name": "reasoning", "type": "string"},
                ]
            ),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": 0.3,
            "max_tokens": 512,
        },
        {
            "id": "tpl-defect-class-001",
            "name": "Defect Classification",
            "description": "Classify manufacturing defects by type and severity",
            "version": "1.0.0",
            "status": "published",
            "system_prompt": "You are a quality control expert. Classify defects: cosmetic, structural, dimensional, functional, or none. Severity: none, minor, major, critical.",
            "prompt_template": "Classify: Product {{product_id}}, Notes: {{inspection_notes}}. Respond with JSON: defect_type, severity, confidence, reasoning, rework_required.",
            "input_schema": json.dumps(
                [
                    {"name": "product_id", "type": "string"},
                    {"name": "inspection_notes", "type": "string"},
                ]
            ),
            "output_schema": json.dumps(
                [
                    {"name": "defect_type", "type": "string"},
                    {"name": "severity", "type": "string"},
                    {"name": "confidence", "type": "number"},
                    {"name": "reasoning", "type": "string"},
                    {"name": "rework_required", "type": "boolean"},
                ]
            ),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": 0.2,
            "max_tokens": 512,
        },
        {
            "id": "tpl-pred-maint-001",
            "name": "Predictive Maintenance",
            "description": "Predict equipment failures from telemetry",
            "version": "1.0.0",
            "status": "draft",
            "system_prompt": "You are a predictive maintenance AI. Analyze equipment telemetry to predict failures.",
            "prompt_template": "Analyze: Equipment {{equipment_id}} ({{equipment_type}}), Hours: {{operating_hours}}, Last maintenance: {{last_maintenance_date}}, Temp: {{current_temp}}F",
            "input_schema": json.dumps(
                [
                    {"name": "equipment_id", "type": "string"},
                    {"name": "equipment_type", "type": "string"},
                    {"name": "operating_hours", "type": "number"},
                    {"name": "last_maintenance_date", "type": "string"},
                    {"name": "current_temp", "type": "number"},
                ]
            ),
            "output_schema": json.dumps(
                [
                    {"name": "failure_probability_30d", "type": "number"},
                    {"name": "recommended_action", "type": "string"},
                    {"name": "reasoning", "type": "string"},
                ]
            ),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": 0.4,
            "max_tokens": 768,
        },
    ]

    for t in templates:
        sql = f"""
        INSERT INTO `{CATALOG}`.`{SCHEMA}`.templates
        (id, name, description, version, status, system_prompt, prompt_template, input_schema, output_schema, base_model, temperature, max_tokens, created_by, created_at, updated_at)
        SELECT '{t["id"]}', '{t["name"]}', '{t["description"]}', '{t["version"]}', '{t["status"]}',
               '{t["system_prompt"].replace("'", "''")}', '{t["prompt_template"].replace("'", "''")}',
               '{t["input_schema"]}', '{t["output_schema"]}',
               '{t["base_model"]}', {t["temperature"]}, {t["max_tokens"]},
               'bootstrap', current_timestamp(), current_timestamp()
        WHERE NOT EXISTS (SELECT 1 FROM `{CATALOG}`.`{SCHEMA}`.templates WHERE id = '{t["id"]}')
        """
        print(f"  Inserting template: {t['name']}...")
        execute_sql(client, warehouse_id, sql)


def seed_curation_items(client, warehouse_id: str):
    """Seed curation items."""
    items = [
        {
            "id": "curation-sensor-001",
            "template_id": "tpl-sensor-anomaly-001",
            "input_data": '{"sensor_id": "SENSOR-002", "temperature": 185.3, "humidity": 12.1, "status": "critical"}',
            "original_output": '{"classification": "critical", "confidence": 0.95, "anomaly_detected": true, "reasoning": "Temperature exceeds critical threshold"}',
            "status": "pending",
            "confidence_score": 0.95,
        },
        {
            "id": "curation-sensor-002",
            "template_id": "tpl-sensor-anomaly-001",
            "input_data": '{"sensor_id": "SENSOR-001", "temperature": 72.5, "humidity": 45.2, "status": "normal"}',
            "original_output": '{"classification": "normal", "confidence": 0.98, "anomaly_detected": false, "reasoning": "All readings normal"}',
            "status": "approved",
            "confidence_score": 0.98,
        },
        {
            "id": "curation-defect-001",
            "template_id": "tpl-defect-class-001",
            "input_data": '{"product_id": "PRD-2024-002", "inspection_notes": "Weld joint incomplete"}',
            "original_output": '{"defect_type": "structural", "severity": "critical", "confidence": 0.94, "reasoning": "Incomplete weld affects integrity", "rework_required": true}',
            "status": "pending",
            "confidence_score": 0.94,
        },
    ]

    for item in items:
        curated = item["original_output"] if item["status"] == "approved" else "NULL"
        curated_sql = f"'{curated}'" if curated != "NULL" else "NULL"

        sql = f"""
        INSERT INTO `{CATALOG}`.`{SCHEMA}`.curation_items
        (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
        SELECT '{item["id"]}', '{item["template_id"]}',
               '{item["input_data"].replace("'", "''")}', '{item["original_output"].replace("'", "''")}',
               {curated_sql}, '{item["status"]}', {item["confidence_score"]},
               'bootstrap', current_timestamp(), current_timestamp()
        WHERE NOT EXISTS (SELECT 1 FROM `{CATALOG}`.`{SCHEMA}`.curation_items WHERE id = '{item["id"]}')
        """
        print(f"  Inserting curation item: {item['id']}...")
        execute_sql(client, warehouse_id, sql)


def create_schema_and_tables(client, warehouse_id: str):
    """Create schema and all required tables."""
    # Create schema
    print(f"  Creating schema {CATALOG}.{SCHEMA}...")
    execute_sql(
        client, warehouse_id, f"CREATE SCHEMA IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`"
    )

    tables = {
        "templates": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.templates (
                id STRING, name STRING, description STRING, version STRING, status STRING,
                input_schema STRING, output_schema STRING, prompt_template STRING, system_prompt STRING,
                examples STRING, base_model STRING, temperature DOUBLE, max_tokens INT,
                source_catalog STRING, source_schema STRING, source_table STRING, source_volume STRING,
                created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "sheets": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.sheets (
                id STRING, name STRING, description STRING, status STRING,
                columns STRING, row_data STRING, created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "curation_items": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.curation_items (
                id STRING, template_id STRING, input_data STRING, original_output STRING,
                curated_output STRING, status STRING, confidence_score DOUBLE,
                review_notes STRING, created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "job_runs": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.job_runs (
                id STRING, job_type STRING, status STRING, config STRING,
                template_id STRING, model_id STRING, endpoint_id STRING,
                result STRING, error_message STRING, started_at TIMESTAMP, completed_at TIMESTAMP,
                created_by STRING, created_at TIMESTAMP
            )
        """,
        "endpoints_registry": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.endpoints_registry (
                id STRING, name STRING, description STRING, endpoint_type STRING, endpoint_name STRING,
                model_name STRING, model_version STRING, status STRING, config STRING,
                created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "feedback_items": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.feedback_items (
                id STRING, endpoint_id STRING, input_text STRING, output_text STRING,
                rating STRING, feedback_text STRING, session_id STRING, request_id STRING,
                created_by STRING, created_at TIMESTAMP
            )
        """,
        "labeling_jobs": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.labeling_jobs (
                id STRING, name STRING, description STRING, sheet_id STRING, status STRING,
                config STRING, created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "labeling_tasks": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.labeling_tasks (
                id STRING, job_id STRING, status STRING, assigned_to STRING, priority INT,
                item_count INT, completed_count INT, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "labeled_items": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.labeled_items (
                id STRING, task_id STRING, item_index INT, input_data STRING, labels STRING,
                status STRING, labeled_by STRING, labeled_at TIMESTAMP, created_at TIMESTAMP
            )
        """,
        "tools_registry": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.tools_registry (
                id STRING, name STRING, description STRING, tool_type STRING, config STRING,
                status STRING, created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "workspace_users": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.workspace_users (
                id STRING, email STRING, display_name STRING, role STRING, is_active BOOLEAN,
                config STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
        "agents_registry": f"""
            CREATE TABLE IF NOT EXISTS `{CATALOG}`.`{SCHEMA}`.agents_registry (
                id STRING, name STRING, description STRING, agent_type STRING, config STRING,
                tools STRING, status STRING, created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
            )
        """,
    }

    for name, sql in tables.items():
        print(f"  Creating table: {name}...")
        execute_sql(client, warehouse_id, sql)


def seed_sheets(client, warehouse_id: str):
    """Seed sample sheets."""
    sheets = [
        {
            "id": "sample-sensor-sheet-001",
            "name": "Sensor Monitoring Data",
            "description": "Sample IoT sensor readings for anomaly detection demo",
            "columns": '[{"id":"col-1","name":"sensor_id","data_type":"string","source_type":"imported"},{"id":"col-2","name":"temperature","data_type":"number","source_type":"imported"},{"id":"col-3","name":"humidity","data_type":"number","source_type":"imported"},{"id":"col-4","name":"status","data_type":"string","source_type":"imported"}]',
            "row_data": '[{"row_index":0,"cells":{"col-1":{"value":"SENSOR-001"},"col-2":{"value":72.5},"col-3":{"value":45.2},"col-4":{"value":"normal"}}},{"row_index":1,"cells":{"col-1":{"value":"SENSOR-002"},"col-2":{"value":185.3},"col-3":{"value":12.1},"col-4":{"value":"critical"}}},{"row_index":2,"cells":{"col-1":{"value":"SENSOR-003"},"col-2":{"value":68.9},"col-3":{"value":52.7},"col-4":{"value":"normal"}}},{"row_index":3,"cells":{"col-1":{"value":"SENSOR-004"},"col-2":{"value":98.2},"col-3":{"value":78.4},"col-4":{"value":"warning"}}}]',
        },
        {
            "id": "sample-defect-sheet-001",
            "name": "Manufacturing Defect Data",
            "description": "Product quality inspection data for defect classification",
            "columns": '[{"id":"col-1","name":"product_id","data_type":"string","source_type":"imported"},{"id":"col-2","name":"inspection_notes","data_type":"string","source_type":"imported"},{"id":"col-3","name":"defect_type","data_type":"string","source_type":"imported"},{"id":"col-4","name":"severity","data_type":"string","source_type":"imported"}]',
            "row_data": '[{"row_index":0,"cells":{"col-1":{"value":"PRD-2024-001"},"col-2":{"value":"Surface scratch visible on left panel"},"col-3":{"value":"cosmetic"},"col-4":{"value":"minor"}}},{"row_index":1,"cells":{"col-1":{"value":"PRD-2024-002"},"col-2":{"value":"Weld joint incomplete, structural integrity compromised"},"col-3":{"value":"structural"},"col-4":{"value":"critical"}}},{"row_index":2,"cells":{"col-1":{"value":"PRD-2024-003"},"col-2":{"value":"No defects found, passed all inspections"},"col-3":{"value":"none"},"col-4":{"value":"none"}}}]',
        },
    ]

    for s in sheets:
        sql = f"""
        INSERT INTO `{CATALOG}`.`{SCHEMA}`.sheets
        (id, name, description, status, columns, row_data, created_by, created_at, updated_at)
        SELECT '{s["id"]}', '{s["name"]}', '{s["description"]}', 'draft',
               '{s["columns"].replace("'", "''")}', '{s["row_data"].replace("'", "''")}',
               'bootstrap', current_timestamp(), current_timestamp()
        WHERE NOT EXISTS (SELECT 1 FROM `{CATALOG}`.`{SCHEMA}`.sheets WHERE id = '{s["id"]}')
        """
        print(f"  Inserting sheet: {s['name']}...")
        execute_sql(client, warehouse_id, sql)


def main():
    print("Seeding Ontos ML Workbench demo data...")

    client = get_client()

    # Get warehouse ID
    warehouses = list(client.warehouses.list())
    if not warehouses:
        print("ERROR: No SQL warehouse found")
        return

    warehouse_id = warehouses[0].id
    print(f"Using warehouse: {warehouses[0].name} ({warehouse_id})")

    print("\n1. Creating schema and tables...")
    create_schema_and_tables(client, warehouse_id)

    print("\n2. Seeding sheets...")
    seed_sheets(client, warehouse_id)

    print("\n3. Seeding templates...")
    seed_templates(client, warehouse_id)

    print("\n4. Seeding curation items...")
    seed_curation_items(client, warehouse_id)

    # Verify
    print("\n3. Verifying data...")
    result = client.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=f"SELECT 'templates' as tbl, COUNT(*) as cnt FROM `{CATALOG}`.`{SCHEMA}`.templates UNION ALL SELECT 'sheets', COUNT(*) FROM `{CATALOG}`.`{SCHEMA}`.sheets UNION ALL SELECT 'curation_items', COUNT(*) FROM `{CATALOG}`.`{SCHEMA}`.curation_items",
        wait_timeout="30s",
    )

    if result.result and result.result.data_array:
        print("\nData counts:")
        for row in result.result.data_array:
            print(f"  {row[0]}: {row[1]}")

    print("\n✅ Demo data seeded successfully!")


if __name__ == "__main__":
    main()
