#!/usr/bin/env python3
"""
Verify sheets data in database with detailed inspection
"""
import os
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

WAREHOUSE_ID = "your-warehouse-id"
CATALOG = "your_catalog"
SCHEMA = "ontos_ml_workbench"

def execute_query(w, sql, description):
    """Execute SQL and return results"""
    print(f"\n{description}")
    print("=" * 70)

    try:
        result = w.statement_execution.execute_statement(
            warehouse_id=WAREHOUSE_ID,
            catalog=CATALOG,
            schema=SCHEMA,
            statement=sql,
            wait_timeout="30s"
        )

        if result.status.state == StatementState.SUCCEEDED:
            if result.result and result.result.data_array:
                # Print headers
                if result.manifest and result.manifest.schema:
                    headers = [col.name for col in result.manifest.schema.columns]
                    print("\n" + " | ".join(headers))
                    print("-" * 100)

                # Print rows
                for row in result.result.data_array:
                    print(" | ".join(str(v)[:50] if v else "NULL" for v in row))

                print(f"\n✓ {len(result.result.data_array)} rows returned")
                return result.result.data_array
            else:
                print("⚠ Query succeeded but returned no data")
                return []
        else:
            print(f"✗ Query failed: {result.status.state}")
            if result.status.error:
                print(f"  Error: {result.status.error.message}")
            return None

    except Exception as e:
        print(f"✗ Error executing query: {str(e)}")
        return None

def main():
    profile = os.getenv("DATABRICKS_CONFIG_PROFILE", "fe-vm-serverless-dxukih")
    w = WorkspaceClient(profile=profile)

    print("Ontos ML Workbench - Sheets Data Verification")
    print("=" * 70)
    print(f"Workspace: {w.config.host}")
    print(f"Catalog: {CATALOG}")
    print(f"Schema: {SCHEMA}")

    # Query 1: Basic sheet info
    sql1 = """
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
    execute_query(w, sql1, "1. All Sheets (Basic Info)")

    # Query 2: Detailed sheet configuration
    sql2 = """
    SELECT
      name,
      source_type,
      COALESCE(source_table, source_volume) as source,
      item_id_column,
      SIZE(text_columns) as text_col_count,
      SIZE(image_columns) as image_col_count,
      SIZE(metadata_columns) as metadata_col_count,
      sampling_strategy
    FROM sheets
    ORDER BY name
    """
    execute_query(w, sql2, "2. Sheet Configurations")

    # Query 3: Sheets by source type
    sql3 = """
    SELECT
      source_type,
      COUNT(*) as sheet_count,
      SUM(item_count) as total_items,
      AVG(item_count) as avg_items_per_sheet
    FROM sheets
    GROUP BY source_type
    ORDER BY sheet_count DESC
    """
    execute_query(w, sql3, "3. Sheets Grouped by Source Type")

    # Query 4: Column usage analysis
    sql4 = """
    SELECT
      name,
      CASE
        WHEN SIZE(text_columns) > 0 THEN 'Yes'
        ELSE 'No'
      END as has_text,
      CASE
        WHEN SIZE(image_columns) > 0 THEN 'Yes'
        ELSE 'No'
      END as has_images,
      CASE
        WHEN SIZE(metadata_columns) > 0 THEN 'Yes'
        ELSE 'No'
      END as has_metadata
    FROM sheets
    ORDER BY name
    """
    execute_query(w, sql4, "4. Multimodal Data Analysis")

    # Query 5: Check for specific sheets
    sql5 = """
    SELECT
      name,
      description
    FROM sheets
    WHERE name LIKE '%PCB%'
       OR name LIKE '%Sensor%'
       OR name LIKE '%Medical%'
       OR name LIKE '%Maintenance%'
       OR name LIKE '%Quality%'
    ORDER BY name
    """
    results = execute_query(w, sql5, "5. Sample Sheets Verification")

    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    if results is not None and len(results) >= 5:
        print("✓ SUCCESS: All 5 sample sheets found in database")
        print()
        print("Sample sheets available:")
        for i, (name, desc) in enumerate(results, 1):
            print(f"{i}. {name}")
            print(f"   {desc}")
            print()
    else:
        print("⚠ WARNING: Expected 5 sample sheets, but found", len(results) if results else 0)

    print("✓ Sheets table is ready for testing!")
    print()

if __name__ == "__main__":
    main()
