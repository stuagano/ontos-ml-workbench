# Database Setup Guide

Complete guide for initializing and managing the Ontos ML Workbench database on Databricks.

## Quick Start

```bash
# 1. Setup database (creates all tables)
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# 2. Seed test data (adds sample data)
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# 3. Verify setup (checks everything)
python scripts/verify_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench
```

## Prerequisites

### 1. Databricks Authentication

**Option A: CLI Profile (Recommended)**
```bash
# Authenticate with Databricks CLI
databricks auth login --host https://your-workspace.cloud.databricks.com

# Use profile in scripts
python scripts/setup_database.py --profile DEFAULT --catalog ...
```

**Option B: Environment Variables**
```bash
export DATABRICKS_HOST="https://your-workspace.cloud.databricks.com"
export DATABRICKS_TOKEN="dapi..."
```

### 2. SQL Warehouse

Scripts auto-detect the first available SQL warehouse. To specify a particular warehouse:

```bash
python scripts/setup_database.py \
  --warehouse-id abc123def456 \
  --catalog your_catalog \
  --schema ontos_ml_workbench
```

To find your warehouse ID:
```bash
databricks warehouses list
```

### 3. Python Dependencies

```bash
# Install Databricks SDK
pip install databricks-sdk
```

## Scripts Overview

### setup_database.py

**Purpose:** Initialize all Delta tables with proper schemas.

**Features:**
- Creates catalog and schema if they don't exist
- Creates all core tables (sheets, templates, canonical_labels, etc.)
- Creates monitoring tables (alerts, endpoints, feedback)
- Idempotent (safe to run multiple times)
- Supports reset mode to recreate tables

**Usage:**
```bash
# Basic setup
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# With specific warehouse
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --warehouse-id abc123

# With CLI profile
python scripts/setup_database.py \
  --profile dev \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# Reset mode (⚠️  DESTRUCTIVE - drops all tables)
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --reset

# Debug mode
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --debug
```

**Tables Created:**
- `sheets` - Dataset definitions pointing to Unity Catalog sources
- `templates` - Reusable prompt templates with label_type
- `canonical_labels` - Ground truth labels (label once, reuse everywhere)
- `training_sheets` - Q&A datasets generated from sheets + templates
- `qa_pairs` - Individual Q&A pairs with canonical label linkage
- `model_training_lineage` - Tracks which models used which training sheets
- `example_store` - Managed few-shot examples for DSPy
- `endpoints_registry` - Deployed model endpoints
- `feedback_items` - Production feedback for continuous improvement
- `monitor_alerts` - Monitoring alerts (drift, latency, errors)
- `job_runs` - Job execution history

### seed_test_data.py

**Purpose:** Populate database with realistic test data for Acme Instruments use cases.

**Features:**
- Adds 3 sample sheets (defect detection, predictive maintenance, calibration)
- Adds 3 sample templates (classification, prediction, recommendations)
- Adds 3 sample endpoints (production + staging)
- Adds 4 sample feedback items
- Adds 3 sample monitoring alerts

**Usage:**
```bash
# Basic seeding
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# With CLI profile
python scripts/seed_test_data.py \
  --profile dev \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# Debug mode
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --debug
```

**Sample Data Created:**

**Sheets:**
1. Radiation Detector Defect Images (volume-based, vision AI)
2. Equipment Sensor Telemetry (table-based, time series)
3. Monte Carlo Calibration Results (table-based, simulation analysis)

**Templates:**
1. Defect Classification - Vision (label_type: defect_classification)
2. Equipment Failure Prediction (label_type: failure_prediction)
3. Calibration Recommendations (label_type: calibration_recommendation)

**Endpoints:**
1. Defect Classifier - Production (ready)
2. Maintenance Predictor - Production (ready)
3. Calibration Advisor - Staging (ready)

### verify_database.py

**Purpose:** Verify database setup and report issues.

**Features:**
- Checks catalog and schema exist
- Verifies all required tables exist
- Validates table schemas (checks for expected columns)
- Tests basic queries
- Reports row counts
- Provides actionable error messages

**Usage:**
```bash
# Basic verification
python scripts/verify_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# With CLI profile
python scripts/verify_database.py \
  --profile dev \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# Debug mode
python scripts/verify_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --debug
```

**Verification Checks:**
1. Catalog exists
2. Schema exists
3. All required tables exist
4. Table schemas match expected structure
5. Basic queries work
6. Row counts reported

## Common Workflows

### Initial Setup (Fresh Database)

```bash
# Step 1: Create all tables
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# Step 2: Add sample data
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# Step 3: Verify everything works
python scripts/verify_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench
```

### Reset Database (⚠️  DESTRUCTIVE)

Use this to start fresh (deletes all data):

```bash
# Reset will drop and recreate all tables
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --reset

# Reseed test data
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench
```

### Production Setup

For production environments:

```bash
# 1. Setup with production catalog
python scripts/setup_database.py \
  --catalog your-catalog \
  --schema ontos_ml_workbench \
  --warehouse-id <prod-warehouse-id>

# 2. Verify (skip seeding in production)
python scripts/verify_database.py \
  --catalog your-catalog \
  --schema ontos_ml_workbench

# 3. Setup application environment
cat > backend/.env <<EOF
DATABRICKS_CATALOG=your-catalog
DATABRICKS_SCHEMA=ontos_ml_workbench
DATABRICKS_WAREHOUSE_ID=<prod-warehouse-id>
EOF
```

### Development Setup

For local development:

```bash
# 1. Setup with home catalog
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# 2. Seed test data
python scripts/seed_test_data.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench

# 3. Configure application
cat > backend/.env <<EOF
DATABRICKS_CATALOG=your_catalog
DATABRICKS_SCHEMA=ontos_ml_workbench
DATABRICKS_CONFIG_PROFILE=DEFAULT
EOF
```

## Troubleshooting

### Error: "No SQL warehouse found"

**Problem:** Scripts can't auto-detect a warehouse.

**Solution:** Specify warehouse ID explicitly:
```bash
python scripts/setup_database.py \
  --warehouse-id abc123 \
  --catalog your_catalog \
  --schema ontos_ml_workbench
```

Find warehouse ID:
```bash
databricks warehouses list
```

### Error: "Permission denied"

**Problem:** User lacks permissions on catalog/schema.

**Solution:**
1. Check authentication:
   ```bash
   databricks auth login
   ```

2. Verify permissions in Databricks workspace:
   - Catalog: USAGE, CREATE SCHEMA
   - Schema: USAGE, CREATE TABLE, SELECT, INSERT
   - SQL Warehouse: CAN USE

### Error: "Table already exists"

**Problem:** Trying to create tables that already exist.

**Solution:** Scripts are idempotent and skip existing tables. If you need to recreate:
```bash
python scripts/setup_database.py --reset  # Drops and recreates
```

### Error: "Timeout waiting for query"

**Problem:** SQL warehouse is overloaded or query is too complex.

**Diagnosis:**
```bash
python scripts/verify_database.py --debug
```

**Solutions:**
- Use a larger SQL warehouse
- Increase timeout in scripts (modify `range(60)` to `range(120)`)
- Check Databricks workspace for query errors

### Verification Fails

**Problem:** `verify_database.py` reports missing tables or schema issues.

**Diagnosis:**
```bash
python scripts/verify_database.py \
  --catalog your_catalog \
  --schema ontos_ml_workbench \
  --debug
```

**Solutions:**

1. **Missing tables:** Run setup script
   ```bash
   python scripts/setup_database.py \
     --catalog your_catalog \
     --schema ontos_ml_workbench
   ```

2. **Schema issues:** Check SQL files in `schemas/` directory match expected structure

3. **Query failures:** Check SQL warehouse permissions

## Advanced Usage

### Custom Catalog/Schema Names

```bash
# Use custom names
python scripts/setup_database.py \
  --catalog my_custom_catalog \
  --schema my_custom_schema
```

Then update `backend/.env`:
```bash
DATABRICKS_CATALOG=my_custom_catalog
DATABRICKS_SCHEMA=my_custom_schema
```

### Multiple Environments

Maintain separate environments:

```bash
# Dev
python scripts/setup_database.py \
  --catalog your_catalog \
  --schema ontos_ml_dev

# Staging
python scripts/setup_database.py \
  --catalog shared_staging \
  --schema ontos_ml_staging

# Production
python scripts/setup_database.py \
  --catalog your-catalog \
  --schema ontos_ml_production
```

### CI/CD Integration

```bash
# In CI/CD pipeline
export DATABRICKS_HOST="${{ secrets.DATABRICKS_HOST }}"
export DATABRICKS_TOKEN="${{ secrets.DATABRICKS_TOKEN }}"

python scripts/setup_database.py \
  --catalog $DATABRICKS_CATALOG \
  --schema $DATABRICKS_SCHEMA \
  --warehouse-id $DATABRICKS_WAREHOUSE_ID

python scripts/verify_database.py \
  --catalog $DATABRICKS_CATALOG \
  --schema $DATABRICKS_SCHEMA
```

## Schema Files Reference

All table DDL definitions are in `schemas/`:

```
schemas/
├── 02_sheets.sql                      # Sheet definitions
├── 03_templates.sql                   # Prompt templates
├── 04_canonical_labels.sql            # Ground truth labels
├── 05_training_sheets.sql             # Q&A datasets
├── 06_qa_pairs.sql                    # Individual Q&A pairs
├── 07_model_training_lineage.sql      # Model lineage tracking
├── 08_example_store.sql               # DSPy example management
├── create_monitor_alerts.sql          # Monitoring alerts
├── create_model_training_lineage.sql  # (duplicate, can remove)
└── init.sql                           # Legacy monolithic schema
```

## Database Schema Overview

### Core Data Model

```
sheets (source data definitions)
  ↓
canonical_labels (ground truth, reusable)
  ↓
templates (prompt templates with label_type)
  ↓
training_sheets (Sheet + Template → Q&A dataset)
  ↓
qa_pairs (individual Q&A pairs)
  ↓
model_training_lineage (tracks training provenance)
```

### Key Features

**1. Composite Key for Canonical Labels**
- `(sheet_id, item_ref, label_type)` enables "label once, reuse everywhere"
- Same source data can have multiple independent labels

**2. Automatic Pre-approval**
- When canonical label exists, Q&A pairs auto-approved
- `was_auto_approved` flag tracks this

**3. Usage Governance**
- Templates have `allowed_uses` and `prohibited_uses`
- Separate from quality approval (`review_status`)

**4. Complete Lineage**
- Track source → labels → Q&A → models
- Enables impact analysis and attribution

## Support

For issues or questions:

1. Check this README
2. Run verification with debug: `python scripts/verify_database.py --debug`
3. Check Databricks workspace logs
4. Review schema files in `schemas/`

## See Also

- `CLAUDE.md` - Project overview and terminology
- `docs/PRD.md` - Product requirements (v2.3)
- `docs/validation/` - Schema validation results
