# Ontos ML Workbench - Database Schema

This directory contains all Delta Lake table schemas for the Ontos ML Workbench in Unity Catalog.

**Schema Location:** Configure via `backend/.env` (`DATABRICKS_CATALOG` and `DATABRICKS_SCHEMA`)

For the current field reference, see `SCHEMA_REFERENCE.md`.

## Quick Start

### Initial Schema Setup

Run these SQL files in order:

```bash
# 1. Create catalog and schema
databricks sql --file 01_create_catalog.sql

# 2. Create all tables
databricks sql --file 02_sheets.sql
databricks sql --file 03_templates.sql
databricks sql --file 04_canonical_labels.sql
databricks sql --file 05_training_sheets.sql
databricks sql --file 06_qa_pairs.sql
databricks sql --file 07_model_training_lineage.sql
databricks sql --file 08_example_store.sql
databricks sql --file 09_labeling_jobs.sql
databricks sql --file 10_labeling_tasks.sql
databricks sql --file 11_labeled_items.sql
databricks sql --file 12_workspace_users.sql
databricks sql --file 13_model_evaluations.sql
databricks sql --file 14_identified_gaps.sql
databricks sql --file 15_annotation_tasks.sql
databricks sql --file 16_bit_attribution.sql
databricks sql --file 17_dqx_quality_results.sql
databricks sql --file 18_endpoint_metrics.sql
databricks sql --file 19_app_roles.sql
databricks sql --file 20_user_role_assignments.sql
databricks sql --file 21_teams.sql
databricks sql --file 22_team_members.sql
databricks sql --file 23_data_domains.sql
databricks sql --file 24_seed_default_roles.sql
databricks sql --file 25_add_domain_id_columns.sql

# 3. Validate setup
databricks sql --file 99_validate_and_seed.sql
```

Or run all at once:
```bash
./execute_all.sh
```

### Apply Migrations

After initial setup, apply these migrations in order:

```bash
# 1. Add ML columns to templates (v1.1)
databricks sql --file add_ml_columns_to_templates.sql

# 2. Add ML columns to training_sheets (v1.1)
databricks sql --file add_ml_columns_to_training_sheets.sql

# 3. Add Monitor stage support (v1.2)
databricks sql --file fix_monitor_schema.sql
```

## Table Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Flow Architecture                   │
└─────────────────────────────────────────────────────────────┘

      Unity Catalog
      (External Data)
            │
            ▼
     ┌─────────────┐
     │   sheets    │  Dataset definitions
     └──────┬──────┘
            │
            │  (combined with)
            │
            ▼
     ┌─────────────┐
     │  templates  │  Prompt templates with label_type
     └──────┬──────┘
            │
            │  (generates)
            │
            ▼
   ┌─────────────────┐
   │ training_sheets │  Q&A datasets
   └────────┬────────┘
            │
            │  (contains)
            │
            ▼
      ┌──────────┐
      │ qa_pairs │  Individual Q&A pairs
      └─────┬────┘
            │
            │  (optionally links to)
            │
            ▼
   ┌────────────────────┐
   │ canonical_labels   │  Ground truth labels ⭐
   └────────────────────┘
   (sheet_id, item_ref, label_type)  ← COMPOSITE KEY

            │
            │  (used in training)
            │
            ▼
  ┌─────────────────────────┐
  │ model_training_lineage  │  Model tracking
  └─────────────────────────┘
```

## Key Design Patterns

### 1. Composite Key on Canonical Labels ⭐

The **canonical_labels** table uses a composite UNIQUE constraint:

```sql
CONSTRAINT unique_label UNIQUE (sheet_id, item_ref, label_type)
```

This enables the "label once, reuse everywhere" pattern:
- Same item (item_ref) in same Sheet (sheet_id)
- Labeled for same purpose (label_type)
- Results in ONE canonical label that gets reused

**Example:**
- Sheet: "medical_invoices"
- Item: "invoice_001.pdf"
- Label Type: "entities"
- First time: Expert labels entities → creates canonical_label
- Second time (different template, same label_type): Canonical label auto-reused ✨

### 2. Foreign Key Relationships (Documented, Not Enforced)

Delta Lake doesn't enforce foreign keys, but logical relationships are:

```sql
-- Sheets
sheets.id → training_sheets.sheet_id
sheets.id → canonical_labels.sheet_id
sheets.id → qa_pairs.sheet_id

-- Templates
templates.id → training_sheets.template_id
templates.label_type → canonical_labels.label_type  (logical link)

-- Training Sheets
training_sheets.id → qa_pairs.training_sheet_id
training_sheets.id → model_training_lineage.training_sheet_id

-- Canonical Labels
canonical_labels.id → qa_pairs.canonical_label_id
```

### 3. Audit Fields Pattern

All tables include:
```sql
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
created_by STRING NOT NULL
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
updated_by STRING NOT NULL
```

Application code must populate `created_by` and `updated_by` with Databricks user identity.

### 4. JSON Variant Fields

Used for flexible schema evolution:
- `label_data VARIANT` - Different label types have different structures
- `messages VARIANT` - OpenAI chat format with role + content arrays
- `metadata VARIANT` - Extensible metadata without schema changes
- `validation_rules VARIANT` - Template-specific validation logic

### 5. Status Field Enums

Common status values (enforced at application layer):

**sheets.status:**
- `active` - Available for use
- `archived` - Read-only, no longer used
- `deleted` - Soft delete

**templates.status:**
- `draft` - Under development
- `active` - Available for use
- `archived` - Deprecated

**training_sheets.status:**
- `generating` - Q&A generation in progress
- `review` - Ready for expert review
- `approved` - Review complete, ready to export
- `rejected` - Not suitable for training
- `exported` - JSONL exported and ready for training

**qa_pairs.review_status:**
- `pending` - Awaiting review
- `approved` - Expert approved
- `edited` - Expert modified assistant response
- `rejected` - Not suitable for training
- `flagged` - Needs attention

## Data Quality

Tables have quality levels (Bronze/Silver/Gold):

- **Bronze** - Raw source references: `sheets`
- **Silver** - Curated/transformed: `templates`, `training_sheets`, `qa_pairs`, `example_store`
- **Gold** - Validated ground truth: `canonical_labels`, `model_training_lineage`

## Change Data Feed

All tables have `delta.enableChangeDataFeed = true` for:
- Audit trail of all changes
- Real-time streaming to downstream systems
- Incremental ETL processing

## Indexes

Indexes are created on:
- Status fields (for filtering active/archived items)
- Foreign key columns (for join performance)
- Composite key components (for canonical label lookups)
- Boolean flags (for filtered queries)

## Vector Search (P1)

The `example_store` table includes an `embedding` column for future vector search:

```sql
-- P1: Create vector search index
CREATE VECTOR SEARCH INDEX example_embeddings
  ON main.ontos_ml_workbench.example_store(embedding)
  USING EMBEDDING_MODEL 'databricks-bge-large-en';
```

This enables similarity-based few-shot example retrieval in Phase 4.

## Validation Queries

After creating tables, run these to verify:

```sql
-- Show all tables
SHOW TABLES IN main.ontos_ml_workbench;

-- Check table schemas
DESCRIBE EXTENDED main.ontos_ml_workbench.canonical_labels;

-- Test composite key constraint
INSERT INTO main.ontos_ml_workbench.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, created_by, updated_by)
VALUES
  ('test-1', 'sheet-1', 'item-1', 'entities', '{"test": true}', 'system', 'system');

-- This should fail with UNIQUE constraint violation
INSERT INTO main.ontos_ml_workbench.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, created_by, updated_by)
VALUES
  ('test-2', 'sheet-1', 'item-1', 'entities', '{"test": true}', 'system', 'system');
```

## Migration Strategy

For future schema changes:
1. Add new columns with DEFAULT values
2. Use `ALTER TABLE ADD COLUMN` (non-breaking)
3. Avoid dropping columns (breaking change)
4. Version templates/prompts instead of modifying

## Permissions

Recommended Unity Catalog permissions:

```sql
-- Data Scientists (read-only)
GRANT SELECT ON SCHEMA main.ontos_ml_workbench TO data_scientists;

-- Domain Experts (read + label)
GRANT SELECT, MODIFY ON TABLE main.ontos_ml_workbench.canonical_labels TO domain_experts;
GRANT SELECT, MODIFY ON TABLE main.ontos_ml_workbench.qa_pairs TO domain_experts;

-- Platform Admins (full access)
GRANT ALL PRIVILEGES ON SCHEMA main.ontos_ml_workbench TO platform_admins;
```

## Next Steps

1. ✅ Create all tables in Unity Catalog
2. Validate composite key constraint on canonical_labels
3. Create Pydantic models matching these schemas (Task #3-5)
4. Implement service layer for CRUD operations
5. Seed with sample data for testing

## File Organization

### Core Schema Files
- `01_create_catalog.sql` - Catalog and schema creation
- `02_sheets.sql` - Dataset definitions
- `03_templates.sql` - Prompt templates
- `04_canonical_labels.sql` - Ground truth labels
- `05_training_sheets.sql` - Q&A datasets
- `06_qa_pairs.sql` - Individual Q&A pairs
- `07_model_training_lineage.sql` - Model tracking
- `08_example_store.sql` - Few-shot examples
- `09_labeling_jobs.sql` - Labeling job definitions
- `10_labeling_tasks.sql` - Labeling task batches
- `11_labeled_items.sql` - Individual item annotations
- `12_workspace_users.sql` - Labeling workspace users
- `13_model_evaluations.sql` - Model evaluation results (mlflow.evaluate)
- `14_identified_gaps.sql` - Gap analysis identified gaps
- `15_annotation_tasks.sql` - Annotation tasks for gap remediation
- `16_bit_attribution.sql` - Model attribution scores per training data
- `17_dqx_quality_results.sql` - Data quality check results per sheet
- `18_endpoint_metrics.sql` - Per-request endpoint performance metrics
- `19_app_roles.sql` - RBAC role definitions with per-feature permissions
- `20_user_role_assignments.sql` - User-to-role mappings
- `21_teams.sql` - Organizational teams for data governance
- `22_team_members.sql` - Team membership with role overrides
- `23_data_domains.sql` - Hierarchical data domains
- `24_seed_default_roles.sql` - Seed 6 default RBAC roles
- `25_add_domain_id_columns.sql` - Add domain_id FK to sheets, templates, training_sheets
- `99_validate_and_seed.sql` - Validation queries

### Active Migrations
- `add_ml_columns_to_templates.sql` - Add feature/target columns to templates (v1.1)
- `add_ml_columns_to_training_sheets.sql` - Add feature/target columns to training sheets (v1.1)
- `fix_monitor_schema.sql` - Add Monitor stage tables and columns (v1.2)

### Seed Data Scripts
- `seed_sheets.sql` - Sample sheets data
- `seed_simple.sql` - Minimal seed data
- `seed_templates.sql` - Sample templates
- `seed_pcb_data.sql` - PCB demo data
- `seed_canonical_labels.sql` - Canonical labels seed data

### Documentation
- `README.md` - This file
- `SCHEMA_REFERENCE.md` - Current field reference and common mistakes

### Python Utilities
- `execute_schemas.py` - Execute SQL via Databricks SDK
- `create_tables_simple.py` - Simple table creation
- `verify_schema.py` - Schema verification
- `check_and_seed.py` - Check and seed data
- `quick_setup.py` - Quick setup utility
- `run_sql.py` - SQL runner utility
- `seed_data.py` - Comprehensive seed script

### Specialized Scripts
- `create_canonical_labels_table.py` - Canonical labels table creation
- `seed_canonical_labels.py` - Seed canonical labels
- `verify_canonical_labels.py` - Verify canonical labels
- `create_sheets_table.py` - Sheets table creation
- `migrate_sheets_schema.py` - Schema migration utility
- `seed_sheets_production.py` - Production seed data
- `verify_sheets.py` - Verify sheets data

### Shell Scripts
- `execute_all.sh` - Execute all schemas in order

## Support

For schema questions or modifications, see:
- `SCHEMA_REFERENCE.md` - Field reference and common mistakes
- PRD: `docs/PRD.md`
