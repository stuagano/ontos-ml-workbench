#!/usr/bin/env python3
"""
Seed sheets table with sample data via Databricks SDK
"""
import os
import sys
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Configuration
WAREHOUSE_ID = "387bcda0f2ece20c"
CATALOG = "erp-demonstrations"
SCHEMA = "vital_workbench"

def main():
    # Initialize Databricks client using profile from environment
    profile = os.getenv("DATABRICKS_CONFIG_PROFILE", "fe-vm-serverless-dxukih")
    w = WorkspaceClient(profile=profile)

    print(f"Connected to Databricks workspace")
    print(f"Using warehouse: {WAREHOUSE_ID}")
    print(f"Target: {CATALOG}.{SCHEMA}.sheets")
    print()

    # Read SQL file
    sql_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "schemas",
        "seed_sheets.sql"
    )

    with open(sql_file, 'r') as f:
        sql_content = f.read()

    # Split into individual statements (simple split on semicolon)
    # Filter out empty statements and comments-only statements
    statements = [
        s.strip()
        for s in sql_content.split(';')
        if s.strip() and not s.strip().startswith('--')
    ]

    print(f"Executing {len(statements)} SQL statements...")
    print()

    for i, statement in enumerate(statements, 1):
        # Skip pure comment lines
        if all(line.strip().startswith('--') or not line.strip()
               for line in statement.split('\n')):
            continue

        print(f"[{i}/{len(statements)}] Executing statement...")
        print(f"Statement preview: {statement[:100]}...")

        try:
            # Execute statement
            result = w.statement_execution.execute_statement(
                warehouse_id=WAREHOUSE_ID,
                catalog=CATALOG,
                schema=SCHEMA,
                statement=statement,
                wait_timeout="30s"
            )

            if result.status.state == StatementState.SUCCEEDED:
                print(f"✓ SUCCESS")

                # Print result if it's a SELECT
                if statement.strip().upper().startswith('SELECT'):
                    if result.result and result.result.data_array:
                        print(f"  Rows returned: {len(result.result.data_array)}")
                        # Print first few rows
                        for row in result.result.data_array[:5]:
                            print(f"    {row}")
                else:
                    print(f"  Statement executed successfully")
            else:
                print(f"✗ FAILED: {result.status.state}")
                if result.status.error:
                    print(f"  Error: {result.status.error.message}")

        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            if "already exists" in str(e).lower():
                print("  (This is expected if running multiple times)")
            else:
                print(f"  Continuing with next statement...")

        print()

    print("=" * 70)
    print("Seeding complete! Verifying data...")
    print("=" * 70)
    print()

    # Verify insertion
    verify_sql = """
    SELECT
      id,
      name,
      source_type,
      status,
      item_count,
      created_at
    FROM sheets
    ORDER BY created_at DESC
    """

    try:
        result = w.statement_execution.execute_statement(
            warehouse_id=WAREHOUSE_ID,
            catalog=CATALOG,
            schema=SCHEMA,
            statement=verify_sql,
            wait_timeout="30s"
        )

        if result.status.state == StatementState.SUCCEEDED:
            if result.result and result.result.data_array:
                print(f"✓ Found {len(result.result.data_array)} sheets in database:")
                print()

                # Print header
                if result.manifest and result.manifest.schema:
                    headers = [col.name for col in result.manifest.schema.columns]
                    print("  " + " | ".join(headers))
                    print("  " + "-" * 80)

                # Print rows
                for row in result.result.data_array:
                    print(f"  {' | '.join(str(v) for v in row)}")

                print()
                print(f"✓ Seed successful! {len(result.result.data_array)} sheets are ready.")
            else:
                print("⚠ No sheets found in database")
        else:
            print(f"✗ Verification failed: {result.status.state}")

    except Exception as e:
        print(f"✗ Verification error: {str(e)}")

    print()

if __name__ == "__main__":
    main()
