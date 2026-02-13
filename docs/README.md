# Mirion Documentation

## Folder Structure

```
docs/
├── customer-facing/   Shareable with Mirion (Shahmeer, Sarah, etc.)
├── internal/          Databricks team only (RACI, competitive intel)
├── customer-source/   Documents they gave us (ME1 docs)
└── reference/         Archives, raw materials, diagrams
```

## Key Documents

### Customer-Facing (Shareable)

| Document | Purpose | Share With |
|----------|---------|------------|
| `01-mirion-data-ai-executive-vision.md` | Executive summary - MEDIAN + Sievo + VITAL | Shahmeer, Tom Logan |
| `02-mirion-data-ai-strategy.md` | Technical strategy - ACE, Monte Carlo, ML/AI | Shahmeer, Cognizant |
| `03-mirion-data-ai-project-plan.md` | PMP - Phases, milestones, RACI, Sievo proof point | Sarah, project teams |
| `monte-carlo-discovery-questions.md` | MCNP/GEANT4 qualification questionnaire | Kyle (ML Lead) |

### Internal Only (DB Team)

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `mirion-account-plan-konner.md` | Master account plan - stakeholders, phases, strategy | As needed |
| `mirion-uco-ramp-plan.md` | UCO details, consumption forecast, team alignment | Monthly |
| `mirion-uco-progress-tracker.md` | Weekly UCO status, blockers, consumption actuals | **Weekly** |
| `mirion-account-plan-deck.md` | Slide content for QBRs and steering committees | Before meetings |
| `mirion-meeting-notes.md` | All customer meeting notes and action items | After each meeting |
| `mirion-value-realization.md` | ROI tracking, customer value stories | Monthly |
| `mirion-risk-decision-log.md` | Risks, decisions, escalations, blockers | **Weekly** |

### Customer Source (Their Docs)

| Document | Content |
|----------|---------|
| `ME1-Product Vision Statement.pdf` | MEDIAN platform vision |
| `ME1-Project Backlog.pdf` | RICE-prioritized projects |
| `ME1-Lead - Procurement Analytics.pdf` | Sievo project details |

---

## Document Flow

```
┌─────────────────────────────────────┐
│  internal/                          │  DB TEAM ONLY
│  mirion-account-plan-konner.md      │  WHO: RACI, stakeholders, competitive intel
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  customer-facing/                   │  SHAREABLE
│  01-mirion-data-ai-executive-vision │  WHAT: Program overview (MEDIAN+Sievo+VITAL)
│  02-mirion-data-ai-strategy         │  WHY/HOW: Technical architecture
│  03-mirion-data-ai-project-plan     │  WHEN: Phases, milestones, Sievo deadline
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  customer-source/                   │  THEIR DOCS
│  ME1-*.pdf                          │  Customer's own MEDIAN vision
└─────────────────────────────────────┘
```

---

## Quick Reference

### Current Priority: VITAL Platform Workbench
- **Focus:** AI lifecycle platform for radiation safety
- **Status:** Active development (see `../mirion-vital-workbench/`)
- **Key Areas:** DQX data quality, Canonical Labeling, Ontos integration

### Platform Layers
| Layer | Owner | Description |
|-------|-------|-------------|
| **MEDIAN** | Customer | Foundational data platform (their vision) |
| **VITAL** | Us | AI lifecycle layer on top (our vision) |

### Key Contacts

**Databricks Team:**
| Name | Role | Focus |
|------|------|-------|
| Konner | Account Executive | Account strategy, commercial |
| Hector | Delivery Solutions Architect | Implementation, customer enablement |
| Neha Prabhu | Solution Architect | MEDIAN foundation, data engineering, Sievo |
| Stuart Gano | Solution Architect | VITAL platform, AI/ML, Monte Carlo |

**Customer Executive:**
| Name | Role | Focus |
|------|------|-------|
| Shahmeer Mirza | Chief AI Officer (CAO) | Executive sponsor, champion |
| Tom Logan | Chairman & CEO | Executive sponsor, AI vision |
| Brian Schopfer | CFO | Economic buyer |
| James Cocks | CTO | R&D, PhD Nuclear Physics |

**Customer Data & AI Team:**
| Name | Role | Focus |
|------|------|-------|
| Ben Sivoravong | Director of Data Platform | MEDIAN architect |
| Kyle Dalal | Principal ML Engineer | ANIMAL team, Edge AI, MC |
| Justin Clark | Director of GenAI | Chatbots, Mosaic AI |

**Customer Business:**
| Name | Role | Focus |
|------|------|-------|
| Sarah Pacer | Procurement / Supply Chain | Sievo project |
| Matthew Maddox | VP Digital Commerce | Customer 360 |

**Customer Security:**
| Name | Role | Focus |
|------|------|-------|
| Craig M. | CISO | Data governance, ITAR/PII |
| John Bane | Chief Cyber Security Architect | Compliance |

---

## What NOT to Share

The `internal/` folder contains:
- Competitive landscape (Microsoft Fabric displacement)
- Champion risk analysis (Shahmeer departure scenario)
- Internal RACI and team assignments
- Deal-specific consumption targets

---

*Last updated: February 13, 2026*
