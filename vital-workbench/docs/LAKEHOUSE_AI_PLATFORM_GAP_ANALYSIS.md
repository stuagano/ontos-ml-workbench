# Lakehouse AI Platform: Gap Analysis & APX Integration Plan

**Date:** January 30, 2026
**Source:** Lakehouse_AI_Platform_Pitch.pptx
**Target Codebase:** mirion-vital-workbench

---

## Executive Summary

The Lakehouse AI Platform deck presents a three-layer architecture for enterprise agentic AI. This analysis maps the vision to current implementation status and identifies **APX toolkit components** that can accelerate development.

| Layer | Deck Vision | Current Status | APX Reusable Components |
|-------|-------------|----------------|-------------------------|
| **Training Dataset Workbench** | DataBits, versioning, attribution DAG | Partial (templates exist) | Sidebar layout, theme system |
| **Example Store** | Dynamic few-shot retrieval | Basic API exists | Data tables, search UI patterns |
| **Agent Collaboration Framework** | Context Pools, Agent Registry | Not implemented | TanStack Router, state management |

**Key Finding:** APX provides the scaffolding (layout, routing, theming) but domain-specific components (DAG visualization, optimization monitors) must be built.

---

## Layer 1: Training Dataset Workbench

### Vision (Deck Slide 4)
> "DataBits - Atomic, immutable data units with versioned provenance. Composable into DataSets with attribution DAG for lineage."

### Current Implementation

| Feature | Status | Location |
|---------|--------|----------|
| Template CRUD | ✅ Complete | `backend/app/api/v1/endpoints/templates.py` |
| Basic schema | ✅ Complete | `backend/app/models/template.py` |
| Version tracking | ❌ Missing | - |
| Attribution DAG | ❌ Missing | - |
| Multimodal content | ⚠️ Partial | Text only, no image/audio |
| Quality scoring | ⚠️ Partial | Single score, not MAP<STRING, DOUBLE> |
| Embedding storage | ❌ Missing | - |

### Gap: DataBit Model

```python
# Current (template.py)
class Template:
    id: str
    name: str
    template_text: str
    model_config: dict

# Required (databit.py)
class DataBit:
    databit_id: UUID
    version: int                    # NEW: Version chain
    content: Variant                # NEW: Flexible content
    modality: List[str]             # NEW: ["text", "image", "audio"]
    attribution: AttributionDAG     # NEW: Lineage graph
    quality_scores: Dict[str, float]
    embedding: List[float]          # NEW: Vector representation
```

### APX Components to Reuse

| APX Component | Location | Use Case |
|---------------|----------|----------|
| `SidebarLayout` | `templates/addons/sidebar/` | Navigation for DataBit browser |
| `ThemeProvider` | `templates/base/ui/components/apx/` | Dark/light mode |
| `ModeToggle` | `templates/base/ui/components/apx/` | Theme switcher |
| `Navbar` | `templates/base/ui/components/apx/` | Header structure |

---

## Layer 2: Example Store

### Vision (Deck Slides 5-6)
> "Semantic retrieval at runtime. Upload via UI, immediate effect. Only relevant examples retrieved. Domain experts can contribute."

### Current Implementation

| Feature | Status | Location |
|---------|--------|----------|
| Example CRUD API | ✅ Complete | `backend/app/api/v1/endpoints/examples.py` |
| Example Store models | ✅ Complete | `backend/app/models/example_store.py` |
| Embedding service | ✅ Complete | `backend/app/services/embedding_service.py` |
| Vector Search sync | ❌ Missing | - |
| Effectiveness tracking | ❌ Missing | - |
| Multi-agent sharing | ❌ Missing | - |
| Example Store UI | ⚠️ Basic | `frontend/src/pages/ExampleStorePage.tsx` |

### Gap: Vector Search Integration

```python
# Required: Vector Search retrieval
class ExampleStoreService:
    def search_by_embedding(
        self,
        query_embedding: List[float],
        domain: str,
        k: int = 10
    ) -> List[ExampleRecord]:
        """
        Uses Databricks Vector Search for semantic retrieval.
        Currently missing - falls back to metadata search only.
        """
        # TODO: Implement VS integration
        pass

    def track_effectiveness(
        self,
        example_id: str,
        was_helpful: bool,
        agent_id: str
    ):
        """
        Track which examples improve agent performance.
        Feeds DSPy optimization loop.
        """
        # TODO: Implement effectiveness tracking
        pass
```

### APX Components to Reuse

| APX Component | Use Case |
|---------------|----------|
| TanStack Router | Route to `/examples`, `/examples/:id` |
| TanStack Query | Data fetching with caching for example search |
| shadcn/ui `Table` | Example browser with sort/filter |
| shadcn/ui `Dialog` | Example editor modal |

---

## Layer 3: Agent Collaboration Framework

### Vision (Deck Slides 6-7)
> "Agent Registry in UC. Shared Example Stores - one correction improves all. Context Pools for instant handoffs (<10ms via OLTP)."

### Current Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Registry | ❌ Missing | No agent metadata in UC |
| Context Pools | ❌ Missing | Requires Lakebase OLTP |
| Tool Skill Registry | ❌ Missing | Not designed |
| Multi-agent example sharing | ❌ Missing | Single-tenant only |
| Collaborative learning flywheel | ❌ Missing | No cross-agent feedback |

### Gap: Context Pool Architecture

The deck specifies **sub-10ms reads** for agent context handoffs. This requires:

1. **Lakebase OLTP** - Not yet available in production
2. **Context Pool Service** - New service to implement

```python
# Required: Context Pool for agent handoffs
class ContextPoolService:
    """
    Instant context retrieval for agent collaboration.
    Customer talks to Agent A, hangs up, calls back to Agent B.
    Agent B has full context in <10ms.
    """

    def store_turn(
        self,
        session_id: str,
        agent_id: str,
        turn: ConversationTurn
    ):
        """Write after each turn - OLTP point write."""
        pass

    def retrieve_context(
        self,
        session_id: str,
        k_recent_turns: int = 10
    ) -> List[ConversationTurn]:
        """Sub-10ms read for instant handoff."""
        pass
```

### APX Components to Reuse

| APX Component | Use Case |
|---------------|----------|
| `stateful` addon | SQLModel patterns for context persistence |
| TanStack Query | Real-time context updates |
| WebSocket patterns | Live agent coordination (if needed) |

---

## DSPy Integration

### Vision (Deck Slide 9)
> "DSPy Optimization Tracking - Every optimization run logged with hyperparameters, metrics, and prompt versions."

### Current Implementation

| Feature | Status | Location |
|---------|--------|----------|
| DSPy models | ✅ Complete | `backend/app/models/dspy_models.py` |
| DSPy service | ⚠️ Basic | `backend/app/services/dspy_integration_service.py` |
| Optimization API | ❌ Missing | - |
| MLflow tracking | ❌ Missing | - |
| Optimization UI | ⚠️ Stub | `frontend/src/pages/DSPyOptimizationPage.tsx` |

### Gap: MLflow Integration

```python
# Required: MLflow tracking for DSPy runs
class DSPyIntegrationService:
    def launch_optimization(
        self,
        template_id: str,
        examples: List[ExampleRecord],
        optimizer: str = "BootstrapFewShotWithRandomSearch",
        metric: str = "exact_match"
    ) -> str:
        """
        Launch DSPy optimization with MLflow tracking.

        Logs:
        - Hyperparameters
        - Example set version
        - Prompt candidates evaluated
        - Best metric value
        - Resulting DSPy module
        """
        with mlflow.start_run():
            mlflow.log_param("optimizer", optimizer)
            mlflow.log_param("template_id", template_id)
            mlflow.log_param("num_examples", len(examples))
            # ... optimization logic
            mlflow.log_metric("best_score", best_score)
            mlflow.sklearn.log_model(optimized_module, "dspy_module")

        return run_id
```

---

## Frontend: APX Migration Plan

### Current Stack
- React + TypeScript + Vite
- Tailwind CSS (custom `db-*` tokens)
- TanStack Query
- Manual layout (`Header.tsx`, `PipelineBreadcrumb.tsx`)

### APX Stack
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query + TanStack Router
- `SidebarLayout` with collapsible navigation

### Migration Path

#### Phase 1: Adopt APX Layout (Low Risk)

Replace current manual layout with APX sidebar:

```tsx
// Current: App.tsx
<Header ... />
<PipelineBreadcrumb ... />
<main>{renderStage()}</main>

// With APX: App.tsx
<SidebarLayout>
  <SidebarContent>
    <PipelineNav stages={STAGES} current={currentStage} />
  </SidebarContent>
</SidebarLayout>
<Outlet /> {/* TanStack Router */}
```

**Files to create/modify:**
- `frontend/src/components/apx/sidebar-layout.tsx` (copy from APX)
- `frontend/src/components/apx/theme-provider.tsx` (copy from APX)
- `frontend/src/routes/__root.tsx` (new - TanStack Router)
- `frontend/src/routes/data.tsx`, `template.tsx`, etc.

#### Phase 2: Add shadcn/ui Components

```bash
# Install shadcn/ui components
npx shadcn-ui@latest add sidebar
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
```

#### Phase 3: Migrate Pages to Routes

| Current Page | APX Route |
|--------------|-----------|
| `SheetBuilder` | `/data` |
| `TemplateBuilderPage` | `/template` |
| `CuratePage` | `/curate` |
| `TrainPage` | `/train` |
| `ExampleStorePage` | `/examples` |
| `DSPyOptimizationPage` | `/optimize` |

---

## APX Components Catalog

### Ready to Use

| Component | Source | Purpose |
|-----------|--------|---------|
| `SidebarLayout` | `addons/sidebar/` | Main app shell |
| `ThemeProvider` | `base/ui/components/apx/` | Dark/light mode |
| `ModeToggle` | `base/ui/components/apx/` | Theme switch button |
| `Logo` | `base/ui/components/apx/` | Branding component |
| `Navbar` | `base/ui/components/apx/` | Top navigation |
| `bubble.tsx` | `base/ui/components/backgrounds/` | Animated background |

### Requires Customization

| Component | What to Build |
|-----------|---------------|
| `DataBitCard` | Display DataBit with version badge, modality icons |
| `ExampleBrowser` | Table with semantic search, effectiveness scores |
| `AttributionDAG` | D3/Cytoscape visualization of lineage |
| `OptimizationMonitor` | Real-time DSPy run progress |
| `ContextPoolViewer` | Agent handoff visualization |

---

## Implementation Priority

### Sprint 1: Foundation (APX + Example Store)

1. **Integrate APX layout** - Sidebar, theme, routing
2. **Complete Example Store UI** - shadcn/ui table, search
3. **Vector Search integration** - Connect to Databricks VS

### Sprint 2: DSPy Integration

1. **MLflow tracking** - Log optimization runs
2. **Optimization UI** - Launch, monitor, review results
3. **Feedback loop** - Track example effectiveness

### Sprint 3: DataBits v2

1. **Version model** - Add version chain to templates
2. **Attribution DAG** - Implement lineage tracking
3. **DAG visualization** - D3-based lineage explorer

### Sprint 4: Agent Collaboration (Dependent on Lakebase)

1. **Context Pool service** - OLTP integration
2. **Agent Registry** - UC metadata design
3. **Multi-agent sharing** - Example Store subscriptions

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lakebase OLTP not GA | BLOCKS Sprint 4 | Use Delta Lake with caching as interim |
| APX breaking changes | LOW | Pin version, use minimal subset |
| Vector Search latency | MEDIUM | Batch embedding updates, cache hot examples |
| DSPy API changes | MEDIUM | Adapter layer, version lock |

---

## Quick Reference: APX Commands

```bash
# Create new APX project
uvx apx create my-app

# Add sidebar addon
uvx apx addon add sidebar

# Add stateful backend
uvx apx addon add stateful

# Start development
cd my-app && uvx apx run
```

---

## Appendix: File Mapping

| Deck Feature | Implementation File(s) |
|--------------|------------------------|
| DataBits | `backend/app/models/databit.py` (NEW) |
| Example Store | `backend/app/services/example_store_service.py` |
| DSPy Integration | `backend/app/services/dspy_integration_service.py` |
| Context Pools | `backend/app/services/context_pool_service.py` (NEW) |
| Agent Registry | Unity Catalog metadata (external) |
| Vector Search | `backend/app/services/embedding_service.py` |
| MLflow Tracking | `backend/app/services/mlflow_service.py` (NEW) |
