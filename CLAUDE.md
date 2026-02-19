# Ontos ML Workbench

**Mission control for Acme Instruments' AI-powered radiation safety platform on Databricks**

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

> **UI Note:** In the sidebar, DATA and GENERATE are intentionally merged into a single
> "Datasets" page. The SheetBuilder page handles both dataset creation and Q&A generation.
> The backend `/api/v1/generate/` endpoints remain available independently.

**PRD Version:** v2.3 (Validated - Ready for Implementation)  
**See:** `docs/PRD.md`

## Project Overview

Ontos ML Workbench is a Databricks App for building and governing AI systems for radiation safety. It enables Acme Instruments' domain experts, physicists, and data stewards to participate in AI development through a no-code, multimodal data curation platform.

### Core Concepts

**1. Sheets (Dataset Definitions)**
Lightweight pointers to Unity Catalog tables and volumes. Sheets enable multimodal data fusion (images + sensor data + metadata) without copying data.

**2. Canonical Labels (Ground Truth Layer)**
Expert-validated labels stored independently of Q&A pairs. Enables **"label once, reuse everywhere"** - experts label source data once, labels automatically reused across all Training Sheets. Supports multiple labelsets per item via composite key `(sheet_id, item_ref, label_type)`.

**3. Training Sheets (Q&A Datasets)**
Materialized Q&A pairs generated from Sheets + Templates. Canonical label lookup provides automatic pre-approval when expert labels exist.

**4. Prompt Templates (Reusable IP)**
With LLMs, data modality no longer matters. Images, sensor telemetry, documents all converge through **prompt templates** - reusable assets encoding Acme Instruments' 60+ years of radiation expertise.

### Key Use Cases
- **Defect Detection**: Image + sensor context → defect classification
- **Predictive Maintenance**: Telemetry → failure probability
- **Anomaly Detection**: Sensor stream → alert + explanation
- **Calibration Insights**: MC results → recommendations
- **Document Extraction**: Compliance docs → structured data
- **Remaining Useful Life**: Equipment history → RUL estimate

## Architecture

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # REST endpoints
│   │   ├── core/           # Config, auth, Databricks SDK
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic
│   └── jobs/               # Databricks job notebooks
├── frontend/               # React + TypeScript + Tailwind
│   └── src/
│       ├── components/     # Reusable UI
│       ├── pages/          # 7 stage pages
│       ├── services/       # API client
│       └── types/          # TypeScript types
├── schemas/                # Delta table DDL
├── resources/              # DAB job definitions
├── synthetic_data/         # Acme Instruments-specific sample data
├── databricks.yml          # DAB bundle config
└── app.yaml               # Databricks App config
```

## Development

### Recommended: APX with Hot Reload (Unified Dev Server)
```bash
# Install APX
uvx --index https://databricks-solutions.github.io/apx/simple apx init

# Start dev server (hot reload for both backend + frontend)
apx dev start
```

**Benefits**: Single command, instant hot reload for Python and React changes, unified logging.

See [MODULE_DEV_WITH_APX.md](frontend/MODULE_DEV_WITH_APX.md) for APX development workflow.

### Alternative: Manual Setup (Traditional)
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Deploy to Databricks
```bash
# Build frontend
cd frontend && npm run build && cd ..

# Deploy app
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=your-profile

# IMPORTANT: Always poll for deployment completion
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench your-profile
```

**See**: `.claude/DEPLOYMENT_WORKFLOW.md` for complete deployment procedures and troubleshooting.

## Synthetic Data

Sample data for Acme Instruments use cases in `synthetic_data/`:
- `defect_detection/` - Inspection images with defect labels
- `predictive_maintenance/` - Equipment telemetry and failures
- `anomaly_detection/` - Sensor streams with labeled anomalies
- `calibration/` - Monte Carlo simulation outputs

## Delta Tables (PRD v2.3)

**Configuration**: Set in `backend/.env` (copy from `backend/.env.example`)
- Workspace: Your Databricks workspace URL
- Catalog: Your Unity Catalog catalog
- Schema: `ontos_ml` (or your preferred schema name)
- Warehouse: Your SQL Warehouse ID
- Profile: Your Databricks CLI profile name

**Note**: Configure your workspace as a target in `databricks.yml`

**Core Data Model:**

| Table | Purpose |
|-------|---------|
| `sheets` | Dataset definitions (pointers to Unity Catalog sources) |
| `canonical_labels` | Ground truth labels (independent of Q&A pairs) with composite key `(sheet_id, item_ref, label_type)` |
| `templates` | Prompt template definitions with `label_type` field |
| `training_sheets` | Q&A datasets (formerly assemblies) |
| `qa_pairs` | Individual Q&A pairs with `canonical_label_id`, `allowed_uses`, `prohibited_uses` |
| `model_training_lineage` | Tracks which models used which Training Sheets |
| `example_store` | Managed few-shot examples for DSPy |

**Operations & Governance Tables:**

| Table | Purpose |
|-------|---------|
| `feedback_items` | User feedback (ratings, comments, flags) |
| `endpoints_registry` | Registered serving endpoints with model metadata |
| `labeling_jobs` | Structured labeling job definitions |
| `labeling_tasks` | Task batches within labeling jobs |
| `labeled_items` | Individual item annotations |
| `workspace_users` | Labeling workspace users |
| `model_evaluations` | MLflow evaluation results (per-metric) |
| `identified_gaps` | Gap analysis findings |
| `annotation_tasks` | Gap remediation annotation tasks |
| `bit_attribution` | Model attribution scores per training data |
| `dqx_quality_results` | Data quality check results per sheet |
| `endpoint_metrics` | Per-request endpoint performance metrics |

**Key Schema Features:**
- Multimodal support: Tables reference Unity Catalog volumes for images, PDFs, audio
- Multiple labelsets per item: Same source data can have multiple independent labels
- Usage constraints: Governance layer separate from quality approval
- Lineage tracking: Complete traceability from source data → Q&A pairs → trained models

## Workflow Stages

### 1. DATA
Extract and define Sheets (lightweight pointers to Unity Catalog data)

### 2. GENERATE
Apply templates to Sheets to generate Q&A pairs. Canonical label lookup provides automatic pre-approval.

### 3. LABEL
Two labeling workflows:

**Mode A: Training Sheet Review**
- Expert reviews Q&A pairs in LABEL stage
- Approve/Edit/Reject actions
- Creates canonical labels for future reuse

**Mode B: Canonical Labeling Tool (TOOLS section)**
- Expert labels source data directly before generating Q&A pairs
- Labels immediately available for all Training Sheets
- Enables "label once, reuse everywhere"

### 4. TRAIN
Fine-tune models using approved Q&A pairs. Dual quality gates:
- **Status** (quality): `labeled` = expert approved
- **Usage Constraints** (governance): Check `allowed_uses`, `prohibited_uses`

### 5. DEPLOY
Deploy models across ACE architecture (Airgap, Cloud, Edge)

### 6. MONITOR
Track production performance, drift detection

### 7. IMPROVE
Feedback loops, gap analysis, retraining candidates

## TOOLS Section (Asset Management)

- **Prompt Templates** (Alt+T) - Reusable prompt library
- **Example Store** (Alt+E) - Dynamic few-shot examples
- **DSPy Optimizer** (Alt+D) - Automated prompt optimization
- **Canonical Labeling Tool** - Label source data directly

## Progress Tracking

**Single source of truth**: `docs/PROJECT_STATUS.md`

After completing any feature, bug fix, or schema change:
1. Update `docs/PROJECT_STATUS.md` — mark items DONE (strikethrough), update Known Issues, add to "Recently Completed"
2. If you added/changed a Delta table, update `schemas/README.md` file listings and Quick Start section
3. If you added/changed an API endpoint, verify the Backend API Coverage table is still accurate
4. If you added/changed a frontend page or tool, verify the TOOLS Section Status and Stage-by-Stage tables

Do NOT create new tracking documents. All status belongs in `docs/PROJECT_STATUS.md`.

## Code Style

- **Modular**: Keep files focused and small
- **Type Safety**: Full TypeScript on frontend, Pydantic on backend
- **Domain-Specific**: Use radiation safety terminology consistently
- **ACE-Ready**: Support Airgap, Cloud, Edge deployment patterns
- **Terminology**: Use "Sheet", "Training Sheet", "Canonical Label" (not old terms like "DataBit", "Assembly")
