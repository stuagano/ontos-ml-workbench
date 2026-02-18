#!/usr/bin/env python3
import os
from databricks.sdk import WorkspaceClient

CATALOG = os.getenv("DATABRICKS_CATALOG", "your_catalog")
SCHEMA = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")
WAREHOUSE_ID = os.getenv("DATABRICKS_WAREHOUSE_ID")
PROFILE = os.getenv("DATABRICKS_CONFIG_PROFILE", "DEFAULT")

w = WorkspaceClient(profile=PROFILE)
sql = f"SELECT name, source_type, item_count, status FROM `{CATALOG}`.{SCHEMA}.sheets ORDER BY name"
result = w.statement_execution.execute_statement(
    statement=sql, warehouse_id=WAREHOUSE_ID, wait_timeout="30s"
)

print(
    f"DEBUG: status={result.status.state}, result={result.result is not None}, data_array={result.result.data_array is not None if result.result else False}"
)
if result.status.state == "SUCCEEDED" and result.result and result.result.data_array:
    print("\n📊 Sheets in database (PRD v2.3 schema):")
    print("=" * 95)
    for row in result.result.data_array:
        print(f"{row[0]:45s} | {row[1]:12s} | {str(row[2]):6s} items | {row[3]}")
    print("=" * 95)
    total_items = sum(int(row[2]) for row in result.result.data_array)
    print(
        f"Total: {len(result.result.data_array)} sheets with {total_items:,} total items"
    )
elif result.status.state == "FAILED":
    print(
        f"❌ Query failed: {result.status.error.message if result.status.error else 'Unknown error'}"
    )
else:
    print(f"⚠️ No data returned (status: {result.status.state})")
