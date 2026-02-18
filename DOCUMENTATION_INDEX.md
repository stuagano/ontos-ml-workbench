# Ontos ML Workbench - Documentation Index

**Last Updated**: February 11, 2026

Complete guide to all documentation in this repository.

## Quick Start

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 10 minutes
- **[README.md](README.md)** - Project overview and architecture

## Core Documentation

### For Users

| Document | Purpose | Audience |
|----------|---------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | Get started quickly | New users |
| **[README.md](README.md)** | Project overview | All users |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Production deployment guide | DevOps, Admins |
| **[RUNBOOK.md](RUNBOOK.md)** | Operations and troubleshooting | Operators, Support |

### For Developers

| Document | Purpose | Location |
|----------|---------|----------|
| **CLAUDE.md** | AI assistant context (full technical details) | Root, frontend/, backend/ |
| **Module Architecture** | Frontend component structure | frontend/MODULE_ARCHITECTURE.md |
| **Module Flow** | Data flow diagrams | frontend/MODULE_FLOW_DIAGRAM.md |
| **Module Dev with APX** | APX development workflow | frontend/MODULE_DEV_WITH_APX.md |
| **API Reference** | Backend endpoint documentation | backend/DEPLOY_MONITOR_IMPROVE_API.md |
| **Endpoint Quick Ref** | API quick reference | backend/ENDPOINT_QUICK_REFERENCE.md |
| **Query Optimization** | Database performance guide | backend/QUERY_OPTIMIZATION_GUIDE.md |

### E2E Testing

| Document | Purpose | Location |
|----------|---------|----------|
| **E2E Testing Guide** | Playwright testing setup | frontend/E2E_TESTING.md |
| **E2E Quick Start** | Run tests quickly | frontend/E2E_QUICKSTART.md |

### Schema Reference

| Document | Purpose | Location |
|----------|---------|----------|
| **Schema Reference** | Delta table definitions | schemas/README.md |
| **Schema Documentation** | Complete schema guide | schemas/SCHEMA_REFERENCE.md |

## Business Documentation

Located in `docs/`:

| Document | Purpose |
|----------|---------|
| **PRD.md** | Product Requirements Document (v2.3) |
| **BUSINESS_CASE.md** | Business value and ROI analysis |
| **NEXT_STEPS.md** | Roadmap and future features |
| **GAP_ANALYSIS_V2.md** | Competitive analysis |
| **LAKEHOUSE_AI_PLATFORM_GAP_ANALYSIS.md** | Platform capabilities |

### Business Subdirectories

- **docs/architecture/** - Architecture diagrams and design docs
- **docs/planning/** - Sprint plans and project planning
- **docs/prd/** - PRD versions and updates
- **docs/implementation/** - Implementation guides
- **docs/validation/** - Validation test results

## Archived Documentation

Historical development notes are excluded from distribution (via `.gitignore`). If you need them, check the original repository's git history.

## Documentation Standards

### Terminology

Always use current terminology:

| Use This | Not This |
|----------|----------|
| Training Sheet | Assembly, DataBit |
| Template | Prompt Template |
| Canonical Label | Ground Truth Label |
| Q&A Pair | Training Example |

### File Naming

- Use UPPERCASE for root-level docs
- Use descriptive names (avoid generic names like STATUS.md)
- Include context in name (e.g., SCHEMA_REFERENCE not just SCHEMA)

### Documentation Updates

When updating docs:
1. Update "Last Updated" date
2. Archive superseded versions when no longer needed
3. Update this index if adding/removing major docs
4. Ensure cross-references are valid

## Finding Information

### I want to...

**Get started quickly** → [QUICKSTART.md](QUICKSTART.md)

**Understand the architecture** → [README.md](README.md) + [CLAUDE.md](CLAUDE.md)

**Deploy to production** → [DEPLOYMENT.md](DEPLOYMENT.md)

**Troubleshoot issues** → [RUNBOOK.md](RUNBOOK.md)

**Understand the business case** → [docs/BUSINESS_CASE.md](docs/BUSINESS_CASE.md)

**Review the PRD** → [docs/PRD.md](docs/PRD.md)

**Set up E2E tests** → [frontend/E2E_TESTING.md](frontend/E2E_TESTING.md)

**Optimize queries** → [backend/QUERY_OPTIMIZATION_GUIDE.md](backend/QUERY_OPTIMIZATION_GUIDE.md)

**Understand the schema** → [schemas/SCHEMA_REFERENCE.md](schemas/SCHEMA_REFERENCE.md)

**Find API endpoints** → [backend/ENDPOINT_QUICK_REFERENCE.md](backend/ENDPOINT_QUICK_REFERENCE.md)

**Work with modules** → [frontend/MODULE_ARCHITECTURE.md](frontend/MODULE_ARCHITECTURE.md)

### Search by Topic

**Authentication & Security**
- Backend setup: [QUICKSTART.md](QUICKSTART.md)
- Service principals: [DEPLOYMENT.md](DEPLOYMENT.md)

**Database & Schema**
- Schema reference: [schemas/SCHEMA_REFERENCE.md](schemas/SCHEMA_REFERENCE.md)
- Query optimization: [backend/QUERY_OPTIMIZATION_GUIDE.md](backend/QUERY_OPTIMIZATION_GUIDE.md)

**Frontend Development**
- Module architecture: [frontend/MODULE_ARCHITECTURE.md](frontend/MODULE_ARCHITECTURE.md)
- Component flow: [frontend/MODULE_FLOW_DIAGRAM.md](frontend/MODULE_FLOW_DIAGRAM.md)
- APX workflow: [frontend/MODULE_DEV_WITH_APX.md](frontend/MODULE_DEV_WITH_APX.md)

**Backend Development**
- API reference: [backend/DEPLOY_MONITOR_IMPROVE_API.md](backend/DEPLOY_MONITOR_IMPROVE_API.md)
- Endpoint reference: [backend/ENDPOINT_QUICK_REFERENCE.md](backend/ENDPOINT_QUICK_REFERENCE.md)

**Testing**
- E2E testing: [frontend/E2E_TESTING.md](frontend/E2E_TESTING.md)
- Quick start: [frontend/E2E_QUICKSTART.md](frontend/E2E_QUICKSTART.md)

**Operations**
- Runbook: [RUNBOOK.md](RUNBOOK.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)

## Contributing to Documentation

When adding new documentation:

1. **Choose the right location**
   - Root: Core operational docs (quickstart, deployment, runbook)
   - docs/: Business and planning docs
   - frontend/: Frontend-specific developer docs
   - backend/: Backend-specific developer docs
   - schemas/: Database schema docs

2. **Follow naming conventions**
   - Use clear, descriptive names
   - Use UPPERCASE for root docs
   - Use sentence case for subdirectory docs

3. **Update this index**
   - Add entry in appropriate section
   - Include purpose and audience
   - Keep sections organized

4. **Archive old versions**
   - Move superseded docs out of active directories
   - Keep relevant historical context
   - Update cross-references

## Document Lifecycle

```
Create → Active Use → Update → Superseded → Archive
                 ↑_________|
```

**Active documents** are in their primary location and kept up-to-date.

**Archived documents** are removed from active distribution when superseded or no longer actively maintained.

---

**Questions?** Check [RUNBOOK.md](RUNBOOK.md) or [QUICKSTART.md](QUICKSTART.md) for common issues.
