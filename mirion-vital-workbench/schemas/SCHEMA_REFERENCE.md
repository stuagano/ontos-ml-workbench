# VITAL Platform Workbench - Database Schema Reference

**Last Verified:** 2026-02-11
**Database:** `serverless_dxukih_catalog.mirion`

This document reflects the **ACTUAL** database schema. All code must align with this reference.

## Quick Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `templates` | Prompt templates | `user_prompt_template`, `label_type` |
| `sheets` | Dataset definitions | `source_table`, `item_id_column` |
| `training_sheets` | Q&A datasets | `sheet_id`, `template_id` |
| `qa_pairs` | Individual Q&A pairs | `training_sheet_id`, `canonical_label_id` |
| `canonical_labels` | Ground truth labels | `sheet_id`, `item_ref`, `label_type` |

## Table: templates

**Purpose:** Reusable prompt templates for Q&A generation

```sql
CREATE TABLE templates (
  -- Identity
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  description STRING,

  -- Template content
  system_prompt STRING,
  user_prompt_template STRING,  -- ⚠️ NOT "prompt_template"
  output_schema STRING,         -- JSON string, not VARIANT

  -- Label configuration
  label_type STRING,            -- CRITICAL: links to canonical_labels

  -- Examples
  few_shot_examples ARRAY<STRING>,  -- ⚠️ Array of JSON strings

  -- Metadata
  version STRING,
  parent_template_id STRING,
  status STRING,                -- draft, active, archived

  -- Audit
  created_at TIMESTAMP,
  created_by STRING,
  updated_at TIMESTAMP,
  updated_by STRING
);
```

### ⚠️ Important Notes

- **Model config NOT in DB:** `base_model`, `temperature`, `max_tokens` are passed at runtime
- **Column naming:** Use `user_prompt_template`, not `prompt_template`
- **Examples format:** Array of JSON strings, not structured objects

### API Mapping

| API Field | Database Column |
|-----------|----------------|
| `prompt_template` | `user_prompt_template` |
| `base_model` | (not stored - default: `databricks-meta-llama-3-1-70b-instruct`) |
| `temperature` | (not stored - default: `0.7`) |
| `max_tokens` | (not stored - default: `1024`) |
| `examples` | `few_shot_examples` |

## Table: sheets

**Purpose:** Dataset definitions (lightweight pointers to Unity Catalog data)

```sql
CREATE TABLE sheets (
  -- Identity
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  description STRING,

  -- Source configuration
  source_type STRING,           -- uc_table, uc_volume, external
  source_table STRING,          -- catalog.schema.table
  source_volume STRING,         -- /Volumes/catalog/schema/volume
  source_path STRING,           -- Path within volume

  -- Column configuration
  item_id_column STRING,        -- CRITICAL: used as item_ref in canonical_labels
  text_columns ARRAY<STRING>,
  image_columns ARRAY<STRING>,
  metadata_columns ARRAY<STRING>,

  -- Sampling
  sampling_strategy STRING,     -- all, random, stratified
  sample_size INT,
  filter_expression STRING,     -- SQL WHERE clause

  -- Status
  status STRING,                -- active, archived, deleted
  item_count INT,
  last_validated_at TIMESTAMP,
  version STRING,

  -- Audit
  created_at TIMESTAMP,
  created_by STRING,
  updated_at TIMESTAMP,
  updated_by STRING,

  -- DEPRECATED FIELDS (do not use)
  columns ARRAY<STRING>,        -- Use text_columns instead
  primary_table STRING,         -- Use source_table instead
  secondary_sources ARRAY<STRING>,
  join_keys ARRAY<STRING>,
  template_config STRING        -- Templates now separate
);
```

### ⚠️ Deprecated Fields

DO NOT USE these fields - they exist for backward compatibility only:
- `columns` → Use `text_columns`, `image_columns`, `metadata_columns`
- `primary_table` → Use `source_table`
- `template_config` → Templates are now in separate table

## Table: training_sheets

**Purpose:** Q&A datasets (assembled from sheet + template)

```sql
CREATE TABLE training_sheets (
  -- Identity
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  description STRING,

  -- References
  sheet_id STRING NOT NULL,     -- Foreign key to sheets
  template_id STRING NOT NULL,  -- Foreign key to templates

  -- Generation metadata
  generation_method STRING,     -- llm, manual, hybrid
  model_used STRING,

  -- Statistics
  total_pairs INT,
  approved_pairs INT,
  rejected_pairs INT,
  avg_confidence DOUBLE,

  -- Status
  status STRING,                -- draft, ready, in_use, archived

  -- Audit
  created_at TIMESTAMP,
  created_by STRING,
  updated_at TIMESTAMP,
  updated_by STRING
);
```

## Schema Verification

To verify your code matches the actual database schema:

```bash
# Run schema verification script
python schemas/verify_schema.py

# Or manually check a table
cd backend && python << 'EOF'
from app.services.sql_service import get_sql_service
sql_service = get_sql_service()
result = sql_service.execute("DESCRIBE templates")
for row in result:
    print(f"{row['col_name']:30s} {row['data_type']:30s}")
EOF
```

## Common Mistakes

### ❌ Wrong: Using API field names in SQL

```python
# WRONG - 'prompt_template' doesn't exist in DB
sql = f"SELECT prompt_template FROM templates"
```

### ✅ Correct: Using database column names

```python
# CORRECT - use actual DB column name
sql = f"SELECT user_prompt_template FROM templates"
```

### ❌ Wrong: Expecting model config in DB

```python
# WRONG - these fields don't exist
sql = f"SELECT temperature, max_tokens FROM templates"
```

### ✅ Correct: Using defaults for runtime config

```python
# CORRECT - use defaults in API response
return TemplateResponse(
    ...
    base_model="databricks-meta-llama-3-1-70b-instruct",
    temperature=0.7,
    max_tokens=1024
)
```

## Updating This Document

When database schema changes:

1. Update the SQL files in `schemas/`
2. Run migrations on the database
3. Update this reference document
4. Update Pydantic models in `backend/app/models/`
5. Update API endpoints to match
6. Run verification script

**Always verify against live database before committing changes.**
