# Mirion Data & AI Platform
## Project Management Plan

**Mirion Technologies × Databricks**

*Implementation Roadmap, Milestones, and Governance*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Governance & RACI](#2-governance--raci)
3. [Phase 0: Discovery & De-Risk](#3-phase-0-discovery--de-risk)
4. [Phase 1: MEDIAN Foundation](#4-phase-1-median-foundation)
5. [Phase 2: Sievo Proof Point](#5-phase-2-sievo-proof-point)
6. [Phase 3: VITAL Pilot](#6-phase-3-vital-pilot)
7. [Phase 4: Scale](#7-phase-4-scale)
8. [Phase 5: Optimize](#8-phase-5-optimize)
9. [Phase 6: Expand](#9-phase-6-expand)
10. [Risk Register](#10-risk-register)
11. [Center of Excellence](#11-center-of-excellence)
12. [Success Metrics](#12-success-metrics)
13. [Appendix: Key Contacts](#13-appendix-key-contacts)

---

## 1. Project Overview

### 1.1 Program Summary

| Element | Details |
|---------|---------|
| **Program Name** | Mirion Data & AI Platform |
| **Total Investment** | $10.7M over 5 years (Databricks) + $1.5M CoE |
| **Executive Sponsor** | Shahmeer (Chief AI Officer, Mirion) |
| **Program Manager** | TBD (Mirion) |
| **Databricks Lead** | Konner (AE), Hector (DSA), Neha & Stuart (SAs) |

### 1.2 Program Structure

The program consists of three integrated layers:

| Layer | Name | Purpose | Owner |
|-------|------|---------|-------|
| **Foundation** | MEDIAN | "Lego brick" data platform | Ben, Neha |
| **Proof Point** | Sievo | Procurement analytics (March deadline) | Sarah Pacer |
| **AI Lifecycle** | VITAL | AI-powered managed services | Shahmeer, Stuart |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROGRAM STRUCTURE                                    │
│                                                                         │
│   Phase 0-1: MEDIAN Foundation                                          │
│   ├── Workspace setup, Unity Catalog, ingestion utilities               │
│   └── Schema-Creation, DQ Framework, Metadata Ingestion                 │
│                                                                         │
│   Phase 2: Sievo Proof Point (March 2025)                               │
│   ├── Fabric → Databricks ingestion                                     │
│   ├── DQ Framework + SME review (first VITAL component)                 │
│   └── PLM Revenue Dashboards                                            │
│                                                                         │
│   Phase 3+: VITAL AI Lifecycle                                          │
│   ├── Monte Carlo simulations at scale                                  │
│   ├── Prompt templates, ML models                                       │
│   └── Customer-facing managed services                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Program Objectives

1. Transform Mirion from transactional hardware sales to recurring-revenue managed services
2. Establish MEDIAN foundation with Sievo as proof point (March 2025)
3. Deploy VITAL Platform across 86+ nuclear facilities by Year 4
4. Achieve $5M annual Databricks consumption by Year 5
5. Build internal CoE capability to operate and scale the platform

### 1.4 Consumption Forecast Alignment

```
                $400K      $800K      $1.5M      $2.8M      $5.0M
                   │          │          │          │          │
        Year 1     │  Year 2  │  Year 3  │  Year 4  │  Year 5  │
     ──────────────┼──────────┼──────────┼──────────┼──────────┼─────────
                   │          │          │          │          │
           ┌───────┴───┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐   │
           │ MEDIAN +  │ │  VITAL  │ │Optimize │ │ Expand  │   │
           │ Sievo     │ │  Pilot  │ │  + ML   │ │         │   │
           └───────────┘ └─────────┘ └─────────┘ └─────────┘   │
                                                               │
           5-10          20-40       50-86        86+       Industrial
           customers     customers   customers    customers  expansion
```

---

## 2. Governance & RACI

### 2.1 Steering Committee

| Role | Name | Organization | Cadence |
|------|------|--------------|---------|
| Executive Sponsor | Shahmeer | Mirion | Monthly |
| CEO Sponsor | Tom Logan | Mirion | Quarterly |
| Account Executive | Konner | Databricks | Bi-weekly |
| Solution Architect | John | Databricks | Weekly |
| CoE Lead | TBD | Mirion | Weekly |
| CISO | Craig | Mirion | As needed |

### 2.2 RACI Matrix

| Activity | Mirion | Databricks |
|----------|--------|------------|
| Business requirements | **A/R** | C |
| Technical architecture | C | **A/R** |
| Platform implementation | **A/R** | C |
| Data pipeline development | **A/R** | C |
| MC simulation validation | **A/R** | C |
| Customer onboarding | **A/R** | C |
| CoE hiring & training | **A/R** | C |
| Security & compliance | **A/R** | C |
| Consumption monitoring | C | **A/R** |

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

### 2.3 Meeting Cadence

| Meeting | Frequency | Attendees | Purpose |
|---------|-----------|-----------|---------|
| Steering Committee | Monthly | Exec sponsors, leads | Strategic decisions, blockers |
| Technical Working Group | Weekly | SAs, engineers | Technical design, implementation |
| Sprint Review | Bi-weekly | Delivery team | Progress, demos |
| Risk Review | Monthly | PM, leads | Risk assessment, mitigation |
| Consumption Review | Monthly | AE, SA, CoE | Forecast vs actual |

---

## 3. Phase 0: Discovery & De-Risk

### 3.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 4 weeks |
| **Objective** | Validate critical assumptions before full investment |
| **Target Consumption** | N/A (pre-implementation) |
| **Key Risk** | Monte Carlo licensing blocks cloud deployment |

### 3.2 Entry Criteria

- [ ] Contract signed and executed
- [ ] Executive sponsors identified and engaged
- [ ] Databricks workspace provisioned for PoC
- [ ] Key technical stakeholders identified

### 3.3 Deliverables

| ID | Deliverable | Owner | Due |
|----|-------------|-------|-----|
| P0-D1 | Simulation code inventory | Mirion Physics | Week 1 |
| P0-D2 | License terms review | Mirion Legal | Week 2 |
| P0-D3 | MC PoC (10K simulations) | Databricks + Mirion | Week 4 |
| P0-D4 | Performance benchmark report | Databricks | Week 4 |
| P0-D5 | ACE Framework architecture doc | Databricks SA | Week 3 |
| P0-D6 | Security requirements doc | Mirion CISO | Week 2 |
| P0-D7 | Pilot customer shortlist | Mirion Sales | Week 2 |
| P0-D8 | Updated risk register | PM | Week 4 |

### 3.4 Milestones

| ID | Milestone | Target Date | Success Criteria |
|----|-----------|-------------|------------------|
| P0-M1 | Discovery sessions complete | Week 2 | All 4 sessions held, notes documented |
| P0-M2 | MC PoC complete | Week 4 | 10K simulations validated against benchmark |
| P0-M3 | Phase 1 plan approved | Week 4 | Steering committee sign-off |

### 3.5 Exit Criteria

- [ ] Clear answer on which MC codes can run on Databricks
- [ ] Performance benchmarks documented
- [ ] Risk register updated with findings
- [ ] Go/no-go decision on Phase 1 scope
- [ ] Pilot customers identified and engaged
- [ ] Phase 1 budget and timeline approved

### 3.6 Discovery Sessions

| Session | Week | Participants | Outcome |
|---------|------|--------------|---------|
| VITAL Platform Architecture | 1 | CoE leads, Databricks SA | Confirm vision alignment |
| MC Simulation Deep Dive | 1 | Physics SMEs, Data team | Code inventory, licensing status |
| ACE Framework Technical | 2 | Infrastructure, Security | Connectivity architecture |
| Customer Onboarding | 2 | Product, Customer Success | Pilot customer identification |

---

## 4. Phase 1: MEDIAN Foundation

### 4.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 8 weeks (Jan-Feb 2025) |
| **Objective** | Establish MEDIAN "lego brick" data platform foundation |
| **Target Consumption** | Initial (ramp to $400K annual) |
| **Theme** | "Build the Foundation" |

### 4.2 Entry Criteria

- [ ] Phase 0 complete with go decision
- [ ] Databricks workspace provisioned
- [ ] CoE team hired (minimum staffing)
- [ ] Budget approved

### 4.3 Deliverables

| ID | Deliverable | Owner | Week | Dependencies |
|----|-------------|-------|------|--------------|
| P1-D1 | Databricks workspace (production) | Neha / Mirion | Week 2 | P0-D5 |
| P1-D2 | Unity Catalog configured | Neha / Mirion | Week 3 | P1-D1 |
| P1-D3 | Schema-Creation Utility | Ben / Mirion | Week 4 | P1-D2 |
| P1-D4 | Service Principal Utility | Ben / Mirion | Week 4 | P1-D2 |
| P1-D5 | Metadata-Driven Ingestion framework | Neha / Mirion | Week 6 | P1-D3 |
| P1-D6 | Data Quality Framework (structural) | Neha / Mirion | Week 6 | P1-D3 |
| P1-D7 | Fabric Connector operational | Neha / Mirion | Week 6 | P1-D5 |
| P1-D8 | Databricks Watchdog | Ben / Mirion | Week 8 | P1-D1 |

### 4.4 Milestones

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P1-M1 | Workspace live | Week 2 | Production workspace accessible |
| P1-M2 | MEDIAN utilities deployed | Week 4 | Schema-Creation, Service Principal working |
| P1-M3 | Ingestion operational | Week 6 | Fabric → Databricks data flowing |
| P1-M4 | DQ Framework ready | Week 6 | Structural validation rules running |
| P1-M5 | Foundation complete | Week 8 | All MEDIAN utilities deployed and documented |

### 4.5 Exit Criteria

- [ ] All MEDIAN utilities deployed and operational
- [ ] Fabric → Databricks ingestion proven
- [ ] DQ Framework running structural validations
- [ ] Watchdog monitoring platform health
- [ ] Ready for Sievo proof point

---

## 5. Phase 2: Sievo Proof Point

### 5.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 6 weeks (Feb-Mar 2025) |
| **Objective** | Deliver procurement analytics, validate MEDIAN + first VITAL component |
| **Target Consumption** | Part of $400K Year 1 |
| **Theme** | "Prove Value with Real Business Outcome" |
| **Owner** | Sarah Pacer (Sr. Manager, Supply Chain) |

### 5.2 Entry Criteria

- [ ] Phase 1 (MEDIAN Foundation) complete
- [ ] Fabric → Databricks ingestion operational
- [ ] DQ Framework deployed
- [ ] Access to procurement data from 22 ERPs

### 5.3 Deliverables

| ID | Deliverable | Owner | Week | Dependencies |
|----|-------------|-------|------|--------------|
| P2-D1 | Procurement data ingested from Fabric | Neha / DE | Week 2 | P1-D7 |
| P2-D2 | DQ rules for procurement data | SMEs + DE | Week 3 | P2-D1, P1-D6 |
| P2-D3 | SME review workflow (CURATE stage) | Stuart / Mirion | Week 4 | P2-D2 |
| P2-D4 | Medallion architecture (Bronze/Silver/Gold) | DE team | Week 4 | P2-D1 |
| P2-D5 | SQL endpoint for PowerBI | Neha / Mirion | Week 5 | P2-D4 |
| P2-D6 | PLM Revenue Dashboards | Todd / Analysts | Week 6 | P2-D5 |

### 5.4 Milestones

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P2-M1 | Data flowing | Week 2 | Procurement data in Databricks from Fabric |
| P2-M2 | DQ operational | Week 3 | Validation rules catching data quality issues |
| P2-M3 | SME review live | Week 4 | First VITAL component (CURATE) operational |
| P2-M4 | Dashboards delivered | Week 6 | PLMs using PowerBI dashboards |
| P2-M5 | **Sievo complete** | **March 2025** | Sarah Pacer sign-off on deliverables |

### 5.5 Exit Criteria

- [ ] Procurement analytics live and in use
- [ ] MEDIAN foundation validated with real workload
- [ ] First VITAL component (CURATE) proven
- [ ] SME review workflow documented and repeatable
- [ ] Sarah Pacer sign-off
- [ ] Patterns ready to extend to VITAL use cases

### 5.6 Key Insight

**Sievo proves MEDIAN works. The same patterns then scale to VITAL customer-facing use cases.**

---

## 6. Phase 3: VITAL Pilot

### 6.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 9 months (Q2-Q4 Year 1) |
| **Objective** | Launch VITAL platform with 5-10 pilot customers |
| **Target Consumption** | $400K annual run rate |
| **Theme** | "Prove the Physics Engine" |

### 6.2 Entry Criteria

- [ ] Phase 2 (Sievo) complete with sign-off
- [ ] MC simulation code validated for cloud deployment
- [ ] Pilot customers committed
- [ ] CoE team at operational capacity

### 6.3 Deliverables

| ID | Deliverable | Owner | Quarter | Dependencies |
|----|-------------|-------|---------|--------------|
| P3-D1 | ACE Edge data pipeline MVP | Mirion | Q2 | P1-D5 |
| P3-D2 | Streaming ingestion pipeline | Mirion | Q2 | P1-D5 |
| P3-D3 | MC simulation workload (GEANT4) | Kyle / Stuart | Q2 | P0-D3 |
| P3-D4 | **VITAL Workbench v1** | Stuart / Mirion | Q2 | P2-D3 |
| P3-D5 | Customer portal MVP | Mirion | Q3 | P3-D1, P3-D4 |
| P3-D6 | Self-service dashboards | Mirion | Q3 | P3-D2 |
| P3-D7 | First calibration service live | Mirion | Q3 | P3-D3 |
| P3-D8 | Pilot deployment playbook | Mirion | Q4 | P3-D5 |
| P3-D9 | 5-10 customers live | Mirion | Q4 | P3-D8 |

#### VITAL Workbench Scope (P3-D4)

The VITAL Workbench is a Databricks App providing mission control for AI lifecycle management:

| Component | Phase 3 (MVP) | Phase 4+ (Scale) |
|-----------|---------------|------------------|
| **DATA** | Browse UC datasets, trigger extraction | Automated extraction pipelines |
| **TEMPLATE** | Create/version prompt templates | Template marketplace, sharing |
| **CURATE** | AI pre-labeling + SME review queue | Batch labeling, quality metrics |
| **TRAIN** | Manual fine-tuning job trigger | Scheduled retraining, auto-tuning |
| **DEPLOY** | Cloud deployment only | Edge + Airgap deployment |
| **MONITOR** | Basic latency/drift metrics | Full observability, alerting |
| **IMPROVE** | Manual feedback capture | Automated feedback loops |

### 6.4 Milestones

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P3-M1 | First workload | Q2 | Telemetry pipeline for 2-3 pilot customers |
| P3-M2 | MC at scale | Q2 | 10x throughput vs legacy infrastructure |
| P3-M3 | Customer value | Q3 | First dashboard delivered, MC pilot running |
| P3-M4 | 5 pilots live | Q4 | Customers consuming managed service |
| P3-M5 | CoE operational | Q4 | Team trained, runbooks documented |

### 6.5 Exit Criteria

- [ ] Platform operational with 99.9% uptime
- [ ] 5-10 pilot customers live and consuming services
- [ ] MC simulation workload validated at 10K+ sims
- [ ] Customer NPS > 30 for pilot customers
- [ ] CoE team fully staffed and trained
- [ ] Consumption on track: $400K annual run rate

---

## 7. Phase 4: Scale

### 7.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 12 months (Year 2) |
| **Objective** | Scale to 20-40 customers |
| **Target Consumption** | $800K |
| **Theme** | "Managed Services at Scale" |

### 7.2 Entry Criteria

- [ ] Phase 3 complete with 5+ customers live
- [ ] Customer onboarding < 4 weeks
- [ ] MC simulation workload stable
- [ ] CoE team at full capacity

### 7.3 Deliverables

| ID | Deliverable | Owner | Quarter |
|----|-------------|-------|---------|
| P4-D1 | Productized onboarding (< 2 weeks) | Mirion | Q1 |
| P4-D2 | Full MC calibration service | Mirion | Q2 |
| P4-D3 | ACE Cloud deployment | Mirion | Q2 |
| P4-D4 | Predictive calibration drift (ML v1) | Mirion | Q3 |
| P4-D5 | Data Clean Room (beta) | Mirion | Q4 |
| P4-D6 | 20-40 customers live | Mirion | Q4 |

### 7.4 Milestones

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P4-M1 | Onboarding < 2 weeks | Q1 | Playbook executed for 3+ customers |
| P4-M2 | MC production scale | Q2 | 100K+ simulations per calibration |
| P4-M3 | First ML model deployed | Q3 | Drift prediction model in production |
| P4-M4 | Clean Room beta | Q4 | 5+ customers participating |
| P4-M5 | 20 customers live | Q4 | Verified consumption |

### 7.5 Exit Criteria

- [ ] 20-40 customers live and consuming services
- [ ] Customer onboarding < 2 weeks
- [ ] MC calibration service generating revenue
- [ ] First ML model deployed
- [ ] Data Clean Room beta with 5+ participants
- [ ] Consumption on track: $800K annual run rate

---

## 8. Phase 5: Optimize

### 8.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 12 months (Year 3) |
| **Objective** | Achieve 50-86 customers, ML-driven calibration |
| **Target Consumption** | $1.5M |
| **Theme** | "ML-Driven Analytics" |

### 8.2 Entry Criteria

- [ ] Phase 4 complete with 20+ customers
- [ ] ML pipeline operational
- [ ] Data Clean Room validated

### 8.3 Deliverables

| ID | Deliverable | Owner | Quarter |
|----|-------------|-------|---------|
| P5-D1 | GovCloud/FedRAMP deployment (Airgap) | Mirion | Q2 |
| P5-D2 | ML-driven calibration | Mirion | Q2 |
| P5-D3 | Anomaly detection model | Mirion | Q3 |
| P5-D4 | Predictive maintenance model | Mirion | Q3 |
| P5-D5 | 50-86 customers live | Mirion | Q4 |

### 8.4 Milestones

| ID | Milestone | Target | Success Criteria |
|----|-----------|--------|------------------|
| P5-M1 | Airgap deployment | Q2 | First GovCloud customer live |
| P5-M2 | ML-driven calibration | Q2 | 50% calibrations using ML |
| P5-M3 | 50 customers | Q3 | Consumption verified |
| P5-M4 | 86 customers | Q4 | 20% market penetration |

### 8.5 Exit Criteria

- [ ] 50-86 customers live (20% market penetration)
- [ ] GovCloud/FedRAMP deployment operational
- [ ] ML models driving significant customer value
- [ ] Consumption on track: $1.5M annual run rate

---

## 9. Phase 6: Expand

### 9.1 Overview

| Attribute | Details |
|-----------|---------|
| **Duration** | 24 months (Years 4-5) |
| **Objective** | 86-150+ customers, Clean Rooms GA, industrial expansion |
| **Target Consumption** | $2.8M → $5.0M |
| **Theme** | "Platform Ecosystem & Market Leadership" |

### 9.2 Entry Criteria

- [ ] Phase 5 complete with 50+ customers
- [ ] Clean Room proven with beta customers
- [ ] All ACE modes operational

### 9.3 Deliverables

| ID | Deliverable | Owner | Quarter |
|----|-------------|-------|---------|
| P6-D1 | Data Clean Room GA | Mirion | Y4-Q1 |
| P6-D2 | SaaS pricing model | Mirion | Y4-Q1 |
| P6-D3 | Advanced ML (RUL prediction) | Mirion | Y4-Q2 |
| P6-D4 | Partner integrations (Westinghouse) | Mirion | Y4-Q3 |
| P6-D5 | 86+ customers live | Mirion | Y4-Q4 |
| P6-D6 | Industrial expansion (oil & gas, medical) | Mirion | Y5-Q2 |
| P6-D7 | Real-time adaptive calibration | Mirion | Y5-Q2 |
| P6-D8 | Platform ecosystem (3rd party apps) | Mirion | Y5-Q3 |
| P6-D9 | 150+ customers live | Mirion | Y5-Q4 |

### 9.4 Exit Criteria

- [ ] 150+ customers across nuclear and industrial
- [ ] Market leadership position established
- [ ] Clean Rooms generating SaaS revenue
- [ ] Partner ecosystem established
- [ ] Platform ecosystem with 3rd party apps
- [ ] Consumption achieved: $5.0M annual

---

## 10. Risk Register

### 10.1 Risk Matrix

| ID | Risk | Likelihood | Impact | Score | Mitigation | Owner |
|----|------|------------|--------|-------|------------|-------|
| R1 | MC codes can't run on cloud (licensing) | Medium | High | **High** | Phase 0 validation; GEANT4 fallback; hybrid architecture | Mirion Legal |
| R2 | Customer adoption slower than forecast | Medium | High | **High** | Invest in onboarding; prove value with pilots | Mirion Sales |
| R3 | CoE capacity/skills gap | Medium | Medium | **Medium** | Databricks enablement; augment with PS | Mirion |
| R4 | Technical complexity delays platform | Medium | Medium | **Medium** | Phased approach; quick wins first | Mirion |
| R5 | Security concerns block adoption | Low | High | **Medium** | Early security engagement; compliance certs | Mirion CISO |
| R6 | Competitive response | Low | Medium | **Low** | Move fast; leverage installed base | Mirion |

### 10.2 Monte Carlo Contingency Plans

**If MC licensing blocks cloud deployment:**

| Option | Description | Consumption Impact |
|--------|-------------|-------------------|
| **Option A: Hybrid** | Databricks for orchestration/data, on-prem for MC compute | Reduced (data/analytics only) |
| **Option B: GEANT4** | Build on open-source foundations (no licensing) | Full (requires validation) |
| **Option C: Proprietary** | Focus on Mirion-owned codes only | Variable (depends on scope) |

---

## 11. Center of Excellence

### 11.1 Organizational Model

```
                    ┌─────────────────┐
                    │ CoE Leadership  │
                    │ (Konner, Hector)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Platform     │ │      Data       │ │  Analytics &    │
│   Engineering   │ │   Engineering   │ │  Data Science   │
│                 │ │                 │ │                 │
│ - Infrastructure│ │ - Pipelines     │ │ - MC Simulation │
│ - DevOps        │ │ - Data Quality  │ │ - ML Models     │
│ - Security      │ │ - Integration   │ │ - Dashboards    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 11.2 Hiring Plan

| Role | Count | Phase | Key Skills |
|------|-------|-------|------------|
| Platform/DevOps Engineer | 2-3 | Phase 1 | Databricks, Terraform, CI/CD, Security |
| Data Engineer | 3-4 | Phase 1 | Spark, Python, Delta Lake, Streaming |
| Data Scientist / ML Engineer | 2-3 | Phase 1-2 | ML, Python, MLflow, Physics background helpful |
| Analytics Engineer | 2-3 | Phase 1-2 | SQL, dbt, Dashboard design |
| Solutions Architect | 1-2 | Phase 2 | Customer-facing, Integration design |

### 11.3 Training Plan

| Training | Provider | Audience | Timing |
|----------|----------|----------|--------|
| Databricks Fundamentals | Databricks | All engineers | Phase 0-1 |
| Unity Catalog Administration | Databricks | Platform engineers | Phase 1 |
| Delta Lake Deep Dive | Databricks | Data engineers | Phase 1 |
| MLflow & Model Serving | Databricks | Data scientists | Phase 1-2 |
| Structured Streaming | Databricks | Data engineers | Phase 1 |

---

## 12. Success Metrics

### 12.1 Platform Metrics

| Metric | Phase 1 | Phase 2 | Phase 3+ |
|--------|---------|---------|----------|
| Uptime | > 99.5% | > 99.9% | > 99.9% |
| Data freshness (telemetry lag) | < 15 min | < 5 min | < 1 min |
| Time to onboard customer | < 4 weeks | < 2 weeks | < 1 week |

### 12.2 Business Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|---------|---------|---------|---------|---------|
| Active customers | 5-10 | 20-40 | 50-86 | 86+ | 150+ |
| Annual consumption | $400K | $800K | $1.5M | $2.8M | $5.0M |
| Market penetration | 2% | 9% | 20% | 20%+ | 35%+ |

### 12.3 Technical Metrics

| Metric | Target |
|--------|--------|
| MC simulations per day | 1,000+ at scale |
| Time to complete calibration | < 4 hours |
| ML model accuracy | > 95% |
| Customer NPS | > 40 |

---

## 13. Appendix: Key Contacts

### 13.1 Mirion Executive Leadership

| Name | Role | Focus Area |
|------|------|------------|
| Shahmeer Mirza | Chief AI Officer (CAO) | Executive sponsor, platform budget owner |
| Thomas (Tom) Logan | Chairman & CEO | Executive sponsor, AI vision |
| Brian Schopfer | CFO | Economic buyer, ROI/TCO |
| Marc Rubel | CIO | IT alignment, ERP abstraction |
| James Cocks | CTO | R&D roadmap, PhD Nuclear Physics |

### 13.2 Mirion Data & AI Team

| Name | Role | Focus Area |
|------|------|------------|
| Ben Sivoravong | Director of Data Platform | MEDIAN architecture, Unity Catalog |
| Kyle Dalal | Principal ML Engineer | ANIMAL team, Edge AI, Monte Carlo |
| Justin Clark | Director of GenAI | Internal chatbots, Mosaic AI migration |

### 13.3 Mirion Business Stakeholders

| Name | Role | Focus Area |
|------|------|------------|
| Sarah Pacer | Procurement / Supply Chain | Sievo project owner |
| Matthew Maddox | VP Digital Commerce | Customer 360, propensity models |
| Adam Brown | Sr. Director of Finance | Golden Record, variance reporting |

### 13.4 Mirion Security & IT

| Name | Role | Focus Area |
|------|------|------------|
| Craig M. | CISO | Data governance, ITAR/PII |
| John Bane | Chief Cyber Security Architect | HIPAA, IL5 compliance |
| Victor Price | IT Manager | Azure subscription, Github admin |

### 13.5 Databricks

| Name | Role | Focus Area |
|------|------|------------|
| Konner | Account Executive | Commercial relationship |
| Hector | Delivery Solutions Architect | Implementation delivery, customer enablement |
| Neha Prabhu | Solution Architect | MEDIAN foundation, data engineering, Sievo |
| Stuart Gano | Solution Architect | VITAL platform, AI/ML, Monte Carlo |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Databricks FE | Initial version |

---

*Document: Project Management Plan*
*Version: 1.1*
*Date: January 2025*
