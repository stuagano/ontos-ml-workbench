# Documentation Update Plan

**Date:** February 5, 2026  
**Goal:** Ensure all documentation reflects the validated PRD v2.3 data model

---

## Current State Assessment

### Documentation Files Inventory

**Core Documentation:**
- `README.md` - Still uses old terminology (TEMPLATE → CURATE workflow)
- `CLAUDE.md` - Uses old workflow terminology
- `docs/PRD.md` - Currently at v2.1, needs update to v2.3
- `CURRENT_STATUS.md` - Partially updated with v2.3 concepts

**Design Documents:**
- `CANONICAL_LABELS_DESIGN.md` - ✅ Complete
- `MULTIPLE_LABELSETS_DESIGN.md` - ✅ Complete
- `MULTIMODAL_DATA_FLOW.md` - ✅ Complete
- `USAGE_CONSTRAINTS_DESIGN.md` - ✅ Complete
- `USE_CASE_VALIDATION_ENTITY_EXTRACTION.md` - ✅ Complete
- `USE_CASE_VALIDATION_MANUFACTURING_DEFECTS.md` - ✅ Complete
- `VALIDATION_SUMMARY.md` - ✅ Complete

**Outdated/Legacy:**
- `WORKFLOW_DESIGN.md` - Pre v2.1 workflow
- `WORKFLOW_REDESIGN.md` - Transition document
- `NAVIGATION_REDESIGN_COMPLETE.md` - Implementation status
- `STAGE_STATUS.md` - Stage implementation status
- `VERTEX_PATTERN_DESIGN.md` - Vertex AI pattern (still relevant?)
- `docs/PRD_v2.1_UPDATES.md` - Transition doc for v2.1

**Deployment/Operations:**
- `DEPLOYMENT_SUCCESS.md`, `DEPLOYMENT_UPDATE.md` - Old deployment docs
- `DATA_LOADING_OPTIMIZATION.md` - Performance notes
- `PERFORMANCE_OPTIMIZATION.md` - Performance notes
- `WORKFLOW_SETUP_GUIDE.md` - Setup guide
- `GETTING_STARTED.md` - User guide
- `CLEANUP_SUMMARY.md`, `DEBUG_LOGGING_ADDED.md` - Implementation notes

**Frontend-Specific:**
- `frontend/DEVELOPMENT_STATUS.md` - Frontend status
- `frontend/MODULE_ARCHITECTURE.md` - Module system
- `frontend/MODULE_FLOW_DIAGRAM.md` - Module flows
- `frontend/MODULES_READY.md`, `frontend/TOOLBOX_INVENTORY.md` - Module inventory
- `frontend/APX_SETUP.md`, `frontend/APX_QUICKSTART.md` - APX integration
- `frontend/MODULE_DEV_WITH_APX.md` - Module development

---

## Inconsistencies Identified

### 1. Workflow Terminology

**Problem:** Different documents use different workflow terminology

| Document | Current Terminology | Should Be |
|----------|---------------------|-----------|
| README.md | TEMPLATE → CURATE | DATA → GENERATE → LABEL |
| CLAUDE.md | TEMPLATE → CURATE | DATA → GENERATE → LABEL |
| Frontend pages | Some use Generate, some use Curate | Generate + Label |

### 2. Data Model Version

**Problem:** PRD is at v2.1, but validated model is v2.3

**Gap:**
- v2.1 → v2.2: Usage constraints
- v2.2 → v2.3: Canonical labels + multiple labelsets

### 3. Terminology Inconsistency

**Problem:** Different names for same concepts

| Concept | Various Names Used |
|---------|-------------------|
| Training Sheet | Assembly, Dataset, DataSet, Q&A Pairs |
| Sheet | DataBit, Data Source, Source Data |
| Template | Prompt Template, Template Definition |

### 4. Schema Documentation

**Problem:** Schema files don't reflect v2.3 model

**Files to Update:**
- `schemas/lakebase.sql` - Needs canonical_labels table
- Backend models - Need canonical label models
- Frontend types - Need canonical label types

---

## Update Strategy

### Phase 1: Core Documentation (High Priority)

**Goal:** Update foundational documents to v2.3

1. **docs/PRD.md** → Update v2.1 to v2.3
   - Add canonical labels section
   - Add multiple labelsets design
   - Add complete v2.3 schema
   - Update workflow diagrams

2. **README.md** → Update workflow terminology
   - Change TEMPLATE → CURATE to DATA → GENERATE → LABEL
   - Add canonical labels overview
   - Update architecture diagram
   - Reference validation documents

3. **CLAUDE.md** → Update developer guide
   - Update workflow terminology
   - Update data model description
   - Add canonical labels to architecture
   - Update terminology glossary

4. **CURRENT_STATUS.md** → Complete v2.3 status
   - Mark all v2.3 features as "Design Complete"
   - Add implementation roadmap
   - Update changelog

### Phase 2: Consolidate Design Documents (Medium Priority)

**Goal:** Organize design documents into coherent structure

5. **Create `/docs/design/` directory**
   - Move all design documents here
   - Create design index document

6. **Archive Outdated Documents**
   - Move transition docs to `docs/archive/`
   - Keep only current designs active

### Phase 3: Schema & Code Updates (High Priority)

**Goal:** Implement v2.3 schema in codebase

7. **schemas/lakebase.sql** → Add v2.3 tables
   - Add canonical_labels table
   - Update qa_pairs with canonical_label_id
   - Update templates with label_type
   - Add model_training_lineage table (if not present)

8. **Backend Models** → Add canonical label models
   - `backend/app/models/canonical_label.py`
   - Update `backend/app/models/sheet.py`
   - Update `backend/app/models/assembly.py` (or rename to training_sheet.py)

9. **Backend API** → Add canonical label endpoints
   - `backend/app/api/v1/endpoints/canonical_labels.py`
   - Update existing endpoints

10. **Frontend Types** → Add canonical label types
    - `frontend/src/types/index.ts`
    - Add CanonicalLabel interface
    - Update TrainingSheet interface

### Phase 4: User-Facing Documentation (Medium Priority)

**Goal:** Update guides and tutorials

11. **GETTING_STARTED.md** → Update for v2.3
    - Add canonical labeling workflow
    - Update terminology
    - Add validation use case examples

12. **WORKFLOW_SETUP_GUIDE.md** → Update workflow steps
    - Update GENERATE + LABEL stages
    - Add canonical labeling tool section

### Phase 5: Clean Up (Low Priority)

**Goal:** Remove redundant/outdated documents

13. **Archive Legacy Documents**
    - Move to `docs/archive/`:
      - `WORKFLOW_DESIGN.md`
      - `WORKFLOW_REDESIGN.md`
      - `NAVIGATION_REDESIGN_COMPLETE.md`
      - `DEPLOYMENT_SUCCESS.md`
      - `CLEANUP_SUMMARY.md`
      - `DEBUG_LOGGING_ADDED.md`

14. **Create Documentation Index**
    - `docs/INDEX.md` - Master index of all docs
    - Organize by category (Design, API, User Guides, Operations)

---

## Execution Order

### Immediate (Today)

1. ✅ VALIDATION_SUMMARY.md - Complete
2. 🔄 Update PRD.md to v2.3
3. 🔄 Update CLAUDE.md
4. 🔄 Update README.md
5. 🔄 Update CURRENT_STATUS.md

### Next (This Week)

6. Update schemas/lakebase.sql
7. Add backend canonical label models
8. Add backend canonical label API endpoints
9. Update frontend types
10. Add frontend canonical label UI components

### Later (Next Sprint)

11. Update GETTING_STARTED.md
12. Update WORKFLOW_SETUP_GUIDE.md
13. Create docs/design/ directory and organize
14. Archive legacy documents
15. Create docs/INDEX.md

---

## Success Criteria

✅ All core docs reference PRD v2.3  
✅ Workflow terminology consistent (DATA → GENERATE → LABEL)  
✅ Canonical labels documented in all relevant places  
✅ Schema matches PRD v2.3  
✅ Backend models match PRD v2.3  
✅ Frontend types match PRD v2.3  
✅ No contradictions between documents  
✅ Clear navigation from README to detailed design docs  
✅ Legacy/outdated docs archived  

---

## Notes

- Keep validation documents as reference material (don't archive)
- Design documents are valuable - consolidate, don't delete
- Implementation notes (DEPLOYMENT_SUCCESS, etc.) can be archived after 6 months
- Frontend-specific docs (APX setup, module architecture) stay in `frontend/`
- Maintain clear separation: docs/ (product), frontend/ (FE), backend/ (BE), schemas/ (DB)
