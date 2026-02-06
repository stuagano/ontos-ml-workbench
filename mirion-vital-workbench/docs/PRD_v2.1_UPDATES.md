# PRD v2.1 Update Summary

**Date:** February 5, 2026
**Updated by:** Claude (based on workflow redesign feedback)

---

## Overview

Updated the PRD to reflect clearer workflow terminology and structure, separating workflow stages from asset management tools.

---

## Key Changes

### 1. Workflow Stages Renamed

**Before (v2.0):**
```
DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

**After (v2.1):**
```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

### 2. TOOLS Section Added

Created a new TOOLS section for reusable assets (not workflow stages):
- **Prompt Templates** - Template library (moved from workflow)
- **Example Store** - Dynamic few-shot examples
- **DSPy Optimizer** - Prompt optimization runs

---

## Detailed Changes

### Stage 1: DATA
✅ **No change** - still about defining data sources

**Updated description:**
- Emphasis on Sheets as dataset pointers (not data copies)
- Clarified multimodal data fusion
- Added Unity Catalog browsing

### Stage 2: TEMPLATE → GENERATE
❌ **Removed** as workflow stage
✅ **Added** GENERATE stage

**What changed:**
- Old: "TEMPLATE" stage was about creating prompt templates
- New: "GENERATE" stage applies templates to data to create Q&A pairs
- Templates moved to TOOLS section

**User flow now:**
1. Select Sheet (from DATA)
2. Select Prompt Template (from TOOLS)
3. Configure generation mode (AI/manual/column)
4. Generate Q&A pairs → creates Assembly

### Stage 3: CURATE → LABEL
❌ **Split** into two concepts
✅ **Added** LABEL as distinct stage

**What changed:**
- Old: "CURATE" was ambiguous (create? review? both?)
- New: "GENERATE" creates, "LABEL" reviews
- Clear separation of concerns

**User flow now:**
1. Select Assembly (from GENERATE)
2. Review each Q&A pair
3. Approve, edit, reject, or flag
4. Track progress (X approved / Y total)

### Stage 4: TRAIN
✅ **Enhanced** - clarified Assembly export

**User flow now:**
1. Select curated Assembly
2. Configure train/val split
3. Preview JSONL export
4. Submit FMAPI training job
5. Model registered in UC

### Stages 5-7: DEPLOY, MONITOR, IMPROVE
✅ **No change** - kept as-is

---

## Terminology Updates

| Old Concept | New Concept | Description |
|------------|-------------|-------------|
| DataBits | Sheets | Dataset definitions (pointers to Unity Catalog) |
| DataBits | Prompt Templates | Reusable prompt definitions |
| DataBits | Assemblies | Materialized Q&A datasets |
| DataSets | Assemblies | Q&A datasets created by applying templates to sheets |
| Curation items | Q&A pairs | Individual training examples in an Assembly |

---

## Core Concept Definitions

### Sheet (Dataset Definition)
A lightweight metadata record pointing to Unity Catalog tables/volumes. Enables multimodal data fusion without copying data.

**Key fields:**
- `primary_table` - Main data source
- `secondary_sources` - Additional tables/volumes to join
- `join_keys` - How to join sources
- `sample_size` - Optional row limit

### Prompt Template
A reusable definition of how to interact with an LLM for a specific task. Lives in TOOLS section, not workflow.

**Key fields:**
- `system_prompt` - Sets model behavior
- `user_prompt_template` - Jinja2 template with placeholders
- `input_schema` / `output_schema` - Type definitions
- `base_model`, `temperature`, `max_tokens` - Model config

### Assembly (Q&A Dataset)
A materialized dataset of Q&A pairs created by applying a Prompt Template to a Sheet.

**Key fields:**
- `sheet_id` - Source data
- `template_id` - Prompt template used
- `status` - generating, review, approved, trained
- `total_pairs` / `approved_pairs` / `rejected_pairs` - Counts

### Q&A Pair
Individual training example within an Assembly. Structured as OpenAI messages format.

**Format:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a..."},
    {"role": "user", "content": "Classify this..."},
    {"role": "assistant", "content": "{\"result\": \"...\"}"}
  ]
}
```

---

## Data Model Changes

### Updated Tables

**Renamed:**
- `databits.databits` → `mirion_vital.workbench.sheets` (dataset pointers)
- (kept) `mirion_vital.workbench.templates` (prompt templates)
- (implicit) → `mirion_vital.workbench.assemblies` (Q&A datasets)

**New:**
- `mirion_vital.workbench.qa_pairs` - Individual Q&A pairs within assemblies

**Updated:**
- `curation_items` → merged into `qa_pairs` table
- Changed foreign keys: `databit_id` → `assembly_id`, `template_id`, `sheet_id`

### Schema Evolution

```sql
-- OLD (v2.0)
databits.databits (databit_id, version, content, modality, ...)
databits.curation_items (databit_id, item_ref, agent_label, ...)

-- NEW (v2.1)
mirion_vital.workbench.sheets (id, name, primary_table, secondary_sources, ...)
mirion_vital.workbench.templates (id, name, system_prompt, user_prompt_template, ...)
mirion_vital.workbench.assemblies (id, sheet_id, template_id, status, ...)
mirion_vital.workbench.qa_pairs (id, assembly_id, messages, status, ...)
```

---

## Feature Requirements Updates

### P0: Core Platform

**Before:**
- DataBit CRUD
- DataSet Management
- Text Annotation UI

**After:**
- Sheet Management (dataset pointers)
- Prompt Template Library (browse, create, publish)
- Assembly Generation (template + sheet → Q&A pairs)
- Q&A Review UI (approve, edit, reject)
- Template Testing (preview before generation)

### P1: Example Store + DSPy Native
✅ **No change** - kept as-is

### P2: Multimodal & Advanced
✅ **No change** - kept as-is

---

## TOOLS Section Details

### Location in UI

**Sidebar Structure:**
```
LIFECYCLE (Workflow Stages)
├─ 📊 Data
├─ ⚡ Generate
├─ ✓ Label
├─ 🎯 Train
├─ 🚀 Deploy
├─ 📈 Monitor
└─ 🔄 Improve

TOOLS (Asset Management)
├─ 📝 Prompt Templates
├─ 💎 Example Store
└─ 🤖 DSPy Optimizer
```

### Tool: Prompt Templates

**Purpose:** Create and manage reusable prompt templates

**Key Actions:**
- Browse template library (DataTable view)
- Create new template
- Edit draft templates
- Test template on sample data
- Publish template (makes immutable)
- Duplicate for variations

**Why separate from workflow?**
- Templates are IP, created once and reused many times
- Can be versioned and published independently
- Shared across teams and projects
- Applied to different datasets

### Tool: Example Store

**Purpose:** Manage dynamic few-shot examples

**Key Actions:**
- Browse examples (filter by domain, function)
- Upload new examples
- Edit existing examples
- View effectiveness metrics
- Prune low-performing examples

### Tool: DSPy Optimizer

**Purpose:** Systematically optimize prompts

**Key Actions:**
- Export Assemblies to DSPy format
- Launch optimization runs
- Monitor progress via MLflow
- Review optimized prompts
- Accept/reject optimizations

---

## Success Metrics (Unchanged)

| Metric | Target (6mo) | Target (12mo) |
|--------|--------------|---------------|
| Active Workbench Projects | 100 | 500 |
| DataBits Created (monthly) | 1M | 10M |
| Example Store Instances | 200 | 1,000 |
| Example Retrievals (monthly) | 10M | 100M |
| DSPy Optimization Runs (monthly) | 1,000 | 10,000 |
| DBU Consumption (attributed) | $500K ARR equivalent | $5M ARR equivalent |

---

## Implementation Impact

### Sprint Plan Updates Needed

The existing Sprint Plan (docs/SPRINT_PLAN.md) references old terminology:
- "DataBit" → should be "Sheet", "Template", or "Assembly" depending on context
- "Example Store Service" tasks still valid ✅
- "DSPy Integration" tasks still valid ✅

**Action:** Update Sprint Plan to use new terminology in task descriptions.

### Code Changes Required

**Backend:**
- No breaking changes if internal data structures stay the same
- API endpoints can maintain backward compatibility
- Database schema migration needed for renamed tables

**Frontend:**
- Rename `TemplatePage` → move to Tools section
- Rename `CuratePage` → split into `GeneratePage` + `LabelPage`
- Update sidebar navigation structure
- Update routing to reflect new stage names

**Low Risk:** Terminology changes don't affect core logic, mostly UI/UX refactoring.

---

## Backward Compatibility

### API Compatibility

**Option A: Break compatibility** (recommended for v2.1)
- Clean slate with new terminology
- Simpler codebase
- Clear documentation

**Option B: Maintain compatibility**
- Alias old endpoints (`/databits` → `/sheets`)
- Deprecation warnings
- Remove in v3.0

### Data Migration

**Required:**
- Rename tables: `databits.databits` → `mirion_vital.workbench.sheets`
- Update foreign keys: `databit_id` → `assembly_id` / `sheet_id` / `template_id`
- Migrate `curation_items` → `qa_pairs` with new schema

**Migration script needed:** Yes

---

## Documentation Updates

### Updated Files

✅ **PRD.md** - Updated with v2.1 terminology
- Added Terminology Update section
- Updated lifecycle diagram
- Rewritten stage descriptions
- Added TOOLS section
- Updated data model
- Updated feature requirements

### Files Needing Update

❌ **SPRINT_PLAN.md** - Uses old "DataBit" terminology
❌ **BACKLOG.md** - References old stage names
❌ **CLAUDE.md** - References old workflow
❌ **README.md** - References old workflow (if exists)
❌ **Frontend README** - References old pages

### New Documentation Needed

📝 **MIGRATION_GUIDE.md** - How to migrate from v2.0 → v2.1
📝 **UI_NAVIGATION_SPEC.md** - Detailed sidebar structure
📝 **TERMINOLOGY_GUIDE.md** - Quick reference for devs

---

## Questions for Product Team

### 1. Naming Confirmation

Are we satisfied with these names?
- GENERATE (vs ASSEMBLE, CREATE)
- LABEL (vs REVIEW, CURATE)
- Assembly (vs Q&A Dataset, Training Set)

### 2. Migration Timeline

When should v2.1 terminology take effect?
- Immediate (next deployment)
- After Sprint X completion
- Major version bump only

### 3. Backward Compatibility

Should we maintain v2.0 API compatibility?
- If yes, for how long?
- If no, what's the cutover plan?

---

## Next Steps

### Immediate (This Week)

1. ✅ Update PRD with v2.1 terminology
2. ⏳ Get product team sign-off on terminology
3. ⏳ Update SPRINT_PLAN.md with new terms
4. ⏳ Update BACKLOG.md with new stage names

### Short-term (Next Sprint)

1. Create migration guide
2. Update CLAUDE.md for AI assistant context
3. Design sidebar navigation (visual mockups)
4. Plan frontend refactoring (page renames)

### Long-term (Next Quarter)

1. Execute frontend refactoring
2. Database schema migration
3. API versioning (if maintaining compatibility)
4. User-facing documentation updates

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Lead | | | ⏳ Pending |
| Engineering Lead | | | ⏳ Pending |
| Design Lead | | | ⏳ Pending |
| User (Stuart) | | Feb 5, 2026 | ✅ Requested |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | Feb 5, 2026 | Workflow terminology update |
| 2.0 | Jan 30, 2026 | Initial PRD with Example Store + DSPy |
