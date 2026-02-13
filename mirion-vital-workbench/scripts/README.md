# VITAL Workbench Scripts

Automated database setup, seeding, and verification for the VITAL Platform Workbench.

## Quick Start

```bash
# 1. Setup database (creates all tables)
./scripts/setup_database.py --catalog home_stuart_gano --schema mirion_vital_workbench

# 2. Seed test data (adds sample Mirion data)
./scripts/seed_test_data.py --catalog home_stuart_gano --schema mirion_vital_workbench

# 3. Verify everything works
./scripts/verify_database.py --catalog home_stuart_gano --schema mirion_vital_workbench
```

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup_database.py` | Initialize all Delta tables | Creates catalog, schema, and all required tables |
| `seed_test_data.py` | Add sample test data | Populates tables with realistic Mirion use case data |
| `verify_database.py` | Verify database setup | Checks tables exist, schemas correct, queries work |
| `setup_ontos_governance.py` | Set up Ontos governance layer | Creates governance tables, seeds glossary terms, compliance rules |

## Features

- **Idempotent:** Safe to run multiple times
- **Error Handling:** Graceful failures with clear error messages
- **Auto-detection:** Automatically finds SQL warehouse
- **Support for:** CLI profiles, custom warehouses, dev/prod catalogs
- **Reset Mode:** Can drop and recreate tables when needed
- **Comprehensive Logging:** Detailed output for troubleshooting

## Documentation

See [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) for:
- Complete usage guide
- Prerequisites and authentication
- Common workflows
- Troubleshooting guide
- Advanced usage patterns

## Schema Overview

The scripts create these tables:

**Core Tables:**
- `sheets` - Dataset definitions (pointers to Unity Catalog sources)
- `canonical_labels` - Ground truth labels (label once, reuse everywhere)
- `templates` - Reusable prompt templates with label_type
- `training_sheets` - Q&A datasets generated from sheets + templates
- `qa_pairs` - Individual Q&A pairs with canonical label linkage
- `model_training_lineage` - Tracks training provenance
- `example_store` - Managed few-shot examples for DSPy

**Monitoring & Registry:**
- `endpoints_registry` - Deployed model endpoints
- `feedback_items` - Production feedback
- `monitor_alerts` - Drift, latency, error alerts
- `job_runs` - Job execution history

## Example: Complete Setup

```bash
# Authenticate with Databricks
databricks auth login --host https://your-workspace.cloud.databricks.com

# Initialize database
./scripts/setup_database.py \
  --catalog home_stuart_gano \
  --schema mirion_vital_workbench

# Add sample data
./scripts/seed_test_data.py \
  --catalog home_stuart_gano \
  --schema mirion_vital_workbench

# Verify setup
./scripts/verify_database.py \
  --catalog home_stuart_gano \
  --schema mirion_vital_workbench
```

Expected output from verify:
```
VERIFICATION PASSED ✓

Database is ready to use!
Row counts:
  • sheets: 3 rows
  • templates: 3 rows
  • endpoints_registry: 3 rows
  • feedback_items: 4 rows
  • monitor_alerts: 3 rows
```

## Sample Data

The seeding script adds realistic Mirion use case data:

**Sheets (3):**
1. Radiation Detector Defect Images (vision AI)
2. Equipment Sensor Telemetry (predictive maintenance)
3. Monte Carlo Calibration Results (physics simulation)

**Templates (3):**
1. Defect Classification - Vision
2. Equipment Failure Prediction
3. Calibration Recommendations

**Endpoints (3):**
1. Defect Classifier - Production
2. Maintenance Predictor - Production
3. Calibration Advisor - Staging

**Additional:**
- 4 feedback items (various ratings and flags)
- 3 monitoring alerts (drift, latency, error rate)

## Troubleshooting

**No SQL warehouse found:**
```bash
# List warehouses
databricks warehouses list

# Use specific warehouse
./scripts/setup_database.py --warehouse-id abc123 --catalog ...
```

**Permission denied:**
```bash
# Re-authenticate
databricks auth login
```

**Verification fails:**
```bash
# Run with debug output
./scripts/verify_database.py --debug --catalog ... --schema ...
```

## Reset Database (⚠️  DESTRUCTIVE)

To start fresh:
```bash
./scripts/setup_database.py --reset --catalog home_stuart_gano --schema mirion_vital_workbench
```

This drops and recreates all tables. All data will be lost.

## Ontos Governance Integration

Set up the governance layer for data contracts, compliance rules, and semantic search:

```bash
# Set up Ontos governance tables (uses same catalog/schema)
./scripts/setup_ontos_governance.py \
  --profile fe-vm-serverless-dxukih \
  --catalog serverless_dxukih_catalog \
  --schema mirion

# Dry run (preview SQL without executing)
./scripts/setup_ontos_governance.py --dry-run
```

This creates:

**Governance Tables:**
- `glossary_terms` - Business term definitions synced from VITAL domain concepts
- `semantic_relationships` - Knowledge graph edges for impact analysis
- `compliance_rules` - Declarative governance rules
- `compliance_results` - Rule evaluation history
- `data_contracts` - ODCS v3.0.2 contract definitions
- `governance_audit_log` - Audit trail for governance actions

**Shared Views:**
- `v_term_usage` - Glossary terms → canonical labels usage
- `v_compliance_dashboard` - Current compliance status
- `v_lineage_graph` - Full data → model lineage
- `v_defect_analytics` - Defect pattern analytics

**Seeded Data:**
- 14 glossary terms (defect types, severity levels, quality metrics)
- 5 compliance rules (dual review, coverage threshold, etc.)
- 3 data contracts (canonical_labels, training_sheets, sheets)

See [`../docs/ONTOS_INTEGRATION.md`](../docs/ONTOS_INTEGRATION.md) for full integration design.

## See Also

- [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) - Complete setup guide
- [`../CLAUDE.md`](../CLAUDE.md) - Project overview
- [`../docs/PRD.md`](../docs/PRD.md) - Product requirements (v2.3)
- [`../docs/ONTOS_INTEGRATION.md`](../docs/ONTOS_INTEGRATION.md) - Ontos governance integration
