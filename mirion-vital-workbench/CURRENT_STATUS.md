# Mirion VITAL Workbench - Current Status

**Last Updated:** 2026-02-05  
**PRD Version:** v2.3  
**Status:** ✅ Design Complete & Validated, Ready for Implementation

---

## Executive Summary

### PRD v2.3 Status

**✅ Design Phase: COMPLETE**
- All core concepts defined and validated
- Data model validated across Document AI and Vision AI use cases
- No gaps or breaking changes identified
- Documentation consolidated and consistent

**🔄 Implementation Phase: IN PROGRESS**
- Documentation updated (PRD, CLAUDE.md, README.md) ✅
- Schema implementation pending
- Backend API implementation pending
- Frontend UI implementation pending

### Key Features (All Validated)

| Feature | Version | Status | Validation |
|---------|---------|--------|------------|
| Sheets (multimodal data) | v2.1 | ✅ Complete | Medical invoices + PCB images |
| Training Sheets | v2.1 | ✅ Complete | Q&A generation validated |
| Lineage Tracking | v2.1 | ✅ Complete | Schema defined |
| Usage Constraints | v2.2 | ✅ Complete | PHI compliance validated |
| Canonical Labels | v2.3 | ✅ Complete | Label reuse validated |
| Multiple Labelsets | v2.3 | ✅ Complete | 4 labelsets per item validated |

See **VALIDATION_SUMMARY.md** for complete validation results.

---

## ✅ Completed Work

### 1. Navigation Redesign
**Status:** Implementation Complete, Build Successful

- Separated LIFECYCLE stages from TOOLS section
- Renamed "Curate" → "Generate" to better reflect Q&A pair generation
- Created dedicated TOOLS section with overlay UI:
  - **Prompt Templates** - Reusable prompt library (Alt+T)
  - **Example Store** - Dynamic few-shot examples (Alt+E)
  - **DSPy Optimizer** - Automated prompt optimization (Alt+D)
- Removed template stage from main workflow routing
- Frontend builds successfully with no TypeScript errors

**Files Modified:**
- `frontend/src/components/apx/AppLayout.tsx`
- `frontend/src/AppWithSidebar.tsx`
- `frontend/src/pages/TemplatePage.tsx`
- `frontend/src/pages/CuratePage.tsx`

### 2. Terminology Updates
**Status:** Complete in PRD, Pending Backend Implementation

- **Assembly → Training Sheet** throughout documentation
- More user-friendly term for Q&A pair materialization step
- Aligns with Google Vertex AI terminology

### 3. Labeling Workflow Clarification
**Status:** Complete in PRD

Added three labeling modes with explicit quality gates:

| Mode | Description | Initial Status |
|------|-------------|----------------|
| **AI-Generated** | LLM generates Q&A pairs from data | `unlabeled` |
| **Manual** | User writes Q&A pairs | `labeled` |
| **Use Existing Column** | Map existing data column | `labeled` (if trusted) |

**Expert Review Required:** Only `labeled` pairs can be exported for training.

Review actions: Approve, Edit, Reject, Flag

### 4. Multi-Model Lineage Tracking
**Status:** Complete in PRD (Option B - Explicit Lineage)

Added `model_training_lineage` table to track:
- Which models used which Training Sheets
- Exact Q&A pair IDs used in each training run
- Training configuration and MLflow run linkage
- Complete provenance chain

**Benefits:**
- Reuse Training Sheets across multiple models
- Trace deployed model behavior back to source data
- Compare models trained on same data
- Support iterative training and cross-domain transfer

### 5. Usage Constraints & Data Governance
**Status:** Complete in PRD v2.2

Added governance layer to control what Q&A pairs can be used for, independent of quality approval:

**Two Orthogonal Dimensions:**
- **Status** (Quality Gate): `unlabeled` → `labeled` (expert approval)
- **Usage Constraints** (Governance): What can this data be used for?

**New Fields in `qa_pairs` table:**
- `allowed_uses` ARRAY<STRING> - Permitted usage types
- `prohibited_uses` ARRAY<STRING> - Explicitly forbidden uses
- `usage_reason` TEXT - Compliance/business justification
- `data_classification` STRING - public, internal, confidential, restricted

**Usage Types:**
- `training` - Fine-tuning (permanent in weights)
- `validation` - Training eval (permanent)
- `evaluation` - Benchmarking (temporary)
- `few_shot` - Runtime examples (ephemeral)
- `testing` - Manual QA (temporary)

**Real-World Example:**
Mammogram with PHI:
- ✅ `allowed_uses: ['few_shot', 'testing', 'evaluation']`
- ❌ `prohibited_uses: ['training', 'validation']`
- Reason: "Contains PHI - HIPAA compliance prohibits model training"

**Key Features:**
- Dual quality gates in TRAIN stage (status + governance)
- Unity Catalog tag inheritance (auto-detect PII/PHI)
- Usage constraint audit trail
- UI indicators showing why pairs are excluded

### 6. Canonical Labels & Label Reuse (NEW)
**Status:** Complete in PRD v2.3

Added ground truth layer that enables **"label once, reuse everywhere"** workflow:

**The Problem:**
Without canonical labels, experts must re-label the same data every time you generate new Q&A pairs with improved templates.

**The Solution:**
Canonical Labels are expert-validated ground truth labels stored **independent** of Q&A pairs and Training Sheets.

**New Table: `canonical_labels`**
```sql
canonical_labels (
  id, sheet_id, item_ref,           -- Links to source data
  label_data VARIANT,                -- Expert's ground truth
  label_type STRING,                 -- entity_extraction, classification, etc.
  allowed_uses, prohibited_uses,     -- Governance constraints
  labeled_by, labeled_at,            -- Audit trail
  version INT                        -- Version control
)
```

**Updated: `qa_pairs` table**
- Added `canonical_label_id` field (links to canonical label)
- Added `labeling_mode = 'canonical'` (Q&A pair uses canonical label)

**Two Labeling Workflows:**

**Mode A: Label Q&A Pairs (Training Sheet Review)**
- Expert reviews Q&A pairs in LABEL stage
- When approved/edited, creates canonical label
- Future Training Sheets automatically reuse label

**Mode B: Label Source Data Directly (Canonical Labeling Tool)**
- New TOOLS section: Canonical Labeling Tool
- Expert labels source data before generating Q&A pairs
- Labels immediately available for all Training Sheets

**Example Workflow:**
```
January:
- Generate Training Sheet v1 (Template v1)
- Expert labels 500 items → Creates 500 canonical labels

February:
- Improve Template v2 (better prompt)
- Generate Training Sheet v2 (Template v2)
- ALL 500 items pre-approved automatically!
- Zero expert time required!
```

**Benefits:**
- ✅ Expert labels once, reused across all Training Sheets
- ✅ Template iteration is fast and cheap
- ✅ Consistent ground truth across template versions
- ✅ Create test sets independent of training data
- ✅ Version control and audit trail for labels

---

## 📋 Data Model Updates (PRD v2.3)

### New Table: `canonical_labels` (v2.3)
```sql
mirion_vital.workbench.canonical_labels (
  id, sheet_id, item_ref,
  label_type STRING,                -- entity_extraction, classification, qa, etc.
  label_data VARIANT,               -- Expert's ground truth (JSON)
  confidence STRING,                -- high, medium, low
  notes TEXT,
  allowed_uses ARRAY<STRING>,
  prohibited_uses ARRAY<STRING>,
  usage_reason TEXT,
  data_classification STRING,
  labeled_by, labeled_at,
  last_modified_by, last_modified_at,
  version INT,                      -- Label versioning
  created_at,
  
  -- Composite unique key: One label per (sheet_id, item_ref, label_type)
  UNIQUE(sheet_id, item_ref, label_type)
)
```

**Multiple Labelsets Per Item:**
- Same source item can have multiple canonical labels for different tasks
- Example: `invoice_042.pdf` can have:
  - Entity extraction label (extract patient name, DOB, amounts)
  - Classification label (emergency vs. routine)
  - Summarization label (generate billing summary)
  - Document type label (invoice vs. EOB)
- Each labelset is independent with its own governance constraints
- Composite key `(sheet_id, item_ref, label_type)` ensures one label per task type

### New Table: `model_training_lineage` (v2.1)
```sql
mirion_vital.workbench.model_training_lineage (
  id,
  model_id,                    -- Unity Catalog model ID
  model_name, model_version,
  training_sheet_id,           -- Source Training Sheet
  qa_pair_ids,                 -- Array of QA pair IDs used (only labeled)
  train_pair_count, val_pair_count,
  training_config,             -- JSON: base_model, epochs, lr, etc.
  mlflow_run_id,               -- MLflow experiment tracking
  fmapi_job_id,                -- Foundation Model API job
  trained_at, created_by
)
```

### New Table: `usage_constraint_audit` (v2.2)
```sql
mirion_vital.workbench.usage_constraint_audit (
  id, qa_pair_id,
  old_allowed_uses, new_allowed_uses,
  old_prohibited_uses, new_prohibited_uses,
  old_data_classification, new_data_classification,
  reason TEXT,
  modified_by, modified_at
)
```

### Updated Tables:
- `training_sheets` - Added `labeling_mode` field, separate counters (v2.1)
- `qa_pairs` - Added `status`, `allowed_uses`, `prohibited_uses`, `usage_reason`, `data_classification` (v2.2) + `canonical_label_id`, `labeling_mode='canonical'` (v2.3)
- `feedback` - Links back to models and training data (v2.1)

---

## 🎯 Lineage Chain

```
Unity Catalog Tables/Volumes
    ↓
Sheet (dataset pointer + metadata)
    ↓
Training Sheet (Sheet + Template → Q&A pairs)
    ↓
Model Training Run (Training Sheet → Fine-tuned Model)
    ↓
Deployed Model/Agent
```

**Key Queries Supported:**
1. Which models were trained on Training Sheet X?
2. Which Training Sheet was used to train Model Y?
3. Show me the actual Q&A pairs used to train Model Y
4. Compare models trained on the same Training Sheet

---

## 🔄 Workflow (Updated)

### LIFECYCLE Stages
1. **DATA** - Import from Unity Catalog
2. **GENERATE** - Create Q&A pairs (AI/Manual/Existing Column)
3. **LABEL** - Expert review & approval
4. **TRAIN** - Fine-tune with Foundation Model API
5. **DEPLOY** - Serve via Model Serving
6. **MONITOR** - Track performance & collect feedback
7. **IMPROVE** - Iterate based on feedback

### TOOLS Section (Always Accessible)
- **Prompt Templates** - Reusable prompt library
- **Example Store** - Dynamic few-shot learning
- **DSPy Optimizer** - Automated optimization

---

## 🚀 Ready for Implementation

### Next Steps (When You're Ready):

**Option A: Test UI Changes**
```bash
cd frontend
npm run dev
```
Test the navigation redesign in browser:
- Verify Tools section renders correctly
- Test keyboard shortcuts (Alt+T, Alt+E, Alt+D)
- Confirm "Generate" label appears instead of "Curate"

**Option B: Backend Alignment**
Update backend terminology to match PRD:
- Rename `assemblies` → `training_sheets` endpoints
- Add `model_training_lineage` API endpoints
- Update database schema with new tables/fields
- Add lineage recording to training pipeline

**Option C: Schema Migration**
Create SQL migration scripts:
- Rename `assemblies` table → `training_sheets`
- Add `model_training_lineage` table
- Update foreign key references
- Add labeling_mode and status fields

---

## 📊 Git Status

**Modified Files:** 43 modified, 4 deleted, 46 new untracked files  
**Branch:** main  
**Key Changes:**
- PRD v2.1 with complete lineage design
- Navigation redesign implemented
- Frontend builds successfully
- Multiple design and status documents created

---

## 💡 Design Decisions Made

1. ✅ Chose **explicit lineage tracking** (Option B) over simple approach
2. ✅ Chose **Training Sheet** terminology over "Assembly"
3. ✅ Chose **expert review** as quality gate before training
4. ✅ Chose **separate TOOLS section** over integrated workflow
5. ✅ Chose **overlay UI** for tools vs. dedicated pages
6. ✅ Chose **usage constraints** (governance) separate from status (quality)
7. ✅ Chose **dual arrays** (`allowed_uses` + `prohibited_uses`) for explicit control
8. ✅ Chose **canonical labels** (ground truth layer) over Q&A-pair-only labeling
9. ✅ Chose **two labeling modes** (Training Sheet review + standalone tool)

---

## 📚 Key Documents

- `docs/PRD.md` - Product Requirements v2.3 (complete with canonical labels)
- `docs/PRD_v2.1_UPDATES.md` - Change summary and migration guide
- `USAGE_CONSTRAINTS_DESIGN.md` - v2.2 feature design (governance)
- `CANONICAL_LABELS_DESIGN.md` - v2.3 feature design (label reuse)
- `MULTIPLE_LABELSETS_DESIGN.md` - Multiple labels per item design
- `MULTIMODAL_DATA_FLOW.md` - Multimodal source data handling
- `USE_CASE_VALIDATION_ENTITY_EXTRACTION.md` - End-to-end validation
- `NAVIGATION_REDESIGN_COMPLETE.md` - Implementation details
- `CURRENT_STATUS.md` - This document

---

## 🆕 What Changed in v2.3

**Added: Canonical Labels (Label Once, Reuse Everywhere)**

The critical addition is separating **labels from Q&A pairs** - storing expert ground truth at the source data level:

**Before (v2.2):**
- Expert labels Q&A pairs within Training Sheets
- Labels "trapped" in specific Training Sheet
- Re-generate with improved template → Expert must re-label everything

**After (v2.3):**
- Expert labels source data (creates canonical labels)
- Canonical labels reused across all Training Sheets
- Re-generate with improved template → ALL items pre-approved automatically

**Example Scenario:**
```
Month 1: Expert labels 500 invoices (creates 500 canonical labels)
Month 2: Improve prompt template → Generate new Training Sheet
Result: 500 items pre-approved, 0 items need review!
```

**Key Features:**
- New `canonical_labels` table (ground truth layer)
- `qa_pairs` table links to canonical labels
- Two labeling workflows:
  - Mode A: Label during Training Sheet review (creates canonical labels)
  - Mode B: Label source data directly (Canonical Labeling Tool)
- Automatic label reuse when generating new Training Sheets
- Version control and audit trail for labels

**Impact:**
- Dramatically reduces expert time for template iteration
- Consistent ground truth across all Training Sheets
- Create test sets independent of training workflow
- Better separation of concerns (data labeling vs. Q&A generation)

---

## 🆕 What Changed in v2.2

**Added: Usage Constraints & Data Governance**

The critical addition is separating **quality approval** from **compliance/governance rules**:

**Before (v2.1):**
- Q&A pairs had only `status` (unlabeled/labeled/rejected)
- Implicit assumption: labeled = can be used for anything
- No way to express: "Approved quality, but prohibited from training due to PHI"

**After (v2.2):**
- Two orthogonal dimensions:
  - **Status**: Quality gate (unlabeled → labeled)
  - **Usage Constraints**: Governance rules (what can this be used for?)
- Enables healthcare/compliance scenarios like mammogram images:
  - High quality + approved by radiologist
  - BUT prohibited from training (HIPAA - can't store PHI in weights)
  - CAN be used for few-shot examples (ephemeral, not persisted)

**Impact:**
- TRAIN stage: Dual filters (status=labeled AND training allowed)
- Example Store: Separate filter (few_shot allowed)
- Unity Catalog integration: Auto-detect PII/PHI tags
- Audit trail: Track why constraints were changed
- UI: Show explicit reasons ("Training Prohibited - PHI")

This makes the platform production-ready for regulated industries (healthcare, finance, legal).

---

**Status:** All design work complete. Frontend implementation complete and builds successfully. Backend implementation pending user direction.

---

## 📋 Implementation Roadmap

### Phase 1: Schema & Backend (Week 1-2)

**Priority: HIGH**

1. **Update Schema Files**
   - Update `schemas/lakebase.sql` with v2.3 tables
   - Add `canonical_labels` table with composite key
   - Update `qa_pairs` with `canonical_label_id`
   - Update `templates` with `label_type`
   - Ensure `model_training_lineage` exists

2. **Backend Models**
   - Create `backend/app/models/canonical_label.py`
   - Update `backend/app/models/sheet.py`
   - Rename `backend/app/models/assembly.py` → `training_sheet.py`
   - Update all imports

3. **Backend API Endpoints**
   - Create `backend/app/api/v1/endpoints/canonical_labels.py`
     - GET /canonical-labels (list with filters)
     - GET /canonical-labels/{id}
     - POST /canonical-labels (create)
     - PUT /canonical-labels/{id} (update)
     - GET /canonical-labels/by-item (lookup by sheet_id + item_ref + label_type)
   - Update `backend/app/api/v1/endpoints/training_sheets.py`
     - Add canonical label lookup logic in generation
   - Update `backend/app/api/v1/endpoints/sheets.py`
     - Add endpoints for canonical label statistics

4. **Backend Services**
   - Create `backend/app/services/canonical_label_service.py`
   - Update `backend/app/services/training_sheet_service.py` with lookup logic
   - Add governance enforcement in training service

### Phase 2: Frontend UI (Week 2-3)

**Priority: HIGH**

1. **TypeScript Types**
   - Update `frontend/src/types/index.ts`
   - Add `CanonicalLabel` interface
   - Update `TrainingSheet` interface
   - Update `QAPair` interface with `canonical_label_id`

2. **GENERATE Page Updates**
   - Show canonical label lookup status
   - Display "X items pre-approved" banner
   - Add toggle: "Use canonical labels" (default: true)

3. **LABEL Page Updates**
   - Show canonical label source (Mode A vs Mode B)
   - Add "View Canonical Label" action
   - Show reuse count (how many Training Sheets use this label)

4. **New: Canonical Labeling Tool (TOOLS section)**
   - Create `frontend/src/pages/CanonicalLabelingTool.tsx`
   - Sheet selector
   - Item browser (with filters)
   - Label type selector (entity_extraction, classification, etc.)
   - Label editor (VARIANT field - flexible JSON editor)
   - Governance controls (allowed_uses, prohibited_uses)
   - Save/Update/Version controls

5. **UI Components**
   - Create `CanonicalLabelBadge` component (shows reuse count)
   - Create `UsageConstraintIndicator` component (visual governance status)
   - Update `DataTable` to show canonical label status

### Phase 3: Integration & Testing (Week 3-4)

**Priority: MEDIUM**

1. **End-to-End Testing**
   - Test Mode A workflow (Training Sheet review → canonical label creation)
   - Test Mode B workflow (Direct labeling → Training Sheet generation)
   - Test label reuse across multiple Training Sheets
   - Test governance enforcement (usage constraints)
   - Test multiple labelsets per item

2. **Validation with Real Data**
   - Load sample medical invoices
   - Load sample PCB defect images
   - Verify multimodal data flow
   - Verify governance constraints work

3. **Documentation**
   - Create user guide for canonical labeling
   - Create developer guide for extending label types
   - Update API documentation

### Phase 4: Advanced Features (Week 4+)

**Priority: LOW**

1. **Canonical Label Versioning**
   - UI for viewing label history
   - Diff viewer for label changes
   - Rollback capability

2. **Bulk Operations**
   - Bulk canonical label import
   - Bulk governance constraint updates
   - Batch label validation

3. **Analytics Dashboard**
   - Label reuse metrics (cost savings)
   - Canonical label coverage (% of items labeled)
   - Governance compliance reports

---

## 🎯 Next Steps

### Immediate (Today)

1. ✅ Update PRD.md to v2.3
2. ✅ Update CLAUDE.md
3. ✅ Update README.md
4. ✅ Update CURRENT_STATUS.md
5. **Next:** Update `schemas/lakebase.sql`

### This Week

- Implement schema changes
- Create backend models
- Implement canonical label API endpoints
- Update frontend types

### Next Week

- Build Canonical Labeling Tool UI
- Update GENERATE and LABEL pages
- Integration testing
- End-to-end validation

---

## 📚 Reference Documents

- **PRD v2.3**: `docs/PRD.md` - Complete product requirements
- **Validation Summary**: `VALIDATION_SUMMARY.md` - Validation results across use cases
- **Design Documents**:
  - `CANONICAL_LABELS_DESIGN.md` - Canonical labels feature design
  - `MULTIPLE_LABELSETS_DESIGN.md` - Multiple labelsets design
  - `USAGE_CONSTRAINTS_DESIGN.md` - Usage constraints design
  - `MULTIMODAL_DATA_FLOW.md` - Multimodal data handling
- **Use Case Validations**:
  - `USE_CASE_VALIDATION_ENTITY_EXTRACTION.md` - Medical invoice validation
  - `USE_CASE_VALIDATION_MANUFACTURING_DEFECTS.md` - PCB defect validation
- **Developer Guides**:
  - `CLAUDE.md` - Developer quick reference
  - `DOCUMENTATION_UPDATE_PLAN.md` - Documentation strategy

---

**Last Updated:** 2026-02-05  
**Next Review:** After Phase 1 completion
