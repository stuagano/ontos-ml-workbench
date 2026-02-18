# Monitor Stage Schema Fixes - Execution Guide

## Overview

Two database schema issues are blocking the Monitor stage from functioning:

1. **Missing `monitor_alerts` table** - Required for alert tracking
2. **Missing `flagged` column on `feedback_items`** - Required for error tracking

## Impact

Without these fixes, the following Monitor stage endpoints will fail:
- `GET /api/v1/monitoring/metrics/performance` - Performance metrics
- `GET /api/v1/monitoring/metrics/realtime/{endpoint_id}` - Real-time metrics
- `POST /api/v1/monitoring/alerts` - Create alerts
- `GET /api/v1/monitoring/alerts` - List alerts
- `GET /api/v1/monitoring/drift/{endpoint_id}` - Drift detection
- `GET /api/v1/monitoring/health/{endpoint_id}` - Health checks

## Files Involved

### Main Fix Script
- **`schemas/fix_monitor_schema.sql`** - Consolidated fix script (run this)

### Reference Files (for context)
- `schemas/create_monitor_alerts.sql` - Original monitor_alerts DDL
- `schemas/add_flagged_column.sql` - Original flagged column DDL
- `schemas/init.sql` - Complete schema (lines 363-417 define the tables)
- `backend/app/api/v1/endpoints/monitoring.py` - Code that uses these tables

## Prerequisites

Before running the fix:

1. **Schema must exist**:
   ```sql
   USE CATALOG home_stuart_gano;
   USE SCHEMA ontos_ml_workbench;
   ```

2. **Permissions required**:
   - `CREATE TABLE` on schema
   - `ALTER TABLE` on schema
   - `SELECT` on `information_schema.columns`

3. **Tables must exist**:
   - `feedback_items` - Should already exist from initial setup
   - `endpoints_registry` - Should already exist (referenced by foreign key concept)

## Execution Steps

### Step 1: Verify Current State

Check if the issues exist:

```sql
-- Check if monitor_alerts table exists
SHOW TABLES IN home_stuart_gano.ontos_ml_workbench LIKE 'monitor_alerts';

-- Check if feedback_items has flagged column
DESCRIBE TABLE home_stuart_gano.ontos_ml_workbench.feedback_items;
```

**Expected Issues:**
- `monitor_alerts` table does not exist
- `feedback_items` table exists but has no `flagged` column

### Step 2: Run the Fix Script

**Option A: Databricks SQL Editor (Recommended for Demo)**

1. Open Databricks workspace SQL Editor
2. Copy contents of `schemas/fix_monitor_schema.sql`
3. Paste into SQL Editor
4. Click "Run All" or execute section by section
5. Review verification query results at the bottom

**Option B: Command Line (Databricks CLI)**

```bash
# From project root
databricks workspace import \
  --file schemas/fix_monitor_schema.sql \
  --path /Workspace/Shared/fix_monitor_schema.sql \
  --overwrite

# Then run in SQL warehouse
databricks sql execute \
  --warehouse-id <your-warehouse-id> \
  --file schemas/fix_monitor_schema.sql
```

**Option C: Python Script**

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

with open('schemas/fix_monitor_schema.sql', 'r') as f:
    sql = f.read()

# Execute SQL
w.statement_execution.execute_statement(
    warehouse_id="<your-warehouse-id>",
    statement=sql
)
```

### Step 3: Verify the Fix

The script includes verification queries at the end. Expected results:

```
check_name                             | column_count/exists/row_count
---------------------------------------|------------------------------
monitor_alerts table structure         | 13
feedback_items.flagged column exists   | YES
monitor_alerts row count               | 0
feedback_items row count               | 0 (or existing count)
```

### Step 4: Test the Monitor Stage

After schema fixes, test the endpoints:

```bash
# From backend directory
cd backend

# Test metrics endpoint
curl http://localhost:8000/api/v1/monitoring/metrics/performance

# Test alerts endpoint
curl http://localhost:8000/api/v1/monitoring/alerts

# Test health endpoint (requires endpoint_id)
curl http://localhost:8000/api/v1/monitoring/health/{endpoint_id}
```

## Schema Details

### monitor_alerts Table

**Purpose**: Track monitoring alerts for deployed model endpoints

**Columns**:
- `id` (STRING, PK) - Alert unique identifier
- `endpoint_id` (STRING) - Reference to endpoints_registry
- `alert_type` (STRING) - drift, latency, error_rate, quality
- `threshold` (DOUBLE) - Threshold value for triggering
- `condition` (STRING) - Comparison operator (gt, lt, eq)
- `status` (STRING) - active, acknowledged, resolved
- `triggered_at` (TIMESTAMP) - When alert fired
- `acknowledged_at` (TIMESTAMP) - When acknowledged
- `acknowledged_by` (STRING) - User who acknowledged
- `resolved_at` (TIMESTAMP) - When resolved
- `current_value` (DOUBLE) - Current metric value
- `message` (STRING) - Alert message
- `created_at` (TIMESTAMP) - Record creation time

**Used By**:
- `POST /api/v1/monitoring/alerts` - Create alert
- `GET /api/v1/monitoring/alerts` - List alerts
- `GET /api/v1/monitoring/alerts/{alert_id}` - Get alert
- `POST /api/v1/monitoring/alerts/{alert_id}/acknowledge` - Acknowledge
- `POST /api/v1/monitoring/alerts/{alert_id}/resolve` - Resolve
- `DELETE /api/v1/monitoring/alerts/{alert_id}` - Delete

### feedback_items.flagged Column

**Purpose**: Mark problematic feedback entries for review

**Type**: `BOOLEAN DEFAULT FALSE`

**Used By**:
- `GET /api/v1/monitoring/metrics/performance` (line 153)
- `GET /api/v1/monitoring/metrics/realtime/{endpoint_id}` (line 222)

**Usage Pattern**:
```sql
-- Count failed requests
SELECT COUNT(*)
FROM feedback_items
WHERE flagged = TRUE;

-- Calculate error rate
SELECT
  SUM(CASE WHEN rating < 3 OR flagged = TRUE THEN 1 ELSE 0 END) as failed_requests
FROM feedback_items;
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Remove monitor_alerts table
DROP TABLE IF EXISTS home_stuart_gano.ontos_ml_workbench.monitor_alerts;

-- Remove flagged column (cannot be done directly in Delta Lake)
-- You would need to recreate feedback_items without the column
-- Not recommended for demo - just keep the column
```

## Troubleshooting

### Issue: "Table already exists"
**Solution**: This is safe - the script uses `CREATE TABLE IF NOT EXISTS`

### Issue: "Column already exists"
**Solution**: This is safe - the script uses `ADD COLUMN IF NOT EXISTS`

### Issue: "Permission denied"
**Solution**: Ensure you have CREATE TABLE and ALTER TABLE permissions on the schema

### Issue: "Schema not found"
**Solution**: Run `schemas/01_create_catalog.sql` first to create the schema

### Issue: "feedback_items table not found"
**Solution**: Run the full schema initialization first:
```bash
# Run init.sql or the numbered schema files
databricks sql execute --file schemas/init.sql
```

## Next Steps

After fixing the schema:

1. **Restart backend** (if running):
   ```bash
   # APX mode
   apx dev stop
   apx dev start

   # Manual mode
   # Ctrl+C and restart uvicorn
   ```

2. **Test Monitor stage** in frontend:
   - Navigate to MONITOR stage
   - Check that metrics load without errors
   - Verify alert creation works

3. **Seed sample data** (optional for demo):
   - Create sample endpoints in `endpoints_registry`
   - Add sample feedback items with varying ratings
   - Create sample alerts

## Questions?

- Schema reference: `schemas/init.sql` lines 363-417
- API reference: `backend/app/api/v1/endpoints/monitoring.py`
- Full schema docs: `schemas/README.md` (if exists)
