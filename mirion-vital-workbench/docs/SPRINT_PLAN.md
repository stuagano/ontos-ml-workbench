# Sprint Plan: PRD v2 Implementation

**Created:** January 30, 2026
**Duration:** 14 weeks (7 two-week sprints)
**Goal:** Implement Example Store, DSPy Integration, and Enhanced DataBits

---

## Overview

```
Sprint 1-2: Foundation (Example Store Data Layer)
Sprint 3-4: Example Store Service + API
Sprint 5:   Example Store UI
Sprint 6-7: DSPy Integration
Sprint 8:   Enhanced Attribution + Polish
```

---

## Sprint 1: Example Store Data Layer
**Duration:** 2 weeks

### Goals
- Define database schema for Example Store
- Create Pydantic models
- Set up Vector Search index configuration

### Tasks

#### Backend Data Models
| Task | File | Est. |
|------|------|------|
| Create ExampleRecord Pydantic model | `backend/app/models/example_store.py` | 2h |
| Create ExampleCreate/Update schemas | `backend/app/models/example_store.py` | 1h |
| Create ExampleSearchQuery model | `backend/app/models/example_store.py` | 1h |
| Create ExampleEffectiveness model | `backend/app/models/example_store.py` | 1h |

#### Database Schema
| Task | File | Est. |
|------|------|------|
| Add `example_store` table DDL | `schemas/example_store.sql` | 2h |
| Add `example_effectiveness_log` table | `schemas/example_store.sql` | 1h |
| Create migration script | `schemas/migrations/001_example_store.sql` | 1h |

#### Configuration
| Task | File | Est. |
|------|------|------|
| Add Vector Search index config | `databricks.yml` | 2h |
| Add embedding model env vars | `backend/.env.example` | 30m |
| Update app.yaml with new config | `app.yaml` | 30m |

### Deliverables
- [ ] `backend/app/models/example_store.py` with all Pydantic models
- [ ] `schemas/example_store.sql` with table definitions
- [ ] Updated `databricks.yml` with Vector Search resource
- [ ] Unit tests for models

### Definition of Done
- All models pass validation tests
- Schema can be deployed to Databricks
- Vector Search index config validated

---

## Sprint 2: Embedding Service + SQL Layer
**Duration:** 2 weeks

### Goals
- Implement embedding generation service
- Extend SQL service for example operations
- Create seed data for testing

### Tasks

#### Embedding Service
| Task | File | Est. |
|------|------|------|
| Create EmbeddingService class | `backend/app/services/embedding_service.py` | 4h |
| Implement `compute_embedding()` | `backend/app/services/embedding_service.py` | 2h |
| Implement `compute_embeddings_batch()` | `backend/app/services/embedding_service.py` | 2h |
| Add FMAPI integration for embeddings | `backend/app/services/embedding_service.py` | 3h |
| Add fallback to sentence-transformers | `backend/app/services/embedding_service.py` | 2h |

#### SQL Service Extensions
| Task | File | Est. |
|------|------|------|
| Add `create_example()` method | `backend/app/services/sql_service.py` | 2h |
| Add `get_example()` method | `backend/app/services/sql_service.py` | 1h |
| Add `update_example()` method | `backend/app/services/sql_service.py` | 1h |
| Add `delete_example()` method | `backend/app/services/sql_service.py` | 1h |
| Add `list_examples()` with filtering | `backend/app/services/sql_service.py` | 2h |
| Add `track_example_usage()` method | `backend/app/services/sql_service.py` | 1h |

#### Seed Data
| Task | File | Est. |
|------|------|------|
| Create example seed data for defect detection | `synthetic_data/examples/defect_detection.json` | 2h |
| Create example seed data for predictive maintenance | `synthetic_data/examples/predictive_maintenance.json` | 2h |
| Update seed script to load examples | `backend/scripts/seed_demo_data.py` | 2h |

#### Dependencies
| Task | File | Est. |
|------|------|------|
| Add `sentence-transformers` to requirements | `backend/requirements.txt` | 10m |
| Add `databricks-vectorsearch` to requirements | `backend/requirements.txt` | 10m |

### Deliverables
- [ ] `backend/app/services/embedding_service.py`
- [ ] Extended `sql_service.py` with example CRUD
- [ ] Seed data for 2 use cases (20+ examples each)
- [ ] Unit tests for embedding service

### Definition of Done
- Embeddings can be generated locally and via FMAPI
- Example CRUD operations work against Delta tables
- Seed data loads successfully

---

## Sprint 3: Example Store Service
**Duration:** 2 weeks

### Goals
- Implement core ExampleStoreService
- Add Vector Search integration
- Create retrieval logic

### Tasks

#### Core Service
| Task | File | Est. |
|------|------|------|
| Create ExampleStoreService class | `backend/app/services/example_store_service.py` | 2h |
| Implement `create_example()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `get_example()` | `backend/app/services/example_store_service.py` | 1h |
| Implement `update_example()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `delete_example()` | `backend/app/services/example_store_service.py` | 1h |
| Implement `list_examples()` | `backend/app/services/example_store_service.py` | 2h |

#### Vector Search Integration
| Task | File | Est. |
|------|------|------|
| Create VectorSearchService wrapper | `backend/app/services/vector_search_service.py` | 3h |
| Implement `search_by_embedding()` | `backend/app/services/example_store_service.py` | 3h |
| Implement `search_by_metadata()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `search_combined()` (hybrid) | `backend/app/services/example_store_service.py` | 3h |

#### Effectiveness Tracking
| Task | File | Est. |
|------|------|------|
| Implement `track_usage()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `update_effectiveness_score()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `get_top_examples()` | `backend/app/services/example_store_service.py` | 2h |

#### Batch Operations
| Task | File | Est. |
|------|------|------|
| Implement `bulk_create_examples()` | `backend/app/services/example_store_service.py` | 2h |
| Implement `sync_embeddings()` | `backend/app/services/example_store_service.py` | 2h |

### Deliverables
- [ ] `backend/app/services/example_store_service.py` (~400 lines)
- [ ] `backend/app/services/vector_search_service.py` (~150 lines)
- [ ] Integration tests with Vector Search
- [ ] Performance benchmarks for search

### Definition of Done
- All CRUD operations work end-to-end
- Vector search returns relevant results
- Effectiveness tracking updates correctly

---

## Sprint 4: Example Store API
**Duration:** 2 weeks

### Goals
- Create REST API endpoints for Example Store
- Add OpenAPI documentation
- Integration testing

### Tasks

#### API Endpoints
| Task | File | Est. |
|------|------|------|
| Create examples router | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Implement `GET /examples` (list) | `backend/app/api/v1/endpoints/examples.py` | 2h |
| Implement `POST /examples` (create) | `backend/app/api/v1/endpoints/examples.py` | 2h |
| Implement `GET /examples/{id}` | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Implement `PUT /examples/{id}` | `backend/app/api/v1/endpoints/examples.py` | 2h |
| Implement `DELETE /examples/{id}` | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Implement `POST /examples/search` | `backend/app/api/v1/endpoints/examples.py` | 3h |
| Implement `POST /examples/{id}/track` | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Implement `GET /examples/databit/{id}` | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Implement `POST /examples/batch` | `backend/app/api/v1/endpoints/examples.py` | 2h |

#### Router Registration
| Task | File | Est. |
|------|------|------|
| Register examples router in v1 | `backend/app/api/v1/__init__.py` | 30m |
| Add to main app | `backend/app/main.py` | 30m |

#### Documentation
| Task | File | Est. |
|------|------|------|
| Add OpenAPI tags and descriptions | `backend/app/api/v1/endpoints/examples.py` | 1h |
| Create example request/response docs | `docs/api/examples.md` | 2h |

#### Testing
| Task | File | Est. |
|------|------|------|
| Create API integration tests | `backend/tests/test_examples_api.py` | 4h |
| Test search functionality | `backend/tests/test_examples_api.py` | 2h |
| Test batch operations | `backend/tests/test_examples_api.py` | 2h |

### Deliverables
- [ ] `backend/app/api/v1/endpoints/examples.py` (~300 lines)
- [ ] Updated router registration
- [ ] API documentation
- [ ] Integration test suite

### Definition of Done
- All endpoints return correct responses
- OpenAPI docs render correctly
- Tests pass with >80% coverage

---

## Sprint 5: Example Store UI
**Duration:** 2 weeks

### Goals
- Create Example Store browser page
- Build example editor component
- Add search and filtering

### Tasks

#### Types & API Client
| Task | File | Est. |
|------|------|------|
| Add Example types to TypeScript | `frontend/src/types/index.ts` | 1h |
| Add example API methods | `frontend/src/services/api.ts` | 2h |

#### Example Store Page
| Task | File | Est. |
|------|------|------|
| Create ExampleStorePage component | `frontend/src/pages/ExampleStorePage.tsx` | 4h |
| Add routing for /examples | `frontend/src/App.tsx` | 30m |
| Add navigation link | `frontend/src/components/Sidebar.tsx` | 30m |

#### Components
| Task | File | Est. |
|------|------|------|
| Create ExampleBrowser component | `frontend/src/components/ExampleBrowser.tsx` | 4h |
| Create ExampleEditor modal | `frontend/src/components/ExampleEditor.tsx` | 4h |
| Create ExampleCard component | `frontend/src/components/ExampleCard.tsx` | 2h |
| Create ExampleSearchBar component | `frontend/src/components/ExampleSearchBar.tsx` | 2h |
| Create EffectivenessIndicator | `frontend/src/components/EffectivenessIndicator.tsx` | 1h |

#### Features
| Task | File | Est. |
|------|------|------|
| Add filtering by databit | `frontend/src/pages/ExampleStorePage.tsx` | 2h |
| Add filtering by domain/function | `frontend/src/pages/ExampleStorePage.tsx` | 2h |
| Add semantic search input | `frontend/src/pages/ExampleStorePage.tsx` | 3h |
| Add bulk selection/actions | `frontend/src/pages/ExampleStorePage.tsx` | 2h |
| Add effectiveness sorting | `frontend/src/pages/ExampleStorePage.tsx` | 1h |

#### Testing
| Task | File | Est. |
|------|------|------|
| Create component tests | `frontend/src/components/ExampleBrowser.test.tsx` | 3h |
| Create E2E tests | `frontend/e2e/examples.spec.ts` | 3h |

### Deliverables
- [ ] `frontend/src/pages/ExampleStorePage.tsx`
- [ ] 5 new components for example management
- [ ] Working search and filtering
- [ ] E2E test coverage

### Definition of Done
- Users can browse, create, edit, delete examples
- Search returns relevant results
- Effectiveness scores displayed correctly

---

## Sprint 6: DSPy Integration - Export
**Duration:** 2 weeks

### Goals
- Implement DSPy export service
- Create DSPy-compatible output formats
- Add export UI

### Tasks

#### DSPy Models
| Task | File | Est. |
|------|------|------|
| Create DSPySignature model | `backend/app/models/dspy_models.py` | 2h |
| Create DSPyProgram model | `backend/app/models/dspy_models.py` | 2h |
| Create DSPyOptimizationRun model | `backend/app/models/dspy_models.py` | 2h |
| Create DSPyExportResult model | `backend/app/models/dspy_models.py` | 1h |

#### Database
| Task | File | Est. |
|------|------|------|
| Add `dspy_runs` table DDL | `schemas/dspy.sql` | 2h |
| Add `dspy_trial_results` table | `schemas/dspy.sql` | 1h |

#### DSPy Integration Service
| Task | File | Est. |
|------|------|------|
| Create DSPyIntegrationService | `backend/app/services/dspy_integration_service.py` | 2h |
| Implement `export_to_dspy_signature()` | `backend/app/services/dspy_integration_service.py` | 3h |
| Implement `export_to_dspy_program()` | `backend/app/services/dspy_integration_service.py` | 4h |
| Implement `validate_signature()` | `backend/app/services/dspy_integration_service.py` | 2h |
| Implement `get_examples_for_optimizer()` | `backend/app/services/dspy_integration_service.py` | 2h |

#### API Endpoints
| Task | File | Est. |
|------|------|------|
| Create dspy router | `backend/app/api/v1/endpoints/dspy.py` | 1h |
| Implement `POST /templates/{id}/export-dspy` | `backend/app/api/v1/endpoints/dspy.py` | 2h |
| Implement `GET /templates/{id}/dspy-signature` | `backend/app/api/v1/endpoints/dspy.py` | 1h |

#### Frontend
| Task | File | Est. |
|------|------|------|
| Add DSPy types | `frontend/src/types/index.ts` | 1h |
| Add export API method | `frontend/src/services/api.ts` | 1h |
| Create ExportDSPyModal | `frontend/src/components/ExportDSPyModal.tsx` | 3h |
| Add export button to TemplatePage | `frontend/src/pages/TemplatePage.tsx` | 1h |

### Deliverables
- [ ] `backend/app/services/dspy_integration_service.py`
- [ ] DSPy export API endpoints
- [ ] Export modal in UI
- [ ] Generated DSPy code downloadable

### Definition of Done
- Templates export to valid DSPy signatures
- Examples included in export
- Export can be used directly with DSPy

---

## Sprint 7: DSPy Integration - Optimization
**Duration:** 2 weeks

### Goals
- Implement optimization run launcher
- Create progress monitoring
- Build feedback loop

### Tasks

#### Optimization Service
| Task | File | Est. |
|------|------|------|
| Implement `launch_optimization_run()` | `backend/app/services/dspy_integration_service.py` | 4h |
| Implement `get_run_status()` | `backend/app/services/dspy_integration_service.py` | 1h |
| Implement `cancel_run()` | `backend/app/services/dspy_integration_service.py` | 1h |
| Implement `get_run_results()` | `backend/app/services/dspy_integration_service.py` | 2h |

#### Feedback Loop
| Task | File | Est. |
|------|------|------|
| Implement `sync_optimization_results()` | `backend/app/services/dspy_integration_service.py` | 4h |
| Implement `update_example_effectiveness()` | `backend/app/services/dspy_integration_service.py` | 2h |
| Implement `create_version_from_optimization()` | `backend/app/services/dspy_integration_service.py` | 3h |

#### API Endpoints
| Task | File | Est. |
|------|------|------|
| Implement `POST /dspy-runs` | `backend/app/api/v1/endpoints/dspy.py` | 2h |
| Implement `GET /dspy-runs/{id}` | `backend/app/api/v1/endpoints/dspy.py` | 1h |
| Implement `POST /dspy-runs/{id}/cancel` | `backend/app/api/v1/endpoints/dspy.py` | 1h |
| Implement `GET /dspy-runs/{id}/results` | `backend/app/api/v1/endpoints/dspy.py` | 2h |
| Implement `POST /dspy-runs/{id}/sync` | `backend/app/api/v1/endpoints/dspy.py` | 2h |

#### Frontend
| Task | File | Est. |
|------|------|------|
| Create DSPyOptimizationPage | `frontend/src/pages/DSPyOptimizationPage.tsx` | 4h |
| Create OptimizationRunLauncher | `frontend/src/components/OptimizationRunLauncher.tsx` | 3h |
| Create OptimizationProgress | `frontend/src/components/OptimizationProgress.tsx` | 3h |
| Create OptimizationResults | `frontend/src/components/OptimizationResults.tsx` | 3h |

#### Notebook
| Task | File | Est. |
|------|------|------|
| Create DSPy optimization notebook | `notebooks/train/dspy_optimization.py` | 4h |
| Add job definition to DAB | `resources/jobs/dspy_optimization.yml` | 1h |

### Deliverables
- [ ] Optimization run launcher (backend + frontend)
- [ ] Progress monitoring UI
- [ ] Results viewer with accept/reject
- [ ] Feedback loop to Example Store

### Definition of Done
- Users can launch DSPy optimization from UI
- Progress updates in real-time
- Results sync back to Example Store

---

## Sprint 8: Enhanced Attribution + Polish
**Duration:** 2 weeks

### Goals
- Enhance attribution with DAG support
- Add lineage visualization
- Bug fixes and polish

### Tasks

#### Attribution Enhancements
| Task | File | Est. |
|------|------|------|
| Add `derived_from` to DataBit model | `backend/app/models/template.py` | 2h |
| Implement `get_lineage_dag()` | `backend/app/services/attribution_service.py` | 3h |
| Implement `trace_to_training_data()` | `backend/app/services/attribution_service.py` | 3h |

#### API
| Task | File | Est. |
|------|------|------|
| Add `GET /templates/{id}/lineage` | `backend/app/api/v1/endpoints/templates.py` | 2h |
| Add `GET /templates/{id}/attribution` | `backend/app/api/v1/endpoints/templates.py` | 2h |

#### Frontend Visualization
| Task | File | Est. |
|------|------|------|
| Create LineageViewer component | `frontend/src/components/LineageViewer.tsx` | 4h |
| Add lineage tab to TemplatePage | `frontend/src/pages/TemplatePage.tsx` | 2h |
| Create AttributionExplorer | `frontend/src/components/AttributionExplorer.tsx` | 4h |

#### Polish
| Task | File | Est. |
|------|------|------|
| Fix bugs from testing | Various | 4h |
| Performance optimization | Various | 3h |
| Update documentation | `docs/*` | 3h |
| Update CLAUDE.md | `CLAUDE.md` | 1h |

#### Testing
| Task | File | Est. |
|------|------|------|
| End-to-end integration tests | `frontend/e2e/*` | 4h |
| Load testing for Vector Search | `backend/tests/load/*` | 3h |

### Deliverables
- [ ] Lineage DAG visualization
- [ ] Attribution explorer
- [ ] All bugs fixed
- [ ] Updated documentation

### Definition of Done
- Full lineage visible in UI
- All E2E tests passing
- Documentation complete

---

## Summary

### Total New Files

| Layer | Files | Lines (Est.) |
|-------|-------|--------------|
| Backend Models | 2 | ~300 |
| Backend Services | 4 | ~1,000 |
| Backend API | 2 | ~400 |
| Frontend Pages | 2 | ~600 |
| Frontend Components | 12 | ~1,500 |
| Database | 2 | ~150 |
| Notebooks | 1 | ~200 |
| **Total** | **25** | **~4,150** |

### Dependencies Between Sprints

```
Sprint 1 (Data Models) ─────┐
                            ├──▶ Sprint 3 (Service)
Sprint 2 (Embedding/SQL) ───┘
                                      │
                                      ▼
                              Sprint 4 (API)
                                      │
                                      ▼
                              Sprint 5 (UI)
                                      │
Sprint 6 (DSPy Export) ◀──────────────┤
         │                            │
         ▼                            │
Sprint 7 (DSPy Optimization) ◀────────┘
         │
         ▼
Sprint 8 (Attribution + Polish)
```

### Risk Mitigation Checkpoints

| Sprint | Checkpoint |
|--------|------------|
| After Sprint 2 | Embeddings working? Vector Search configured? |
| After Sprint 4 | API stable? Performance acceptable? |
| After Sprint 5 | UI usable? User feedback positive? |
| After Sprint 7 | DSPy integration working end-to-end? |

### Quick Wins If Time-Constrained

If you only have 4-6 weeks:
1. **Sprint 1-2:** Foundation (required)
2. **Sprint 3-4:** Example Store Service + API (core value)
3. **Sprint 5:** Basic UI (minimum viable)

Skip Sprint 6-8 for later iteration.
