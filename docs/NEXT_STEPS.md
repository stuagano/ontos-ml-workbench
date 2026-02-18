# Ontos ML Workbench - Development Status

## Current State (January 2026)

### ✅ Completed

**Infrastructure**
- 9 Delta tables in `your_catalog.ontos_ml_dev`
- 11 Databricks jobs deployed via DAB
- CI/CD pipeline (backend, frontend, E2E tests)

**Backend (FastAPI)**
- Template CRUD with versioning and publishing
- Curation API with pagination, bulk updates, AI labeling
- Jobs API with 16 job types
- Registries API (tools, agents, endpoints)
- Feedback API
- Unity Catalog browsing API (catalogs, schemas, tables, volumes)
- Model deployment API (deploy, query, status)

**Frontend (React + TypeScript)**
- 7-stage pipeline UI with full functionality
- Template editor with versioning
- Curation queue with bulk actions
- Job launcher modal
- Dark mode, responsive design
- UC Browser component with tree navigation
- Drag-and-drop DataPage for source selection
- One-click deployment wizard with 3-step flow
- In-app model playground
- Monitor dashboard with metrics, drift, and feedback

**Production Polish**
- ErrorBoundary with retry and error details
- ConfirmDialog for destructive actions (danger/warning/info variants)
- EmptyState preset components for all scenarios
- Keyboard shortcuts with Shift+? help modal
- Vim-style navigation (j/k for up/down)

**Notebooks (Backend Jobs)**
- `labeling_agent.py` - AI-assisted labeling
- `data_assembly.py` - Training data formatting

### ❌ Blocked
- Databricks App deployment (workspace at 100 app limit)

---

## Completed UI Work

### ✅ Priority 1: Data Stage UI (DONE)
- [x] UC browser component to browse catalogs/schemas/tables/volumes
- [x] Drag-and-drop source selection onto canvas
- [x] One-click "Extract" buttons (OCR, transcribe, embed) that trigger jobs
- [x] Deep links to UC Explorer in Databricks ONE

### ✅ Priority 2: Train Stage UI (DONE)
- [x] "Assemble Training Data" button that runs data_assembly job
- [x] Training wizard (select base model, set hyperparameters)
- [x] "Start Fine-tuning" button that triggers FMAPI training
- [x] Progress panel with live metrics from polling
- [x] Deep links to MLflow Experiments in ONE

### ✅ Priority 3: Deploy Stage UI (DONE)
- [x] Model selector showing trained models from UC registry
- [x] "Deploy" button that creates serving endpoint
- [x] Endpoint status cards (creating → ready → serving)
- [x] In-app playground to test deployed models
- [x] Deep links to Model Serving in ONE

### ✅ Priority 4: Monitor Stage UI (DONE)
- [x] Metrics cards (latency, throughput, errors, cost)
- [x] Drift detection panel with analysis trigger
- [x] Feedback loop panel with satisfaction metrics
- [x] Deep links to Lakehouse Monitoring dashboards
- [x] Deep links to MLflow Tracing

### ✅ Priority 5: Production Polish (DONE)
- [x] Error boundary components
- [x] Confirmation dialogs for destructive actions
- [x] Empty state illustrations
- [x] Keyboard shortcuts (Shift+? for help)

---

## Remaining Work

### Priority 6: Final Production Readiness
- [ ] Databricks OAuth for app authentication
- [ ] Integration tests against live workspace
- [ ] Performance optimization (React.memo, useMemo)
- [ ] Accessibility audit (ARIA labels, focus management)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+?` | Show keyboard shortcuts help |
| `Alt+N` | Create new template |
| `Escape` | Close modal |
| `j` / `↓` | Next item |
| `k` / `↑` | Previous item |
| `Enter` | Select / Open |
| `a` | Approve item (curation) |
| `r` | Reject item (curation) |
| `f` | Flag for review (curation) |

---

## Design Principle

**App = Primary Interface | Databricks ONE = Power User Escape Hatch**

- All common workflows should be achievable without leaving the app
- Every entity (table, model, endpoint, job) has a "Open in Databricks" link
- Jobs/notebooks are implementation details, not user-facing
- Progressive disclosure: simple UI by default, ONE for advanced users

---

## Running Locally

```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend  
cd frontend && npm run dev
```

## Running Tests

```bash
cd backend && python3 -m pytest tests/ -v
cd frontend && npm test
cd frontend && npm run test:e2e
```
