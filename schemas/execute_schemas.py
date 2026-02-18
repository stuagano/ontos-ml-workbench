#!/usr/bin/env python3
"""
Execute all Ontos ML Workbench schemas in Unity Catalog
Uses Databricks SDK to run SQL files in order
"""
import sys
from pathlib import Path
from databricks.sdk import WorkspaceClient


# SQL files in execution order
SQL_FILES = [
    "01_create_catalog.sql",
    "02_sheets.sql",
    "03_templates.sql",
    "04_canonical_labels.sql",
    "05_training_sheets.sql",
    "06_qa_pairs.sql",
    "07_model_training_lineage.sql",
    "08_example_store.sql",
    "99_validate_and_seed.sql",
]


def execute_sql_file(w: WorkspaceClient, warehouse_id: str, sql_file: Path) -> None:
    """Execute a SQL file using Databricks SQL Warehouse"""
    print(f"📄 Executing: {sql_file.name}")

    # Read SQL content
    sql_content = sql_file.read_text()

    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

    for i, statement in enumerate(statements, 1):
        if not statement or statement.isspace():
            continue

        try:
            # Execute using SQL warehouse
            result = w.statement_execution.execute_statement(
                statement=statement,
                warehouse_id=warehouse_id,
            )

            # Check for errors
            if result.status.state == "FAILED":
                print(f"   ❌ Statement {i} failed: {result.status.error}")
                sys.exit(1)

        except Exception as e:
            print(f"   ❌ Error executing statement {i}: {e}")
            print(f"   Statement: {statement[:100]}...")
            sys.exit(1)

    print(f"   ✅ Success ({len(statements)} statements)")


def main():
    print("🚀 Creating Ontos ML Workbench schema in Unity Catalog...\n")

    # Initialize Databricks client
    try:
        w = WorkspaceClient()
        print("✅ Connected to Databricks workspace\n")
    except Exception as e:
        print(f"❌ Failed to connect to Databricks: {e}")
        print("   Make sure you have run: databricks auth login")
        sys.exit(1)

    # Get warehouse ID from environment or use default
    import os
    warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID")

    if not warehouse_id:
        # Try to find a SQL warehouse
        warehouses = list(w.warehouses.list())
        if not warehouses:
            print("❌ No SQL warehouses found in workspace")
            print("   Please create a SQL warehouse or set DATABRICKS_WAREHOUSE_ID")
            sys.exit(1)

        # Use first available warehouse
        warehouse_id = warehouses[0].id
        print(f"ℹ️  Using SQL warehouse: {warehouses[0].name} ({warehouse_id})\n")

    # Execute each SQL file
    schemas_dir = Path(__file__).parent

    for sql_file_name in SQL_FILES:
        sql_file = schemas_dir / sql_file_name

        if not sql_file.exists():
            print(f"❌ File not found: {sql_file_name}")
            sys.exit(1)

        execute_sql_file(w, warehouse_id, sql_file)
        print()

    print("🎉 All schemas created successfully!\n")

    # Verify tables were created
    print("🔍 Verifying tables...")
    try:
        # Check if schema exists
        schema = w.schemas.get("home_stuart_gano.ontos_ml_workbench")
        print(f"   ✅ Schema: {schema.full_name}")

        # List tables
        tables = list(w.tables.list("home_stuart_gano", "ontos_ml_workbench"))
        print(f"   ✅ Tables created: {len(tables)}")
        for table in tables:
            print(f"      - {table.name}")

    except Exception as e:
        print(f"   ⚠️  Could not verify: {e}")

    print("\n" + "="*60)
    print("Next steps:")
    print("  1. Verify seed data: databricks workspace export-dir ...")
    print("  2. Test composite key constraint")
    print("  3. Start Task #3: Sheet Management API")
    print("="*60)


if __name__ == "__main__":
    main()
