# Mirion UCO Ramp Plan & Internal Alignment
## Databricks Internal Only

**Account:** Mirion Technologies
**Last Updated:** January 26, 2025
**Owner:** Stuart Gano (SA)

---

## UCO Overview

| UCO ID | Use Case | Stage | Owner (Customer) | Owner (DBX) | Target Consumption |
|--------|----------|-------|------------------|-------------|-------------------|
| UCO-1 | **MEDIAN Foundation** | U2 | Ben Sivoravong | Neha | $50K/yr |
| UCO-2 | **Sievo/Procurement Analytics** | U2 | Sarah Pacer | Neha | $75K/yr |
| UCO-3 | **Monte Carlo Simulations** | U1 | Kyle Dalal | Stuart | $200K/yr |
| UCO-4 | **VITAL Workbench** | U1 | Kyle Dalal | Stuart | $50K/yr |
| UCO-5 | **Edge AI / VitalHub** | U1 | Kyle Dalal | Stuart | $100K/yr |
| UCO-6 | **GenAI / Mosaic AI Migration** | U1 | Justin Clark | Stuart | $50K/yr |
| UCO-7 | **Customer 360 / Digital Commerce** | U0 | Matthew Maddox | TBD | $75K/yr |
| UCO-8 | **Finance Golden Record** | U0 | Adam Brown | TBD | $50K/yr |
| UCO-9 | **Data Clean Rooms** | U0 | Shahmeer Mirza | Stuart | $150K/yr |
| UCO-10 | **Medical / Oncospace AI** | U0 | Luis Rivera | TBD | $100K/yr |

**Stage Legend:**
- **U0** = Identified (not yet engaged)
- **U1** = Discovery (engaged, scoping)
- **U2** = PoC/Pilot (building)
- **U3** = Production (live, consuming)
- **U4** = Scaling (expanding usage)
- **U5** = Optimized (mature, efficient)
- **U6** = Strategic (transformational)

---

## UCO Stage Progression Plan

```
                     Q1 2025    Q2 2025    Q3 2025    Q4 2025    2026       2027+
                     ─────────────────────────────────────────────────────────────
UCO-1 MEDIAN         U2 ──────► U3 ──────► U4 ──────► U4 ──────► U5 ──────► U6
UCO-2 Sievo          U2 ──────► U3 ──────► U4 ──────► U4 ──────► U5 ──────► U5
UCO-3 Monte Carlo    U1 ──────► U2 ──────► U3 ──────► U3 ──────► U4 ──────► U5
UCO-4 VITAL Wkbnch   U1 ──────► U2 ──────► U2 ──────► U3 ──────► U4 ──────► U5
UCO-5 Edge AI        U1 ──────► U1 ──────► U2 ──────► U3 ──────► U4 ──────► U5
UCO-6 GenAI/Mosaic   U1 ──────► U2 ──────► U3 ──────► U3 ──────► U4 ──────► U4
UCO-7 Customer 360        U0 ──────► U1 ──────► U2 ──────► U3 ──────► U4
UCO-8 Finance Golden      U0 ──────► U1 ──────► U2 ──────► U3 ──────► U4
UCO-9 Clean Rooms              U0 ──────► U0 ──────► U1 ──────► U2 ──────► U3
UCO-10 Medical                 U0 ──────► U0 ──────► U1 ──────► U2 ──────► U3
```

---

## UCO Details

### UCO-1: MEDIAN Foundation

| Attribute | Details |
|-----------|---------|
| **Description** | Core data platform: Unity Catalog, workspace setup, ingestion utilities, DQ framework |
| **Business Value** | Foundation for all other UCOs; replaces 22 ERP silos with unified platform |
| **Consumption Drivers** | Storage, ETL jobs, SQL warehouse queries |
| **Current Stage** | U2 - Building foundation |
| **Next Milestone** | Workspace live (Feb 2025) |
| **Blockers** | None |

---

### UCO-2: Sievo/Procurement Analytics ⭐ CRITICAL PATH

| Attribute | Details |
|-----------|---------|
| **Description** | Procurement analytics from 22 ERPs → PowerBI dashboards |
| **Business Value** | Supply chain visibility, vendor spend analytics |
| **Consumption Drivers** | Fabric ingestion, ETL pipelines, SQL warehouse |
| **Current Stage** | U2 - Building pipelines |
| **Next Milestone** | Data flowing from Fabric (Feb 2025) |
| **Deadline** | **March 2025** |
| **Blockers** | Need access to Fabric data (Victor Price) |

---

### UCO-3: Monte Carlo Simulations 🔥 BIGGEST CONSUMPTION DRIVER

| Attribute | Details |
|-----------|---------|
| **Description** | Physics simulations for detector calibration (GEANT4/MCNP hybrid) |
| **Business Value** | 10x simulation throughput, hours vs weeks, competitive moat |
| **Consumption Drivers** | **Massive compute** - 100K+ sims/calibration, elastic clusters |
| **Current Stage** | U1 - Discovery with Kyle |
| **Next Milestone** | MC PoC (10K simulations) in Phase 0 |
| **Blockers** | MCNP licensing review needed |

**Why This Matters:**
- Monte Carlo = 40% of Year 5 consumption ($2M of $5M)
- Embarrassingly parallel workload - perfect for Spark
- GEANT4 (open source) eliminates $10K/license MCNP cost
- Enables 100K+ simulations per calibration (vs 1-2K today)

---

### UCO-4: VITAL Workbench

| Attribute | Details |
|-----------|---------|
| **Description** | Databricks App for AI lifecycle management (7-stage pipeline) |
| **Business Value** | Domain experts participate in AI without code |
| **Consumption Drivers** | App serving, model serving, fine-tuning jobs |
| **Current Stage** | U1 - Building MVP |
| **Next Milestone** | v1 deployed (Q2 2025) |
| **Blockers** | Depends on MEDIAN foundation |

**7-Stage Pipeline:**
```
DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

---

### UCO-5: Edge AI / VitalHub

| Attribute | Details |
|-----------|---------|
| **Description** | Deploy ML models to physical devices at customer sites |
| **Business Value** | Real-time inference at edge, reduced latency |
| **Consumption Drivers** | Model training, feature store, model serving |
| **Current Stage** | U1 - Kyle's ANIMAL team scoping |
| **Next Milestone** | First edge deployment (Q3 2025) |
| **Blockers** | ACE framework architecture needed |

**ANIMAL Team:** Applied Nuclear and Ionizing Machine Learning - Kyle Dalal's team focused on edge deployment to "VitalHub" devices.

---

### UCO-6: GenAI / Mosaic AI Migration

| Attribute | Details |
|-----------|---------|
| **Description** | Migrate Justin Clark's chatbot team from Azure to Mosaic AI |
| **Business Value** | Unified AI platform, better governance, Agent Builder |
| **Consumption Drivers** | Foundation Model APIs, Agent serving |
| **Current Stage** | U1 - Initial conversations |
| **Next Milestone** | Migration plan (Q2 2025) |
| **Blockers** | Justin's team capacity |

---

### UCO-7: Customer 360 / Digital Commerce

| Attribute | Details |
|-----------|---------|
| **Description** | Customer and Product 360 views for digital commerce |
| **Business Value** | Move from "operating on vibes" to data-driven segmentation |
| **Consumption Drivers** | Data unification, ML models (propensity), dashboards |
| **Current Stage** | U0 - Identified |
| **Customer Owner** | Matthew Maddox (VP Digital Commerce) |
| **Next Step** | Initial engagement after Sievo proof point |

**Matthew's Needs:**
- Customer 360 and Product 360 views
- Propensity to buy models
- Customer Lifetime Value (CLV) optimization

---

### UCO-8: Finance Golden Record

| Attribute | Details |
|-----------|---------|
| **Description** | Unified financial data from 12+ systems |
| **Business Value** | Automate variance reporting, eliminate "scavenger hunt" |
| **Consumption Drivers** | Data unification, ETL, reporting |
| **Current Stage** | U0 - Identified |
| **Customer Owner** | Adam Brown (Sr. Director of Finance) |
| **Next Step** | Initial engagement after MEDIAN foundation |

**Adam's Current Pain:**
- Reconciling "Units Sold" vs "Free Cash Flow" across 12+ systems
- Manual scavenger hunt for data
- Needs "Golden Record" for automated variance reporting

---

### UCO-9: Data Clean Rooms

| Attribute | Details |
|-----------|---------|
| **Description** | Delta Sharing for B2B data exchange with customers |
| **Business Value** | Industry benchmarking, new SaaS revenue stream |
| **Consumption Drivers** | Delta Sharing, aggregation queries |
| **Current Stage** | U0 - Future roadmap |
| **Customer Owner** | Shahmeer Mirza |
| **Timeline** | Year 3-4 |

**Opportunity:**
- Mirion serves 95% of nuclear plants
- Aggregate insights without exposing individual customer data
- "How does my plant compare to industry average?"
- Potential SaaS revenue stream

---

### UCO-10: Medical / Oncospace AI

| Attribute | Details |
|-----------|---------|
| **Description** | AI for medical imaging (radiation therapy) |
| **Business Value** | Scale Oncospace AI capabilities |
| **Consumption Drivers** | Image processing, ML training/inference |
| **Current Stage** | U0 - Identified |
| **Customer Owner** | Luis Rivera (EVP Medical) |
| **Timeline** | Year 2+ |

---

## Consumption by UCO (Annual Forecast)

```
Year 1: $400K                          Year 3: $1.5M
┌────────────────────────────────┐     ┌────────────────────────────────┐
│ UCO-1 MEDIAN      $50K  ████   │     │ UCO-1 MEDIAN      $75K  ██     │
│ UCO-2 Sievo       $75K  █████  │     │ UCO-2 Sievo       $100K ███    │
│ UCO-3 Monte Carlo $150K ██████ │     │ UCO-3 Monte Carlo $500K ██████ │
│ UCO-4 Workbench   $25K  ██     │     │ UCO-4 Workbench   $75K  ██     │
│ UCO-5 Edge AI     $50K  ███    │     │ UCO-5 Edge AI     $200K █████  │
│ UCO-6 GenAI       $50K  ███    │     │ UCO-6 GenAI       $100K ███    │
│ UCO-7 Cust 360    $0           │     │ UCO-7 Cust 360    $150K ████   │
│ UCO-8 Finance     $0           │     │ UCO-8 Finance     $100K ███    │
│ UCO-9 Clean Rooms $0           │     │ UCO-9 Clean Rooms $150K ████   │
│ UCO-10 Medical    $0           │     │ UCO-10 Medical    $50K  ██     │
└────────────────────────────────┘     └────────────────────────────────┘

Year 5: $5.0M
┌────────────────────────────────┐
│ UCO-3 Monte Carlo $2.0M ██████ │  ← 40% of consumption
│ UCO-5 Edge AI     $800K █████  │
│ UCO-9 Clean Rooms $600K ████   │
│ UCO-7 Cust 360    $400K ███    │
│ UCO-10 Medical    $400K ███    │
│ UCO-6 GenAI       $300K ███    │
│ UCO-1 MEDIAN      $200K ██     │
│ UCO-2 Sievo       $150K ██     │
│ UCO-8 Finance     $100K █      │
│ UCO-4 Workbench   $50K  █      │
└────────────────────────────────┘
```

**Key Insight:** Monte Carlo simulations are the dominant consumption driver (40% at scale). This is compute-intensive physics simulation - exactly the workload Databricks excels at.

---

## Internal Team Alignment

### Databricks Account Team

| Name | Role | Primary Focus |
|------|------|---------------|
| **Konner** | Account Executive | Account strategy, commercial, executive relationships |
| **Hector** | Delivery Solutions Architect | Implementation delivery, customer enablement |
| **Neha Prabhu** | Solution Architect | MEDIAN foundation, Sievo, data engineering |
| **Stuart Gano** | Solution Architect | VITAL platform, Monte Carlo, AI/ML |

### Team Sync Cadence

| Meeting | Frequency | Attendees | Purpose |
|---------|-----------|-----------|---------|
| **Account Team Sync** | Weekly | Konner, Hector, Neha, Stuart | Status, blockers, next actions |
| **SA Working Session** | Weekly | Neha, Stuart | Technical coordination |
| **AE/SA Strategy** | Bi-weekly | Konner, Stuart | Account strategy, stakeholder mapping |
| **Extended Team Update** | Monthly | All + CSM, PS if engaged | Consumption review, risk escalation |

---

## Current Status Dashboard

| Area | Status | Owner | Notes |
|------|--------|-------|-------|
| **Executive Relationship** | 🟢 Green | Konner | Shahmeer fully engaged, Tom Logan supportive |
| **Technical Architecture** | 🟡 Yellow | Stuart | MC licensing TBD, ACE framework in design |
| **MEDIAN Foundation** | 🟡 Yellow | Neha | Waiting on workspace provisioning |
| **Sievo Proof Point** | 🟡 Yellow | Neha | Need Fabric data access |
| **Monte Carlo** | 🟡 Yellow | Stuart | Discovery with Kyle pending |
| **VITAL Workbench** | 🟢 Green | Stuart | MVP in development |
| **Security/Compliance** | 🟡 Yellow | Stuart | Craig deep-dive needed |
| **Partner (V4c)** | 🟢 Green | Konner | Elevate program confirmed |

---

## Key Dates & Meetings

| Date | Event | Attendees | Purpose |
|------|-------|-----------|---------|
| **Jan 27** | Sarah Pacer kickoff | Stuart, Sarah | Sievo DQ requirements, procurement project kickoff |
| **Week of Jan 27** | Victor Price meeting | Stuart/Neha | Fabric data access |
| **Feb 7** | Target: Workspace live | Neha | MEDIAN foundation |
| **March 2025** | **Sievo deadline** | All | Proof point delivery |
| **Q2 2025** | VITAL Workbench v1 | Stuart | AI lifecycle MVP |

---

## What Each Team Member Needs to Know

### Konner (AE)

**Key Relationships:**
- **Champion:** Shahmeer Mirza is all-in ("Temu Databricks" = competitor)
- **Economic Buyer:** Brian Schopfer (CFO) needs $10M Paragon synergy story
- **CEO:** Tom Logan wants AI in nuclear as his "legacy"

**Risks:**
- John Stimpson (Fabric advocate) being sidelined - watch for resistance
- Champion risk if Shahmeer leaves

**Opportunities:**
- V4c Elevate program = free boots on ground for 3 months
- CIO Marc Rubel aligned to move budget to Shahmeer's org

**Key Dates:**
- Sievo deadline March 2025
- Confirm ramp plan alignment with Shahmeer

---

### Hector (DSA)

**Primary Contacts:**
- Ben Sivoravong (Director of Data Platform)
- Kyle Dalal (Principal ML Engineer)

**Enablement Focus:**
- Unity Catalog setup and governance
- Delta Lake best practices
- MLflow for experiment tracking

**Quick Wins:**
- Help Ben with workspace setup
- Schema-Creation utility walkthrough
- MEDIAN utilities documentation

**Key Intel:**
- **ANIMAL Team:** Kyle's Applied Nuclear and Ionizing ML team - key for Edge AI
- **V4c:** They may be doing initial setup - coordinate handoff
- Ben and Kyle are former 7-Eleven colleagues of Shahmeer

---

### Neha (SA - MEDIAN)

**Primary Contacts:**
- Ben Sivoravong (Director of Data Platform)
- Sarah Pacer (Procurement / Supply Chain)
- Victor Price (IT Manager - Azure/Fabric access)

**UCOs Owned:**
- UCO-1: MEDIAN Foundation
- UCO-2: Sievo/Procurement Analytics ⭐

**Key Blockers:**
- Need Fabric data access from Victor Price
- Workspace provisioning timeline

**Technical Focus:**
- Fabric → Databricks connector
- DQ framework (structural validation)
- Medallion architecture for Sievo

**Key Intel:**
- Imran Mohamed (IT Manager, Data Engineering) currently 100% on Fabric ingestion - potential ally or blocker
- Sarah Pacer has **March deadline** - this is the critical proof point

---

### Stuart (SA - VITAL)

**Primary Contacts:**
- Kyle Dalal (Principal ML Engineer) - Monte Carlo, Edge AI
- Shahmeer Mirza (CAO) - AI vision
- James Cocks (CTO) - PhD Nuclear Physics, R&D
- Justin Clark (Director GenAI) - Mosaic AI migration
- Craig M. (CISO) - Security/compliance

**UCOs Owned:**
- UCO-3: Monte Carlo Simulations 🔥
- UCO-4: VITAL Workbench
- UCO-5: Edge AI / VitalHub
- UCO-6: GenAI / Mosaic AI
- UCO-9: Data Clean Rooms

**Key Actions:**
- Technical deep-dive with Kyle on GEANT4/MCNP
- Schedule Craig (CISO) deep-dive on ITAR/PII
- Continue VITAL Workbench MVP development
- Connect with Justin Clark on GenAI migration

**Key Intel:**
- MCNP licensing is the key risk for Monte Carlo - need legal review
- GEANT4 (open source) is the fallback/hybrid option
- Kyle's ANIMAL team aligns perfectly with ACE framework

---

## Open Questions for Team

| Question | Who Needs to Answer | Owner | Status |
|----------|---------------------|-------|--------|
| What's the timeline for Fabric data access? | Victor Price | Neha | ⬜ Open |
| Can MCNP run in cloud? (licensing) | Kyle + Mirion Legal | Stuart | ⬜ Open |
| V4c scope - what are they building? | Konner + Shahmeer | Konner | ⬜ Open |
| Is GovCloud required for MC data? | Craig (CISO) | Stuart | ⬜ Open |
| When is Ben starting? (or has he started?) | Shahmeer | Hector | ⬜ Open |
| CoE hiring timeline? | Shahmeer | Konner | ⬜ Open |
| Justin Clark engagement timing? | Justin | Stuart | ⬜ Open |

---

## Action Items by Owner

### Konner
- [ ] Confirm Shahmeer alignment on ramp plan
- [ ] Clarify V4c scope and handoff plan
- [ ] Get CoE hiring timeline from Shahmeer
- [ ] Schedule extended team monthly sync
- [ ] Prepare Brian Schopfer (CFO) ROI story

### Hector
- [ ] DSA kickoff with Ben & Kyle (Week of Jan 20)
- [ ] Coordinate with V4c on infrastructure setup
- [ ] Prepare enablement plan for MEDIAN utilities
- [ ] Document handoff plan from V4c

### Neha
- [ ] Get Fabric data access (Victor Price)
- [ ] Spin up Databricks dev workspace (target Feb 7)
- [ ] Create DQ rules with Sarah's SMEs
- [ ] Document Fabric connector architecture
- [ ] Sievo medallion architecture design

### Stuart
- [ ] Sarah Pacer follow-up call (Jan 27)
- [ ] Technical deep-dive with Kyle on MC
- [ ] Schedule Craig (CISO) security deep-dive
- [ ] Continue VITAL Workbench development
- [ ] Connect with Justin Clark on GenAI migration
- [ ] Document ACE framework architecture

---

## Risk Register (UCO-Specific)

| Risk | UCO Impact | Likelihood | Impact | Mitigation | Owner |
|------|------------|------------|--------|------------|-------|
| MCNP licensing blocks cloud | UCO-3 | Medium | High | GEANT4 hybrid strategy | Stuart |
| Fabric access delayed | UCO-1, UCO-2 | Medium | High | Escalate to Shahmeer | Neha |
| Sievo deadline missed | UCO-2 | Low | High | Weekly status checks | Neha |
| Kyle bandwidth constrained | UCO-3,4,5 | Medium | Medium | Prioritize MC over Edge | Stuart |
| V4c handoff unclear | UCO-1 | Medium | Medium | Clarify scope with Konner | Hector |
| Security review delays | All | Low | Medium | Early engagement with Craig | Stuart |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `mirion-account-plan-konner.md` | Full account plan with stakeholders, phases, strategy |
| `mirion-uco-progress-tracker.md` | Weekly UCO status updates |
| `mirion-risk-decision-log.md` | Risks, decisions, escalations |
| `mirion-value-realization.md` | ROI tracking and customer value |
| `../customer-facing/03-mirion-data-ai-project-plan.md` | Customer-facing project plan |
| `../customer-facing/02-mirion-data-ai-strategy.md` | Technical strategy document |

---

*Document: UCO Ramp Plan & Internal Alignment*
*Version: 1.0*
*Last Updated: January 26, 2025*
*Author: Stuart Gano, Solution Architect*
