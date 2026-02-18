# Ontos ML Workbench

Mission control for AI-powered ML lifecycle management on Databricks — from raw data to production models with full governance.

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## What This Is

Ontos ML Workbench is a Databricks App that gives domain experts, data scientists, and stewards a unified workflow for building and governing AI systems. It combines three open-source projects into a single platform:

| Component | Role | How It's Used |
|-----------|------|---------------|
| **[Ontos](https://github.com/stuagano/ontos)** | Data governance & contracts | Git submodule — provides data product management, contracts (ODCS), compliance, and asset review workflows |
| **[DQX](https://github.com/databrickslabs/dqx)** | Data quality | pip package (`databricks-labs-dqx[llm]`) — quality rules engine integrated into the workbench pipeline |
| **[APX](https://databricks-solutions.github.io/apx/)** | Dev tooling | CLI tool — unified hot-reload dev server for backend + frontend |

The workbench adds the ML lifecycle layer on top: prompt templates as reusable IP, canonical labeling, training data generation, fine-tuning orchestration, and production monitoring.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Databricks CLI: `brew install databricks`
- A Databricks workspace with Unity Catalog and a SQL Warehouse

### Clone

```bash
git clone --recurse-submodules https://github.com/<your-org>/ontos-ml-workbench.git
cd ontos-ml-workbench
```

If you already cloned without `--recurse-submodules`:
```bash
git submodule update --init --recursive
```

### Configure

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```bash
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-pat-token
DATABRICKS_CATALOG=your_catalog
DATABRICKS_SCHEMA=ontos_ml
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
```

Find your warehouse ID: `databricks warehouses list`

### Initialize Database

```bash
# Option A: Bootstrap script (creates schema, tables, seeds sample data)
./scripts/bootstrap.sh <workspace-name>

# Option B: Manual — run schema files in order in Databricks SQL Editor
# schemas/01_create_catalog.sql through 08_example_store.sql
# schemas/seed_sheets.sql
```

### Run Locally

```bash
# Option A: APX (recommended — single command, hot reload for both)
pip install apx --index-url https://databricks-solutions.github.io/apx/simple
apx dev start

# Option B: Manual
# Terminal 1
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs

### Deploy to Databricks

```bash
cd frontend && npm run build && cd ..
databricks apps deploy <app-name> \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=<your-profile>
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide and [RUNBOOK.md](RUNBOOK.md) for operations.

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
│                 Ontos ML Workbench                    │
│  (This repo — ML lifecycle: templates, labeling,     │
│   training, deployment, monitoring)                   │
│                                                       │
│   ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│   │   Ontos     │  │   DQX    │  │     APX       │  │
│   │ (submodule) │  │  (pip)   │  │  (dev tool)   │  │
│   │             │  │          │  │               │  │
│   │ Governance  │  │ Quality  │  │ Hot reload    │  │
│   │ Contracts   │  │ Rules    │  │ Dev server    │  │
│   │ Compliance  │  │ Profiling│  │               │  │
│   └─────────────┘  └──────────┘  └───────────────┘  │
│                                                       │
│   ┌───────────────────────────────────────────────┐  │
│   │            Databricks Platform                │  │
│   │  Unity Catalog · SQL Warehouse · FMAPI        │  │
│   │  MLflow · Serving Endpoints · Workflows       │  │
│   └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Updating Dependencies

**Ontos** (submodule — pull upstream features):
```bash
git submodule update --remote ontos
git add ontos
git commit -m "chore: update ontos submodule"
```

**DQX** (pip package):
```bash
pip install --upgrade databricks-labs-dqx[llm]
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
