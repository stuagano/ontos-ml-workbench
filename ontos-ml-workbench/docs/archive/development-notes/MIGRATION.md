# Database Migration Guide

This document describes how to apply database migrations for the Ontos ML Workbench.

## Overview

The Ontos ML Platform uses Delta tables in Unity Catalog. Migrations create or modify these tables.

## Prerequisites

Before running migrations:

1. **Databricks Workspace Access**: You need access to a Databricks workspace
2. **Unity Catalog Permissions**:
   - `USE CATALOG` on target catalog
   - `USE SCHEMA` on target schema
   - `CREATE TABLE` on target schema (for new tables)
   - `MODIFY` on existing tables (for alterations)
3. **SQL Warehouse**: You need a SQL Warehouse ID to execute queries

## Configuration

### Development Environment
- **Catalog**: `home_stuart_gano` (or your home catalog)
- **Schema**: `ontos_ml_workbench`
- **Full path**: `home_stuart_gano.ontos_ml_workbench.*`

### Production Environment
- **Catalog**: `erp-demonstrations` (or your production catalog)
- **Schema**: `ontos_ml_workbench`
- **Full path**: `erp-demonstrations.ontos_ml_workbench.*`

## How to Run Migrations

### Option 1: Databricks SQL Editor (Recommended)

1. Open your Databricks workspace
2. Navigate to **SQL Editor** (or **SQL Warehouse**)
3. Open the migration file (e.g., `schemas/create_monitor_alerts.sql`)
4. **Replace variables** in the SQL:
   ```sql
   -- Replace ${catalog} with your catalog name
   -- Replace ${schema} with your schema name

   -- Example for production:
   CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`ontos_ml_workbench`.monitor_alerts (

   -- Example for development:
   CREATE TABLE IF NOT EXISTS `home_stuart_gano`.`ontos_ml_workbench`.monitor_alerts (
   ```
5. Select your SQL Warehouse
6. Click **Run** to execute the migration
7. Verify the table was created by running the verification queries at the end of the file

### Option 2: Databricks CLI

```bash
# Set up authentication (if not already done)
databricks auth login https://your-workspace.cloud.databricks.com --profile=vital-dev

# Execute migration using SQL API
databricks sql execute \
  --warehouse-id <your-warehouse-id> \
  --profile vital-dev \
  --file schemas/create_monitor_alerts.sql

# Note: You'll need to manually replace ${catalog} and ${schema} variables
# in the SQL file before execution
```

### Option 3: Python Script (Automated)

For automated deployments, use the Python script with variable substitution:

```python
from databricks.sdk import WorkspaceClient

# Initialize client
w = WorkspaceClient()

# Read migration file
with open('schemas/create_monitor_alerts.sql', 'r') as f:
    sql_template = f.read()

# Substitute variables
catalog = "erp-demonstrations"  # or "home_stuart_gano" for dev
schema = "ontos_ml_workbench"      # or "ontos_ml_workbench" for dev
sql = sql_template.replace('${catalog}', catalog).replace('${schema}', schema)

# Execute
warehouse_id = "your-warehouse-id"
response = w.statement_execution.execute_statement(
    warehouse_id=warehouse_id,
    statement=sql
)

print(f"Migration completed: {response.status}")
```

## Available Migrations

### 1. Create monitor_alerts Table

**File**: `schemas/create_monitor_alerts.sql`

**Purpose**: Creates the `monitor_alerts` table for tracking monitoring alerts on deployed model endpoints.

**Required by**:
- `/api/v1/monitoring/alerts/*` endpoints
- Monitor stage functionality

**Schema**:
- `id` (STRING, PRIMARY KEY): Unique alert identifier
- `endpoint_id` (STRING): Reference to endpoint being monitored
- `alert_type` (STRING): Type of alert (drift, latency, error_rate, quality)
- `threshold` (DOUBLE): Alert threshold value
- `condition` (STRING): Condition operator (gt, lt, eq)
- `status` (STRING): Alert status (active, acknowledged, resolved)
- `triggered_at` (TIMESTAMP): When alert was triggered
- `acknowledged_at` (TIMESTAMP): When alert was acknowledged
- `acknowledged_by` (STRING): User who acknowledged alert
- `resolved_at` (TIMESTAMP): When alert was resolved
- `current_value` (DOUBLE): Current metric value that triggered alert
- `message` (STRING): Alert message
- `created_at` (TIMESTAMP): Alert creation timestamp

**Run this migration if**:
- You see error: `Table 'erp-demonstrations.ontos_ml_workbench.monitor_alerts' doesn't exist`
- You're setting up a new workspace
- You're deploying the monitoring endpoints for the first time

### 2. Create model_training_lineage Table

**File**: `schemas/create_model_training_lineage.sql`

**Purpose**: Creates the `model_training_lineage` table for tracking which models were trained with which Training Sheets. Enables complete traceability from deployed model back to source data.

**Required by**:
- `/api/v1/deployment/*` endpoints
- Train stage functionality
- Model governance and compliance reporting

**Schema**:
- `id` (STRING, PRIMARY KEY): Unique lineage record identifier
- `model_name` (STRING, NOT NULL): Name of the trained model
- `model_version` (STRING): Version or checkpoint identifier
- `model_registry_path` (STRING): Unity Catalog model path
- `training_sheet_id` (STRING, NOT NULL): Reference to training_sheets.id
- `training_sheet_name` (STRING): Denormalized for reporting
- `training_job_id` (STRING): Databricks Job ID
- `training_run_id` (STRING): MLflow run ID
- `training_started_at` (TIMESTAMP): Training start time
- `training_completed_at` (TIMESTAMP): Training completion time
- `training_duration_seconds` (INT): Duration in seconds
- `base_model` (STRING): Foundation model used as base
- `training_params` (VARIANT): JSON with training configuration
- `final_loss` (DOUBLE): Final training loss
- `final_accuracy` (DOUBLE): Final accuracy metric
- `training_metrics` (VARIANT): JSON with all training metrics
- `training_examples_count` (INT): Number of Q&A pairs used
- `validation_examples_count` (INT): Validation set size
- `deployment_status` (STRING): Status (training, completed, deployed, deprecated)
- `deployed_at` (TIMESTAMP): Deployment timestamp
- `deployed_by` (STRING): User who deployed
- `deployment_endpoint` (STRING): Model serving endpoint
- `data_lineage` (VARIANT): JSON documenting full lineage (Sheet → Template → Training Sheet → Model)
- `compliance_notes` (STRING): Governance notes
- `created_at` (TIMESTAMP): Record creation
- `created_by` (STRING): Creator
- `updated_at` (TIMESTAMP): Last update
- `updated_by` (STRING): Last updater

**Run this migration if**:
- You see error: `Table 'erp-demonstrations.ontos_ml_workbench.model_training_lineage' doesn't exist`
- You're setting up model training workflows
- You need lineage tracking for compliance and governance

## Verification

After running a migration, verify it was successful:

```sql
-- Check table exists (replace table_name with the table you created)
SHOW TABLES IN `${catalog}`.`${schema}` LIKE 'monitor_alerts';
SHOW TABLES IN `${catalog}`.`${schema}` LIKE 'model_training_lineage';

-- View table schema
DESCRIBE TABLE EXTENDED `${catalog}`.`${schema}`.monitor_alerts;
DESCRIBE TABLE EXTENDED `${catalog}`.`${schema}`.model_training_lineage;

-- Check row count (should be 0 for new tables)
SELECT COUNT(*) FROM `${catalog}`.`${schema}`.monitor_alerts;
SELECT COUNT(*) FROM `${catalog}`.`${schema}`.model_training_lineage;
```

## Troubleshooting

### Error: "Table already exists"

This is fine. Migrations use `CREATE TABLE IF NOT EXISTS` to be idempotent. The migration will skip table creation if it already exists.

### Error: "Catalog not found"

Verify the catalog exists:
```sql
SHOW CATALOGS LIKE '${catalog}';
```

If not, create it:
```sql
CREATE CATALOG IF NOT EXISTS `${catalog}`;
```

### Error: "Schema not found"

Verify the schema exists:
```sql
SHOW SCHEMAS IN `${catalog}` LIKE '${schema}';
```

If not, create it:
```sql
CREATE SCHEMA IF NOT EXISTS `${catalog}`.`${schema}`;
```

### Error: "Permission denied"

Contact your Databricks workspace administrator to grant:
- `USE CATALOG` on the target catalog
- `USE SCHEMA` on the target schema
- `CREATE TABLE` on the target schema

### Error: "Warehouse not found"

Verify your SQL Warehouse ID in your `.env` file or deployment configuration:
```bash
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
```

Get available warehouses:
```sql
SHOW WAREHOUSES;
```

## Full Schema Initialization

If you need to create ALL tables (not just missing ones), use the full initialization script:

```bash
# Option A: Run full init.sql script (requires variable substitution)
# Edit schemas/init.sql to replace ${catalog} and ${schema}, then run in SQL Editor

# Option B: Use the initialization Python script (if available)
python scripts/initialize_database.py
```

## Best Practices

1. **Test in Development First**: Always run migrations in your development environment before production
2. **Backup Production Data**: Before running migrations that modify existing tables, consider creating a backup
3. **Version Control**: Commit migration files to git so changes are tracked
4. **Document Changes**: Update this file when adding new migrations
5. **Idempotent Migrations**: Always use `IF NOT EXISTS` or `IF EXISTS` to make migrations safe to re-run

## Migration Checklist

- [ ] Read migration file and understand changes
- [ ] Verify prerequisites (permissions, catalog, schema)
- [ ] Replace variable placeholders (${catalog}, ${schema})
- [ ] Test in development environment first
- [ ] Run migration in target environment
- [ ] Run verification queries
- [ ] Test affected API endpoints
- [ ] Document any issues or special considerations

## Related Files

- `schemas/init.sql` - Complete schema initialization script (all tables)
- `schemas/create_monitor_alerts.sql` - Monitor alerts table migration
- `backend/app/core/config.py` - Configuration for catalog and schema names
- `backend/.env.example` - Environment variable examples
