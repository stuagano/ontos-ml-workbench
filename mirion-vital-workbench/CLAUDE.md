# VITAL Platform Workbench

**Mission control for Mirion's AI-powered radiation safety platform on Databricks**

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

**PRD Version:** v2.3 (Validated - Ready for Implementation)  
**See:** `docs/PRD.md`, `VALIDATION_SUMMARY.md`

## Project Overview

VITAL Platform Workbench is a Databricks App for building and governing AI systems for radiation safety. It enables Mirion's domain experts, physicists, and data stewards to participate in AI development through a no-code, multimodal data curation platform.

### Core Concepts

**1. Sheets (Dataset Definitions)**
Lightweight pointers to Unity Catalog tables and volumes. Sheets enable multimodal data fusion (images + sensor data + metadata) without copying data.

**2. Canonical Labels (Ground Truth Layer)**
Expert-validated labels stored independently of Q&A pairs. Enables **"label once, reuse everywhere"** - experts label source data once, labels automatically reused across all Training Sheets. Supports multiple labelsets per item via composite key `(sheet_id, item_ref, label_type)`.

**3. Training Sheets (Q&A Datasets)**
Materialized Q&A pairs generated from Sheets + Templates. Canonical label lookup provides automatic pre-approval when expert labels exist.

**4. Prompt Templates (Reusable IP)**
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

### Recommended: APX with Hot Reload (Unified Dev Server)
```bash
# Install APX
uvx --index https://databricks-solutions.github.io/apx/simple apx init

# Start dev server (hot reload for both backend + frontend)
apx dev start
```

**Benefits**: Single command, instant hot reload for Python and React changes, unified logging.

See [APX_SETUP.md](frontend/APX_SETUP.md) for complete integration guide.

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
cd frontend && npm run build

# Deploy bundle
databricks bundle deploy -t dev
```

## Synthetic Data

Sample data for Mirion use cases in `synthetic_data/`:
- `defect_detection/` - Inspection images with defect labels
- `predictive_maintenance/` - Equipment telemetry and failures
- `anomaly_detection/` - Sensor streams with labeled anomalies
- `calibration/` - Monte Carlo simulation outputs

## Delta Tables (PRD v2.3)

Location: `home_stuart_gano.mirion_vital_workbench` (using home catalog for development)

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

**Domain-Specific Tables:**

| Table | Purpose |
|-------|---------|
| `defect_detections` | Defect detection results |
| `maintenance_predictions` | Predictive maintenance outputs |
| `anomaly_alerts` | Anomaly detection alerts |
| `feedback_items` | Expert feedback for continuous improvement |
| `job_runs` | Job execution history |

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

## Code Style

- **Modular**: Keep files focused and small
- **Type Safety**: Full TypeScript on frontend, Pydantic on backend
- **Domain-Specific**: Use radiation safety terminology consistently
- **ACE-Ready**: Support Airgap, Cloud, Edge deployment patterns
- **Terminology**: Use "Sheet", "Training Sheet", "Canonical Label" (not old terms like "DataBit", "Assembly")
