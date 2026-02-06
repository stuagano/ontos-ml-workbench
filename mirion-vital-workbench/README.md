# VITAL Platform Workbench

**Mission control for Mirion's AI-powered radiation safety platform** - from raw sensor data to production ML models with full governance.

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

**PRD Version:** v2.3 (Validated - Ready for Implementation)  
**Documentation:** `docs/PRD.md`, `VALIDATION_SUMMARY.md`

## Overview

VITAL Platform Workbench is a Databricks App that provides a unified workflow for building, governing, and improving AI systems for radiation safety applications. It enables Mirion's domain experts, physicists, and data stewards to participate in AI development without writing code.

### Core Concepts

**Sheets** → Lightweight pointers to Unity Catalog data sources (multimodal fusion)  
**Canonical Labels** → Ground truth labels enabling "label once, reuse everywhere"  
**Training Sheets** → Materialized Q&A datasets with automatic label reuse  
**Templates** → Reusable prompt IP encoding Mirion's 60+ years of expertise

### The Prompt Template Paradigm

**Key Insight:** With LLMs, data modality no longer matters. Images, sensor telemetry, documents, and structured data all converge through **prompt templates** - reusable IP assets that encode Mirion's domain expertise.

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

### Validated Use Cases (PRD v2.3)

The data model has been validated end-to-end with:
- **Document AI**: Medical invoice entity extraction (PDFs + structured billing data)
- **Vision AI**: PCB defect detection (images + real-time sensor fusion)

Both use cases support multiple labelsets per source item and governance constraints.

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
Extract and define **Sheets** (lightweight pointers to Unity Catalog sources):
- Inspection image processing → Unity Catalog volumes
- Sensor telemetry ingestion → Delta tables
- Equipment maintenance logs → Structured tables
- Multimodal data fusion (images + sensors + metadata)

### 2. GENERATE
Apply **Templates** to **Sheets** to generate Q&A pairs:
- Template defines input/output schema + prompt
- Canonical label lookup provides automatic pre-approval
- Three generation modes: AI-generated, Manual, Existing Column
- Creates **Training Sheets** (Q&A datasets)

### 3. LABEL
Two labeling workflows for expert review:

**Mode A: Training Sheet Review**
- Expert reviews Q&A pairs
- Approve/Edit/Reject actions
- Creates canonical labels for future reuse

**Mode B: Canonical Labeling Tool (TOOLS section)**
- Label source data directly before generating Q&A pairs
- "Label once, reuse everywhere"
- Multiple labelsets per item: `(sheet_id, item_ref, label_type)`

### 4. TRAIN
Fine-tune models with dual quality gates:
- **Status** (quality): Only `labeled` (expert-approved) pairs
- **Usage Constraints** (governance): Check `allowed_uses`, `prohibited_uses`
- FMAPI fine-tuning integration
- MLflow experiment tracking
- Lineage recorded in `model_training_lineage` table

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
- Retraining candidate extraction from canonical labels
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

## Delta Tables (PRD v2.3)

The app uses these Unity Catalog tables in `mirion_vital.workbench`:

**Core Data Model:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `sheets` | Dataset definitions | Pointers to Unity Catalog tables + volumes |
| `canonical_labels` | Ground truth labels | Composite key `(sheet_id, item_ref, label_type)` |
| `templates` | Prompt templates | Includes `label_type` field for canonical label matching |
| `training_sheets` | Q&A datasets | Materialized from Sheets + Templates |
| `qa_pairs` | Individual Q&A pairs | Links to `canonical_label_id`, includes `allowed_uses`, `prohibited_uses` |
| `model_training_lineage` | Training provenance | Tracks which models used which Training Sheets |
| `example_store` | Few-shot examples | Managed examples for DSPy |

**Domain-Specific Tables:**

| Table | Purpose |
|-------|---------|
| `defect_detections` | Defect detection results |
| `maintenance_predictions` | Predictive maintenance outputs |
| `anomaly_alerts` | Anomaly detection alerts |
| `feedback_items` | Expert feedback for improvement |
| `job_runs` | Job execution history |

**Key Schema Features:**
- Multimodal support via Unity Catalog volumes (images, PDFs, audio)
- Multiple labelsets per item for different tasks
- Usage constraints for data governance (PHI, PII, proprietary)
- Complete lineage tracking: source data → labels → Q&A pairs → models

## License

Mirion Technologies - Confidential
