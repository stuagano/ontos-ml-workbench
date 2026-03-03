# ML Workflow Extension for Ontos — Design Document

**Goal**: Extend the open-source Ontos governance platform with ML data curation workflows, contributing upstream to [github.com/larsgeorge/ontos](https://github.com/larsgeorge/ontos).

**Storage**: Lakebase (managed Postgres) for operational/governance data via SQLAlchemy ORM. Actual ML training datasets remain in Delta tables/volumes in Unity Catalog.

**Architecture**: Follow Ontos's existing 4-layer pattern per entity: DB Model → Repository → Manager → Routes (+ Pydantic API models).

---

## Navigation Integration

Ontos organizes features in `config/features.ts` with a "VITAL Stages" group that already has Deploy, Monitor, Improve. The ML curation stages fill in the upstream pipeline:

```
VITAL Stages (existing group)
  ├── Sheets          ← NEW (dataset pointers to UC tables/volumes)
  ├── Templates       ← NEW (reusable prompt library)
  ├── Generate        ← NEW (Q&A pair generation)
  ├── Labels          ← NEW (canonical labeling tool)
  ├── Train           ← NEW (fine-tuning job management)
  ├── Deploy          ← EXISTS in Ontos
  ├── Monitor         ← EXISTS in Ontos
  └── Improve         ← EXISTS in Ontos
```

---

## Core ML Pipeline Flow

```
Unity Catalog Tables/Volumes
         ↓
    [Sheet] ← lightweight pointer to UC data
         ↓ (combined with)
   [Template] ← prompt blueprint with label_type
         ↓ (generates)
[TrainingSheet] ← materialized Q&A dataset
         ↓ (contains)
    [QaPair] ← individual Q&A records
         ↓ (optionally links to)
[CanonicalLabel] ← ground truth (composite key: sheet_id, item_ref, label_type)
         ↓ (used in)
  [TrainingJob] ← fine-tuning via FMAPI + MLflow
         ↓
   UC Model Registry → Deploy → Monitor → Improve
```

---

## New SQLAlchemy Models (Core 6)

### 1. SheetDb — Dataset Pointers

Lightweight pointers to Unity Catalog tables and volumes. Enable multimodal data fusion (images + sensor data + metadata) without copying data.

```python
class SheetDb(Base):
    __tablename__ = 'sheets'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Source configuration
    source_type = Column(String, nullable=False)          # uc_table, uc_volume, external
    source_table = Column(String, nullable=True)           # catalog.schema.table
    source_volume = Column(String, nullable=True)          # /Volumes/catalog/schema/vol
    item_id_column = Column(String, nullable=True)         # Column used as item_ref

    # Column classification (JSON arrays)
    text_columns = Column(JSON, nullable=True)
    image_columns = Column(JSON, nullable=True)
    metadata_columns = Column(JSON, nullable=True)

    # Sampling
    sampling_strategy = Column(String, nullable=True)
    sample_size = Column(Integer, nullable=True)
    filter_expression = Column(String, nullable=True)

    # Organization (reuses Ontos's existing entities)
    domain_id = Column(String, ForeignKey('data_domains.id'), nullable=True, index=True)
    owner_team_id = Column(String, ForeignKey('teams.id'), nullable=True, index=True)
    project_id = Column(String, ForeignKey('projects.id'), nullable=True, index=True)

    status = Column(String, nullable=False, default='active', index=True)
    item_count = Column(Integer, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    domain = relationship("DataDomain", foreign_keys=[domain_id], lazy="selectin")
    owner_team = relationship("TeamDb", foreign_keys=[owner_team_id], lazy="selectin")
    canonical_labels = relationship("CanonicalLabelDb", back_populates="sheet",
                                     cascade="all, delete-orphan", lazy="selectin")
    training_sheets = relationship("TrainingSheetDb", back_populates="sheet",
                                    cascade="all, delete-orphan", lazy="selectin")
```

### 2. CanonicalLabelDb — Ground Truth Layer (Core Innovation)

Expert-validated labels with composite unique key enabling "label once, reuse everywhere." Same source item can have multiple independent labelsets (e.g., classification + entity extraction).

```python
class CanonicalLabelDb(Base):
    __tablename__ = 'canonical_labels'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    sheet_id = Column(String, ForeignKey('sheets.id', ondelete='CASCADE'),
                      nullable=False, index=True)
    item_ref = Column(String, nullable=False)
    label_type = Column(String, nullable=False, index=True)

    label_data = Column(JSON, nullable=False)
    label_confidence = Column(Float, nullable=True)
    labeling_mode = Column(String, nullable=True)          # during_review, standalone_tool, bulk_import

    # Versioning
    version = Column(Integer, nullable=False, default=1)
    supersedes_label_id = Column(String, ForeignKey('canonical_labels.id'), nullable=True)

    # Quality
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    quality_score = Column(Float, nullable=True)
    flags = Column(JSON, nullable=True)                    # ["ambiguous", "edge_case", etc.]

    # Usage tracking
    reuse_count = Column(Integer, nullable=False, default=0)
    last_reused_at = Column(DateTime(timezone=True), nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Composite unique — enables multiple labelsets per item
    __table_args__ = (
        UniqueConstraint('sheet_id', 'item_ref', 'label_type', name='uq_canonical_label'),
    )

    sheet = relationship("SheetDb", back_populates="canonical_labels")
    qa_pairs = relationship("QaPairDb", back_populates="canonical_label", lazy="selectin")
```

### 3. TemplateDb — Reusable Prompt Library

Prompt templates encoding domain expertise. The `label_type` field creates the link to canonical labels for automatic pre-approval.

```python
class TemplateDb(Base):
    __tablename__ = 'templates'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    system_prompt = Column(Text, nullable=True)
    user_prompt_template = Column(Text, nullable=False)    # {placeholder} syntax
    output_schema = Column(JSON, nullable=True)

    # Links template to canonical labels for auto-approval
    label_type = Column(String, nullable=True, index=True)

    # ML columns
    feature_columns = Column(JSON, nullable=True)          # Array of column names
    target_column = Column(String, nullable=True)
    few_shot_examples = Column(JSON, nullable=True)

    # Organization
    domain_id = Column(String, ForeignKey('data_domains.id'), nullable=True, index=True)

    # Versioning
    version = Column(Integer, nullable=False, default=1)
    parent_template_id = Column(String, ForeignKey('templates.id'), nullable=True)

    status = Column(String, nullable=False, default='draft', index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    domain = relationship("DataDomain", foreign_keys=[domain_id], lazy="selectin")
    training_sheets = relationship("TrainingSheetDb", back_populates="template", lazy="selectin")
```

### 4. TrainingSheetDb — Materialized Q&A Datasets

Generated from Sheet + Template. Tracks generation statistics and approval rates.

```python
class TrainingSheetDb(Base):
    __tablename__ = 'training_sheets'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    sheet_id = Column(String, ForeignKey('sheets.id'), nullable=False, index=True)
    template_id = Column(String, ForeignKey('templates.id'), nullable=False, index=True)
    template_version = Column(Integer, nullable=True)

    generation_mode = Column(String, nullable=True)        # ai_generated, manual, hybrid
    model_used = Column(String, nullable=True)
    generation_params = Column(JSON, nullable=True)        # {temperature, max_tokens}

    status = Column(String, nullable=False, default='generating', index=True)
    # Status lifecycle: generating → review → approved → exported

    # Statistics
    total_items = Column(Integer, nullable=True)
    generated_count = Column(Integer, default=0)
    approved_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    auto_approved_count = Column(Integer, default=0)       # Via canonical label lookup

    # Export
    exported_at = Column(DateTime(timezone=True), nullable=True)
    export_path = Column(String, nullable=True)
    export_format = Column(String, nullable=True)

    domain_id = Column(String, ForeignKey('data_domains.id'), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    sheet = relationship("SheetDb", back_populates="training_sheets")
    template = relationship("TemplateDb", back_populates="training_sheets")
    qa_pairs = relationship("QaPairDb", back_populates="training_sheet",
                             cascade="all, delete-orphan", lazy="selectin")
```

### 5. QaPairDb — Individual Q&A Records

Individual prompt-response pairs within a Training Sheet. Links to canonical labels for auto-approval.

```python
class QaPairDb(Base):
    __tablename__ = 'qa_pairs'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    training_sheet_id = Column(String, ForeignKey('training_sheets.id', ondelete='CASCADE'),
                               nullable=False, index=True)

    sheet_id = Column(String, ForeignKey('sheets.id'), nullable=False)  # Denormalized for lookup
    item_ref = Column(String, nullable=False)

    messages = Column(JSON, nullable=False)                # [{role, content}, ...]
    original_messages = Column(JSON, nullable=True)        # Before human editing

    # Canonical label linkage
    canonical_label_id = Column(String, ForeignKey('canonical_labels.id'), nullable=True, index=True)
    was_auto_approved = Column(Boolean, nullable=False, default=False, index=True)

    # Review
    review_status = Column(String, nullable=False, default='pending', index=True)
    review_action = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    edit_reason = Column(String, nullable=True)

    # Quality
    quality_flags = Column(JSON, nullable=True)            # ["hallucination", "incomplete"]
    quality_score = Column(Float, nullable=True)
    generation_metadata = Column(JSON, nullable=True)      # {model, latency, tokens}

    sequence_number = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    training_sheet = relationship("TrainingSheetDb", back_populates="qa_pairs")
    canonical_label = relationship("CanonicalLabelDb", back_populates="qa_pairs")
```

### 6. ExampleStoreDb — Few-Shot Examples

Dynamic few-shot example library for prompt optimization. Tracks provenance and effectiveness.

```python
class ExampleStoreDb(Base):
    __tablename__ = 'example_store'

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))

    input = Column(JSON, nullable=False)
    expected_output = Column(JSON, nullable=False)

    # Search & retrieval
    search_keys = Column(JSON, nullable=True)
    embedding_text = Column(Text, nullable=True)
    # Note: vector embedding stored via pgvector extension if available

    # Classification
    function_name = Column(String, nullable=True, index=True)
    domain = Column(String, nullable=True, index=True)
    difficulty = Column(String, nullable=True)              # simple, moderate, complex, edge_case

    # Quality
    quality_score = Column(Float, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False, index=True)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Usage analytics
    usage_count = Column(Integer, nullable=False, default=0)
    effectiveness_score = Column(Float, nullable=True)

    # Provenance
    source = Column(String, nullable=True)                 # curated, training_sheet, imported
    source_training_sheet_id = Column(String, ForeignKey('training_sheets.id'), nullable=True)
    source_canonical_label_id = Column(String, ForeignKey('canonical_labels.id'), nullable=True)

    metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
```

---

## File Structure (New Files in Ontos)

```
src/backend/src/
  db_models/
    ml_sheets.py              # SheetDb, CanonicalLabelDb
    ml_templates.py           # TemplateDb
    ml_training.py            # TrainingSheetDb, QaPairDb
    ml_examples.py            # ExampleStoreDb
  repositories/
    sheets_repository.py
    canonical_labels_repository.py
    templates_repository.py
    training_sheets_repository.py
    example_store_repository.py
  controller/
    sheets_manager.py
    canonical_labels_manager.py
    templates_manager.py
    training_sheets_manager.py
    example_store_manager.py
  routes/
    sheets_routes.py
    canonical_labels_routes.py
    templates_routes.py
    training_sheets_routes.py
    example_store_routes.py
  models/
    ml_sheets.py              # Pydantic Create/Update/Response
    ml_canonical_labels.py
    ml_templates.py
    ml_training_sheets.py
    ml_example_store.py
```

---

## Backend Wiring

### Manager Initialization (startup_tasks.py)

```python
app.state.sheets_manager = SheetsManager(db=session, ws_client=ws_client)
app.state.canonical_labels_manager = CanonicalLabelsManager(db=session)
app.state.templates_manager = TemplatesManager(db=session)
app.state.training_sheets_manager = TrainingSheetsManager(db=session, ws_client=ws_client)
app.state.example_store_manager = ExampleStoreManager(db=session)
```

### Route Registration (app.py)

```python
sheets_routes.register_routes(app)
canonical_labels_routes.register_routes(app)
templates_routes.register_routes(app)
training_sheets_routes.register_routes(app)
example_store_routes.register_routes(app)
```

### API Endpoints Pattern

```
GET    /api/sheets                    # List sheets
GET    /api/sheets/{id}               # Get sheet detail
POST   /api/sheets                    # Create sheet
PUT    /api/sheets/{id}               # Update sheet
DELETE /api/sheets/{id}               # Delete sheet
POST   /api/sheets/{id}/validate      # Validate UC source exists

GET    /api/canonical-labels          # List/search labels
GET    /api/canonical-labels/lookup   # Lookup by (sheet_id, item_ref, label_type)
POST   /api/canonical-labels          # Create label
POST   /api/canonical-labels/bulk     # Bulk import labels

GET    /api/templates                 # List templates
POST   /api/templates                 # Create template
POST   /api/templates/{id}/preview    # Preview with sample data

POST   /api/training-sheets           # Generate Q&A pairs
GET    /api/training-sheets/{id}      # Get with Q&A pairs
POST   /api/training-sheets/{id}/export  # Export to JSONL
POST   /api/training-sheets/{id}/qa-pairs/{qa_id}/review  # Approve/reject

GET    /api/example-store             # List/search examples
POST   /api/example-store             # Add example
GET    /api/example-store/similar     # Vector similarity search
```

---

## Integration with Existing Ontos Entities

| ML Concept | Ontos Entity It Connects To | How |
|---|---|---|
| Sheet.domain_id | DataDomain | ForeignKey (existing) |
| Sheet.owner_team_id | TeamDb | ForeignKey (existing) |
| Sheet.project_id | ProjectDb | ForeignKey (existing) |
| ML page permissions | AppRoleDb | Add ML feature IDs to feature_permissions |
| Tagging sheets/templates | TagDb + EntityTagAssociationDb | Generic tagging system (existing) |
| Review of Training Sheets | DataAssetReviewRequestDb | Reuse review workflow (existing) |
| Comments on Q&A pairs | CommentDb | Generic comments system (existing) |
| Change history | ChangeLogDb + AuditLogDb | Existing audit infrastructure |
| Notifications | NotificationDb | Existing notification system |
| Semantic links / lineage | SemanticLinksDb | Add ML entity relationships |

---

## Operational & Evaluation Models (Complete)

All operational models are now implemented as SQLAlchemy ORM models. Previously these were only Delta DDLs (schemas/*.sql); they are now fully typed ORM classes registered in Ontos.

### Training & Deployment

| File | Model | DDL Source | Purpose |
|------|-------|-----------|---------|
| `ml_training_jobs.py` | `TrainingJobDb` | `34_training_jobs.sql` | Fine-tuning job tracking (FMAPI + MLflow) |
| `ml_training_jobs.py` | `TrainingJobLineageDb` | `34_training_jobs.sql` | Job → Training Sheet lineage |
| `ml_training_jobs.py` | `TrainingJobMetricDb` | `34_training_jobs.sql` | Per-checkpoint loss/accuracy |
| `ml_training_jobs.py` | `TrainingJobEventDb` | `34_training_jobs.sql` | Job event audit log |
| `ml_lineage.py` | `ModelTrainingLineageDb` | `06_model_training_lineage.sql` | Model → Training Sheet traceability |
| `ml_evaluations.py` | `ModelEvaluationDb` | `11_model_evaluations.sql` | Per-metric eval results |
| `ml_monitoring.py` | `EndpointMetricDb` | `16_endpoint_metrics.sql` | Production request-level monitoring |

### Labeling Workflow

| File | Model | DDL Source | Purpose |
|------|-------|-----------|---------|
| `ml_labeling.py` | `LabelingJobDb` | `08_labeling_jobs.sql` | Annotation project definitions |
| `ml_labeling.py` | `LabelingTaskDb` | `09_labeling_tasks.sql` | Task batches assigned to labelers |
| `ml_labeling.py` | `LabeledItemDb` | `10_labeled_items.sql` | Individual item annotations |

### Gap Analysis & Remediation

| File | Model | DDL Source | Purpose |
|------|-------|-----------|---------|
| `ml_gaps.py` | `IdentifiedGapDb` | `12_identified_gaps.sql` | Gap analysis findings |
| `ml_gaps.py` | `AnnotationTaskDb` | `13_annotation_tasks.sql` | Gap remediation work items |
| `ml_attribution.py` | `BitAttributionDb` | `14_bit_attribution.sql` | Training data attribution scores |

### Data Quality

| File | Model | DDL Source | Purpose |
|------|-------|-----------|---------|
| `ml_quality.py` | `DqxQualityResultDb` | `15_dqx_quality_results.sql` | DQX check results per sheet |

### Type Mapping: Delta → PostgreSQL/Lakebase

| Delta Type | SQLAlchemy Column | Notes |
|------------|-------------------|-------|
| `STRING` | `Column(String)` | |
| `INT` | `Column(Integer)` | |
| `DOUBLE` | `Column(Float)` | |
| `BOOLEAN` | `Column(Boolean)` | |
| `TIMESTAMP` | `Column(DateTime(timezone=True))` | |
| `VARIANT` | `Column(JSON)` | Maps to PostgreSQL JSONB — richer querying |
| `ARRAY<STRING>` | `Column(JSON)` | Stored as JSON arrays |

### Governance Models (reuse existing Ontos — DDLs 17-33)

No new ORM models needed. ML models reference existing Ontos entities via ForeignKey:

- `SheetDb.domain_id` → `DataDomain.id`
- `SheetDb.owner_team_id` → `TeamDb.id`
- `SheetDb.project_id` → `ProjectDb.id`
- `TemplateDb.domain_id` → `DataDomain.id`
- `TrainingSheetDb.domain_id` → `DataDomain.id`

---

## Relationship Graph

```
SheetDb ──────────┬── CanonicalLabelDb ──── QaPairDb
                  │
                  ├── TrainingSheetDb ──┬── QaPairDb
                  │                     ├── TrainingJobDb ──┬── TrainingJobLineageDb
                  │                     │                   ├── TrainingJobMetricDb
                  │                     │                   └── TrainingJobEventDb
                  │                     └── ModelTrainingLineageDb
                  │
                  ├── LabelingJobDb ──── LabelingTaskDb ──── LabeledItemDb
                  │
                  └── DqxQualityResultDb

TemplateDb ────── TrainingSheetDb
                  IdentifiedGapDb ──── AnnotationTaskDb

ModelEvaluationDb (standalone, references training_sheets)
BitAttributionDb  (standalone, references training data by ID)
EndpointMetricDb  (standalone, time-series)
ExampleStoreDb    (standalone, references training_sheets + canonical_labels)
```

---

## Implementation Progress

### Completed

| Layer | Scope | Status |
|-------|-------|--------|
| **Layer 1: ORM Models** | 8 new model files, 15 model classes | Done |
| **Layer 2: Repositories** | 8 new repo files, 14 repository classes | Done |
| **Layer 3: Managers** | 8 new manager files, 8 manager classes | Done |

### New Manager Files

| File | Manager | Repos Used | Pattern |
|------|---------|-----------|---------|
| `ml_lineage_manager.py` | `ModelTrainingLineageManager` | `model_training_lineage_repo` | Style A (no db in init) |
| `ml_labeling_manager.py` | `LabelingManager` | `labeling_job_repo`, `labeling_task_repo`, `labeled_item_repo` | Style A |
| `ml_evaluations_manager.py` | `ModelEvaluationsManager` | `model_evaluation_repo` | Style A |
| `ml_gaps_manager.py` | `GapAnalysisManager` | `identified_gap_repo`, `annotation_task_repo` | Style A |
| `ml_attribution_manager.py` | `AttributionManager` | `bit_attribution_repo` | Style A |
| `ml_quality_manager.py` | `DataQualityManager` | `dqx_quality_result_repo` | Style A |
| `ml_monitoring_manager.py` | `EndpointMonitoringManager` | `endpoint_metric_repo` | Style A |
| `ml_training_jobs_manager.py` | `TrainingJobsManager` | `training_job_repo`, `training_job_lineage_repo`, `training_job_metric_repo`, `training_job_event_repo` | Style A |

| **Layer 4a: Pydantic Models** | 8 new model files (Create/Update/Response) | Done |
| **Layer 4b: Routes** | 8 new route files (FastAPI routers) | Done |
| **Layer 4c: Wiring** | `app.py` imports + registration, `startup_tasks.py` manager init | Done |
| **Layer 4d: Alembic Migration** | `ml002_add_ml_extension_tables.py` — 14 new tables | Done |

### New Route Files

| File | Prefix | Key Endpoints |
|------|--------|--------------|
| `ml_lineage_routes.py` | `/api/ml-lineage` | CRUD + deployed filter |
| `ml_labeling_routes.py` | `/api/ml-labeling` | /jobs, /tasks, /items, refresh-progress |
| `ml_evaluations_routes.py` | `/api/ml-evaluations` | CRUD + bulk + latest-metrics |
| `ml_gaps_routes.py` | `/api/ml-gaps` | /gaps, /tasks, /gaps/actionable |
| `ml_attribution_routes.py` | `/api/ml-attribution` | CRUD + bulk |
| `ml_quality_routes.py` | `/api/ml-quality` | CRUD + /latest |
| `ml_monitoring_routes.py` | `/api/ml-endpoint-metrics` | CRUD + bulk + /summary |
| `ml_training_jobs_routes.py` | `/api/ml-training-jobs` | jobs + /{job_id}/lineage, /metrics, /events |

### Remaining

1. **Frontend alignment** — Adopt Zustand + `useApi` patterns for new endpoints
2. **Integration testing** — Verify all endpoints against Lakebase
3. **Demo data seeder** — Populate new tables with sample data

---

## What Already Exists in Ontos (No Reimplementation Needed)

- RBAC (roles, permissions, feature access levels)
- Teams and team membership
- Data domains (hierarchical)
- Projects
- Data contracts and validation
- Compliance policies
- Asset review workflows
- Tagging system (namespaces, permissions)
- Comments (generic, attachable to any entity)
- Audit logging
- Notifications
- Semantic links / knowledge graph
- Workflows engine
- Search indexing
- Change log / timeline
- MCP integration for AI assistants

---

## Governance Integration

**Goal**: Wire ML pipeline entities into the Ontos governance surface so that ML models participate in the Data Product lifecycle — discoverable, governed, compliant, and traceable from source data through deployment.

### Integration Architecture

```
ONTOS GOVERNANCE                         VITAL ML PIPELINE
─────────────────                        ──────────────────
DataProduct ◄───── data_product_id ───── ModelTrainingLineageDb
  OutputPort ◄── asset_type="ml_model" ─ (auto-created on model registration)
DataContract ◄──── data_contract_id ──── TrainingSheetDb
DataContract ◄── input/output_contract ── ModelTrainingLineageDb
Dataset ◄──────── dataset_id ──────────── TrainingSheetDb
CompliancePolicy ─── targets ───────────── ML models + training sheets
EntitySemanticLink ── entity_type ───────── sheet, template, training_sheet, model
TagAssociation ────── entity_type ───────── sheet, template, training_sheet, model
AssetReview ────────── entity_type ───────── training_sheet (pre-export review gate)
```

**Design principle**: All governance links are **opt-in** (nullable FKs). ML workflows function without governance, but gain traceability, compliance, and discoverability when linked.

### Schema Changes

| Table | New Column | FK Target | Purpose |
|-------|-----------|-----------|---------|
| `model_training_lineage` | `data_product_id` | `data_products.id` | Trained model published as Data Product |
| `model_training_lineage` | `input_contract_id` | `data_contracts.id` | Features schema contract |
| `model_training_lineage` | `output_contract_id` | `data_contracts.id` | Predictions schema contract |
| `training_sheets` | `data_contract_id` | `data_contracts.id` | Quality/schema spec for training data |
| `training_sheets` | `dataset_id` | `datasets.id` | Link to governed dataset |
| `endpoint_metrics` | `data_product_id` | (soft ref, no FK) | Link endpoint metrics to product |

### Backend Integration Hooks

4 cross-manager touchpoints:

1. **Model → Product bridge**: When `ModelTrainingLineageDb` is created with `data_product_id`, auto-create/update an `OutputPortDb` on the DataProduct with `asset_type="ml_model"`, `asset_identifier` = serving endpoint URL.

2. **Compliance targeting**: Extend compliance `ComplianceResultDb.object_type` vocabulary to include `training_sheet`, `ml_model`, `serving_endpoint`. ComplianceManager already supports generic object types — just needs ML entity discovery.

3. **Semantic link materialization**: Create `EntitySemanticLinkDb` rows for ML entities so they appear in the knowledge graph and are searchable.

4. **Export metadata**: When exporting training sheet JSONL, include `data_contract_id` in export metadata for traceability.

### Frontend Integration Points

| View | Integration | API Call |
|------|-------------|----------|
| `home.tsx` | ML metrics tiles (active jobs, deployed models) | `GET /api/ml-training-jobs/active`, `GET /api/ml-lineage?deployment_status=deployed` |
| `data-product-details.tsx` | "ML Models" tab showing associated models | `GET /api/ml-lineage?data_product_id={id}` |
| `ml-sheet-details.tsx` | Clickable Domain, Contract, Team badges | Use existing `domain_id`, new `data_contract_id` |
| `ml-curate.tsx` | Contract badge on training sheet row | Show `data_contract_id` if set |
| `ml-lineage.tsx` | Data Product + Contract columns | New fields from Pydantic model |
| `compliance.tsx` | ML assets in compliance results | Extended `object_type` vocabulary |

### Entity Type Expansion

Extend `EntitySemanticLinkDb.entity_type` and `EntityTagAssociationDb.entity_type` to include:
- `sheet`, `template`, `training_sheet`, `ml_model`

This enables ML entities to participate in Ontos's existing knowledge graph, tagging, and search infrastructure without any changes to those systems.
