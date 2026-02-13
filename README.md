# Mirion AI Platform

This repository contains two integrated projects for Mirion's AI-powered radiation safety platform on Databricks.

## Projects

### [vital-workbench](./vital-workbench/)

**VITAL Platform Workbench** - Mission control for AI-powered radiation safety.

```
DATA → LABEL → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

A Databricks App for building and governing AI systems for radiation safety. Enables domain experts, physicists, and data stewards to participate in AI development through a no-code, multimodal data curation platform.

**Key Features:**
- Sheets (Dataset Definitions) - Lightweight pointers to Unity Catalog
- Canonical Labels - Expert-validated ground truth with "label once, reuse everywhere"
- Training Sheets - Q&A datasets for model fine-tuning
- Prompt Templates - Reusable IP encoding 60+ years of radiation expertise

**Tech Stack:** React + TypeScript, FastAPI + Python, Databricks Unity Catalog

### [ontos](./ontos/)

**Ontos** - Data governance platform for Databricks Unity Catalog.

Comprehensive data governance and management implementing Data Mesh principles and open standards (ODCS, ODPS, MCP).

**Key Features:**
- Business Glossary - Domain terminology with semantic search
- Data Contracts - ODCS v3.0.2 schema validation and SLOs
- Compliance Automation - Declarative policy enforcement
- Semantic Layer - Knowledge graph linking assets to business concepts

**Tech Stack:** React + TypeScript, FastAPI + Python, PostgreSQL/Lakebase

## Integration

The projects share a Unity Catalog namespace and integrate through:

1. **Shared Glossary** - VITAL's domain terms (defect types, severity levels) populate Ontos's Business Glossary
2. **Data Contracts** - Ontos provides governance over VITAL's canonical_labels and training_sheets
3. **Compliance Rules** - Automated quality checks (label coverage, dual review, confidence thresholds)
4. **Semantic Search** - Query across both platforms via MCP

See [vital-workbench/docs/ONTOS_INTEGRATION.md](./vital-workbench/docs/ONTOS_INTEGRATION.md) for detailed integration design.

## Getting Started

### VITAL Workbench

```bash
cd vital-workbench

# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

### Ontos

```bash
cd ontos/src

# Backend
cd backend && pip install -r requirements.txt && ./run.sh

# Frontend (separate terminal)
cd frontend && yarn install && yarn dev
```

## Deployment

Both apps deploy as Databricks Apps:

```bash
# Deploy VITAL Workbench
cd vital-workbench
databricks apps deploy vital-workbench --source-code-path /Workspace/Users/you/Apps/vital-workbench

# Deploy Ontos
cd ontos/src
databricks apps deploy ontos --source-code-path /Workspace/Users/you/Apps/ontos
```

## License

- **vital-workbench**: Proprietary (Mirion Technologies)
- **ontos**: Apache 2.0
