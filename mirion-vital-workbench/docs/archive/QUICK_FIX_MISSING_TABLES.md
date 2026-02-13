# Quick Fix: Create Missing Tables

## Problem

Monitoring endpoints fail with error:
```
Table 'erp-demonstrations.vital_workbench.monitor_alerts' doesn't exist
```

## Solution

Two tables are missing from your workspace. Run these migrations to create them.

## Prerequisites

- Access to Databricks SQL Editor or Databricks CLI
- Permissions: `USE CATALOG`, `USE SCHEMA`, `CREATE TABLE`
- Know your catalog and schema names (see below)

## Step 1: Identify Your Catalog and Schema

**Development Environment** (typical):
- Catalog: `home_stuart_gano` (or your home catalog)
- Schema: `mirion_vital_workbench`

**Production Environment** (example):
- Catalog: `erp-demonstrations`
- Schema: `vital_workbench`

Check your `.env` file:
```bash
cat backend/.env | grep DATABRICKS_CATALOG
cat backend/.env | grep DATABRICKS_SCHEMA
```

## Step 2: Create monitor_alerts Table

### Option A: SQL Editor (Easiest)

1. Open Databricks SQL Editor
2. Copy the content from `schemas/create_monitor_alerts.sql`
3. Replace `${catalog}` and `${schema}` with your values:
   ```sql
   -- Example for production
   CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`vital_workbench`.monitor_alerts (

   -- Example for dev
   CREATE TABLE IF NOT EXISTS `home_stuart_gano`.`mirion_vital_workbench`.monitor_alerts (
   ```
4. Run the query
5. Verify: `DESCRIBE TABLE EXTENDED your_catalog.your_schema.monitor_alerts;`

### Option B: Using sed (Terminal)

```bash
# Set your catalog and schema
CATALOG="erp-demonstrations"
SCHEMA="vital_workbench"

# Generate migration SQL with replacements
sed "s/\${catalog}/$CATALOG/g; s/\${schema}/$SCHEMA/g" \
  schemas/create_monitor_alerts.sql > /tmp/create_monitor_alerts_final.sql

# View the generated SQL
cat /tmp/create_monitor_alerts_final.sql

# Execute via Databricks CLI (requires warehouse ID)
databricks sql execute \
  --warehouse-id your-warehouse-id \
  --file /tmp/create_monitor_alerts_final.sql
```

### Option C: Python Script

```python
from databricks.sdk import WorkspaceClient

# Configuration
CATALOG = "erp-demonstrations"  # or "home_stuart_gano" for dev
SCHEMA = "vital_workbench"      # or "mirion_vital_workbench" for dev
WAREHOUSE_ID = "your-warehouse-id"

# Initialize client (uses authentication from environment)
w = WorkspaceClient()

# Read and substitute variables
with open('schemas/create_monitor_alerts.sql', 'r') as f:
    sql = f.read().replace('${catalog}', CATALOG).replace('${schema}', SCHEMA)

# Execute
response = w.statement_execution.execute_statement(
    warehouse_id=WAREHOUSE_ID,
    statement=sql
)

print(f"monitor_alerts table created: {response.status}")
```

## Step 3: Create model_training_lineage Table

Repeat the same process using `schemas/create_model_training_lineage.sql`

### SQL Editor Quick Command

```sql
-- Replace catalog and schema with your values
CREATE TABLE IF NOT EXISTS `your_catalog`.`your_schema`.model_training_lineage (
  id STRING NOT NULL,
  model_name STRING NOT NULL COMMENT 'Name of the trained model',
  model_version STRING COMMENT 'Version or checkpoint identifier',
  -- ... (see schemas/create_model_training_lineage.sql for full schema)
```

Or use the same sed/Python approach from Step 2.

## Step 4: Verify Tables Created

```sql
-- Check tables exist
SHOW TABLES IN `your_catalog`.`your_schema` LIKE 'monitor_alerts';
SHOW TABLES IN `your_catalog`.`your_schema` LIKE 'model_training_lineage';

-- Confirm both are empty
SELECT COUNT(*) FROM `your_catalog`.`your_schema`.monitor_alerts;
SELECT COUNT(*) FROM `your_catalog`.`your_schema`.model_training_lineage;
```

Expected output: Both tables exist with 0 rows.

## Step 5: Test Monitoring Endpoints

```bash
# Restart backend if running locally
cd backend
uvicorn app.main:app --reload

# Test alert creation
curl -X POST http://localhost:8000/api/v1/monitoring/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "test-endpoint",
    "alert_type": "error_rate",
    "threshold": 0.05,
    "condition": "gt",
    "enabled": true
  }'

# List alerts (should return empty array initially)
curl http://localhost:8000/api/v1/monitoring/alerts
```

## Troubleshooting

### Error: "Catalog not found"

```sql
-- Create catalog if missing
CREATE CATALOG IF NOT EXISTS `your_catalog`;
```

### Error: "Schema not found"

```sql
-- Create schema if missing
CREATE SCHEMA IF NOT EXISTS `your_catalog`.`your_schema`;
```

### Error: "Permission denied"

Contact your Databricks workspace admin to grant:
- `USE CATALOG` on the catalog
- `USE SCHEMA` on the schema
- `CREATE TABLE` on the schema

### Error: "Warehouse not found"

Get your warehouse ID:
```sql
SHOW WAREHOUSES;
```

Or check your `.env` file:
```bash
cat backend/.env | grep DATABRICKS_WAREHOUSE_ID
```

## Complete Reference

For detailed migration documentation, see:
- `MIGRATION.md` - Complete migration guide
- `MISSING_TABLES_SUMMARY.md` - Analysis of missing tables
- `schemas/create_monitor_alerts.sql` - Monitor alerts migration
- `schemas/create_model_training_lineage.sql` - Model lineage migration

## Need All Tables?

If you're setting up a fresh workspace and need ALL tables (not just these two), run the full initialization:

```bash
# Full schema initialization
# Edit schemas/init.sql to replace ${catalog} and ${schema}, then execute in SQL Editor
```

Or use the numbered schema files (01-08) which have the complete PRD v2.3 schema.
