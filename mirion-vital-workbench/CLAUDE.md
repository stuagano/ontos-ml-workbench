# VITAL Platform Workbench

Mission control for Mirion's AI-powered radiation safety platform on Databricks.

```
DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## Project Overview

VITAL Platform Workbench is a Databricks App for building and governing AI systems for radiation safety. It enables Mirion's domain experts, physicists, and data stewards to participate in AI development.

### Core Concept: Prompt Templates as IP

With LLMs, data modality no longer matters. Images, sensor telemetry, documents all converge through **prompt templates** - reusable assets encoding Mirion's 60+ years of radiation expertise.

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
├── synthetic_data/         # Mirion-specific sample data
├── databricks.yml          # DAB bundle config
└── app.yaml               # Databricks App config
```

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Deploy to Databricks
```bash
databricks bundle deploy -t dev
```

## Synthetic Data

Sample data for Mirion use cases in `synthetic_data/`:
- `defect_detection/` - Inspection images with defect labels
- `predictive_maintenance/` - Equipment telemetry and failures
- `anomaly_detection/` - Sensor streams with labeled anomalies
- `calibration/` - Monte Carlo simulation outputs

## Delta Tables

Location: `mirion_vital.workbench`

| Table | Purpose |
|-------|---------|
| `templates` | Prompt template definitions |
| `curation_items` | Items for expert review |
| `job_runs` | Job execution history |
| `defect_detections` | Defect detection results |
| `maintenance_predictions` | Predictive maintenance outputs |
| `feedback_items` | Expert feedback |

## Code Style

- **Modular**: Keep files focused and small
- **Type Safety**: Full TypeScript on frontend, Pydantic on backend
- **Domain-Specific**: Use radiation safety terminology consistently
- **ACE-Ready**: Support Airgap, Cloud, Edge deployment patterns
