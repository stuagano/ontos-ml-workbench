# Schema Cleanup Plan

**Date:** 2026-02-11
**Purpose:** Organize database schema files and remove redundant/obsolete files

## Summary of Cleanup Actions

### Files to Archive (Move to schemas/archive/)

#### Superseded Migrations (archive/superseded/)
These have been consolidated into other files:
- `create_monitor_alerts.sql` → Consolidated into `fix_monitor_schema.sql`
- `add_flagged_column.sql` → Consolidated into `fix_monitor_schema.sql`
- `create_model_training_lineage.sql` → Already in `07_model_training_lineage.sql`

#### Workspace-Specific Scripts (archive/workspace-specific/)
These target old/different workspaces:
- Root: `check_sheets.sql` → Uses `erp-demonstrations.ontos_ml_workbench` (old workspace)
- Root: `fix_runtime_errors.sql` → Uses `erp-demonstrations.ontos_ml_workbench` (old workspace)

**Note:** These should be moved from project root to schemas/archive/

#### Test/Optimization Scripts (archive/test-scripts/)
Temporary test scripts:
- `backend/QUERY_OPTIMIZATION_TEST.sql` → Test queries for optimization
- `schemas/fix_monitor_schema_simple.sql` → Simplified version of fix_monitor_schema.sql

### Files to Keep in Active Schema Directory

#### Core Schema Definitions (schemas/)
- `01_create_catalog.sql` - Catalog/schema creation
- `02_sheets.sql` - Sheets table
- `03_templates.sql` - Templates table
- `04_canonical_labels.sql` - Canonical labels table
- `05_training_sheets.sql` - Training sheets table
- `06_qa_pairs.sql` - Q&A pairs table
- `07_model_training_lineage.sql` - Model lineage table
- `08_example_store.sql` - Example store table
- `99_validate_and_seed.sql` - Validation queries

#### Active Migrations (schemas/)
- `add_ml_columns_to_templates.sql` - Applied in v1.1
- `add_ml_columns_to_training_sheets.sql` - Applied in v1.1
- `fix_monitor_schema.sql` - Applied in v1.2 (consolidated version)

#### Seed Data Scripts (schemas/)
- `seed_sheets.sql` - Sample sheets data
- `seed_simple.sql` - Minimal seed data
- `seed_templates.sql` - Sample templates
- Root: `seed_pcb_data.sql` - PCB demo data
- Root: `seed_canonical_labels.sql` - Canonical labels seed data

**Note:** Consider moving root seed scripts to schemas/ directory

#### Documentation (schemas/)
- `README.md` - Schema documentation
- `SCHEMA_REFERENCE.md` - Field reference
- `COMPLETION_SUMMARY.md` - Historical record
- `MONITOR_SCHEMA_FIX_INSTRUCTIONS.md` - Monitor fix guide
- `MIGRATION_HISTORY.md` - Migration tracking (NEW)
- `CLEANUP_PLAN.md` - This file (NEW)

#### Python Scripts (schemas/)
Keep all Python scripts for schema management:
- `execute_schemas.py`
- `create_tables_simple.py`
- `verify_schema.py`
- `check_and_seed.py`
- `discover_and_seed.py`
- `quick_setup.py`
- `run_sql.py`
- `seed_data.py`
- `create_canonical_labels_table.py`
- `seed_canonical_labels.py`
- `verify_canonical_labels.py`
- `create_sheets_table.py`
- `migrate_sheets_schema.py`
- `seed_sheets_production.py`
- `verify_sheets.py`

#### Shell Scripts (schemas/)
- `execute_all.sh` - Execute all schemas

### Files Requiring Updates

#### Update Seed Scripts
Move to schemas/ directory with updated catalog/schema:
- `/seed_pcb_data.sql` → `schemas/seed_pcb_data.sql`
- `/seed_canonical_labels.sql` → `schemas/seed_canonical_labels.sql`

Update to use `serverless_dxukih_catalog.ontos_ml` instead of old catalogs.

#### Backend SQL Files
Review and potentially consolidate:
- `backend/create_training_tables.sql` - May be superseded by schemas/05 and 06
- `backend/QUERY_OPTIMIZATION_TEST.sql` - Move to archive/test-scripts/

### Files to Delete (After Review)

#### Notebooks in Root
- `notebooks/seed_demo_data.sql` - Review if needed, likely superseded

#### Duplicate Setup Files
Review if any of the specialized Python scripts are redundant:
- Are `create_*_table.py` scripts needed when we have numbered SQL files?
- Are specialized `seed_*.py` scripts needed when we have `seed_data.py`?

**Recommendation:** Keep for now as they provide specific utilities, but document their purpose.

## Execution Steps

### Step 1: Create Archive Structure (DONE)
```bash
mkdir -p schemas/archive/{superseded,workspace-specific,test-scripts}
```

### Step 2: Move Superseded Files
```bash
cd /Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench

# Superseded migrations
mv schemas/create_monitor_alerts.sql schemas/archive/superseded/
mv schemas/add_flagged_column.sql schemas/archive/superseded/
mv schemas/create_model_training_lineage.sql schemas/archive/superseded/
mv schemas/fix_monitor_schema_simple.sql schemas/archive/superseded/
```

### Step 3: Move Workspace-Specific Files
```bash
# Old workspace scripts from root
mv check_sheets.sql schemas/archive/workspace-specific/
mv fix_runtime_errors.sql schemas/archive/workspace-specific/
```

### Step 4: Move Test Scripts
```bash
mv backend/QUERY_OPTIMIZATION_TEST.sql schemas/archive/test-scripts/
```

### Step 5: Consolidate Seed Scripts
```bash
# Move seed scripts to schemas directory
mv seed_pcb_data.sql schemas/
mv seed_canonical_labels.sql schemas/

# Update these files to use serverless_dxukih_catalog.ontos_ml
```

### Step 6: Review Backend SQL Files
```bash
# Review and potentially archive
# backend/create_training_tables.sql - Compare with 05_training_sheets.sql
```

### Step 7: Add Archive README
Create `schemas/archive/README.md` documenting archived files.

### Step 8: Update Documentation
Update the following to reflect new structure:
- `schemas/README.md` - Update file listings
- `CLAUDE.md` - Note schema organization
- This cleanup plan with completion status

## Post-Cleanup Verification

After cleanup, verify:

1. **All numbered schema files exist** (01-08, 99)
2. **Active migrations are present** (add_ml_columns_*, fix_monitor_schema.sql)
3. **Documentation is complete** (README, SCHEMA_REFERENCE, MIGRATION_HISTORY)
4. **Seed scripts are organized** (all in schemas/, not scattered)
5. **Archive has README** explaining archived files
6. **No broken references** in documentation or scripts

### Verification Commands
```bash
# Count core schema files (should be 9: 01-08 plus 99)
ls schemas/0*.sql schemas/99*.sql | wc -l

# List active migrations (should be 3)
ls schemas/add_*.sql schemas/fix_*.sql 2>/dev/null | grep -v archive | wc -l

# List seed scripts
ls schemas/seed*.sql 2>/dev/null | grep -v archive

# Verify documentation
ls schemas/*.md | grep -E "(README|SCHEMA_REFERENCE|MIGRATION_HISTORY|CLEANUP_PLAN)"
```

## Archive Directory Structure

After cleanup:
```
schemas/
├── archive/
│   ├── README.md                              # Explains archived files
│   ├── superseded/
│   │   ├── create_monitor_alerts.sql         # → fix_monitor_schema.sql
│   │   ├── add_flagged_column.sql            # → fix_monitor_schema.sql
│   │   ├── create_model_training_lineage.sql # → 07_model_training_lineage.sql
│   │   └── fix_monitor_schema_simple.sql     # → fix_monitor_schema.sql
│   ├── workspace-specific/
│   │   ├── check_sheets.sql                  # erp-demonstrations workspace
│   │   └── fix_runtime_errors.sql            # erp-demonstrations workspace
│   └── test-scripts/
│       └── QUERY_OPTIMIZATION_TEST.sql       # Test queries
```

## Benefits of This Cleanup

1. **Clear Schema Evolution** - Migration history documents all changes
2. **No Confusion** - Active vs. superseded files clearly separated
3. **Easier Onboarding** - New developers see only relevant files
4. **Better Git History** - Archive preserves history without cluttering main dir
5. **Safer Operations** - Less risk of running wrong/old migration scripts
6. **Documentation** - Clear record of what was changed and why

## Next Steps After Cleanup

1. **Test Schema Creation** - Run numbered files in clean environment
2. **Verify Migrations** - Test add_ml_columns and fix_monitor_schema
3. **Update Scripts** - Ensure Python scripts reference correct files
4. **Document Patterns** - Add migration patterns to MIGRATION_HISTORY.md
5. **CI/CD Integration** - Consider automated schema validation

## Rollback Plan

If cleanup causes issues:
```bash
# Restore from archive
cp schemas/archive/superseded/* schemas/
cp schemas/archive/workspace-specific/* ./
cp schemas/archive/test-scripts/* backend/
```

Git history also preserves all files before cleanup.

## Questions/Decisions

### Should we keep specialized Python scripts?
**Decision:** Keep for now. They provide specific utilities:
- `create_*_table.py` - Interactive table creation with validation
- `seed_*.py` - Targeted seed data for specific tables
- `verify_*.py` - Specific verification logic

**Alternative:** Consolidate into fewer general-purpose scripts in future cleanup phase.

### Should seed scripts be in schemas/ or separate directory?
**Decision:** Keep in schemas/ directory for now.
- They're closely related to schema files
- Easier to find when setting up new environments
- Can be separated later if they grow significantly

### What about backend SQL files?
**Decision:** Review case-by-case:
- `create_training_tables.sql` - Archive if redundant with schemas/05 and 06
- Test SQL files - Move to schemas/archive/test-scripts/

## Completion Checklist

- [ ] Archive superseded migrations
- [ ] Archive workspace-specific scripts
- [ ] Archive test scripts
- [ ] Consolidate seed scripts to schemas/
- [ ] Create archive/README.md
- [ ] Update schemas/README.md
- [ ] Verify no broken references
- [ ] Run verification commands
- [ ] Test schema creation in clean environment
- [ ] Git commit with clear message
- [ ] Update CLAUDE.md if needed
