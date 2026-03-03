# Ontos ML Workbench

ML lifecycle extensions for the [Ontos](https://github.com/larsgeorge/ontos) data governance platform on Databricks — from raw data to production models with full governance.

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## What This Is

**Ontos ML Workbench** adds ML workflow capabilities to the Ontos data governance platform. It gives domain experts, data scientists, and stewards a unified workflow for building and governing AI systems:

- **Prompt templates as reusable IP** — encode domain expertise once, apply across datasets
- **Canonical labeling** — experts label source data once, labels reuse everywhere
- **Training data generation** — combine datasets + templates to produce Q&A pairs at scale
- **Fine-tuning orchestration** — dual quality gates (expert approval + usage governance)
- **Production monitoring** — drift detection, latency tracking, alerts, health scoring
- **Lineage tracking** — full graph from source data → Q&A pairs → trained models
- **Data quality (DQX)** — automated profiling, quality checks, AI-assisted rule generation
- **Feedback loops** — capture ratings, flag issues, convert feedback to training data

### Architecture

All application code lives in the `ontos/` submodule. This repo provides documentation, schemas, notebooks, and deployment configuration.

```
├── ontos/                  # The application (git submodule)
│   ├── src/backend/        # FastAPI + SQLAlchemy + Lakebase
│   └── src/frontend/       # React + TypeScript + Shadcn UI
├── docs/                   # Design docs, PRD, business case
├── schemas/                # Delta table DDL (Unity Catalog reference)
├── notebooks/              # Databricks workflow notebooks
├── resources/              # DAB job definitions
└── databricks.yml          # Databricks Asset Bundle config
```

The ML extensions follow Ontos's 4-layer pattern (Route → Manager → Repository → ORM Model) and add 13 feature domains across 60+ files.

## Getting Started

### Prerequisites

- Python 3.11+, Node.js 18+
- Databricks CLI: `brew install databricks`
- A Databricks workspace with Unity Catalog and a SQL Warehouse

### Clone

```bash
git clone https://github.com/<your-org>/ontos-ml-workbench.git
cd ontos-ml-workbench

# Initialize the ontos submodule (required)
git submodule update --init --recursive
```

### Run Locally

```bash
# Backend
cd ontos/src/backend
hatch -e dev run uvicorn src.app:app --reload

# Frontend (separate terminal)
cd ontos/src/frontend
yarn install && yarn dev
```

### Deploy to Databricks Apps

**1. Configure `databricks.yml`** with your profile, catalog, schema, and warehouse ID.

**2. Build and deploy:**

```bash
cd ontos/src/frontend && yarn build && cd ../../..
databricks bundle deploy -t dev
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide.

### Database Migrations

```bash
cd ontos/src/backend
alembic upgrade head
```

## Integrated Components

| Component | What It Does | Integration |
|-----------|-------------|-------------|
| **[Ontos](https://github.com/larsgeorge/ontos)** | Data governance platform — data product catalogs, contracts (ODCS format), compliance workflows, asset review | Git submodule. The ML extensions are built directly into Ontos. |
| **[DQX](https://github.com/databrickslabs/dqx)** | Automated data quality validation — applies quality rules to datasets, profiles data distributions, flags issues | Optional pip package (`databricks-labs-dqx[llm]`). Quality checks gated behind availability. |

## ML Feature Domains

| Domain | Description |
|--------|-------------|
| Sheets | Dataset definitions with multimodal UC source management |
| Training Sheets | Q&A dataset generation and lifecycle management |
| Canonical Labels | Expert ground truth labels (label once, reuse everywhere) |
| Templates | Prompt template library |
| Example Store | Few-shot example management for DSPy |
| Labeling | Full workflow: jobs, tasks, assignment, review, state machines |
| Monitoring | Endpoint metrics, time-series aggregation, drift, alerts, health |
| Lineage | Graph materialization, BFS traversal, 17 edge types |
| Quality (DQX) | Data quality checks, profiling, AI rule generation |
| Feedback | User ratings, flagging, stats, conversion to training data |
| Curated Datasets | Dataset versioning, train/val/test splits, approval workflow |
| Agent Retrieval | Few-shot retrieval for agents, outcome tracking, effectiveness |
| Model Registry | Tool and agent registries with health checks |

## Lifecycle Stages

1. **DATA** — Define Sheets pointing to Unity Catalog sources
2. **GENERATE** — Apply Templates to Sheets to create Q&A pairs
3. **LABEL** — Expert review (Training Sheet review or direct Canonical Labeling)
4. **TRAIN** — Fine-tune with dual quality gates (approval + usage constraints)
5. **DEPLOY** — Serve models via Databricks endpoints
6. **MONITOR** — Track drift, latency, accuracy with alerting
7. **IMPROVE** — Feedback loops, gap analysis, curated datasets, retraining

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ML_EXTENSION_DESIGN.md](docs/ML_EXTENSION_DESIGN.md) | ML extension architecture and design |
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/BUSINESS_CASE.md](docs/BUSINESS_CASE.md) | Business case |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment guide |
| [RUNBOOK.md](RUNBOOK.md) | Operations and troubleshooting |

## License

See [LICENSE](LICENSE) for details.
