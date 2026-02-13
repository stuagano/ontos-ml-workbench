#!/usr/bin/env python3
"""Apply schema fixes to FEVM workspace"""

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

warehouse_id = "387bcda0f2ece20c"
catalog = "serverless_dxukih_catalog"
schema = "mirion"

print("=" * 70)
print("Applying Schema Fixes to FEVM Workspace")
print("=" * 70)
print(f"Catalog: {catalog}")
print(f"Schema:  {schema}")
print()

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")

# Statement 1: Create monitor_alerts table
sql1 = f"""
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,
  alert_type STRING NOT NULL,
  threshold DOUBLE,
  condition STRING,
  status STRING,
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,
  current_value DOUBLE,
  message STRING,
  created_at TIMESTAMP
) USING DELTA
"""

print("🔧 Creating monitor_alerts table...")
try:
    response = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql1,
        catalog=catalog,
        schema=schema,
        wait_timeout="30s"
    )

    if response.status.state == StatementState.SUCCEEDED:
        print("✅ monitor_alerts table created successfully")
    else:
        print(f"⚠️  State: {response.status.state}")
        if response.status.error:
            print(f"   Error: {response.status.error.message}")
except Exception as e:
    print(f"❌ Failed: {e}")

print()

# Statement 2: Add flagged column
sql2 = f"""
ALTER TABLE {catalog}.{schema}.feedback_items
ADD COLUMN flagged BOOLEAN
"""

print("🔧 Adding flagged column to feedback_items...")
try:
    response = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql2,
        catalog=catalog,
        schema=schema,
        wait_timeout="30s"
    )

    if response.status.state == StatementState.SUCCEEDED:
        print("✅ flagged column added successfully")
    else:
        print(f"⚠️  State: {response.status.state}")
        if response.status.error:
            # Check if column already exists
            if "already exists" in str(response.status.error.message).lower() or "duplicate" in str(response.status.error.message).lower():
                print("   Column already exists (OK)")
            else:
                print(f"   Error: {response.status.error.message}")
except Exception as e:
    error_msg = str(e).lower()
    if "already exists" in error_msg or "duplicate" in error_msg:
        print("   Column already exists (OK)")
    else:
        print(f"❌ Failed: {e}")

print()
print("=" * 70)
print("✅ SCHEMA FIXES COMPLETE")
print("=" * 70)
print()
print("Configuration:")
print(f"  Catalog:   {catalog}")
print(f"  Schema:    {schema}")
print(f"  Warehouse: {warehouse_id}")
print()
print("Next step: Restart backend")
print("  cd backend && uvicorn app.main:app --reload")
