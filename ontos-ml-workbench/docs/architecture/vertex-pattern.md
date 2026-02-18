# Vertex AI Multimodal Dataset Pattern for Ontos ML Workbench

## The Core Pattern (Vertex AI)

### 1. Raw Data Sources (Object Storage)
**What:** Collections of files in Cloud Storage buckets
- Images (inspection photos, X-rays, equipment images)
- Sensor telemetry (CSV, JSON time-series)
- Documents (PDFs, calibration reports)
- Video streams
- Structured data (database tables)

**Key Point:** Data can be **multimodal** - one dataset might reference images + metadata + telemetry

**Vertex Concept:** Dataset import from GCS URIs

### 2. Dataset Definition
**What:** Metadata about where data lives and how to access it
- Pointers to object storage paths
- Schema/column definitions
- Data type annotations
- Join keys for multimodal fusion

**Vertex Concept:** Managed Dataset resource with import specifications

### 3. Prompt Template (Instruction Template)
**What:** How to transform raw data into Q&A pairs
- System instruction
- User prompt template with `{{column_name}}` placeholders
- Expected output schema
- Few-shot examples (optional)
- Model parameters (temperature, max_tokens)

**Vertex Concept:** Not a first-class resource, but embedded in fine-tuning configs

### 4. Assembly (Materialized Prompt/Response Pairs)
**What:** The actual training data - applying template to dataset
- Input: Dataset + Template
- Output: JSONL with Q&A pairs
- Each row = one training example
- Includes system message, user prompt (with data filled in), assistant response

**Vertex Concept:** Prepared training data in JSONL format

### 5. Training
**What:** Fine-tune using the assembled Q&A pairs
- Train/validation split
- Model selection (base model)
- Hyperparameters
- Output: Fine-tuned model

## Ontos ML Workbench Implementation

### Current Data Model

```
Sheet (Dataset Definition)
  ├─ Metadata: catalog, schema, table_name
  ├─ Columns: name, type, description
  ├─ Data Location: Unity Catalog or object storage
  └─ May reference multiple sources (multimodal)

Template (Prompt Template)
  ├─ System prompt
  ├─ User prompt template
  ├─ Output schema
  ├─ Model config
  └─ Version history

Assembly (Materialized Q&A Pairs)
  ├─ References: Sheet + Template
  ├─ Assembly Rows: Individual Q&A pairs
  ├─ Status: assembling, ready, failed
  └─ Metadata: row counts, quality metrics
```

### The Workflow Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: DATA - Define Dataset                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Raw data in Unity Catalog or object storage            │
│         - Images: s3://bucket/defect-images/                   │
│         - Telemetry: catalog.schema.sensor_readings            │
│         - Metadata: catalog.schema.equipment_info              │
│                                                                 │
│  ACTION: Create Sheet (Dataset Definition)                     │
│          - Select primary data source                          │
│          - Optional: Add secondary sources (multimodal)        │
│          - Define join keys                                    │
│          - Map columns to semantic types                       │
│                                                                 │
│  OUTPUT: Sheet record with:                                    │
│          {                                                      │
│            id: "sheet-001",                                     │
│            name: "Defect Detection Dataset",                   │
│            primary_source: {...},                              │
│            secondary_sources: [{images}, {telemetry}],         │
│            join_config: {...}                                  │
│          }                                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: TEMPLATE - Define Prompt Template                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Available columns from Sheet                           │
│         - equipment_id                                          │
│         - inspection_date                                       │
│         - image_url (from multimodal join)                     │
│         - sensor_reading (from multimodal join)                │
│                                                                 │
│  ACTION: Create/Select Template                                │
│          System: "You are a defect detection expert..."        │
│          User: "Analyze equipment {{equipment_id}}.            │
│                 Image: {{image_url}}                           │
│                 Sensor reading: {{sensor_reading}}             │
│                 Is there a defect?"                            │
│          Output: {defect: boolean, type: string, ...}          │
│                                                                 │
│  OUTPUT: Template record                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: ASSEMBLE - Generate Q&A Pairs                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Sheet + Template                                       │
│                                                                 │
│  ACTION: For each row in Sheet:                                │
│          1. Fetch data from all sources (multimodal join)      │
│          2. Fill template placeholders                         │
│          3. Create Q&A pair:                                   │
│             {                                                   │
│               messages: [                                       │
│                 {role: "system", content: "..."},              │
│                 {role: "user", content: "Analyze..."},         │
│                 {role: "assistant", content: "..."}            │
│               ]                                                 │
│             }                                                   │
│          4. Store in Assembly                                  │
│                                                                 │
│  OUTPUT: Assembly with N rows                                  │
│          - Each row = one training example                     │
│          - Ready for curation/labeling                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: CURATE - Review & Label                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Assembly rows                                          │
│                                                                 │
│  ACTION: Human expert reviews each Q&A pair:                   │
│          - AI-generated → approve/reject/edit                  │
│          - Manual labeling → provide response                  │
│          - Flag quality issues                                 │
│                                                                 │
│  OUTPUT: Curated Assembly rows                                 │
│          - Quality scores                                      │
│          - Human-verified labels                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 5: TRAIN - Fine-tune Model                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: Curated Assembly                                       │
│                                                                 │
│  ACTION:                                                        │
│          1. Export to JSONL (OpenAI chat format)               │
│          2. Upload to Volumes                                  │
│          3. Submit FMAPI fine-tuning job                       │
│          4. Monitor training progress                          │
│                                                                 │
│  OUTPUT: Fine-tuned model in Model Registry                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Sheet = Dataset Definition (NOT the data itself)
**What it is:**
- Pointer to data location(s)
- Schema metadata
- Join configuration for multimodal

**What it is NOT:**
- Not a copy of the data
- Not materialized rows (that's Assembly)

**Example:**
```json
{
  "id": "sheet-defect-001",
  "name": "Radiation Equipment Defect Dataset",
  "primary_source": {
    "catalog": "ontos_ml_data",
    "schema": "inspection",
    "table": "equipment_logs",
    "columns": ["equipment_id", "inspection_date", "notes"]
  },
  "secondary_sources": [
    {
      "role": "images",
      "path": "s3://ontos-ml-images/inspections/",
      "join_key": "equipment_id",
      "format": "image/jpeg"
    },
    {
      "role": "telemetry",
      "catalog": "ontos_ml_data",
      "schema": "sensors",
      "table": "readings",
      "join_key": "equipment_id",
      "columns": ["temperature", "radiation_level"]
    }
  ]
}
```

### 2. Template = Prompt Template (Reusable IP)
**What it is:**
- System instruction
- User prompt with placeholders
- Output schema definition
- Model configuration

**Key insight:** Templates are **reusable** across multiple datasets. Same template can be applied to different sheets.

**Example:**
```json
{
  "id": "tpl-defect-001",
  "name": "Equipment Defect Classifier",
  "system_prompt": "You are an expert in radiation safety equipment...",
  "user_prompt_template": "Analyze equipment {{equipment_id}} inspected on {{inspection_date}}.\nInspection notes: {{notes}}\nImage: {{image_url}}\nSensor readings: Temperature={{temperature}}°C, Radiation={{radiation_level}} mSv\n\nIs there a defect?",
  "output_schema": {
    "defect_present": "boolean",
    "defect_type": "string",
    "severity": "string",
    "confidence": "number"
  },
  "model": "databricks-meta-llama-3-1-70b-instruct",
  "temperature": 0.7
}
```

### 3. Assembly = Materialized Training Data
**What it is:**
- Sheet + Template → Q&A pairs
- Each row is ONE training example
- Stored in database for curation

**The assembly process:**
1. Query data from Sheet's data sources
2. For each row, fill Template placeholders
3. Generate prompt/response pair
4. Store in Assembly table

**Example Assembly Row:**
```json
{
  "id": "assembly-row-001",
  "assembly_id": "asm-001",
  "source_data": {
    "equipment_id": "EQ-12345",
    "inspection_date": "2026-01-15",
    "notes": "Visual inspection shows corrosion",
    "image_url": "s3://ontos-ml-images/EQ-12345.jpg",
    "temperature": 85.3,
    "radiation_level": 2.1
  },
  "prompt": {
    "system": "You are an expert in radiation safety equipment...",
    "user": "Analyze equipment EQ-12345 inspected on 2026-01-15.\nInspection notes: Visual inspection shows corrosion\nImage: s3://ontos-ml-images/EQ-12345.jpg\nSensor readings: Temperature=85.3°C, Radiation=2.1 mSv\n\nIs there a defect?"
  },
  "response": {
    "defect_present": true,
    "defect_type": "corrosion",
    "severity": "moderate",
    "confidence": 0.89
  },
  "response_source": "ai_generated", // or "human_labeled"
  "human_verified": false
}
```

## Multimodal Support

### The Challenge
Training data often needs multiple data modalities:
- **Image** + metadata
- **Time-series sensor data** + event logs
- **Documents** + structured database rows

### The Solution: Multi-Source Sheets

A Sheet can reference multiple data sources with join keys:

```
Primary: equipment_logs table
  └─ JOIN images ON equipment_id
  └─ JOIN sensor_readings ON equipment_id AND date

Result: Each assembly row has:
  - equipment_id, inspection_date, notes (from primary)
  - image_url (from images source)
  - temperature, radiation_level (from sensors source)
```

### Implementation in Ontos ML Workbench

**Sheet Configuration:**
```typescript
interface Sheet {
  id: string;
  name: string;
  
  // Primary data source
  primary_source: DataSourceConfig;
  
  // Optional: Additional sources for multimodal
  secondary_sources?: DataSourceConfig[];
  
  // How to join them
  join_config?: {
    primary_key: string;
    joins: Array<{
      source_index: number;
      foreign_key: string;
      type: "left" | "inner";
    }>;
  };
}

interface DataSourceConfig {
  role: "primary" | "images" | "telemetry" | "documents" | "labels";
  
  // Unity Catalog source
  catalog?: string;
  schema?: string;
  table?: string;
  
  // OR object storage source
  path?: string; // s3://, /Volumes/, etc.
  format?: "image" | "csv" | "json" | "parquet";
  
  // Columns to include
  columns?: SourceColumn[];
}
```

## Current Implementation Gaps

### ✅ What Works
1. **Sheets** - Can define datasets pointing to UC tables
2. **Templates** - Can create prompt templates with placeholders
3. **Assemblies** - Can generate Q&A pairs
4. **Curation** - Can review and label

### ❌ What's Missing/Broken

1. **Multimodal Sheet Creation**
   - Currently: Only single source (one table)
   - Needed: Support for joining multiple sources
   - UI: Multi-source sheet builder

2. **Sheet → Template → Assembly Flow**
   - Currently: Confusing - Template page doesn't clearly lead to Assembly
   - Needed: Clear "Apply Template to Sheet" action
   - UI: Button on Template page: "Use this template" → select Sheet → Create Assembly

3. **Assembly Browser**
   - Currently: Shows all assemblies mixed together
   - Needed: Filter by Template, by Sheet, by status
   - UI: Faceted search/filter

4. **Assembly = Training Data Clarity**
   - Currently: Not clear that Assembly IS the training data
   - Needed: Explicit "Export to Training Format" button
   - UI: Show JSONL preview, row count, train/val split

## Recommended Workflow UX

### User Mental Model

```
"I have data" → Sheet
"I know how to prompt it" → Template  
"Generate training examples" → Assembly
"Review quality" → Curate
"Train model" → FMAPI Fine-tuning
```

### Ideal Flow

1. **DATA Stage**
   ```
   User: "I have defect images + sensor logs"
   Action: Create multimodal Sheet
   UI: Browse UC for primary table
       → Add secondary source (images folder)
       → Define join keys
       → Preview merged data
   Output: Sheet "Defect Detection Dataset"
   ```

2. **TEMPLATE Stage**
   ```
   User: "I want to classify defects"
   Action: Create/select Template
   UI: Browse template library
       → OR create new template
       → Preview how it will format data
   Output: Template selected
   ```

3. **ASSEMBLE Stage** (NEW - should be explicit!)
   ```
   User: "Generate training examples"
   Action: Apply Template to Sheet
   UI: "Apply Template to Dataset"
       → Select Sheet
       → Select Template
       → Configure:
           - Response mode (AI generate vs manual label)
           - Number of samples
           - Model for AI generation
       → Preview first few examples
       → Click "Assemble"
   Output: Assembly "Defect-v1" with 1000 rows
   ```

4. **CURATE Stage**
   ```
   User: "Review and fix labels"
   Action: Select Assembly to curate
   UI: Browse assemblies
       → Select "Defect-v1"
       → Review each Q&A pair
       → Approve/Edit/Flag
   Output: Curated Assembly ready for training
   ```

5. **TRAIN Stage**
   ```
   User: "Train the model"
   Action: Export Assembly → FMAPI job
   UI: Select Assembly
       → Configure train/val split
       → Select base model
       → Set hyperparameters
       → Submit job
   Output: Fine-tuned model in registry
   ```

## Next Steps

### Priority 1: Clarify the Flow
- [ ] Make "Assemble" an explicit stage/action
- [ ] Clear breadcrumb: Sheet → Template → Assembly → Training
- [ ] UI: "Apply Template" button on Template page

### Priority 2: Fix Assembly Confusion
- [ ] Assembly browser should filter by Sheet OR Template
- [ ] Show relationship: "Assembly X = Sheet Y + Template Z"
- [ ] Preview JSONL format before training

### Priority 3: Multimodal Support
- [ ] Sheet builder: Add secondary sources
- [ ] Assembly: Join multiple sources
- [ ] Template: Reference columns from any source

### Priority 4: End-to-End Test
- [ ] Create multimodal Sheet (images + metadata)
- [ ] Apply Template
- [ ] Generate Assembly
- [ ] Curate
- [ ] Export to JSONL
- [ ] Submit FMAPI job
- [ ] Verify trained model works

## Questions to Clarify

1. **Should ASSEMBLE be its own stage?**
   - Pro: Makes the flow explicit
   - Con: Adds another step
   - Alternative: TEMPLATE stage has "Apply to Dataset" action

2. **Where do users create Assemblies?**
   - Option A: From Template page ("Use this template" → select Sheet)
   - Option B: From DATA page ("Apply template to this sheet")
   - Option C: Dedicated ASSEMBLE page

3. **How to handle multiple Assemblies?**
   - One Sheet + One Template can have many Assemblies (iterations)
   - Need versioning/naming: "Defect-v1", "Defect-v2-with-edits"

4. **When to show Sheets vs Assemblies?**
   - DATA stage: Sheets (dataset definitions)
   - CURATE stage: Assemblies (materialized Q&A pairs)
   - TRAIN stage: Assemblies (ready for export)
