# Ontos ML Workbench - Project Status

**Last Updated:** February 24, 2026
**PRD Version:** 2.3
**Overall Progress:** ~90% backend, ~80% frontend (ML Pipeline); Ontos Governance G1–G15 complete; Lineage Graph (4 phases) complete

> This is the single source of truth for implementation status. It replaces the stale
> `GAP_ANALYSIS_V2.md`, `SPRINT_PLAN.md`, `BACKLOG.md`, and `prd/v2.3-implementation-status.md`.
>
> **New:** See [Ontos Governance Platform — Gap Analysis](#ontos-governance-platform--gap-analysis)
> for features from the Ontos User Guide that are not yet in the ML Workbench.

---

## How to Read This Document

- **DONE** = Fully implemented, API + UI wired end-to-end
- **BACKEND ONLY** = API endpoint exists and works, but no frontend UI calls it
- **PARTIAL** = Some parts built, key functionality still missing
- **SCAFFOLD** = Page/component exists but uses placeholder or simulated data
- **NOT STARTED** = No code exists

---

## Stage-by-Stage Status

### Stage 1: DATA (SheetBuilder) — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| Browse Unity Catalog (catalogs, schemas, tables, volumes) | DONE | `UCBrowser` component, backend UC endpoints |
| Create Sheet (dataset pointer) | DONE | `SheetBuilder.tsx` create mode, `POST /sheets` |
| Import columns from base/secondary tables | DONE | `addColumn` API, column header UI |
| Delete columns | DONE | `deleteColumn` wired to `ColumnHeader` trash icon |
| Sheet preview (rows from UC source) | DONE | `getSheetPreview` API |
| Sheet CRUD (list, update, delete) | DONE | Browse mode with DataTable |
| Publish / Archive / Delete lifecycle | DONE | Status-aware row actions (just wired) |
| Attach template to sheet | DONE | Template selection + column mapping modal |
| Detach template from sheet | DONE | "Detach" button on template indicator (just wired) |
| Generate training sheet (create Q&A pairs) | DONE | `generateTrainingSheet` API, triggers Training Sheet creation |
| Export to Delta | DONE | `exportSheet` API |
| Data Quality (DQX) inline panel | DONE | `DataQualityPanel` component in sheet detail view |
| Multimodal data fusion (images + sensor + metadata) | DONE | Columns support text, image, metadata categories |
| Join multiple data sources | DONE | Full end-to-end: suggest-join-keys + preview-join backend, JoinConfigPanel + staging workflow in SheetBuilder |

### Stage 2: GENERATE (SheetBuilder + CuratePage) — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| Select Sheet + Template → generate Training Sheet | DONE | Generate flow in SheetBuilder |
| AI inference for response generation (FMAPI) | DONE | `POST /training-sheets/{id}/generate`, `InferenceService` |
| Training Sheet browse / preview Q&A pairs | DONE | `CuratePage.tsx` browse + detail modes |
| Column mapping (template variables → sheet columns) | DONE | `ColumnMappingModal` with Jinja2 placeholder extraction |
| Canonical label lookup during generation | DONE | Coverage stats shown in SheetBuilder before generation |

### Stage 3: LABEL — DONE (Mode A); PARTIAL (Mode B)

| Feature | Status | Notes |
|---------|--------|-------|
| **Mode A: Training Sheet Review** | | |
| Review Q&A pairs (approve/edit/reject/flag) | DONE | `CuratePage.tsx` detail mode with inline editing |
| AI-assisted generation for blank responses | DONE | Generate mutation in CuratePage |
| Export approved Training Sheets (JSONL) | DONE | `POST /training-sheets/{id}/export` (openai_chat / anthropic / gemini formats) |
| **Mode B: Canonical Labeling Tool** | | |
| Browse sheets and label source items | DONE | `CanonicalLabelingTool.tsx` in sidebar |
| Create / edit canonical labels | DONE | Full CRUD wired to 13 backend endpoints |
| Multiple labelsets per item | DONE | Composite key `(sheet_id, item_ref, label_type)` |
| Label confidence + usage constraints | DONE | Backend model supports it |
| Version history | DONE | `LabelVersionHistory.tsx` panel in CuratePage detail view |
| **Labeling Jobs (annotation workflow)** | | |
| Create / manage labeling jobs | DONE | `LabelingJobsPage.tsx` — create, start, pause, resume, delete |
| Task assignment + progress tracking | DONE | 30+ backend endpoints for full workflow |
| Task board view | DONE | `LabelingWorkflow` orchestrator wired into both `AppWithSidebar` and `LabelingModule` |
| **Label Sets** | | |
| Browse / create / manage label sets | DONE | `LabelSetsPage.tsx` with full CRUD |
| Publish / archive lifecycle | DONE | Status-aware row actions |

### Stage 4: TRAIN — DONE (except evaluation)

| Feature | Status | Notes |
|---------|--------|-------|
| Browse Training Sheets for training | DONE | `TrainPage.tsx` lists training sheets |
| Configure and submit FMAPI training job | DONE | `TrainingJobCreateForm` → `createTrainingJob` API → `TrainingService` |
| Monitor training job progress | DONE | `TrainingJobDetail` with auto-polling, events, metrics |
| Dual quality gates (status + governance) | DONE | Export filters by status + usage constraints |
| Model evaluation (MLflow Evaluate) | DONE | `POST /training/jobs/{id}/evaluate`, `GET /training/jobs/{id}/evaluation`, Evaluate tab in TrainingJobDetail |
| Compare model versions A/B | DONE | `GET /training/compare/{model_name}?version_a=X&version_b=Y` |
| Lineage recording | DONE | `model_training_lineage` table + API |

### Stage 5: DEPLOY — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| List UC models and versions | DONE | `DeployPage.tsx` model browser |
| Create serving endpoint | DONE | Deploy mutation, full Databricks SDK integration |
| Endpoint playground (query endpoint) | DONE | Query panel with JSON editor |
| List / manage serving endpoints | DONE | Endpoint table with status |
| Rollback to previous version | DONE | "Rollback Version" row action in DeployPage |
| Registries (Tools/Agents/Endpoints) | DONE | `RegistriesPage.tsx` — tabbed CRUD admin (just built) |
| Guardrails configuration | DONE | `GuardrailsPanel` component, GET+PUT `/deployment/endpoints/{name}/guardrails`, Databricks AI Gateway SDK integration |

### Stage 6: MONITOR — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| Endpoint performance metrics | DONE | `MonitorPage.tsx` queries real feedback data |
| Real-time metrics (latency, errors) | DONE | `endpoint_metrics` table + ingestion endpoints + timeseries API; falls back to feedback-derived when empty |
| Drift detection | DONE | Multi-feature analysis: latency, error rate, token count (from endpoint_metrics) + feedback rating. Per-feature breakdown in UI. |
| Alert management (create/ack/resolve) | DONE | Full alert CRUD wired in MonitorPage |
| Health dashboard | DONE | Combined health score endpoint |

### Stage 7: IMPROVE — DONE

| Feature | Status | Notes |
|---------|--------|-------|
| User feedback capture (thumbs up/down) | DONE | `ImprovePage.tsx` + `POST /feedback` |
| Feedback stats and trends | DONE | Stats endpoint wired to UI |
| Convert feedback to training data | DONE | `POST /feedback/{id}/to-training` wired |
| Gap analysis | DONE | Real SQL queries against feedback_items, endpoints_registry, qa_pairs, model_evaluations; simulated fallback only when tables missing |
| Annotation task creation from gaps | DONE | `POST /gaps/{id}/task` creates tasks; `GET /gaps/tasks` queries `annotation_tasks` table |
| Trigger retraining | DONE | "Trigger Retrain" modal in ImprovePage — select training sheet + model name, calls createTrainingJob. "Create Annotation Task" button on gap cards. |

---

## TOOLS Section Status

| Tool | Sidebar | Page | API Wired | Mutations | Status |
|------|---------|------|-----------|-----------|--------|
| Prompt Templates | Yes | `TemplatePage.tsx` (518 lines) | Yes | Publish, Archive, Delete, **Create Version** | DONE |
| Example Store | Yes | `ExampleStorePage.tsx` (690 lines) | Yes | Delete, **Copy+Track**, **Regen Embeddings** | DONE |
| DSPy Optimizer | Yes | `DSPyOptimizationPage.tsx` (729 lines) | Yes | Export, Create Run, Cancel, Sync Results | DONE |
| Canonical Labeling | Yes | `CanonicalLabelingTool.tsx` | Yes | Full CRUD | DONE |
| Data Quality (DQX) | Yes | `DataQualityPage.tsx` (~400 lines) | Yes | Profile, AI Generate Rules, Run Checks, Export Report | DONE — standalone page with sheet picker + history; module inspector also wired to real endpoints |
| Labeling Jobs | Yes | `LabelingJobsPage.tsx` (1099 lines) | Yes | Create, Start, Pause, Resume, Delete | DONE |
| Label Sets | Yes | `LabelSetsPage.tsx` (619 lines) | Yes | Full CRUD + Publish/Archive | DONE |
| Registries | Yes | `RegistriesPage.tsx` (1050 lines) | Yes | Full CRUD for Tools/Agents/Endpoints | DONE |
| Governance | Yes (Admin) | `GovernancePage.tsx` (~5400 lines) | Yes | Roles, teams, domains, projects, contracts, policies, workflows, data products, semantic models, naming conventions, delivery modes, MCP integration, connectors (13 tabs) | DONE |
| Marketplace | Yes (Tools) | `MarketplacePage.tsx` (~500 lines) | Yes | Search, filter, detail, subscribe to published data products | DONE |
| Example Effectiveness | No sidebar entry | `ExampleEffectivenessDashboard.tsx` (548 lines) | Yes (read) | None | DONE (read-only dashboard, embedded in Example Store module) |

---

## Module Registry

8 modules registered in `frontend/src/modules/registry.ts`:

| Module | ID | Stage | Category | Status |
|--------|----|-------|----------|--------|
| DSPy | `dspy` | train | training | Enabled |
| Data Quality | `data-quality` | data | quality | Enabled |
| Example Store | `example-store` | train | training | Enabled |
| Labeling | `labeling` | label | labeling | Enabled |
| Label Sets | `label-sets` | label | labeling | Enabled |
| Canonical Labels | `canonical-labels` | label | labeling | Enabled |
| Quality Gate | `quality-gate` | train | quality | Enabled |
| Registries | `registries` | deploy | deployment | Enabled |

---

## Backend API Coverage

**20 routers** registered under `/api/v1`. ~175+ endpoints total.

| Router | Endpoints | Status |
|--------|-----------|--------|
| Sheets | 9 | Fully implemented |
| Training Sheets | 8 | Fully implemented |
| Templates | 8 | Fully implemented |
| Canonical Labels | 13 | Fully implemented |
| Labelsets | 9 | Fully implemented |
| Curated Datasets | 11 | Fully implemented |
| Curation | 7 | Fully implemented |
| Labeling Workflow | 31 | Fully implemented |
| Example Store | 12 | Fully implemented |
| DSPy | 10 | Fully implemented |
| Training | 12 | Fully implemented (includes 3 evaluation endpoints) |
| Deployment | 15 | Fully implemented (+ guardrails GET/PUT) |
| Monitoring | 14 | Fully implemented (+ metrics ingestion, timeseries, batch ingest) |
| Feedback | 10 | Fully implemented |
| Registries | 15 | Fully implemented |
| Unity Catalog | 6 | Fully implemented |
| Gap Analysis | 10 | Fully implemented — real queries + CRUD + annotation tasks |
| Attribution | 7 | Fully implemented — fixed `settings.get_table()` + `execute_sql()` result handling + DDL |
| Agents | 3 | Fully implemented |
| Settings/Admin | 7 | Fully implemented |
| Data Quality (DQX) | 4 | Fully implemented — results persisted to `dqx_quality_results` table |
| Governance | 109 | Fully implemented — RBAC roles, user assignments, teams, team members, domains, domain tree, reviews, projects, contracts, policies, evaluations, workflows, executions, data products, ports, subscriptions, semantic models, concepts, properties, links, naming conventions (CRUD + validate + toggle), marketplace (search + stats + detail + subscriptions), lineage materialization (full + incremental), lineage graph (full + per-entity), graph traversal (upstream/downstream), impact analysis, path finding, entity context |
| Auth Core | 0 (middleware) | `get_current_user`, `require_permission`, `require_role` dependencies; `enforce_auth=false` default |
| Quality Proxy | 1 | Fully implemented |

---

## Known Issues

~~1. **Gap analysis is simulated**~~ — FIXED. `gap_analysis_service.py` now uses real SQL queries against `feedback_items`, `endpoints_registry`, `qa_pairs`, `model_evaluations`. Simulated data kept as fallback only when tables don't exist. DDL added for `identified_gaps` and `annotation_tasks`.

~~2. **Data quality results stub**~~ — FIXED. `run_checks()` now persists results to `dqx_quality_results` table. `get_results()` queries the table and returns historical runs.

3. ~~**Schema references stale**~~ — FIXED. `canonical_labels.py`, `feedback.py`, `training_service.py`, and `settings.py` now use `training_sheets`/`qa_pairs`.

~~4. **TrainPage is read-only**~~ — FIXED. `TrainingJobCreateForm`, `TrainingJobList`, and `TrainingJobDetail` components fully wire create, poll, cancel, metrics, events, and lineage endpoints.

~~6. **Labeling table schemas not in DDL**~~ — FIXED. DDL files `09_labeling_jobs.sql` through `12_workspace_users.sql` added to `schemas/`.

7. **Auth enforcement opt-in** — RBAC auth dependencies wired on governance (all mutations), sheets (5), templates (6), training (4), deployment (7), monitoring (6), feedback (5), and registries (9) — ~50+ mutation endpoints total. `enforce_auth=false` by default (soft mode: logs warnings but allows through). Set `ENFORCE_AUTH=true` in `.env` to activate 403 blocking. Read-only endpoints remain open.

---

## Remaining Work (Priority Order)

### P0: Critical Gaps

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| ~~1~~ | ~~**Train Page — job creation UI**~~ | ~~DONE — `TrainingJobCreateForm`, `TrainingJobList`, `TrainingJobDetail` components fully wired to all 9 training endpoints~~ | ~~M~~ |
| ~~2~~ | ~~**Fix stale schema references**~~ | ~~DONE — `canonical_labels.py`, `feedback.py`, `training_service.py`, `settings.py` updated~~ | ~~S~~ |
| ~~2~~ | ~~**Gap analysis — real implementation**~~ | ~~DONE — Real SQL queries against feedback_items, endpoints_registry, qa_pairs, model_evaluations. DDL for identified_gaps + annotation_tasks.~~ | ~~L~~ |

### P1: High Value

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| ~~4~~ | ~~**Canonical label lookup status in GENERATE**~~ | ~~DONE — Coverage % banner in SheetBuilder using `getCanonicalLabelStats`~~ | ~~S~~ |
| ~~5~~ | ~~**Deploy — rollback UI**~~ | ~~DONE — `rollbackDeployment` API function + "Rollback Version" row action in DeployPage~~ | ~~XS~~ |
| ~~6~~ | ~~**Deploy — guardrails**~~ | ~~DONE — `GuardrailsPanel` slide-out drawer with safety, PII, keywords, topics, rate limits. Backend uses `put_ai_gateway()` SDK.~~ | ~~L~~ |
| ~~7~~ | ~~**Monitor — dedicated metrics ingestion**~~ | ~~DONE — `endpoint_metrics` DDL, `POST /monitoring/metrics/ingest` + batch, `GET /monitoring/metrics/timeseries/{id}`, performance endpoint now returns real latencies.~~ | ~~M~~ |
| ~~8~~ | ~~**Canonical label version history UI**~~ | ~~DONE — `LabelVersionHistory.tsx` expandable panel wired into CuratePage detail view~~ | ~~S~~ |
| ~~9~~ | ~~**Agent Framework hook**~~ | ~~DONE (code) — `AgentRetrieverService` + 3 agent endpoints + Registries CRUD all implemented. Only documentation missing.~~ | ~~M~~ |
| ~~10~~ | ~~**Labeling schema DDL**~~ | ~~DONE — `09_labeling_jobs.sql`, `10_labeling_tasks.sql`, `11_labeled_items.sql`, `12_workspace_users.sql`~~ | ~~S~~ |

### P2: Nice to Have (PRD)

| # | Feature | What's Missing | Effort |
|---|---------|----------------|--------|
| ~~11~~ | ~~**Lineage DAG visualization**~~ | ~~DONE — `LineageDAG.tsx` SVG component in TrainingJobDetail Lineage tab. Shows Sheet→Template→Training Sheet→Model with canonical label branches.~~ | ~~L~~ |
| ~~12~~ | ~~**Model evaluation harness**~~ | ~~DONE — `evaluation_service.py` + 3 endpoints + `model_evaluations` DDL + Evaluate tab in TrainingJobDetail~~ | ~~L~~ |
| 13 | **Synthetic data generation** | PRD P2. No backend or frontend. | L |
| 14 | **Active learning** | PRD P2. No model-in-the-loop sampling. | L |
| 15 | **Image annotation tools** | PRD P2. Bounding box / polygon labeling for vision use cases. | L |
| ~~16~~ | ~~**Data Quality results persistence**~~ | ~~DONE — `run_checks()` persists to `dqx_quality_results` table, `get_results()` queries history~~ | ~~S~~ |
| ~~17~~ | ~~**Task board view for labeling**~~ | ~~DONE — `LabelingWorkflow` orchestrator wired into `AppWithSidebar` + `LabelingModule`~~ | ~~M~~ |

---

## Ontos Governance Platform — Gap Analysis

> Compared against [Ontos User Guide](https://github.com/databrickslabs/ontos/blob/main/src/docs/USER-GUIDE.md).
> The ML Workbench currently runs independently of Ontos governance. These items represent
> features from the Ontos platform that would need to be integrated or replicated.

### G-P0: Required for Governance Integration

These features are prerequisites for the ML Workbench to participate in an Ontos-governed data ecosystem.

| # | Feature | Description | What We Have | What's Missing | Effort |
|---|---------|-------------|-------------|----------------|--------|
| ~~G1~~ | ~~**RBAC Roles & Permissions**~~ | ~~6-role system with per-feature permission levels. Auth middleware with soft/hard enforcement.~~ | ~~DONE — `auth.py` (get_current_user, require_permission, require_role), 6 default roles with 11-feature permission matrix, user assignment CRUD, `enforce_auth` toggle. DDL: `19_app_roles.sql`, `20_user_role_assignments.sql`, `24_seed_default_roles.sql`. UI: Roles tab in GovernancePage.~~ | ~~Enforce auth on individual endpoints (opt-in per route).~~ | ~~L~~ |
| ~~G2~~ | ~~**Teams**~~ | ~~User collections with role assignments, domain association, leads.~~ | ~~DONE — Teams CRUD + member management with role overrides + tools metadata. DDL: `21_teams.sql` (with `metadata` JSON column), `22_team_members.sql`. UI: Teams tab with detail view, member add/remove, tools tag management.~~ | ~~None — team metadata (tools) implemented.~~ | ~~M~~ |
| ~~G3~~ | ~~**Domains**~~ | ~~Hierarchical business area groupings (parent-child). Ownership boundaries.~~ | ~~DONE — Domains CRUD + tree hierarchy. DDL: `23_data_domains.sql`. UI: Domains tab with tree view + create form + color picker.~~ | ~~Domain→asset association (domain_id on sheets/templates).~~ | ~~M~~ |
| ~~G4~~ | ~~**Asset Review Workflow**~~ | ~~Steward review/approval process for data assets. Review history tracking.~~ | ~~DONE — Generalized review system for any asset type (sheet, template, training_sheet). DDL: `26_asset_reviews.sql`. Backend: 7 API endpoints (list, get, request, assign, decide, delete) with filter support. UI: `ReviewPanel` component embedded in SheetBuilder, CuratePage, and TemplatePage. Workflow: request → assign reviewer → approve/reject/changes_requested.~~ | ~~AI-assisted review suggestions. Approval gating on publish/deploy actions.~~ | ~~L~~ |

### G-P1: High Value Governance Features

Features that make the ML Workbench enterprise-grade for regulated environments (radiation safety).

| # | Feature | Description | What We Have | What's Missing | Effort |
|---|---------|-------------|-------------|----------------|--------|
| ~~G5~~ | ~~**Data Contracts (ODCS v3.0.2)**~~ | ~~Schema specifications with quality guarantees, SLOs, lifecycle management.~~ | ~~DONE — Data contract entity with schema definitions, quality SLO rules, usage terms, lifecycle (draft→active→deprecated→retired). DDL: `29_data_contracts.sql`. Backend: 7 API endpoints (list, create, get, update, transition status, delete) with domain join + status filtering. UI: Contracts tab in GovernancePage with schema column editor, SLO rule builder, usage terms, lifecycle transition buttons.~~ | ~~ODCS YAML import/export. Contract validation against live data.~~ | ~~L~~ |
| ~~G6~~ | ~~**Compliance Policies (DSL)**~~ | ~~SQL-like DSL for governance rules. Check across catalogs/schemas/tables. Scheduled + on-demand runs.~~ | ~~DONE — Compliance policy engine with structured rule conditions (field/operator/value/message), categories (data_quality, access_control, retention, naming, lineage), severity levels, enable/disable toggle, on-demand evaluation with results tracking. DDL: `30_compliance_policies.sql` (policies + evaluations). Backend: 8 API endpoints. UI: Policies tab in GovernancePage with rule editor, evaluation runner, results display.~~ | ~~Scheduled execution via Databricks Jobs. UC metadata integration for live validation. Policy violation notifications.~~ | ~~L~~ |
| ~~G7~~ | ~~**Process Workflows**~~ | ~~Event-driven automation with triggers, entity types, steps. Blocking/non-blocking execution. Approval pausing for human-in-the-loop.~~ | ~~DONE — Workflow engine with 5 trigger types (manual, on_create, on_update, on_review, scheduled), 4 step types (action, approval, notification, condition), 8 built-in actions, execution lifecycle (running/paused/completed/failed/cancelled), step result tracking. DDL: `31_workflows.sql` (workflows + workflow_executions). Backend: 10 API endpoints. UI: Workflows tab with visual step editor, execution history, activate/disable/run controls.~~ | ~~Visual drag-and-drop designer. Scheduled trigger integration with Databricks Jobs.~~ | ~~L~~ |
| ~~G8~~ | ~~**Projects**~~ | ~~Workspace containers for team initiatives. Personal vs. Team types.~~ | ~~DONE — Projects CRUD + member management with roles (owner/admin/member/viewer). DDL: `27_projects.sql`, `28_project_members.sql`. Backend: 8 API endpoints. UI: Projects tab in GovernancePage with detail view + member management. Auto-adds creator as owner. Team association support.~~ | ~~Asset↔project scoping (project_id on sheets/templates/training_sheets). Project-level permissions.~~ | ~~M~~ |

### G-P2: Advanced Governance

Features for mature data governance organizations.

| # | Feature | Description | What We Have | What's Missing | Effort |
|---|---------|-------------|-------------|----------------|--------|
| ~~G9~~ | ~~**Data Products**~~ | ~~Curated asset collections (Source, Source-Aligned, Aggregate, Consumer-Aligned). Input/Output ports. Marketplace publishing, subscriptions.~~ | ~~DONE — Data product entity with 4 product types, input/output ports with entity linking, subscription system with approve/reject/revoke lifecycle. DDL: `32_data_products.sql` (data_products + data_product_ports + data_product_subscriptions). Backend: 15 API endpoints (CRUD, status transitions, port management, subscription workflow). UI: Products tab in GovernancePage with type/status filters, port editor (input/output with entity type), tag management, subscription panel with approve/reject/revoke actions, lifecycle buttons (Publish/Deprecate/Retire).~~ | ~~Full marketplace search/discovery. Cross-product lineage visualization.~~ | ~~L~~ |
| ~~G10~~ | ~~**Semantic Models**~~ | ~~Knowledge graphs connecting technical assets to business concepts. Business Concepts, Business Properties, three-tier semantic linking.~~ | ~~DONE — Semantic model entity with concepts (entity/event/metric/dimension), business properties (typed, with required/enum support), and semantic links (maps_to/derived_from/aggregates/represents + 14 lineage types) connecting concepts to data assets (table/column/sheet/contract/product). DDL: `33_semantic_models.sql` (4 tables). Backend: 16 API endpoints + 8 lineage/graph endpoints. UI: Semantic tab in GovernancePage with concept editor, property builder, link editor, ReactFlow graph visualization (dual-mode: Business Concepts + Data Lineage), dagre layout.~~ | ~~RDF/RDFS export.~~ | ~~L~~ |
| ~~G11~~ | ~~**MCP Integration**~~ | ~~Model Context Protocol for AI assistant access. Token management, scoped access (read/write/special), tool discovery.~~ | ~~DONE — MCP token management (create with SHA-256 hashing, revoke, delete), scoped access (read/read_write/admin), tool registry (11 seeded tools mapping to workbench API, including 3 lineage graph tools), invocation audit log. DDL: `36_mcp_integration.sql` (3 tables: mcp_tokens, mcp_tools, mcp_invocations). Backend: 14 API endpoints + FastMCP server with traverse_lineage, impact_analysis, find_related_assets tools + workbench://lineage-graph resource. UI: MCP tab in GovernancePage with 3 sub-views (Tokens, Tools, Audit Log), stats overview, token creation with one-time value reveal, tool registration with category/scope/endpoint.~~ | ~~Token-based auth middleware.~~ | ~~L~~ |
| ~~G12~~ | ~~**Delivery Modes**~~ | ~~Direct (immediate), Indirect (GitOps), Manual deployment. Git repository setup, YAML configs, version control integration.~~ | ~~DONE — 3 delivery mode types (direct/indirect/manual) with per-mode configuration: Git repo/branch/path for indirect, manual instructions for manual, environment targeting (dev/staging/production), approval requirements with role gating. Delivery record tracking with status lifecycle (pending→approved→in_progress→completed/failed/rejected). DDL: `35_delivery_modes.sql` (2 tables + 3 seeded modes). Backend: 8 API endpoints (mode CRUD + record CRUD + status transitions). UI: Delivery tab in GovernancePage with mode cards, create form with type-specific fields, delivery records table with approve/reject/start/complete actions.~~ | ~~Actual Git push integration. YAML config generation. Scheduled deployment support.~~ | ~~M~~ |
| ~~G13~~ | ~~**Multi-Platform Connectors**~~ | ~~Pluggable platform adapters (Unity Catalog, Snowflake, Kafka, Power BI). Unified governance across platforms.~~ | ~~DONE — Platform connector management (6 platform types: Unity Catalog, Snowflake, Kafka, Power BI, S3, Custom), connection testing, asset discovery, sync operations with bidirectional/inbound/outbound support. DDL: `37_platform_connectors.sql` (3 tables: platform_connectors, connector_assets, connector_sync_records + 1 seeded UC connector). Backend: 9 API endpoints (connector CRUD, test, assets, sync, sync records, stats). UI: Connectors tab in GovernancePage with platform badges, test/sync actions, asset list panel, sync history.~~ | ~~Actual platform SDK adapters (Snowflake connector, Kafka connector). Real asset discovery.~~ | ~~L~~ |
| ~~G14~~ | ~~**Dataset Marketplace**~~ | ~~Publishing datasets for discovery, subscriptions, access requests.~~ | ~~DONE — Marketplace search/discovery with full-text search, faceted filtering (product type, domain, team, tags), paginated results, overview stats. Backend: 4 API endpoints (`/marketplace/search`, `/marketplace/stats`, `/marketplace/products/{id}`, `/marketplace/my-subscriptions`). Frontend: standalone `MarketplacePage.tsx` with card-based product catalog, filter sidebar with facet counts, product detail with ports display, subscription request form. Sidebar entry in Tools section.~~ | ~~Usage analytics. Product recommendations. Cross-product lineage visualization.~~ | ~~M~~ |
| ~~G15~~ | ~~**Naming Conventions**~~ | ~~Enforced naming rules per entity type. Validation on create/update.~~ | ~~DONE — Naming convention CRUD (create, update, delete, toggle enable/disable), per-entity-type regex patterns with priority, live validation endpoint (`POST /governance/naming/validate`), 6 seeded default conventions for radiation safety domain. DDL: `34_naming_conventions.sql`. Backend: 8 API endpoints. UI: Naming tab in GovernancePage with grouped convention list, create form, inline toggle, and interactive Name Validator panel.~~ | ~~None.~~ | ~~S~~ |

### Implementation Strategy

**Phase 1 — Foundation (G1–G3): DONE.** RBAC + Teams + Domains. 6 DDL files, auth core (`auth.py`), governance service (23 endpoints), GovernancePage with 3 tabs. `enforce_auth=false` default preserves existing functionality.

**Phase 2 — Governance Core (G4–G6):** All DONE. G4 (Asset Review), G5 (Data Contracts), G6 (Compliance Policies) complete. Asset review gives the ML pipeline a governance layer, contracts guarantee data quality with SLO rules, and policies enforce standards with rule conditions and on-demand evaluation.

**Phase 3 — Orchestration (G7–G8):** All DONE. G7 (Process Workflows) and G8 (Projects) complete. Projects provide logical isolation for team work; workflow engine automates governance processes with triggers, steps, approvals, and execution tracking.

**Phase 4 — Platform (G9–G15):** ALL DONE. G9 (Data Products), G10 (Semantic Models), G11 (MCP Integration), G12 (Delivery Modes), G13 (Multi-Platform Connectors), G14 (Dataset Marketplace), G15 (Naming Conventions). The complete governance platform is implemented across all 15 feature areas.

---

## Recently Completed (Feb 24, 2026)

- **Ontology-Inspired Graph Capabilities (4 phases)**: Full-stack lineage graph implementation:
  - **Phase 1 — Lineage as Graph Edges**: Extended `LinkType` enum with 14 lineage types (6 forward + 6 inverse + 2 mapping inverses). `LineageService` materializes implicit pipeline lineage (Sheet→Template→Training Sheet→Model→Endpoint) as typed edges in `semantic_links` table under `_system_lineage` model. Full + incremental materialization. `MaterializeResult`, `LineageNode`, `LineageEdge`, `LineageGraph`, `ImpactReport`, `TraversalResult` response models.
  - **Phase 2 — Graph Query Engine**: `GraphQueryService` with recursive CTE traversal (Databricks SQL DBR 13+) + Python BFS fallback. `traverse_upstream/downstream()`, `impact_analysis()` with risk scoring (critical=endpoints, high=models, medium=training_sheets, low=otherwise), `find_path()` (BFS shortest path), `get_entity_context()` (immediate neighborhood). 8 new API endpoints.
  - **Phase 3 — MCP Graph Tools**: 3 new FastMCP tools (`traverse_lineage`, `impact_analysis`, `find_related_assets`) + `workbench://lineage-graph` resource. Registered in MCP server. 3 seed rows added to `36_mcp_integration.sql` (tools 009–011).
  - **Phase 4 — Frontend Lineage Graph**: `LineageNode.tsx` (entity-type-specific colors/icons: Sheet=teal, Template=orange, Training Sheet=cyan, Model=rose, Endpoint=emerald). `useLineageGraphLayout()` with dagre stage-based ranking. `UnifiedGraphView.tsx` (dual-mode toggle: Business Concepts ↔ Data Lineage, materialization trigger, result toast). `LineageDetailsPanel.tsx` (3 tabs: Upstream/Downstream/Impact with react-query). Integrated into GovernancePage Semantic tab replacing standalone graph component.

## Recently Completed (Feb 22, 2026)

- **Canonical Label CRUD hooks wired into CanonicalLabelBrowser**: Self-contained delete (with usage-count warning dialog via `useDeleteCanonicalLabel` + `useCanonicalLabelUsage`) and inline edit modal (confidence/notes/label_data JSON via `useUpdateCanonicalLabel`). Props still work as overrides.
- **Canonical label lookup wired into CuratePage DetailPanel**: `useLookupCanonicalLabel` shows green banner when a canonical label exists for the current source item; `useItemLabelsets` shows collapsible list of all labelsets. "Create Canonical Label" button dynamically changes to "Update" when match found.
- **Keyboard navigation hooks wired into CuratePage**: Replaced manual `addEventListener` with `useListNavigation` (adds j/k vim keys + ArrowUp/ArrowDown) alongside existing ArrowLeft/ArrowRight. Updated shortcuts modal.
- **App-wide shortcuts via `useAppShortcuts`**: Added Ctrl+N (new template), Ctrl+K (search placeholder), Shift+? (help toggle) to App.tsx. Removed duplicate Alt+N binding.

## Recently Completed (Feb 20, 2026)

- **Ontos Governance G11 (MCP Integration)**: Full-stack implementation across 8 files:
  - **DDL**: `36_mcp_integration.sql` — mcp_tokens (scoped access with SHA-256 hashing, rate limits, expiry, team scoping), mcp_tools (registered tools with category/scope/endpoint mapping), mcp_invocations (audit log with status/duration tracking) + 8 seeded default tools mapping to workbench API
  - **Backend models**: `MCPTokenScope`/`MCPToolCategory`/`MCPInvocationStatus` enums, token CRUD models with one-time value reveal, tool CRUD models, invocation/stats response models
  - **Service**: Token management (create with `secrets.token_urlsafe`, revoke, delete), tool registry (CRUD with category/scope filters), invocation audit log (filtered queries with JOINs), stats aggregation (today's count, by-status breakdown, top tools)
  - **API**: 14 endpoints — token CRUD + revoke (7), tool CRUD (5), invocations list (1), stats (1) — 132 governance routes total
  - **Frontend**: Types, 12 API functions, `MCPIntegrationTab` in GovernancePage — 3 sub-views (Tokens with scope badges and rate limits, Tools with category/scope badges, Audit Log table), stats overview cards, one-time token reveal with clipboard copy

- **Ontos Governance G13 (Multi-Platform Connectors)**: Full-stack implementation across 8 files:
  - **DDL**: `37_platform_connectors.sql` — platform_connectors (6 platform types, connection config, sync direction/schedule, team scoping), connector_assets (external asset tracking with metadata), connector_sync_records (sync operation audit) + 1 seeded Unity Catalog connector
  - **Backend models**: `ConnectorPlatform`/`ConnectorStatus`/`SyncDirection`/`SyncStatus` enums, connector CRUD models, asset/sync response models, stats model
  - **Service**: Connector management (CRUD with team JOIN, asset/sync counts), connection testing (status transitions), asset discovery, sync operations with status tracking, stats aggregation (by-platform breakdown, recent syncs)
  - **API**: 9 endpoints — connector CRUD (5), test (1), assets (1), sync (1), sync records (1) — 132 governance routes total
  - **Frontend**: Types, 10 API functions, `ConnectorsTab` in GovernancePage — platform badges (UC/SF/KF/PB/S3), test/sync action buttons, selected connector detail panel with assets and sync history, stats overview

- **Ontos Governance G15 (Naming Conventions)**: Full-stack implementation across 6 files:
  - **DDL**: `34_naming_conventions.sql` — naming_conventions table (entity_type, pattern regex, priority, is_active toggle, example_valid/invalid, error_message) + 6 seeded default conventions for radiation safety domain
  - **Backend**: `NamingEntityType` enum (10 types), `NamingConventionCreate/Update/Response`, `NamingValidationResult` models. Service methods: list, get, create, update, delete, toggle, validate (regex matching). 8 API endpoints: CRUD + toggle + validate
  - **Frontend**: Types, 7 API functions, `NamingConventionsTab` in GovernancePage — interactive Name Validator panel (entity type selector + name input + live validation), convention list grouped by entity type with toggle/delete, create form

- **Ontos Governance G14 (Dataset Marketplace)**: Full-stack implementation across 7 files:
  - **Backend service**: `search_marketplace` (full-text + domain/team/tags/type filters, paginated, faceted), `get_marketplace_stats` (overview counts by type/domain + recent products), `get_marketplace_product` (detail with ports), `get_user_subscriptions`
  - **Backend endpoints**: 4 new routes under `/governance/marketplace/` — search, stats, product detail, my-subscriptions (101 governance routes total)
  - **Frontend types**: `MarketplaceProduct`, `MarketplaceFacets`, `MarketplaceSearchResult`, `MarketplaceStats`, `MarketplaceSearchParams`
  - **Frontend API**: `searchMarketplace`, `getMarketplaceStats`, `getMarketplaceProduct`, `getMySubscriptions`
  - **Frontend page**: `MarketplacePage.tsx` — stats overview (4 metric cards), search bar with clear, filter sidebar with faceted counts (product type, domain, team), sort dropdown, responsive card grid, product detail view with ports and subscription request form
  - **Sidebar**: Added under Tools section with Store icon

- **Ontos Governance G12 (Delivery Modes)**: Full-stack implementation across 8 files:
  - **DDL**: `35_delivery_modes.sql` — delivery_modes table (mode_type direct/indirect/manual, git config for GitOps, yaml_template, manual_instructions, environment, requires_approval, approved_roles) + delivery_records table (status lifecycle pending→approved→in_progress→completed/failed/rejected) + 3 seeded default modes (Direct Deploy dev, GitOps Deploy production, Manual Deploy production)
  - **Backend models**: `DeliveryModeType`/`DeliveryRecordStatus` enums, `DeliveryModeCreate/Update/Response`, `DeliveryRecordCreate/Response`
  - **Service**: `list_delivery_modes` (active filter), `get_delivery_mode` (with delivery count), `create_delivery_mode`, `update_delivery_mode`, `delete_delivery_mode`, `list_delivery_records` (mode/status filters), `create_delivery_record`, `transition_delivery_record` (state machine with validation)
  - **API**: 8 endpoints — GET/POST/PUT/DELETE delivery-modes, GET delivery-modes/{id}, GET/POST delivery-records, PUT delivery-records/{id}/transition (109 governance routes total)
  - **Frontend**: Types, 8 API functions, `DeliveryModesTab` in GovernancePage — mode cards (3-column grid with type badge, environment, approval status), create form with type-specific fields (git config for indirect, instructions for manual), delivery records table with status badges and transition actions

- **Auth enforcement expansion**: Wired `require_permission()` across 7 additional endpoint files (~42 mutation endpoints):
  - sheets_v2.py (5), templates.py (6), training.py (4), deployment.py (7), monitoring.py (6), feedback.py (5), registries.py (9)
  - Fixed `convert_to_training_data` auth parameter placement bug, extracted `_ingest_single_metric` helper to avoid auth recursion in batch endpoint

- **DDL script fix**: Added files 26-34 to `schemas/execute_all.sh` (were missing from G4-G10 remote merge)

- **Ontos Governance G10 (Semantic Models)**: Full-stack implementation across 8 files:
  - **DDL**: `33_semantic_models.sql` — semantic_models (name, version, status, domain FK) + semantic_concepts (concept_type entity/event/metric/dimension, parent_id hierarchy, tags JSON) + semantic_properties (data_type, is_required, enum_values JSON, concept FK) + semantic_links (source_type concept/property, target_type table/column/sheet/contract/product, link_type maps_to/derived_from/aggregates/represents, confidence score)
  - **Backend models**: `ConceptType`, `LinkType` enums, `SemanticConceptCreate/Response`, `SemanticPropertyCreate/Response`, `SemanticLinkCreate/Response`, `SemanticModelCreate/Update/Response`
  - **Service**: `list_semantic_models` (status filter + domain join + concept/link counts), `get_semantic_model` (with concepts/properties/links), `create_semantic_model`, `update_semantic_model`, `publish_semantic_model`, `archive_semantic_model`, `delete_semantic_model` (cascading), concept CRUD with property nesting, property CRUD, link CRUD
  - **API**: 16 endpoints — GET/POST /semantic-models, GET/PUT/DELETE /semantic-models/{id}, PUT publish/archive, GET/POST concepts, DELETE concept, POST property, DELETE property, GET/POST links, DELETE link
  - **Frontend types**: `ConceptType`, `SemanticLinkType`, `SemanticModelStatus`, `SemanticProperty`, `SemanticConcept`, `SemanticLink`, `SemanticModel`
  - **Frontend API**: `listSemanticModels`, `getSemanticModel`, `createSemanticModel`, `updateSemanticModel`, `publishSemanticModel`, `archiveSemanticModel`, `deleteSemanticModel`, `createConcept`, `deleteConcept`, `addConceptProperty`, `removeConceptProperty`, `createSemanticLink`, `deleteSemanticLink`
  - **UI**: `SemanticModelsTab` in GovernancePage — concept type badges (Entity=blue, Event=amber, Metric=green, Dimension=purple), inline property builder with data type picker and required flag, semantic link editor with source picker (concept/property dropdown), target type selector, confidence score, link type badges, publish/archive lifecycle buttons

- **Ontos Governance G9 (Data Products)**: Full-stack implementation across 8 files:
  - **DDL**: `32_data_products.sql` — data_products (product_type, status, tags JSON, metadata JSON, domain/team FKs) + data_product_ports (name, port_type input/output, entity_type/id linking, config JSON) + data_product_subscriptions (subscriber_email, status lifecycle pending→approved→rejected→revoked, purpose, approval tracking)
  - **Backend models**: `DataProductType`, `DataProductStatus`, `PortType`, `SubscriptionStatus` enums, `DataProductPortSpec`, `DataProductCreate/Update/Response`, `DataProductPortResponse`, `SubscriptionRequest/Response`
  - **Service**: `list_data_products` (type/status filters + domain/team joins), `get_data_product` (with ports), `create_data_product` (with inline port creation), `update_data_product`, `publish_data_product`, `transition_data_product`, `delete_data_product`, `list_product_ports`, `add_product_port`, `remove_product_port`, `list_subscriptions`, `create_subscription`, `approve_subscription`, `reject_subscription`, `revoke_subscription`
  - **API**: 15 endpoints — GET/POST /products, GET/PUT/DELETE /products/{id}, PUT status, GET/POST ports, DELETE port, GET subscriptions, POST subscribe, PUT approve/reject/revoke
  - **Frontend types**: `DataProductType`, `DataProductStatus`, `PortType`, `SubscriptionStatus`, `DataProductPort`, `DataProductSubscription`, `DataProduct`
  - **Frontend API**: `listDataProducts`, `getDataProduct`, `createDataProduct`, `updateDataProduct`, `transitionProductStatus`, `deleteDataProduct`, `addProductPort`, `removeProductPort`, `listProductSubscriptions`, `approveSubscription`, `rejectSubscription`, `revokeSubscription`
  - **UI**: `DataProductsTab` in GovernancePage — type/status filter dropdowns, product type color badges (Source=blue, Source-Aligned=indigo, Aggregate=purple, Consumer-Aligned=teal), tag management with Enter-to-add, port editor with input/output direction + entity type linking, `SubscriptionsPanel` sub-component with approve/reject/revoke actions, lifecycle buttons (Publish/Deprecate/Retire)

- **Ontos Governance G7 (Process Workflows)**: Full-stack implementation across 7 files:
  - **DDL**: `31_workflows.sql` — workflows (steps JSON, trigger_config JSON, trigger_type, status) + workflow_executions (step_results JSON, current_step, trigger_event, status lifecycle)
  - **Backend models**: `WorkflowTriggerType`, `WorkflowStepType` enums, `WorkflowStep`, `WorkflowTriggerConfig`, `WorkflowCreate/Update/Response`, `WorkflowStepResult`, `WorkflowExecutionResponse`
  - **Service**: `list_workflows`, `get_workflow`, `create_workflow`, `update_workflow`, `activate_workflow`, `disable_workflow`, `delete_workflow`, `list_executions`, `start_execution`, `advance_execution`, `cancel_execution`
  - **API**: 10 endpoints — GET/POST /workflows, GET/PUT/DELETE /workflows/{id}, PUT activate/disable, GET executions, POST execute, PUT cancel
  - **Frontend types**: `WorkflowTriggerType`, `WorkflowStepType`, `WorkflowStep`, `WorkflowTriggerConfig`, `Workflow`, `WorkflowStepResult`, `WorkflowExecution`
  - **Frontend API**: `listWorkflows`, `getWorkflow`, `createWorkflow`, `updateWorkflow`, `activateWorkflow`, `disableWorkflow`, `deleteWorkflow`, `listWorkflowExecutions`, `startWorkflowExecution`, `cancelWorkflowExecution`
  - **UI**: `WorkflowsTab` in GovernancePage — visual step editor with numbered flow, step type badges, trigger type picker, 8 built-in action types, execution history with cancel, activate/disable/run lifecycle buttons

- **Ontos Governance G6 (Compliance Policies)**: Full-stack implementation across 7 files:
  - **DDL**: `30_compliance_policies.sql` — compliance_policies (rules JSON, scope JSON, category, severity, schedule, status) + policy_evaluations (per-rule results, pass/fail counts, duration)
  - **Backend models**: `PolicyCategory`, `PolicySeverity` enums, `PolicyRuleCondition`, `PolicyScope`, `CompliancePolicyCreate/Update/Response`, `PolicyEvaluationRuleResult`, `PolicyEvaluationResponse`
  - **Service**: `list_policies` (with category/status filters), `get_policy` (with last_evaluation attach), `create_policy`, `update_policy`, `toggle_policy`, `delete_policy`, `list_evaluations`, `run_evaluation`, `_parse_policy`, `_parse_evaluation`
  - **API**: 8 endpoints — GET/POST /policies, GET/PUT/DELETE /policies/{id}, PUT /policies/{id}/toggle, GET /policies/{id}/evaluations, POST /policies/{id}/evaluate
  - **Frontend types**: `PolicyCategory`, `PolicySeverity`, `PolicyRuleCondition`, `PolicyScope`, `CompliancePolicy`, `PolicyEvaluationRuleResult`, `PolicyEvaluation`
  - **Frontend API**: `listPolicies`, `getPolicy`, `createPolicy`, `updatePolicy`, `togglePolicy`, `deletePolicy`, `listEvaluations`, `runEvaluation`
  - **UI**: `PoliciesTab` in GovernancePage — severity icons, category/status filters, rule condition editor (field/operator/value/message), enable/disable toggle, on-demand Evaluate button, last evaluation result panel with per-rule PASS/FAIL display

- **Ontos Governance G5 (Data Contracts)**: Full-stack implementation across 7 files:
  - **DDL**: `29_data_contracts.sql` — contract entity with schema_definition (JSON column specs), quality_rules (SLO rules), terms (usage constraints), lifecycle status
  - **Backend models**: `ContractStatus` enum, `ContractColumnSpec`, `ContractQualityRule`, `ContractTerms`, `DataContractCreate`, `DataContractUpdate`, `DataContractResponse`
  - **Service**: `list_contracts` (with status/domain filters), `get_contract`, `create_contract`, `update_contract`, `transition_contract`, `delete_contract`, `_parse_contract`
  - **API**: 7 endpoints — GET/POST /contracts, GET/PUT/DELETE /contracts/{id}, PUT /contracts/{id}/status
  - **Frontend types**: `ContractStatus`, `ContractColumnSpec`, `ContractQualityRule`, `ContractTerms`, `DataContract`
  - **Frontend API**: `listContracts`, `getContract`, `createContract`, `updateContract`, `transitionContractStatus`, `deleteContract`
  - **UI**: `ContractsTab` in GovernancePage with schema column editor (add/remove columns, type picker, required checkbox), SLO rule builder (metric/operator/threshold), usage terms editor, lifecycle buttons (Activate/Deprecate/Retire), status filter dropdown

## Previously Completed (Feb 19, 2026)

- **Ontos Governance G1–G3 (RBAC, Teams, Domains)**: Full implementation across 19 files:
  - **Phase 1 (DDL)**: 6 schema files — `19_app_roles.sql`, `20_user_role_assignments.sql`, `21_teams.sql`, `22_team_members.sql`, `23_data_domains.sql`, `24_seed_default_roles.sql` (6 default roles with 11-feature permission matrix)
  - **Phase 2 (Backend)**: `auth.py` (AccessLevel enum, CurrentUser, get_current_user/require_permission/require_role dependencies), `governance.py` models, `governance_service.py` (CRUD for roles/users/teams/members/domains + domain tree builder), `governance.py` endpoints (23 routes)
  - **Phase 3 (Wiring)**: Added `enforce_auth` setting, registered governance router, updated `execute_all.sh` + `schemas/README.md`
  - **Phase 4 (Frontend)**: `governance.ts` types, `governance.ts` service (20 API functions), `GovernancePage.tsx` (3 tabs: permission matrix + user assignment, team list/detail + member management, domain tree + create form), Admin sidebar section in `AppLayout.tsx` + `AppWithSidebar.tsx`
- **Domain→asset association**: `25_add_domain_id_columns.sql` — adds `domain_id` FK column to sheets, templates, training_sheets tables
- **Auth enforcement on governance endpoints**: `require_permission()` wired to all 13 mutation endpoints (role CRUD needs admin/admin, user assignment needs governance/admin, team+domain CRUD needs governance/write). Soft mode by default.
- **Drift detection enhanced**: Multi-feature analysis — latency, error rate, token count from `endpoint_metrics` table + feedback rating. New `FeatureDrift` model with per-feature baseline/recent/score. DriftPanel shows per-feature breakdown with visual indicators.
- **Trigger retraining from ImprovePage**: "Trigger Retrain" modal selects training sheet + model name, calls `createTrainingJob`. "Create Annotation Task" button on gap cards calls `POST /gaps/{id}/task`. All 7 pipeline stages now DONE.

## Previously Completed (Feb 18, 2026)

- **Lineage DAG visualization**: `LineageDAG.tsx` SVG-based component in TrainingJobDetail Lineage tab. Shows Sheet→Template→Training Sheet→Model with canonical label branches and Q&A pair counts. No external graph library needed.
- **Dedicated metrics ingestion**: `endpoint_metrics` table (DDL `16_endpoint_metrics.sql`) captures per-request latency, status, tokens, cost. Endpoints: `POST /monitoring/metrics/ingest`, `POST /monitoring/metrics/ingest/batch`, `GET /monitoring/metrics/timeseries/{id}`. Performance endpoint now returns real p50/p95/p99 latencies. MonitorPage chart uses real timeseries with mock fallback.
- **Guardrails configuration**: `GuardrailsPanel.tsx` slide-out drawer with safety filters, PII handling (NONE/MASK/BLOCK), keyword blocking, topic whitelisting, and rate limits. Backend `GET/PUT /deployment/endpoints/{name}/guardrails` uses Databricks SDK `put_ai_gateway()`. Row action "Configure Guardrails" added to DeployPage.
- **Quick Wins batch**: Task board wired, attribution service fixed, DQX persistence added
  - Task board: `AppWithSidebar` and `LabelingModule` now render `LabelingWorkflow` (orchestrates jobs→tasks→annotate→review)
  - Attribution service: fixed `settings.uc_catalog`/`uc_schema` → `_get_tables()` helper, `result.get("data")` → direct list, `model_bits` → `model_training_lineage`
  - DQX results: `run_checks()` persists to `dqx_quality_results` table, `get_results()` queries history (last 10 runs)
  - DDL: `schemas/14_bit_attribution.sql`, `schemas/15_dqx_quality_results.sql`
- Dead code cleanup: removed `log_attribution_to_mlflow()` and `generate_databricks_job_config()` from `mlflow_integration_service.py` (-113 lines)
- Gap analysis service: rewrote all 4 analysis functions with real SQL queries (was using hardcoded simulated data)
  - `analyze_model_errors()` queries `model_evaluations` + `feedback_items` JOIN `endpoints_registry`
  - `analyze_coverage_distribution()` queries `qa_pairs` JOIN `training_sheets`
  - `analyze_quality_by_segment()` queries `qa_pairs` JOIN `training_sheets`
  - `detect_emerging_topics()` queries `feedback_items` JOIN `endpoints_registry`
- Fixed 4 bugs in gap_analysis_service.py: `settings.uc_catalog`/`uc_schema` (AttributeError), `result.get("data")` (AttributeError on list), wrong column names, nonexistent `curation_items` table
- Fixed all persistence functions (create_gap_record, list_gaps, get_gap, update_gap_in_db, create_annotation_task, list_annotation_tasks) to use `settings.get_table()` and treat `execute_sql()` result as `list[dict]`
- DDL: `schemas/12_identified_gaps.sql` — gap analysis persistence table
- DDL: `schemas/13_annotation_tasks.sql` — annotation task tracking table
- MLflow Evaluate integration: `evaluation_service.py` with `evaluate_model()`, `get_evaluation_results()`, `compare_evaluations()`
- 3 new training endpoints: `POST /training/jobs/{id}/evaluate`, `GET /training/jobs/{id}/evaluation`, `GET /training/compare/{model_name}`
- Evaluate tab in `TrainingJobDetail.tsx` with "Run Evaluation" button and metric cards
- `model_evaluations` DDL (`schemas/11_model_evaluations.sql`) — per-metric evaluation storage
- Pydantic models: `EvaluationRequest`, `EvaluationMetric`, `EvaluationResult`, `ComparisonResult`
- Frontend types + API functions: `evaluateTrainingJob()`, `getJobEvaluation()`
- Bug fix: `mlflow_integration_service.py` used `settings.uc_catalog`/`settings.uc_schema` (nonexistent) — now uses `settings.get_table()`
- Bug fix: `mlflow_integration_service.py` referenced `model_bits` table (nonexistent) — now uses `model_training_lineage`
- Added `mlflow>=2.12.0` to `requirements.txt`
- Registries admin page (Tools/Agents/Endpoints CRUD with tabbed DataTable UI)
- Example Store: copy-to-clipboard tracks usage via `trackExampleUsage`
- Example Store: "Regenerate Embeddings" button wired
- SheetBuilder: real publish/archive/delete replacing placeholder
- SheetBuilder: template detach button
- TemplatePage: "Create Version" action for published templates
- Ontos governance made first-class (sidebar links to external Ontos modules)
- Fixed stale schema references (`assemblies` → `training_sheets`, `assembly_rows` → `qa_pairs`) in 4 backend files
- Labeling DDL files (09–12) added to `schemas/` for `labeling_jobs`, `labeling_tasks`, `labeled_items`, `workspace_users`
- Deploy: rollback version row action wired to `POST /endpoints/{name}/rollback`
- Deleted 125+ stale docs from `docs/archive/`, `schemas/archive/`, `docs/planning/`, `docs/implementation/`, `docs/prd/`
- Confirmed TrainPage fully wired (was incorrectly listed as read-only — all 9 training endpoints connected)
- Canonical label coverage banner in SheetBuilder: shows "X% coverage" when template selected
- Progress tracking rules added to all CLAUDE.md files
- Gap analysis: fixed `PUT /gaps/{id}` to persist updates to DB (was a TODO stub)
- Gap analysis: fixed `GET /gaps/tasks` to query `annotation_tasks` table (was returning `[]`)
- Canonical label version history UI: `LabelVersionHistory.tsx` expandable panel in CuratePage detail view
- Agent Framework confirmed fully implemented (retrieval service + 3 endpoints + registries CRUD)

---

## Effort Key

| Size | Meaning |
|------|---------|
| XS | < 2 hours |
| S | Half day |
| M | 1–2 days |
| L | 3–5 days |

---

## Superseded Documents

The following stale docs have been **deleted** (Feb 18, 2026):

- `docs/GAP_ANALYSIS_V2.md`, `docs/SPRINT_PLAN.md`, `docs/BACKLOG.md`
- `docs/prd/` directory (including `v2.3-implementation-status.md`)
- `docs/planning/` and `docs/implementation/` directories
- `docs/archive/` and `schemas/archive/` directories
- `docs/DOCUMENTATION_INDEX.md`, `docs/INTEGRATION_GUIDE.md`

The following docs have been **updated** to use current terminology (Feb 18, 2026):

- `docs/BUSINESS_CASE.md` — Fixed TEMPLATE→GENERATE, CURATE→LABEL, DataBit→Sheet
- `docs/PRD.md` — Fixed broken file refs, old terminology in Stage 4 header, API layer, metrics, appendix
- `docs/architecture/canonical-labels.md` — Fixed UNIQUE constraint to v2.3 composite key, updated implementation checklist
- `docs/architecture/usage-constraints.md` — Updated implementation checklist

This file (`PROJECT_STATUS.md`) is the single source of truth for implementation status.
