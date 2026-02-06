---
name: VITAL Platform Workbench
description: Training Dataset Workbench for AI-powered radiation safety platform on Databricks
status: in-progress
version: 2.3
date: 2026-02-05
epic-status: ready-for-decomposition
---

# Training Dataset Workbench - Product Requirements Document

**Version:** 2.3
**Date:** February 5, 2026
**Status:** Validated - Ready for Implementation
**Changelog:**
- v2.3: Added Canonical Labels with multiple labelsets per item (composite key), full multimodal validation
- v2.2: Added Usage Constraints for data governance (separate from quality approval)
- v2.1: Updated workflow terminology - TEMPLATE → TOOLS, CURATE → GENERATE + LABEL

---

## Version History

### v2.3 - Canonical Labels & Multiple Labelsets (Current)
**Date:** February 5, 2026  
**Status:** ✅ Validated across Document AI and Vision AI use cases

**Key Features:**
- **Canonical Labels**: Ground truth layer enabling "label once, reuse everywhere"
- **Multiple Labelsets**: Composite key `(sheet_id, item_ref, label_type)` allows multiple independent labelsets per source item
- **Multimodal Validation**: Validated with medical invoice extraction (document AI) and PCB defect detection (vision AI)
- **Two Labeling Workflows**: Training Sheet review (Mode A) + Standalone canonical labeling tool (Mode B)

**Validated Use Cases:**
- Medical invoice entity extraction (4 labelsets: extraction, classification, summarization, document_type)
- PCB defect detection (4 labelsets: classification, localization, root_cause, pass_fail)

See: `VALIDATION_SUMMARY.md`, `USE_CASE_VALIDATION_*.md`

### v2.2 - Usage Constraints
**Date:** February 4, 2026

**Key Features:**
- Dual quality gates: Status (quality) + Usage Constraints (governance)
- Fields: `allowed_uses`, `prohibited_uses`, `usage_reason`, `data_classification`
- Support for compliance scenarios (PHI, PII, proprietary data)
- Unity Catalog tag inheritance for auto-detection

See: `USAGE_CONSTRAINTS_DESIGN.md`

### v2.1 - Workflow Terminology
**Date:** February 3, 2026

**Key Changes:**
- TEMPLATE stage → Moved to TOOLS section
- CURATE stage → Split into GENERATE + LABEL stages
- Assembly → Training Sheet terminology
- DataBits → Sheets, Templates, Training Sheets

**Rationale:**
- Templates are reusable assets, not workflow steps
- "Curate" was ambiguous - now explicit separation of generation vs labeling
- More user-friendly terminology aligned with industry standards

---

## Terminology Update (v2.1+)

This version clarifies the workflow structure based on user feedback:

| Old Term | New Term | Rationale |
|----------|----------|-----------|
| TEMPLATE (workflow stage) | Moved to TOOLS section as "Prompt Templates" | Templates are reusable assets, not workflow steps |
| CURATE | Split into GENERATE + LABEL | "Curate" was ambiguous - now explicit: generate pairs, then review them |
| DataBits | Sheets, Templates, Training Sheets | More specific terminology for each concept |
| DataSets | Training Sheets | User-friendly term for Q&A training datasets |
| Assemblies | Training Sheets | More intuitive than technical "Assembly" term |

**New Workflow:**
```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
  │         │         │
Sheet  Training  Approved
       Sheet     Training
                 Sheet
```

**TOOLS Section (separate from workflow):**
- Prompt Templates
- Example Store  
- DSPy Optimizer

**Terminology:**
- **Sheet** = Dataset definition (pointer to data in Unity Catalog)
- **Training Sheet** = Q&A pairs generated from Sheet + Template
- **Prompt Template** = Reusable prompt definition (in TOOLS)

---

## Executive Summary

The Training Dataset Workbench is a no-code, multimodal data curation platform built natively on the Databricks Lakehouse. It enables enterprise AI teams to create, version, and optimize training datasets through composable data units (**Sheets**, **Templates**, **Training Sheets**), with first-class integration into DSPy optimization pipelines, MLflow experiment tracking, and a managed **Example Store** for dynamic few-shot learning.

The platform addresses a critical gap in enterprise AI workflows: the absence of systematic tooling for training data management that connects data preparation to model optimization. While labeling tools produce static exports and prompt engineering remains artisanal, the Workbench creates a continuous feedback loop between data curation and model performance.

**One-liner:** "The Databricks platform for the complete AI data lifecycle - from raw data to optimized prompts with full governance."

**Validation Status:** This PRD v2.3 data model has been validated end-to-end with two distinct AI domains:
- **Document AI**: Medical invoice entity extraction (multimodal: PDFs + structured billing data)
- **Vision AI**: PCB defect detection (multimodal: images + real-time sensor fusion)

No gaps or breaking changes identified. See **VALIDATION_SUMMARY.md** for complete validation results.

---

## Problem Statement

Enterprise AI teams face compounding inefficiencies in training data management:

| Problem | Impact |
|---------|--------|
| **Fragmented tooling** | Data annotation, versioning, and model training exist in disconnected silos requiring manual handoffs and format translations |
| **No lineage or attribution** | When a model fails on specific inputs, tracing back to the training data that caused the behavior is nearly impossible |
| **Manual prompt optimization** | Teams iterate on prompts through trial and error rather than systematic optimization against curated ground truth |
| **Static few-shot examples** | Examples are hardcoded in prompts rather than dynamically retrieved based on query similarity, leading to bloated context and suboptimal performance |
| **Multimodal complexity** | Existing tools assume text-only workflows; vision, audio, and document data require separate pipelines |

### Target Users

| Persona | Role | Primary Need |
|---------|------|--------------|
| **ML Engineer** | Builds and deploys models | Versioned datasets that integrate with training pipelines |
| **Data Scientist** | Experiments with model architectures | Rapid iteration on data composition |
| **Domain Expert** | Provides labeling and validation | Intuitive annotation without code |
| **AI Platform Lead** | Governs AI initiatives | Audit trails and compliance visibility |
| **Agent Developer** | Builds LLM-powered agents | Dynamic few-shot examples for agent improvement |

---

## Core Concepts

### Sheets (Dataset Definitions)

A **Sheet** is a named pointer to data sources in Unity Catalog. Sheets are lightweight metadata records that define which tables, volumes, and columns to use for a specific task. They enable multimodal data fusion without copying data.

**Sheet Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `sheet_id` | UUID | Unique identifier |
| `name` | STRING | Human-readable name |
| `description` | STRING | What this dataset is for |
| `primary_table` | STRING | Main Unity Catalog table |
| `secondary_sources` | ARRAY<STRUCT> | Additional tables/volumes to join |
| `join_keys` | ARRAY<STRING> | How to join sources |
| `filter_condition` | STRING | Optional WHERE clause |
| `sample_size` | INTEGER | Optional row limit |
| `created_at` | TIMESTAMP | Creation timestamp |
| `created_by` | STRING | User or system identity |

**Example Sheet 1: Iris Flowers (Vision)**
```json
{
  "name": "Iris Flower Multimodal",
  "primary_table": "samples.iris.flowers",
  "secondary_sources": [
    {"type": "volume", "path": "/Volumes/samples/iris/images", "join_key": "id"}
  ],
  "join_keys": ["id"],
  "sample_size": 150
}
```

**Example Sheet 2: Medical Invoices (Multimodal)**
```json
{
  "sheet_id": "sheet-invoices-001",
  "name": "Medical Invoices - January 2026",
  "description": "Medical billing invoices with structured fields and PDF documents",
  "primary_table": "mirion_vital.raw.parsed_invoices",
  "secondary_sources": [
    {"type": "volume", "path": "/Volumes/mirion_vital/raw/medical_invoices", "join_key": "invoice_id"}
  ],
  "join_keys": ["invoice_id"]
}
```

**Source Data Structure (Unity Catalog Table):**
```sql
-- mirion_vital.raw.parsed_invoices
CREATE TABLE parsed_invoices (
  invoice_id STRING,                   -- Primary key / join key
  pdf_path STRING,                     -- /Volumes/.../invoice_042.pdf
  
  -- Structured fields (already extracted or present)
  invoice_number STRING,               -- INV-2024-001
  invoice_date DATE,                   -- 2024-01-15
  total_amount DECIMAL(10,2),          -- 285.50
  account_number STRING,               -- ACC-12345
  provider_name STRING,                -- City Medical Center
  provider_npi STRING,                 -- National Provider ID
  
  -- OCR/Parsed text
  extracted_text STRING,               -- Full OCR text from PDF
  page_count INT,                      -- Number of pages
  parsing_confidence FLOAT,            -- OCR confidence score
  
  -- Metadata
  file_size_bytes LONG,
  uploaded_at TIMESTAMP,
  uploaded_by STRING
)
```

**Key Point:** When generating Q&A pairs or labeling, the expert/LLM has access to:
- ✅ PDF document (visual/text)
- ✅ Structured fields (amount, account, date)
- ✅ Metadata (confidence, page count)

This enables **true multimodal labeling and generation**.

### Prompt Templates

A **Prompt Template** is a reusable definition of how to interact with an LLM for a specific task. Templates encode domain expertise and are versioned, published, and shared across teams.

**Template Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `template_id` | UUID | Unique identifier |
| `name` | STRING | Template name |
| `version` | STRING | Semantic version (1.0.0) |
| `status` | STRING | `draft` \| `published` \| `archived` |
| `label_type` | STRING | Task type: `entity_extraction`, `classification`, `qa`, `generation`, `summarization`, etc. |
| `system_prompt` | STRING | Sets model behavior |
| `user_prompt_template` | STRING | Jinja2 template with placeholders |
| `input_schema` | ARRAY<STRUCT> | Expected input fields |
| `output_schema` | ARRAY<STRUCT> | Expected output structure |
| `base_model` | STRING | Model to use |
| `temperature` | FLOAT | Sampling temperature |
| `max_tokens` | INTEGER | Max response length |
| `examples` | ARRAY<STRUCT> | Few-shot examples |
| `created_at` | TIMESTAMP | Creation timestamp |
| `created_by` | STRING | User or system identity |

### Canonical Labels (Ground Truth Layer)

A **Canonical Label** is an expert-validated ground truth label for a specific source item (PDF, table row, image, etc.). Canonical Labels exist **independent** of Q&A pairs and Training Sheets, enabling label reuse across multiple generation runs.

**The Problem Canonical Labels Solve:**
Without canonical labels, experts must re-label the same data every time you generate new Q&A pairs:
- January: Generate Q&A pairs with Template v1 → Expert labels 500 items
- February: Generate Q&A pairs with Template v2 → Expert re-labels **the same** 500 items

Canonical Labels enable: **Label once, reuse everywhere.**

**Multiple Labelsets Per Item:**
The same source item can have **multiple canonical labels** for different purposes. Each labelset is identified by `label_type`.

**Example:** `invoice_042.pdf` might have:
- `label_type = 'entity_extraction'` → Extract patient name, DOB, amount
- `label_type = 'classification'` → Classify as emergency vs. routine
- `label_type = 'summarization'` → Generate billing summary
- `label_type = 'document_type'` → Identify as invoice vs. EOB vs. receipt

**Composite Key:** One label per `(sheet_id, item_ref, label_type)` combination

**Canonical Label Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `canonical_label_id` | UUID | Unique identifier |
| `sheet_id` | UUID | Source Sheet (dataset) |
| `item_ref` | STRING | Specific item (e.g., "invoice_042.pdf", "row_123") |
| `label_type` | STRING | Task type: `entity_extraction`, `classification`, `qa`, `generation`, `summarization`, `document_type`, etc. |
| `label_data` | VARIANT | Expert's ground truth (JSON format varies by label_type) |
| `confidence` | STRING | `high`, `medium`, `low` |
| `notes` | TEXT | Expert's notes or reasoning |
| `allowed_uses` | ARRAY<STRING> | Usage constraints (inherited or set by expert) |
| `prohibited_uses` | ARRAY<STRING> | Explicit restrictions |
| `usage_reason` | TEXT | Compliance/business justification |
| `data_classification` | STRING | `public`, `internal`, `confidential`, `restricted` |
| `labeled_by` | STRING | Expert who created label |
| `labeled_at` | TIMESTAMP | When label was created |
| `last_modified_by` | STRING | Last editor |
| `last_modified_at` | TIMESTAMP | Last modification |
| `version` | INTEGER | Label version (for change tracking) |
| `created_at` | TIMESTAMP | Creation timestamp |

**Example: Multiple Labels for Same Invoice**

`invoice_042.pdf` has three different labelsets:

**Label 1: Entity Extraction**
```json
{
  "id": "cl-001",
  "sheet_id": "sheet-invoices-001",
  "item_ref": "invoice_042.pdf",
  "label_type": "entity_extraction",
  "label_data": {
    "patient_name": "Jane Smith",
    "patient_dob": "1985-03-15",
    "insurance_id": "BC12345678",
    "procedure_codes": ["99213", "87426"],
    "total_amount": 285.50,
    "provider_name": "City Medical Center"
  },
  "confidence": "high",
  "labeled_by": "billing_expert@hospital.com",
  "labeled_at": "2026-01-15T10:30:00Z",
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Contains PHI - HIPAA compliance",
  "data_classification": "restricted"
}
```

**Label 2: Classification**
```json
{
  "id": "cl-002",
  "sheet_id": "sheet-invoices-001",
  "item_ref": "invoice_042.pdf",
  "label_type": "classification",
  "label_data": {
    "urgency": "routine",
    "network_status": "in_network",
    "department": "cardiology",
    "complexity": "moderate"
  },
  "confidence": "high",
  "labeled_by": "clinical_expert@hospital.com",
  "labeled_at": "2026-01-16T14:20:00Z",
  "allowed_uses": ["training", "validation", "few_shot", "testing", "evaluation"],
  "prohibited_uses": [],
  "usage_reason": "No PHI in classification labels - safe for training",
  "data_classification": "internal"
}
```

**Label 3: Summarization**
```json
{
  "id": "cl-003",
  "sheet_id": "sheet-invoices-001",
  "item_ref": "invoice_042.pdf",
  "label_type": "summarization",
  "label_data": {
    "summary": "Routine cardiology follow-up visit with EKG. In-network provider. Total: $285.50. Patient responsible for $25 copay."
  },
  "confidence": "high",
  "labeled_by": "billing_expert@hospital.com",
  "labeled_at": "2026-01-17T09:15:00Z",
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Summary contains patient context - PHI",
  "data_classification": "restricted"
}
```

**Key Points:**
- Same item (`invoice_042.pdf`) has **3 different labels**
- Each label has different `label_type`
- Each label can have different governance constraints:
  - Entity extraction: PHI → no training
  - Classification: No PHI → training allowed
  - Summarization: PHI → no training
- Different experts can label different aspects

**Label Reuse Workflow:**
```
1. Expert labels invoice_042.pdf → Creates canonical label
2. Generate Training Sheet v1 (Template v1) → Uses canonical label (pre-approved)
3. Generate Training Sheet v2 (Template v2) → Uses canonical label (pre-approved)
4. Generate Training Sheet v3 (Template v3) → Uses canonical label (pre-approved)
```

**Benefits:**
- ✅ Expert labels once, reused across all Training Sheets
- ✅ Consistent ground truth across template iterations
- ✅ Standalone labeling tool (independent of Q&A generation)
- ✅ Version control and audit trail for labels
- ✅ Create test sets independent of training data

---

### Training Sheets (Q&A Datasets)

A **Training Sheet** is a materialized dataset of Q&A pairs created by applying a Prompt Template to a Sheet. Training Sheets can reference Canonical Labels for pre-approved ground truth or generate new Q&A pairs requiring review.

**Why "Training Sheet"?**
- User-friendly term that clearly indicates purpose (training data)
- Maintains consistency with "Sheet" terminology (Sheets → Training Sheets)
- More intuitive than technical terms like "Assembly" or "Dataset"

**Training Sheet Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `training_sheet_id` | UUID | Unique identifier |
| `sheet_id` | UUID | Source Sheet (data source) |
| `template_id` | UUID | Prompt Template used |
| `status` | STRING | `generating` \| `review` \| `approved` \| `trained` |
| `labeling_mode` | STRING | `ai_generated` \| `manual` \| `existing_column` |
| `total_pairs` | INTEGER | Total Q&A pairs |
| `unlabeled_pairs` | INTEGER | Pairs pending expert review |
| `labeled_pairs` | INTEGER | Pairs approved by expert |
| `rejected_pairs` | INTEGER | Pairs rejected by expert |
| `flagged_pairs` | INTEGER | Pairs flagged for review |
| `generation_config` | STRUCT | Model used (if AI mode), column name (if existing) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `created_by` | STRING | User or system identity |

**Q&A Pair Format:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a flower classifier..."},
    {"role": "user", "content": "Classify this flower: Sepal 5.1cm..."},
    {"role": "assistant", "content": "{\"name\": \"Iris Setosa\", \"confidence\": 0.95}"}
  ]
}
```

### Lineage & Attribution Model

The platform maintains complete lineage from raw data through to deployed models:

**Data Lineage Chain:**
```
Unity Catalog Tables/Volumes
    ↓
Sheet (dataset pointer)
    ↓
Training Sheet (Sheet + Template → Q&A pairs)
    ↓
Model Training Run (Training Sheet → Fine-tuned Model)
    ↓
Deployed Model/Agent
```

**Why Explicit Lineage Matters:**
- **Debugging:** When a model fails, trace back to the exact Q&A pairs that influenced its behavior
- **Compliance:** Prove which data was used to train which models (required for regulated industries)
- **Reuse:** Track which models have been trained on which Training Sheets
- **Comparison:** Compare performance of models trained on different subsets of the same Training Sheet
- **Improvement:** Identify which Q&A pairs contribute to better model performance

**Lineage Tracking:**
Every training run explicitly records:
- Which Training Sheet was used
- Which specific Q&A pairs were included (only `labeled` status)
- Train/validation split configuration
- Resulting model ID in Unity Catalog Model Registry

This creates a complete audit trail from model predictions back to the source data and expert labels.

---

## Example Store

The **Example Store** is a managed service for storing and dynamically retrieving few-shot examples. Rather than hardcoding examples in prompts, agents and LLM applications retrieve relevant examples at runtime based on semantic similarity to the incoming query.

### What Are Few-Shot Examples?

A few-shot example is a labeled input-output pair demonstrating expected model behavior for a specific use case. Examples enable in-context learning without fine-tuning: they show the model the expected pattern rather than explaining it. By dynamically selecting only relevant examples, you cover more possible outcomes with fewer tokens while maintaining or improving performance.

### Example Store Architecture

The Example Store is built on Databricks Vector Search with the following components:

- **Example Registry:** Delta Lake table storing examples as specialized DataBits with input, expected_output, and search_keys fields
- **Vector Index:** Databricks Vector Search index on example embeddings for cosine similarity retrieval
- **Retrieval API:** REST and Python SDK for querying examples with optional filtering by function name, domain, or quality threshold
- **Agent Integration:** Native hooks for Mosaic AI Agent Framework to automatically retrieve and inject examples into prompts

### Example Schema

| Field | Type | Description |
|-------|------|-------------|
| `example_id` | UUID | Unique identifier (extends DataBit) |
| `input` | VARIANT | User query or model input demonstrating the scenario |
| `expected_output` | VARIANT | Expected model response or behavior |
| `search_keys` | ARRAY<STRING> | Semantic keys for similarity matching |
| `embedding` | ARRAY<FLOAT> | Vector embedding of input for retrieval |
| `function_name` | STRING | Optional: tool/function this example demonstrates |
| `domain` | STRING | Optional: domain or use case category |
| `quality_score` | FLOAT | Human or automated quality rating (0-1) |
| `usage_count` | INTEGER | Times this example has been retrieved |
| `effectiveness_score` | FLOAT | Measured impact on model performance when used |

### Example Store Workflow

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Observe unexpected model behavior | Identify gap in model reasoning or output |
| 2 | Author corrective example with input/output pair | Example demonstrates expected behavior |
| 3 | Upload example to Example Store via UI or API | Example indexed and immediately available |
| 4 | Agent receives similar query at runtime | Example Store retrieves relevant examples |
| 5 | Examples injected into prompt automatically | Model follows demonstrated pattern |
| 6 | Track example effectiveness over time | Prune low-impact examples, amplify high-impact ones |

### Guidelines for Authoring Examples

- **Relevance:** Examples must be closely related to the specific task or domain. Relevant examples improve performance with fewer tokens.
- **Low Complexity:** Use simple, clear examples that demonstrate expected reasoning without unnecessary complexity.
- **Representative Coverage:** Examples should cover the range of possible model outcomes and user query patterns.
- **Consistent Formatting:** Format examples consistently with the model's training data and differentiated from conversation history.

### Use Case: Function Calling Correction

When an agent fails to invoke the correct tool or passes incorrect arguments, create an example demonstrating the expected function call. The example includes the user query, the expected tool invocation, and the correct arguments. Subsequent similar queries will retrieve this example and guide the model toward correct behavior without code changes or redeployment.

---

## DSPy Integration

The Workbench is designed as a **DSPy-native platform**, meaning curated datasets and Example Store contents directly integrate with DSPy optimization pipelines without intermediate transformation steps.

### Integration Architecture

| Component | Integration |
|-----------|-------------|
| **Example Selection** | DataBits tagged as high-quality examples can be automatically surfaced as few-shot candidates for DSPy optimizers. The Example Store serves as the canonical source. |
| **Evaluation Sets** | DataSets can be designated as evaluation ground truth, enabling DSPy metrics to score against curated benchmarks. |
| **Optimization Feedback Loop** | DSPy optimization runs generate performance metrics that flow back into DataBit quality scores and Example Store effectiveness ratings. |
| **Signature Alignment** | DataSet schemas can be validated against DSPy signature definitions to ensure compatibility before optimization runs. |

### DSPy + Example Store Synergy

The Example Store and DSPy serve complementary purposes:
- **Example Store** enables immediate, zero-deployment corrections through dynamic few-shot retrieval
- **DSPy** enables systematic prompt optimization when you have sufficient evaluation data

**Workflow:** Use Example Store for rapid iteration and edge case handling, then periodically run DSPy optimization to bake the best examples into optimized prompts.

### DSPy Workflow

| Step | Workbench Action | DSPy Integration |
|------|------------------|------------------|
| 1 | Curate DataBits with task-specific labels | Labels map to DSPy signature fields |
| 2 | Assemble DataSet with train/eval splits | Export as DSPy-compatible dataset object |
| 3 | Define quality thresholds for example selection | Optimizer draws few-shot examples from Example Store |
| 4 | Run DSPy optimization (logged to MLflow) | Optimizer evaluates against curated ground truth |
| 5 | Ingest optimization metrics back to DataBits | Per-example performance scores update quality_scores |

### Consumption Impact

Both Example Store retrieval and DSPy optimization generate compute consumption:
- Example retrieval uses Vector Search DBUs
- DSPy optimization runs evaluate hundreds of prompt configurations against evaluation sets, each requiring LLM inference calls

The tighter the Workbench integration, the more naturally customers enter this optimization-consumption flywheel.

---

## MLflow Integration

All Workbench operations are tracked as MLflow experiments, providing complete auditability and reproducibility.

| Capability | Description |
|------------|-------------|
| **Training Sheet Versions as Artifacts** | Each Training Sheet version is logged as an MLflow artifact with associated metadata |
| **Experiment Tracking** | Every training run creates MLflow run with hyperparameters, metrics, and Training Sheet reference |
| **Model Registry Linkage** | Trained models registered with explicit links to Training Sheet versions used |
| **Lineage Queries** | Given a deployed model, trace back to exact Q&A pairs that influenced its behavior |
| **Example Store Snapshots** | Example Store state can be snapshotted and linked to model versions for reproducibility |
| **DSPy Optimization Tracking** | DSPy runs create MLflow runs with optimizer config, example count, and evaluation scores |

### Lineage Query Examples

**Query 1: "Which models were trained on Training Sheet X?"**
```sql
SELECT model_id, model_name, model_version, trained_at, train_pair_count
FROM mirion_vital.workbench.model_training_lineage
WHERE training_sheet_id = 'training-sheet-123'
ORDER BY trained_at DESC;
```

**Query 2: "Which Training Sheet was used to train Model Y?"**
```sql
SELECT ts.id, ts.name, ts.labeled_pairs, ts.labeling_mode, mtl.trained_at
FROM mirion_vital.workbench.model_training_lineage mtl
JOIN mirion_vital.workbench.training_sheets ts ON ts.id = mtl.training_sheet_id
WHERE mtl.model_id = 'model-456';
```

**Query 3: "Show me the actual Q&A pairs used to train Model Y"**
```sql
SELECT qa.messages, qa.status, qa.quality_score
FROM mirion_vital.workbench.model_training_lineage mtl
LATERAL VIEW EXPLODE(mtl.qa_pair_ids) AS qa_pair_id
JOIN mirion_vital.workbench.qa_pairs qa ON qa.id = qa_pair_id
WHERE mtl.model_id = 'model-456';
```

**Query 4: "Compare models trained on the same Training Sheet"**
```sql
SELECT 
  mtl.model_name,
  mtl.train_pair_count,
  mtl.training_config['base_model'] AS base_model,
  mtl.training_config['temperature'] AS temperature,
  -- Join to evaluation metrics
  eval.accuracy, eval.f1_score
FROM mirion_vital.workbench.model_training_lineage mtl
LEFT JOIN model_evaluations eval ON eval.model_id = mtl.model_id
WHERE mtl.training_sheet_id = 'training-sheet-123'
ORDER BY eval.accuracy DESC;
```

---

## The Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DATA ──▶ GENERATE ──▶ LABEL ──▶ TRAIN ──▶ DEPLOY ──▶ MONITOR ──▶ IMPROVE │
│    │         │          │         │         │          │           │       │
│    ▼         ▼          ▼         ▼         ▼          ▼           │       │
│  Sheets  Training  Approved   Models   Endpoints   Evals    ◀────┘       │
│  (Data     Sheet    Training  (UC)     Agents      Traces   (feedback)   │
│   Ptrs)   (Q&A)     Sheet              Tools       Metrics                │
│                                        Guardrails  Alerts                 │
│                                                                             │
│  TOOLS: Prompt Templates | Example Store | DSPy Optimizer                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                        ALL REGISTERED IN UNITY CATALOG                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: DATA

**Purpose:** Define dataset sources for AI workflows.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Browse Catalogs | Explore Unity Catalog tables/volumes | Unity Catalog |
| Create Sheet | Define dataset pointers | Custom (DataBits) |
| Join Sources | Multimodal data fusion | Spark SQL |
| Ingest Files | Stream from cloud storage | AutoLoader |
| OCR Extract | Text from images/PDFs | ai_query, Document AI |
| Parse Documents | Structure extraction | ai_extract |
| Generate Embeddings | Vectors for similarity | ai_embed |
| Transcribe Audio | Speech to text | ai_query |
| Extract Video Frames | Video to images | Custom UDF |

**Output:** Sheet (dataset definition pointing to data sources)

**Note:** Sheets are dataset pointers, not copies. They reference Unity Catalog tables and volumes.

### Stage 2: GENERATE

**Purpose:** Generate Q&A training pairs by applying prompt templates to data.

**Renamed from:** CURATE (old name was misleading - curate implies review, not creation)

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Select Sheet | Choose dataset from DATA stage | Custom UI |
| Select Template | Choose prompt template from Tools | Custom UI |
| Choose Labeling Mode | AI-generated, manual, or use existing column | Custom UI |
| Fill Prompts | Populate template with data | Jinja2 templates |
| Generate Responses | AI inference (if AI mode selected) | Foundation Model APIs |
| Create Q&A Pairs | Structure as messages array | Custom |
| Track Progress | Monitor generation job | Databricks Jobs |

**Three Labeling Modes:**

| Mode | Description | Status After Generation | Requires Review? |
|------|-------------|------------------------|------------------|
| **AI-Generated** | LLM generates responses automatically | `unlabeled` (pending review) | ✅ Yes - Expert must approve/edit before training |
| **Manual Labeling** | Human provides responses from scratch | `unlabeled` (pending review) | ✅ Yes - Expert must approve before training |
| **Use Existing Column** | Response already exists in data | `labeled` (if expert-verified) | ⚠️ Optional - Can be marked pre-approved if source is trusted |

**User Flow:**
1. Select Sheet (dataset definition)
2. Select Prompt Template (from TOOLS section)
3. Choose labeling mode:
   - **AI-Generated**: LLM automatically generates responses
   - **Manual**: Leave response blank for human to fill
   - **Existing Column**: Use pre-existing response from data
4. Generate Q&A pairs → creates Training Sheet

**Q&A Pair Generation Logic (with Canonical Label Check):**

For each item in Sheet:
```python
# Determine label_type from template
# Template metadata specifies what kind of task it's for
template_label_type = template.label_type  # e.g., 'entity_extraction', 'classification'

# Check if canonical label exists for this item + label_type
canonical_label = canonical_labels.get(
  sheet_id=sheet.id,
  item_ref=item.ref,           # e.g., "invoice_042.pdf"
  label_type=template_label_type  # Must match template's task type
)

if canonical_label:
  # Expert already labeled this item for this task! Use ground truth
  qa_pair = {
    "messages": [
      {"role": "user", "content": template.format(item)},
      {"role": "assistant", "content": canonical_label.label_data}
    ],
    "canonical_label_id": canonical_label.id,
    "status": "labeled",  # Pre-approved!
    "labeling_mode": "canonical",
    "reviewed_by": canonical_label.labeled_by,
    "reviewed_at": canonical_label.labeled_at,
    # Inherit governance from canonical label
    "allowed_uses": canonical_label.allowed_uses,
    "prohibited_uses": canonical_label.prohibited_uses
  }
else:
  # No canonical label for this label_type - generate based on mode
  if mode == "ai_generated":
    ai_response = llm.generate(template.format(item))
    qa_pair = {
      "messages": [...],
      "canonical_label_id": None,
      "status": "unlabeled",  # Needs review
      "labeling_mode": "ai_generated"
    }
  elif mode == "manual":
    qa_pair = {
      "messages": [...],  # Empty response
      "canonical_label_id": None,
      "status": "unlabeled",
      "labeling_mode": "manual"
    }
```

**Example:**
```
invoice_042.pdf has 3 canonical labels:
  - entity_extraction (cl-001)
  - classification (cl-002)
  - summarization (cl-003)

Generate Training Sheet with entity_extraction template:
  → Finds cl-001 → Pre-approved!

Generate Training Sheet with classification template:
  → Finds cl-002 → Pre-approved!

Generate Training Sheet with document_type template:
  → No label found → Needs review (AI-generated)
```

**Output:** Training Sheet with mix of:
- Pre-approved Q&A pairs (canonical labels exist) → `status=labeled`
- Needs-review Q&A pairs (no canonical labels) → `status=unlabeled`

**Benefits:**
- ✅ Expert labels **reused** across Training Sheets
- ✅ Items with canonical labels skip review (already approved)
- ✅ Only new/unlabeled items require expert time

**Example:**
```
Training Sheet v1 (Template v1):
  - 150 items have canonical labels → Pre-approved (labeled)
  - 350 items need review → Expert labels them (unlabeled → labeled)
  
Training Sheet v2 (Template v2, improved prompt):
  - 500 items have canonical labels → ALL pre-approved!
  - 0 items need review → Zero expert time required!
```

**What is a Training Sheet?**
A Training Sheet is a materialized dataset of Q&A pairs created by applying a Prompt Template to a Sheet. Q&A pairs can be pre-approved (via canonical labels) or require expert review in the LABEL stage.

**Key Point:** Canonical labels enable **"label once, reuse everywhere"** - expert time is saved when regenerating Training Sheets with improved templates.

### Stage 3: LABEL

**Purpose:** Expert review and approval of Q&A pairs before training.

**Formerly:** Part of CURATE (now separated for clarity)

**Why This Stage Exists:**
- AI-generated responses may be incorrect, incomplete, or biased
- Manual labeling needs verification for consistency
- Domain expertise is required to ensure training data quality
- **No Q&A pair should be used for training without expert approval**

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Review Q&A Pairs | Human inspection of generated pairs | App UI |
| Approve | Mark pair as `labeled` (ready for training) | App UI |
| Edit | Correct response or prompt, then approve | App UI |
| Reject | Mark as `rejected` (excluded from training) | App UI |
| Flag | Mark for additional expert review | App UI |
| AI Score Quality | Rate data quality | ai_query |
| Detect Duplicates | Find similar items | ai_similarity |
| Detect PII | Flag sensitive data | ai_mask |
| Filter Toxicity | Safety filtering | ai_query |
| Track Progress | X approved / Y total / Z rejected | App UI |

**Review Actions:**

| Action | Status Change | Meaning |
|--------|---------------|---------|
| **Approve** | `unlabeled` → `labeled` | Expert verified - ready for training |
| **Edit then Approve** | `unlabeled` → `labeled` | Expert corrected - ready for training |
| **Reject** | `unlabeled` → `rejected` | Incorrect/unusable - excluded from training |
| **Flag** | `unlabeled` → `flagged` | Needs additional expert review |

## Two Labeling Workflows

### Mode A: Label Q&A Pairs (Training Sheet Review)

Expert reviews Q&A pairs within a Training Sheet context:

**User Flow:**
1. Select Training Sheet (from GENERATE stage)
2. See progress:
   ```
   Progress: 150 / 500 labeled
   
   ├─ Pre-approved (from canonical labels): 150
   └─ Needs Review: 350
      ├─ Unlabeled: 300
      ├─ Rejected: 30
      └─ Flagged: 20
   ```
3. Review each unlabeled Q&A pair sequentially
4. For each pair:
   - ✅ **Approve** if correct → Creates canonical label
   - ✏️ **Edit** if needs correction → Updates, creates canonical label
   - ❌ **Reject** if unusable
   - 🚩 **Flag** if uncertain
5. Track progress: "Approved: 450 / Total: 500 / Rejected: 30 / Flagged: 20"

**When Expert Approves/Edits:**
```python
def approve_qa_pair(qa_pair_id):
  qa_pair = get_qa_pair(qa_pair_id)
  
  # Create canonical label (ground truth)
  canonical_label = {
    "sheet_id": qa_pair.sheet_id,
    "item_ref": qa_pair.item_ref,
    "label_data": qa_pair.messages[1].content,  # Approved response
    "label_type": "entity_extraction",  # or qa.pair.label_type
    "labeled_by": current_user,
    "labeled_at": now(),
    "confidence": "high"
  }
  
  canonical_label_id = insert_canonical_label(canonical_label)
  
  # Link Q&A pair to canonical label
  qa_pair.canonical_label_id = canonical_label_id
  qa_pair.status = "labeled"
  
  # Future Training Sheets will reuse this label!
```

**Output:** Approved Training Sheet with `labeled` Q&A pairs + Canonical labels created for reuse

---

### Mode B: Label Source Data Directly (Canonical Labeling Tool)

Expert labels source data **before** generating Q&A pairs, or creates standalone test sets:

**Access:** TOOLS section → Canonical Labeling Tool

**User Flow:**
1. Select Sheet (dataset)
2. Browse source items (PDFs, table rows, images)
3. For each item, provide ground truth label
4. Set usage constraints (if needed)
5. Save canonical label

**UI Example:**
```
┌─────────────────────────────────────────────────────────┐
│ Canonical Labeling Tool                                 │
│ Dataset: Medical Invoices - January 2026                │
│ Progress: 150 / 500 labeled                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Invoice: invoice_042.pdf                                │
│ [PDF Preview]                                           │
│                                                          │
│ Ground Truth Entities:                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Patient Name:    [Jane Smith              ]        │ │
│ │ DOB:             [1985-03-15              ]        │ │
│ │ Insurance ID:    [BC12345678              ]        │ │
│ │ Procedure Codes: [99213, 87426            ]        │ │
│ │ Total Amount:    [285.50                  ]        │ │
│ │ Provider:        [City Medical Center     ]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Usage Constraints: 🔒 Training Prohibited - PHI         │
│ Confidence: [High ▼]                                    │
│                                                          │
│ [Save Label] [Skip] [Previous] [Next]                   │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Pre-label key examples before generating Training Sheets
- ✅ Create test sets independent of training workflow
- ✅ Labels immediately available for reuse
- ✅ No need to generate Q&A pairs first

**Output:** Canonical labels stored independently, ready for Training Sheet generation

---

## Combined Workflow Benefits

**Scenario: Iterative Template Improvement**

**January:**
- Expert uses **Mode B** to pre-label 150 key invoices
- Generate Training Sheet v1 with Template v1
  - 150 items pre-approved (canonical labels)
  - 350 items unlabeled (AI-generated)
- Expert uses **Mode A** to review 350 items in Training Sheet
  - Approves/edits → creates 350 more canonical labels
- Total: 500 canonical labels created

**February:**
- Improve Template v2 (better prompt)
- Generate Training Sheet v2 with Template v2
  - 500 items pre-approved (ALL have canonical labels!)
  - 0 items need review
- **Zero expert time required!**

**March:**
- Add 200 new invoices to dataset
- Generate Training Sheet v3 with Template v2
  - 500 old items pre-approved (canonical labels)
  - 200 new items unlabeled (AI-generated)
- Expert only reviews 200 new items

**Result:** Expert labels once, reused everywhere. Template iteration is fast and cheap.

---

**Quality Gate:** Only Q&A pairs with status `labeled` (approved by expert) are included in training export.

---

## Usage Constraints & Data Governance

Beyond quality approval (`status`), each Q&A pair has **usage constraints** that control what it can be used for. This is critical for compliance, data privacy, and business rules.

### The Problem: Same Quality, Different Constraints

A Q&A pair might be:
- ✅ High quality and expert-approved (`status = labeled`)
- ❌ But **cannot** be used for training due to compliance reasons

**Example: Mammogram with PHI**
- Contains real patient data → perfect for testing model accuracy
- Contains identifiable information (PHI) → **prohibited** from being stored in model weights (HIPAA)
- Can be shown as few-shot example (ephemeral) but cannot be persisted in training data

### Two Orthogonal Dimensions

| Dimension | What It Controls | Enforcement |
|-----------|------------------|-------------|
| **Status** (Quality Gate) | Is this Q&A pair correct and approved? | `unlabeled` → `labeled` → approved for use |
| **Usage Constraints** (Governance) | What can this Q&A pair be used for? | `allowed_uses` / `prohibited_uses` arrays |

### Usage Types

| Usage Type | Description | Persistence Level |
|------------|-------------|-------------------|
| **`training`** | Fine-tuning model weights | **Permanent** - embedded in model |
| **`validation`** | Evaluation during training (train/val split) | **Permanent** - influences training |
| **`evaluation`** | Post-training quality assessment, benchmarks | **Temporary** - used for scoring |
| **`few_shot`** | Runtime in-context learning examples | **Ephemeral** - shown then discarded |
| **`testing`** | Manual QA, human verification | **Temporary** - human inspection only |

### Real-World Examples

**Example 1: Mammogram with PHI (Healthcare Compliance)**
```json
{
  "status": "labeled",
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Contains identifiable patient data (PHI) - HIPAA compliance prohibits storing in model weights",
  "data_classification": "restricted"
}
```
- ✅ Can show as few-shot example at inference (ephemeral, not logged)
- ✅ Can use for manual testing by radiologists
- ✅ Can use for evaluation (measuring model accuracy)
- ❌ **Cannot** export to Training Sheet for fine-tuning
- ❌ **Cannot** use in validation set

**Example 2: Synthetic Training Data (No Restrictions)**
```json
{
  "status": "labeled",
  "allowed_uses": ["training", "validation", "evaluation", "few_shot", "testing"],
  "prohibited_uses": [],
  "usage_reason": "Synthetic data generated for training - no restrictions",
  "data_classification": "internal"
}
```
- ✅ Can be used anywhere without restrictions

**Example 3: Proprietary Client Data (NDA/Confidentiality)**
```json
{
  "status": "labeled",
  "allowed_uses": ["training", "validation"],
  "prohibited_uses": ["few_shot", "evaluation"],
  "usage_reason": "Client NDA - cannot expose in runtime examples that might be logged or traced",
  "data_classification": "confidential"
}
```
- ✅ Can fine-tune (model weights are protected, not exposed)
- ✅ Can use in validation set (stays within training pipeline)
- ❌ Cannot show as few-shot example (might leak in agent traces/logs)
- ❌ Cannot use in public evaluation benchmarks

**Example 4: Test Set (Data Hygiene)**
```json
{
  "status": "labeled",
  "allowed_uses": ["evaluation", "testing"],
  "prohibited_uses": ["training", "validation", "few_shot"],
  "usage_reason": "Held-out test set - must not be seen during training to prevent data leakage",
  "data_classification": "internal"
}
```
- ✅ Can use for evaluation and testing
- ❌ Cannot use for training (data leakage)
- ❌ Cannot use as few-shot examples (would leak test data)

### Enforcement Points

**TRAIN Stage (Export to Training Sheet):**
```python
# Only export if both approved AND allowed for training
training_pairs = qa_pairs.filter(
  (col('status') == 'labeled') & 
  (array_contains(col('allowed_uses'), 'training')) &
  (~array_contains(col('prohibited_uses'), 'training'))
)
```

**Example Store (Runtime Few-Shot):**
```python
# Only sync if both approved AND allowed for few-shot
few_shot_examples = qa_pairs.filter(
  (col('status') == 'labeled') &
  (array_contains(col('allowed_uses'), 'few_shot')) &
  (~array_contains(col('prohibited_uses'), 'few_shot'))
)
```

**Evaluation Harness:**
```python
# Only use if allowed for evaluation
eval_pairs = qa_pairs.filter(
  (col('status') == 'labeled') &
  (array_contains(col('allowed_uses'), 'evaluation')) &
  (~array_contains(col('prohibited_uses'), 'evaluation'))
)
```

### UI Indicators

**In LABEL Stage (Review UI):**
- Show badges: "⚠️ Training Prohibited - HIPAA", "✅ All Uses Allowed", "🔒 Confidential - NDA"
- Block export if constraints violated
- Show data classification level
- Allow expert to modify usage constraints during review

**In TRAIN Stage (Export):**
- Show count: "Approved: 100 | Training Allowed: 85 | Training Prohibited: 15"
- Explain why pairs are excluded: "15 pairs contain PHI and cannot be used for training"

### Integration with Unity Catalog

Usage constraints can be **inherited** from Unity Catalog table tags:

```python
# Check source table for PII/PHI tags
source_table = catalog.get_table('mirion_vital.raw.patient_scans')
tags = source_table.tags

# Auto-populate usage constraints based on tags
if 'PII' in tags or 'PHI' in tags:
  qa_pair.prohibited_uses.append('training')
  qa_pair.data_classification = 'restricted'
  qa_pair.usage_reason = f"Source table tagged with {tags} - compliance restriction"
  
if 'CONFIDENTIAL' in tags:
  qa_pair.prohibited_uses.extend(['few_shot', 'evaluation'])
  qa_pair.allowed_uses = ['training', 'validation']  # OK in secure pipeline
  qa_pair.data_classification = 'confidential'
```

### Audit Trail

All usage constraint modifications are logged:

```sql
mirion_vital.workbench.usage_constraint_audit (
  id, qa_pair_id,
  old_allowed_uses, new_allowed_uses,
  old_prohibited_uses, new_prohibited_uses,
  reason TEXT,
  modified_by, modified_at
)
```

This enables answering:
- "Who marked this Q&A pair as training-prohibited?"
- "When did we change the data classification from internal to restricted?"
- "Show me all Q&A pairs that had their constraints modified in the last 30 days"

---

### Stage 4: TRAIN

**Purpose:** Export curated Assembly and fine-tune model.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Export Assembly | Format as JSONL training file | Spark job |
| Train/Val Split | Divide into train/validation sets | Spark job |
| Fine-tune | Submit FMAPI training job | Foundation Model APIs |
| Register Model | To UC Model Registry | MLflow |
| Evaluate | Run eval suite against held-out set | MLflow Evaluate |
| Compare Versions | A/B metrics across iterations | MLflow |

**User Flow:**
1. Select Training Sheet (approved from LABEL stage)
2. **Apply dual quality gates:**
   - **Status gate:** Only `status = labeled` (expert-approved)
   - **Governance gate:** Only pairs where `'training' IN allowed_uses` AND `'training' NOT IN prohibited_uses`
3. **Show export summary:**
   - "Total Labeled: 100"
   - "Training Allowed: 85"
   - "Training Prohibited: 15 (PHI/compliance restrictions)"
4. Configure: train/val split, base model, hyperparameters
5. Preview JSONL export format (only shows pairs passing both gates)
6. Submit FMAPI training job
7. Monitor training progress
8. Model automatically registered upon completion
9. **Lineage automatically recorded:** Training Sheet ID, Q&A pair IDs used, config saved to `model_training_lineage` table

**Dual Quality Gates:**
```python
# Export filter combines both dimensions
export_pairs = training_sheet.qa_pairs.filter(
  # Quality gate: expert approved
  (col('status') == 'labeled') &
  
  # Governance gate: allowed for training
  (array_contains(col('allowed_uses'), 'training')) &
  (~array_contains(col('prohibited_uses'), 'training'))
)
```

**What Gets Excluded:**
- ❌ `status = unlabeled` (not approved yet)
- ❌ `status = rejected` (incorrect/unusable)
- ❌ `status = flagged` (needs more review)
- ❌ `'training' NOT IN allowed_uses` (not permitted for training)
- ❌ `'training' IN prohibited_uses` (explicitly prohibited - PHI, NDA, etc.)

**Output:** 
- Fine-tuned model in Unity Catalog Model Registry (trained only on expert-approved data)
- Lineage record linking model to Training Sheet and specific Q&A pairs used

**Reusability:** The same Training Sheet can be used to train multiple models:
- Different base models (Llama 8B vs 70B)
- Different hyperparameters (temperature, learning rate)
- Different train/val splits
- Different time periods (v1 model vs v2 model with expanded Training Sheet)

Each training run creates a new lineage record, enabling full provenance tracking.

### Stage 5: DEPLOY

**Purpose:** Ship models as agents with tools and guardrails.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Register Tools | Create UC Functions | Unity Catalog |
| Register Agent | Define agent config | Agent Framework |
| Bind Tools | Connect agent → tools | Agent Framework |
| Configure Guardrails | Safety filters | Guardrails |
| Create Endpoint | Deploy to serving | Model Serving |
| Test | Playground testing | App UI |

### Stage 6: MONITOR (Day 2)

**Purpose:** Observe production behavior, catch issues.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Log Traces | Record all calls | MLflow Tracing |
| Track Metrics | Latency, errors, usage | Lakehouse Monitoring |
| Detect Drift | Data/model drift | Lakehouse Monitoring |
| Score Quality | Ongoing output quality | ai_query + custom |
| Alert | Threshold breaches | Workflows + alerts |
| A/B Analysis | Compare versions | Custom analysis |

### Stage 7: IMPROVE (Feedback Loop)

**Purpose:** Close the loop - production feedback → retraining.

| Job | Description |
|-----|-------------|
| Capture Feedback | Thumbs up/down, corrections |
| Link to Model | Record which model produced the prediction |
| Trace to Training Data | (Optional) Find similar Q&A pairs from training |
| Route to Curation | Bad outputs → review queue, create new Q&A pairs |
| Gap Analysis | What's the model missing? Which Training Sheets need expansion? |
| Trigger Retraining | When threshold hit, select Training Sheet + new pairs |

**Feedback with Lineage:**
When a user provides feedback on a model prediction:
1. Record feedback with `model_id`
2. Lookup which Training Sheet(s) were used to train that model
3. (Optional) Find similar Q&A pairs in Training Sheet to understand if training data gap exists
4. Create new Q&A pairs to address gaps
5. Add to Training Sheet (new version or new Training Sheet)
6. Retrain model with expanded data
7. New lineage record created linking v2 model to expanded Training Sheet

This creates a continuous improvement cycle with full traceability.

---

## TOOLS Section (Asset Management)

**Key Insight:** TOOLS are reusable assets, NOT workflow stages. They're created independently and used across multiple workflows.

### Tool: Prompt Templates

**Purpose:** Create and manage reusable prompt templates that encode domain expertise.

**What is a Prompt Template?**
A Prompt Template is a structured definition of how to interact with an LLM for a specific task. It includes:
- System prompt (sets model behavior)
- User prompt template (with placeholders like `{{variable}}`)
- Input/output schema (type definitions)
- Model configuration (temperature, max_tokens)
- Example few-shot demonstrations

**Why Separate from Workflow?**
Templates are intellectual property that can be:
- Created once, used many times
- Versioned and published
- Shared across teams
- Applied to different datasets

**User Actions:**
- Browse template library (DataTable view)
- Create new template
- Edit draft templates
- Test template against sample data
- Publish template (makes immutable)
- Duplicate existing template (for variations)

**Page Location:** TOOLS → Prompt Templates

### Tool: Example Store

**Purpose:** Manage dynamic few-shot examples for in-context learning.

**What it Does:**
- Store input/output pairs as examples
- Retrieve relevant examples via semantic similarity
- Track example effectiveness over time
- Automatically inject examples into agent prompts

**User Actions:**
- Browse examples (filter by domain, function)
- Upload new examples
- Edit existing examples
- View effectiveness metrics
- Prune low-performing examples

**Page Location:** TOOLS → Example Store

### Tool: DSPy Optimizer

**Purpose:** Systematically optimize prompts using DSPy framework.

**What it Does:**
- Export Assemblies to DSPy format
- Launch optimization runs
- Track optimization experiments in MLflow
- Compare prompt variants
- Sync results back to Example Store

**User Actions:**
- Configure optimization run
- Select optimizer (BootstrapFewShot, MIPRO, etc.)
- Monitor progress
- Review optimized prompts
- Accept/reject optimizations

**Page Location:** TOOLS → DSPy Optimizer

### Tool: Canonical Labeling Tool (NEW)

**Purpose:** Create reusable ground truth labels for source data, independent of Q&A pair generation.

**What is a Canonical Label?**
A Canonical Label is an expert-validated ground truth label for a specific source item (PDF, table row, image, etc.). Once created, canonical labels are automatically reused across all future Training Sheets that reference the same source data.

**Why "Canonical"?**
- **Single source of truth** - One label per source item, not per Q&A pair
- **Reusable** - Label once, reused across all Training Sheets
- **Independent** - Exists before/after Q&A pair generation
- **Version controlled** - Track label changes over time

**Key Problem It Solves:**
Without canonical labels:
```
January: Generate Training Sheet v1 → Expert labels 500 items
February: Generate Training Sheet v2 (better prompt) → Expert re-labels THE SAME 500 items
```

With canonical labels:
```
January: Expert labels 500 items once → Creates 500 canonical labels
February: Generate Training Sheet v2 → ALL 500 items pre-approved automatically!
```

**What it Does:**
- Browse source data (PDFs, tables, images) from Sheets
- Provide ground truth labels for specific items
- Set usage constraints (PHI, NDA, etc.)
- Track labeling progress across dataset
- Version control label changes
- Export canonical labels for external use

**Labeling Interface:**
- Shows source data (PDF preview, table row, image)
- Provides label input form (customized per label_type)
- For entity extraction: structured form with entity fields
- For classification: dropdown/radio buttons
- For Q&A: text input for ideal response
- For generation: textarea for expected output

**User Actions:**
- **Browse Datasets** - Select Sheet to label
- **Label Items** - Provide ground truth for unlabeled items
- **Edit Labels** - Update existing canonical labels
- **Set Constraints** - Mark PHI, set data classification
- **Track Progress** - See N / Total labeled, identify gaps
- **Export Labels** - Download canonical labels as JSONL

**Usage Scenarios:**

1. **Pre-Label Key Examples** (before generating Training Sheets)
   - Expert labels 100 representative items first
   - Generate Training Sheet → 100 items pre-approved
   - Only new items need review

2. **Create Test Sets** (independent of training)
   - Expert labels 200 items as test set
   - Mark with `prohibited_uses: ['training']`
   - Use for evaluation only (held-out data)

3. **Iterative Template Improvement**
   - Label 500 items once
   - Generate Training Sheet v1, v2, v3 with different templates
   - All 500 items pre-approved each time
   - Zero re-labeling needed

4. **Collaborative Labeling**
   - Multiple experts label different subsets
   - Canonical labels aggregate all expert work
   - Consistent ground truth across team

**Page Location:** TOOLS → Canonical Labeling Tool

**Benefits:**
- ✅ **Expert Efficiency** - Label once, reuse everywhere
- ✅ **Quality Consistency** - Single source of truth
- ✅ **Flexible Workflows** - Label before or during generation
- ✅ **Test Set Creation** - Standalone labeling for evaluation
- ✅ **Version Control** - Track label changes over time
- ✅ **Audit Trail** - Who labeled what, when

---

## Feature Requirements

### P0: Core Platform

| Feature | Description |
|---------|-------------|
| Sheet Management | Create, read, update, delete Sheet definitions (dataset pointers) |
| Prompt Template Library | Browse, create, edit, publish, version templates |
| Training Sheet Generation | Apply template to sheet → generate Q&A pairs |
| Q&A Review UI | Review, approve, edit, reject Q&A pairs |
| Unity Catalog Integration | Sheets, Templates, Training Sheets registered as UC assets with governance |
| JSONL Export | Export approved Training Sheets to training format |
| Template Testing | Preview template output on sample data before generation |

### P1: Example Store + DSPy Native

| Feature | Description |
|---------|-------------|
| Example Store Instance | Create and manage Example Store instances scoped to workspace or Unity Catalog |
| Example Upload UI | No-code interface to author and upload input/output example pairs |
| Semantic Retrieval API | REST and Python SDK for similarity-based example retrieval with filtering |
| Agent Framework Hook | Native integration with Mosaic AI Agent Framework for automatic example injection |
| DSPy Dataset Export | One-click export Training Sheets to DSPy dataset format with signature validation |
| Optimization Run Launcher | Trigger DSPy optimization from Workbench UI with MLflow logging |
| Metric Feedback Ingestion | Automatically update Q&A pair quality scores and example effectiveness from results |

### P2: Multimodal & Advanced

| Feature | Description |
|---------|-------------|
| Image Annotation | Bounding box, polygon, and classification labeling for images |
| Document Processing | PDF/document ingestion with layout-aware chunking |
| Synthetic Data Generation | LLM-powered augmentation with attribution tracking |
| Active Learning | Model-in-the-loop sampling to prioritize annotation efforts |
| Collaborative Annotation | Multi-user workflows with consensus resolution |
| Example Effectiveness Analytics | Dashboard showing which examples drive the most improvement |

---

## Technical Architecture

### Storage Layer

- Sheets stored in Delta Lake tables as lightweight metadata pointers
- Prompt Templates stored in Delta Lake with version history
- Training Sheets stored in Delta Lake with Q&A pairs as JSON arrays
- Example Store backed by Delta Lake with Databricks Vector Search index for retrieval
- Binary content (images, audio) remains in Unity Catalog Volumes, referenced by Sheets
- All assets registered in Unity Catalog for governance and lineage

### Compute Layer

- Annotation UI served via Databricks Apps
- Example Store retrieval via Databricks Vector Search endpoints (serverless)
- Batch processing (import, augmentation) via serverless jobs
- DSPy optimization runs on GPU clusters with Foundation Model APIs

### API Layer

- REST API for programmatic access (create DataBits, query DataSets, retrieve examples)
- Python SDK wrapping API with DSPy-native objects and Example Store client
- SQL functions for DataSet queries within notebooks

### Data Model (Delta Tables)

```sql
-- Sheets (dataset definitions)
mirion_vital.workbench.sheets (
  id, name, description,
  primary_table, secondary_sources,
  join_keys, filter_condition, sample_size,
  row_count, created_by, created_at, updated_at
)

-- Prompt Templates
mirion_vital.workbench.templates (
  id, name, description, version, status,
  label_type,        -- 'entity_extraction', 'classification', 'qa', 'generation', 'summarization'
  system_prompt, user_prompt_template,
  input_schema, output_schema,
  base_model, temperature, max_tokens, examples,
  source_catalog, source_schema, source_table, source_volume,
  created_by, created_at, updated_at
)

-- Canonical Labels (ground truth layer - label once, reuse everywhere)
-- Multiple labels per item supported (different label_type for different purposes)
mirion_vital.workbench.canonical_labels (
  id,
  sheet_id,              -- Source Sheet (dataset)
  item_ref,              -- Specific item (e.g., "invoice_042.pdf", "row_123")
  label_type STRING,     -- 'entity_extraction', 'classification', 'qa', 'generation', 'summarization'
  label_data VARIANT,    -- Expert's ground truth (JSON)
  confidence STRING,     -- 'high', 'medium', 'low'
  notes TEXT,            -- Expert's reasoning
  
  -- Governance constraints
  allowed_uses ARRAY<STRING>,
  prohibited_uses ARRAY<STRING>,
  usage_reason TEXT,
  data_classification STRING,
  
  -- Audit trail
  labeled_by STRING,
  labeled_at TIMESTAMP,
  last_modified_by STRING,
  last_modified_at TIMESTAMP,
  version INT,           -- Label versioning for this specific label_type
  created_at TIMESTAMP,
  
  -- Composite unique key: one label per (sheet_id, item_ref, label_type)
  UNIQUE(sheet_id, item_ref, label_type)
)

-- Training Sheets (Q&A datasets)
mirion_vital.workbench.training_sheets (
  id, name, sheet_id, template_id, status,
  total_pairs, approved_pairs, rejected_pairs,
  generation_config, generation_started_at, generation_completed_at,
  created_by, created_at, updated_at
)

-- Q&A Pairs (individual training examples)
mirion_vital.workbench.qa_pairs (
  id, training_sheet_id, item_ref,
  messages, -- JSON array of {role, content}
  
  -- Link to canonical label (if exists)
  canonical_label_id STRING, -- References canonical_labels.id
  
  -- Quality gate (approval workflow)
  status, -- unlabeled, labeled, rejected, flagged
  labeling_mode, -- ai_generated, manual, existing_column, canonical
  
  -- Governance constraints (compliance/usage restrictions)
  allowed_uses ARRAY<STRING>, -- ['training', 'validation', 'evaluation', 'few_shot', 'testing']
  prohibited_uses ARRAY<STRING>, -- ['training'] - explicit exclusions for compliance
  usage_reason TEXT, -- "Contains PHI - HIPAA compliance" or "Client NDA"
  data_classification STRING, -- public, internal, confidential, restricted
  
  -- Quality metrics
  ai_confidence, -- confidence score if AI-generated
  quality_score, -- automated quality score
  
  -- Review metadata
  reviewed_by, reviewed_at, review_notes,
  created_at, updated_at
)

-- Example Store
mirion_vital.workbench.example_store (
  example_id, input, expected_output, explanation,
  search_keys, embedding, embedding_model,
  function_name, domain, quality_score,
  usage_count, effectiveness_score,
  created_by, created_at
)

-- Model Training Lineage (tracks which models used which Training Sheets)
mirion_vital.workbench.model_training_lineage (
  id,
  model_id, -- Unity Catalog model ID
  model_name, -- Model name in UC
  model_version, -- Model version in UC
  training_sheet_id, -- Source Training Sheet
  training_sheet_version, -- Version snapshot
  qa_pair_ids, -- Array of QA pair IDs used (only labeled)
  train_pair_count, -- Number of pairs in training set
  val_pair_count, -- Number of pairs in validation set
  training_config, -- Hyperparameters, base model, etc.
  mlflow_run_id, -- MLflow experiment run ID
  fmapi_job_id, -- Databricks FMAPI job ID
  trained_at,
  created_by
)

-- DSPy Optimization Runs
mirion_vital.workbench.dspy_runs (
  run_id, training_sheet_id, template_id,
  optimizer_type, metric_function,
  status, best_metric_value, results,
  mlflow_run_id,
  started_at, completed_at
)

-- Job runs
mirion_vital.workbench.job_runs (
  id, job_type, training_sheet_id,
  status, progress, result,
  started_at, completed_at
)

-- Feedback (links production feedback to models and training data)
mirion_vital.workbench.feedback (
  id, 
  model_id, -- Which model produced the prediction
  endpoint_name, -- Serving endpoint
  request_id, trace_id,
  feedback_type, feedback_value, correction,
  -- Lineage: trace back to training data
  training_sheet_id, -- (optional) if we can trace back
  qa_pair_id, -- (optional) if similar to training example
  created_by, created_at
)

-- Usage Constraint Audit (tracks changes to allowed_uses/prohibited_uses)
mirion_vital.workbench.usage_constraint_audit (
  id, 
  qa_pair_id,
  old_allowed_uses ARRAY<STRING>,
  new_allowed_uses ARRAY<STRING>,
  old_prohibited_uses ARRAY<STRING>,
  new_prohibited_uses ARRAY<STRING>,
  old_data_classification STRING,
  new_data_classification STRING,
  reason TEXT, -- Why the constraint was changed
  modified_by, 
  modified_at
)
```

---

## Success Metrics

| Metric | Target (6mo) | Target (12mo) |
|--------|--------------|---------------|
| Active Workbench Projects | 100 | 500 |
| DataBits Created (monthly) | 1M | 10M |
| Example Store Instances | 200 | 1,000 |
| Example Retrievals (monthly) | 10M | 100M |
| DSPy Optimization Runs (monthly) | 1,000 | 10,000 |
| DBU Consumption (attributed) | $500K ARR equivalent | $5M ARR equivalent |

---

## Competitive Positioning

| Capability | Workbench | Vertex Example Store | Label Studio | Scale AI |
|------------|-----------|---------------------|--------------|----------|
| Lakehouse Native | ✓ | ✗ | ✗ | ✗ |
| Dynamic Few-Shot | ✓ | ✓ | ✗ | ✗ |
| DSPy Integration | ✓ | ✗ | ✗ | ✗ |
| MLflow Tracking | ✓ | ✗ | Limited | ✗ |
| Composable Units | ✓ | ✓ | ✗ | ✗ |
| Full Attribution | ✓ | ✗ | ✗ | Partial |
| UC Governance | ✓ | ✗ | ✗ | ✗ |

---

## Implementation Phases

| Phase | Timeline | Focus |
|-------|----------|-------|
| **Phase 1** | Q1 | Core DataBit/DataSet infrastructure, text annotation UI, basic import/export |
| **Phase 2** | Q2 | Example Store with Vector Search, retrieval API, agent framework integration |
| **Phase 3** | Q3 | DSPy export, MLflow integration, optimization run launcher, feedback loop |
| **Phase 4** | Q4 | Multimodal annotation, synthetic data, active learning, example effectiveness analytics |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DSPy API instability | Integration breaks on updates | Maintain abstraction layer; coordinate with DSPy team |
| Vector Search latency | Example retrieval adds latency to agent responses | Caching layer; async prefetch; latency budgets |
| User adoption friction | Low engagement despite capability | Templates for common use cases; in-product guidance |
| Multimodal complexity | Scope creep delays core launch | Strict P0/P1/P2 prioritization; text-first MVP |
| Competitive response (GCP) | Vertex Example Store gains traction | DSPy + Lakehouse integration as differentiator |

---

## Appendix A: DSPy Primer

DSPy (Declarative Self-improving Python) is a framework for programmatically optimizing LLM pipelines. Rather than manually crafting prompts, developers define modular programs with typed signatures, and DSPy automatically optimizes prompts, few-shot examples, and fine-tuning through a compiler-like process.

**Key concepts:**
- **Signatures:** Typed input/output specifications for LLM calls
- **Modules:** Composable units that implement signatures (Predict, ChainOfThought, ReAct)
- **Optimizers:** Algorithms that tune prompts and examples (BootstrapFewShot, MIPRO)
- **Metrics:** Evaluation functions that score model outputs against ground truth

Databricks acquired the company behind DSPy in early 2024, making it a strategic asset for the AI platform. The Training Dataset Workbench extends this investment by providing the high-quality curated data that DSPy optimizers require to deliver meaningful improvements.

---

## Appendix B: Example Store vs Static Few-Shot

| Dimension | Static Few-Shot | Example Store |
|-----------|-----------------|---------------|
| Example Selection | Fixed set in prompt template | Dynamic based on query similarity |
| Update Process | Code change + redeploy | Upload via UI/API, immediate effect |
| Token Efficiency | All examples always included | Only relevant examples retrieved |
| Coverage | Limited by prompt length | Unlimited corpus, bounded retrieval |
| Iteration Speed | Slow (dev cycle) | Fast (operational) |
| Who Can Update | Engineers only | Domain experts, support teams |

---

## Appendix C: Mirion VITAL Platform Context

This Workbench instance is configured for Mirion's VITAL (AI-powered radiation safety) platform. Key use cases include:

- **Defect Detection:** Image + sensor context → defect classification
- **Predictive Maintenance:** Telemetry → failure probability
- **Anomaly Detection:** Sensor stream → alert + explanation
- **Calibration Insights:** Monte Carlo results → recommendations
- **Document Extraction:** Compliance docs → structured data
- **Remaining Useful Life:** Equipment history → RUL estimate

The platform leverages Mirion's 60+ years of radiation safety expertise encoded as reusable DataBits and examples.
