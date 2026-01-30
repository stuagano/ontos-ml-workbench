# Databits Workbench - Product Requirements Document

## Executive Summary

Databits Workbench is a Databricks App that provides a complete lifecycle for building governed AI - from raw data to deployed agents with full observability. It treats prompt templates ("Databits"), models, tools, and agents as first-class Unity Catalog assets, enabling non-technical teams to participate while maintaining enterprise governance.

**One-liner:** "The Databricks App for the complete AI lifecycle - data, templates, curation, training, deployment, and monitoring - all governed by Unity Catalog."

---

## Problem Statement

### The Platform Gap

Databricks provides powerful primitives:
- Unity Catalog for governance
- MLflow for experiment tracking
- Model Serving for deployment
- AI Functions for intelligence
- Agent Framework for orchestration

But there's no unified workflow that:
1. Connects these pieces end-to-end
2. Includes non-technical users (labelers, domain experts, compliance)
3. Treats the full AI stack as governed assets
4. Provides Day 2 operations (monitoring, feedback loops)

### The Current Reality

| Persona | Pain Point |
|---------|------------|
| **Domain Expert** | "I need to label data but can't write SQL" |
| **ML Engineer** | "I manage models but can't trace to training data" |
| **Agent Developer** | "I wire up tools manually with no governance" |
| **Ops Team** | "I can't see why the agent quality dropped" |
| **Compliance** | "I can't audit the full chain from data to production" |

### The Workaround

Teams build fragmented solutions:
- Streamlit apps for labeling
- Notebooks for training
- Manual tool registration
- Custom monitoring dashboards
- Spreadsheets for tracking

**Result:** No lineage, no governance, no unified view.

---

## Solution

### The Databits Workbench

A single Databricks App that manages the complete AI lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  DATA ──▶ TEMPLATE ──▶ CURATE ──▶ TRAIN ──▶ DEPLOY ──▶ MONITOR ──▶ IMPROVE │
│    │          │           │          │         │          │           │     │
│    ▼          ▼           ▼          ▼         ▼          ▼           │     │
│  Tables   Databits    Labeled     Models   Endpoints   Evals    ◀────┘     │
│  Volumes  (templates) Examples   (UC)     Agents      Traces   (feedback)  │
│                                           Tools       Metrics              │
│                                           Guardrails  Alerts               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                        ALL REGISTERED IN UNITY CATALOG                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### First-Class Unity Catalog Assets

| Registry | Asset Type | What It Tracks |
|----------|------------|----------------|
| **Tables/Volumes** | Data | Raw and curated data |
| **Tables** | Databits | Prompt templates + schema + examples |
| **Model Registry** | Models | Trained models with lineage |
| **Function Registry** | Tools | UC Functions callable by agents |
| **Tables** | Agents | Agent definitions + tool bindings |
| **Serving** | Endpoints | Deployed models/agents |
| **Tables** | Evaluations | Quality metrics, traces |

### The Databit (Core Artifact)

A prompt template as a governed, versioned asset:

```yaml
name: contract_classifier
version: 2.1.0
status: published

# What data this template expects
schema:
  input:
    - name: document_text
      type: string
      source: "main.contracts.parsed_documents"
    - name: document_type
      type: string
      source: "main.contracts.metadata"
  output:
    - name: classification
      type: enum[amendment, termination, renewal, new]
    - name: confidence
      type: float
    - name: key_clauses
      type: array<string>

# The prompt
template: |
  You are a legal document classifier specializing in {document_type} contracts.
  
  Analyze this document and classify it:
  {document_text}
  
  Return classification, confidence, and key clauses.

# Few-shot examples (curated and approved)
examples:
  - input: { document_text: "...", document_type: "services" }
    output: { classification: "amendment", confidence: 0.95, key_clauses: ["..."] }

# Lineage
base_model: "databricks-meta-llama-3-1-70b-instruct"
training_dataset: "main.training.contract_classifier_v2"
created_by: "legal_team@company.com"
approved_by: "compliance@company.com"
```

---

## The Complete Lifecycle

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

**UI:** Data source browser → deep link to UC Explorer for details.

### Stage 2: TEMPLATE (Databits)

**Purpose:** Define what you're building - schema, prompt, examples.

| Job | Description |
|-----|-------------|
| Infer Schema | Suggest schema from sample data |
| Test Prompt | Run against sample, see results |
| Generate Examples | Create synthetic few-shot examples |
| Version | Create immutable version |
| Publish | Make available for curation/training |

**UI:** Full Databit editor with schema builder, prompt editor, example manager.

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

**UI:** Curation queue with AI pre-labels, confidence scores, bulk actions, keyboard shortcuts.

### Stage 4: TRAIN

**Purpose:** Fine-tune models on curated data.

| Job | Description | Databricks Feature |
|-----|-------------|-------------------|
| Assemble Data | Format for training | Spark job |
| Fine-tune | Train model | FMAPI / Custom |
| Register Model | To UC Model Registry | MLflow |
| Evaluate | Run eval suite | MLflow Evaluate |
| Compare Versions | A/B metrics | MLflow |

**UI:** Training launcher, progress tracking, model comparison, link to MLflow.

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

**UI:** Agent builder, tool registry, guardrail config, one-click deploy, playground.

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

**UI:** Metrics dashboard, trace viewer, alert config, drift visualization.

### Stage 7: IMPROVE (Feedback Loop)

**Purpose:** Close the loop - production feedback → retraining.

| Job | Description |
|-----|-------------|
| Capture Feedback | Thumbs up/down, corrections |
| Route to Curation | Bad outputs → review queue |
| Gap Analysis | What's the model missing? |
| Trigger Retraining | When threshold hit |

**UI:** Feedback panel, automatic routing to curation queue, retraining recommendations.

---

## The Registries

### Databits Registry

```
┌─────────────────────────────────────────────────────────────────┐
│  Databits                                              [+ New]  │
├─────────────────────────────────────────────────────────────────┤
│  contract_classifier      v2.1.0   published   1,247 examples   │
│  support_response         v1.4.0   published     892 examples   │
│  product_qa               v3.0.0   published   2,104 examples   │
│  invoice_extractor        v1.0.0   draft         156 examples   │
└─────────────────────────────────────────────────────────────────┘
```

### Tools Registry (UC Functions)

```
┌─────────────────────────────────────────────────────────────────┐
│  Tools                                                 [+ New]  │
├─────────────────────────────────────────────────────────────────┤
│  main.tools.search_contracts                                    │
│  ├─ Used by: contract_agent, legal_assistant                    │
│  ├─ Calls (24h): 1,247                                          │
│  └─ Avg latency: 234ms                                          │
│                                                                 │
│  main.tools.get_customer_info                                   │
│  ├─ Used by: support_agent                                      │
│  ├─ Calls (24h): 3,891                                          │
│  └─ Avg latency: 89ms                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Agents Registry

```
┌─────────────────────────────────────────────────────────────────┐
│  Agents                                                [+ New]  │
├─────────────────────────────────────────────────────────────────┤
│  support_agent        v2.3.0   ● deployed   4 tools   1.2k/hr   │
│  contract_agent       v1.1.0   ● deployed   2 tools   523/hr    │
│  product_qa_agent     v3.0.0   ● deployed   3 tools   89/hr     │
│  escalation_bot       v1.0.0   ○ staging    2 tools   —         │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent: support_agent v2.3.0                           [Edit]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Base Model: databricks-meta-llama-3-1-70b-instruct            │
│  Databit: support_response_template v1.4                        │
│  Status: ● Deployed                                             │
│                                                                 │
│  Tools (4 bound)                                                │
│  ├─ ☑ search_knowledge_base                                     │
│  ├─ ☑ get_customer_info                                         │
│  ├─ ☑ create_jira_ticket                                        │
│  └─ ☑ escalate_to_human                                         │
│                                                                 │
│  Guardrails                                                     │
│  ├─ ☑ PII filter (output)                                       │
│  ├─ ☑ Toxicity filter (output)                                  │
│  └─ ☑ Topic filter: no competitor mentions                      │
│                                                                 │
│  Lineage                                                        │
│  ├─ Training Data: support_responses_v2 (1,247 examples)        │
│  ├─ Fine-tuned: 2024-01-15                                      │
│  └─ Deployed: 2024-01-16                                        │
│                                                                 │
│         [Playground]    [Metrics]    [Traces]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features by Priority

### P0 - Must Have (MVP)

| Feature | Stage |
|---------|-------|
| Pipeline Navigator | All |
| Databit CRUD | Template |
| Databit Editor (schema, prompt, examples) | Template |
| Curation Queue | Curate |
| AI-Assisted Labeling | Curate |
| Human Review (approve/reject/correct) | Curate |
| Training Job Launcher | Train |
| Model Registration | Train |
| Endpoint Deployment | Deploy |
| Deep Links to Databricks | All |

### P1 - Should Have

| Feature | Stage |
|---------|-------|
| Tools Registry | Deploy |
| Agents Registry | Deploy |
| Agent Builder (tool binding, guardrails) | Deploy |
| Playground | Deploy |
| Basic Metrics Dashboard | Monitor |
| Trace Viewer | Monitor |
| Version History / Diff | Template |
| Bulk Actions + Keyboard Shortcuts | Curate |

### P2 - Nice to Have

| Feature | Stage |
|---------|-------|
| Schema Inference | Template |
| Synthetic Example Generation | Template |
| All AI Functions (translate, summarize, etc.) | Curate |
| Drift Detection | Monitor |
| Alerting | Monitor |
| Feedback Capture | Improve |
| Automatic Routing to Curation | Improve |
| Retraining Recommendations | Improve |

---

## Technical Architecture

### Deployment Model

- **Databricks App** - React frontend, FastAPI backend
- **Databricks Asset Bundle (DAB)** - Single deploy for app + jobs + schemas
- **Unity Catalog** - All state in governed Delta tables + registries

### Data Model (Delta Tables)

```sql
-- Databits (prompt templates)
databits.templates (
  id, name, version, status,
  schema_spec, prompt_template, examples,
  base_model, training_dataset,
  created_by, created_at, updated_at
)

-- Curation items
databits.curation_items (
  id, template_id, item_ref, item_data,
  agent_label, agent_confidence,
  human_label, status,
  reviewed_by, reviewed_at, created_at
)

-- Agents
databits.agents (
  id, name, version, status,
  base_model, databit_id,
  tools, guardrails,
  endpoint_name,
  created_by, created_at, updated_at
)

-- Job runs
databits.job_runs (
  id, job_type, template_id, agent_id,
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

-- Metrics (aggregated)
databits.metrics (
  agent_id, endpoint_name,
  timestamp, period,
  request_count, error_count,
  avg_latency, p99_latency,
  quality_score
)
```

### DAB Structure

```
databits-workbench/
├── databricks.yml                    # Bundle config
├── app/
│   ├── app.yaml                      # Databricks App config
│   ├── frontend/                     # React build
│   └── backend/                      # FastAPI
├── jobs/
│   ├── ingest/
│   │   ├── autoloader.py
│   │   ├── ocr_extract.py
│   │   ├── parse_documents.py
│   │   └── generate_embeddings.py
│   ├── curate/
│   │   ├── ai_label.py
│   │   ├── ai_extract.py
│   │   ├── detect_pii.py
│   │   └── score_quality.py
│   ├── train/
│   │   ├── assemble_data.py
│   │   ├── fine_tune.py
│   │   └── evaluate.py
│   ├── deploy/
│   │   ├── register_agent.py
│   │   └── create_endpoint.py
│   └── monitor/
│       ├── collect_metrics.py
│       ├── detect_drift.py
│       └── process_feedback.py
└── schemas/
    └── init.sql                      # All table DDL
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first deployed agent | < 1 day from data |
| Curation velocity | 200+ items/hour (AI-assisted) |
| Non-technical participation | Domain experts self-serve |
| Governance coverage | 100% of assets in UC |
| Mean time to detect issue | < 1 hour (with monitoring) |
| Feedback loop closure | < 1 week from feedback to retrain |

---

## Non-Goals

- **Not replacing Unity Catalog** - We register assets there
- **Not replacing MLflow** - We use it for tracking
- **Not replacing Model Serving** - We deploy to it
- **Not building ETL** - Use Lakeflow/DLT for data prep
- **Not building a vector DB** - Use Databricks Vector Search

---

## Rollout Plan

### Phase 1: Foundation (Week 1-2)
- DAB structure
- Delta schemas
- Databit CRUD
- Basic UI shell

### Phase 2: Curation (Week 3-4)
- Curation queue
- AI labeling jobs
- Human review workflow

### Phase 3: Training & Deploy (Week 5-6)
- Training pipeline
- Agent/tool registration
- Endpoint deployment
- Playground

### Phase 4: Monitor & Improve (Week 7-8)
- Metrics collection
- Trace viewer
- Feedback capture
- Alerting

### Phase 5: Polish (Week 9-10)
- Full job library
- UX polish
- Demo prep
- Documentation

---

## Open Questions

1. **Multi-agent orchestration** - Support agent-to-agent workflows?
2. **Evaluation framework** - Custom evals or MLflow Evaluate only?
3. **Guardrail extensibility** - Custom guardrails or predefined only?
4. **Tool marketplace** - Share tools across teams?

---

## Appendix: The Complete Job Library

### Data Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| ingest_files | Cloud storage | Delta table | On new files |
| ocr_extract | Images/PDFs | Text column | On ingest |
| parse_documents | Raw docs | Structured JSON | On ingest |
| generate_embeddings | Text | Vector column | On ingest |
| transcribe_audio | Audio files | Text | On ingest |
| extract_frames | Video files | Image table | On ingest |

### Template Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| infer_schema | Sample data | Schema suggestion | On demand |
| generate_examples | Template + data | Synthetic examples | On demand |
| test_prompt | Template + sample | Test results | On demand |

### Curate Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| ai_label | Items + template | Labels + confidence | On demand |
| ai_extract | Items + schema | Extracted entities | On demand |
| ai_summarize | Long text | Summaries | On demand |
| ai_translate | Text + target lang | Translations | On demand |
| ai_score_quality | Items | Quality scores | On demand |
| detect_duplicates | Items | Similarity clusters | On demand |
| detect_pii | Items | PII flags | On demand |
| filter_toxicity | Items | Safety flags | On demand |

### Train Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| assemble_data | Approved items | Training format | Before train |
| fine_tune | Training data | Model | On demand |
| evaluate | Model + eval set | Metrics | After train |
| compare_models | Model versions | Comparison report | On demand |

### Deploy Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| register_tool | Function code | UC Function | On demand |
| register_agent | Agent config | Agent record | On demand |
| create_endpoint | Agent | Serving endpoint | On demand |
| configure_guardrails | Rules | Guardrail config | On demand |

### Monitor Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| collect_metrics | Endpoint logs | Metrics table | Scheduled |
| log_traces | Requests | Trace table | Continuous |
| detect_drift | Metrics history | Drift alerts | Scheduled |
| score_outputs | Responses | Quality scores | Sampled |

### Improve Stage
| Job | Input | Output | Trigger |
|-----|-------|--------|---------|
| process_feedback | User feedback | Curation items | On feedback |
| analyze_gaps | Low-quality outputs | Gap report | Scheduled |
| recommend_retrain | Metrics + drift | Recommendation | Scheduled |
