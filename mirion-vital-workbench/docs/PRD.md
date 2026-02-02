# Training Dataset Workbench - Product Requirements Document

**Version:** 2.0
**Date:** January 30, 2026
**Status:** Draft

---

## Executive Summary

The Training Dataset Workbench is a no-code, multimodal data curation platform built natively on the Databricks Lakehouse. It enables enterprise AI teams to create, version, and optimize training datasets through composable data units called **DataBits**, with first-class integration into DSPy optimization pipelines, MLflow experiment tracking, and a managed **Example Store** for dynamic few-shot learning.

The platform addresses a critical gap in enterprise AI workflows: the absence of systematic tooling for training data management that connects data preparation to model optimization. While labeling tools produce static exports and prompt engineering remains artisanal, the Workbench creates a continuous feedback loop between data curation and model performance.

**One-liner:** "The Databricks platform for the complete AI data lifecycle - from raw data to optimized prompts with full governance."

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

### DataBits

A **DataBit** is the atomic unit of training data in the Workbench. Each DataBit is immutable, versioned, and carries full provenance metadata. DataBits can contain any modality (text, image, audio, video, document) and are composable into larger dataset structures.

**DataBit Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `databit_id` | UUID | Immutable unique identifier |
| `version` | INTEGER | Monotonically increasing version number |
| `content` | VARIANT | Multimodal payload (text, image ref, embedding, etc.) |
| `modality` | STRING | `text` \| `image` \| `audio` \| `video` \| `document` \| `structured` |
| `source_uri` | STRING | Original data source location |
| `attribution` | STRUCT | Creator, license, derived_from references |
| `labels` | MAP<STRING, VARIANT> | Flexible annotation schema |
| `quality_scores` | MAP<STRING, FLOAT> | Automated and human quality metrics |
| `search_keys` | ARRAY<STRING> | Semantic search keys for Example Store retrieval |
| `embedding` | ARRAY<FLOAT> | Vector embedding for similarity search |
| `created_at` | TIMESTAMP | Creation timestamp |
| `created_by` | STRING | User or system identity |

### DataSets

A **DataSet** is a named, versioned collection of DataBit references with associated metadata. DataSets are defined declaratively and can be composed through set operations (union, intersection, difference) or filtering predicates.

### Attribution Model

Every DataBit maintains a directed acyclic graph (DAG) of attribution relationships. When a DataBit is derived from another (augmentation, synthesis, transformation), the lineage is preserved. This enables model behavior to be traced back to specific training inputs and their origins.

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
| **Dataset Versions as Artifacts** | Each DataSet version is logged as an MLflow artifact with associated metadata |
| **Example Store Snapshots** | Example Store state can be snapshotted and linked to model versions for reproducibility |
| **Experiment Tracking** | DSPy optimization runs create MLflow runs with hyperparameters (optimizer config, example count) and metrics (evaluation scores) |
| **Model Registry Linkage** | Optimized DSPy modules can be registered with explicit links to the DataSet versions and Example Store snapshots used |
| **Lineage Queries** | Given a deployed model, trace back to exact DataBits and examples that influenced its behavior |

---

## The Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DATA ──▶ TEMPLATE ──▶ CURATE ──▶ TRAIN ──▶ DEPLOY ──▶ MONITOR ──▶ IMPROVE │
│    │          │           │          │         │          │           │     │
│    ▼          ▼           ▼          ▼         ▼          ▼           │     │
│  Tables   DataBits    Labeled     Models   Endpoints   Evals    ◀────┘     │
│  Volumes  Examples    Examples   (UC)     Agents      Traces   (feedback)  │
│                                           Tools       Metrics              │
│                                           Guardrails  Alerts               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                        ALL REGISTERED IN UNITY CATALOG                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: DATA

**Purpose:** Ingest and prepare raw data for AI workflows.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Ingest Files | Stream from cloud storage | AutoLoader |
| OCR Extract | Text from images/PDFs | ai_query, Document AI |
| Parse Documents | Structure extraction | ai_extract |
| Generate Embeddings | Vectors for similarity | ai_embed |
| Transcribe Audio | Speech to text | ai_query |
| Extract Video Frames | Video to images | Custom UDF |

### Stage 2: TEMPLATE (DataBits)

**Purpose:** Define what you're building - schema, prompt, examples.

| Job | Description |
|-----|-------------|
| Infer Schema | Suggest schema from sample data |
| Test Prompt | Run against sample, see results |
| Generate Examples | Create synthetic few-shot examples |
| Version | Create immutable version |
| Publish | Make available for curation/training |

### Stage 3: CURATE

**Purpose:** Build labeled training data with AI assistance and human review.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| AI Label | Classify items | ai_classify |
| AI Extract | NER, entities | ai_extract |
| AI Summarize | Long content → short | ai_summarize |
| AI Translate | Multi-language | ai_translate |
| AI Score Quality | Rate data quality | ai_query |
| Detect Duplicates | Find similar items | ai_similarity |
| Detect PII | Flag sensitive data | ai_mask |
| Filter Toxicity | Safety filtering | ai_query |
| Human Review | Approve/reject/correct | App UI |

### Stage 4: TRAIN

**Purpose:** Fine-tune models on curated data.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Assemble Data | Format for training | Spark job |
| Fine-tune | Train model | FMAPI / Custom |
| Register Model | To UC Model Registry | MLflow |
| Evaluate | Run eval suite | MLflow Evaluate |
| Compare Versions | A/B metrics | MLflow |

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
| Route to Curation | Bad outputs → review queue |
| Gap Analysis | What's the model missing? |
| Trigger Retraining | When threshold hit |

---

## Feature Requirements

### P0: Core Platform

| Feature | Description |
|---------|-------------|
| DataBit CRUD | Create, read, update (via new version), delete DataBits through UI and API |
| DataSet Management | Declarative DataSet definitions with version history |
| Unity Catalog Integration | DataBits and DataSets registered as UC assets with governance policies |
| Text Annotation UI | No-code labeling interface for text classification, NER, and span annotation |
| Import/Export | Ingest from common formats (JSONL, Parquet, CSV); export to DSPy-compatible structures |

### P1: Example Store + DSPy Native

| Feature | Description |
|---------|-------------|
| Example Store Instance | Create and manage Example Store instances scoped to workspace or Unity Catalog |
| Example Upload UI | No-code interface to author and upload input/output example pairs |
| Semantic Retrieval API | REST and Python SDK for similarity-based example retrieval with filtering |
| Agent Framework Hook | Native integration with Mosaic AI Agent Framework for automatic example injection |
| DSPy Dataset Export | One-click export to DSPy dataset format with signature validation |
| Optimization Run Launcher | Trigger DSPy optimization from Workbench UI with MLflow logging |
| Metric Feedback Ingestion | Automatically update DataBit quality scores and example effectiveness from results |

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

- DataBits stored in Delta Lake tables with liquid clustering on `(databit_id, version)`
- Example Store backed by Delta Lake with Databricks Vector Search index for retrieval
- Binary content (images, audio) stored in Unity Catalog Volumes with references in DataBit records
- DataSet definitions stored as versioned configuration (similar to DLT pipeline definitions)

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
-- DataBits (versioned data units)
databits.databits (
  id, databit_id, version, status,
  content, modality, source_uri,
  attribution, labels, quality_scores,
  search_keys, embedding, embedding_model,
  created_by, created_at, updated_at
)

-- Example Store
databits.example_store (
  example_id, databit_id,
  input, expected_output, explanation,
  search_keys, embedding, embedding_model,
  function_name, domain, quality_score,
  usage_count, effectiveness_score,
  created_by, created_at
)

-- DSPy Optimization Runs
databits.dspy_runs (
  run_id, databit_id, dataset_id,
  optimizer_type, metric_function,
  status, best_metric_value, results,
  mlflow_run_id,
  started_at, completed_at
)

-- Curation items
databits.curation_items (
  id, databit_id, item_ref, item_data,
  agent_label, agent_confidence,
  human_label, status,
  reviewed_by, reviewed_at, created_at
)

-- Job runs
databits.job_runs (
  id, job_type, databit_id,
  status, progress, result,
  started_at, completed_at
)

-- Feedback
databits.feedback (
  id, agent_id, endpoint_name,
  request_id, trace_id,
  feedback_type, feedback_value, correction,
  created_by, created_at
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
