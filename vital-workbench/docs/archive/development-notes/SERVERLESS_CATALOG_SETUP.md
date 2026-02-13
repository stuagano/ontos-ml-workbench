# Serverless Catalog Setup Guide

## Quick Setup for Demo

Your VITAL Workbench is configured to use:
- **Catalog**: `serverless_dxukih_catalog`
- **Schema**: `mirion`

## Step 1: Create Database Tables (5 minutes)

### Option A: Databricks SQL Editor (Recommended)

1. Open Databricks workspace: https://fevm-serverless-dxukih.cloud.databricks.com
2. Navigate to **SQL Editor**
3. Open the file: `schemas/setup_serverless_catalog.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run All** (or press Cmd/Ctrl + Enter)
7. Wait ~2-3 minutes for all tables to create
8. Verify success - you should see:
   ```
   SUCCESS: All VITAL Workbench tables created in serverless_dxukih_catalog.mirion
   ```

### Option B: Databricks CLI

```bash
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench

databricks sql execute \
  --warehouse-id 387bcda0f2ece20c \
  --file schemas/setup_serverless_catalog.sql
```

## Step 2: Verify Tables Created

Run this in SQL Editor to confirm all tables exist:

```sql
USE CATALOG serverless_dxukih_catalog;
USE SCHEMA mirion;

SHOW TABLES;
```

You should see 11 tables:
- ✅ sheets
- ✅ templates
- ✅ canonical_labels
- ✅ training_sheets
- ✅ qa_pairs
- ✅ model_training_lineage
- ✅ example_store
- ✅ feedback_items
- ✅ monitor_alerts
- ✅ curated_datasets

## Step 3: Seed Sample Data (Optional, 5 minutes)

If you want demo data, you have two options:

### Option A: Quick Sample Data

```bash
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench

# Update the catalog in the seed script first
python3 scripts/seed_test_data.py \
  --catalog serverless_dxukih_catalog \
  --schema mirion
```

### Option B: Use Existing Data

If you already have data in `serverless_dxukih_catalog.mirion.customers`, you can:

1. Query your existing tables:
   ```sql
   SELECT * FROM serverless_dxukih_catalog.mirion.customers LIMIT 10;
   ```

2. Create sheets pointing to your data:
   ```sql
   INSERT INTO serverless_dxukih_catalog.mirion.sheets (
     id, name, description,
     source_type, source_table,
     item_id_column, status,
     created_by, updated_by
   ) VALUES (
     'customer-data-001',
     'Mirion Customer Data',
     'Customer records from customers table',
     'uc_table',
     'serverless_dxukih_catalog.mirion.customers',
     'id',
     'active',
     'setup',
     'setup'
   );
   ```

## Step 4: Restart Backend

Your backend is already configured to use the new catalog. Just verify it's running:

```bash
# Check backend status
lsof -ti:8000 && echo "✓ Backend running" || echo "✗ Backend not running"

# If not running, start it:
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench/backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
```

## Step 5: Test the Application

Open your browser to: **http://localhost:8000**

Navigate to:
1. **DATA Stage** - Should show sheets (empty if no sample data)
2. **TOOLS → Canonical Labels** - Access the labeling tool
3. **API Docs** - http://localhost:8000/docs - Test endpoints

## Verification Checklist

- [ ] All 11 tables created in `serverless_dxukih_catalog.mirion`
- [ ] Backend `.env` file points to correct catalog
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Application loads at http://localhost:8000
- [ ] No errors in browser console
- [ ] API docs accessible at http://localhost:8000/docs

## Troubleshooting

### Issue: "Catalog not found"
```bash
# Verify catalog exists
databricks catalogs list | grep serverless_dxukih_catalog
```

### Issue: "Permission denied"
You need `USE CATALOG` and `CREATE TABLE` permissions on `serverless_dxukih_catalog.mirion`

### Issue: "Tables already exist"
The script uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times

### Issue: Backend still showing errors
```bash
# Check backend logs
tail -f /tmp/backend.log

# Restart backend
lsof -ti:8000 | xargs kill -9
cd backend && python3 -m uvicorn app.main:app --reload --port 8000 &
```

## Next Steps

Once tables are created:
1. Review **DEMO_GUIDE.md** for demo walkthrough
2. Seed sample data (optional)
3. Start demonstrating the 7-stage workflow

## Files Reference

- **Schema Script**: `schemas/setup_serverless_catalog.sql`
- **Backend Config**: `backend/.env`
- **Sample Data**: `synthetic_data/` directory
- **Demo Guide**: `DEMO_GUIDE.md`
