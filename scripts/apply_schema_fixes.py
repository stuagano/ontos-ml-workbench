#!/usr/bin/env python3
"""
Apply schema fixes for Monitor stage
Executes fix_monitor_schema.sql via Databricks SDK
"""

import os
import sys
from pathlib import Path
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent / "backend"))

def main():
    print("=" * 70)
    print("Ontos ML Workbench - Schema Fixes")
    print("=" * 70)
    print()

    # Read SQL file
    sql_file = Path(__file__).parent.parent / "schemas" / "fix_monitor_schema.sql"
    print(f"📄 Reading SQL from: {sql_file}")

    if not sql_file.exists():
        print(f"❌ Error: SQL file not found: {sql_file}")
        return 1

    with open(sql_file) as f:
        sql_content = f.read()

    print(f"✅ SQL file loaded ({len(sql_content)} bytes)")
    print()

    # Get configuration from environment
    warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID", "your-warehouse-id")
    catalog = os.getenv("DATABRICKS_CATALOG", "your_catalog")
    schema = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")

    print(f"🔧 Configuration:")
    print(f"   Warehouse: {warehouse_id}")
    print(f"   Catalog:   {catalog}")
    print(f"   Schema:    {schema}")
    print()

    # Initialize Databricks SDK
    print("🔌 Connecting to Databricks...")
    try:
        w = WorkspaceClient()
        print("✅ Connected successfully")
        print()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return 1

    # Execute SQL
    print("🚀 Executing SQL fixes...")
    print("-" * 70)

    try:
        # Execute the SQL statement
        response = w.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=sql_content,
            catalog=catalog,
            schema=schema,
            wait_timeout="50s"
        )

        # Check status
        if response.status.state == StatementState.SUCCEEDED:
            print("✅ SQL execution succeeded!")
            print()

            # Show results if available
            if response.result and response.result.data_array:
                print("📊 Results:")
                for i, row in enumerate(response.result.data_array[:10]):
                    print(f"   Row {i+1}: {row}")
                print()

            print("=" * 70)
            print("✅ SCHEMA FIXES APPLIED SUCCESSFULLY")
            print("=" * 70)
            print()
            print("Changes made:")
            print("  ✅ monitor_alerts table created")
            print("  ✅ feedback_items.flagged column added")
            print()
            print("Next step: Restart backend server")
            print("  cd backend && uvicorn app.main:app --reload")
            print()
            return 0

        else:
            print(f"⚠️  Statement state: {response.status.state}")
            if response.status.error:
                print(f"❌ Error: {response.status.error.message}")
            return 1

    except Exception as e:
        print(f"❌ Execution failed: {e}")
        print()
        print("📝 Manual execution option:")
        print("   1. Open Databricks SQL Editor")
        print("   2. Copy contents of: schemas/fix_monitor_schema.sql")
        print("   3. Paste and run in SQL Editor")
        return 1

if __name__ == "__main__":
    sys.exit(main())
