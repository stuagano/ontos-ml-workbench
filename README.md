# Ontos ML Workbench

Mission control for AI-powered ML lifecycle management on Databricks — from raw data to production models with full governance.

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## What This Is

**Ontos ML Workbench** is a full-stack Databricks App (FastAPI + React) that gives domain experts, data scientists, and stewards a unified, no-code workflow for building and governing AI systems. It manages the complete ML lifecycle:

- **Prompt templates as reusable IP** — encode domain expertise once, apply across datasets
- **Canonical labeling** — experts label source data once, labels reuse everywhere
- **Training data generation** — combine datasets + templates to produce Q&A pairs at scale
- **Fine-tuning orchestration** — dual quality gates (expert approval + usage governance)
- **Production monitoring** — drift detection, latency tracking, feedback loops

### Integrated Open-Source Components

The workbench builds on two Databricks Labs projects for data quality and governance:

| Component | What It Does | Integration |
|-----------|-------------|-------------|
| **[DQX](https://github.com/databrickslabs/dqx)** | Automated data quality validation — applies quality rules to datasets, profiles data distributions, and flags issues before they reach training | pip package (`databricks-labs-dqx[llm]`). Quality checks run in the DATA and LABEL stages to ensure training data meets standards. |
| **[Ontos](ontos/)** | Data governance platform — data product catalogs, contracts (ODCS format), compliance workflows, and asset review | Git submodule (optional). Adds governance dashboards and contract management. The workbench runs fully without it. |

> **Naming note:** "Ontos ML Workbench" is this application. "Ontos" is the separate governance platform included as an optional submodule. They are independent projects that work well together.

## Getting Started

### Prerequisites

- Python 3.11+, Node.js 18+
- Databricks CLI: `brew install databricks`
- A Databricks workspace with Unity Catalog and a SQL Warehouse

### Clone

```bash
git clone https://github.com/<your-org>/ontos-ml-workbench.git
cd ontos-ml-workbench

# Optional: initialize the ontos governance submodule
# (requires access to the ontos repo — workbench runs fine without it)
git submodule update --init --recursive
```

### Deploy to Databricks Apps

This is the primary deployment path. The app runs as a managed Databricks App with its own service principal.

**1. Authenticate and find your warehouse ID:**

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com --profile your-profile
databricks warehouses list --profile your-profile
```

**2. Configure `databricks.yml`** — set your profile, catalog, schema, and warehouse ID:

```yaml
# In the 'dev' target section:
targets:
  dev:
    workspace:
      profile: your-profile          # ← your CLI profile
    variables:
      catalog: your_catalog           # ← your Unity Catalog catalog
      schema: ontos_ml                # ← schema name (created automatically)
      warehouse_id: "abc123def456"    # ← your SQL Warehouse ID
```

> These values flow through `app.yaml` into the deployed app as environment variables. You do **not** need `backend/.env` for Databricks Apps — that file is only for local development.

**3. Initialize database** — create tables and seed sample data:

```bash
# In Databricks SQL Editor, run these files in order:
# schemas/00_create_catalog.sql through 33_platform_connectors.sql

# Or use the bootstrap script:
./scripts/bootstrap.sh <workspace-name>
```

**4. Build and deploy:**

```bash
cd frontend && npm install && npm run build && cd ..
databricks bundle deploy -t dev
```

This creates the Databricks App, uploads the code, and starts it.

**5. Grant the app's service principal access to your data:**

```sql
-- Get the service principal ID from:
-- databricks apps get ontos-ml-workbench-dev --profile your-profile -o json | jq -r '.service_principal_id'

GRANT USE CATALOG ON CATALOG your_catalog TO `<service-principal-id>`;
GRANT USE SCHEMA ON SCHEMA your_catalog.ontos_ml TO `<service-principal-id>`;
GRANT SELECT, MODIFY ON SCHEMA your_catalog.ontos_ml TO `<service-principal-id>`;
```

**6. Open the app:**

```bash
databricks apps get ontos-ml-workbench-dev --profile your-profile -o json | jq -r '.url'
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide and [RUNBOOK.md](RUNBOOK.md) for operations.

### Run Locally (for development)

For local development, configure `backend/.env` instead of `databricks.yml`:

```bash
cd backend && cp .env.example .env
# Edit backend/.env with your host, token, catalog, schema, warehouse ID
```

Then start both servers:

```bash
# Terminal 1: Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

> **Tip:** For a single-command dev experience with hot reload, use [APX](https://databricks-solutions.github.io/apx/):
> `pip install apx --index-url https://databricks-solutions.github.io/apx/simple && apx dev start`

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
├── ontos/                  # Git submodule — data governance platform
├── schemas/                # Delta table DDL
├── resources/              # DAB job definitions
├── synthetic_data/         # Sample data for demo use cases
├── databricks.yml          # DAB bundle config
└── app.yaml               # Databricks App config
```

## How the Pieces Fit Together

```
┌──────────────────────────────────────────────────────┐
│              Ontos ML Workbench (this repo)           │
│                                                       │
│   React UI ←→ FastAPI Backend ←→ Databricks SDK      │
│                                                       │
│   ┌─────────────┐  ┌──────────────────────────────┐  │
│   │    Ontos    │  │          DQX                 │  │
│   │ (optional)  │  │  (data quality validation)   │  │
│   │             │  │                              │  │
│   │ Governance, │  │  Quality rules, profiling,   │  │
│   │ contracts,  │  │  LLM-assisted data checks    │  │
│   │ compliance  │  │                              │  │
│   └─────────────┘  └──────────────────────────────┘  │
│                                                       │
│   ┌───────────────────────────────────────────────┐  │
│   │            Databricks Platform                │  │
│   │  Unity Catalog · SQL Warehouse · FMAPI        │  │
│   │  MLflow · Serving Endpoints · Workflows       │  │
│   └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

Development tooling (not part of deployed app):
  APX — unified hot-reload dev server for backend + frontend
  See: https://databricks-solutions.github.io/apx/
```

## Updating Dependencies

**DQX** (pip package — data quality):
```bash
pip install --upgrade databricks-labs-dqx[llm]
```

**Ontos** (submodule — governance, optional):
```bash
git submodule update --remote ontos
git add ontos
git commit -m "chore: update ontos submodule"
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Sheets** | Lightweight pointers to Unity Catalog data sources (tables + volumes for multimodal) |
| **Canonical Labels** | Expert-validated ground truth — "label once, reuse everywhere" |
| **Training Sheets** | Materialized Q&A datasets generated from Sheets + Templates |
| **Prompt Templates** | Reusable IP encoding domain expertise — the key abstraction |

## Lifecycle Stages

1. **DATA** — Define Sheets pointing to Unity Catalog sources
2. **GENERATE** — Apply Templates to Sheets to create Q&A pairs
3. **LABEL** — Expert review (Training Sheet review or direct Canonical Labeling)
4. **TRAIN** — Fine-tune with dual quality gates (approval status + usage constraints)
5. **DEPLOY** — Serve models via Databricks endpoints
6. **MONITOR** — Track drift, latency, accuracy in production
7. **IMPROVE** — Feedback loops and retraining from canonical labels

## Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | Get running in 10 minutes |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full deployment guide |
| [RUNBOOK.md](RUNBOOK.md) | Operations and troubleshooting |
| [docs/PRD.md](docs/PRD.md) | Product requirements |

## License

See [LICENSE](LICENSE) for details.
