# Gap Analysis: PRD v1 → v2

**Report Date:** January 30, 2026
**Current Codebase:** v1 (Initial commit)
**Target:** Training Dataset Workbench PRD v2

---

## Executive Summary

The current implementation has strong foundations in the 7-stage lifecycle and basic template management. However, **PRD v2 introduces three major new systems** that are either missing or only partially implemented:

| System | Status | Effort |
|--------|--------|--------|
| **DataBits v2** - Versioned atomic data units with rich metadata | MISSING | 3-4 weeks |
| **Example Store** - Managed few-shot learning with vector search | MISSING | 4-5 weeks |
| **DSPy Integration** - Direct optimization framework integration | MINIMAL | 3-4 weeks |

**Total Estimated Effort:** 12-14 weeks

---

## 1. Data Model Gaps

### 1.1 DataBits Model (CRITICAL - MISSING)

**Current:** Templates with basic schema, examples, model config

**PRD v2 Requirements:**
```
DataBit {
  databit_id: UUID
  version: INT                      # ❌ Missing
  content: VARIANT                  # ❌ Missing (uses fixed strings)
  modality: ARRAY<STRING>           # ❌ Missing

  attribution: STRUCT {
    creator, license, derived_from  # ❌ No DAG tracking
  }

  quality_scores: MAP<STRING, DOUBLE>  # ❌ Missing (single score only)
  search_keys: ARRAY<STRING>           # ❌ Missing
  embedding: ARRAY<DOUBLE>             # ❌ Missing
}
```

### 1.2 Example Store Model (CRITICAL - MISSING)

**Current:** Static examples hardcoded in template JSON

**PRD v2 Requirements:**
```
ExampleRecord {
  example_id: UUID
  input: VARIANT
  expected_output: VARIANT

  # Effectiveness tracking
  usage_count: INT                  # ❌ Missing
  effectiveness_score: DOUBLE      # ❌ Missing

  # Search
  embedding: ARRAY<DOUBLE>         # ❌ Missing
  function_name: STRING            # ❌ Missing
  domain: STRING                   # ❌ Missing
}
```

### 1.3 Attribution Model (PARTIAL)

**Current:** `bit_attribution`, `model_bits` tables exist with ablation/shapley support

**Gaps:**
- ❌ No `derived_from` DAG traversal
- ❌ No version-to-version attribution deltas
- ❌ No UI for exploring lineage

---

## 2. Service Layer Gaps

### 2.1 Example Store Service (CRITICAL - MISSING)

**New file needed:** `backend/app/services/example_store_service.py`

```python
class ExampleStoreService:
    # Lifecycle
    def create_example(input, output, databit_id) -> ExampleRecord
    def update_example(example_id, updates) -> ExampleRecord

    # Search (Vector Search integration)
    def search_by_embedding(embedding, k=10) -> List[ExampleRecord]
    def search_by_metadata(filters) -> List[ExampleRecord]

    # Effectiveness tracking
    def track_usage(example_id, training_run_id)
    def update_effectiveness_score(example_id, success_rate)
```

### 2.2 DSPy Integration Service (CRITICAL - MISSING)

**New file needed:** `backend/app/services/dspy_integration_service.py`

```python
class DSPyIntegrationService:
    def export_to_dspy_program(template_id) -> DSPyProgram
    def launch_optimization_run(program_id, training_data, metric) -> RunID
    def sync_optimization_results(run_id)  # Feedback loop
```

### 2.3 Embedding Service (MISSING)

**New file needed:** `backend/app/services/embedding_service.py`

```python
class EmbeddingService:
    def compute_embedding(text, model="bge-large-en-v1.5") -> List[float]
    def compute_embeddings_batch(texts) -> List[List[float]]
    def sync_to_vector_search(databit_id)
```

---

## 3. API Endpoint Gaps

### Missing Endpoints

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET/POST /api/v1/examples` | Example Store CRUD | CRITICAL |
| `POST /api/v1/examples/search` | Vector + metadata search | CRITICAL |
| `POST /api/v1/templates/{id}/export-dspy` | Export to DSPy | CRITICAL |
| `POST /api/v1/dspy-runs` | Launch optimization | CRITICAL |
| `GET /api/v1/templates/{id}/versions` | Version history | HIGH |
| `GET /api/v1/templates/{id}/lineage` | DAG traversal | HIGH |

---

## 4. Frontend UI Gaps

### Missing Pages

| Page | Components | Effort |
|------|------------|--------|
| **ExampleStorePage** | ExampleBrowser, ExampleEditor | 2-3 days |
| **DSPyOptimizationPage** | RunLauncher, ProgressMonitor, ResultsViewer | 3-4 days |
| **LineageViewerPage** | DAG visualization (D3/Cytoscape) | 2-3 days |

### Missing Components

- `ExampleBrowser.tsx` - Filterable table of examples
- `ExampleEditor.tsx` - Create/edit example pairs
- `OptimizationRunMonitor.tsx` - Real-time progress
- `AttributionExplorer.tsx` - DAG visualization
- `EffectivenessChart.tsx` - Example performance over time

---

## 5. Database Schema Gaps

### New Tables Required

```sql
-- Example Store
CREATE TABLE example_store (
  example_id STRING PRIMARY KEY,
  databit_id STRING,
  input STRING,
  expected_output STRING,
  embedding ARRAY<DOUBLE>,
  usage_count INT DEFAULT 0,
  effectiveness_score DOUBLE,
  created_at TIMESTAMP
);

-- DSPy Optimization
CREATE TABLE dspy_optimization_runs (
  run_id STRING PRIMARY KEY,
  template_id STRING,
  optimizer_type STRING,
  status STRING,
  best_metric_value DOUBLE,
  results STRING
);

-- DataBit Versions
CREATE TABLE databit_versions (
  databit_id STRING,
  version INT,
  content STRING,
  created_at TIMESTAMP
);
```

---

## 6. Notebook/Job Gaps

| Notebook | Status | Priority |
|----------|--------|----------|
| `notebooks/train/dspy_optimization.py` | MISSING | CRITICAL |
| `notebooks/data/embedding_generation.py` | Stub only | CRITICAL |
| `notebooks/curate/extract_examples.py` | MISSING | HIGH |

---

## 7. What's Already Good ✅

- 7-stage lifecycle architecture
- Template CRUD operations
- Curation queue with AI-assisted labeling
- Attribution method selection (ablation, shapley, influence)
- Job management and Databricks integration
- Frontend stage-based navigation
- Delta Lake storage with change data feed

---

## 8. Implementation Roadmap

### Phase 1: Core DataBits v2 + Example Store (5 weeks)
- Database schema extensions
- ExampleStoreService + API endpoints
- Vector Search integration
- Example Store UI

### Phase 2: DSPy Integration (4 weeks)
- DSPyIntegrationService
- Optimization run launcher UI
- Results viewer and feedback loop
- DSPy optimization notebook

### Phase 3: Enhanced Attribution (3 weeks)
- DAG implementation
- Lineage visualization
- Version delta computation

### Phase 4: Polish (2 weeks)
- Performance tuning
- Testing
- Documentation

---

## 9. Quick Wins (If Limited Time)

If you can only implement part of Phase 1:

1. **Example Store Service + API** (Week 1-2) - Highest ROI
2. **Vector Search Integration** (Week 2-3) - Foundation for discovery
3. **DSPy Export Only** (Week 3) - Enable external optimization
4. **Example Store UI** (Week 3-4) - Basic browser/editor

---

## 10. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vector Search sync complexity | HIGH | Change data feed tracking, scheduled sync |
| DSPy API changes | MEDIUM | Version lock, adapter layer |
| Performance at scale | MEDIUM | Proper indexing, pagination, caching |
