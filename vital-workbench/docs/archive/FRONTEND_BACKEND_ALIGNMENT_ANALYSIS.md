# Frontend-Backend Alignment Analysis

**Date:** 2026-02-06  
**Status:** 🔴 CRITICAL - Major misalignment identified  
**Priority:** P0 - Must fix before production

---

## Executive Summary

**Problem:** Frontend and backend are not properly aligned. The frontend has significant business logic, state management, and duplicate concerns that should live entirely in the backend.

**Impact:**
- Frontend duplicates backend logic (validation, status tracking)
- State can drift between frontend and backend
- Frontend doing work that backend should do
- Missing API integrations for new backend features

**Solution:** Make frontend a **pure visualization layer** - all state, logic, and data management in backend.

---

## Core Architecture Principle

```
┌─────────────────────────────────────────────────────────────┐
│                        CORRECT PATTERN                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Pure Visualization)                               │
│  ├─ Fetch data from backend                                 │
│  ├─ Display data                                            │
│  ├─ Capture user input                                      │
│  └─ Send mutations to backend                               │
│                    │                                         │
│                    ▼                                         │
│  Backend (All State & Logic)                                │
│  ├─ Store all data                                          │
│  ├─ Validate all input                                      │
│  ├─ Enforce all business rules                              │
│  ├─ Track all status                                        │
│  └─ Compute all derived values                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Frontend should NEVER:**
- ❌ Calculate derived values (counts, percentages, splits)
- ❌ Store authoritative state (backend is source of truth)
- ❌ Validate business rules (backend enforces)
- ❌ Manage status transitions (backend controls)
- ❌ Duplicate backend logic

**Frontend should ONLY:**
- ✅ Fetch data via API
- ✅ Display data
- ✅ Collect user input
- ✅ Submit mutations
- ✅ Handle loading/error UI states

---

## Gap Analysis by Stage

### Stage 1: DATA - Sheets

#### Backend (Good ✅)
```
GET    /api/v1/sheets              # List sheets
POST   /api/v1/sheets              # Create sheet
GET    /api/v1/sheets/{id}         # Get sheet
PUT    /api/v1/sheets/{id}         # Update sheet
DELETE /api/v1/sheets/{id}         # Delete sheet
GET    /api/v1/sheets/{id}/preview # Preview data
```

#### Frontend Status: 🟢 GOOD
- Has API methods: `listSheets`, `getSheet`, `createSheet`, `updateSheet`, `deleteSheet`
- DataPage mostly visualizes backend state
- Could be improved but functionally correct

---

### Stage 2: GENERATE - Training Sheets (Assemblies)

#### Backend (Good ✅)
```
POST   /api/v1/sheets/{id}/assemble    # Create Training Sheet
GET    /api/v1/assemblies/list          # List Training Sheets
GET    /api/v1/assemblies/{id}          # Get Training Sheet
DELETE /api/v1/assemblies/{id}          # Delete Training Sheet
GET    /api/v1/assemblies/{id}/preview  # Preview Q&A pairs
POST   /api/v1/assemblies/{id}/generate # Generate responses
POST   /api/v1/assemblies/{id}/export   # Export JSONL
```

#### Frontend Status: 🟡 MOSTLY GOOD
- Has API methods: `assembleSheet`, `listAssemblies`, `getAssembly`, etc.
- CuratePage (GeneratePage) visualizes backend state
- **Issue:** TrainPage has frontend training config state (should be in backend job creation)

---

### Stage 3: LABEL - Q&A Pair Review

#### Backend (Mixed ⚠️)
```
GET /api/v1/assemblies/{id}/rows/{index}      # Get Q&A pair
PUT /api/v1/assemblies/{id}/rows/{index}      # Update Q&A pair
```

#### Frontend Status: 🔴 MAJOR GAPS
- **Missing:** Bulk approve/reject endpoints
- **Missing:** Review queue endpoint
- **Missing:** Status filtering (show only unlabeled)
- **Issue:** No dedicated review UI component
- **Issue:** Frontend would need to track review progress locally (wrong!)

**What's Needed:**
```
POST /api/v1/assemblies/{id}/rows/bulk-approve  # Approve multiple
POST /api/v1/assemblies/{id}/rows/bulk-reject   # Reject multiple
GET  /api/v1/assemblies/{id}/review-queue       # Next unlabeled pair
GET  /api/v1/assemblies/{id}/review-progress    # Stats
```

---

### Stage 4: TRAIN - Training Jobs

#### Backend (Complete ✅)
```
POST   /api/v1/training/jobs              # Create job
GET    /api/v1/training/jobs              # List jobs
GET    /api/v1/training/jobs/{id}         # Get job
POST   /api/v1/training/jobs/{id}/poll    # Poll status
POST   /api/v1/training/jobs/{id}/cancel  # Cancel job
GET    /api/v1/training/jobs/{id}/events  # Event history
GET    /api/v1/training/jobs/{id}/metrics # Metrics
GET    /api/v1/training/jobs/{id}/lineage # Lineage
GET    /api/v1/training/active            # Active jobs
```

#### Frontend Status: 🔴 MISSING ENTIRELY
- **NO API methods** for training jobs
- TrainPage has local state for:
  - Model selection (should be in job creation)
  - Train/val split (should be in job creation)
  - Epochs, learning rate (should be in job creation)
- No job status tracking
- No progress monitoring
- No metrics visualization

**Problem Example from TrainPage.tsx:**
```typescript
// ❌ WRONG - Frontend managing training config
const [baseModel, setBaseModel] = useState(AVAILABLE_MODELS[1].id);
const [trainSplit, setTrainSplit] = useState(80);
const [epochs, setEpochs] = useState(3);
const [learningRate, setLearningRate] = useState(0.0001);

// ❌ WRONG - Frontend calculating splits
const trainCount = Math.floor(totalUsable * trainSplit / 100);
const valCount = totalUsable - trainCount;
```

**Correct Pattern:**
```typescript
// ✅ CORRECT - Frontend just collects input and sends to backend
const handleCreateJob = async () => {
  const job = await createTrainingJob({
    training_sheet_id: assembly.id,
    model_name: "my-model",
    base_model: selectedModel,
    train_val_split: trainSplit / 100,
    training_config: { epochs, learning_rate: learningRate }
  });
  // Backend calculates train_count, val_count, validates, etc.
};
```

---

### Stage 5: DEPLOY - Model Serving

#### Backend (Basic ✅)
```
GET    /api/v1/deployment/endpoints         # List endpoints
POST   /api/v1/deployment/deploy            # Deploy model
DELETE /api/v1/deployment/endpoints/{name}  # Delete endpoint
```

#### Frontend Status: 🟡 BASIC
- Has API methods: `listServingEndpoints`, `deployModel`, `deleteServingEndpoint`
- DeployPage visualizes endpoints
- **Missing:** Update endpoint, metrics, logs

---

### Stage 6: MONITOR - Production Monitoring

#### Backend: 🔴 MINIMAL
```
# Very limited monitoring endpoints
```

#### Frontend Status: 🔴 MINIMAL
- MonitorPage exists but very basic
- No real monitoring data displayed
- **Needs:** Feedback API, metrics API, logs API

---

### Stage 7: IMPROVE - Feedback Loop

#### Backend: 🔴 MINIMAL
```
POST /api/v1/feedback  # Submit feedback (maybe)
```

#### Frontend Status: 🔴 MINIMAL
- ImprovePage exists but minimal functionality
- No feedback loop implementation

---

## Specific Issues Found

### 1. TrainPage - Training Config in Frontend

**File:** `frontend/src/pages/TrainPage.tsx`

**Problem:**
```typescript
// Frontend managing training configuration
const [baseModel, setBaseModel] = useState(AVAILABLE_MODELS[1].id);
const [trainSplit, setTrainSplit] = useState(80);
const [epochs, setEpochs] = useState(3);
const [learningRate, setLearningRate] = useState(0.0001);

// Frontend calculating derived values
const trainCount = Math.floor(totalUsable * trainSplit / 100);
const valCount = totalUsable - trainCount;
```

**Why This is Wrong:**
- Training config should be part of job creation request
- Backend should calculate train/val counts
- Backend should validate config (min/max epochs, valid learning rates)
- Frontend state can drift from actual job config

**Correct Approach:**
```typescript
// Frontend just collects input
interface TrainingJobForm {
  training_sheet_id: string;
  model_name: string;
  base_model: string;
  train_val_split: number;  // 0.8 not 80
  training_config: {
    epochs: number;
    learning_rate: number;
  };
}

// Send to backend
const job = await createTrainingJob(formData);
// Backend returns job with calculated train_pairs, val_pairs
```

### 2. Missing Training Job API Integration

**File:** `frontend/src/services/api.ts`

**Problem:** NO training job methods exist

**What's Needed:**
```typescript
export async function createTrainingJob(
  data: TrainingJobCreateRequest
): Promise<TrainingJob> {
  return fetchJson(`${API_BASE}/training/jobs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listTrainingJobs(params?: {
  training_sheet_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<TrainingJobListResponse> {
  const query = new URLSearchParams(params as any);
  return fetchJson(`${API_BASE}/training/jobs?${query}`);
}

export async function getTrainingJob(jobId: string): Promise<TrainingJob> {
  return fetchJson(`${API_BASE}/training/jobs/${jobId}`);
}

export async function pollTrainingJob(jobId: string): Promise<TrainingJob> {
  return fetchJson(`${API_BASE}/training/jobs/${jobId}/poll`, {
    method: "POST",
  });
}

export async function cancelTrainingJob(
  jobId: string,
  reason?: string
): Promise<TrainingJob> {
  return fetchJson(`${API_BASE}/training/jobs/${jobId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getTrainingJobMetrics(
  jobId: string
): Promise<TrainingJobMetrics> {
  return fetchJson(`${API_BASE}/training/jobs/${jobId}/metrics`);
}

export async function getTrainingJobEvents(
  jobId: string
): Promise<TrainingJobEventsResponse> {
  return fetchJson(`${API_BASE}/training/jobs/${jobId}/events`);
}

export async function getActiveTrainingJobs(): Promise<TrainingJob[]> {
  const response = await fetchJson<{ jobs: TrainingJob[] }>(
    `${API_BASE}/training/active`
  );
  return response.jobs;
}
```

### 3. Missing TypeScript Types

**File:** `frontend/src/types/index.ts`

**Problem:** No types for training jobs

**What's Needed:**
```typescript
export interface TrainingJob {
  id: string;
  training_sheet_id: string;
  training_sheet_name?: string;
  model_name: string;
  base_model: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  training_config: {
    epochs: number;
    learning_rate: number;
    batch_size?: number;
    [key: string]: any;
  };
  train_val_split: number;
  total_pairs: number;
  train_pairs: number;
  val_pairs: number;
  progress_percent: number;
  current_epoch?: number;
  total_epochs?: number;
  fmapi_job_id?: string;
  mlflow_run_id?: string;
  error_message?: string;
  created_at: string;
  created_by?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface TrainingJobCreateRequest {
  training_sheet_id: string;
  model_name: string;
  base_model: string;
  training_config: Record<string, any>;
  train_val_split: number;
  register_to_uc?: boolean;
  uc_catalog?: string;
  uc_schema?: string;
}

export interface TrainingJobListResponse {
  jobs: TrainingJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrainingJobMetrics {
  train_loss?: number;
  val_loss?: number;
  train_accuracy?: number;
  val_accuracy?: number;
  learning_rate?: number;
  epochs_completed?: number;
  training_duration_seconds?: number;
  tokens_processed?: number;
  cost_dbu?: number;
}
```

### 4. Review Queue Missing

**Problem:** No way to systematically review Q&A pairs

**Backend Needs:**
```python
# backend/app/api/v1/endpoints/assemblies.py

@router.get("/{assembly_id}/review-queue")
async def get_review_queue(
    assembly_id: str,
    status: str = Query("unlabeled", description="unlabeled, flagged, all")
):
    """Get next items needing review."""
    query = f"""
    SELECT * FROM assembly_rows
    WHERE assembly_id = '{assembly_id}'
    AND status = '{status}'
    ORDER BY row_index ASC
    LIMIT 100
    """
    rows = sql_service.execute(query)
    return {"items": rows, "total": len(rows)}

@router.get("/{assembly_id}/review-progress")
async def get_review_progress(assembly_id: str):
    """Get review progress stats."""
    query = f"""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'labeled' THEN 1 ELSE 0 END) as labeled,
        SUM(CASE WHEN status = 'unlabeled' THEN 1 ELSE 0 END) as unlabeled,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged
    FROM assembly_rows
    WHERE assembly_id = '{assembly_id}'
    """
    result = sql_service.execute(query)[0]
    return {
        "total": result["total"],
        "labeled": result["labeled"],
        "unlabeled": result["unlabeled"],
        "rejected": result["rejected"],
        "flagged": result["flagged"],
        "percent_complete": (result["labeled"] / result["total"] * 100) if result["total"] > 0 else 0
    }
```

---

## Action Plan

### Phase 1: Add Training Job Frontend (This Session)

1. ✅ Add TypeScript types for training jobs
2. ✅ Add API methods in `services/api.ts`
3. ✅ Create TrainingJobList component
4. ✅ Create TrainingJobDetail component
5. ✅ Create TrainingJobCreateForm component
6. ✅ Update TrainPage to use new components
7. ✅ Remove local training config state
8. ✅ Add polling mechanism for active jobs

### Phase 2: Add Review Queue Backend & Frontend

1. ❌ Add review queue endpoints (backend)
2. ❌ Add review progress endpoints (backend)
3. ❌ Add bulk approve/reject endpoints (backend)
4. ❌ Create ReviewQueue component (frontend)
5. ❌ Create ReviewProgressBar component (frontend)
6. ❌ Update LabelPage with review workflow

### Phase 3: Audit All Pages

For each page, ensure:
- ✅ All state comes from backend APIs
- ✅ No local calculations of derived values
- ✅ No local status tracking
- ✅ Mutations go to backend
- ✅ Backend validates everything

---

## Design Principles Going Forward

### 1. Backend is Source of Truth
All data lives in backend. Frontend fetches and displays.

### 2. Backend Computes, Frontend Displays
- ❌ Frontend: `const total = items.length`
- ✅ Backend: Returns `{ items: [...], total: 42 }`

### 3. Backend Validates, Frontend Trusts
- ❌ Frontend validates form input against business rules
- ✅ Frontend does basic UX validation (required fields, format)
- ✅ Backend enforces all business rules
- ✅ Frontend displays backend validation errors

### 4. Backend Controls Status, Frontend Observes
- ❌ Frontend: `setStatus('completed')`
- ✅ Frontend: `await completeJob(jobId)` → Backend changes status → Frontend refetches

### 5. Mutations are Backend Operations
- ❌ Frontend updates local state optimistically
- ✅ Frontend sends mutation → Backend updates → Frontend refetches
- ⚠️ OK: Optimistic UI updates if reverted on error

---

## Success Criteria

**Frontend is properly aligned when:**
- ✅ Every UI element displays backend data
- ✅ Every user action triggers backend API call
- ✅ No business logic in frontend
- ✅ No derived calculations in frontend
- ✅ No local status tracking in frontend
- ✅ Frontend can be reloaded anytime without data loss

**Red Flags (Frontend doing too much):**
- ❌ `useState` for anything except UI state (modals, tabs, etc.)
- ❌ Calculations like `const total = items.reduce(...)`
- ❌ Status transitions like `setStatus('completed')`
- ❌ Validation beyond basic UX (required, format)
- ❌ Timers/intervals for polling (use React Query)

---

## Next Steps

1. ✅ Add training job types
2. ✅ Add training job API methods
3. ✅ Create training job components
4. ✅ Refactor TrainPage to use backend jobs
5. ✅ Test end-to-end training workflow
6. ⏭️ Move to Phase 2 (Review Queue)

---

**Status:** Analysis complete. Ready to implement Phase 1.
