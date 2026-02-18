# Ontos ML Workbench - Demo Data Setup Guide

**Mission**: Prepare impressive demo-quality data that showcases the canonical labeling workflow and Acme Instruments' radiation safety AI use cases.

## Overview

This guide explains how to seed Ontos ML Workbench with demo data that demonstrates:
1. **"Label once, reuse everywhere"** - The core innovation of canonical labeling
2. **Multimodal data fusion** - Images + sensor data + metadata
3. **Acme Instruments-specific use cases** - Radiation safety domain expertise
4. **Complete workflow** - DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE

## What Sample Data Exists

### 1. Synthetic Data (`synthetic_data/`)

High-quality synthetic data for Acme Instruments use cases:

#### Defect Detection (`defect_detection/`)
- **File**: `labels.json`
- **Content**: 6 labeled inspection images from real nuclear facilities
- **Defects**: Crystal cracks, seal degradation, connector damage, corrosion, contamination
- **Context**: Equipment IDs, facility names, sensor readings, bounding boxes
- **Demo Value**: Shows multimodal fusion (image + sensor context)

#### Predictive Maintenance (`predictive_maintenance/`)
- **Files**: `equipment.json`, `telemetry.csv`, `failures.csv`
- **Content**:
  - 5 radiation detector types (HPGe, NaI, GM, Ion Chamber, Portal Monitor)
  - Equipment metadata with maintenance history
  - Time-series telemetry (temperature, voltage, counts)
  - Historical failure events with root causes
- **Demo Value**: Time-series prediction, RUL estimation

#### Anomaly Detection (`anomaly_detection/`)
- **File**: `anomalies.json`
- **Content**: Labeled anomaly events (sensor drift, spikes, dropouts, temperature excursions)
- **Demo Value**: Real-time monitoring, alert generation

#### Calibration Insights (`calibration/`)
- **File**: `mc_simulations.csv`
- **Content**: Monte Carlo simulation outputs for detector calibration
- **Demo Value**: Physics-informed AI, domain expertise

#### Prompt Templates (`templates/`)
- **Files**: 4 JSON templates (defect detection, predictive maintenance, anomaly detection, calibration)
- **Content**: Complete prompt definitions with system instructions, few-shot examples, input/output schemas
- **Demo Value**: Reusable prompt IP, Acme Instruments domain knowledge

### 2. Database Seed Scripts

#### `schemas/seed_sheets.sql`
Seeds 5 sample Sheets:
- PCB Defect Detection (vision AI)
- Radiation Sensor Telemetry (time series)
- Medical Invoice Extraction (document AI)
- Equipment Maintenance Logs (text classification)
- Quality Control Inspection Photos (vision AI)

**Status**: Generic examples - needs Acme Instruments-specific replacement

#### `schemas/seed_templates.sql`
Seeds 4 prompt templates:
- Document Classifier
- Sentiment Analyzer
- Entity Extractor
- Radiation Equipment Defect Classifier (Acme Instruments-specific!)

**Status**: Mix of generic + Acme Instruments examples

#### `schemas/99_validate_and_seed.sql`
Complete validation + seed script demonstrating:
- Composite key constraint (sheet_id, item_ref, label_type)
- Canonical label reuse (auto-approval workflow)
- Sample data: 1 Sheet + 1 Template + 3 Canonical Labels + 1 Training Sheet + 2 Q&A Pairs

**Status**: Best example of canonical labeling workflow

### 3. Python Seed Scripts

#### `scripts/seed_sheets_data.py`
- Uses Databricks SDK to execute SQL
- Reads `schemas/seed_sheets.sql`
- Targets: `erp-demonstrations.ontos_ml_workbench`
- **Warehouse**: `387bcda0f2ece20c`

#### `scripts/seed_test_data.py`
Comprehensive seeding for Acme Instruments use cases:
- 3 Sheets (Defect Detection, Predictive Maintenance, Calibration)
- 3 Templates with JSON schemas
- 3 Endpoints (prod + staging)
- 4 Feedback items
- 3 Monitor alerts

**Status**: Ready to use, just needs catalog/schema configuration

#### `scripts/seed_via_api.py`
Alternative approach using Statement Execution API:
- Creates schema + tables dynamically
- Seeds templates, sheets, curation items
- Includes sample sensor + defect data

**Status**: Works for quick demos on fresh workspaces

#### `scripts/bootstrap.sh`
**The complete end-to-end bootstrap script** (779 lines!)
- Creates catalog, schema, tables
- Builds frontend
- Deploys Databricks App
- Grants permissions to service principal
- Seeds 4 templates (sensor anomaly, defect classification, predictive maintenance, calibration)
- Seeds 2 sample sheets (sensor data, defect data)
- Seeds 5 curation items (3 sensor, 2 defect)

**Status**: Production-ready for FEVM workspaces

## How to Seed Demo Data

### Option 1: Fresh FEVM Workspace (Recommended for Demo)

**Best for**: Clean slate, presenting to stakeholders

```bash
# Step 1: Create FEVM workspace at https://go/fevm
# Note the workspace name (e.g., serverless-abc123)

# Step 2: Run bootstrap script
./scripts/bootstrap.sh <workspace-name>

# Example:
./scripts/bootstrap.sh serverless-dxukih

# This will:
# - Authenticate to workspace
# - Create catalog + schema
# - Deploy app
# - Seed all demo data
```

**What you get**:
- 2 Sheets (sensor monitoring, defect detection)
- 4 Templates (2 published, 2 draft)
- 5 Curation items ready for review
- Fully deployed app with permissions

### Option 2: Existing Home Catalog (Development)

**Best for**: Local development, iterating on data model

```bash
# Using PRD v2.3 schema on home catalog
python scripts/seed_test_data.py \
  --catalog home_stuart_gano \
  --schema ontos_ml_workbench \
  --profile fe-vm-serverless-dxukih

# Optional: Specify warehouse
python scripts/seed_test_data.py \
  --catalog home_stuart_gano \
  --schema ontos_ml_workbench \
  --warehouse-id 387bcda0f2ece20c \
  --profile fe-vm-serverless-dxukih
```

**What you get**:
- 3 Acme Instruments-specific Sheets
- 3 Templates with full JSON schemas
- 3 Endpoints (defect classifier, maintenance predictor, calibration advisor)
- 4 Feedback items
- 3 Monitor alerts (drift, latency, error rate)

### Option 3: Manual SQL Seeding (Precise Control)

**Best for**: Customizing data, understanding the schema

```bash
# Step 1: Create tables (if not already created)
cd schemas
databricks sql exec --warehouse-id <warehouse-id> < 02_sheets.sql
databricks sql exec --warehouse-id <warehouse-id> < 03_templates.sql
databricks sql exec --warehouse-id <warehouse-id> < 04_canonical_labels.sql
databricks sql exec --warehouse-id <warehouse-id> < 05_training_sheets.sql
databricks sql exec --warehouse-id <warehouse-id> < 06_qa_pairs.sql

# Step 2: Seed data
databricks sql exec --warehouse-id <warehouse-id> < 99_validate_and_seed.sql
```

**What you get**:
- 1 PCB defect Sheet
- 1 PCB defect Template
- 3 Canonical Labels (demonstrates composite key)
- 1 Training Sheet
- 2 Q&A Pairs (1 auto-approved via canonical label, 1 needs review)
- 1 Model Training Lineage entry

## What Each Dataset Demonstrates

### 1. Defect Detection (Vision AI)

**File**: `synthetic_data/defect_detection/labels.json`

**Demonstrates**:
- Multimodal data fusion (image URI + sensor context)
- Bounding box annotations
- Expert verification flags
- Real nuclear facility names (Cook, Palo Verde, Watts Bar, Diablo Canyon, Surry)
- Severity classification (0-3 scale)
- 9 defect categories (crystal crack, seal degradation, connector damage, etc.)

**Stages Supported**:
- **DATA**: Define Sheet pointing to UC Volume with images
- **GENERATE**: Apply defect detection template to generate Q&A pairs
- **LABEL**: Expert reviews AI-generated labels, creates canonical labels
- **TRAIN**: Fine-tune vision model on approved labels
- **DEPLOY**: Deploy to production endpoint
- **MONITOR**: Track drift, accuracy, latency
- **IMPROVE**: Collect feedback from field inspections

**Canonical Labeling Story**:
1. Expert labels INSP-2024-003 (crystal crack) in Standalone Tool
2. Canonical label created: `(sheet-defect-detection-001, INSP-2024-003, defect_classification)`
3. Later, apply defect template to generate Q&A pairs
4. When Q&A pair for INSP-2024-003 is generated, canonical label is auto-matched
5. Q&A pair marked as `was_auto_approved=true`, skips manual review
6. **Result**: Label once, reuse everywhere

### 2. Predictive Maintenance (Telemetry)

**Files**: `synthetic_data/predictive_maintenance/equipment.json`, `telemetry.csv`, `failures.csv`

**Demonstrates**:
- Time-series sensor data
- Equipment metadata with maintenance history
- Failure prediction (30-day probability)
- RUL (Remaining Useful Life) estimation
- 5 detector types with realistic operating hours

**Stages Supported**:
- **DATA**: Define Sheet pointing to telemetry table
- **GENERATE**: Apply failure prediction template
- **LABEL**: Expert validates predicted failure risk
- **TRAIN**: Fine-tune time-series model
- **DEPLOY**: Real-time inference on streaming data
- **MONITOR**: Track prediction accuracy vs actual failures
- **IMPROVE**: Update model with new failure data

**Canonical Labeling Story**:
1. Equipment DET-NPP-PALO-001 has historical failure at 47520 hours
2. Expert labels this item with failure_risk=high, days_to_failure=30
3. Canonical label: `(sheet-predictive-maintenance-001, DET-NPP-PALO-001, failure_prediction)`
4. When generating Q&A pairs for maintenance prediction, this label is reused
5. Multiple Training Sheets can leverage same ground truth

### 3. Anomaly Detection (Real-time Monitoring)

**File**: `synthetic_data/anomaly_detection/anomalies.json`

**Demonstrates**:
- 8 anomaly types (drift, spike, dropout, noise, plateau shift, etc.)
- Confidence scoring
- Automated vs manual resolution
- Root cause analysis
- Recommended actions

**Stages Supported**:
- **DATA**: Define Sheet pointing to sensor stream table
- **GENERATE**: Apply anomaly detection template
- **LABEL**: Expert validates anomalies (especially edge cases)
- **TRAIN**: Fine-tune anomaly detector
- **DEPLOY**: Real-time streaming inference
- **MONITOR**: Track false positive/negative rates
- **IMPROVE**: Retrain on missed anomalies

**Canonical Labeling Story**:
1. Expert labels ANOM-2024-002 (current spike) as true anomaly
2. Canonical label: `(sheet-anomaly-detection-001, ANOM-2024-002, anomaly_classification)`
3. When retraining model, this label is reused automatically
4. Enables continuous learning without re-labeling

### 4. Calibration Insights (Physics-Informed AI)

**File**: `synthetic_data/calibration/mc_simulations.csv`

**Demonstrates**:
- Monte Carlo simulation outputs
- Physics calculations (efficiency, resolution, geometry)
- Expert recommendations for calibration adjustments
- Technical rationale documentation

**Stages Supported**:
- **DATA**: Define Sheet pointing to simulation results table
- **GENERATE**: Apply calibration recommendation template
- **LABEL**: Physicist validates recommendations
- **TRAIN**: Fine-tune calibration advisor
- **DEPLOY**: Support technicians with AI recommendations
- **MONITOR**: Track calibration accuracy
- **IMPROVE**: Incorporate validation measurements

**Canonical Labeling Story**:
1. Physicist labels simulation SIM-2024-001 with calibration_factor=1.05
2. Canonical label: `(sheet-calibration-001, SIM-2024-001, calibration_recommendation)`
3. When creating new Training Sheets for calibration, this expert label is reused
4. Preserves 60+ years of Acme Instruments physics expertise

## Impressive Demo Flow

### Demo Script (15 minutes)

**Act 1: The Problem (2 min)**
- Show synthetic data: Real detector images, sensor telemetry, Monte Carlo results
- "Acme Instruments has 60+ years of radiation expertise locked in expert heads"
- "Need to democratize this knowledge, enable domain experts to build AI"

**Act 2: The Innovation (3 min)**
- Navigate to Canonical Labeling Tool
- Show composite key: `(sheet_id, item_ref, label_type)`
- Label one defect image: Crystal crack, severity=3, confidence=0.92
- "This label is now ground truth, stored independently"

**Act 3: Label Once, Reuse Everywhere (5 min)**
- Navigate to GENERATE stage
- Select defect detection Sheet + Template
- Click "Generate Training Sheet"
- Show generated Q&A pairs
- **Key moment**: Point out auto-approved pairs with canonical label match
- "We labeled once in standalone tool, now it's reused automatically"
- Show manual review queue: Only unlabeled items need expert review

**Act 4: Multiple Labelsets (2 min)**
- Go back to Canonical Labeling Tool
- Select SAME image (INSP-2024-003)
- Apply DIFFERENT label type: severity_level
- Show composite key allows multiple independent labels
- "Same source data, multiple perspectives, no conflicts"

**Act 5: Production Readiness (3 min)**
- Navigate to TRAIN stage: Show approved Q&A pairs → model training
- Navigate to DEPLOY stage: Show model endpoints (ACE architecture)
- Navigate to MONITOR stage: Show drift alerts, latency, accuracy metrics
- Navigate to IMPROVE stage: Show feedback loop closing the circle

**The Punchline**:
"Ontos ML Workbench turns Acme Instruments' physicists, engineers, and domain experts into AI builders. No coding required. Label once, reuse everywhere. 60+ years of expertise, now encoded as reusable prompt templates and canonical labels."

## Verification Commands

After seeding, verify data:

```bash
# Check table counts
databricks sql exec --warehouse-id <warehouse-id> --statement "
SELECT
  'sheets' as table_name, COUNT(*) as count FROM home_stuart_gano.ontos_ml_workbench.sheets
UNION ALL
SELECT 'templates', COUNT(*) FROM home_stuart_gano.ontos_ml_workbench.templates
UNION ALL
SELECT 'canonical_labels', COUNT(*) FROM home_stuart_gano.ontos_ml_workbench.canonical_labels
UNION ALL
SELECT 'training_sheets', COUNT(*) FROM home_stuart_gano.ontos_ml_workbench.training_sheets
UNION ALL
SELECT 'qa_pairs', COUNT(*) FROM home_stuart_gano.ontos_ml_workbench.qa_pairs
ORDER BY table_name
"

# Check canonical label reuse pattern
databricks sql exec --warehouse-id <warehouse-id> --statement "
SELECT
  cl.item_ref,
  cl.label_type,
  cl.reuse_count,
  COUNT(qa.id) as qa_pairs_using_this_label
FROM home_stuart_gano.ontos_ml_workbench.canonical_labels cl
LEFT JOIN home_stuart_gano.ontos_ml_workbench.qa_pairs qa
  ON qa.canonical_label_id = cl.id
GROUP BY cl.item_ref, cl.label_type, cl.reuse_count
ORDER BY reuse_count DESC
"

# Check auto-approval rate
databricks sql exec --warehouse-id <warehouse-id> --statement "
SELECT
  training_sheet_id,
  COUNT(*) as total_pairs,
  SUM(CASE WHEN was_auto_approved THEN 1 ELSE 0 END) as auto_approved,
  ROUND(100.0 * SUM(CASE WHEN was_auto_approved THEN 1 ELSE 0 END) / COUNT(*), 1) as auto_approval_rate_pct
FROM home_stuart_gano.ontos_ml_workbench.qa_pairs
GROUP BY training_sheet_id
"
```

## Next Steps

1. **Seed demo data** using one of the methods above
2. **Verify data** using verification commands
3. **Practice demo flow** to smooth transitions
4. **Customize data** if needed (add facility-specific examples)
5. **Update canonical labels** to show realistic reuse counts (3-5 reuses per label)

## Files Reference

**Seed Scripts**:
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/scripts/bootstrap.sh` - Complete bootstrap
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/scripts/seed_test_data.py` - Acme Instruments use cases
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/scripts/seed_sheets_data.py` - Generic sheets
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/scripts/seed_via_api.py` - API-based seeding

**Schema Scripts**:
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/schemas/99_validate_and_seed.sql` - Best example
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/schemas/seed_sheets.sql` - Sheet samples
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/schemas/seed_templates.sql` - Template samples

**Synthetic Data**:
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/synthetic_data/defect_detection/labels.json`
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/synthetic_data/predictive_maintenance/equipment.json`
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/synthetic_data/anomaly_detection/anomalies.json`
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/synthetic_data/calibration/mc_simulations.csv`
- `/Users/stuart.gano/Documents/Customers/Acme Instruments/ontos-ml-workbench/synthetic_data/templates/*.json`

## Pro Tips

1. **Use bootstrap.sh for clean demos** - It creates everything from scratch
2. **Use seed_test_data.py for development** - It's idempotent and fast
3. **Customize reuse_count** - Set to 3-5 for demo impact ("This label has been reused 5 times across different Training Sheets!")
4. **Add more canonical labels** - Seed 10-15 labels to show auto-approval working at scale
5. **Mix label types** - Same item with defect_classification + severity_level demonstrates composite key power
6. **Real facility names** - Cook, Palo Verde, Watts Bar add authenticity
7. **Show edge cases** - Include low-confidence labels (0.65-0.75) that trigger manual review

---

**Status**: Task #5 Complete
**Last Updated**: 2024-02-09
**Owner**: stuart.gano@databricks.com
