# Documentation Cleanup Plan

## Current State Analysis

### Problems Identified
1. **53 markdown files in root directory** - impossible to navigate
2. **Duplicate status files** - CURRENT_STATUS, STAGE_STATUS, SESSION_SUMMARY
3. **Orphaned completion markers** - 15+ files ending in _COMPLETE.md
4. **Mixed epic numbering** - Deleted 001-010, untracked 2-11
5. **No clear entry point** - Users don't know where to start
6. **Implementation docs mixed with design docs** - No clear separation

### Desired State
```
mirion-vital-workbench/
├── README.md                          # Main entry point
├── QUICKSTART.md                      # Getting started guide
├── docs/
│   ├── architecture/                  # Design decisions
│   │   ├── canonical-labels.md
│   │   ├── multimodal-data-flow.md
│   │   ├── vertex-pattern.md
│   │   └── workflow-design.md
│   ├── implementation/                # Completed work
│   │   ├── backend-models.md
│   │   ├── canonical-labels-api.md
│   │   ├── frontend-components.md
│   │   ├── integration-status.md
│   │   └── navigation-redesign.md
│   ├── planning/                      # Future work
│   │   ├── labelsets-workflow.md
│   │   ├── performance-optimization.md
│   │   └── seed-data-plan.md
│   ├── validation/                    # Use case validation
│   │   ├── defect-detection-workflow.md
│   │   ├── entity-extraction.md
│   │   └── manufacturing-defects.md
│   └── prd/                          # Product requirements
│       └── v2.3-implementation-status.md
├── .claude/
│   └── epics/
│       └── vital-workbench/
│           ├── epic.md               # Master epic doc
│           ├── 2.md                  # Task 2: Sheet Management API
│           ├── 3.md                  # Task 3: Template Library API
│           ├── 4.md                  # Task 4: Canonical Labels API
│           ├── 5.md                  # Task 5: Q&A Generation Engine
│           ├── 6.md                  # Task 6: Q&A Review UI
│           ├── 7.md                  # Task 7: Stage Navigation
│           ├── 8.md                  # Task 8: JSONL Export
│           ├── 9.md                  # Task 9: Example Store API (P1)
│           ├── 10.md                 # Task 10: Example Store UI (P1)
│           └── 11.md                 # Task 11: DSPy Integration (P1)
└── schemas/                          # Database schemas
    └── README.md
```

## Cleanup Actions

### Phase 1: Create Directory Structure
```bash
mkdir -p docs/{architecture,implementation,planning,validation,prd}
```

### Phase 2: Categorize and Move Files

#### Architecture (Design Decisions)
- CANONICAL_LABELS_DESIGN.md → docs/architecture/canonical-labels.md
- MULTIMODAL_DATA_FLOW.md → docs/architecture/multimodal-data-flow.md
- VERTEX_PATTERN_DESIGN.md → docs/architecture/vertex-pattern.md
- WORKFLOW_DESIGN.md → docs/architecture/workflow-design.md
- MULTIPLE_LABELSETS_DESIGN.md → docs/architecture/multiple-labelsets.md
- USAGE_CONSTRAINTS_DESIGN.md → docs/architecture/usage-constraints.md

#### Implementation (Completed Work)
- BACKEND_MODELS_UPDATE_COMPLETE.md → docs/implementation/backend-models.md
- CANONICAL_LABELS_API_COMPLETE.md → docs/implementation/canonical-labels-api.md
- CANONICAL_LABELS_IMPLEMENTATION_COMPLETE.md → docs/implementation/canonical-labels-full.md
- CANONICAL_LABELS_READY.md → docs/implementation/canonical-labels-ready.md
- REACT_COMPONENTS_COMPLETE.md → docs/implementation/frontend-components.md
- INTEGRATION_COMPLETE.md → docs/implementation/integration-status.md
- NAVIGATION_REDESIGN_COMPLETE.md → docs/implementation/navigation-redesign.md
- FRONTEND_TYPES_UPDATE_COMPLETE.md → docs/implementation/frontend-types.md
- TRAINING_JOB_MANAGEMENT_COMPLETE.md → docs/implementation/training-job-management.md

#### Planning (Future Work)
- LABELSETS_IMPLEMENTATION_PLAN.md → docs/planning/labelsets-plan.md
- LABELSETS_WORKFLOW.md → docs/planning/labelsets-workflow.md
- PERFORMANCE_OPTIMIZATION.md → docs/planning/performance-optimization.md
- SEED_DATA_PLAN.md → docs/planning/seed-data.md
- CURATED_DATASETS_IMPLEMENTATION.md → docs/planning/curated-datasets.md
- DOCUMENTATION_UPDATE_PLAN.md → docs/planning/documentation-update.md

#### Validation (Use Cases)
- USE_CASE_VALIDATION_ENTITY_EXTRACTION.md → docs/validation/entity-extraction.md
- USE_CASE_VALIDATION_MANUFACTURING_DEFECTS.md → docs/validation/manufacturing-defects.md
- DEFECT_DETECTION_WORKFLOW_VALIDATION.md → docs/validation/defect-detection-workflow.md

#### PRD
- PRD_V2.3_IMPLEMENTATION_STATUS.md → docs/prd/v2.3-implementation-status.md

### Phase 3: Consolidate Status Files

**Merge into single STATUS.md:**
- CURRENT_STATUS.md
- STAGE_STATUS.md
- SESSION_SUMMARY.md
- VALIDATION_SUMMARY.md
- DEPLOYMENT_SUCCESS.md
- DEPLOYMENT_UPDATE.md

### Phase 4: Delete Obsolete Files

**Completion Markers (info captured in implementation docs):**
- CCPM_SETUP_COMPLETE.md
- DEBUG_LOGGING_ADDED.md
- DOCUMENTATION_UPDATE_COMPLETE.md
- PLUGINS_INSTALLED.md
- CLEANUP_SUMMARY.md

**Redundant/Outdated:**
- PAGE_NAMING_PROPOSAL.md (superseded by navigation redesign)
- PAGE_NAMING_ALTERNATIVE.md
- GENERATE_PAGE_NAMING.md
- NAVIGATION_UPDATE.md (captured in navigation-redesign)
- WORKFLOW_REDESIGN.md (captured in workflow-design)
- WORKFLOW_SETUP_GUIDE.md (captured in QUICKSTART)

**Analysis Docs (info captured elsewhere):**
- FRONTEND_ALIGNMENT_CHECK.md
- FRONTEND_BACKEND_ALIGNMENT_ANALYSIS.md
- LIFECYCLE_MANAGEMENT_GAP_ANALYSIS.md
- WORKFLOW_GAP_ANALYSIS.md
- DATA_LOADING_OPTIMIZATION.md

**Keep in Root:**
- README.md (main entry point)
- QUICKSTART.md (getting started)
- CLAUDE.md (AI context)
- GETTING_STARTED.md (merge into QUICKSTART if different)

### Phase 5: Update Epic Structure

**Git operations for .claude/epics/vital-workbench/:**
```bash
# Stage the new numbered files
git add .claude/epics/vital-workbench/{2..11}.md
git add .claude/epics/vital-workbench/github-mapping.md

# Commit the deletions of old numbered files
git rm .claude/epics/vital-workbench/00{1..9}.md
git rm .claude/epics/vital-workbench/010.md
```

### Phase 6: Create Master README

Update root README.md with clear structure:
```markdown
# VITAL Workbench

[Brief description]

## Quick Links
- [Getting Started](QUICKSTART.md) - Set up and run locally
- [Architecture](docs/architecture/) - Design decisions
- [Implementation Status](STATUS.md) - Current progress
- [Task Breakdown](.claude/epics/vital-workbench/epic.md) - Epic and tasks

## Documentation Structure
- `docs/architecture/` - Design patterns and decisions
- `docs/implementation/` - Completed features
- `docs/planning/` - Future work
- `docs/validation/` - Use case validation
- `docs/prd/` - Product requirements
- `.claude/epics/` - Task tracking
- `schemas/` - Database schemas

## Frontend Documentation
- [Frontend Modules](frontend/MODULES_READY.md)
- [APX Quickstart](frontend/APX_QUICKSTART.md)
- [Module Architecture](frontend/MODULE_ARCHITECTURE.md)
- [Toolbox Inventory](frontend/TOOLBOX_INVENTORY.md)

## Backend Documentation
- [Backend README](backend/README.md)
- [Task 3 Completion](backend/TASK3_COMPLETION.md)
```

## Implementation Order

1. ✅ Create this plan document
2. Create directory structure
3. Move files to organized locations
4. Create consolidated STATUS.md
5. Delete obsolete files
6. Update root README.md
7. Git operations (stage, commit)
8. Verify all links work

## Benefits

- **Single entry point** - README.md guides users
- **Clear categorization** - Find docs by purpose
- **Less clutter** - Root directory clean
- **Better git history** - Organized commits
- **Easier maintenance** - Know where to add new docs
- **Faster onboarding** - New developers know where to look

## Rollback Plan

If cleanup causes issues:
```bash
# Revert to current state
git checkout HEAD -- .
git clean -fd docs/
```

All original files preserved in git history.
