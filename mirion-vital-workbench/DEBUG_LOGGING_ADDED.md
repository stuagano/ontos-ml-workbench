# Debug Logging Added to Frontend

**Date:** February 5, 2026
**Purpose:** Diagnose why templates aren't displaying in the UI despite API working

## Changes Made

### 1. TemplatePage.tsx - Added Comprehensive Logging

**Location:** `frontend/src/pages/TemplatePage.tsx`

**Added:**
- Console logging in useQuery hook
- Error state handling with UI display
- Debug info panel showing data counts
- Loading state with text indicator

**What You'll See:**

#### In Browser Console:
```
🔍 TemplatePage: Fetching templates with params: { search: undefined, status: undefined }
🌐 API Call: { url: "/api/v1/templates", method: "GET", ... }
✅ API Response: { url: "/api/v1/templates", status: 200, data: { total: 7, ... } }
✅ TemplatePage: Received data: { total: 7, templatesCount: 7, templates: [...] }
📊 TemplatePage render state: { isLoading: false, isError: false, dataTotal: 7, ... }
```

#### In Browser UI:

**Blue Debug Panel** (visible on page):
```
Debug: Total: 7, Templates: 7, Loading: false, Error: false
```

**If Error Occurs** (red panel):
```
Failed to load templates
[error message]
[Retry button]
```

**While Loading** (spinner):
```
Loading templates... 
```

### 2. api.ts - Added Request/Response Logging

**Location:** `frontend/src/services/api.ts`

**Added to fetchJson():**
- Log every API request (URL, method)
- Log successful responses (status, data preview)
- Log errors with full details

**What You'll See in Console:**
```
🌐 API Call: { url: "/api/v1/templates", method: "GET", ... }
✅ API Response: { url: "/api/v1/templates", status: 200, data: {...} }
```

Or if error:
```
❌ API Error: { url: "/api/v1/templates", status: 404, error: "Not Found" }
```

## How to Use This

### Step 1: Open Browser Console
1. Go to http://localhost:5175
2. Press F12 to open DevTools
3. Click "Console" tab

### Step 2: Navigate to TEMPLATE Page
- Click on "TEMPLATE" in the sidebar
- Watch the console logs appear

### Step 3: Interpret the Logs

#### Scenario A: API Call Never Happens
**Console shows:** Nothing with "🔍" or "🌐"
**Problem:** React component not mounting or query not executing
**Check:** 
- Is the page routing working?
- Is WorkflowContext provider set up?
- Any React errors in console?

#### Scenario B: API Call Fails
**Console shows:** 
```
🌐 API Call: { url: "/api/v1/templates" }
❌ API Error: { status: 404, error: "Not Found" }
```
**Problem:** Backend not responding or wrong URL
**Check:**
- Is backend running on http://127.0.0.1:8000?
- Try: `curl http://127.0.0.1:8000/api/v1/templates`
- Check for CORS errors

#### Scenario C: API Returns But UI Empty
**Console shows:**
```
✅ API Response: { ..., data: { total: 7, templates: [...] } }
📊 TemplatePage render state: { templatesLength: 7, ... }
```
**UI shows:** Empty state or no templates
**Problem:** DataTable rendering issue or data format problem
**Check:**
- Debug panel shows correct counts?
- Are templates array items valid?
- Check DataTable component props

#### Scenario D: Everything Works
**Console shows:** All green checkmarks ✅
**UI shows:** 7 templates in table with debug panel
**Action:** Templates ARE loading! Remove debug panel for production.

## Debugging Workflow

```
1. Open Console (F12)
   ↓
2. Navigate to TEMPLATE page
   ↓
3. Look for console logs:
   
   No logs at all?
   → React/routing issue
   
   🔍 but no 🌐?
   → useQuery not calling API
   
   🌐 but ❌ error?
   → Backend or network issue
   
   ✅ response but empty UI?
   → DataTable rendering issue
   
   ✅ response and debug panel shows count?
   → Everything working!
```

## Expected Output (Success Case)

### Console:
```javascript
🔍 TemplatePage: Fetching templates with params: {}
🌐 API Call: { url: "/api/v1/templates", method: "GET" }
✅ API Response: { 
  url: "/api/v1/templates", 
  status: 200,
  data: { 
    total: 7, 
    templates: [
      { id: "44444444-4444-...", name: "Radiation Equipment Defect Classifier", status: "published" },
      { id: "33333333-3333-...", name: "Entity Extractor", status: "draft" },
      ...
    ]
  }
}
✅ TemplatePage: Received data: { total: 7, templatesCount: 7 }
📊 TemplatePage render state: {
  isLoading: false,
  isError: false,
  dataTotal: 7,
  templatesLength: 7
}
```

### UI:
- Blue debug panel: "Total: 7, Templates: 7, Loading: false, Error: false"
- DataTable with 7 rows showing template names
- Click any row → Toast "Template selected: [name]"
- Purple banner appears: "Selected: [template name]"
- "Continue to Curate" button enabled

## Network Tab Check

**Also check Network tab in DevTools:**

1. Filter by "templates"
2. Should see: `/api/v1/templates` request
3. Click on it to see:
   - **Request URL:** http://localhost:5175/api/v1/templates
   - **Status:** 200 OK
   - **Response:** JSON with 7 templates

If Status is 404:
- Backend not proxying correctly
- Check vite.config.ts proxy settings

## Quick Tests

### Test 1: Backend API Working
```bash
curl http://127.0.0.1:8000/api/v1/templates | jq '.total'
# Expected: 7
```

### Test 2: Frontend Can Reach Backend
```bash
curl http://localhost:5175/api/v1/templates | jq '.total'
# Expected: 7 (via Vite proxy)
```

### Test 3: Browser Can Fetch
Open Console and run:
```javascript
fetch('/api/v1/templates')
  .then(r => r.json())
  .then(d => console.log('Templates:', d.total));
// Expected: "Templates: 7"
```

## Removing Debug Code Later

Once you've identified the issue, remove:

### From TemplatePage.tsx:
1. Console.log statements in useQuery
2. Debug panel div (blue box)
3. Keep the error handling UI (red box) - that's useful!

### From api.ts:
1. All console.log/console.error statements
2. Keep the actual fetch logic

## Files Modified

- ✅ `frontend/src/pages/TemplatePage.tsx` - Added logging + error UI
- ✅ `frontend/src/services/api.ts` - Added request/response logging

## Next Steps

1. **Open http://localhost:5175**
2. **Press F12** (open DevTools)
3. **Click TEMPLATE** in sidebar
4. **Read console logs** and tell me what you see!

The logs will show us exactly where it's failing:
- Not calling API? → React/routing issue
- API fails? → Backend/network issue  
- API works but no display? → UI rendering issue
