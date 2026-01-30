# VITAL Platform Workbench

**Mission control for Mirion's AI-powered radiation safety platform** - from raw sensor data to production ML models with full governance.

```
DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## Overview

VITAL Platform Workbench is a Databricks App that provides a unified workflow for building, governing, and improving AI systems for radiation safety applications. It enables Mirion's domain experts, physicists, and data stewards to participate in AI development without writing code.

### The Prompt Template Paradigm

**Key Insight:** With LLMs, data modality no longer matters. Images, sensor telemetry, documents, and structured data all converge through **prompt templates** - reusable IP assets that encode Mirion's 60+ years of radiation safety expertise.

```
┌─────────────────────────────────────────────────────────────────────┐
│   TRADITIONAL ML (Siloed)         LLM ERA (Unified)                │
│   ─────────────────────────       ─────────────────────────        │
│                                                                     │
│   Images → CNN Pipeline           All Modalities → Prompt Template │
│   Sensors → Time Series Model                    → LLM             │
│   Docs → NLP Pipeline                            → Unified Output  │
│                                                                     │
│   4 pipelines, 4 teams            1 template, reusable across      │
│                                   all 86 facilities                │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features

- **7-Stage Lifecycle**: Complete coverage from data extraction to continuous improvement
- **Templates as IP**: Prompt templates as first-class, versioned Unity Catalog assets
- **AI-Assisted Labeling**: Pre-label with AI, verify with Mirion domain experts
- **ACE-Ready**: Supports Airgap, Cloud, and Edge deployment patterns
- **Day 2 Operations**: Monitoring, drift detection, and feedback loops built in

## Mirion Use Cases

### Priority 0 - Year 1
| Use Case | Template Type | Business Value |
|----------|---------------|----------------|
| **Defect Detection** | Image + Sensor Context → Classification | Reduce manual inspection time by 80% |
| **Predictive Maintenance** | Telemetry → Failure Probability | Prevent unplanned downtime |

### Priority 1 - Year 1-2
| Use Case | Template Type | Business Value |
|----------|---------------|----------------|
| **Anomaly Detection** | Sensor Stream → Alert + Explanation | Early warning for drift/issues |
| **Calibration Insights** | MC Results → Recommendations | Automated calibration guidance |

### Priority 2 - Year 2+
| Use Case | Template Type | Business Value |
|----------|---------------|----------------|
| **Document Extraction** | Compliance Docs → Structured Data | Automate regulatory reporting |
| **Remaining Useful Life** | Equipment History → RUL Estimate | Optimize maintenance scheduling |

## Quick Start

### Prerequisites

- Databricks CLI installed (`brew install databricks`)
- FEVM workspace (create at https://go/fevm)
- Node.js 18+

### One-Command Deployment (Recommended)

Deploy to a fresh FEVM workspace with the bootstrap script:

```bash
# 1. Create an FEVM workspace at https://go/fevm
#    Note the workspace name (e.g., vdm-serverless-abc123)

# 2. Run the bootstrap script
./scripts/bootstrap.sh <workspace-name>

# Example:
./scripts/bootstrap.sh vdm-serverless-abc123
```

This will:
- Authenticate to your FEVM workspace
- Find/create a SQL warehouse
- Create the Unity Catalog schema and all required tables
- Seed sample data (sensor monitoring, defect detection)
- Build and deploy the Databricks App
- Grant permissions to the app service principal

### Teardown

```bash
./scripts/teardown.sh <workspace-name>
```

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure your credentials
uvicorn app.main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Manual Deploy to Databricks

```bash
# Build frontend
cd frontend && npm install && npm run build && cd ..

# Sync to workspace
databricks sync . /Workspace/Users/<you>/Apps/vital-workbench --profile=<profile>

# Deploy app
databricks apps deploy vital-workbench \
  --source-code-path /Workspace/Users/<you>/Apps/vital-workbench \
  --profile=<profile>
```

## Architecture

```
vital-workbench/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # REST endpoints
│   │   ├── core/           # Config, auth, Databricks SDK
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic
│   ├── jobs/               # Databricks job notebooks
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Stage-specific pages
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── package.json
├── schemas/                # Delta table schemas
├── resources/              # DAB resource configs
├── synthetic_data/         # Mirion-specific sample data
├── databricks.yml          # DAB bundle config
└── app.yaml               # Databricks App config
```

## Lifecycle Stages

### 1. DATA
Extract, transform, and enrich radiation safety data:
- Inspection image processing
- Sensor telemetry ingestion
- Equipment maintenance logs
- Calibration records
- Monte Carlo simulation outputs

### 2. TEMPLATE
Create prompt templates (Mirion's ML IP):
- Define input/output schemas for radiation data
- Craft system prompts with physics domain knowledge
- Add few-shot examples from historical data
- Configure model settings
- Version control with semantic versioning

### 3. CURATE
Review and label training data:
- AI pre-labeling with confidence scores
- Physicist/expert review queue
- Approve/reject/correct workflow
- Quality scoring and deduplication

### 4. TRAIN
Fine-tune models for radiation safety:
- Data assembly from approved items
- FMAPI fine-tuning integration
- MLflow experiment tracking
- Model evaluation against physics benchmarks

### 5. DEPLOY
Serve models across ACE architecture:
- Edge deployment for facility-local inference
- Cloud deployment for connected sites
- Airgap-compatible batch processing
- A/B traffic routing

### 6. MONITOR
Track production performance:
- Inference latency and throughput
- Prediction drift detection
- False positive/negative rates
- Regulatory compliance metrics

### 7. IMPROVE
Continuous feedback loops:
- Physicist feedback collection
- Gap analysis for edge cases
- Retraining candidate extraction
- Version comparison

## Sample Data

The `synthetic_data/` directory contains Mirion-specific sample data:

```
synthetic_data/
├── defect_detection/
│   ├── images/              # Synthetic inspection images
│   ├── labels.json          # Defect classifications
│   └── sensor_context.json  # Associated sensor readings
├── predictive_maintenance/
│   ├── telemetry.csv        # Sensor time series
│   ├── failures.csv         # Historical failure events
│   └── equipment.json       # Equipment metadata
├── anomaly_detection/
│   ├── sensor_streams.csv   # Real-time sensor data
│   └── anomalies.json       # Labeled anomalies
└── calibration/
    ├── mc_simulations.csv   # Monte Carlo outputs
    └── calibration_factors.json
```

## Configuration

### Environment Variables

```bash
# Databricks connection (for local dev)
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-pat-token

# Unity Catalog
DATABRICKS_CATALOG=mirion_vital
DATABRICKS_SCHEMA=workbench

# SQL Warehouse
DATABRICKS_WAREHOUSE_ID=your-warehouse-id
```

## Delta Tables

The app uses these Unity Catalog tables:

| Table | Purpose |
|-------|---------|
| `templates` | Prompt template definitions and versions |
| `curation_items` | Items for expert review with labels |
| `job_runs` | Job execution history |
| `defect_detections` | Defect detection results |
| `maintenance_predictions` | Predictive maintenance outputs |
| `anomaly_alerts` | Anomaly detection alerts |
| `feedback_items` | Expert feedback for improvement |
| `model_registry` | Deployed model versions |

## License

Mirion Technologies - Confidential
