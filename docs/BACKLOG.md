# Remaining Backlog: PRD v2 Completion

**Created:** February 2, 2026
**Status:** ~75-80% PRD Complete
**Goal:** Close remaining gaps to reach production readiness

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Required for PRD compliance |
| **P1** | High value, should ship |
| **P2** | Nice to have, can defer |

---

## Backlog Items

### 1. Example Effectiveness Dashboard
**Priority:** P0
**PRD Ref:** P2 - "Example Effectiveness Analytics"
**Status:** Data collected, no visualization

**Why it matters:** The PRD emphasizes a feedback loop where users see which examples drive improvement. Without this, users can't prune low-impact examples or amplify high-impact ones.

**Current state:**
- `example_effectiveness_log` table exists with usage tracking
- `effectiveness_score` and `usage_count` fields populated
- No frontend visualization

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Create EffectivenessDashboard page | `frontend/src/pages/EffectivenessDashboard.tsx` | M |
| Add time-series chart of example usage | Component | S |
| Add ranking table by effectiveness score | Component | S |
| Add domain/function breakdown | Component | S |
| Create API endpoint for aggregated stats | `backend/app/api/v1/endpoints/examples.py` | S |
| Add navigation link | `frontend/src/App.tsx` | XS |

**Acceptance criteria:**
- [ ] Users can see top 10 examples by effectiveness
- [ ] Usage trends visible over time (7d, 30d, 90d)
- [ ] Filter by domain and function_name
- [ ] Drill-down to individual example details

---

### 2. Agent Framework Integration
**Priority:** P0
**PRD Ref:** P1 - "Agent Framework Hook"
**Status:** Scaffolded, not connected

**Why it matters:** The PRD's core value prop is that examples are "automatically retrieved and injected into prompts" by the Mosaic AI Agent Framework. This is the zero-deployment correction path.

**Current state:**
- `context_pool_service.py` manages session state
- No direct integration with Databricks Agent Framework SDK
- No hook for automatic example injection

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Research Agent Framework retriever interface | N/A | S |
| Create AgentExampleRetriever class | `backend/app/services/agent_retriever.py` | M |
| Implement `get_examples_for_context()` | Service | M |
| Add retriever registration endpoint | `backend/app/api/v1/endpoints/agents.py` | S |
| Create agent integration notebook | `notebooks/deploy/agent_example_retriever.py` | M |
| Document integration pattern | `docs/AGENT_INTEGRATION.md` | S |

**Acceptance criteria:**
- [ ] Retriever can be registered with Agent Framework
- [ ] Examples auto-inject based on query similarity
- [ ] Usage tracked back to Example Store
- [ ] Documentation shows integration steps

---

### 3. Live Monitoring Dashboard
**Priority:** P1
**PRD Ref:** Stage 6 - MONITOR
**Status:** Page exists, no live data

**Why it matters:** Day 2 operations require visibility into drift, latency, and quality degradation.

**Current state:**
- `MonitorPage.tsx` exists with placeholder content
- `drift_detection.py` notebook scaffolded
- No live metric ingestion or alerting

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Wire MonitorPage to real metrics | `frontend/src/pages/MonitorPage.tsx` | M |
| Create monitoring service | `backend/app/services/monitoring_service.py` | M |
| Add drift metrics endpoint | `backend/app/api/v1/endpoints/monitoring.py` | S |
| Add latency/error rate charts | Components | M |
| Connect to Lakehouse Monitoring tables | Service | M |
| Add alerting configuration UI | Component | S |

**Acceptance criteria:**
- [ ] Live metrics displayed (latency p50/p99, error rate)
- [ ] Drift indicators for data and model
- [ ] Alert configuration and history
- [ ] Time range selector (1h, 24h, 7d)

---

### 4. Guardrails Framework Integration
**Priority:** P1
**PRD Ref:** Stage 5 - DEPLOY - "Configure Guardrails"
**Status:** Not implemented

**Why it matters:** Safety filters are table stakes for production AI deployments, especially in radiation safety.

**Current state:**
- No guardrails configuration
- DEPLOY page doesn't reference guardrails

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Research Databricks Guardrails API | N/A | S |
| Add guardrails models | `backend/app/models/guardrails.py` | S |
| Create guardrails service | `backend/app/services/guardrails_service.py` | M |
| Add guardrails config endpoints | `backend/app/api/v1/endpoints/guardrails.py` | M |
| Add GuardrailsConfig component | `frontend/src/components/GuardrailsConfig.tsx` | M |
| Integrate into DeployPage | `frontend/src/pages/DeployPage.tsx` | S |

**Acceptance criteria:**
- [ ] Users can configure input/output guardrails
- [ ] Guardrails linked to deployed endpoints
- [ ] Test guardrails before deployment
- [ ] Guardrail violations logged

---

### 5. Synthetic Data Generation
**Priority:** P2
**PRD Ref:** P2 - "Synthetic Data Generation"
**Status:** Infrastructure ready, no dedicated service

**Why it matters:** LLM-powered augmentation with attribution tracking enables scaling training data without manual labeling.

**Current state:**
- Attribution model supports `derived_from` relationships
- No dedicated synthetic generation service
- No UI for triggering generation

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Create SyntheticDataService | `backend/app/services/synthetic_data_service.py` | L |
| Implement `generate_variations()` | Service | M |
| Implement `generate_from_template()` | Service | M |
| Add attribution tracking for synthetic data | Service | S |
| Create generation job notebook | `notebooks/data/synthetic_generation.py` | M |
| Add SyntheticGeneratorModal | `frontend/src/components/SyntheticGeneratorModal.tsx` | M |
| Add trigger button to CuratePage | `frontend/src/pages/CuratePage.tsx` | XS |

**Acceptance criteria:**
- [ ] Generate N variations of existing DataBit
- [ ] Full attribution chain preserved
- [ ] Quality scoring on generated data
- [ ] Human review queue for generated items

---

### 6. Active Learning Loop
**Priority:** P2
**PRD Ref:** P2 - "Active Learning"
**Status:** Partial - queue exists, no model-in-the-loop

**Why it matters:** Prioritizing annotation by uncertainty/impact maximizes labeler efficiency.

**Current state:**
- Curation queue exists
- Labeling workflow implemented
- No uncertainty sampling or model-driven prioritization

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Create ActiveLearningService | `backend/app/services/active_learning_service.py` | L |
| Implement uncertainty sampling | Service | M |
| Implement diversity sampling | Service | M |
| Add priority scores to curation items | Schema + API | S |
| Create AL configuration UI | Component | M |
| Wire priority into CuratePage sorting | `frontend/src/pages/CuratePage.tsx` | S |

**Acceptance criteria:**
- [ ] Items ranked by model uncertainty
- [ ] Diversity sampling prevents redundant labeling
- [ ] Users can toggle AL on/off
- [ ] Measurable efficiency improvement

---

### 7. Lineage DAG Visualization
**Priority:** P2
**PRD Ref:** "Attribution Model" - DAG visualization
**Status:** Backend done, frontend basic

**Why it matters:** When model fails, users need to trace back to the training data that caused it.

**Current state:**
- `attribution_service.py` has DAG traversal
- No interactive visualization

**Tasks:**
| Task | File | Effort |
|------|------|--------|
| Select graph visualization library | Research | XS |
| Create LineageDAG component | `frontend/src/components/LineageDAG.tsx` | L |
| Add interactive node drill-down | Component | M |
| Add lineage tab to TemplatePage | `frontend/src/pages/TemplatePage.tsx` | S |
| Add "trace from model" entry point | `frontend/src/pages/DeployPage.tsx` | S |

**Acceptance criteria:**
- [ ] Visual DAG showing DataBit relationships
- [ ] Click node to see details
- [ ] Trace from deployed model to training data
- [ ] Export lineage report

---

## Summary by Priority

| Priority | Items | Total Effort |
|----------|-------|--------------|
| **P0** | 2 (Effectiveness Dashboard, Agent Integration) | ~3-4 weeks |
| **P1** | 2 (Monitoring, Guardrails) | ~3-4 weeks |
| **P2** | 3 (Synthetic, Active Learning, Lineage) | ~4-5 weeks |

---

## Recommended Execution Order

```
Week 1-2:  Example Effectiveness Dashboard (P0)
           └─ Quick win, data already exists

Week 3-4:  Agent Framework Integration (P0)
           └─ Core PRD value prop

Week 5-6:  Live Monitoring Dashboard (P1)
           └─ Day 2 operations

Week 7-8:  Guardrails Integration (P1)
           └─ Production safety

Week 9+:   P2 items as bandwidth allows
           └─ Synthetic → Active Learning → Lineage DAG
```

---

## Quick Wins (< 1 day each)

These can be parallelized or done opportunistically:

1. **Add effectiveness sort to ExampleStorePage** - Already have the data, just add dropdown
2. **Add usage_count display to ExampleCard** - Small UI change
3. **Wire MonitorPage breadcrumb** - Currently doesn't highlight in nav
4. **Add "Export to DSPy" button visibility** - Button exists but hidden on some views
5. **Fix labeling job completion status** - Shows "in_progress" after completion

---

## Dependencies

```
Example Effectiveness Dashboard
         │
         ▼
Agent Framework Integration ◀─── (uses effectiveness data to rank examples)
         │
         ▼
Live Monitoring ◀─── (tracks agent performance with examples)
         │
         ▼
Guardrails ◀─── (monitors guardrail violations)
```

Synthetic Data and Active Learning are independent tracks.
