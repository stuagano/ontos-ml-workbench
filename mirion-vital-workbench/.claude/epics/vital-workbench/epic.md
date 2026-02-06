---
name: vital-workbench
status: backlog
created: 2026-02-06T16:22:58Z
progress: 0%
prd: .claude/prds/vital-workbench.md
github: https://github.com/databricks-field-eng/mirion-workspace/issues/1
---

# Epic: VITAL Platform Workbench

## Overview

Build a no-code, multimodal training data curation platform for Mirion's AI-powered radiation safety systems. The workbench enables domain experts (physicists, data stewards) to create, label, and govern AI training datasets through a 7-stage workflow without writing code. Core innovation: **Canonical Labels** enable "label once, reuse everywhere" - expert-validated ground truth that persists independently of Q&A pairs and gets automatically reused across all Training Sheets.

**Validated Use Cases:**
- Medical invoice entity extraction (Document AI)
- PCB defect detection (Vision AI)

**Target Platform:** Databricks App (APX) with FastAPI + React + Unity Catalog

## Architecture Decisions

### 1. Databricks-Native Platform
- **Unity Catalog for Everything**: All assets (Sheets, Templates, Canonical Labels, Training Sheets) stored as Delta tables in Unity Catalog
- **APX Framework**: Use Databricks APX for unified development/deployment (already configured in project)
- **Foundation Model APIs**: Leverage existing Databricks FM APIs for Q&A generation (no external services)
- **Vector Search**: Use Databricks Vector Search for Example Store similarity retrieval (P1)

**Rationale:** Minimize external dependencies, maximize Databricks consumption, simplify governance

### 2. Canonical Labels as First-Class Entity
- **Independent Storage**: Canonical labels live separately from Q&A pairs
- **Composite Key**: `(sheet_id, item_ref, label_type)` allows multiple labelsets per source item
- **Automatic Reuse**: Q&A generation checks for existing canonical labels and auto-approves when found
- **Two Labeling Modes**:
  - Mode A: Label during Q&A review (creates canonical label as byproduct)
  - Mode B: Standalone canonical labeling tool (label before Q&A generation)

**Rationale:** Eliminates repetitive expert labeling, core differentiator vs existing tools

### 3. Multimodal by Design
- **Volume References**: Images/PDFs/audio stay in Unity Catalog Volumes, referenced by path
- **Unified Schema**: Q&A pairs support both text and rich media via message content array
- **Display Layer**: Frontend handles image preview, PDF rendering, table display

**Rationale:** Radiation safety data is inherently multimodal (sensor readings + images + documents)

### 4. 7-Stage Linear Workflow
```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```
- **Stage Navigation**: Clear progression through UI
- **Tools Section**: Separate area for Templates, Example Store, DSPy (not workflow stages)
- **Keyboard Shortcuts**: Alt+T (Templates), Alt+E (Examples), Alt+D (DSPy)

**Rationale:** User feedback from v2.1 - linear flow clearer than hub-and-spoke

## Technical Approach

### Backend Services (FastAPI)

**Core API Endpoints (P0):**
```
/api/v1/sheets               # Sheet CRUD operations
/api/v1/templates            # Template library management
/api/v1/canonical-labels     # Canonical label management
/api/v1/training-sheets      # Training Sheet generation/status
/api/v1/qa-pairs             # Q&A pair review operations
/api/v1/export               # JSONL export for training
```

**Data Models (Pydantic):**
- `Sheet` - Dataset definition with UC table/volume references
- `PromptTemplate` - Reusable prompt with label_type field
- `CanonicalLabel` - Ground truth with composite key `(sheet_id, item_ref, label_type)`
- `TrainingSheet` - Q&A dataset with generation metadata
- `QAPair` - Individual Q&A with canonical_label_id linkage

**Databricks SDK Integration:**
- Unity Catalog table/volume queries
- Foundation Model API calls for Q&A generation
- Job orchestration for batch operations

### Frontend Components (React + TypeScript)

**7 Stage Pages:**
1. **DATA** - Browse Unity Catalog, create Sheets
2. **GENERATE** - Select Sheet + Template, trigger generation
3. **LABEL** - Review Q&A pairs (Approve/Edit/Reject)
4. **TRAIN** - Select Training Sheet, launch fine-tuning
5. **DEPLOY** - Model deployment tracking
6. **MONITOR** - Performance metrics dashboard
7. **IMPROVE** - Feedback loop analysis

**TOOLS Section (Modal/Overlay):**
- Prompt Templates library (Alt+T)
- Example Store (Alt+E) - P1 feature
- DSPy Optimizer (Alt+D) - P1 feature
- Canonical Labeling Tool - Standalone labeling interface

**Key UI Patterns:**
- Multimodal display: Images, tables, PDFs in labeling view
- Bulk operations: Select multiple Q&A pairs for batch approval
- Inline editing: Edit assistant responses directly in review UI
- Pre-approval indicator: Show when canonical label was used (no review needed)

### Infrastructure

**Delta Tables (mirion_vital.workbench catalog):**
```sql
sheets                    -- Dataset definitions
templates                 -- Prompt templates with label_type
canonical_labels          -- Ground truth (composite key)
training_sheets           -- Q&A datasets
qa_pairs                  -- Individual pairs with canonical_label_id
model_training_lineage    -- Training run tracking
example_store             -- Few-shot examples (P1)
```

**Databricks App Deployment:**
- APX dev mode: `apx dev start` (hot reload)
- Production: `databricks bundle deploy`
- App URL: `/apps/vital-workbench`

## Implementation Strategy

### Phase 1: Core Workflow (P0)
Build the complete 7-stage workflow with Sheets, Templates, Canonical Labels, and Training Sheets. Focus: End-to-end Q&A pair generation and review.

### Phase 2: Canonical Labels Intelligence (P0)
Implement automatic canonical label lookup during Q&A generation. Enable "label once, reuse everywhere" pattern.

### Phase 3: Multimodal Support (P0)
Add image/PDF/document display in labeling UI. Enable labeling of vision AI and document AI use cases.

### Phase 4: Example Store (P1)
Build vector-backed example retrieval system with Databricks Vector Search. Enable dynamic few-shot learning.

### Phase 5: Production Hardening
Error handling, performance optimization, security review, deployment automation.

## Task Breakdown Preview

### P0 Tasks (MVP - 8 tasks)
- [ ] **Task 1: Delta Table Schemas** - Create all Unity Catalog tables (sheets, templates, canonical_labels, training_sheets, qa_pairs, lineage)
- [ ] **Task 2: Sheet Management API** - Backend endpoints + models for Sheet CRUD with UC integration
- [ ] **Task 3: Template Library API** - Backend endpoints + models for Template management with label_type support
- [ ] **Task 4: Canonical Labels API** - Backend endpoints for composite key `(sheet_id, item_ref, label_type)` with version tracking
- [ ] **Task 5: Q&A Generation Engine** - Training Sheet creation with canonical label lookup + FM API integration for AI generation
- [ ] **Task 6: Q&A Review UI** - React components for LABEL stage (Approve/Edit/Reject) with multimodal display
- [ ] **Task 7: Frontend Stage Navigation** - 7 stage pages + TOOLS section with routing and keyboard shortcuts
- [ ] **Task 8: JSONL Export + Seed Data** - Export Training Sheets to training format + create PCB/invoice sample data

### P1 Tasks (Example Store - 2 tasks, deferred)
- [ ] **Task 9: Example Store Schema + API** - Delta table + Vector Search index + retrieval endpoints (P1)
- [ ] **Task 10: Example Store UI** - Upload interface + similarity testing tools (P1)

**Note:** Keeping P1 tasks separate allows shipping core workflow first, then adding Example Store later.

## Dependencies

### External Dependencies
- ✅ Databricks Foundation Model APIs (already available)
- ✅ Unity Catalog (already configured)
- ✅ APX framework (already installed in project)
- ✅ Databricks SDK Python (already in requirements)

### Internal Dependencies
- Task 1 (schemas) blocks all other tasks
- Tasks 2-4 (APIs) can be done in parallel
- Task 5 (generation) depends on Tasks 2-4
- Task 6 (review UI) depends on Task 5
- Task 7 (navigation) depends on Tasks 2-6
- Task 8 (export + seed) depends on Task 5

### Prerequisite Work
- ✅ PRD v2.3 validated with Document AI + Vision AI use cases
- ✅ APX dev environment configured
- ✅ Databricks workspace access with UC permissions
- ✅ Frontend/backend CLAUDE.md files created
- ✅ TypeScript quality hooks configured

## Success Criteria (Technical)

### Functional Completeness
- [ ] Expert can create Sheet pointing to Unity Catalog table + volume
- [ ] Expert can create/version Prompt Templates with label_type
- [ ] Expert can label items independently (Canonical Labeling Tool)
- [ ] System generates Q&A pairs by applying Template to Sheet
- [ ] System auto-approves Q&A pairs when canonical label exists (label_type matches)
- [ ] Expert can review/approve/edit/reject Q&A pairs in LABEL stage
- [ ] System tracks lineage from Sheet → Training Sheet → Model
- [ ] Approved Training Sheets export to JSONL format for fine-tuning

### Performance Benchmarks
- Q&A generation: <5 seconds per item (Foundation Model API latency)
- Review UI: <1 second load time for batch of 50 Q&A pairs
- Canonical label lookup: <100ms for 10K label database
- Export: <30 seconds for 1000 Q&A pair Training Sheet

### Quality Gates
- All endpoints have Pydantic validation
- TypeScript quality hooks pass on all frontend code
- Delta tables use MERGE for upserts (no duplicates)
- Canonical label composite key enforced via UNIQUE constraint
- All UC operations use proper error handling

### UX Validation
- Domain expert (no coding) can complete full workflow
- Multimodal display works for images + PDFs + tables
- Pre-approved pairs clearly distinguished from needs-review
- Keyboard shortcuts functional (Alt+T, Alt+E, Alt+D)

## Estimated Effort

### Overall Timeline
- **P0 Core Workflow:** 6-8 weeks (8 tasks)
- **P1 Example Store:** 2-3 weeks (2 tasks, deferred)
- **Total MVP:** 6-8 weeks

### Resource Requirements
- 1 Full-Stack Developer (FastAPI + React + Databricks)
- 1 Domain Expert (validation + testing)
- Databricks workspace with Foundation Model APIs enabled

### Critical Path Items
1. **Delta Table Schemas** (Task 1) - Blocks everything
2. **Canonical Labels API** (Task 4) - Core differentiator
3. **Q&A Generation Engine** (Task 5) - Heart of the system
4. **Q&A Review UI** (Task 6) - Primary expert touchpoint

### Risk Mitigation
- **Foundation Model API Latency:** Use async generation + job queue for batch operations
- **Multimodal Display Complexity:** Start with images, add PDF/table support iteratively
- **Canonical Label Conflicts:** Version tracking + last-write-wins with audit trail
- **Scale (large Sheets):** Pagination + lazy loading in UI, batch processing for generation

## Simplification Opportunities

### Leverage Existing Functionality
- ✅ **APX Hot Reload:** Already configured - no custom dev server needed
- ✅ **Databricks SDK:** Use built-in UC clients instead of custom table access
- ✅ **Foundation Model APIs:** Zero setup for LLM calls
- ✅ **Delta Lake:** ACID transactions + versioning built-in (no custom version control)

### Avoid Over-Engineering
- ❌ **No custom auth:** Use Databricks workspace authentication
- ❌ **No custom storage:** Unity Catalog handles everything
- ❌ **No microservices:** Monolithic FastAPI app is sufficient for MVP
- ❌ **No GraphQL:** REST API simpler for Databricks deployment
- ❌ **No custom queue:** Databricks Jobs for async operations

### Minimal Viable Features
- Start with **AI-generated mode only** (skip manual + existing column for MVP)
- Start with **images only** (add PDF/audio display later)
- Skip **collaborative annotation** (single user for MVP)
- Skip **active learning** (random sampling sufficient for MVP)

## Notes

**Why This Architecture:**
- Databricks-native means minimal external dependencies
- Canonical Labels are the killer feature - invest heavily here
- APX framework already set up - leverage it
- Multimodal support validated with real use cases (not hypothetical)

**What Makes This Different:**
- Most tools make you re-label when changing prompts
- Most tools separate labeling from training data
- Most tools don't support multimodal natively
- We solve all three via Canonical Labels + Unity Catalog + APX

## Tasks Created

- [ ] #2 - Delta Table Schemas - Unity Catalog Foundation (parallel: false)
- [ ] #3 - Sheet Management API - Dataset Definition Service (parallel: true)
- [ ] #4 - Template Library API - Prompt Management Service (parallel: true)
- [ ] #5 - Canonical Labels API - Ground Truth Management (parallel: true)
- [ ] #6 - Q&A Generation Engine - Training Sheet Creation (parallel: false)
- [ ] #7 - Q&A Review UI - LABEL Stage Frontend (parallel: false)
- [ ] #8 - Frontend Stage Navigation - 7-Stage Workflow + TOOLS (parallel: false)
- [ ] #9 - JSONL Export + Seed Data - Training Format & Samples (parallel: true)
- [ ] #10 - Example Store Schema + API - Vector-Backed Few-Shot (P1) (parallel: true)
- [ ] #11 - Example Store UI - Upload & Similarity Testing (P1) (parallel: true)

**Total tasks:** 10 (8 MVP + 2 P1)
**Parallel tasks:** 6
**Sequential tasks:** 4
**Estimated total effort:** 156-208 hours (6-8 weeks for MVP)

**Critical Path:** #2 → #3-5 (parallel) → #6 → #7 → #8 → MVP Complete

**Next Steps After Epic Decomposition:**
1. ✅ Task files created with detailed acceptance criteria
2. Set up development branch strategy (or use main branch for MVP)
3. Start with Task 001 (Delta Table Schemas)
4. Schedule kickoff with domain expert for validation
