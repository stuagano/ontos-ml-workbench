# Archived Schema Files

**Last Updated:** 2026-02-11

This directory contains SQL files and scripts that are no longer active but are preserved for historical reference and documentation purposes.

## Directory Structure

```
archive/
├── superseded/           # Migrations consolidated into other files
├── workspace-specific/   # Scripts targeting old/different workspaces
└── test-scripts/        # Temporary test and optimization scripts
```

## Superseded Migrations (superseded/)

These migration files have been consolidated or incorporated into other files and should not be executed independently.

### create_monitor_alerts.sql
**Status:** Superseded by `fix_monitor_schema.sql`
**Date Created:** 2026-02-07
**Purpose:** Create monitor_alerts table

**Why Archived:**
Consolidated into `fix_monitor_schema.sql` which handles both monitor_alerts table creation and feedback_items.flagged column addition in a single migration.

**If You Need This:**
Use `../fix_monitor_schema.sql` instead.

---

### add_flagged_column.sql
**Status:** Superseded by `fix_monitor_schema.sql`
**Date Created:** 2026-02-08
**Purpose:** Add flagged column to feedback_items table

**Why Archived:**
Consolidated into `fix_monitor_schema.sql` for atomic Monitor stage schema updates.

**If You Need This:**
Use `../fix_monitor_schema.sql` instead.

---

### create_model_training_lineage.sql
**Status:** Superseded by `07_model_training_lineage.sql`
**Date Created:** 2026-02-07
**Purpose:** Create model_training_lineage table

**Why Archived:**
This functionality was incorporated into the initial schema as `07_model_training_lineage.sql`. The standalone migration is no longer needed.

**If You Need This:**
Use `../07_model_training_lineage.sql` from the main schemas directory.

---

### fix_monitor_schema_simple.sql
**Status:** Superseded by `fix_monitor_schema.sql`
**Date Created:** 2026-02-10
**Purpose:** Simplified version of monitor schema fix

**Why Archived:**
The full `fix_monitor_schema.sql` includes better documentation, verification queries, and error handling. The simplified version is no longer needed.

**If You Need This:**
Use `../fix_monitor_schema.sql` instead.

---

### create_training_tables.sql
**Status:** Superseded by `05_training_sheets.sql` and `06_qa_pairs.sql`
**Date Created:** Unknown
**Purpose:** Create training_sheets and qa_pairs tables for PRD v2.3
**Target:** Your configured catalog/schema

**Why Archived:**
The training_sheets and qa_pairs table definitions are now part of the numbered schema files (05 and 06), which are the authoritative source for table schemas.

**If You Need This:**
Use `../05_training_sheets.sql` and `../06_qa_pairs.sql` instead.

## Workspace-Specific Scripts (workspace-specific/)

These scripts target old or different Databricks workspaces and are not applicable to the current development environment.

### check_sheets.sql
**Status:** Workspace-specific (your_catalog.ontos_ml_workbench)
**Date Created:** Unknown
**Purpose:** Query sheets table to verify data

**Why Archived:**
This script targets the `your_catalog.ontos_ml_workbench` schema, which was used for an older demo. Current development uses your configured catalog/schema from `backend/.env`.

**If You Need This:**
Update the catalog/schema references to match your target workspace.

---

### fix_runtime_errors.sql
**Status:** Workspace-specific (your_catalog.ontos_ml_workbench)
**Date Created:** Unknown
**Purpose:** Fix runtime errors in the original demo workspace

**Why Archived:**
This script targets the `your_catalog.ontos_ml_workbench` schema. The fixes have been incorporated into the main schema migrations for the current workspace.

**If You Need This:**
Use `../fix_monitor_schema.sql` with updated catalog/schema references.

## Test Scripts (test-scripts/)

These are temporary test and optimization scripts used during development.

### QUERY_OPTIMIZATION_TEST.sql
**Status:** Test script (no longer needed)
**Date Created:** Unknown
**Purpose:** Test query optimization for sheets queries
**Target:** `your_catalog.ontos_ml_workbench`

**Why Archived:**
This was a temporary test script to verify query performance improvements. The optimizations have been implemented in the backend service layer.

**If You Need This:**
Query optimization patterns are now part of the backend code (`backend/app/services/sheet_service.py`).

## Restoring Archived Files

If you need to restore any archived file:

```bash
# Restore a single file
cp schemas/archive/superseded/create_monitor_alerts.sql schemas/

# Restore all from a category
cp schemas/archive/superseded/* schemas/
```

Note: Make sure to update catalog/schema references before executing restored files.

## Migration History

For complete migration history and documentation, see:
- `../MIGRATION_HISTORY.md` - Full migration tracking
- `../SCHEMA_REFERENCE.md` - Current schema reference
- `../README.md` - Schema documentation

## Questions

If you're unsure whether to use an archived file:
1. Check `../MIGRATION_HISTORY.md` for the current version
2. Review the "If You Need This" section above
3. Use the active migration files in the parent schemas/ directory

## Cleanup Date

**Date:** 2026-02-11
**By:** Database cleanup initiative
**PR:** [Link to PR if applicable]

## Do Not Execute

Files in this archive should NOT be executed without:
1. Reviewing what they do
2. Checking if they're still relevant
3. Updating catalog/schema references
4. Verifying they don't conflict with current schema state
