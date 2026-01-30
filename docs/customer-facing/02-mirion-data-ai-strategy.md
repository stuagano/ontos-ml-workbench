# Mirion Data & AI Platform
## Detailed Strategy Document

**Mirion Technologies × Databricks**

*Technical Architecture, Platform Capabilities, and Implementation Strategy*

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [MEDIAN Foundation](#2-median-foundation)
3. [Sievo Proof Point](#3-sievo-proof-point)
4. [VITAL AI Lifecycle](#4-vital-ai-lifecycle)
5. [The ACE Framework](#5-the-ace-framework)
6. [Monte Carlo Simulations](#6-monte-carlo-simulations)
7. [Platform Workloads](#7-platform-workloads)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Architecture](#9-data-architecture)
10. [ML/AI Strategy](#10-mlai-strategy)
11. [Hub-and-Spoke Data Model](#11-hub-and-spoke-data-model)
12. [Data Clean Rooms](#12-data-clean-rooms)
13. [Security & Compliance](#13-security--compliance)

---

## 1. Platform Overview

### 1.1 Three Integrated Layers

The Mirion Data & AI Platform consists of three integrated layers that build on each other:

| Layer | Name | Purpose | Owner |
|-------|------|---------|-------|
| **Foundation** | MEDIAN | "Lego brick" data platform - workspaces, ingestion, ETL, governance | Ben, Neha |
| **Proof Point** | Sievo | Procurement analytics - validates MEDIAN with immediate business value | Sarah Pacer |
| **AI Lifecycle** | VITAL | AI-powered managed services - templates, curation, training, deployment | Shahmeer, Stuart |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIRION DATA & AI PLATFORM                            │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      VITAL (AI Lifecycle)                       │   │
│   │   DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                               ▲                                         │
│                    Every MEDIAN utility becomes a                       │
│                         VITAL component                                 │
│                               │                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     MEDIAN (Foundation)                         │   │
│   │                                                                 │   │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│   │   │ Schema   │ │   Data   │ │ Metadata │ │  Model   │          │   │
│   │   │ Creation │ │ Quality  │ │ Ingestion│ │ Training │          │   │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│   │                                                                 │   │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐                       │   │
│   │   │ Watchdog │ │  Data    │ │ Service  │                       │   │
│   │   │          │ │ Catalog  │ │ Principal│                       │   │
│   │   └──────────┘ └──────────┘ └──────────┘                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                               ▲                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   Sievo (Proof Point)                           │   │
│   │   Procurement Analytics - First use case validating MEDIAN      │   │
│   │   DQ Framework + Human Review = First VITAL component (CURATE)  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 What the Platform Delivers

The combined platform is a single connected ecosystem that centralizes data from 10,000+ disparate radiation safety instruments into one interface. Mirion operates the platform centrally; customers consume services through portals, dashboards, and reports.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         THE VITAL PLATFORM                              │
│                      (Mirion-Operated, Centralized)                     │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        DATABRICKS                                │   │
│   │                                                                  │   │
│   │   Streaming    Delta Lake    Analytics    MC Sims    ML Models  │   │
│   │   Ingestion    (Unified)     Engine       Engine     Engine     │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                    │
│                                    │                                    │
│        ┌──────────┬──────────┬─────┴─────┬──────────┬──────────┐       │
│        │          │          │           │          │          │       │
│        │ Plant A  │ Plant B  │  Plant C  │   ...    │ Plant N  │       │
│        │ (Edge)   │ (Airgap) │  (Cloud)  │          │ (Edge)   │       │
│        │          │          │           │          │          │       │
│        └──────────┴──────────┴───────────┴──────────┴──────────┘       │
│                                                                         │
│                   430 Nuclear Sites × 10,000+ Instruments               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 The Managed Services Model

The platform enables Mirion to offer managed services that replace customer headcount:

| Before Platform | After Platform |
|-----------------|----------------|
| 3-5 FTEs dedicated to radiation safety data management | Instruments auto-report to centralized platform |
| Manual calibration tracking and scheduling | Calibration managed remotely by Mirion |
| Spreadsheet-based compliance reporting | Compliance reports auto-generated |
| Reactive problem identification | Proactive anomaly detection and alerting |
| Total cost: $450K - $1M/year in labor | Cost: ~$100K/year managed service |

**Net savings to customer: $200K+ per person replaced**

### 1.4 Revenue Model

| Revenue Stream | Model | Example |
|----------------|-------|---------|
| Hardware Sales | One-time | $500K instrument package |
| Platform Subscription | 20% of ACV annually | $100K/year |
| Premium Analytics | Usage-based add-on | Advanced MC simulations |
| Professional Services | Project-based | Custom integrations |
| Data Clean Room Access | Subscription | Industry benchmarking |

---

## 2. MEDIAN Foundation

### 2.1 Overview

MEDIAN is Mirion's internal "lego brick" data platform, inspired by AWS's service model. It provides well-defined, independent services that can be used alone or chained together to fit different use cases.

### 2.2 Core MEDIAN Services

| Service | Purpose | Databricks Component |
|---------|---------|---------------------|
| **Account Management** | Provisions workspaces, users, projects | Unity Catalog + Workspace Admin |
| **Data Ingestion** | Gets data from source systems to MEDIAN | Autoloader, DLT, Fabric Connector |
| **Dataset Management** | Manages datasets, metadata, access controls | Unity Catalog |
| **ETL** | Spark-based notebooks + compute for ETL | Databricks Notebooks + Jobs |
| **ML** | Spark-based notebooks + compute for ML | MLflow + Databricks ML Runtime |
| **Consumption** | Downstream access - SQL, APIs, reverse ETL | SQL Warehouse, Model Serving |
| **MLOps** | Model management and deployment | MLflow Model Registry |

### 2.3 MEDIAN Utilities (The "Lego Bricks")

| Utility | Description | VITAL Stage Mapping |
|---------|-------------|---------------------|
| Schema-Creation Utility | Creates state tables, project scaffolding | DATA, TEMPLATE, CURATE |
| Data Quality Framework | Structural + semantic data validation | CURATE |
| Metadata-Driven Ingestion | Self-describing data pipelines + AI extraction | DATA |
| Model Training Toolkit | Guided ML workflow | TRAIN |
| Databricks Watchdog | Platform monitoring + AI metrics | MONITOR |
| Data Catalog | Prompts, tools, agents registry | TEMPLATE |
| Service Principal Utility | Secure model serving setup | DEPLOY |

### 2.4 Key Insight

**Every MEDIAN utility becomes a VITAL component. Build once, compose into AI lifecycle.**

---

## 3. Sievo Proof Point

### 3.1 Overview

The Sievo project is the immediate proof point that validates the MEDIAN foundation. It delivers procurement analytics using data from 22 ERPs consolidated into a single dashboard.

| Attribute | Details |
|-----------|---------|
| **Project Name** | Sievo / Procurement Analytics |
| **Owner** | Sarah Pacer (Sr. Manager, Supply Chain) |
| **SME** | Alex Malbos (Sr. Director, Cat Management) |
| **Deadline** | March 2025 |
| **Purpose** | Validate MEDIAN + first VITAL component |

### 3.2 What It Validates

| Layer | What Sievo Proves |
|-------|-------------------|
| **MEDIAN** | Data ingestion from Fabric, ETL pipelines, data quality framework |
| **VITAL** | CURATE stage - DQ Framework with human review for SME validation |

### 3.3 Technical Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SIEVO ARCHITECTURE                                   │
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│   │ Microsoft    │    │   MEDIAN     │    │    VITAL     │              │
│   │ Fabric       │───►│   ETL        │───►│   CURATE     │              │
│   │ (22 ERPs)    │    │   Pipeline   │    │   (DQ + SME) │              │
│   └──────────────┘    └──────────────┘    └──────┬───────┘              │
│                                                   │                      │
│                                                   ▼                      │
│                                          ┌──────────────┐               │
│                                          │   PowerBI    │               │
│                                          │  Dashboards  │               │
│                                          └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Success Criteria

- [ ] Fabric → Databricks ingestion operational
- [ ] DQ Framework validating procurement data
- [ ] SME review workflow for data curation
- [ ] PLM Revenue Dashboards in PowerBI
- [ ] Foundation proven for VITAL expansion

---

## 4. VITAL AI Lifecycle

### 4.1 The 7-Stage Pipeline

VITAL extends MEDIAN with an AI-powered lifecycle for building and deploying intelligent applications:

| Stage | Purpose | Key Components |
|-------|---------|----------------|
| **DATA** | Extract & transform | AI Functions, OCR, Embeddings |
| **TEMPLATE** | Reusable prompt IP | Prompt templates, multi-modal |
| **CURATE** | Data quality + labeling | AI pre-labeling, human review, SME validation |
| **TRAIN** | Model development | Fine-tune FMAPI, MLflow tracking |
| **DEPLOY** | Production serving | Model serving, Agent Builder, Tool registry |
| **MONITOR** | Observability | Drift detection, trace viewer, alerts |
| **IMPROVE** | Continuous learning | Feedback capture, gap analysis, attribution |

### 4.2 MEDIAN → VITAL Mapping

```
MEDIAN Utility              VITAL Stage
─────────────────           ───────────────────────────
Schema-Creation      ──────► DATA, TEMPLATE, CURATE (state tables)
Metadata Ingestion   ──────► DATA (+ AI extraction)
Data Quality         ──────► CURATE (+ human review)
Model Training       ──────► TRAIN (+ guided workflow)
Service Principal    ──────► DEPLOY (+ model serving)
Watchdog             ──────► MONITOR (+ AI metrics)
Data Catalog         ──────► TEMPLATE (prompts, tools, agents)
```

### 4.3 VITAL Workbench

The **VITAL Workbench** is a Databricks App that serves as mission control for the AI lifecycle. It provides a unified interface for Mirion's domain experts, physicists, and data stewards to participate in AI development without writing code.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VITAL WORKBENCH                                  │
│                    (Databricks App - Mission Control)                    │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  DATA    TEMPLATE    CURATE    TRAIN    DEPLOY    MONITOR    IMPROVE │
│   │   ○         ○          ●         ○         ○         ○          ○    │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌──────────────────────┐  ┌──────────────────────────────────────┐    │
│   │  Template Library    │  │  Curation Queue                      │    │
│   │  ─────────────────   │  │  ─────────────────                   │    │
│   │  • Defect Detection  │  │  Item #1: [Image] Await Review  ▶    │    │
│   │  • Pred Maintenance  │  │  Item #2: [Sensor] AI Labeled   ✓    │    │
│   │  • Anomaly Alert     │  │  Item #3: [Doc] Needs SME       ⚠    │    │
│   │  • Calibration Asst  │  │  Item #4: [MC Result] Approved  ✓    │    │
│   │  + Create New...     │  │                                      │    │
│   └──────────────────────┘  └──────────────────────────────────────┘    │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  Job Status: Training job "defect-v2" running... [████░░] 67%    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Capabilities

| Stage | Workbench Feature | What Users Do |
|-------|-------------------|---------------|
| **DATA** | Data Browser | Browse Unity Catalog, preview datasets, trigger extraction jobs |
| **TEMPLATE** | Template Editor | Create/version prompt templates with schema definitions |
| **CURATE** | Review Queue | AI pre-labels items; SMEs approve/reject/correct |
| **TRAIN** | Training Dashboard | Configure fine-tuning jobs, track experiments in MLflow |
| **DEPLOY** | Deployment Manager | Deploy models to Edge/Cloud/Airgap, configure routing |
| **MONITOR** | Observability | View latency, drift metrics, trace inference requests |
| **IMPROVE** | Feedback Collector | Capture physicist feedback, identify retraining candidates |

#### The Prompt Template Paradigm

The Workbench is built around a key insight: **with LLMs, data modality no longer matters**. Images, sensor telemetry, documents, and structured data all converge through prompt templates - reusable IP assets that encode Mirion's 60+ years of radiation safety expertise.

| Traditional ML | LLM Era (VITAL Workbench) |
|----------------|---------------------------|
| 4 pipelines, 4 teams, 4 maintenance burdens | 1 template, reusable across all modalities |
| Siloed: Images → CNN, Sensors → Time Series, Docs → NLP | Unified: All → Prompt Template → LLM |
| Facility-specific models | Template works across all 86 facilities |

#### Workbench Use Cases

| Use Case | Template Type | Business Value |
|----------|---------------|----------------|
| **Defect Detection** | Image + Sensor Context → Classification | Reduce manual inspection time by 80% |
| **Predictive Maintenance** | Telemetry → Failure Probability | Prevent unplanned downtime |
| **Anomaly Detection** | Sensor Stream → Alert + Explanation | Early warning for drift/issues |
| **Calibration Insights** | MC Results → Recommendations | Automated calibration guidance |
| **Document Extraction** | Compliance Docs → Structured Data | Automate regulatory reporting |
| **Remaining Useful Life** | Equipment History → RUL Estimate | Optimize maintenance scheduling |

#### Architecture

The Workbench is deployed as a Databricks App with:

```
vital-workbench/
├── backend/                 # FastAPI backend
│   ├── app/api/v1/         # REST endpoints per lifecycle stage
│   ├── app/services/       # Business logic (templates, curation, jobs)
│   └── jobs/               # Databricks job notebooks
├── frontend/               # React + TypeScript + Tailwind
│   └── src/pages/          # 7 stage-specific pages
├── schemas/                # Delta table DDL
├── resources/              # DAB job definitions
├── databricks.yml          # DAB bundle config
└── app.yaml               # Databricks App config
```

#### Unity Catalog Tables

| Table | Purpose |
|-------|---------|
| `mirion_vital.workbench.templates` | Prompt template definitions and versions |
| `mirion_vital.workbench.curation_items` | Items for expert review with labels |
| `mirion_vital.workbench.job_runs` | Job execution history |
| `mirion_vital.workbench.feedback_items` | Expert feedback for improvement |
| `mirion_vital.workbench.model_registry` | Deployed model versions |

### 4.4 Why This Matters

The "build once, compose into AI lifecycle" model means:
- MEDIAN utilities are not throwaway - they become production VITAL components
- Sievo proves MEDIAN works, then same patterns scale to VITAL use cases
- Investment in foundation compounds as AI capabilities are added
- **VITAL Workbench provides the user interface** for domain experts to participate in AI development

---

## 5. The ACE Framework

Nuclear facilities have unique connectivity constraints. The ACE Framework addresses all deployment scenarios:

### 5.1 Deployment Modes

| Mode | Description | Use Case | Data Flow |
|------|-------------|----------|-----------|
| **Airgap** | Completely isolated networks | High-security facilities, reactor control areas | Periodic batch upload via secure transfer |
| **Cloud** | Direct cloud connectivity | Administrative areas, newer facilities | Real-time streaming to platform |
| **Edge** | Local processing with selective sync | Mixed environments, bandwidth-constrained | Edge compute + periodic sync |

### 5.2 Why ACE Matters

This flexibility is Mirion's unique differentiator. Competitors offering cloud-only solutions cannot serve the nuclear industry's security requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE ACE FRAMEWORK                                  │
│              (Airgap → Cloud → Edge → Customer Clean Rooms)                  │
│                                                                              │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                 │
│   │   AIRGAP      │   │    CLOUD      │   │     EDGE      │                 │
│   │   (Phase 3)   │   │   (Phase 2)   │   │   (Phase 1)   │                 │
│   │               │   │               │   │               │                 │
│   │ GovCloud/     │   │ Direct cloud  │   │ On-premise    │                 │
│   │ FedRAMP High  │   │ connectivity  │   │ processing    │                 │
│   │               │   │               │   │               │                 │
│   │ Batch sync    │   │ Real-time     │   │ Local compute │                 │
│   │ via secure    │   │ streaming     │   │ with periodic │                 │
│   │ transport     │   │               │   │ sync          │                 │
│   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘                 │
│           │                   │                   │                          │
│           └───────────────────┼───────────────────┘                          │
│                               ▼                                              │
│                  ┌─────────────────────────┐                                │
│                  │    VITAL PLATFORM HUB   │                                │
│                  │      (Databricks)       │                                │
│                  │                         │                                │
│                  │  - Unified data lake    │                                │
│                  │  - Monte Carlo engine   │                                │
│                  │  - ML/Analytics         │                                │
│                  │  - Governance (Unity)   │                                │
│                  └───────────┬─────────────┘                                │
│                              │                                               │
│                              ▼                                               │
│                  ┌─────────────────────────┐                                │
│                  │   CUSTOMER CLEAN ROOMS  │                                │
│                  │       (Phase 4)         │                                │
│                  │                         │                                │
│                  │  Delta Sharing for      │                                │
│                  │  secure B2B data        │                                │
│                  │  (Westinghouse model)   │                                │
│                  └─────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Implementation Phases

| Phase | Mode | Timeline | Key Capability |
|-------|------|----------|----------------|
| Phase 1 | **Edge** | Year 1 | On-premise processing, periodic sync to hub |
| Phase 2 | **Cloud** | Year 2 | Real-time streaming for connected sites |
| Phase 3 | **Airgap** | Year 3 | GovCloud/FedRAMP for regulated facilities |
| Phase 4 | **Clean Rooms** | Year 4 | Delta Sharing for B2B data exchange |

---

## 6. Monte Carlo Simulations

Monte Carlo simulations are the physics engine at the heart of Mirion's technical differentiation.

### 6.1 The Fundamental Problem

A radiation detector doesn't directly measure radioactivity. It measures the detector's response to radiation - which depends on a complex chain of probabilistic events.

When a detector reads "1000 counts," what actually happened?

```
Source emits      Some photons     Some photons     Some interactions     Counter
1,000,000    ──►  reach        ──► enter        ──► produce          ──► reads
gamma rays        detector         detector         signals               '1000'
per second        (~1% geometry)   (~80% don't      (~30% detection
                                   bounce off)      efficiency)
```

The relationship between "actual source activity" and "detector reading" is called the **calibration factor**. Computing this precisely requires Monte Carlo simulation.

### 6.2 Current Constraints

Companies like Mirion run far fewer simulations than they should. The constraints aren't technical - they're practical:

| License Type | Typical Count | Concurrent Runs |
|--------------|---------------|-----------------|
| Node-locked workstation | 5-10 | 5-10 |
| Floating license | 10-20 (if lucky) | 10-20 |
| HPC cluster license | Maybe 1 | 32-128 cores |

**Result:**
- Statistically ideal: 100,000 simulations
- License-constrained: 1,000 - 5,000 simulations
- Actually run: 500 - 2,000 simulations

Gap filled by extrapolation, conservative safety factors, and "good enough" engineering judgment.

### 6.3 The Business Impact

| Metric | Current State | With Unlimited Simulation |
|--------|---------------|---------------------------|
| Simulations per calibration | 1,000 - 5,000 | 100,000+ |
| Uncertainty in calibration | ±2-5% | ±0.1-0.5% |
| Time to deliver calibration | 2-3 weeks | Hours |
| Calibrations per physicist/year | 50-100 | 500+ |
| Custom geometry support | Limited | Any geometry |

### 6.4 Hybrid GEANT4 + MCNP Strategy

MCNP is export-controlled (Los Alamos/DOE) with licensing restrictions on cloud deployment. The recommended approach is a hybrid model:

| Tool | Use For | Location |
|------|---------|----------|
| **GEANT4** (Open Source) | R&D exploration, ML training data, parameter sweeps | Databricks |
| **MCNP** (Licensed) | Production calibrations, regulatory deliverables, customer certifications | On-Prem / GovCloud |
| **Unity Catalog** | All simulation I/O data (both tools) | Databricks |

**Benefits:**
- GEANT4: No licensing costs, elastic compute, 100K+ sims/job
- MCNP: Regulatory accepted, validated physics models, historical consistency
- Unity Catalog: All I/O unified, ML training on combined datasets, governance & lineage

### 6.5 Why Databricks for Monte Carlo

Monte Carlo simulation is the perfect Databricks workload:

**Embarrassingly Parallel:**
```python
# Each seed is completely independent - perfect for Spark distribution
def run_simulation(seed: int, config: dict) -> dict:
    np.random.seed(seed)
    result = physics_engine.simulate(config)
    return {'seed': seed, 'result': result}

# Distribute 100,000 simulations across cluster
results = (
    spark.sparkContext
    .parallelize(range(100_000), numSlices=500)
    .map(lambda seed: run_simulation(seed, config))
    .collect()
)
# What took days on 10 licenses now takes minutes on 500 cores
```

**Elastic Scaling:**
```
Normal day:     10 calibrations requested
                Small cluster (50 cores), cost: ~$100

Month-end rush: 500 calibrations requested
                Auto-scale to 2000 cores, cost: ~$5,000
                Still complete same-day

No licenses to buy. No hardware to provision. Pay for what you use.
```

### 6.6 Consumption Model

Monte Carlo is compute-intensive. That means DBU consumption:

| Calibration Type | Simulations | Est. Cost |
|------------------|-------------|-----------|
| Basic calibration | 1,000 sims | ~$5 DBUs |
| Standard calibration | 10,000 sims | ~$50 DBUs |
| Full calibration | 100,000 sims | ~$500 DBUs |

**At scale (86 customers, ~1000 calibrations/month):**
- Conservative (basic): 1000 × $5 = $5K/month
- Moderate (standard): 1000 × $50 = $50K/month
- Full capability: 1000 × $500 = $500K/month

**MC simulations alone could drive $500K+/month in consumption at full platform adoption.**

---

## 7. Platform Workloads

### 7.1 Workload Overview

| Workload | Description | Databricks Components | Consumption Driver |
|----------|-------------|----------------------|-------------------|
| Device Telemetry | Ingest data from 10,000+ instruments | Streaming, Delta Lake, Auto Loader | Data volume |
| Data Unification | Single view across all customer sites | Delta Lake, Unity Catalog | Data storage, ETL jobs |
| Analytics & Dashboards | Self-service insights for customers | Databricks SQL, Dashboards | Query volume, concurrent users |
| Monte Carlo Simulations | Calibration, detector response, uncertainty | Spark distributed compute | Simulations requested |
| ML Models | Predictive calibration, anomaly detection | MLflow, Model Serving | Training + inference |
| Data Clean Rooms | Cross-customer benchmarking | Delta Sharing, Unity Catalog | Queries across shared datasets |
| Regulatory Reporting | Automated compliance documentation | Jobs, document generation | Reports generated |

### 7.2 Consumption Scaling Model

Databricks consumption scales with customer adoption, not Mirion headcount:

```
More Customers ──► More Instruments ──► More Data ──► More DBUs
       │                  │                 │              │
       ▼                  ▼                 ▼              ▼
  More Analytics    More Telemetry    More Storage   More Compute
  More MC Sims      More ML Training  More Queries   More Revenue
```

### 7.3 Per-Customer Consumption Breakdown

**Basic Platform (No MC):**
| Component | Monthly Cost |
|-----------|--------------|
| Telemetry ingestion | $3,000 |
| Storage | $1,000 |
| Basic analytics | $2,000 |
| **Total** | **$6,000** |

**Full Platform (With MC):**
| Component | Monthly Cost |
|-----------|--------------|
| Telemetry ingestion | $3,000 |
| Storage | $1,500 |
| Analytics | $3,000 |
| MC Simulations | $15,000 |
| ML Training/Inference | $3,000 |
| **Total** | **$25,500** |

**MC simulations = 4x consumption multiplier**

---

## 8. Technical Architecture

### 8.1 Centralized Platform Model

The VITAL Platform runs on a single, Mirion-operated Databricks deployment. Customers consume services; they don't interact with Databricks directly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CUSTOMER EXPERIENCE LAYER                         │
│                                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                  │
│   │ Web Portal  │   │ Mobile App  │   │ API Access  │                  │
│   │             │   │ (Future)    │   │             │                  │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                  │
│          └─────────────────┼─────────────────┘                          │
│                            ▼                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                                │
│                                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                  │
│   │ Dashboards  │   │  Reports    │   │   Alerts    │                  │
│   │ (Customer)  │   │  Generator  │   │   Engine    │                  │
│   └─────────────┘   └─────────────┘   └─────────────┘                  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        DATABRICKS PLATFORM                              │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      UNITY CATALOG                               │  │
│   │   (Governance: Access Control, Lineage, Audit, Classification)  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│   │ Streaming  │ │ Delta Lake │ │   Spark    │ │  MLflow    │         │
│   │ Ingestion  │ │  Storage   │ │  Compute   │ │  ML Ops    │         │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘         │
│                                                                         │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│   │    SQL     │ │    Jobs    │ │   Model    │ │   Delta    │         │
│   │ Warehouse  │ │ Scheduler  │ │  Serving   │ │  Sharing   │         │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                       DATA INGESTION LAYER                              │
│                                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                  │
│   │ ACE: Cloud  │   │  ACE: Edge  │   │ ACE: Airgap │                  │
│   │  (Direct)   │   │   (Sync)    │   │  (Batch)    │                  │
│   └─────────────┘   └─────────────┘   └─────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Architecture

### 9.1 Medallion Architecture

| Layer | Purpose | Examples |
|-------|---------|----------|
| **Bronze (Raw)** | Raw data as received | Raw telemetry, raw calibration records, raw simulation outputs |
| **Silver (Validated)** | Cleaned, typed, deduplicated | Standardized schema, validated results |
| **Gold (Analytics)** | Aggregations, KPIs, ML features | Dashboards, calibration certificates |

### 9.2 Core Tables

```sql
-- Customer and site management
mirion.platform.customers
mirion.platform.sites
mirion.platform.instruments

-- Telemetry
mirion.telemetry.raw              -- Bronze: raw readings
mirion.telemetry.validated        -- Silver: cleaned data
mirion.telemetry.aggregates       -- Gold: hourly/daily rollups

-- Calibration & Monte Carlo
mirion.calibration.requests       -- Incoming calibration jobs
mirion.calibration.simulations    -- MC simulation trials (audit trail)
mirion.calibration.results        -- Final calibration coefficients
mirion.calibration.certificates   -- Issued certificates

-- Analytics
mirion.analytics.drift_scores     -- Predicted calibration drift
mirion.analytics.anomalies        -- Detected anomalies
mirion.analytics.fleet_health     -- Cross-customer aggregates (clean room)

-- ML
mirion.ml.feature_store           -- ML features
mirion.ml.predictions             -- Model outputs
mirion.ml.training_data           -- Historical labeled data
```

---

## 10. ML/AI Strategy

### 10.1 The Modality Convergence Insight

With LLMs and foundation models, **data modality no longer matters**. Images, sensor telemetry, documents, and structured data all converge through a unified interface: **prompt templates**.

```
TRADITIONAL ML (Siloed)              LLM ERA (Unified)
─────────────────────────            ─────────────────────────

Images ──► CNN Pipeline              Images ──►┐
Sensors ──► Time Series Model        Sensors ──►├──► PROMPT    ──► LLM
Docs ──► NLP Pipeline                Docs ──────►│   TEMPLATE
Tables ──► XGBoost                   Tables ────►┘

4 pipelines, 4 teams,                1 template, reusable across
4 maintenance burdens                all modalities and facilities
```

### 10.2 Prompt Templates as Reusable IP Assets

A prompt template defines how to transform ANY data into a standardized format for LLM fine-tuning or inference:

```python
# Example: Defect Detection Prompt Template
template_config = {
    "system_instruction": """You are an expert radiation detector inspector.
    Analyze the provided inspection image and sensor context to identify defects.
    Classify defects by severity: CRITICAL, MAJOR, MINOR, or NONE.
    Explain your reasoning.""",

    "user_content": [
        {"type": "image", "source": "{inspection_image_uri}"},
        {"type": "text", "content": "Sensor readings: {sensor_context}"},
        {"type": "text", "content": "Equipment type: {equipment_type}"},
        {"type": "text", "content": "Last calibration: {calibration_date}"}
    ],

    "expected_response": "{defect_classification}"
}

# This SAME template works across all 86 facilities
# Template becomes proprietary IP - a reusable, repeatable asset
```

### 10.3 Template Library

| Template Category | Use Cases | Data Modalities | Reusability |
|-------------------|-----------|-----------------|-------------|
| **Defect Detection** | Visual inspection, weld analysis, corrosion | Images + sensor context | All facilities |
| **Anomaly Explanation** | Sensor drift, outlier detection | Time series + thresholds | All equipment types |
| **Predictive Maintenance** | Failure prediction, RUL estimation | Telemetry + maintenance history | Cross-facility |
| **Document Analysis** | Compliance extraction, report generation | PDFs, forms, manuals | Regulatory workflows |
| **Calibration Assistant** | MC result interpretation, factor recommendations | Simulation outputs + physics context | All calibration jobs |

### 10.4 Initial ML Use Cases (Year 1-2)

| Priority | Use Case | Template Type | Business Value |
|----------|----------|---------------|----------------|
| **P0** | Defect Detection | Image + Context → Classification | Reduce manual inspection time by 80% |
| **P0** | Predictive Maintenance | Telemetry → Failure Probability | Prevent unplanned downtime |
| **P1** | Anomaly Detection | Sensor Stream → Alert + Explanation | Early warning for drift/issues |
| **P1** | Calibration Insights | MC Results → Recommendations | Automated calibration guidance |
| **P2** | Document Extraction | Compliance Docs → Structured Data | Automate regulatory reporting |
| **P2** | Remaining Useful Life | Equipment History → RUL Estimate | Optimize maintenance scheduling |

---

## 11. Hub-and-Spoke Data Model

### 11.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HUB-AND-SPOKE ARCHITECTURE                           │
│                                                                             │
│                            ┌─────────────────┐                              │
│                            │                 │                              │
│                            │   CENTRAL HUB   │                              │
│                            │   (Databricks)  │                              │
│                            │                 │                              │
│                            │ ┌─────────────┐ │                              │
│                            │ │ Unity       │ │                              │
│                            │ │ Catalog     │ │                              │
│                            │ └─────────────┘ │                              │
│                            │                 │                              │
│                            │ ┌─────────────┐ │                              │
│                            │ │ Delta Lake  │ │                              │
│                            │ │ (Gold/MDM)  │ │                              │
│                            │ └─────────────┘ │                              │
│                            │                 │                              │
│                            └────────┬────────┘                              │
│                                     │                                       │
│                ┌────────────────────┼────────────────────┐                 │
│                │                    │                    │                 │
│                ▼                    ▼                    ▼                 │
│      ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│      │   SPOKE: BU 1   │  │   SPOKE: BU 2   │  │   SPOKE: BU 3   │        │
│      │  (Technologies) │  │    (Medical)    │  │  (Industrial)   │        │
│      │                 │  │                 │  │                 │        │
│      │ Delta Sharing   │  │ Delta Sharing   │  │ Delta Sharing   │        │
│      │ (Read access    │  │ (Read access    │  │ (Read access    │        │
│      │  to Hub data)   │  │  to Hub data)   │  │  to Hub data)   │        │
│      └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                             │
│      ┌─────────────────────────────────────────────────────────────────┐   │
│      │                      EXTERNAL SPOKES                            │   │
│      │                    (Customer Clean Rooms)                       │   │
│      │                                                                 │   │
│      │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐     │   │
│      │  │Utility A │  │Utility B │  │Westinghouse│ │ NRC/DOE   │     │   │
│      │  │          │  │          │  │           │  │(Regulator) │     │   │
│      │  │Benchmark │  │Benchmark │  │ Secure    │  │ Aggregate  │     │   │
│      │  │ data     │  │ data     │  │ sharing   │  │ insights   │     │   │
│      │  └──────────┘  └──────────┘  └───────────┘  └───────────┘     │   │
│      └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│      KEY: Hub owns governance. Spokes consume via Delta Sharing.            │
│           No data duplication. Query in place.                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Benefits

- BUs query Hub data without duplicating it
- Governance centralized in Unity Catalog
- External sharing creates new SaaS revenue stream
- PHI/Nuclear data tagged and controlled at the Hub

---

## 12. Data Clean Rooms

### 12.1 The Opportunity

Mirion's position serving 95% of nuclear plants creates a unique opportunity: aggregate insights across the industry without exposing individual customer data.

### 12.2 Use Cases

- **Industry Benchmarking:** "How does my plant's detector performance compare to industry average?"
- **Best Practice Identification:** "What calibration intervals do similar facilities use?"
- **Anomaly Correlation:** "Are other plants seeing this issue?"
- **Regulatory Intelligence:** "What compliance approaches are working industry-wide?"

### 12.3 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA CLEAN ROOM                                │
│                                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                  │
│   │   Plant A   │   │   Plant B   │   │   Plant C   │                  │
│   │  Raw Data   │   │  Raw Data   │   │  Raw Data   │                  │
│   │  (Private)  │   │  (Private)  │   │  (Private)  │                  │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                  │
│          │                 │                 │                          │
│          ▼                 ▼                 ▼                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    AGGREGATION LAYER                             │  │
│   │                (Unity Catalog + Delta Sharing)                   │  │
│   │                                                                  │  │
│   │  - Statistical aggregates only                                   │  │
│   │  - No individual plant identification                            │  │
│   │  - Minimum cohort sizes enforced                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                 │                                       │
│                                 ▼                                       │
│                        Industry Insights                                │
│                   (Available to all customers)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mirion becomes the trusted data steward for the nuclear industry - a position no competitor can easily replicate.**

---

## 13. Security & Compliance

| Requirement | Databricks Capability | Implementation |
|-------------|----------------------|----------------|
| Data Isolation | Unity Catalog | Customer data in separate schemas, row-level security |
| Access Control | RBAC + ABAC | Role-based access, attribute-based policies |
| Audit Trail | Unity Catalog Audit Logs | All data access logged, queryable |
| Data Classification | Tags & Policies | PII, export-controlled data tagged |
| Encryption | At-rest & in-transit | Platform default + customer-managed keys option |
| Regulatory | SOC2, FedRAMP (if needed) | Databricks compliance certifications |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `01-mirion-data-ai-executive-vision.md` | Executive summary for leadership |
| `03-mirion-data-ai-project-plan.md` | PMP-style project plan with milestones |
| `monte-carlo-discovery-questions.md` | Technical qualification checklist for MC |

---

*Document: Detailed Strategy*
*Version: 1.1*
*Date: January 2025*
