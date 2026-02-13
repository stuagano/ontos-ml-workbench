# VITAL Workbench + Ontos Integration Design

**Version:** 1.0
**Date:** 2026-02-12
**Status:** Design Draft
**Author:** Stuart Gano

---

## Executive Summary

This document describes the integration between **VITAL Workbench** (Mirion's AI-powered radiation safety platform) and **Ontos** (a data governance platform for Databricks Unity Catalog). The integration enables VITAL's domain-specific business metrics and terminology to serve as the core content for Ontos's governance capabilities, providing enterprise-grade data governance "for free" on top of the existing ML workflow.

### The Core Insight

VITAL Workbench already defines rich business semantics through its canonical labels, defect classifications, quality metrics, and labeling workflows. Rather than building governance capabilities from scratch, we can leverage Ontos as a governance layer that consumes VITAL's domain knowledge and provides:

- Semantic search across business terms
- Data contracts with SLO enforcement
- Compliance automation and audit trails
- Impact analysis and lineage visualization
- AI-assisted governance queries via MCP

**Your business metrics become the content. Ontos provides the platform.**

---

## Architecture Overview

### Shared Foundation: Unity Catalog

Both applications share the same Unity Catalog namespace, with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UNITY CATALOG                                    │
│                   mirion_vital_workbench schema                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OPERATIONAL TABLES              GOVERNANCE TABLES                      │
│  (VITAL Workbench owns)          (Ontos owns)                          │
│  ─────────────────────           ──────────────────                    │
│  • sheets                        • glossary_terms                       │
│  • canonical_labels              • data_contracts                       │
│  • templates                     • compliance_rules                     │
│  • training_sheets               • compliance_results                   │
│  • qa_pairs                      • review_workflows                     │
│  • training_jobs                 • semantic_relationships               │
│  • model_training_lineage        • audit_log                           │
│                                                                         │
│  SHARED VIEWS                                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  • v_term_usage (glossary terms → canonical labels)                    │
│  • v_contract_compliance (contracts → training data)                   │
│  • v_lineage_graph (full data → model lineage)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Application Layer

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                                 │
├──────────────────────────────┬──────────────────────────────────────────┤
│                              │                                          │
│   VITAL WORKBENCH            │   ONTOS                                  │
│   (ML Workflow)              │   (Governance)                           │
│                              │                                          │
│   ┌────────────────────┐     │   ┌────────────────────┐                │
│   │  DATA → LABEL →    │     │   │  Business Glossary │                │
│   │  TRAIN → DEPLOY →  │     │   │  Data Contracts    │                │
│   │  MONITOR → IMPROVE │     │   │  Compliance Dash   │                │
│   └────────────────────┘     │   │  Review Workflows  │                │
│                              │   │  Semantic Search   │                │
│   Focus: Operations          │   └────────────────────┘                │
│   Users: Data Scientists,    │                                          │
│          Domain Experts      │   Focus: Governance                      │
│                              │   Users: Data Stewards,                  │
│                              │          Compliance Officers             │
│                              │                                          │
├──────────────────────────────┴──────────────────────────────────────────┤
│                         SHARED SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│   │  Databricks │  │  MCP Server │  │  Event Bus  │  │  Auth/RBAC  │  │
│   │  SQL        │  │  (AI Layer) │  │  (Sync)     │  │  (Unity)    │  │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Business Glossary: Your Domain Terms

The following terms from VITAL Workbench's domain model become first-class glossary entries in Ontos. This enables semantic search, impact analysis, and compliance automation.

### Domain Hierarchy

```
Mirion VITAL Platform
├── Quality Control
│   ├── Defect Classification
│   │   ├── Solder Bridge
│   │   ├── Cold Joint
│   │   ├── Missing Component
│   │   ├── Discoloration
│   │   └── Scratch
│   ├── Severity Levels
│   │   ├── Low
│   │   ├── Medium
│   │   ├── High
│   │   └── Critical
│   └── Quality Metrics
│       ├── First Pass Yield
│       ├── Defect Rate by Location
│       └── Defect Rate by Type
│
├── Manufacturing Process
│   ├── SMT Process Metrics
│   │   ├── Stencil Alignment Score
│   │   ├── Reflow Temperature Profile
│   │   └── Pick-and-Place Accuracy
│   └── Process Improvement
│       └── Root Cause Analysis
│
└── Model Lifecycle
    ├── Data Quality
    │   ├── Label Coverage
    │   ├── Label Confidence
    │   └── Label Reuse Rate
    ├── Training Metrics
    │   ├── Train/Val Split
    │   ├── Model Accuracy
    │   └── Human-AI Agreement
    └── Operational Metrics
        ├── Inference Latency
        ├── Prediction Confidence
        └── Drift Score
```

### Term Definitions

#### Defect Classification Terms

| Term | Definition | Data Source | Measurement |
|------|------------|-------------|-------------|
| **Solder Bridge** | Unintended solder connection between adjacent pads or pins, creating electrical short | `canonical_labels.label_data` | `defect_type = 'solder_bridge'` |
| **Cold Joint** | Solder joint formed with insufficient heat, resulting in poor mechanical/electrical bond characterized by dull, grainy appearance | `canonical_labels.label_data` | `defect_type = 'cold_joint'` |
| **Missing Component** | Component absent from designated PCB location due to pick-and-place failure | `canonical_labels.label_data` | `defect_type = 'missing_component'` |
| **Discoloration** | Color change on PCB surface indicating thermal stress, oxidation, or contamination | `canonical_labels.label_data` | `defect_type = 'discoloration'` |
| **Scratch** | Physical damage to PCB surface, traces, or solder mask | `canonical_labels.label_data` | `defect_type = 'scratch'` |
| **Pass** | No defects detected; all quality criteria met | `canonical_labels.label_data` | `defect_type = 'pass'` |

#### Quality Metrics Terms

| Term | Definition | Formula | Target SLO |
|------|------------|---------|------------|
| **Label Coverage** | Percentage of items in a Sheet with expert-validated canonical labels | `COUNT(canonical_labels) / sheet.item_count * 100` | >= 30% for training readiness |
| **Label Reuse Rate** | Average number of times canonical labels are automatically reused across Training Sheets | `AVG(canonical_labels.reuse_count)` | Higher is better (efficiency) |
| **First Pass Yield** | Percentage of inspected units passing QC without rework | `COUNT(pass) / COUNT(total) * 100` | >= 95% |
| **Label Confidence** | Expert's certainty in assigned label (high/medium/low) | Categorical | >= 80% high confidence for production models |
| **Human-AI Agreement** | Rate at which AI predictions match expert labels | `COUNT(matching) / COUNT(compared) * 100` | >= 90% |

#### Severity Level Terms

| Term | Definition | Indicators | Action Required |
|------|------------|------------|-----------------|
| **Low** | Minor defect, cosmetic only, no functional impact | Surface scratches without copper exposure | Log for trending |
| **Medium** | Defect with potential reliability impact | Partial bridges, light discoloration | Review and possible rework |
| **High** | Defect likely causing functional failure | Complete shorts, severe discoloration | Mandatory rework |
| **Critical** | Safety-critical defect | Component failure risk | Halt production, immediate escalation |

---

## Data Contracts

Each data asset in VITAL Workbench has a corresponding Data Contract in Ontos following the Open Data Contract Standard (ODCS) v3.0.2.

### Contract: Canonical Labels

```yaml
# ODCS v3.0.2 Data Contract
dataContractSpecification: 0.9.3
id: mirion-canonical-labels-v1
info:
  title: Canonical Labels Contract
  version: 1.0.0
  description: Expert-validated ground truth labels for ML training
  owner: QA Team
  contact:
    name: Mirion QA Engineering
    email: qa-engineering@mirion.com

dataset:
  - table: canonical_labels
    description: Ground truth labels with composite key (sheet_id, item_ref, label_type)

schema:
  type: object
  properties:
    id:
      type: string
      description: Unique identifier
      required: true
    sheet_id:
      type: string
      description: Reference to source Sheet
      required: true
    item_ref:
      type: string
      description: Identifier for source item
      required: true
    label_type:
      type: string
      description: Type of label (must match templates.label_type)
      required: true
      enum: [defect_detection, classification, entity_extraction]
    label_data:
      type: object
      description: The actual label (structure varies by label_type)
      required: true
    label_confidence:
      type: number
      description: Expert confidence (0.0-1.0)
      minimum: 0
      maximum: 1

quality:
  - type: completeness
    dimension: label_data
    rule: "label_data IS NOT NULL"
    threshold: 100

  - type: validity
    dimension: label_confidence
    rule: "label_confidence BETWEEN 0 AND 1"
    threshold: 100

  - type: freshness
    rule: "updated_at >= CURRENT_DATE - INTERVAL 90 DAYS"
    threshold: 95
    description: Labels should be reviewed within 90 days

  - type: uniqueness
    rule: "UNIQUE(sheet_id, item_ref, label_type)"
    threshold: 100
    description: Composite key must be unique

sla:
  availability: 99.9%
  latency:
    p95: 100ms
    p99: 500ms
  freshness: 24 hours

terms:
  usage:
    - Training ML models for radiation safety applications
    - Validation and testing of deployed models
    - Quality assurance reporting
  limitations:
    - Labels with prohibited_uses must be excluded from specified uses
    - Labels with confidence < 0.7 require additional review before production use
  billing: Internal cost center QA-001
```

### Contract: Training Sheets (Q&A Datasets)

```yaml
dataContractSpecification: 0.9.3
id: mirion-training-sheets-v1
info:
  title: Training Sheets Contract
  version: 1.0.0
  description: Materialized Q&A pairs for model fine-tuning
  owner: ML Engineering

schema:
  type: object
  properties:
    id:
      type: string
      required: true
    sheet_id:
      type: string
      required: true
    template_config:
      type: object
      required: true
    total_rows:
      type: integer
      minimum: 1
    human_verified_count:
      type: integer
      minimum: 0

quality:
  - type: custom
    dimension: verification_rate
    rule: "human_verified_count / total_rows >= 0.3"
    threshold: 100
    description: At least 30% of rows must be human-verified

  - type: custom
    dimension: canonical_coverage
    rule: "canonical_reused_count / total_rows >= 0.2"
    threshold: 80
    description: Prefer Training Sheets with canonical label reuse

sla:
  availability: 99.5%
```

---

## Compliance Rules

Ontos enforces governance policies using declarative rules that automatically check VITAL Workbench data.

### Rule: High-Severity Review Requirement

```python
@compliance_rule(
    name="high_severity_dual_review",
    domain="Quality Control",
    severity="critical",
    schedule="hourly"
)
def high_severity_requires_dual_review():
    """
    All high-severity defect labels must be reviewed by at least 2 experts
    before being used in production model training.
    """
    return """
    SELECT
        cl.id,
        cl.item_ref,
        cl.label_data:defect_type::STRING as defect_type,
        cl.label_data:severity::STRING as severity,
        cl.reviewed_by,
        'HIGH_SEVERITY_SINGLE_REVIEW' as violation_type
    FROM canonical_labels cl
    WHERE cl.label_data:severity::STRING = 'high'
      AND ARRAY_SIZE(SPLIT(cl.reviewed_by, ',')) < 2
      AND cl.id IN (
          SELECT DISTINCT canonical_label_id
          FROM qa_pairs
          WHERE allowed_uses LIKE '%production%'
      )
    """
```

### Rule: Label Coverage Threshold

```python
@compliance_rule(
    name="minimum_label_coverage",
    domain="Model Lifecycle",
    severity="warning",
    schedule="daily"
)
def minimum_label_coverage():
    """
    Sheets intended for training must have at least 30% label coverage.
    """
    return """
    SELECT
        s.id as sheet_id,
        s.name as sheet_name,
        s.item_count,
        COUNT(cl.id) as label_count,
        COUNT(cl.id) * 100.0 / s.item_count as coverage_pct,
        'INSUFFICIENT_LABEL_COVERAGE' as violation_type
    FROM sheets s
    LEFT JOIN canonical_labels cl ON s.id = cl.sheet_id
    WHERE s.status = 'active'
    GROUP BY s.id, s.name, s.item_count
    HAVING coverage_pct < 30
    """
```

### Rule: Confidence Threshold for Production

```python
@compliance_rule(
    name="production_confidence_threshold",
    domain="Model Lifecycle",
    severity="error",
    schedule="on_training_job_create"
)
def production_confidence_threshold():
    """
    Training jobs for production models must use labels with >= 80% high confidence.
    """
    return """
    SELECT
        tj.id as training_job_id,
        tj.model_name,
        COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) as high_conf_count,
        COUNT(cl.id) as total_labels,
        COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) * 100.0 / COUNT(cl.id) as high_conf_pct,
        'LOW_CONFIDENCE_TRAINING_DATA' as violation_type
    FROM training_jobs tj
    JOIN training_sheets ts ON tj.training_sheet_id = ts.id
    JOIN qa_pairs qp ON ts.id = qp.training_sheet_id
    JOIN canonical_labels cl ON qp.canonical_label_id = cl.id
    WHERE tj.register_to_uc = true  -- Production model
    GROUP BY tj.id, tj.model_name
    HAVING high_conf_pct < 80
    """
```

---

## Semantic Relationships (Knowledge Graph)

The integration creates a queryable knowledge graph linking business concepts to physical data assets.

### Relationship Types

```
TERM ──defines──> METRIC
METRIC ──measured_by──> DATA_CONTRACT
DATA_CONTRACT ──validates──> TABLE
TABLE ──contains──> COLUMN
COLUMN ──maps_to──> TERM

TERM ──related_to──> TERM
TERM ──broader_than──> TERM
TERM ──narrower_than──> TERM

CANONICAL_LABEL ──instance_of──> DEFECT_TYPE_TERM
TRAINING_SHEET ──uses──> TEMPLATE
TEMPLATE ──produces──> QA_PAIRS
MODEL ──trained_on──> TRAINING_SHEET
```

### Example Queries (via MCP)

**Natural Language:** "What defect types are causing the most rework?"

```sql
-- Ontos translates to:
SELECT
    gt.name as defect_type,
    gt.definition,
    COUNT(cl.id) as occurrence_count,
    AVG(CASE WHEN cl.label_data:severity = 'high' THEN 1 ELSE 0 END) as high_severity_rate
FROM glossary_terms gt
JOIN semantic_relationships sr ON gt.id = sr.term_id
JOIN canonical_labels cl ON sr.asset_id = cl.id
WHERE gt.domain = 'Quality Control'
  AND sr.relationship_type = 'instance_of'
GROUP BY gt.name, gt.definition
ORDER BY occurrence_count DESC
```

**Natural Language:** "Which models would be affected if we change the solder bridge definition?"

```sql
-- Impact analysis query:
WITH term_usage AS (
    SELECT DISTINCT
        tj.model_name,
        tj.uc_model_version,
        ts.name as training_sheet,
        COUNT(cl.id) as affected_labels
    FROM glossary_terms gt
    JOIN canonical_labels cl ON cl.label_data:defect_type = gt.measurement_rule
    JOIN qa_pairs qp ON qp.canonical_label_id = cl.id
    JOIN training_sheets ts ON qp.training_sheet_id = ts.id
    JOIN training_jobs tj ON tj.training_sheet_id = ts.id
    WHERE gt.name = 'Solder Bridge'
    GROUP BY tj.model_name, tj.uc_model_version, ts.name
)
SELECT * FROM term_usage ORDER BY affected_labels DESC
```

---

## Synchronization Mechanism

### Event-Driven Sync

VITAL Workbench publishes events that Ontos consumes to keep governance metadata current.

```python
# VITAL Workbench: Publish events on data changes
class CanonicalLabelService:
    async def create_label(self, label: CanonicalLabelCreate) -> CanonicalLabel:
        # ... create label logic ...

        # Publish event for Ontos sync
        await self.event_bus.publish(
            topic="vital.canonical_labels.created",
            payload={
                "label_id": label.id,
                "sheet_id": label.sheet_id,
                "label_type": label.label_type,
                "defect_type": label.label_data.get("defect_type"),
                "severity": label.label_data.get("severity"),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        return label
```

```python
# Ontos: Consume events and update governance metadata
class VitalWorkbenchSyncHandler:
    @event_handler("vital.canonical_labels.created")
    async def on_label_created(self, event: dict):
        # Update term usage statistics
        await self.glossary_manager.increment_term_usage(
            term_name=event["defect_type"],
            asset_type="canonical_label",
            asset_id=event["label_id"]
        )

        # Check compliance rules
        await self.compliance_manager.evaluate_rules(
            trigger="on_label_create",
            context=event
        )

        # Update semantic relationships
        await self.semantic_manager.create_relationship(
            source_type="canonical_label",
            source_id=event["label_id"],
            relationship="instance_of",
            target_type="glossary_term",
            target_name=event["defect_type"]
        )
```

### Batch Sync (Initial Load / Recovery)

```python
# Ontos: Full sync from VITAL Workbench tables
class VitalWorkbenchAdapter:
    async def full_sync(self):
        """Perform full synchronization from VITAL tables."""

        # 1. Sync defect types to glossary terms
        defect_types = await self.sql_service.execute("""
            SELECT DISTINCT
                label_data:defect_type::STRING as defect_type,
                COUNT(*) as usage_count,
                AVG(label_confidence) as avg_confidence
            FROM canonical_labels
            GROUP BY label_data:defect_type::STRING
        """)

        for dt in defect_types:
            await self.glossary_manager.upsert_term(
                name=dt["defect_type"],
                domain="Quality Control",
                usage_count=dt["usage_count"],
                avg_confidence=dt["avg_confidence"],
                source="vital_workbench"
            )

        # 2. Sync sheet → contract mappings
        sheets = await self.sql_service.execute("""
            SELECT id, name, source_table, item_count
            FROM sheets WHERE status = 'active'
        """)

        for sheet in sheets:
            await self.contract_manager.ensure_contract(
                asset_type="sheet",
                asset_id=sheet["id"],
                asset_name=sheet["name"]
            )

        # 3. Build semantic relationships
        await self.semantic_manager.rebuild_graph()
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish shared infrastructure and basic term synchronization.

- [ ] Deploy Ontos to same Databricks workspace as VITAL Workbench
- [ ] Configure shared Unity Catalog access
- [ ] Create glossary_terms table with initial domain hierarchy
- [ ] Implement batch sync for defect types → glossary terms
- [ ] Basic semantic search UI in Ontos

**Deliverable:** Users can search "solder bridge" in Ontos and see related canonical labels.

### Phase 2: Data Contracts (Week 3-4)

**Goal:** Formal contracts with quality rules and SLO monitoring.

- [ ] Define ODCS contracts for canonical_labels, training_sheets, qa_pairs
- [ ] Implement quality rule evaluation (completeness, validity, freshness)
- [ ] Create compliance dashboard showing contract status
- [ ] Set up SLO alerting (label coverage < 30%, etc.)

**Deliverable:** Dashboard shows "Label Coverage: 32% (SLO: 30%)" with trend charts.

### Phase 3: Compliance Automation (Week 5-6)

**Goal:** Automated policy enforcement with approval workflows.

- [ ] Implement compliance rules (high-severity review, confidence threshold)
- [ ] Create review workflow for rule violations
- [ ] Event-driven sync for real-time compliance checking
- [ ] Audit log for all governance actions

**Deliverable:** Compliance check blocks training job if labels don't meet criteria.

### Phase 4: Semantic Layer (Week 7-8)

**Goal:** Full knowledge graph with impact analysis.

- [ ] Build semantic relationship graph
- [ ] Implement lineage visualization (data → labels → models)
- [ ] MCP integration for natural language governance queries
- [ ] Impact analysis tooling ("what if" scenarios)

**Deliverable:** User asks "what models use U12 defect labels?" and gets visual lineage.

---

## Benefits Summary

### What VITAL Workbench Gets "For Free"

| Capability | Before Integration | After Integration |
|------------|-------------------|-------------------|
| **Semantic Search** | SQL queries only | "Find high-severity cold joints" natural language |
| **Data Contracts** | Ad-hoc validation | Formal ODCS contracts with SLO monitoring |
| **Compliance** | Manual review | Automated policy enforcement |
| **Impact Analysis** | None | "What breaks if I change this definition?" |
| **Audit Trail** | Application logs | Governance-aware audit log |
| **Review Workflows** | Custom built | Standard approval flows |
| **AI Queries** | None | MCP-powered governance assistant |

### ROI Calculation

| Metric | Manual Process | With Ontos | Savings |
|--------|----------------|------------|---------|
| Label quality review | 2 hrs/week | 15 min/week (automated) | 87% |
| Compliance reporting | 4 hrs/month | Real-time dashboard | 95% |
| Impact analysis | 1 day (manual tracing) | 5 minutes (automated) | 99% |
| New term onboarding | 2 hrs (docs + comms) | 30 min (self-service) | 75% |

---

## Appendix: Database Schema Additions

### Ontos Governance Tables (to be created)

```sql
-- Glossary terms (synced from VITAL concepts)
CREATE TABLE glossary_terms (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    domain STRING NOT NULL,
    definition STRING,
    measurement_rule STRING,
    data_contract_id STRING,
    usage_count INT DEFAULT 0,
    avg_confidence DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    source STRING DEFAULT 'manual'
);

-- Semantic relationships (knowledge graph edges)
CREATE TABLE semantic_relationships (
    id STRING PRIMARY KEY,
    source_type STRING NOT NULL,  -- 'term', 'canonical_label', 'sheet', etc.
    source_id STRING NOT NULL,
    relationship_type STRING NOT NULL,  -- 'instance_of', 'related_to', etc.
    target_type STRING NOT NULL,
    target_id STRING NOT NULL,
    confidence DOUBLE DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Compliance rule definitions
CREATE TABLE compliance_rules (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    domain STRING,
    severity STRING NOT NULL,  -- 'warning', 'error', 'critical'
    rule_sql STRING NOT NULL,
    schedule STRING,  -- 'hourly', 'daily', 'on_event'
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Compliance check results
CREATE TABLE compliance_results (
    id STRING PRIMARY KEY,
    rule_id STRING NOT NULL,
    check_time TIMESTAMP NOT NULL,
    status STRING NOT NULL,  -- 'pass', 'fail', 'error'
    violations_count INT,
    violations_json STRING,  -- JSON array of violation details
    FOREIGN KEY (rule_id) REFERENCES compliance_rules(id)
);

-- Audit log for governance actions
CREATE TABLE governance_audit_log (
    id STRING PRIMARY KEY,
    action_type STRING NOT NULL,
    actor STRING NOT NULL,
    target_type STRING,
    target_id STRING,
    details_json STRING,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### Shared Views

```sql
-- Term usage view (glossary terms → canonical labels)
CREATE VIEW v_term_usage AS
SELECT
    gt.id as term_id,
    gt.name as term_name,
    gt.domain,
    COUNT(cl.id) as label_count,
    COUNT(DISTINCT cl.sheet_id) as sheet_count,
    AVG(cl.label_confidence) as avg_confidence,
    MAX(cl.updated_at) as last_used
FROM glossary_terms gt
LEFT JOIN canonical_labels cl
    ON cl.label_data:defect_type::STRING = gt.name
GROUP BY gt.id, gt.name, gt.domain;

-- Contract compliance view
CREATE VIEW v_contract_compliance AS
SELECT
    dc.id as contract_id,
    dc.name as contract_name,
    cr.name as rule_name,
    cres.status,
    cres.violations_count,
    cres.check_time
FROM data_contracts dc
JOIN compliance_rules cr ON cr.domain = dc.domain
LEFT JOIN compliance_results cres ON cres.rule_id = cr.id
WHERE cres.check_time = (
    SELECT MAX(check_time) FROM compliance_results WHERE rule_id = cr.id
);

-- Full lineage view (data → labels → training → models)
CREATE VIEW v_lineage_graph AS
SELECT
    s.id as sheet_id,
    s.name as sheet_name,
    cl.id as label_id,
    cl.label_type,
    ts.id as training_sheet_id,
    ts.name as training_sheet_name,
    tj.id as training_job_id,
    tj.model_name,
    tj.uc_model_version
FROM sheets s
LEFT JOIN canonical_labels cl ON cl.sheet_id = s.id
LEFT JOIN qa_pairs qp ON qp.canonical_label_id = cl.id
LEFT JOIN training_sheets ts ON qp.training_sheet_id = ts.id
LEFT JOIN training_jobs tj ON tj.training_sheet_id = ts.id;
```

---

## Next Steps

1. **Review this document** with stakeholders (ML Engineering, QA, Compliance)
2. **Set up Ontos** in the FEVM Databricks workspace alongside VITAL Workbench
3. **Begin Phase 1** implementation with shared catalog access
4. **Schedule weekly syncs** to track progress and adjust scope

---

*Document maintained by Stuart Gano. Last updated: 2026-02-12*
