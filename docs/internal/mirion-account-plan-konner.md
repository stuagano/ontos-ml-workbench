# Mirion Technologies Account Plan
## Prepared for Konner

> **Status: TEMPLATE** - Scaffolded but needs review and population with current account data.

**Date:** January 2026  
**Account:** Mirion Technologies  
**Industry:** Radiation Safety / Nuclear / Medical  
**Deal Size:** $10.7M over 5 years (consumption-based)

---

## Executive Summary

Mirion is transforming from a hardware-centric radiation safety company to a data-driven managed services provider via the **VITAL Platform** powered by Databricks. This represents a strategic account with significant consumption potential ($400K Y1 → $5M Y5).

### Key Numbers

| Metric | Value |
|--------|-------|
| Year 1 Target | $400K |
| Year 5 Target | $5.0M |
| Total Contract Value | $10.7M |
| CoE Investment | $1.5M |
| Target Customers (Y5) | 150+ (35% market penetration) |

---

## Databricks Account Team

### RACI Matrix

| Activity | Konner (AE) | Hector (DSA) | Neha Prabhu (SA) | Stuart Gano (SA) |
|----------|-------------|--------------|------------------|------------------|
| **Account Strategy & Leadership** | **R/A** | I | I | C |
| **Commercial / Contract** | **R/A** | I | I | I |
| **Executive Relationship (Shahmeer)** | **R/A** | I | C | C |
| **Technical Architecture** | I | **R** | **R** | **R/A** |
| **MEDIAN Platform (Data Eng)** | I | C | **R/A** | C |
| **VITAL Platform (AI/ML)** | I | C | C | **R/A** |
| **VITAL Workbench** | I | C | C | **R/A** |
| **Solution Design (Monte Carlo)** | I | C | I | **R/A** |
| **Data Ingestion (Fabric→DBX)** | I | C | **R/A** | I |
| **DQ Framework** | I | C | **R** (structural) | **R** (semantic/AI) |
| **Delivery / Implementation** | C | **R/A** | **R** | **R** |
| **Customer Enablement (Ben & Kyle)** | I | **R/A** | C | C |
| **Consumption Tracking** | **R/A** | C | C | C |
| **Escalations** | **R/A** | C | C | C |
| **Steering Committee** | **R** | C | **R** | **R** |

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

### Team Roles

| Name | Role | Primary Focus |
|------|------|---------------|
| **Konner** | Account Executive | Account strategy, commercial, executive relationships |
| **Hector** | Delivery Solutions Architect (DSA) | Implementation delivery, customer enablement (Ben & Kyle), hands-on technical guidance |
| **Neha Prabhu** | Solution Architect | **MEDIAN foundation**, data engineering, Fabric→DBX ingestion, Azure/Airflow, Sievo pipeline |
| **Stuart Gano** | Solution Architect | **VITAL platform**, AI/ML strategy, Monte Carlo/GEANT4, VITAL Workbench, prompt templates |

### SA Coverage Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SA DIVIDE & CONQUER                                  │
│                                                                             │
│   NEHA PRABHU                          STUART GANO                         │
│   (MEDIAN / Present State)             (VITAL / Future State)              │
│   ─────────────────────────            ─────────────────────────           │
│                                                                             │
│   Phases 1-3: Foundation → Sievo       Monte Carlo Parallel Track          │
│   • Workspace setup                    • GEANT4/MCNP hybrid strategy       │
│   • Schema/permissions utilities       • Kyle (ML Lead) relationship       │
│   • Fabric connector                   • Physics simulation analytics      │
│   • DQ Framework (structural)                                              │
│   • Spark pipelines                    Phase 5: VITAL v1                   │
│   • Sievo export                       • Prompt templates / Databits       │
│                                        • ML pipeline design                │
│   Customer Relationships:              • Fine-tuning strategy              │
│   • Sarah Pacer (procurement)          • DQ Framework (semantic/AI)        │
│   • Victor Price (IT/Azure)                                                │
│   • Ben (MEDIAN architect)             Customer Relationships:             │
│                                        • Kyle (ML Lead)                    │
│   Strengths:                           • Shahmeer (AI vision)              │
│   • Data Engineering (L300)            • Physics/calibration SMEs          │
│   • Data Ingestion (L300)                                                  │
│   • DA/DWH (L300)                      Strengths:                          │
│   • Spark (L300)                       • AI/ML                             │
│   • Azure, Airflow                     • GenAI / Prompt Engineering        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Customer Key Players

### Executive Leadership (C-Suite & Economic Buyers)

| Name | Title | Stance | Priority |
|------|-------|--------|----------|
| **Shahmeer Mirza** | Chief AI Officer (CAO) | **Primary Champion** - "All-in on Databricks" | **P1** |
| **Thomas (Tom) Logan** | Chairman & CEO (Founder) | Executive Sponsor / Visionary - AI in nuclear is his "legacy" | **P1** |
| **Brian Schopfer** | CFO | Economic Buyer - focused on TCO/ROI, $10M Paragon synergies | P2 |
| **Marc Rubel** | CIO | Supporter - aligned with Shahmeer, wants ERP abstraction layer | P2 |
| **James Cocks** | CTO | Technical Champion - PhD Nuclear Physics, owns R&D roadmap | P2 |
| **Shelia Webb** | CDO | Unknown (Shahmeer taking over CDO role - not public) | P3 |

### Data & AI "Hub" Team (Shahmeer's Hires)

| Name | Title | Function | Priority |
|------|-------|----------|----------|
| **Ben Sivoravong** | Director of Data Platform | MEDIAN architect, Unity Catalog, Edge AI priority | **P1** |
| **Kyle Dalal** | Principal ML Engineer | Leads "ANIMAL" team, Edge strategy, VitalHub devices | **P1** |
| **Justin Clark** | Director of GenAI | Team of ~5, chatbots/agents, moving to Mosaic AI | P2 |

### Business Functional Leaders (The "Spokes")

| Name | Title | Stance/Need | Priority |
|------|-------|-------------|----------|
| **Sarah Pacer** | Procurement / Supply Chain | Sievo project - supply chain analytics, vendor spend | **P1** |
| **Matthew Maddox** | VP Digital Commerce | Customer 360, Product 360, propensity models, CLV | P2 |
| **Adam Brown** | Sr. Director of Finance | "Golden Record" needed - reconciles 12+ systems | P2 |
| **Luis Rivera** | EVP Medical | Oncospace AI for medical imaging | P3 |

### Security & Governance (Gatekeepers)

| Name | Title | Focus | Priority |
|------|-------|-------|----------|
| **Craig M.** | CISO | Network architecture, ITAR/PII labeling, misuse concerns | P2 |
| **John Bane** | Chief Cyber Security Architect | Procurement, HIPAA, Cyber Essentials Plus, IL5 | P2 |
| **Dylan Abernathy** | GRC Analyst | SOC 2 Type 2, ISO certifications | P3 |
| **Mike Derso** | Manager, Product Cyber Security | Security of deployed products | P3 |
| **Patrick Dexter** | Manager, Cyber Detection & IR | Incident response | P3 |

### Legacy IT & Infrastructure

| Name | Title | Stance | Priority |
|------|-------|--------|----------|
| **John Stimpson** | Director, Architecture & Engineering | **Risk/Detractor** - Fabric advocate, being sidelined | P3 |
| **Imran Mohamed** | IT Manager, Data Engineering | Reports to Stimpson, 100% on ERP→Fabric plumbing | P3 |
| **Victor Price** | IT Manager | Azure subscription, Github admin | P3 |
| **Niko Dahlheimer** | Network Operations Manager | VNet IP space | P3 |

### External Partners

| Organization | Key Contacts | Role |
|--------------|--------------|------|
| **Cognizant** | Gaurav Ghosh (Client Partner), Raj Sarna (AM), Sunil Varanasy (Data Practice), Sanjiv (Architect) | Maturity assessment, ROI/value forecast for board |
| **V4c** | Josh Hallman (VP), Michael Gibson (CRO) | "Elevate Investment Program" - 3-month no-cost advisory |

---

### Champion Profile: Shahmeer Mirza

- **Title:** Chief AI Officer (CAO), reports directly to CEO
- **Background:** Former 7-Eleven (successful Databricks "Hub and Spoke" implementation)
- **Stance:** "All-in on Databricks" - calls competitor "Temu Databricks"
- **Team:** Hiring 10-11 person "high-performance team" including former 7-Eleven colleagues (Ben, Kyle)
- **Budget:** Owns data platform budget (CIO Marc Rubel aligned to move budget to Shahmeer's org)
- **Vision:** Replicating Hub-and-Spoke playbook from 7-Eleven
- **Risk:** Organizational change if Shahmeer leaves

### Key Relationship Map

```
                              ┌─────────────────┐
                              │   Tom Logan     │
                              │   CEO (Sponsor) │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │ Brian Schopfer│          │Shahmeer Mirza │          │  James Cocks  │
   │     CFO       │          │  CAO ⭐        │          │     CTO       │
   │ ($ approval)  │          │  (Champion)   │          │ (R&D/Physics) │
   └───────────────┘          └───────┬───────┘          └───────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │    Ben      │   │    Kyle     │   │   Justin    │
            │  (Platform) │   │    (ML)     │   │   (GenAI)   │
            └─────────────┘   └─────────────┘   └─────────────┘
```

### Key Intel

**ANIMAL Team:** Kyle leads the "Applied Nuclear and Ionizing Machine Learning" team - focused on Edge AI and deploying models to physical devices ("VitalHub"). This aligns perfectly with our ACE Framework.

**CFO Priority:** Brian Schopfer needs to realize $10M in synergies from the Paragon acquisition. Clear ROI/TCO story is critical for budget approval.

**CIO Alignment:** Marc Rubel has explicitly aligned with Shahmeer to move data ownership and budget to the AI org. He wants an abstraction layer so he can swap ERPs without breaking reporting.

**V4c Engagement:** V4c is offering a 3-month, no-cost "Elevate Investment Program" - boots on the ground to set up workspaces, Unity Catalog, and accelerate time-to-value while Mirion hires permanent team.

**Internal Risk:** John Stimpson (Director, Architecture & Engineering) was the Fabric advocate and is being sidelined. His direct report Imran Mohamed spends 100% of time on ERP→Fabric ingestion. Watch for resistance.

---

## Strategic Context

### Why Mirion is Transforming

| Current State | Target State |
|---------------|--------------|
| 95% market penetration (hardware) | 20%+ SaaS subscription (VITAL Platform) |
| One-time hardware sales ($2K calibration) | Recurring managed services ($100K+/year) |
| 22 ERPs from M&A | Unified data platform |
| Microsoft Fabric (displacement candidate) | Databricks Lakehouse |
| Manual calibration process | Monte Carlo-powered automation |

### The VITAL Platform Value Proposition

**For Mirion:**
- Transform from hardware margins (40%) to software margins (70%+)
- Create data moat competitors cannot replicate
- New SaaS revenue stream via Data Clean Rooms

**For Mirion's Customers:**
- Replace 3-5 FTEs with managed service ($200K+ savings/person)
- Predictive maintenance vs. reactive break/fix
- Industry benchmarking via Clean Rooms

---

## Technical Architecture Summary

### ACE Framework (Deployment Model)

| Phase | Pattern | Description | Timeline |
|-------|---------|-------------|----------|
| **Phase 1** | Edge | On-premise processing with periodic sync | Year 1 |
| **Phase 2** | Cloud | Direct cloud connectivity, real-time streaming | Year 2 |
| **Phase 3** | Airgap | FedRAMP High, GovCloud for regulated facilities | Year 3 |
| **Phase 4** | Clean Rooms | Delta Sharing for B2B data exchange | Year 4 |

### Monte Carlo Engine (Key Differentiator)

The physics simulation capability is the technical moat:

| Metric | Current State | VITAL Platform |
|--------|---------------|----------------|
| Simulations per calibration | 500-2,000 | 100,000+ |
| License cost | $10K per MCNP license | Included in platform |
| Turnaround time | Days-weeks | < 24 hours |
| ML integration | None | Predictive drift models |

---

## Program Phases & Milestones

### Program Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PROGRAM TIMELINE                                       │
│                                                                                  │
│   2025                          2026              2027           2028-2029       │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   Q1        Q2        Q3        Q4        Q1-Q4      Q1-Q4        Q1-Q4         │
│   ┌────┐   ┌────────────────────────┐   ┌──────┐   ┌──────┐     ┌──────┐       │
│   │ P0 │   │      Phase 1-2         │   │  P3  │   │  P4  │     │ P5-6 │       │
│   │Disc│   │   MEDIAN + Sievo       │   │VITAL │   │Scale │     │Expand│       │
│   └────┘   └────────────────────────┘   │Pilot │   │      │     │      │       │
│     │              │                     └──────┘   └──────┘     └──────┘       │
│     │              │                         │          │            │          │
│     ▼              ▼                         ▼          ▼            ▼          │
│   MC PoC      Sievo Live              5-10 cust    20-40 cust   86-150 cust    │
│              (Mar 2025)                                                         │
│                                                                                  │
│   $0         ────────► $400K ────────► $800K ────► $1.5M ────► $2.8M → $5M     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 0: Discovery & De-Risk (4 weeks)

| Attribute | Details |
|-----------|---------|
| **Objective** | Validate critical assumptions before full investment |
| **Key Risk** | Monte Carlo licensing blocks cloud deployment |
| **Status** | 🟡 In Progress |

**Key Milestones:**

| ID | Milestone | Target | Status | Success Criteria |
|----|-----------|--------|--------|------------------|
| P0-M1 | Discovery sessions complete | Week 2 | ⬜ | All 4 sessions held |
| P0-M2 | MC PoC complete | Week 4 | ⬜ | 10K simulations validated |
| P0-M3 | Phase 1 plan approved | Week 4 | ⬜ | Steering committee sign-off |

**Key Deliverables:**

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| P0-D1 | Simulation code inventory | Kyle | ⬜ |
| P0-D2 | License terms review | Mirion Legal | ⬜ |
| P0-D3 | MC PoC (10K simulations) | Stuart + Kyle | ⬜ |
| P0-D5 | ACE Framework architecture | Stuart | ⬜ |
| P0-D7 | Pilot customer shortlist | Mirion Sales | ⬜ |

---

### Phase 1: MEDIAN Foundation (8 weeks, Jan-Feb 2025)

| Attribute | Details |
|-----------|---------|
| **Objective** | Establish MEDIAN "lego brick" data platform |
| **Theme** | "Build the Foundation" |
| **Owner** | Neha (SA), Ben (Customer) |
| **Status** | ⬜ Not Started |

**Key Milestones:**

| ID | Milestone | Target | Status | Success Criteria |
|----|-----------|--------|--------|------------------|
| P1-M1 | Workspace live | Week 2 | ⬜ | Production workspace accessible |
| P1-M2 | MEDIAN utilities deployed | Week 4 | ⬜ | Schema-Creation, Service Principal working |
| P1-M3 | Ingestion operational | Week 6 | ⬜ | Fabric → Databricks data flowing |
| P1-M4 | DQ Framework ready | Week 6 | ⬜ | Structural validation rules running |
| P1-M5 | Foundation complete | Week 8 | ⬜ | All MEDIAN utilities deployed |

**Key Deliverables:**

| ID | Deliverable | Owner | Week |
|----|-------------|-------|------|
| P1-D1 | Databricks workspace (production) | Neha | Week 2 |
| P1-D2 | Unity Catalog configured | Neha | Week 3 |
| P1-D3 | Schema-Creation Utility | Ben | Week 4 |
| P1-D5 | Metadata-Driven Ingestion | Neha | Week 6 |
| P1-D6 | Data Quality Framework | Neha | Week 6 |
| P1-D7 | Fabric Connector operational | Neha | Week 6 |

---

### Phase 2: Sievo Proof Point (6 weeks, Feb-Mar 2025) ⭐ CRITICAL PATH

| Attribute | Details |
|-----------|---------|
| **Objective** | Deliver procurement analytics, validate MEDIAN + first VITAL component |
| **Theme** | "Prove Value with Real Business Outcome" |
| **Owner** | Sarah Pacer (Customer), Neha (SA) |
| **Deadline** | **March 2025** |
| **Status** | ⬜ Not Started |

**Key Milestones:**

| ID | Milestone | Target | Status | Success Criteria |
|----|-----------|--------|--------|------------------|
| P2-M1 | Data flowing | Week 2 | ⬜ | Procurement data in Databricks |
| P2-M2 | DQ operational | Week 3 | ⬜ | Validation rules catching issues |
| P2-M3 | SME review live | Week 4 | ⬜ | First VITAL component (CURATE) operational |
| P2-M4 | Dashboards delivered | Week 6 | ⬜ | PLMs using PowerBI dashboards |
| P2-M5 | **Sievo complete** | **March** | ⬜ | **Sarah Pacer sign-off** |

**Key Deliverables:**

| ID | Deliverable | Owner | Week |
|----|-------------|-------|------|
| P2-D1 | Procurement data ingested | Neha | Week 2 |
| P2-D2 | DQ rules for procurement | SMEs + DE | Week 3 |
| P2-D3 | SME review workflow (CURATE) | Stuart | Week 4 |
| P2-D4 | Medallion architecture | DE | Week 4 |
| P2-D6 | PLM Revenue Dashboards | Analysts | Week 6 |

---

### Phase 3: VITAL Pilot (9 months, Q2-Q4 Year 1)

| Attribute | Details |
|-----------|---------|
| **Objective** | Launch VITAL platform with 5-10 pilot customers |
| **Target Consumption** | $400K annual run rate |
| **Theme** | "Prove the Physics Engine" |
| **Owner** | Stuart (SA), Kyle (Customer) |
| **Status** | ⬜ Not Started |

**Key Milestones:**

| ID | Milestone | Target | Status | Success Criteria |
|----|-----------|--------|--------|------------------|
| P3-M1 | First workload | Q2 | ⬜ | Telemetry pipeline for 2-3 pilots |
| P3-M2 | MC at scale | Q2 | ⬜ | 10x throughput vs legacy |
| P3-M3 | Customer value | Q3 | ⬜ | First dashboard + MC pilot |
| P3-M4 | 5 pilots live | Q4 | ⬜ | Customers consuming service |
| P3-M5 | CoE operational | Q4 | ⬜ | Team trained, runbooks done |

**Key Deliverables:**

| ID | Deliverable | Owner | Quarter |
|----|-------------|-------|---------|
| P3-D1 | ACE Edge pipeline MVP | Mirion | Q2 |
| P3-D3 | MC simulation (GEANT4) | Kyle/Stuart | Q2 |
| P3-D4 | **VITAL Workbench v1** | Stuart | Q2 |
| P3-D5 | Customer portal MVP | Mirion | Q3 |
| P3-D7 | First calibration service | Mirion | Q3 |
| P3-D9 | 5-10 customers live | Mirion | Q4 |

---

### Phase 4: Scale (Year 2)

| Attribute | Details |
|-----------|---------|
| **Objective** | Scale to 20-40 customers |
| **Target Consumption** | $800K |
| **Theme** | "Managed Services at Scale" |

**Key Milestones:**

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P4-M1 | Onboarding < 2 weeks | Q1 | Playbook executed 3+ times |
| P4-M2 | MC production scale | Q2 | 100K+ sims per calibration |
| P4-M3 | First ML model | Q3 | Drift prediction in production |
| P4-M4 | Clean Room beta | Q4 | 5+ customers participating |
| P4-M5 | 20 customers live | Q4 | Verified consumption |

---

### Phase 5: Optimize (Year 3)

| Attribute | Details |
|-----------|---------|
| **Objective** | 50-86 customers, ML-driven calibration |
| **Target Consumption** | $1.5M |
| **Theme** | "ML-Driven Analytics" |

**Key Milestones:**

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P5-M1 | Airgap deployment | Q2 | First GovCloud customer |
| P5-M2 | ML-driven calibration | Q2 | 50% calibrations using ML |
| P5-M3 | 50 customers | Q3 | Consumption verified |
| P5-M4 | 86 customers | Q4 | 20% market penetration |

---

### Phase 6: Expand (Years 4-5)

| Attribute | Details |
|-----------|---------|
| **Objective** | 86-150+ customers, Clean Rooms GA, industrial expansion |
| **Target Consumption** | $2.8M → $5.0M |
| **Theme** | "Platform Ecosystem & Market Leadership" |

**Key Milestones:**

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P6-M1 | Clean Rooms GA | Y4-Q1 | SaaS pricing model live |
| P6-M2 | Partner integrations | Y4-Q3 | Westinghouse connected |
| P6-M3 | 86+ customers | Y4-Q4 | Nuclear market penetration |
| P6-M4 | Industrial expansion | Y5-Q2 | Oil & gas, medical pilots |
| P6-M5 | 150+ customers | Y5-Q4 | $5M consumption achieved |

---

### Consumption Ramp Summary

```
          $5.0M ─────────────────────────────────────────────────────┐
                                                                     │
          $2.8M ─────────────────────────────────────────┐           │
                                                         │           │
          $1.5M ─────────────────────────────┐           │           │
                                             │           │           │
          $800K ─────────────────┐           │           │           │
                                 │           │           │           │
          $400K ─────┐           │           │           │           │
                     │           │           │           │           │
                     │           │           │           │           │
              ───────┴───────────┴───────────┴───────────┴───────────┴─────
                  Year 1      Year 2      Year 3      Year 4      Year 5
                  5-10        20-40       50-86       86+         150+
                  customers   customers   customers   customers   customers

Key Drivers:
• Year 1-2: Platform + Sievo + Early pilots
• Year 2-3: MC simulations at scale (biggest consumption driver)
• Year 3-4: ML models, GovCloud, Clean Rooms
• Year 4-5: Industrial expansion, ecosystem
```

---

## Open Questions / Risks

### Question: Cognizant's Claimed Ingestion IP

**Issue:** Cognizant mentioned proprietary ingestion device/software, but no documentation found in any reviewed materials (Cognizant report, VITAL docs, Account Plan).

**Recommendation:**
1. Ask Cognizant to explicitly document their claimed ingestion IP
2. Validate necessity before building custom edge agents
3. Prefer native Databricks ingestion (Autoloader, DLT) where possible

### Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| MC licensing blocks cloud | Medium | High | **Hybrid strategy:** GEANT4 for R&D on Databricks, MCNP stays on-prem for production | Kyle/Stuart |
| GEANT4 accuracy insufficient | Medium | Medium | Validate against MCNP baselines; use GEANT4 only for non-regulatory workloads | Kyle/Physics |
| Export controls block UC data | Low | High | Assess with Craig (CISO); GovCloud fallback if needed | Stuart/Craig |
| Customer adoption slower | Medium | Medium | Start with committed pilots | Mirion Sales |
| Unnecessary custom agents | Medium | Medium | Project 0.4 discovery | Databricks SA |
| Champion departure (Shahmeer) | Low | High | Build multi-threaded relationships | AE |
| CoE capacity constraints | Medium | Medium | Phased hiring; DBX PS augmentation | Mirion |

---

## Competitive Landscape

| Competitor | Status | Risk Level |
|------------|--------|------------|
| **Microsoft Fabric** | Being displaced (John Stinson sidelined) | Low |
| **Snowflake** | Not positioned | Low |
| **AWS Native** | Possible alternative | Medium |
| **Custom Build** | Always a risk | Low |

**Why We Win:**
- Unified platform for streaming, batch, ML, and MC simulations
- Delta Sharing for Clean Rooms (unique capability)
- Shahmeer (champion) has Databricks experience from 7-Eleven
- VITAL Workbench provides turnkey AI lifecycle management

---

## Governance

### Steering Committee

**Cadence:** Monthly

**Attendees:**
- Mirion: Shahmeer (Exec Sponsor), Craig (CISO), Ben (Technical Lead)
- Databricks: Konner (AE), Hector (DSA), Neha/Stuart (SAs)

**Agenda:**
1. Phase/milestone status (Red/Yellow/Green)
2. Consumption vs. forecast
3. Risk review and blockers
4. Decisions needed
5. Next phase readiness

### Success Metrics

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Customers | 10 | 40 | 86 |
| Consumption | $400K | $800K | $1.5M |
| NPS Score | >7 | >8 | >8 |
| Onboarding Time | <4 wks | <2 wks | <1 wk |

---

## UCO Ramp Plan & Internal Alignment

**See dedicated document:** `mirion-uco-ramp-plan.md`

### Quick Reference: UCO Summary

| UCO | Use Case | Stage | Owner (DBX) | Year 5 Target |
|-----|----------|-------|-------------|---------------|
| UCO-1 | MEDIAN Foundation | U2 | Neha | $200K |
| UCO-2 | Sievo/Procurement ⭐ | U2 | Neha | $150K |
| UCO-3 | Monte Carlo 🔥 | U1 | Stuart | **$2.0M** |
| UCO-4 | VITAL Workbench | U1 | Stuart | $50K |
| UCO-5 | Edge AI / VitalHub | U1 | Stuart | $800K |
| UCO-6 | GenAI / Mosaic AI | U1 | Stuart | $300K |
| UCO-7 | Customer 360 | U0 | TBD | $400K |
| UCO-8 | Finance Golden Record | U0 | TBD | $100K |
| UCO-9 | Data Clean Rooms | U0 | Stuart | $600K |
| UCO-10 | Medical / Oncospace | U0 | TBD | $400K |

**Key Insight:** Monte Carlo = 40% of Year 5 consumption ($2M of $5M)

### Current Status Dashboard

| Area | Status | Owner | Notes |
|------|--------|-------|-------|
| Executive Relationship | 🟢 | Konner | Shahmeer engaged, Tom supportive |
| MEDIAN Foundation | 🟡 | Neha | Workspace provisioning pending |
| Sievo Proof Point | 🟡 | Neha | Need Fabric access |
| Monte Carlo | 🟡 | Stuart | Kyle discovery pending |
| VITAL Workbench | 🟢 | Stuart | MVP in development |
| Security/Compliance | 🟡 | Stuart | Craig deep-dive needed |

### Key Dates

| Date | Event | Owner |
|------|-------|-------|
| **Jan 27** | Sarah Pacer call | Stuart |
| **Feb 7** | Workspace live | Neha |
| **March 2025** | **Sievo deadline** | Neha |
| **Q2 2025** | VITAL Workbench v1 | Stuart |

---

## Immediate Actions

### Strategic Actions

| Action | Owner | Due |
|--------|-------|-----|
| Validate Cognizant ingestion IP claims | Stuart/Konner | Next Cognizant call |
| Confirm Shahmeer alignment on ramp plan | Konner | Before Jan 15 |
| Schedule Project 0.4 discovery session | Stuart/Hector | Week of Jan 13 |
| DSA kickoff with Ben & Kyle | Hector | Week of Jan 20 |
| Share this account plan with extended team | Konner | Immediately |

### Monte Carlo Strategy: Hybrid GEANT4 + MCNP

**Recommended Approach:** Use GEANT4 (open source) for R&D/exploration on Databricks, keep MCNP for production/regulatory deliverables. All simulation I/O data goes to Unity Catalog regardless of compute location.

**Why Hybrid:**
- GEANT4 eliminates $10K/license cost, enables 100K+ sims/job
- MCNP stays for regulatory acceptance and customer certifications
- Unity Catalog unifies data for ML training and cross-facility analytics

### Monte Carlo Discovery Actions

| Action | Owner | Due |
|--------|-------|-----|
| **Technical deep-dive with Kyle** | Stuart | TBD |
| Review `monte-carlo-discovery-questions.md` with Kyle | Stuart | TBD |
| Request sample MCNP input/output files (sanitized) | Kyle | TBD |
| Run first GEANT4 simulations on Databricks (POC) | Kyle/Databricks | TBD |
| Validate GEANT4 accuracy vs MCNP for 2-3 cases | Kyle + Physics | TBD |
| Determine GovCloud requirement (export controls) | Stuart/Craig | TBD |
| Establish data sync from MCNP on-prem to Unity Catalog | DE | TBD |

See `../customer-facing/monte-carlo-discovery-questions.md` for full questionnaire.

### Sievo/Procurement Proof Point Actions

| Action | Owner | Due |
|--------|-------|-----|
| **Follow-up call with Sarah Pacer** | Stuart | **Jan 27** |
| Confirm DQ approach with Sarah | Stuart | Jan 27 call |
| Identify SMEs from Sarah's team | Sarah/Stuart | Jan 27 call |
| Get access to procurement data (Fabric/Azure) | Stuart/Victor | Week of Jan 27 |
| Spin up Databricks dev workspace | Infra | Feb 7 |
| Create consolidated list of DQ rules | DE + SMEs | Feb 14 |

See `../customer-facing/03-mirion-data-ai-project-plan.md` → Phase 2 for full Sievo project timeline.

---

## Supporting Documents

### Internal Only
| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `mirion-uco-ramp-plan.md` | UCO details, consumption forecast, team alignment | As needed |
| `mirion-uco-progress-tracker.md` | Weekly UCO status, blockers, consumption actuals | **Weekly** |
| `mirion-account-plan-deck.md` | Slide content for QBRs and steering committees | Before meetings |
| `mirion-meeting-notes.md` | All customer meeting notes and action items | After each meeting |
| `mirion-value-realization.md` | ROI tracking, customer value stories | Monthly |
| `mirion-risk-decision-log.md` | Risks, decisions, escalations, blockers | **Weekly** |

### Customer-Facing
| Document | Purpose |
|----------|---------|
| `../customer-facing/01-mirion-data-ai-executive-vision.md` | Executive summary (MEDIAN + Sievo + VITAL) |
| `../customer-facing/02-mirion-data-ai-strategy.md` | Comprehensive technical strategy (ACE, Monte Carlo, Hub-and-Spoke, ML/AI) |
| `../customer-facing/03-mirion-data-ai-project-plan.md` | **Execution plan** - MEDIAN → Sievo → VITAL phased roadmap |

### Reference
| Document | Purpose |
|----------|---------|
| `../reference/mirion-cognizant-databricks-onsite.md` | Cognizant onsite meeting notes |
| `../reference/diagrams/` | Architecture diagrams |

### Customer Source
| Document | Purpose |
|----------|---------|
| `../customer-source/ME1-*.pdf` | **Customer's own docs** - MEDIAN vision, project backlog, procurement lead |
| `../customer-source/Mirion Stakeholders.docx` | **Complete stakeholder map** - all key players with stances |

---

## MEDIAN vs VITAL Context

The customer has their own platform vision called **MEDIAN** (from their ME1 docs). Our VITAL Platform sits on top of it:

| Layer | What | Owner |
|-------|------|-------|
| **MEDIAN** | Foundational data platform (workspaces, schemas, permissions, ingestion) | Customer vision (Ben) |
| **VITAL** | AI lifecycle layer (templates, curation, training, deployment, monitoring) | Our vision (Stuart) |
| **VITAL Workbench** | Databricks App - mission control for AI lifecycle management | Stuart |

**Current Proof Point:** Sarah Pacer's procurement/Sievo project (March deadline)
- Uses MEDIAN foundation
- DQ Framework with human review = first VITAL component (CURATE stage)

**Next Major Deliverable:** VITAL Workbench v1 (Phase 3, Q2)
- Enables domain experts to participate in AI development without code
- 7-stage lifecycle: DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE

See `../customer-facing/03-mirion-data-ai-project-plan.md` for detailed execution plan.

---

*Last Updated: January 26, 2026*
*Author: Stuart Gano, Solution Architect*
*Version: 3.0 - Added UCO ramp plan, internal team alignment, comprehensive stakeholders*
