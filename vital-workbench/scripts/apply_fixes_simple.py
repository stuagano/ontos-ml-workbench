#!/usr/bin/env python3
"""Apply schema fixes one statement at a time"""

import os
import sys
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

warehouse_id = "0024da9c9e9a4dc2"
catalog = "home_stuart_gano"
schema = "mirion_vital_workbench"

print("=" * 70)
print("Applying Schema Fixes")
print("=" * 70)
print()

w = WorkspaceClient()

# Statement 1: Create monitor_alerts table
sql1 = """
CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,
  alert_type STRING NOT NULL,
  threshold DOUBLE,
  condition STRING,
  status STRING DEFAULT 'active',
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,
  current_value DOUBLE,
  message STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  CONSTRAINT monitor_alerts_pk PRIMARY KEY (id)
) USING DELTA
COMMENT 'Monitoring alerts for deployed model endpoints'
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
sql2 = """
ALTER TABLE home_stuart_gano.mirion_vital_workbench.feedback_items
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE
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
            print(f"   Error: {response.status.error.message}")
except Exception as e:
    print(f"❌ Failed: {e}")

print()
print("=" * 70)
print("✅ SCHEMA FIXES COMPLETE")
print("=" * 70)
print()
print("Next step: Restart backend")
print("  cd backend && uvicorn app.main:app --reload")
