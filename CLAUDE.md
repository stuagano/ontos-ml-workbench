# Ontos ML Workbench

**ML lifecycle extensions for the Ontos data governance platform on Databricks**

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

**PRD Version:** v2.3 (Validated)
**Design Doc:** `docs/ML_EXTENSION_DESIGN.md`

## Project Overview

Ontos ML Workbench extends the open-source [Ontos](https://github.com/larsgeorge/ontos) data governance platform with ML workflow capabilities. All application code lives in the `ontos/` submodule — this repo provides documentation, schemas, notebooks, and deployment configuration.

### What Lives Where

| Directory | Purpose |
|-----------|---------|
| `ontos/` | **The application** — FastAPI backend + React frontend with ML extensions |
| `docs/` | Design documents, PRD, business case, integration guide |
| `schemas/` | Delta table DDL (reference for Unity Catalog table creation) |
| `notebooks/` | Databricks notebooks for train, monitor, improve, curate workflows |
| `resources/` | DAB job definitions |
| `databricks.yml` | Databricks Asset Bundle config |

### Core Concepts

**1. Sheets (Dataset Definitions)**
Lightweight pointers to Unity Catalog tables and volumes. Sheets enable multimodal data fusion (images + sensor data + metadata) without copying data.

**2. Canonical Labels (Ground Truth Layer)**
Expert-validated labels stored independently of Q&A pairs. Enables **"label once, reuse everywhere"** — experts label source data once, labels automatically reused across all Training Sheets. Supports multiple labelsets per item via composite key `(sheet_id, item_ref, label_type)`.

**3. Training Sheets (Q&A Datasets)**
Materialized Q&A pairs generated from Sheets + Templates. Canonical label lookup provides automatic pre-approval when expert labels exist.

**4. Prompt Templates (Reusable IP)**
With LLMs, data modality no longer matters. Images, sensor telemetry, documents all converge through **prompt templates** — reusable assets encoding domain expertise.

## Architecture

The ML extensions follow Ontos's 4-layer pattern:

```
Route → Manager → Repository → ORM Model
```

All ML code is in `ontos/src/backend/src/` and `ontos/src/frontend/src/`:

```
ontos/src/backend/src/
├── db_models/ml_*.py          # SQLAlchemy ORM models (12 files)
├── repositories/ml_*.py       # Repository layer (13 files)
├── controller/ml_*.py         # Business logic managers (13 files)
├── routes/ml_*.py             # FastAPI route modules (13 files)
├── models/ml_*.py             # Pydantic API models (12 files)
└── data/ml_demo_data.sql      # Demo seed data

ontos/src/frontend/src/
├── types/ml-extensions.ts     # Shared TypeScript types
├── lib/api-utils.ts           # Shared API utilities
└── views/ml-*.tsx             # ML workflow pages
```

### ML Feature Domains

| Domain | What It Does |
|--------|-------------|
| **Sheets** | Dataset definitions, multimodal source management |
| **Training Sheets** | Q&A dataset generation and management |
| **Canonical Labels** | Expert ground truth labels |
| **Templates** | Prompt template library |
| **Example Store** | Few-shot example management for DSPy |
| **Labeling** | Job/task workflow with state machines, assignment, review |
| **Monitoring** | Endpoint metrics, drift detection, alerts, health scoring |
| **Lineage** | Graph materialization, BFS traversal, edge tracking |
| **Quality (DQX)** | Data quality checks, profiling, AI rule generation |
| **Feedback** | User ratings, flagging, conversion to training data |
| **Curated Datasets** | Dataset versioning, splits, approval workflow |
| **Agent Retrieval** | Few-shot example retrieval, outcome tracking |
| **Model Registry** | Tool/agent registry with health checks |

## Development

### Working on Ontos ML Extensions

```bash
# Navigate to the Ontos submodule
cd ontos

# Backend
cd src/backend
hatch -e dev run uvicorn src.app:app --reload

# Frontend
cd src/frontend
yarn install && yarn dev
```

See `ontos/CLAUDE.md` for Ontos-specific development instructions.

### Alembic Migrations

ML extensions use Alembic migrations prefixed with `ml`:

```bash
cd ontos/src/backend
alembic upgrade head
```

### Deploy to Databricks

See `ontos/` deployment docs and `databricks.yml` for bundle configuration.

## Delta Tables (Reference)

The `schemas/` directory contains Delta table DDL for Unity Catalog. These are reference SQL — the Ontos backend uses SQLAlchemy + Lakebase for its operational tables.

**Core ML Tables:**

| Table | Purpose |
|-------|---------|
| `sheets` | Dataset definitions (pointers to Unity Catalog sources) |
| `canonical_labels` | Ground truth labels with composite key `(sheet_id, item_ref, label_type)` |
| `templates` | Prompt template definitions |
| `training_sheets` | Q&A datasets |
| `qa_pairs` | Individual Q&A pairs with governance constraints |
| `model_training_lineage` | Model → Training Sheet lineage |
| `example_store` | Managed few-shot examples |

**Operations & Governance Tables:**

| Table | Purpose |
|-------|---------|
| `feedback_items` | User feedback (ratings, comments, flags) |
| `labeling_jobs` / `labeling_tasks` / `labeled_items` | Labeling workflow |
| `workspace_users` | Labeling workspace user management |
| `model_evaluations` | MLflow evaluation results |
| `identified_gaps` / `annotation_tasks` | Gap analysis and remediation |
| `dqx_quality_results` | Data quality check results |
| `endpoint_metrics` | Endpoint performance metrics |
| `curated_datasets` | Versioned, approved datasets |
| `agent_retrieval_events` | Agent example retrieval tracking |
| `tools_registry` / `agents_registry` | Tool and agent registries |
| `monitor_alerts` | Monitoring alert lifecycle |
| `ml_lineage_edges` | Materialized lineage graph |

## Workflow Stages

### 1. DATA
Extract and define Sheets (lightweight pointers to Unity Catalog data)

### 2. GENERATE
Apply templates to Sheets to generate Q&A pairs. Canonical label lookup provides automatic pre-approval.

### 3. LABEL
Two labeling workflows:
- **Mode A**: Training Sheet review — approve/edit/reject Q&A pairs
- **Mode B**: Canonical Labeling — label source data directly for reuse

### 4. TRAIN
Fine-tune models using approved Q&A pairs. Dual quality gates (expert approval + usage governance).

### 5. DEPLOY
Deploy models via Databricks serving endpoints.

### 6. MONITOR
Track production performance, drift detection, alerting, health scoring.

### 7. IMPROVE
Feedback loops, gap analysis, curated dataset management, retraining candidates.

## Code Style

- **Ontos patterns**: 4-layer architecture, CRUDBase repos, singleton managers
- **Type Safety**: Full TypeScript on frontend, Pydantic on backend
- **Terminology**: Use "Sheet", "Training Sheet", "Canonical Label"
