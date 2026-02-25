#!/usr/bin/env python3
"""Execute all SQL schema files to create Delta tables in Unity Catalog."""

import sys
import os
from pathlib import Path
from databricks.sdk import WorkspaceClient

# SQL files in execution order
SQL_FILES = [
    "00_create_catalog.sql",
    "01_sheets.sql",
    "02_templates.sql",
    "03_canonical_labels.sql",
    "04_training_sheets.sql",
    "05_qa_pairs.sql",
    "06_model_training_lineage.sql",
    "07_example_store.sql",
    "08_labeling_jobs.sql",
    "09_labeling_tasks.sql",
    "10_labeled_items.sql",
    "11_model_evaluations.sql",
    "12_identified_gaps.sql",
    "13_annotation_tasks.sql",
    "14_bit_attribution.sql",
    "15_dqx_quality_results.sql",
    "16_endpoint_metrics.sql",
    "17_app_roles.sql",
    "18_user_role_assignments.sql",
    "19_teams.sql",
    "20_team_members.sql",
    "21_data_domains.sql",
    "22_asset_reviews.sql",
    "23_projects.sql",
    "24_project_members.sql",
    "25_data_contracts.sql",
    "26_compliance_policies.sql",
    "27_workflows.sql",
    "28_data_products.sql",
    "29_semantic_models.sql",
    "30_naming_conventions.sql",
    "31_delivery_modes.sql",
    "32_mcp_integration.sql",
    "33_platform_connectors.sql",
]

def main():
    print("🚀 Creating Ontos ML Workbench schema in Unity Catalog...")
    print()

    # Get workspace client
    client = WorkspaceClient()

    # Get warehouse
    warehouses = list(client.warehouses.list())
    if not warehouses:
        print("❌ No SQL warehouses found")
        sys.exit(1)

    warehouse_id = warehouses[0].id
    print(f"📊 Using warehouse: {warehouse_id}")
    print()

    # Get script directory
    script_dir = Path(__file__).parent

    # Execute each SQL file
    for sql_file in SQL_FILES:
        print(f"📄 Executing: {sql_file}")

        sql_path = script_dir / sql_file
        if not sql_path.exists():
            print(f"   ⚠️  File not found: {sql_path}")
            continue

        try:
            sql_content = sql_path.read_text()

            # Substitute catalog and schema variables
            catalog = os.getenv("DATABRICKS_CATALOG", "serverless_dxukih_catalog")
            schema = os.getenv("DATABRICKS_SCHEMA", "ontos_ml")
            sql_content = sql_content.replace("${CATALOG}", catalog)
            sql_content = sql_content.replace("${SCHEMA}", schema)

            # Execute SQL using statement execution API
            response = client.statement_execution.execute_statement(
                warehouse_id=warehouse_id,
                statement=sql_content,
                wait_timeout="30s"
            )

            print(f"   ✅ Success")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            # Continue with other files even if one fails

        print()

    print("🎉 Schema execution complete!")

if __name__ == "__main__":
    main()
