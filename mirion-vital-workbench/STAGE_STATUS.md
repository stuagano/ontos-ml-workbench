# VITAL Workbench - Stage Testing Status

**Date:** February 5, 2026
**Environment:** Local development (FEVM workspace)

## Development Servers Running

✅ **Backend API:** http://127.0.0.1:8000
- Status: Running with hot reload
- Logs: `/tmp/backend_new.log`

✅ **Frontend UI:** http://localhost:5175
- Status: Running with Vite hot reload  
- Logs: `/tmp/frontend.log`

## Database Status (erp-demonstrations.vital_workbench)

✅ **Tables Created:** 15 tables
- templates
- assemblies  
- assembly_rows
- sheets
- curation_items
- labeling_jobs
- labeling_tasks
- labeled_items
- feedback_items
- job_runs
- agents_registry
- endpoints_registry
- tools_registry
- workspace_users
- sheet_data

✅ **Data Loaded:**
- **7 Templates** (published and draft)
- **20 Assemblies** (training datasets)
- **0 Sheets** (table exists but empty)

## API Endpoints Testing

### ✅ Templates API - WORKING
```bash
curl http://127.0.0.1:8000/api/v1/templates
```
**Response:**
- Total: 7 templates
- Names: Radiation Equipment Defect Classifier, Sensor Anomaly Detection, Defect Classification, Document Classifier, Predictive Maintenance, etc.
- Status: All have published or draft status
- Base models: All using `databricks-meta-llama-3-1-70b-instruct`

### ❌ Assemblies API - ENDPOINT MISMATCH
```bash
# This FAILS (404 Not Found)
curl http://127.0.0.1:8000/api/v1/assemblies

# This WORKS
curl http://127.0.0.1:8000/api/v1/assemblies/list
```
**Issue:** Frontend likely calling wrong endpoint

**Response from /assemblies/list:**
- 20 assemblies available
- Example: "Sheet from templates" (2 rows), "defect detection" assembly
- Status: Most are "ready"
- All have template_config attached

## Stage-by-Stage Status

### 1. DATA Stage
**Status:** ⚠️  PARTIALLY WORKING
- ✅ Can browse Unity Catalog (9 catalogs cached)
- ✅ Can browse tables (15 tables in vital_workbench cached)
- ❌ No sheets to display (table is empty)
- **Action Needed:** Create sample sheets OR test with direct UC table selection

### 2. TEMPLATE Stage  
**Status:** 🔍 NEEDS TESTING
- ✅ API returns 7 templates correctly
- ❓ Frontend may not be displaying them
- **Action Needed:** Open http://localhost:5175 and navigate to TEMPLATE stage

### 3. CURATE Stage
**Status:** 🔍 NEEDS TESTING
- ✅ Table structure exists
- ❓ No test data yet
- **Action Needed:** Generate curation items from a template

### 4. TRAIN Stage
**Status:** ⚠️ API ENDPOINT ISSUE
- ✅ 20 assemblies available in database
- ❌ Frontend calling `/api/v1/assemblies` instead of `/api/v1/assemblies/list`
- **Action Needed:** Fix endpoint or add route alias

### 5. DEPLOY Stage
**Status:** 🔍 NOT TESTED
- Table structure exists
- **Action Needed:** Test deployment workflow

### 6. MONITOR Stage
**Status:** 🔍 NOT TESTED
- Table structure exists
- **Action Needed:** Test monitoring features

### 7. IMPROVE Stage
**Status:** 🔍 NOT TESTED
- feedback_items table exists
- **Action Needed:** Test feedback collection

## Module Testing

### DSPy Optimizer Module
**Status:** 🔍 NEEDS TESTING
- Integrated into TRAIN stage
- Should appear when assembly selected
- **Action Needed:** Navigate to TRAIN → select assembly → verify module opens

### Data Quality Inspector Module
**Status:** 🔍 NEEDS TESTING
- Integrated into DATA stage
- Should appear when sheet selected
- **Action Needed:** Navigate to DATA → select sheet → verify module opens

## Known Issues

### Issue 1: Frontend Not Showing Templates
**Symptom:** User reports "no templates" in UI
**API Test:** `curl http://127.0.0.1:8000/api/v1/templates` returns 7 templates
**Possible Causes:**
1. Frontend JS error (check browser console)
2. CORS issue
3. API base URL misconfiguration
4. Component rendering issue

**Next Steps:**
- Open browser dev tools (F12)
- Navigate to TEMPLATE stage
- Check console for errors
- Check network tab for failed requests

### Issue 2: Assemblies Endpoint Mismatch
**Symptom:** Frontend expects `/api/v1/assemblies` but only `/api/v1/assemblies/list` works
**Impact:** TRAIN stage may not load assemblies
**Fix Options:**
1. Update frontend to call `/assemblies/list`
2. Add route alias in backend for `/assemblies` → `/assemblies/list`
3. Check if there's a different endpoint the frontend should use

### Issue 3: No Sheets Data
**Symptom:** 0 rows in sheets table
**Impact:** DATA stage has nothing to browse
**Workaround:** Browse Unity Catalog directly and select tables
**Long-term Fix:** Create sample sheets from UC tables

## Test Plan

### Priority 1: Fix Template Display
1. Open http://localhost:5175 in browser
2. Open dev tools (F12)
3. Navigate to TEMPLATE stage
4. Check console for errors
5. Check network tab for API calls
6. Verify `/api/v1/templates` is being called
7. Fix any frontend errors

### Priority 2: Fix Assemblies Endpoint
1. Check backend routes in `app/api/v1/endpoints/assemblies.py`
2. Either add `/assemblies` route or update frontend
3. Test that TRAIN stage shows 20 assemblies

### Priority 3: End-to-End Workflow Test
1. DATA: Select a Unity Catalog table
2. TEMPLATE: Select a template (e.g., "Defect Classification")
3. CURATE: Generate items and review
4. TRAIN: Create assembly and configure fine-tuning
5. Document any broken steps

## Quick Commands

### Check Backend Health
```bash
curl http://127.0.0.1:8000/api/v1/templates | jq '.total'
```

### Check Frontend Status
```bash
curl -s http://localhost:5175 | grep "<title>"
```

### View Backend Logs
```bash
tail -f /tmp/backend_new.log
```

### View Frontend Logs  
```bash
tail -f /tmp/frontend.log
```

### Stop Services
```bash
# Backend
pkill -f uvicorn

# Frontend
pkill -f vite
```

## Summary

**What's Working:**
- ✅ Backend API serving data correctly
- ✅ Frontend dev server running
- ✅ Database with real templates and assemblies
- ✅ Cache warming (9 catalogs, 15 tables)

**What Needs Fixing:**
- ❌ Template display in frontend UI
- ❌ Assemblies endpoint mismatch
- ⚠️ No sample sheets data

**Next Steps:**
1. Open browser and test TEMPLATE stage manually
2. Fix template display issue
3. Fix assemblies endpoint
4. Create sample sheets for DATA stage
5. Test full workflow end-to-end
