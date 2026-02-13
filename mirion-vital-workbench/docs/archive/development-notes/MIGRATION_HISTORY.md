# Database Schema Migration History

**Project:** VITAL Platform Workbench
**Database:** `serverless_dxukih_catalog.mirion` (FEVM workspace)
**Last Updated:** 2026-02-11

## Overview

This document tracks all database schema changes for the VITAL Platform Workbench. Migrations are organized chronologically with clear documentation of purpose, execution status, and dependencies.

## Schema Version History

### Version 1.0 - Initial Schema (2026-02-06)

**Status:** Completed
**Catalog:** `home_stuart_gano.mirion_vital_workbench`
**Migration Files:**
- `01_create_catalog.sql` - Create catalog and schema
- `02_sheets.sql` - Dataset definitions
- `03_templates.sql` - Prompt templates
- `04_canonical_labels.sql` - Ground truth labels
- `05_training_sheets.sql` - Q&A datasets
- `06_qa_pairs.sql` - Individual Q&A pairs
- `07_model_training_lineage.sql` - Model tracking
- `08_example_store.sql` - Few-shot examples

**Key Features:**
- Multimodal data support (images, text, metadata)
- Composite key on canonical_labels: `(sheet_id, item_ref, label_type)`
- Audit fields on all tables: `created_at`, `created_by`, `updated_at`, `updated_by`
- JSON columns stored as STRING (parse in application)
- Change Data Feed enabled on all tables

**Simplifications Made:**
- No PRIMARY KEY constraints (not needed for Delta)
- No UNIQUE constraints (enforced in application layer)
- No DEFAULT values (set in application code)
- No CREATE INDEX (Delta has automatic data skipping)
- VARIANT → STRING for JSON columns

### Version 1.1 - ML Column Configuration (2026-02-11)

**Status:** Completed
**Migration:** `add_ml_columns_to_templates.sql`
**Migration:** `add_ml_columns_to_training_sheets.sql`

**Changes:**

**templates table:**
- Added `feature_columns ARRAY<STRING>` - Independent variables (input features)
- Added `target_column STRING` - Dependent variable (prediction target)

**training_sheets table:**
- Added `feature_columns ARRAY<STRING>` - Independent variables for this dataset
- Added `target_column STRING` - Dependent variable for supervised learning

**Purpose:**
Enable supervised learning workflows with explicit feature/target definitions for predictive models.

**Execution:**
```sql
-- templates
ALTER TABLE home_stuart_gano.mirion_vital_workbench.templates
ADD COLUMN feature_columns ARRAY<STRING>;

ALTER TABLE home_stuart_gano.mirion_vital_workbench.templates
ADD COLUMN target_column STRING;

-- training_sheets
ALTER TABLE home_stuart_gano.mirion_vital_workbench.training_sheets
ADD COLUMN feature_columns ARRAY<STRING>;

ALTER TABLE home_stuart_gano.mirion_vital_workbench.training_sheets
ADD COLUMN target_column STRING;
```

### Version 1.2 - Monitor Stage Support (2026-02-08)

**Status:** Completed (consolidated fix applied)
**Migration:** `fix_monitor_schema.sql` (consolidated)
**Documentation:** `MONITOR_SCHEMA_FIX_INSTRUCTIONS.md`

**Changes:**

**New Table: monitor_alerts**
Tracks monitoring alerts for deployed model endpoints.

Columns:
- `id` (STRING) - Alert unique identifier
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

**feedback_items table:**
- Added `flagged BOOLEAN DEFAULT FALSE` - Mark problematic feedback entries

**Purpose:**
Enable Monitor stage endpoints for performance metrics, alerting, and error tracking.

**Execution:**
Run `schemas/fix_monitor_schema.sql` in Databricks SQL Editor.

### Version 1.3 - Model Training Lineage (2026-02-07)

**Status:** Completed
**Migration:** `create_model_training_lineage.sql`

**Purpose:**
Extended model_training_lineage table for full traceability from deployed model back to source data.

**Execution:**
Already incorporated in `07_model_training_lineage.sql` (part of initial schema).

## Migration File Categories

### Core Schema (Keep)
These are the authoritative schema definitions:

| File | Purpose | Status |
|------|---------|--------|
| `01_create_catalog.sql` | Create catalog and schema | Active |
| `02_sheets.sql` | Sheets table schema | Active |
| `03_templates.sql` | Templates table schema | Active |
| `04_canonical_labels.sql` | Canonical labels table schema | Active |
| `05_training_sheets.sql` | Training sheets table schema | Active |
| `06_qa_pairs.sql` | Q&A pairs table schema | Active |
| `07_model_training_lineage.sql` | Model lineage table schema | Active |
| `08_example_store.sql` | Example store table schema | Active |
| `99_validate_and_seed.sql` | Validation and seed queries | Active |

### Incremental Migrations (Keep)
Applied changes after initial schema:

| File | Purpose | Status |
|------|---------|--------|
| `add_ml_columns_to_templates.sql` | Add ML config to templates | Applied v1.1 |
| `add_ml_columns_to_training_sheets.sql` | Add ML config to training sheets | Applied v1.1 |
| `fix_monitor_schema.sql` | Monitor stage support | Applied v1.2 |

### Seed Data Scripts (Keep)
For testing and demonstration:

| File | Purpose | Status |
|------|---------|--------|
| `seed_sheets.sql` | Sample sheets data | Reference |
| `seed_simple.sql` | Minimal seed data | Reference |
| `seed_templates.sql` | Sample templates | Reference |

### Superseded/Consolidated Files (Archive)

**Superseded by `fix_monitor_schema.sql`:**
- `create_monitor_alerts.sql` - Now part of consolidated fix
- `add_flagged_column.sql` - Now part of consolidated fix

**Superseded by `create_model_training_lineage.sql`:**
- Already incorporated in `07_model_training_lineage.sql`

**Other Workspace-Specific Files:**
- `fix_runtime_errors.sql` - Workspace: `erp-demonstrations.vital_workbench` (old demo)

### Documentation Files (Keep)
Essential reference documentation:

| File | Purpose | Status |
|------|---------|--------|
| `README.md` | Schema documentation | Active |
| `SCHEMA_REFERENCE.md` | Field reference guide | Active |
| `COMPLETION_SUMMARY.md` | Initial setup summary | Historical |
| `MONITOR_SCHEMA_FIX_INSTRUCTIONS.md` | Monitor fix guide | Active |
| `MIGRATION_HISTORY.md` | This file | Active |

### Python Scripts (Keep)
Schema management utilities:

| File | Purpose | Status |
|------|---------|--------|
| `execute_schemas.py` | Execute SQL via Databricks SDK | Active |
| `create_tables_simple.py` | Simple table creation | Active |
| `verify_schema.py` | Schema verification | Active |
| `check_and_seed.py` | Check and seed data | Active |
| `discover_and_seed.py` | Discover and seed | Active |
| `quick_setup.py` | Quick setup utility | Active |
| `run_sql.py` | SQL runner utility | Active |
| `seed_data.py` | Comprehensive seed script | Active |

### Specialized Python Scripts (Review)

**Canonical Labels:**
- `create_canonical_labels_table.py` - Specialized table creation
- `seed_canonical_labels.py` - Seed canonical labels
- `verify_canonical_labels.py` - Verify canonical labels

**Sheets:**
- `create_sheets_table.py` - Specialized table creation
- `migrate_sheets_schema.py` - Schema migration utility
- `seed_sheets_production.py` - Production seed data
- `verify_sheets.py` - Verify sheets data

**Status:** These may be superseded by the numbered SQL files and general utilities.

### Shell Scripts (Keep)
Automation scripts:

| File | Purpose | Status |
|------|---------|--------|
| `execute_all.sh` - Execute all schemas in order | Active |

## Current Schema State (v1.3)

**Location:** `serverless_dxukih_catalog.mirion`
**Warehouse:** `387bcda0f2ece20c`
**Profile:** `fe-vm-serverless-dxukih`

**Tables:**
1. `sheets` - Dataset definitions (21+ columns)
2. `templates` - Prompt templates with ML config (23+ columns)
3. `canonical_labels` - Ground truth labels (21+ columns)
4. `training_sheets` - Q&A datasets with ML config (29+ columns)
5. `qa_pairs` - Individual Q&A pairs (21+ columns)
6. `model_training_lineage` - Model tracking (28+ columns)
7. `example_store` - Few-shot examples (24+ columns)
8. `monitor_alerts` - Monitoring alerts (13 columns)
9. `feedback_items` - User feedback with flagged column

## Migration Best Practices

### Creating New Migrations

1. **Use descriptive filenames:**
   - Format: `add_<feature>_to_<table>.sql` or `create_<table>.sql`
   - Include date in comments

2. **Include header documentation:**
   ```sql
   -- ============================================================================
   -- Migration: <Purpose>
   -- ============================================================================
   -- Purpose: <Detailed description>
   -- Date: YYYY-MM-DD
   -- Author: <Name>
   -- Prerequisites: <Dependencies>
   -- ============================================================================
   ```

3. **Make migrations idempotent:**
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   ```

4. **Include verification queries:**
   ```sql
   -- Verify migration
   DESCRIBE TABLE EXTENDED catalog.schema.table;
   SELECT COUNT(*) FROM catalog.schema.table;
   ```

### Applying Migrations

1. **Review migration file** - Understand what will change
2. **Check prerequisites** - Ensure dependencies exist
3. **Test in dev first** - Use dev catalog/schema
4. **Execute migration** - Run in SQL Editor or via CLI
5. **Verify results** - Check verification queries
6. **Document in this file** - Update migration history
7. **Commit changes** - Git commit with clear message

### Rolling Back Migrations

Delta Lake doesn't support dropping columns easily. For rollback:

1. **New tables:** `DROP TABLE IF EXISTS catalog.schema.table`
2. **New columns:** Not reversible without recreating table
3. **Best practice:** Test thoroughly before applying

## Future Schema Changes

### Planned for v2.0

**Vector Search Support:**
- Add vector search index on `example_store.embedding`
- Enable similarity-based few-shot retrieval

**Enhanced Monitoring:**
- Add `model_performance` table for drift metrics
- Add `inference_logs` table for request/response tracking

**Multi-tenancy:**
- Add `workspace_id` column to all tables
- Implement row-level security

## Verification Commands

### Check Current Schema Version
```bash
cd schemas
python3 verify_schema.py
```

### List All Tables
```sql
USE CATALOG serverless_dxukih_catalog;
USE SCHEMA mirion;
SHOW TABLES;
```

### Describe Specific Table
```sql
DESCRIBE EXTENDED serverless_dxukih_catalog.mirion.templates;
```

### Check for Missing Columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_catalog = 'serverless_dxukih_catalog'
  AND table_schema = 'mirion'
  AND table_name = 'templates'
ORDER BY ordinal_position;
```

## Workspace Configurations

### FEVM Workspace (Primary Development)
- **URL:** https://fevm-serverless-dxukih.cloud.databricks.com
- **Catalog:** `serverless_dxukih_catalog`
- **Schema:** `mirion`
- **Warehouse:** `387bcda0f2ece20c`
- **Profile:** `fe-vm-serverless-dxukih`

### ERP Demonstrations (Old Demo)
- **URL:** erp-demonstrations workspace
- **Catalog:** `erp-demonstrations`
- **Schema:** `vital_workbench`
- **Status:** Legacy (not actively maintained)

### Home Catalog (Development)
- **Catalog:** `home_stuart_gano`
- **Schema:** `mirion_vital_workbench`
- **Status:** Initial development/testing

## Support

For schema questions or migration issues:
1. Check this migration history
2. Review `SCHEMA_REFERENCE.md` for field details
3. Check `README.md` for relationships
4. Review specific migration file for details

## Change Log

| Date | Version | Change | Migration File |
|------|---------|--------|----------------|
| 2026-02-06 | 1.0 | Initial schema | `01-08*.sql` |
| 2026-02-07 | 1.3 | Model lineage | `create_model_training_lineage.sql` |
| 2026-02-08 | 1.2 | Monitor support | `fix_monitor_schema.sql` |
| 2026-02-11 | 1.1 | ML columns | `add_ml_columns_*.sql` |
| 2026-02-11 | - | Documentation | `MIGRATION_HISTORY.md` (this file) |
