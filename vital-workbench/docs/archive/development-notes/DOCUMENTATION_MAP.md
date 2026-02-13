# VITAL Workbench - Documentation Map

**Last Updated:** 2026-02-06  
**Status:** ✅ Organized structure complete

This map helps you find the right documentation for your needs.

---

## 🚀 Getting Started (Start Here)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **README.md** | Project overview, architecture, quick links | First time viewing project |
| **QUICKSTART.md** | 3-step setup guide (seed DB, start app, verify) | Setting up locally |
| **GETTING_STARTED.md** | Detailed UI walkthrough, troubleshooting | Learning the UI workflow |
| **STATUS.md** | Current project status, progress tracking | Want to know what's done/pending |

---

## 👨‍💻 Developer Documentation

### For AI Assistants
| Document | Purpose |
|----------|---------|
| **CLAUDE.md** | Developer quick reference, key patterns |
| **backend/CLAUDE.md** | Backend-specific architecture and patterns |

### For Human Developers
| Document | Purpose |
|----------|---------|
| **docs/PRD.md** | Complete product requirements (v2.3) |
| **backend/README.md** | Backend setup and API documentation |
| **frontend/README.md** | Frontend setup and component structure |

---

## 📐 Architecture & Design

### Core Concepts
Located in `docs/architecture/`:

| Document | Topic | Key Concepts |
|----------|-------|--------------|
| **canonical-labels.md** | Label reuse system | Label once, reuse everywhere |
| **multiple-labelsets.md** | Multiple labels per item | Composite key design |
| **usage-constraints.md** | Data governance | Dual quality gates |
| **multimodal-data-flow.md** | Multimodal data | Unity Catalog integration |
| **vertex-pattern.md** | Databricks integration | Sheet → Template → Training Sheet |
| **workflow-design.md** | 7-stage lifecycle | DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE |

### Why These Patterns?
Each design document explains:
- The problem being solved
- Alternative approaches considered
- Why the chosen approach is best
- Trade-offs and implications

---

## ✅ Implementation Status

### Completed Features
Located in `docs/implementation/`:

| Document | Feature | Status |
|----------|---------|--------|
| **backend-models.md** | Pydantic models | ✅ Complete |
| **canonical-labels-api.md** | Canonical labels endpoints | ✅ Complete |
| **canonical-labels-full.md** | Complete canonical labels feature | ✅ Complete |
| **canonical-labels-ready.md** | Production readiness | ✅ Complete |
| **frontend-components.md** | React component library | ✅ Complete |
| **frontend-types.md** | TypeScript interfaces | ✅ Complete |
| **integration-status.md** | Frontend-backend integration | 🟡 Partial |
| **navigation-redesign.md** | UI navigation updates | ✅ Complete |
| **training-job-management.md** | Training job system | ✅ Backend done, 🟡 Frontend partial |

---

## 📋 Planning Documents

### Future Work
Located in `docs/planning/`:

These documents outline features not yet implemented. Refer to `STATUS.md` for current implementation priorities.

---

## ✔️ Validation & Testing

### Use Case Validations
Located in `docs/validation/`:

| Document | Use Case | Result |
|----------|----------|--------|
| **entity-extraction.md** | Document AI (medical invoices) | ✅ Validated |
| **manufacturing-defects.md** | Vision AI (PCB defect detection) | ✅ Validated |
| **defect-detection-workflow.md** | End-to-end workflow validation | ✅ Validated |

These validations confirmed the data model works across diverse AI domains without breaking changes.

---

## 📊 Product Requirements

### PRD Documents
Located in `docs/prd/`:

| Document | Version | Focus |
|----------|---------|-------|
| **PRD.md** | v2.3 | Complete product requirements |
| **PRD_v2.1_UPDATES.md** | v2.1 | Lineage tracking additions |

---

## 📁 Directory Structure

```
mirion-vital-workbench/
├── README.md                          # Main entry point ⭐
├── QUICKSTART.md                      # 3-step setup ⭐
├── GETTING_STARTED.md                 # Detailed UI guide ⭐
├── STATUS.md                          # Project status ⭐
├── CLAUDE.md                          # AI assistant context
├── DOCUMENTATION_MAP.md               # This file
│
├── docs/
│   ├── PRD.md                         # Product requirements v2.3
│   ├── architecture/                  # Design decisions (6 docs)
│   ├── implementation/                # Completed features (11 docs)
│   ├── planning/                      # Future work
│   ├── prd/                          # Product requirements
│   ├── validation/                    # Use case validations (3 docs)
│   └── archive/                       # Old/obsolete docs (17 docs)
│
├── .claude/epics/vital-workbench/
│   ├── epic.md                       # Master epic document
│   ├── 2.md - 11.md                  # Individual task breakdown
│   └── github-mapping.md             # GitHub issue tracking
│
├── backend/
│   ├── README.md                     # Backend documentation
│   ├── CLAUDE.md                     # Backend AI context
│   └── TASK3_COMPLETION.md           # Sheets v2 API completion
│
├── frontend/
│   ├── APX_QUICKSTART.md             # APX pattern guide
│   ├── MODULE_ARCHITECTURE.md        # Component architecture
│   ├── MODULES_READY.md             # Module status
│   └── TOOLBOX_INVENTORY.md         # Reusable components
│
└── schemas/
    ├── README.md                     # Database schema guide
    └── *.sql                         # Table definitions
```

---

## 🔍 Finding Information

### "How do I..."

#### Set up the project?
→ **QUICKSTART.md** (3 steps: seed DB, start app, verify)

#### Understand the architecture?
→ **README.md** (system overview)  
→ **docs/architecture/** (detailed design patterns)

#### Learn the UI workflow?
→ **GETTING_STARTED.md** (stage-by-stage walkthrough)

#### See what's implemented?
→ **STATUS.md** (current progress)  
→ **docs/implementation/** (completed features)

#### Understand a design decision?
→ **docs/architecture/** (design rationale documents)

#### Validate the data model?
→ **docs/validation/** (use case validations)

#### Know what's coming next?
→ **STATUS.md** (next steps section)  
→ **docs/planning/** (future features)

#### Troubleshoot an issue?
→ **GETTING_STARTED.md** (troubleshooting section)  
→ **backend/CLAUDE.md** (backend issues)

#### Understand PRD requirements?
→ **docs/PRD.md** (complete product spec)

---

## 📚 Documentation Types

### Entry Points (Read First)
- README.md
- QUICKSTART.md
- STATUS.md

### Architecture (Deep Dives)
- docs/architecture/*.md
- Explains WHY design decisions were made

### Implementation (What's Built)
- docs/implementation/*.md
- Describes HOW features work

### Validation (Proof It Works)
- docs/validation/*.md
- Shows real-world use case testing

### Planning (What's Next)
- docs/planning/*.md
- Outlines future features

---

## 🗂️ Archive

Old or obsolete documentation has been moved to `docs/archive/`. These docs are kept for historical reference but are no longer maintained:

- Old status files (superseded by STATUS.md)
- Analysis documents (findings captured elsewhere)
- Completion markers (captured in implementation docs)
- Outdated design proposals (superseded by newer versions)

**Rule:** If you need historical context, check `docs/archive/`. For current information, use this map.

---

## 📝 Documentation Maintenance

### When Creating New Docs

**Ask yourself:**
1. What type of document is this? (Architecture, Implementation, Planning, Validation)
2. Where should it live? (docs/architecture, docs/implementation, etc.)
3. Does it replace an existing doc? (Move old one to archive)
4. Should it be listed in this map? (Add entry if important)

### Updating This Map

Update this map when:
- Creating significant new documentation
- Moving docs between directories
- Archiving obsolete docs
- Restructuring documentation

**Keep it current** - An outdated map is worse than no map.

---

## 🎯 Quick Reference

| I Want To... | Go To... |
|--------------|----------|
| Get started quickly | QUICKSTART.md |
| Understand the UI | GETTING_STARTED.md |
| See project status | STATUS.md |
| Learn architecture | docs/architecture/ |
| Check what's implemented | docs/implementation/ |
| See what's planned | docs/planning/ |
| Validate design decisions | docs/validation/ |
| Read product requirements | docs/PRD.md |
| Set up backend | backend/README.md |
| Set up frontend | frontend/README.md |
| Understand database | schemas/README.md |
| Track tasks | .claude/epics/vital-workbench/epic.md |
| Find old docs | docs/archive/ |

---

## 🔄 Documentation Workflow

### For Contributors

**Before writing code:**
1. Check docs/architecture/ for existing patterns
2. Check docs/implementation/ for completed features
3. Check docs/planning/ for planned work

**While writing code:**
1. Update relevant docs in docs/implementation/
2. Add comments referencing documentation
3. Update STATUS.md if completing major work

**After writing code:**
1. Create/update docs/implementation/ entry
2. Update STATUS.md progress
3. Update this map if adding significant docs

### For Reviewers

**Before reviewing:**
1. Check docs/architecture/ to understand design
2. Check docs/implementation/ to see what's expected
3. Check STATUS.md for context

**During review:**
1. Verify documentation matches implementation
2. Check if new patterns need documentation
3. Suggest doc updates if needed

---

**Last Updated:** 2026-02-06  
**Maintained By:** Project contributors  
**Location:** `/mirion-vital-workbench/DOCUMENTATION_MAP.md`
