# Schema Cleanup Plan - Consolidate to Single Source of Truth

## Current Mess - 6+ Different Catalog/Schema Combinations

### Found Configurations:

1. **`serverless_dxukih_catalog.mirion`**
   - Location: `backend/.env` (ACTIVE), `databricks.yml` fevm target
   - SQL Files: `setup_serverless_catalog*.sql` (4 variations!)
   - Warehouse: `387bcda0f2ece20c`

2. **`home_stuart_gano.mirion_vital_workbench`**
   - Location: `backend/.env.example`, `schemas/01_create_catalog.sql`
   - Purpose: Primary development schema

3. **`home_stuart_gano.vital_workbench`**
   - Location: `databricks.yml` logfood target

4. **`main.vital_workbench_dev`**
   - Location: `databricks.yml` dev target

5. **`main.vital_workbench`**
   - Location: `databricks.yml` default variables

6. **`erp-demonstrations.vital_workbench`**
   - Location: `schemas/create_tables.sql`

7. **`vital_workbench.main`**
   - Location: APX version `.env.example`

8. **Various others** in test scripts and seed data

---

## Root Cause Analysis

**Problem**: No single source of truth for catalog/schema configuration
- Backend `.env` points to serverless catalog
- Backend `.env.example` points to home catalog
- Schema SQL files hardcode different catalogs
- DAB bundle has 3 different targets with different configs
- APX version has its own config

**Impact**:
- Tables created in wrong catalog
- Backend can't find tables (catalog mismatch)
- Confusion about which warehouse to use
- Multiple stale schema setup scripts

---

## Decision: Single Source of Truth

**Primary Development Location:**
```
Catalog: home_stuart_gano
Schema: mirion_vital_workbench
```

**Reasoning:**
1. ✅ No metastore admin required (home catalog is user-owned)
2. ✅ Already has tables per `schemas/01_create_catalog.sql`
3. ✅ Matches `.env.example` (reference configuration)
4. ✅ Personal development space (isolated from shared workspaces)

**Secondary Targets** (for deployment only):
- **fevm**: `serverless_dxukih_catalog.mirion` (shared FEVM workspace)
- **production**: TBD (when metastore admin available)

---

## Cleanup Actions

### Phase 1: Fix Backend Configuration (IMMEDIATE)

**Action**: Update `backend/.env` to match primary development location

```bash
# backend/.env - WRONG (currently points to serverless)
DATABRICKS_CATALOG=serverless_dxukih_catalog
DATABRICKS_SCHEMA=mirion
DATABRICKS_WAREHOUSE_ID=387bcda0f2ece20c
DATABRICKS_CONFIG_PROFILE=fe-vm-serverless-dxukih

# backend/.env - CORRECT (should point to home catalog)
DATABRICKS_CATALOG=home_stuart_gano
DATABRICKS_SCHEMA=mirion_vital_workbench
DATABRICKS_WAREHOUSE_ID=<your-warehouse-id>
DATABRICKS_CONFIG_PROFILE=<your-profile>
```

**Verification:**
```bash
# Check backend can connect to correct schema
curl "http://localhost:8000/api/v1/sheets" | jq .
# Should return sheets from home_stuart_gano.mirion_vital_workbench
```

---

### Phase 2: Delete Stale Schema Files (IMMEDIATE)

**Keep Only:**
- ✅ `schemas/01_create_catalog.sql` through `schemas/08_example_store.sql` (numbered series)
- ✅ `schemas/fix_monitor_schema.sql` (needed fix)
- ✅ `schemas/add_flagged_column.sql` (needed fix)
- ✅ `schemas/README.md` (documentation)

**DELETE:**
- ❌ `schemas/setup_serverless_catalog.sql`
- ❌ `schemas/setup_serverless_catalog_fixed.sql`
- ❌ `schemas/setup_serverless_catalog_simple.sql`
- ❌ `schemas/setup_serverless_final.sql`
- ❌ `schemas/create_tables.sql` (uses wrong catalog: erp-demonstrations)
- ❌ `schemas/init.sql` (old template-based approach)

**Reasoning**: These files hardcode different catalogs and create confusion. The numbered series (01-08) is the authoritative schema.

---

### Phase 3: Clean Up Root Directory Documentation (IMMEDIATE)

**Keep Essential Docs:**
- ✅ `README.md`
- ✅ `CLAUDE.md`
- ✅ `DEPLOYMENT.md`
- ✅ `APX_INSTALLATION_GUIDE.md`

**Move to `docs/archive/`:**
- `ACTION_ITEMS_CHECKLIST.md` (merge into main docs)
- `AGENT_WORKFLOW.md` (internal process)
- `BOOTSTRAP_VERIFICATION.md` (one-time analysis)
- `CHARTS_IMPLEMENTATION.md` (completed work)
- `DEMO_DATA_SETUP.md` (merge into README)
- `DEMO_GUIDE.md` (merge into README)
- `DEMO_MONITOR_CHECKLIST.md` (completed work)
- `DEPLOYMENT_CHECKLIST.md` (merge into DEPLOYMENT.md)
- `DEPLOYMENT_INDEX.md` (redundant)
- `DEPLOY_MONITOR_IMPROVE_IMPLEMENTATION.md` (completed work)
- `FINAL_STATUS.md` (point-in-time snapshot)
- `FINAL_VERIFICATION.md` (point-in-time snapshot)
- `MIGRATION.md` (if migration is complete)
- `MONITORING_SETUP.md` (merge into DEPLOYMENT.md)
- `MONITOR_PAGE_INTEGRATION.md` (completed work)
- `PRODUCTION_CHECKLIST.md` (merge into DEPLOYMENT.md)
- `QUICK_FIXES.md` (obsolete after fixes applied)
- `QUICK_FIX_MISSING_TABLES.md` (obsolete after fixes applied)
- `RUNBOOK.md` (keep if operational, else archive)
- `SERVERLESS_CATALOG_SETUP.md` (secondary deployment - move to docs/)
- `TESTING.md` (merge into README)
- `TMUX_SETUP.md` (merge into README)
- `VERIFICATION_RESULTS.md` (point-in-time snapshot)
- `WORKFLOWS.md` (merge into README)

**Result**: Clean root directory with only essential project docs

---

### Phase 4: Update DAB Bundle Config (IMMEDIATE)

**File**: `databricks.yml`

**Current State**: 3 targets with conflicting configs
**Target State**: 1 primary dev target, clear separation

```yaml
targets:
  dev:
    mode: development
    default: true
    workspace:
      profile: <your-primary-profile>
    variables:
      catalog: home_stuart_gano
      schema: mirion_vital_workbench
      warehouse_id: <your-warehouse-id>

  fevm:
    mode: development
    workspace:
      profile: fe-vm-serverless-dxukih
      host: https://fevm-serverless-dxukih.cloud.databricks.com
    variables:
      catalog: serverless_dxukih_catalog
      schema: mirion
      warehouse_id: "387bcda0f2ece20c"
```

**Remove**: `logfood` target (unless actively used)

---

### Phase 5: Verify Tables Exist in Correct Location

**Check Primary Development Schema:**
```sql
-- Run in Databricks SQL Editor
USE CATALOG home_stuart_gano;
USE SCHEMA mirion_vital_workbench;

SHOW TABLES;

-- Expected tables:
-- sheets, templates, canonical_labels, training_sheets, qa_pairs,
-- model_training_lineage, example_store, curated_datasets, labelsets,
-- training_jobs, training_job_lineage, training_job_metrics, training_job_events
```

**If tables missing**, run schema creation:
```bash
cd schemas
databricks sql --file 01_create_catalog.sql
databricks sql --file 02_sheets.sql
# ... through 08_example_store.sql
```

---

### Phase 6: Apply Missing Table Fixes

**Missing Tables Identified:**
1. `monitor_alerts` - Needed for Monitor stage
2. Missing `flagged` column on `feedback_items`

**Fix Script**: `fix_runtime_errors.sql`

**Execute:**
```bash
# Option 1: SQL Editor (recommended)
# Copy contents and execute with:
#   USE CATALOG home_stuart_gano;
#   USE SCHEMA mirion_vital_workbench;

# Option 2: CLI
databricks sql exec \
  --file fix_runtime_errors.sql \
  --warehouse-id <your-warehouse-id> \
  --catalog home_stuart_gano \
  --schema mirion_vital_workbench
```

---

### Phase 7: Update Documentation

**Update References:**
1. `README.md` - Update schema location
2. `DEPLOYMENT.md` - Clarify primary vs deployment targets
3. `CLAUDE.md` - Update table location reference

**Add Section to README:**
```markdown
## Database Configuration

**Primary Development:**
- Catalog: `home_stuart_gano`
- Schema: `mirion_vital_workbench`
- Purpose: Local development and testing

**Deployment Targets:**
- FEVM: `serverless_dxukih_catalog.mirion`
- Production: TBD (requires metastore admin)

**Important**: Always use `backend/.env` for local development configuration.
Never hardcode catalog/schema in SQL files - use variables or config.
```

---

## Execution Checklist

- [ ] 1. Update `backend/.env` to point to `home_stuart_gano.mirion_vital_workbench`
- [ ] 2. Restart backend to pick up new config
- [ ] 3. Test API endpoints: `curl http://localhost:8000/api/v1/sheets`
- [ ] 4. Delete stale schema SQL files (list above)
- [ ] 5. Create `docs/archive/` and move old docs
- [ ] 6. Update `databricks.yml` with clean targets
- [ ] 7. Verify tables exist: `SHOW TABLES IN home_stuart_gano.mirion_vital_workbench;`
- [ ] 8. Execute `fix_runtime_errors.sql` if tables missing
- [ ] 9. Update README/CLAUDE.md/DEPLOYMENT.md with correct locations
- [ ] 10. Test full workflow: DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE

---

## Post-Cleanup State

**Single Source of Truth:**
- Development: `home_stuart_gano.mirion_vital_workbench` (in `backend/.env`)
- Schema Files: `schemas/01-08*.sql` (numbered series only)
- DAB Config: `databricks.yml` with clear dev/fevm separation
- Clean Docs: Essential docs in root, historical docs in `docs/archive/`

**Result:**
- ✅ No more confusion about which catalog/schema to use
- ✅ Backend connects to correct database
- ✅ Clear separation between dev and deployment
- ✅ Clean project structure

---

## Timeline

**Total Time**: ~30 minutes

1. **Backend config fix** (2 min)
2. **Delete stale files** (5 min)
3. **Archive old docs** (10 min)
4. **Update databricks.yml** (3 min)
5. **Execute schema fixes** (2 min)
6. **Update documentation** (5 min)
7. **Verification testing** (3 min)

**Ready to execute?** Start with Phase 1 (backend config) as it's the most critical.
