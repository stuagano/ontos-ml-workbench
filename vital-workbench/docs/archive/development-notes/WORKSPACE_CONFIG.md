# Workspace Configuration - FEVM Primary

**Last Updated**: February 10, 2026
**Status**: Configured and tested

---

## Primary Workspace: FEVM

**All development and deployment uses the FEVM workspace.**

```bash
Workspace:  https://fevm-serverless-dxukih.cloud.databricks.com
Profile:    fe-vm-serverless-dxukih
Catalog:    serverless_dxukih_catalog
Schema:     mirion
Warehouse:  387bcda0f2ece20c
```

---

## Configuration Files

### backend/.env
```bash
DATABRICKS_HOST=https://fevm-serverless-dxukih.cloud.databricks.com
DATABRICKS_CATALOG=serverless_dxukih_catalog
DATABRICKS_SCHEMA=mirion
DATABRICKS_WAREHOUSE_ID=387bcda0f2ece20c
DATABRICKS_CONFIG_PROFILE=fe-vm-serverless-dxukih
```

### databricks.yml
```yaml
targets:
  fevm:  # Default target
    mode: development
    default: true
    workspace:
      profile: fe-vm-serverless-dxukih
    variables:
      catalog: serverless_dxukih_catalog
      schema: mirion
      warehouse_id: "387bcda0f2ece20c"
```

---

## Tables in FEVM

Location: `serverless_dxukih_catalog.mirion`

**Core Tables**:
- sheets
- templates
- canonical_labels
- training_sheets
- qa_pairs
- model_training_lineage
- example_store
- monitor_alerts ✅ (added during restoration)

**Domain Tables**:
- curated_datasets
- labelsets
- training_jobs
- feedback_items (with flagged column ✅)

---

## Why FEVM?

1. **Serverless compute** - Fast, auto-scaling SQL warehouse
2. **Data already exists** - All tables created and seeded here
3. **Dedicated workspace** - Isolated from other projects
4. **Stable configuration** - No bouncing between workspaces

---

## DO NOT Change

**Keep these values consistent**:
- Catalog: `serverless_dxukih_catalog` (not home_stuart_gano)
- Schema: `mirion` (not mirion_vital_workbench)
- Workspace: FEVM (not e2-demo-west or logfood)

**If you need to use a different workspace**:
- Create a new DAB target in `databricks.yml`
- Copy schema using Databricks replication
- Update only that target's config

---

## Verification

Check current config:
```bash
cat backend/.env | grep DATABRICKS
```

Should output:
```
DATABRICKS_HOST=https://fevm-serverless-dxukih.cloud.databricks.com
DATABRICKS_CATALOG=serverless_dxukih_catalog
DATABRICKS_SCHEMA=mirion
DATABRICKS_WAREHOUSE_ID=387bcda0f2ece20c
DATABRICKS_CONFIG_PROFILE=fe-vm-serverless-dxukih
```

---

## Testing Connection

```bash
cd backend
uvicorn app.main:app --reload

# In another terminal:
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/sheets
```

Expected: 200 responses, no errors

---

## History

**Before cleanup** (bounced between 6+ configs):
- ❌ home_stuart_gano.mirion_vital_workbench
- ❌ main.vital_workbench_dev
- ❌ serverless_dxukih_catalog.mirion
- ❌ e2-demo-west workspace
- ❌ logfood workspace
- ❌ Multiple conflicting .env files

**After cleanup** (single source of truth):
- ✅ serverless_dxukih_catalog.mirion (FEVM)
- ✅ One workspace, one config
- ✅ All tables in same location

**Lesson learned**: Stick with one workspace. Don't bounce around.

---

## Reference

- Configuration details: `backend/.env`
- Deployment targets: `databricks.yml`
- Schema structure: `schemas/README.md`
- Restoration report: `RESTORATION_COMPLETE.md`
