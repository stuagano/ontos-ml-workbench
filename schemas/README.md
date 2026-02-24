# Ontos ML Workbench - Database Schema

Delta Lake table schemas for the Ontos ML Workbench in Unity Catalog.

**Schema Location:** Configure via `backend/.env` (`DATABRICKS_CATALOG` and `DATABRICKS_SCHEMA`)

For the current field reference, see `SCHEMA_REFERENCE.md`.

## Quick Start

```bash
# Run all schemas in order
./execute_all.sh

# Or run individually
databricks sql --file 00_create_catalog.sql
databricks sql --file 01_sheets.sql
# ... etc
```

## File Organization

34 SQL files, numbered `00`–`33`, grouped by domain:

### Infrastructure (00)
| # | File | Table(s) |
|---|------|----------|
| 00 | `create_catalog.sql` | Creates catalog and schema container |

### Core ML Pipeline (01–07)
| # | File | Table(s) |
|---|------|----------|
| 01 | `sheets.sql` | `sheets` — Dataset definitions pointing to UC tables/volumes |
| 02 | `templates.sql` | `templates` — Reusable prompt templates for Q&A generation |
| 03 | `canonical_labels.sql` | `canonical_labels` — Ground truth labels (composite key: sheet_id, item_ref, label_type) |
| 04 | `training_sheets.sql` | `training_sheets` — Q&A datasets from Sheet + Template |
| 05 | `qa_pairs.sql` | `qa_pairs` — Individual Q&A pairs with review status |
| 06 | `model_training_lineage.sql` | `model_training_lineage` — Model-to-Training Sheet traceability |
| 07 | `example_store.sql` | `example_store` — Few-shot examples with vector embeddings |

### Labeling Workflow (08–10)
| # | File | Table(s) |
|---|------|----------|
| 08 | `labeling_jobs.sql` | `labeling_jobs` — Annotation project definitions |
| 09 | `labeling_tasks.sql` | `labeling_tasks` — Task batches assigned to labelers |
| 10 | `labeled_items.sql` | `labeled_items` — Individual item annotations |

### Quality & Monitoring (11–16)
| # | File | Table(s) |
|---|------|----------|
| 11 | `model_evaluations.sql` | `model_evaluations` — Per-metric MLflow evaluation results |
| 12 | `identified_gaps.sql` | `identified_gaps` — Gap analysis findings |
| 13 | `annotation_tasks.sql` | `annotation_tasks` — Gap remediation tasks |
| 14 | `bit_attribution.sql` | `bit_attribution` — Attribution scores per training data |
| 15 | `dqx_quality_results.sql` | `dqx_quality_results` — Data quality check results |
| 16 | `endpoint_metrics.sql` | `endpoint_metrics` — Per-request endpoint performance |

### RBAC & Organization (17–24)
| # | File | Table(s) |
|---|------|----------|
| 17 | `app_roles.sql` | `app_roles` + seed data — 6 built-in RBAC roles |
| 18 | `user_role_assignments.sql` | `user_role_assignments` — User-to-role mappings |
| 19 | `teams.sql` | `teams` — Organizational groups |
| 20 | `team_members.sql` | `team_members` — Team membership |
| 21 | `data_domains.sql` | `data_domains` — Hierarchical organizational domains |
| 22 | `asset_reviews.sql` | `asset_reviews` — Steward review workflow |
| 23 | `projects.sql` | `projects` — Workspace containers |
| 24 | `project_members.sql` | `project_members` — Project membership |

### Contracts & Workflows (25–27)
| # | File | Table(s) |
|---|------|----------|
| 25 | `data_contracts.sql` | `data_contracts` — Schema specs with quality SLOs |
| 26 | `compliance_policies.sql` | `compliance_policies`, `policy_evaluations` — Governance rules + results |
| 27 | `workflows.sql` | `workflows`, `workflow_executions` — Event-driven workflow templates |

### Data Products & Semantic Models (28–29)
| # | File | Table(s) |
|---|------|----------|
| 28 | `data_products.sql` | `data_products`, `data_product_ports`, `data_product_subscriptions` |
| 29 | `semantic_models.sql` | `semantic_models`, `semantic_concepts`, `semantic_properties`, `semantic_links` |

### Governance Configuration (30–31)
| # | File | Table(s) |
|---|------|----------|
| 30 | `naming_conventions.sql` | `naming_conventions` — Regex patterns for entity names |
| 31 | `delivery_modes.sql` | `delivery_modes`, `delivery_records` — Deployment configs + audit |

### Platform Integration (32–33)
| # | File | Table(s) |
|---|------|----------|
| 32 | `mcp_integration.sql` | `mcp_tokens`, `mcp_tools`, `mcp_invocations` — AI assistant tools |
| 33 | `platform_connectors.sql` | `platform_connectors`, `connector_assets`, `connector_sync_records` |

## Table Relationships

```
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
   │ canonical_labels   │  Ground truth labels
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

The full lineage graph (materialized in `semantic_links`) covers all 54 tables across 20 entity types and 34 link types, enabling upstream/downstream traversal and impact analysis.

## Key Design Patterns

### Composite Key on Canonical Labels

```sql
CONSTRAINT unique_label UNIQUE (sheet_id, item_ref, label_type)
```

Enables "label once, reuse everywhere" — same item labeled for the same purpose produces one canonical label that gets auto-reused across Training Sheets.

### Foreign Keys (Documented, Not Enforced)

Delta Lake doesn't enforce FKs, but logical relationships are documented in column comments. The lineage graph materializes all FK relationships as traversable edges.

### Audit Fields

All tables include `created_at`, `created_by`, `updated_at`, `updated_by`.

### Change Data Feed

All tables have `delta.enableChangeDataFeed = true` for audit trails and incremental ETL.

## Other Files

- `execute_all.sh` — Run all schemas in order
- `README.md` — This file
- `SCHEMA_REFERENCE.md` — Field reference and common mistakes
- `../scripts/seed_test_data.sql` — Test seed data (moved out of schema dir)
