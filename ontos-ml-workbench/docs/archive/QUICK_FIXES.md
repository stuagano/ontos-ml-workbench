# Quick Fixes for Localhost Runtime Errors

**Date:** 2026-02-08
**Environment:** localhost deployment
**Status:** 3 backend issues require immediate attention

## Summary of Issues

After deployment verification on localhost, we found:
- ✅ **Frontend:** 0 errors - Production ready
- ❌ **Backend:** 3 database/SQL issues blocking Monitor & Improve pages

---

## Issue 1: Missing `monitor_alerts` Table ❌

**Error:** `TABLE_OR_VIEW_NOT_FOUND: monitor_alerts`
**Affects:** `/api/v1/monitoring/alerts` endpoint
**Impact:** Monitor page cannot display alerts

### Quick Fix (Option A: Databricks SQL Editor - RECOMMENDED)

1. Open Databricks SQL Editor
2. Select warehouse: `Shared SQL Endpoint - Cutting Edge (071969b1ec9a91ca)`
3. Execute:

```sql
CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`ontos_ml_workbench`.monitor_alerts (
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
COMMENT 'Monitoring alerts for deployed model endpoints';
```

### Quick Fix (Option B: CLI - if you have databricks CLI configured)

```bash
databricks sql-editor execute \
  --warehouse-id 071969b1ec9a91ca \
  --file schemas/create_monitor_alerts.sql
```

### Verify Fix

```bash
curl -s "http://localhost:8000/api/v1/monitoring/alerts?status=active"
# Should return [] instead of 500 error
```

---

## Issue 2: Feedback Stats Type Error ❌

**Error:** `'>' not supported between instances of 'str' and 'int'`
**Affects:** `/api/v1/feedback/stats` endpoint
**Impact:** Monitor and Improve pages cannot display feedback statistics
**Root Cause:** `rating` column is STRING in database but code expects INT

### Quick Fix: Restart Backend

The code fix is already in place (CAST rating AS INT), but backend needs restart to pick it up.

**Option A: Find and kill existing backend, then restart:**

```bash
# Find the backend process
ps aux | grep "uvicorn app.main:app"

# Kill it (replace PID with actual process ID)
kill <PID>

# OR use pkill
pkill -f "uvicorn app.main:app"

# Start fresh backend
cd /Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/backend
uvicorn app.main:app --reload
```

**Option B: If using APX:**

```bash
cd /Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench
apx dev stop
apx dev start
```

### Verify Fix

```bash
curl -s "http://localhost:8000/api/v1/feedback/stats"
# Should return stats object instead of 500 error
```

---

## Issue 3: Missing `flagged` Column ❌

**Error:** `UNRESOLVED_COLUMN: flagged`
**Affects:** `/api/v1/monitoring/metrics/performance` endpoint
**Impact:** Monitor page cannot display performance metrics
**Root Cause:** `feedback_items` table missing `flagged` column (old schema)

### Quick Fix (Option A: Databricks SQL Editor - RECOMMENDED)

1. Open Databricks SQL Editor
2. Select warehouse: `Shared SQL Endpoint - Cutting Edge`
3. Execute:

```sql
ALTER TABLE `erp-demonstrations`.`ontos_ml_workbench`.feedback_items
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
```

### Quick Fix (Option B: Recreate feedback_items table)

**WARNING:** This will delete all existing feedback data!

```sql
DROP TABLE IF EXISTS `erp-demonstrations`.`ontos_ml_workbench`.feedback_items;

CREATE TABLE `erp-demonstrations`.`ontos_ml_workbench`.feedback_items (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,
  request_id STRING,
  trace_id STRING,
  input_data STRING,
  output_data STRING,
  rating INT,
  feedback_text STRING,
  feedback_labels STRING,
  flagged BOOLEAN DEFAULT FALSE,
  user_id STRING,
  session_id STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  CONSTRAINT feedback_items_pk PRIMARY KEY (id)
) USING DELTA
COMMENT 'User feedback on model responses';
```

### Verify Fix

```bash
curl -s "http://localhost:8000/api/v1/monitoring/metrics/performance?hours=24"
# Should return [] or metrics array instead of 500 error
```

---

## All-in-One Fix Script

Execute all fixes at once via Databricks SQL Editor:

```sql
-- Fix 1: Create monitor_alerts table
CREATE TABLE IF NOT EXISTS `erp-demonstrations`.`ontos_ml_workbench`.monitor_alerts (
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
) USING DELTA;

-- Fix 3: Add flagged column to feedback_items
ALTER TABLE `erp-demonstrations`.`ontos_ml_workbench`.feedback_items
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;

-- Verify tables exist
SHOW TABLES IN `erp-demonstrations`.`ontos_ml_workbench`;

-- Verify feedback_items schema
DESCRIBE TABLE `erp-demonstrations`.`ontos_ml_workbench`.feedback_items;
```

Then restart the backend (Fix 2).

---

## Verification Steps

After applying all fixes:

### 1. Check Backend Health

```bash
curl -s http://localhost:8000/api/config
```

Expected: Configuration JSON with catalog/schema

### 2. Test All Fixed Endpoints

```bash
# Monitor alerts (Fix 1)
curl -s "http://localhost:8000/api/v1/monitoring/alerts?status=active"
# Expected: [] (empty array)

# Feedback stats (Fix 2)
curl -s "http://localhost:8000/api/v1/feedback/stats"
# Expected: stats object with total, positive, negative counts

# Performance metrics (Fix 3)
curl -s "http://localhost:8000/api/v1/monitoring/metrics/performance?hours=24"
# Expected: [] or array of metrics
```

### 3. Test in Browser

1. Open http://localhost:5173
2. Navigate to Deploy page - should work perfectly ✅
3. Click "Continue to Monitor" - should load without console errors ✅
4. Navigate to Improve page - should load without console errors ✅
5. Open browser console (F12) - should show 0 errors ✅

---

## Expected Results After Fixes

### Console Errors: Before vs After

**Before:**
```
[ERROR] Failed to load resource: monitor_alerts (500)
[ERROR] Failed to load resource: feedback/stats (500)
[ERROR] Failed to load resource: metrics/performance (500)
```

**After:**
```
(no errors)
```

### Monitor Page: Before vs After

**Before:**
- ❌ "Failed to load alerts" error
- ❌ "Failed to load metrics" error
- ❌ "Failed to load feedback stats" error
- ⚠️ Endpoint list loads (only working feature)

**After:**
- ✅ Alerts panel shows "No active alerts"
- ✅ Performance metrics display (or empty state)
- ✅ Feedback stats show "0 feedback items"
- ✅ Endpoint list loads perfectly

### Improve Page: Before vs After

**Before:**
- ❌ "Failed to load feedback stats" error
- ❌ "Failed to load gaps" error
- ⚠️ UI renders but with errors

**After:**
- ✅ Feedback stats show "0 total feedback"
- ✅ Gap analysis shows "No gaps identified"
- ✅ UI renders perfectly with empty states

---

## Troubleshooting

### If monitor_alerts creation fails

**Error:** "User does not have CREATE TABLE permission"
**Solution:** Ask workspace admin to grant CREATE TABLE on schema, or use existing schema with permissions

### If backend won't restart

**Error:** "Address already in use" or port 8000 busy
**Solution:**
```bash
lsof -ti:8000 | xargs kill -9
# Then restart
cd backend && uvicorn app.main:app --reload
```

### If column addition fails

**Error:** "Column already exists" or "ALTER TABLE failed"
**Solution:** Column might already exist but with different type. Check schema:
```sql
DESCRIBE TABLE `erp-demonstrations`.`ontos_ml_workbench`.feedback_items;
```

### If still seeing errors after fixes

1. **Hard refresh browser:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear React Query cache:** Restart frontend dev server
3. **Check backend logs:** Look at terminal where uvicorn is running
4. **Verify all tables exist:**
```sql
SELECT table_name
FROM `erp-demonstrations`.`ontos_ml_workbench`.information_schema.tables
WHERE table_name IN ('monitor_alerts', 'feedback_items');
```

---

## Optional: Seed Test Data

After fixing all issues, optionally seed test data for demo purposes:

```bash
cd /Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench
python3 scripts/seed_test_data.py \
  --catalog erp-demonstrations \
  --schema ontos_ml_workbench
```

This will create sample:
- Feedback items (10 per endpoint)
- Monitor alerts (5 active alerts)
- Gap analysis data

---

## Next Steps

After completing all fixes:

1. ✅ Run full E2E test suite
   ```bash
   cd frontend && npm run e2e
   ```

2. ✅ Commit fixes to git
   ```bash
   git add schemas/create_monitor_alerts.sql
   git add schemas/add_flagged_column.sql
   git add LOCALHOST_DEPLOYMENT_REPORT.md
   git add QUICK_FIXES.md
   git commit -m "fix: resolve localhost deployment runtime errors

   - Create missing monitor_alerts table
   - Fix feedback stats type casting (restart backend)
   - Add missing flagged column to feedback_items
   - Document all fixes and verification steps"
   ```

3. ✅ Deploy to Databricks staging
   ```bash
   databricks bundle deploy -t dev
   ```

4. ✅ Update deployment documentation
   - Mark issues as resolved in DEPLOY_MONITOR_IMPROVE_IMPLEMENTATION.md
   - Update TESTING.md with passing results

---

**Questions?** Check:
- Full report: `LOCALHOST_DEPLOYMENT_REPORT.md`
- Backend API reference: `backend/ENDPOINT_QUICK_REFERENCE.md`
- Deployment guide: `DEPLOYMENT.md`
