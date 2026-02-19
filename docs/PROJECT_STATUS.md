# Ontos ML Workbench - Project Status

**Last Updated:** February 18, 2026
**PRD Version:** 2.3
**Overall Progress:** ~80% backend, ~65% frontend

> This is the single source of truth for implementation status. It replaces the stale
> `GAP_ANALYSIS_V2.md`, `SPRINT_PLAN.md`, `BACKLOG.md`, and `prd/v2.3-implementation-status.md`.

---

## How to Read This Document

- **DONE** = Fully implemented, API + UI wired end-to-end
- **BACKEND ONLY** = API endpoint exists and works, but no frontend UI calls it
- **PARTIAL** = Some parts built, key functionality still missing
- **SCAFFOLD** = Page/component exists but uses placeholder or simulated data
- **NOT STARTED** = No code exists

---

## Stage-by-Stage Status

### Stage 1: DATA (SheetBuilder) — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| Browse Unity Catalog (catalogs, schemas, tables, volumes) | DONE | `UCBrowser` component, backend UC endpoints |
| Create Sheet (dataset pointer) | DONE | `SheetBuilder.tsx` create mode, `POST /sheets` |
| Import columns from base/secondary tables | DONE | `addColumn` API, column header UI |
| Delete columns | DONE | `deleteColumn` wired to `ColumnHeader` trash icon |
| Sheet preview (rows from UC source) | DONE | `getSheetPreview` API |
| Sheet CRUD (list, update, delete) | DONE | Browse mode with DataTable |
| Publish / Archive / Delete lifecycle | DONE | Status-aware row actions (just wired) |
| Attach template to sheet | DONE | Template selection + column mapping modal |
| Detach template from sheet | DONE | "Detach" button on template indicator (just wired) |
| Assemble sheet (generate Q&A pairs) | DONE | `assembleSheet` API, triggers Training Sheet creation |
| Export to Delta | DONE | `exportSheet` API |
| Data Quality (DQX) inline panel | DONE | `DataQualityPanel` component in sheet detail view |
| Multimodal data fusion (images + sensor + metadata) | DONE | Columns support text, image, metadata categories |
| Join multiple data sources | BACKEND ONLY | API supports secondary sources + join keys, UI doesn't expose |

### Stage 2: GENERATE (SheetBuilder + CuratePage) — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| Select Sheet + Template → generate Training Sheet | DONE | Assemble flow in SheetBuilder |
| AI inference for response generation (FMAPI) | DONE | `POST /assemblies/{id}/generate`, `InferenceService` |
| Training Sheet browse / preview Q&A pairs | DONE | `CuratePage.tsx` browse + detail modes |
| Column mapping (template variables → sheet columns) | DONE | `ColumnMappingModal` with Jinja2 placeholder extraction |
| Canonical label lookup during generation | BACKEND ONLY | Backend supports it; frontend doesn't show lookup status |

### Stage 3: LABEL — DONE (Mode A); PARTIAL (Mode B)

| Feature | Status | Notes |
|---------|--------|-------|
| **Mode A: Training Sheet Review** | | |
| Review Q&A pairs (approve/edit/reject/flag) | DONE | `CuratePage.tsx` detail mode with inline editing |
| AI-assisted generation for blank responses | DONE | Generate mutation in CuratePage |
| Export approved Training Sheets (JSONL) | DONE | `POST /assemblies/{id}/export` (openai_chat / anthropic / gemini formats) |
| **Mode B: Canonical Labeling Tool** | | |
| Browse sheets and label source items | DONE | `CanonicalLabelingTool.tsx` in sidebar |
| Create / edit canonical labels | DONE | Full CRUD wired to 13 backend endpoints |
| Multiple labelsets per item | DONE | Composite key `(sheet_id, item_ref, label_type)` |
| Label confidence + usage constraints | DONE | Backend model supports it |
| Version history | BACKEND ONLY | Backend tracks versions; UI doesn't display history |
| **Labeling Jobs (annotation workflow)** | | |
| Create / manage labeling jobs | DONE | `LabelingJobsPage.tsx` — create, start, pause, resume, delete |
| Task assignment + progress tracking | DONE | 30+ backend endpoints for full workflow |
| Task board view | SCAFFOLD | Button exists, shows "Coming soon" toast |
| **Label Sets** | | |
| Browse / create / manage label sets | DONE | `LabelSetsPage.tsx` with full CRUD |
| Publish / archive lifecycle | DONE | Status-aware row actions |

### Stage 4: TRAIN — PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Browse Training Sheets for training | DONE | `TrainPage.tsx` lists assemblies |
| Configure and submit FMAPI training job | BACKEND ONLY | Full `TrainingService` with FMAPI integration, but `TrainPage` is read-only (no `createTrainingJob` call) |
| Monitor training job progress | BACKEND ONLY | `poll_job_status`, events, metrics endpoints exist |
| Dual quality gates (status + governance) | BACKEND ONLY | Export filters by status + usage constraints |
| Model evaluation (MLflow Evaluate) | NOT STARTED | No evaluation harness |
| Compare model versions A/B | NOT STARTED | |
| Lineage recording | DONE | `model_training_lineage` table + API |

### Stage 5: DEPLOY — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| List UC models and versions | DONE | `DeployPage.tsx` model browser |
| Create serving endpoint | DONE | Deploy mutation, full Databricks SDK integration |
| Endpoint playground (query endpoint) | DONE | Query panel with JSON editor |
| List / manage serving endpoints | DONE | Endpoint table with status |
| Rollback to previous version | BACKEND ONLY | API exists, no UI button |
| Registries (Tools/Agents/Endpoints) | DONE | `RegistriesPage.tsx` — tabbed CRUD admin (just built) |
| Guardrails configuration | NOT STARTED | PRD P1 feature, no implementation |

### Stage 6: MONITOR — DONE (scaffold-level for some metrics)

| Feature | Status | Notes |
|---------|--------|-------|
| Endpoint performance metrics | DONE | `MonitorPage.tsx` queries real feedback data |
| Real-time metrics (latency, errors) | PARTIAL | API exists, derived from feedback table (no dedicated metrics ingestion) |
| Drift detection | PARTIAL | UI panel exists, backend endpoint works but analysis is basic |
| Alert management (create/ack/resolve) | DONE | Full alert CRUD wired in MonitorPage |
| Health dashboard | DONE | Combined health score endpoint |

### Stage 7: IMPROVE — PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| User feedback capture (thumbs up/down) | DONE | `ImprovePage.tsx` + `POST /feedback` |
| Feedback stats and trends | DONE | Stats endpoint wired to UI |
| Convert feedback to training data | DONE | `POST /feedback/{id}/to-training` wired |
| Gap analysis | SCAFFOLD | Backend uses **simulated** analysis functions (`_simulate_error_analysis`, etc.); CRUD for gap records is real |
| Annotation task creation from gaps | NOT STARTED | `GET /gaps/tasks` always returns `[]` |
| Trigger retraining | NOT STARTED | No UI to initiate retrain from gaps |

---

## TOOLS Section Status

| Tool | Sidebar | Page | API Wired | Mutations | Status |
|------|---------|------|-----------|-----------|--------|
| Prompt Templates | Yes | `TemplatePage.tsx` (518 lines) | Yes | Publish, Archive, Delete, **Create Version** | DONE |
| Example Store | Yes | `ExampleStorePage.tsx` (690 lines) | Yes | Delete, **Copy+Track**, **Regen Embeddings** | DONE |
| DSPy Optimizer | Yes | `DSPyOptimizationPage.tsx` (729 lines) | Yes | Export, Create Run, Cancel, Sync Results | DONE |
| Canonical Labeling | Yes | `CanonicalLabelingTool.tsx` | Yes | Full CRUD | DONE |
| Data Quality (DQX) | Yes | `DataQualityPage.tsx` (36 lines) | Minimal | None | SCAFFOLD — tiny redirect, real DQX is inline in SheetBuilder |
| Labeling Jobs | Yes | `LabelingJobsPage.tsx` (1099 lines) | Yes | Create, Start, Pause, Resume, Delete | DONE |
| Label Sets | Yes | `LabelSetsPage.tsx` (619 lines) | Yes | Full CRUD + Publish/Archive | DONE |
| Registries | Yes | `RegistriesPage.tsx` (1050 lines) | Yes | Full CRUD for Tools/Agents/Endpoints | DONE |
| Example Effectiveness | No sidebar entry | `ExampleEffectivenessDashboard.tsx` (548 lines) | Yes (read) | None | DONE (read-only dashboard, embedded in Example Store module) |

---

## Module Registry

8 modules registered in `frontend/src/modules/registry.ts`:

| Module | ID | Stage | Category | Status |
|--------|----|-------|----------|--------|
| DSPy | `dspy` | train | training | Enabled |
| Data Quality | `data-quality` | data | quality | Enabled |
| Example Store | `example-store` | train | training | Enabled |
| Labeling | `labeling` | label | labeling | Enabled |
| Label Sets | `label-sets` | label | labeling | Enabled |
| Canonical Labels | `canonical-labels` | label | labeling | Enabled |
| Quality Gate | `quality-gate` | train | quality | Enabled |
| Registries | `registries` | deploy | deployment | Enabled |

---

## Backend API Coverage

**19 routers** registered under `/api/v1`. ~150+ endpoints total.

| Router | Endpoints | Status |
|--------|-----------|--------|
| Sheets | 9 | Fully implemented |
| Assemblies (Training Sheets) | 8 | Fully implemented |
| Templates | 8 | Fully implemented |
| Canonical Labels | 13 | Fully implemented |
| Labelsets | 9 | Fully implemented |
| Curated Datasets | 11 | Fully implemented |
| Curation | 7 | Fully implemented |
| Labeling Workflow | 31 | Fully implemented |
| Example Store | 12 | Fully implemented |
| DSPy | 10 | Fully implemented |
| Training | 9 | Fully implemented |
| Deployment | 13 | Fully implemented |
| Monitoring | 10 | Fully implemented |
| Feedback | 10 | Fully implemented |
| Registries | 15 | Fully implemented |
| Unity Catalog | 6 | Fully implemented |
| Gap Analysis | 10 | Partial — analysis is simulated, CRUD is real |
| Attribution | 7 | Present — not fully verified |
| Agents | 3 | Fully implemented |
| Settings/Admin | 7 | Fully implemented |
| Data Quality (DQX) | 4 | Partial — `GET results` is a stub |
| Quality Proxy | 1 | Fully implemented |

---

## Known Issues

1. **Gap analysis is simulated** — `gap_analysis_service.py` uses `_simulate_*` helper functions instead of real model evaluation. `PUT /gaps/{id}` has a `# TODO: Persist update to database` comment.

2. **Data quality results stub** — `GET /data-quality/sheets/{id}/results` returns empty results, no DB persistence.

3. ~~**Schema references stale**~~ — FIXED. `canonical_labels.py`, `feedback.py`, `training_service.py`, and `settings.py` now use `training_sheets`/`qa_pairs`.

4. **TrainPage is read-only** — Backend has full training job lifecycle (create, poll, cancel, metrics), but the frontend only calls `listAssemblies`. No job creation or monitoring UI.

~~6. **Labeling table schemas not in DDL**~~ — FIXED. DDL files `09_labeling_jobs.sql` through `12_workspace_users.sql` added to `schemas/`.

7. **No auth middleware** — All endpoints are open at FastAPI layer; relies entirely on Databricks App platform OAuth.

---

## Remaining Work (Priority Order)

### P0: Critical Gaps

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| 1 | **Train Page — job creation UI** | Wire `createTrainingJob`, `pollJobStatus`, `cancelJob`, `getJobMetrics` from API. TrainPage currently only reads assemblies. | M |
| ~~2~~ | ~~**Fix stale schema references**~~ | ~~DONE — `canonical_labels.py`, `feedback.py`, `training_service.py`, `settings.py` updated~~ | ~~S~~ |
| 2 | **Gap analysis — real implementation** | Replace `_simulate_*` functions with actual model evaluation using MLflow metrics. Persist gap updates to DB. | L |

### P1: High Value

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| 4 | **Canonical label lookup status in GENERATE** | Show "X% of items have canonical labels" during assembly. Backend supports bulk lookup. | S |
| ~~5~~ | ~~**Deploy — rollback UI**~~ | ~~DONE — `rollbackDeployment` API function + "Rollback Version" row action in DeployPage~~ | ~~XS~~ |
| 6 | **Deploy — guardrails** | PRD P1 feature. No backend or frontend. Research Databricks Guardrails API first. | L |
| 7 | **Monitor — dedicated metrics ingestion** | Currently derives metrics from feedback table. Need real Lakehouse Monitoring integration. | M |
| 8 | **Canonical label version history UI** | Backend tracks versions; UI needs a history viewer panel | S |
| 9 | **Agent Framework hook** | `AgentRetrieverService` exists; need documentation + registration endpoint for Mosaic AI Agent Framework | M |
| ~~10~~ | ~~**Labeling schema DDL**~~ | ~~DONE — `09_labeling_jobs.sql`, `10_labeling_tasks.sql`, `11_labeled_items.sql`, `12_workspace_users.sql`~~ | ~~S~~ |

### P2: Nice to Have

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| 11 | **Lineage DAG visualization** | Backend has attribution/lineage traversal; no interactive frontend visualization | L |
| 12 | **Model evaluation harness** | No MLflow Evaluate integration for A/B model comparison | L |
| 13 | **Synthetic data generation** | PRD P2. No backend or frontend. | L |
| 14 | **Active learning** | PRD P2. No model-in-the-loop sampling. | L |
| 15 | **Image annotation tools** | PRD P2. Bounding box / polygon labeling for vision use cases. | L |
| 16 | **Data Quality results persistence** | `GET /data-quality/sheets/{id}/results` is a stub | S |
| 17 | **Task board view for labeling** | Button exists with "Coming soon" toast | M |

---

## Recently Completed (Feb 18, 2026)

- Registries admin page (Tools/Agents/Endpoints CRUD with tabbed DataTable UI)
- Example Store: copy-to-clipboard tracks usage via `trackExampleUsage`
- Example Store: "Regenerate Embeddings" button wired
- SheetBuilder: real publish/archive/delete replacing placeholder
- SheetBuilder: template detach button
- TemplatePage: "Create Version" action for published templates
- Ontos governance made first-class (sidebar links to external Ontos modules)
- Fixed stale schema references (`assemblies` → `training_sheets`, `assembly_rows` → `qa_pairs`) in 4 backend files
- Labeling DDL files (09–12) added to `schemas/` for `labeling_jobs`, `labeling_tasks`, `labeled_items`, `workspace_users`
- Deploy: rollback version row action wired to `POST /endpoints/{name}/rollback`
- Deleted 125+ stale docs from `docs/archive/`, `schemas/archive/`, `docs/planning/`, `docs/implementation/`, `docs/prd/`

---

## Effort Key

| Size | Meaning |
|------|---------|
| XS | < 2 hours |
| S | Half day |
| M | 1–2 days |
| L | 3–5 days |

---

## Superseded Documents

The following stale docs have been **deleted** (Feb 18, 2026):

- `docs/GAP_ANALYSIS_V2.md`, `docs/SPRINT_PLAN.md`, `docs/BACKLOG.md`
- `docs/prd/` directory (including `v2.3-implementation-status.md`)
- `docs/planning/` and `docs/implementation/` directories
- `docs/archive/` and `schemas/archive/` directories
- `docs/DOCUMENTATION_INDEX.md`, `docs/BUSINESS_CASE.md`, `docs/INTEGRATION_GUIDE.md`

This file (`PROJECT_STATUS.md`) is the single source of truth for implementation status.
