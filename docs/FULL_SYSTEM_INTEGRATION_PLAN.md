# Ontos ML Workbench: Full System Integration Plan

**Date:** February 19, 2026
**PRD Version:** v2.3
**Branch:** `claude/full-system-integration-7nPKD`

---

## Vision

Close every gap in the 7-stage pipeline so a domain expert at Acme Instruments can
walk through a complete loop — from raw data to deployed model to continuous improvement —
using the Foundation Model API (FMAPI) as the engine at every step.

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
  ↑                                                       │
  └───────────── continuous improvement loop ──────────────┘
```

---

## Current State Summary

| Stage | Status | Key Gaps |
|-------|--------|----------|
| DATA | Working | None blocking |
| GENERATE | Working | Legacy "assembly" API naming |
| LABEL | Mostly working | Gap update not persisted, annotation tasks not stored |
| TRAIN | Working | None blocking |
| DEPLOY | Working | None blocking |
| MONITOR | Partial | Frontend uses mock chart data instead of real backend metrics |
| IMPROVE | Broken | Feedback→Training conversion API mismatch, gap tasks not persisted |

---

## Stage 1: Fix the Broken Feedback Loop (IMPROVE → DATA)

**Goal:** Close the continuous improvement loop so feedback flows back into training data.

### 1a. Fix Frontend-Backend API Mismatch for Feedback Conversion

**Problem:** The frontend calls `POST /feedback/{id}/to-curation?template_id=...` but the
backend endpoint is `POST /feedback/{id}/to-training?assembly_id=...`. Different URL,
different parameter name.

**Files:**
- `frontend/src/services/api.ts:554-563` — calls `/to-curation` with `template_id`
- `backend/app/api/v1/endpoints/feedback.py:405-490` — serves `/to-training` with `assembly_id`

**Fix:**
1. Add a backend endpoint `POST /feedback/{id}/to-curation` that accepts `template_id`
2. The endpoint looks up (or creates) a Training Sheet for that template
3. Delegates to the existing `convert_to_training_data` logic
4. Returns `{ status, curation_item_id, template_id }` matching frontend expectations

### 1b. Persist Gap Updates

**Problem:** `PUT /gaps/{id}` modifies the in-memory object but has a `# TODO: Persist update to database` at `gaps.py:189`.

**Fix:**
1. Add a `gap_updates` Delta table (or add columns to `feedback_items`)
2. Write the update (status, severity, suggested_action) to the database
3. Return the persisted gap

### 1c. Persist Annotation Tasks

**Problem:** `GET /gaps/tasks` returns `[]` — tasks created via `POST /gaps/{id}/task` are
never stored.

**Fix:**
1. Create an `annotation_tasks` Delta table with schema:
   `(id, gap_id, title, description, instructions, priority, status, assignee, target_record_count, created_at, updated_at)`
2. Wire `create_task_for_gap` to INSERT into this table
3. Wire task listing endpoint to SELECT from this table
4. Add status transitions (pending → in_progress → completed)

---

## Stage 2: Replace Mock Monitoring with Real Metrics (MONITOR)

**Goal:** MonitorPage shows real data from the backend instead of hardcoded sine waves.

### 2a. Wire Frontend Charts to Backend Metrics API

**Problem:** `MonitorPage.tsx` has `generateMockChartData()` (lines 82-126) producing
fake request/latency curves. But the backend's `/monitoring/metrics/performance` and
`/monitoring/metrics/realtime/{id}` endpoints already return real data derived from
the `feedback_items` table.

**Fix:**
1. Replace `generateMockChartData()` with a call to `getPerformanceMetrics()` (already
   imported at line 46 and queried at line 514-519)
2. Transform `PerformanceMetrics[]` response into `MetricSeries[]` format for the chart
3. The `perfMetrics` and `realtimeMetrics` queries already exist — just pipe them into
   the chart component instead of the mock generator

### 2b. Add Time-Series Metrics Endpoint

**Problem:** The current `/monitoring/metrics/performance` returns aggregate stats per
endpoint. The chart needs time-bucketed data points.

**Fix:**
1. Add `GET /monitoring/metrics/timeseries/{endpoint_id}` that returns request counts
   and ratings bucketed by hour/minute
2. Query: `SELECT date_trunc('hour', created_at) as bucket, COUNT(*) as requests, AVG(rating) as avg_rating FROM feedback_items WHERE ... GROUP BY 1 ORDER BY 1`
3. Frontend transforms this into `MetricSeries[]`

### 2c. Connect Drift Detection to Chart

**Problem:** Drift endpoint exists and works (`/monitoring/drift/{endpoint_id}`) but the
MonitorPage doesn't call it for the drift panel.

**Fix:**
1. Add a `useQuery` for `getDriftDetection(selectedEndpoint)` (API function already exists)
2. Display drift score, severity, and affected features in the drift section
3. Show drift status badge on endpoint cards

---

## Stage 3: Strengthen the LABEL Stage Integrations

**Goal:** Ensure labeling jobs, canonical labels, and curated datasets are fully connected.

### 3a. Labelset Coverage Statistics

**Problem:** `labelsets.py` line 588: `coverage_stats=None  # TODO: Calculate coverage`

**Fix:**
1. Query canonical_labels table: `SELECT COUNT(*) FROM canonical_labels WHERE label_type = '{labelset.label_type}' AND sheet_id = '{sheet_id}'`
2. Compare against total items in the sheet
3. Return coverage percentage per labelset

### 3b. Wire Labeling Jobs to Labelsets

**Problem:** Labeling jobs exist independently from labelsets — no foreign key relationship
tracks which labelset a labeling job is populating.

**Fix:**
1. Add `labelset_id` column to labeling jobs (or use the existing `label_type` to join)
2. Show labelset context in the labeling job UI
3. When a labeling task is completed, update the labelset's item count

### 3c. Canonical Label Auto-Approval in Q&A Generation

**Problem:** When generating Q&A pairs, existing canonical labels should auto-approve
matching pairs. The lookup exists but isn't always triggered.

**Fix:**
1. In the assembly generation flow, after creating a Q&A pair, look up
   `canonical_labels` by `(sheet_id, item_ref, label_type)`
2. If found, set `status = 'labeled'` and link `canonical_label_id`
3. Log auto-approval for audit

---

## Stage 4: On-Ramp Plan — Getting Domain Experts Started with FMAPI

**Goal:** Create a guided workflow that takes a domain expert from "I have data" to
"I have a fine-tuned model" using the Foundation Model API.

### 4a. Guided Use-Case Wizard

Build a "New Project" flow in the UI that:

1. **Pick a Use Case** — Present the 6 Acme use cases as cards:
   - Defect Detection (image + sensor → classification)
   - Predictive Maintenance (telemetry → failure probability)
   - Anomaly Detection (sensor stream → alert + explanation)
   - Calibration Insights (MC results → recommendations)
   - Document Extraction (compliance docs → structured data)
   - Remaining Useful Life (equipment history → RUL estimate)

2. **Connect Data** — Point the Sheet at a Unity Catalog table/volume.
   Use synthetic data from `synthetic_data/` as starter examples.

3. **Choose a Template** — Load the matching pre-built template from
   `synthetic_data/templates/`. Show the prompt pattern and let the expert customize.

4. **Generate Training Pairs** — One-click generation using the template.
   Show a preview of 5 generated Q&A pairs before committing.

5. **Label & Approve** — Walk through the labeling queue.
   Pre-seed canonical labels where synthetic ground truth exists.

6. **Train with FMAPI** — One-click fine-tuning job submission.
   Show estimated cost, model selection (base model), and hyperparameters.
   Default to sensible values so experts don't need ML knowledge.

7. **Deploy & Test** — Deploy the trained model to a serving endpoint.
   Built-in playground to test with sample inputs.

### 4b. Synthetic Data Seed Loader

**Problem:** New users face a cold start — no sheets, no templates, no training data.

**Fix:**
1. Add `POST /api/v1/seed/{use_case}` endpoint
2. Creates a Sheet pointing to the synthetic data tables/volumes
3. Creates the matching Template from `synthetic_data/templates/`
4. Loads example store entries from `synthetic_data/examples/`
5. Optionally generates a small Training Sheet (10-20 pairs) as a demo

### 4c. FMAPI Integration Improvements

**Problem:** Training service works but experts need better visibility and simpler defaults.

**Fix:**
1. Add model recommendation based on use case (vision → image model, text → language model)
2. Add cost estimation before job submission (estimate based on data size × epochs)
3. Add one-click "retrain with improvements" that:
   - Finds all new labeled feedback since last training
   - Merges into the Training Sheet
   - Submits a new FMAPI job with same config
4. Surface FMAPI job progress with human-readable status messages

---

## Stage 5: End-to-End Pipeline Verification & Polish

**Goal:** Verify every path through the system works, fix remaining rough edges.

### 5a. Full Workflow Smoke Test

Walk through the complete pipeline end-to-end for one use case (defect detection):

1. Seed synthetic data → Create Sheet → Attach Template
2. Generate Training Sheet → Label 10 pairs
3. Submit FMAPI training job → Wait for completion
4. Deploy model → Test in playground
5. Submit feedback → View in Monitor dashboard
6. Convert feedback to training data → Verify it appears in the Training Sheet
7. Run gap analysis → Create annotation task → Verify persistence

### 5b. Fix Remaining API Naming

| Current API Path | Correct Path (PRD v2.3) | Action |
|------------------|------------------------|--------|
| `/assemblies` | `/training-sheets` | Add alias route, keep both |
| `assembly_id` param | `training_sheet_id` param | Accept both |
| `ASSEMBLIES_TABLE` | Keep as-is (DB layer) | No change needed |

### 5c. Frontend Polish

1. Replace remaining `Assembly` labels in UI with `Training Sheet`
2. Wire the `SheetBuilder` delete button (`TODO: Implement delete` at line 1191)
3. Wire the `SheetBuilder` edit column (`TODO: Edit column` at line 1553)
4. Add loading/error states for all queries that currently fail silently

---

## Implementation Order

| Phase | Stages | Priority | Rationale |
|-------|--------|----------|-----------|
| **Phase 1** | Stage 1 (Feedback Loop) | CRITICAL | Without this, the continuous improvement cycle is broken |
| **Phase 2** | Stage 2 (Real Monitoring) | HIGH | Mock data undermines trust in the platform |
| **Phase 3** | Stage 4a-4b (On-Ramp) | HIGH | Domain experts can't self-serve without guided flows |
| **Phase 4** | Stage 3 (Label Integrations) | MEDIUM | Refinements to an already-working stage |
| **Phase 5** | Stage 4c + 5 (FMAPI + Polish) | MEDIUM | Optimization and verification |

---

## File Impact Map

### Backend Changes
| File | Changes |
|------|---------|
| `backend/app/api/v1/endpoints/feedback.py` | Add `/to-curation` endpoint |
| `backend/app/api/v1/endpoints/gaps.py` | Persist gap updates and annotation tasks |
| `backend/app/api/v1/endpoints/monitoring.py` | Add timeseries metrics endpoint |
| `backend/app/api/v1/endpoints/labelsets.py` | Implement coverage stats |
| `backend/app/api/v1/endpoints/seed.py` | New: synthetic data seed loader |
| `backend/app/services/training_service.py` | Cost estimation, retrain-with-improvements |

### Frontend Changes
| File | Changes |
|------|---------|
| `frontend/src/pages/MonitorPage.tsx` | Replace mock charts with real API data |
| `frontend/src/pages/ImprovePage.tsx` | Verify feedback conversion works end-to-end |
| `frontend/src/pages/SheetBuilder.tsx` | Wire delete + edit column |
| `frontend/src/pages/OnboardingWizard.tsx` | New: guided use-case wizard |
| `frontend/src/services/api.ts` | Add timeseries metrics, seed API calls |

### Schema Changes
| File | Changes |
|------|---------|
| `schemas/annotation_tasks.sql` | New: annotation tasks table |
| `schemas/gap_updates.sql` | New: gap persistence (or extend feedback_items) |

---

## Success Criteria

A domain expert with no ML background can:

1. Open the workbench and pick "Defect Detection"
2. See synthetic sample data pre-loaded
3. Generate training pairs with one click
4. Review and label 10 pairs in under 5 minutes
5. Submit a fine-tuning job and watch it complete
6. Deploy the model and test it in the playground
7. Leave feedback on a prediction
8. See that feedback reflected in the Monitor dashboard (real data, not mock)
9. Convert that feedback into new training data
10. Trigger a retraining cycle

When all 10 steps work end-to-end, the system is fully integrated.
