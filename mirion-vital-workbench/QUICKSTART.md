# VITAL Workbench - Quick Start

Get the VITAL Platform Workbench running in 10 minutes.

## Prerequisites

- Databricks workspace with Unity Catalog
- Node.js 18+ and Python 3.11+
- Databricks CLI: `brew install databricks`

## Quick Setup

### Step 1: Configure Backend (2 minutes)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```bash
# Databricks Connection
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-token-here
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# Unity Catalog
DATABRICKS_CATALOG=home_<username>
DATABRICKS_SCHEMA=mirion_vital_workbench

# Optional: CLI profile name
DATABRICKS_CONFIG_PROFILE=your-profile-name
```

**Find your warehouse ID:**
```bash
databricks warehouses list
```

### Step 2: Initialize Database (3 minutes)

Upload and run `schemas/check_and_seed.py` in your Databricks workspace, or run the schema files manually:

```bash
# In Databricks SQL Editor, run these files in order:
# 1. schemas/01_create_catalog.sql through 08_example_store.sql
# 2. schemas/seed_sheets.sql
```

This creates:
- All required Delta tables
- 3 sample Training Sheets (defect detection, sensor monitoring, anomaly detection)
- 3 prompt templates
- Sample canonical labels

### Step 3: Start the Application (2 minutes)

**Option A: Using the start script (recommended)**

```bash
# From project root
./start-dev.sh
```

**Option B: Manual start**

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Step 4: Verify (1 minute)

Open your browser:

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

Test the API:

```bash
# List Training Sheets
curl http://localhost:8000/api/v1/sheets-v2

# Get specific Training Sheet
curl http://localhost:8000/api/v1/sheets-v2/sheet-defect-images-001

# List templates
curl http://localhost:8000/api/v1/templates

# List canonical labels
curl http://localhost:8000/api/v1/canonical-labels
```

## What You Can Do Now

With the seeded data, explore the 7-stage workflow:

1. **DATA** - Browse the 3 sample Training Sheets
2. **GENERATE** - Create Q&A pairs from Training Sheets + templates
3. **LABEL** - Review and approve Q&A pairs
4. **TRAIN** - Fine-tune models (requires FMAPI setup)
5. **DEPLOY** - Deploy models to serving endpoints
6. **MONITOR** - Track production performance
7. **IMPROVE** - Analyze feedback and iterate

## Understanding the Workflow

### Core Concepts

**Training Sheets** → Lightweight pointers to Unity Catalog data sources
**Canonical Labels** → Ground truth enabling "label once, reuse everywhere"
**Templates** → Reusable prompt IP encoding domain expertise
**Q&A Pairs** → Generated training data for fine-tuning

### Stage Navigation

The UI enforces stage order. You must:
1. Select a Training Sheet in DATA stage
2. Select a template in GENERATE stage
3. Then proceed through remaining stages

### TOOLS Section

Access reusable assets via keyboard shortcuts:
- **Alt+T** - Prompt Templates
- **Alt+E** - Example Store
- **Alt+D** - DSPy Optimizer
- **Canonical Labeling Tool** - Label source data directly

## Troubleshooting

### Backend won't start

Check your configuration:
```bash
cat backend/.env | grep DATABRICKS
```

Verify:
- Warehouse ID is correct
- Catalog and schema exist
- Token has necessary permissions

### No data showing in UI

Verify tables exist:
```sql
USE CATALOG home_<username>;
USE SCHEMA mirion_vital_workbench;
SHOW TABLES;
```

Re-run the seed script if tables are empty.

### API returns 500 errors

Check backend logs for "table not found" errors. You may need to:
1. Create missing tables (run schema SQL files)
2. Update catalog/schema names in `backend/.env`

### Frontend loads but can't connect to backend

Verify CORS settings in `backend/.env`:
```bash
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

## Configuration Reference

Current configuration uses:
- **Catalog**: `home_<username>` (personal development space)
- **Schema**: `mirion_vital_workbench`
- **Warehouse**: Your serverless or Pro warehouse

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Alternative Development Setup: APX

For unified hot-reload experience:

```bash
# Install APX
uvx --index https://databricks-solutions.github.io/apx/simple apx init

# Start dev server (auto-reloads both backend and frontend)
apx dev start
```

See archived `docs/archive/development-notes/APX_SETUP.md` for details.

## Next Steps

- **Customize templates** for your use cases
- **Import real data** from your Unity Catalog tables
- **Review the PRD** at `docs/PRD.md` for complete feature list
- **Deploy to production** following [DEPLOYMENT.md](DEPLOYMENT.md)

## Sample Data Details

The seed script creates:

### Training Sheets (3)
1. **PCB Defect Detection** - Vision inspection with sensor context
2. **Sensor Monitoring** - Predictive maintenance telemetry
3. **Anomaly Stream** - Real-time anomaly detection

### Templates (3)
1. **Defect Classifier** - Image + context → classification
2. **Predictive Maintenance** - Telemetry → failure probability
3. **Anomaly Detector** - Sensor stream → alert + explanation

### Canonical Labels
Sample expert-labeled ground truth for defect detection.

## Additional Documentation

- **[README.md](README.md)** - Project overview and architecture
- **[CLAUDE.md](CLAUDE.md)** - AI assistant context (full technical details)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[RUNBOOK.md](RUNBOOK.md)** - Operations and troubleshooting
- **[docs/PRD.md](docs/PRD.md)** - Product requirements document

## Support

For issues:
1. Check [RUNBOOK.md](RUNBOOK.md) for common issues
2. Review backend logs for errors
3. Verify database schema matches code expectations

---

**Ready?** Run through Steps 1-4 above and you'll have VITAL Workbench running locally in under 10 minutes.
