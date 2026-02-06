# VITAL Workbench - DATA → TEMPLATE Workflow Design

## How It Should Work

### Stage 1: DATA (Select Dataset)

**Available Datasets:**
- Iris Flower Multimodal Dataset (12 rows) - EXISTS in assemblies
- Other sheets from Unity Catalog

**User Action:**
1. Navigate to DATA stage
2. Browse available sheets/datasets
3. Click on "Iris Flower Multimodal Dataset"
4. Selection saved to `WorkflowContext.state.selectedSource`

**What Should Happen:**
- ✅ Dataset shows as "selected" with visual indicator
- ✅ "Continue" or navigation to next stage becomes available
- ❓ Does this work currently?

### Stage 2: TEMPLATE (Select Prompt Template)

**Available Templates (7 total):**
1. Radiation Equipment Defect Classifier (published)
2. Sensor Anomaly Detection (published)
3. Defect Classification (published)
4. Document Classifier (published)
5. Predictive Maintenance (draft)
6. Entity Extractor (draft)  
7. Sentiment Analyzer (published)

**User Action:**
1. Navigate to TEMPLATE stage (after selecting data)
2. Browse 7 available templates
3. Click on a template (e.g., "Defect Classification")
4. Selection saved to `WorkflowContext.state.selectedTemplate`

**What Should Happen:**
- ✅ Template shows as "selected" with visual indicator
- ✅ "Continue to Curate" button becomes enabled
- ❓ Does the template list show all 7 templates?
- ❓ Does selection work?

### Stage 3: Continue Button

**Location:** Template page, top-right corner

**Conditions to Enable:**
```typescript
const canContinue = state.selectedSource && state.selectedTemplate;
```

**User Action:**
1. Click "Continue to Curate" button

**What Should Happen:**
```typescript
handleContinue() {
  goToNextStage(); // Navigate to CURATE stage
  toast.success("Moving to Curate", "Configure your data curation settings");
}
```

- ✅ Navigate to CURATE stage
- ✅ Show success toast
- ✅ CURATE page loads with selected data + template
- ❓ Does navigation happen?
- ❓ Does CURATE page show data?

## Current Issues (Reported)

### Issue 1: "No templates showing"
**Symptom:** User sees "no templates" in TEMPLATE stage
**Backend Test:** API returns 7 templates correctly
```bash
curl http://127.0.0.1:8000/api/v1/templates
# Returns: 7 templates
```

**Possible Causes:**
1. Frontend not calling API
2. Frontend calling API but parsing fails
3. Frontend showing empty state incorrectly
4. Filter hiding all templates

**Debug Steps:**
1. Open browser dev tools (F12)
2. Navigate to TEMPLATE stage  
3. Check Network tab for `/api/v1/templates` call
4. Check Console tab for JavaScript errors
5. Check Response tab to see if data is returned

### Issue 2: "Selection doesn't do anything"
**Symptom:** Selecting data or template doesn't trigger expected behavior

**Expected Behavior:**
- Click dataset → Shows as selected
- Click template → Shows as selected  
- Both selected → "Continue to Curate" button enabled
- Click Continue → Navigate to CURATE stage

**Possible Causes:**
1. `WorkflowContext` not persisting state
2. Visual selection indicator not showing
3. Continue button not appearing
4. Continue button disabled despite selections
5. Navigation to CURATE fails

**Debug Steps:**
1. Check if WorkflowContext provider wraps the app
2. Use React DevTools to inspect `useWorkflow()` state
3. Check if `state.selectedSource` and `state.selectedTemplate` are set
4. Look for "Continue to Curate" button in UI
5. Check button's `disabled` state

### Issue 3: "Limited to flowers dataset"
**Requirement:** DATA stage should primarily show curated datasets like Iris Flowers, not all UC tables

**Current Behavior:** Unclear - may be showing:
- All Unity Catalog tables (too many)
- Empty list (no sheets in sheets table)
- Assemblies (which have flowers data)

**Desired Behavior:**
- Show "Iris Flower Multimodal Dataset" (exists in assemblies)
- Show other pre-curated Mirion datasets
- Hide raw Unity Catalog tables unless explicitly browsing

**Implementation:**
- DATA page should query `/api/v1/assemblies/list` for curated datasets
- OR query `/api/v1/sheets` if sheets table is populated
- Provide "Browse Unity Catalog" as secondary option

## Workflow Context State

**After DATA stage:**
```typescript
{
  selectedSource: {
    catalog: "erp-demonstrations",
    schema: "vital_workbench",
    table: "iris_flowers" // or assembly reference
  },
  sourceColumns: [...] // Detected columns
}
```

**After TEMPLATE stage:**
```typescript
{
  selectedSource: {...}, // From DATA
  selectedTemplate: {
    id: "tpl-defect-class-001",
    name: "Defect Classification",
    description: "...",
    system_prompt: "..."
  }
}
```

## Next Stage: CURATE

**Input Requirements:**
- `selectedSource` (dataset)
- `selectedTemplate` (prompt template)

**What CURATE Should Do:**
1. Take source data from assembly
2. Apply template to generate AI responses
3. Show items for human review
4. Allow approve/reject/edit

**Data Flow:**
```
Iris Flowers Dataset (12 rows)
  + Defect Classification Template
  → Generate 12 AI-labeled items
  → Show in curation queue
  → Expert reviews and approves
```

## Testing Checklist

### Test 1: Backend APIs
- [ ] `/api/v1/templates` returns 7 templates
- [ ] `/api/v1/assemblies/list` returns 20 assemblies
- [ ] Iris Flower dataset is in the list

### Test 2: DATA Stage
- [ ] Navigate to DATA stage
- [ ] See list of datasets (not empty)
- [ ] Click "Iris Flower Multimodal Dataset"
- [ ] Visual indicator shows selection
- [ ] Can navigate to TEMPLATE stage

### Test 3: TEMPLATE Stage
- [ ] Navigate to TEMPLATE stage
- [ ] See 7 templates listed
- [ ] Click "Defect Classification" template
- [ ] Visual indicator shows selection
- [ ] "Continue to Curate" button appears
- [ ] Button is enabled (not grayed out)

### Test 4: Navigation
- [ ] Click "Continue to Curate" button
- [ ] URL changes to /curate
- [ ] CURATE page loads
- [ ] Selected data + template are available
- [ ] Can generate curation items

## Files to Check

### Frontend:
- `frontend/src/pages/DataPage.tsx` - Dataset selection
- `frontend/src/pages/TemplatePage.tsx` - Template selection + Continue button
- `frontend/src/pages/CuratePage.tsx` - Next stage after workflow
- `frontend/src/context/WorkflowContext.tsx` - State management
- `frontend/src/services/api.ts` - API calls

### Backend:
- `backend/app/api/v1/endpoints/assemblies.py` - Datasets API
- `backend/app/api/v1/endpoints/templates.py` - Templates API
- `backend/app/api/v1/endpoints/curation.py` - Curation API

## Quick Debug Commands

### Check Templates API:
```bash
curl -s http://127.0.0.1:8000/api/v1/templates | jq '.total'
# Expected: 7
```

### Check Assemblies API:
```bash
curl -s http://127.0.0.1:8000/api/v1/assemblies/list | jq 'length'
# Expected: 20
```

### Check for Iris Flowers:
```bash
curl -s http://127.0.0.1:8000/api/v1/assemblies/list | jq '.[] | select(.sheet_name | contains("Iris"))'
# Should show Iris Flower assemblies
```

### Check Frontend Logs:
```bash
tail -f /tmp/frontend.log
```

### Check Backend Logs:
```bash
tail -f /tmp/backend_new.log | grep -E "templates|assemblies"
```
