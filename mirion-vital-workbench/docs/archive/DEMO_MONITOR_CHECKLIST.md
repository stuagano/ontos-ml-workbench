# Monitor Stage Demo Preparation Checklist

## Pre-Demo Database Fixes

### 1. Fix Monitor Schema Issues ✅

**What**: Fix two missing database schema elements
**Why**: Monitor stage endpoints fail without these

**Steps**:
- [ ] Open Databricks SQL Editor
- [ ] Copy/paste contents of `schemas/fix_monitor_schema.sql`
- [ ] Execute the script
- [ ] Verify both fixes completed (see verification queries at end of script)

**Expected Results**:
- ✅ `monitor_alerts` table created (13 columns)
- ✅ `feedback_items.flagged` column added (BOOLEAN)
- ✅ Verification queries return positive results

**Time**: 2-3 minutes

---

### 2. Restart Backend

**What**: Restart the backend to pick up schema changes
**Why**: Ensure all services reconnect to updated tables

**Steps**:

**If using APX**:
```bash
apx dev stop
apx dev start
```

**If using manual setup**:
```bash
# Stop backend (Ctrl+C)
# Restart
cd backend
uvicorn app.main:app --reload
```

**Verification**:
- [ ] Backend starts without errors
- [ ] Check logs for "Application startup complete"
- [ ] No database schema errors in logs

**Time**: 1 minute

---

### 3. Test Monitor Endpoints

**What**: Verify Monitor stage API endpoints work
**Why**: Confirm schema fixes are effective

**Steps**:

**Quick Test** (any endpoint should work now):
```bash
curl http://localhost:8000/api/v1/monitoring/alerts
```

**Expected**: `[]` (empty array, not an error)

**Comprehensive Test**:
```bash
# List alerts (should return empty array)
curl http://localhost:8000/api/v1/monitoring/alerts

# Get performance metrics (should return empty array or metrics)
curl http://localhost:8000/api/v1/monitoring/metrics/performance

# Health check (requires endpoint_id - may 404 if no endpoints)
curl http://localhost:8000/api/v1/monitoring/health/test-endpoint-id
```

**Time**: 2 minutes

---

## Optional: Seed Demo Data

### 4. Create Sample Endpoints (Optional)

**What**: Add sample endpoints for monitoring demo
**Why**: Makes Monitor stage look realistic with data

**SQL**:
```sql
-- Create sample endpoint
INSERT INTO home_stuart_gano.mirion_vital_workbench.endpoints_registry
(id, name, description, endpoint_name, endpoint_type, status, created_at)
VALUES (
  'demo-defect-detection-v1',
  'Defect Detection Model v1',
  'Production model for weld defect detection',
  'defect-detection-model-v1',
  'model',
  'ready',
  current_timestamp()
);
```

**Time**: 5 minutes (if doing this)

---

### 5. Create Sample Feedback (Optional)

**What**: Add sample feedback items with varied ratings
**Why**: Enables metrics and drift detection demos

**SQL**:
```sql
-- Create sample feedback items
INSERT INTO home_stuart_gano.mirion_vital_workbench.feedback_items
(id, endpoint_id, request_id, rating, feedback_text, flagged, created_at)
VALUES
  ('fb-1', 'demo-defect-detection-v1', 'req-1', 5, 'Perfect detection', FALSE, current_timestamp()),
  ('fb-2', 'demo-defect-detection-v1', 'req-2', 4, 'Good results', FALSE, current_timestamp()),
  ('fb-3', 'demo-defect-detection-v1', 'req-3', 2, 'Missed defect', TRUE, current_timestamp()),
  ('fb-4', 'demo-defect-detection-v1', 'req-4', 5, 'Excellent', FALSE, current_timestamp()),
  ('fb-5', 'demo-defect-detection-v1', 'req-5', 1, 'False positive', TRUE, current_timestamp());
```

**Time**: 5 minutes (if doing this)

---

### 6. Create Sample Alerts (Optional)

**What**: Add sample monitoring alerts
**Why**: Demonstrates alert system in Monitor stage

**SQL**:
```sql
-- Create sample alert
INSERT INTO home_stuart_gano.mirion_vital_workbench.monitor_alerts
(id, endpoint_id, alert_type, threshold, condition, status, message, created_at)
VALUES (
  'alert-1',
  'demo-defect-detection-v1',
  'error_rate',
  5.0,
  'gt',
  'active',
  'Error rate exceeds 5% threshold',
  current_timestamp()
);
```

**Time**: 5 minutes (if doing this)

---

## Frontend Verification

### 7. Test Monitor Stage UI

**What**: Navigate to Monitor stage and verify no errors
**Why**: Confirm end-to-end functionality

**Steps**:
- [ ] Open browser to `http://localhost:5173` (frontend)
- [ ] Navigate to MONITOR stage
- [ ] Check browser console for errors (F12 → Console)
- [ ] Verify metrics cards load (even if showing 0s)
- [ ] Verify alerts section loads
- [ ] Verify no red error messages or crashes

**Expected**:
- ✅ Page loads without errors
- ✅ Metrics section visible (may show "No data" if no endpoints)
- ✅ Alerts section visible (may be empty)
- ✅ No console errors related to database schema

**Time**: 2 minutes

---

## Rollback Plan (If Needed)

If something goes wrong during demo prep:

### Rollback Database Changes
```sql
-- Remove monitor_alerts table
DROP TABLE IF EXISTS home_stuart_gano.mirion_vital_workbench.monitor_alerts;

-- Note: Cannot remove flagged column easily in Delta Lake
-- Best approach: Keep the column (it's harmless)
```

### Restore Original State
```bash
# Stop backend
apx dev stop  # or Ctrl+C if manual

# Reset database to clean state (NUCLEAR option)
databricks sql execute --file schemas/init.sql

# Restart backend
apx dev start
```

---

## Demo Day Checklist

### Before Presenting Monitor Stage:
- [ ] Backend is running without errors
- [ ] Frontend is running and accessible
- [ ] Monitor schema fixes applied
- [ ] At least one sample endpoint exists (optional)
- [ ] Some sample feedback data exists (optional)
- [ ] Browser console is clear of errors
- [ ] Monitor page loads successfully

### Demo Flow Suggestion:
1. Show Monitor stage overview
2. Navigate to performance metrics (even if empty)
3. Show alerts section (create alert if demo data exists)
4. Explain drift detection capability
5. Show health check dashboard

---

## Quick Reference

| Item | File | Status |
|------|------|--------|
| Schema Fix Script | `schemas/fix_monitor_schema.sql` | ✅ Ready |
| Detailed Instructions | `schemas/MONITOR_SCHEMA_FIX_INSTRUCTIONS.md` | ✅ Ready |
| Quick Summary | `MONITOR_FIX_SUMMARY.md` | ✅ Ready |
| Backend Code | `backend/app/api/v1/endpoints/monitoring.py` | ✅ Verified |
| Tasks Completed | #1, #2 | ✅ Done |

---

## Troubleshooting

### Issue: "Table already exists"
**Solution**: This is fine - script uses IF NOT EXISTS

### Issue: "Column already exists"
**Solution**: This is fine - script uses ADD COLUMN IF NOT EXISTS

### Issue: Backend errors after restart
**Solution**:
```bash
# Check backend logs
tail -f backend/logs/app.log  # if logs exist

# Or watch terminal output
apx dev start
```

### Issue: Monitor page shows "No data"
**Solution**: This is expected if no endpoints/feedback exist. Either:
- Add sample data (see step 4-6)
- Or demo with empty state explanation

### Issue: API returns 404 for health check
**Solution**: This is expected if endpoint_id doesn't exist. Use alerts or metrics endpoints instead.

---

## Success Criteria

Demo is ready when:
- ✅ Schema fixes applied successfully
- ✅ Backend starts without database errors
- ✅ Monitor API endpoints return 200 (not 500)
- ✅ Frontend Monitor page loads without errors
- ✅ No red error messages in browser console

**Estimated Total Time**: 5-10 minutes (core fixes only)
**With Optional Demo Data**: 20-25 minutes

---

## Files Created for This Fix

1. **`schemas/fix_monitor_schema.sql`** - Main fix script
2. **`schemas/MONITOR_SCHEMA_FIX_INSTRUCTIONS.md`** - Detailed guide
3. **`MONITOR_FIX_SUMMARY.md`** - Quick reference
4. **`DEMO_MONITOR_CHECKLIST.md`** - This file

All files are committed and ready for use.
