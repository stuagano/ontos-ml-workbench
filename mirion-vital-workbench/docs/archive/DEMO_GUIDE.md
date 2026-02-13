# VITAL Platform Workbench - Demo Guide

**For Mirion's AI-Powered Radiation Safety Platform**

This guide will help you deliver a confident, impressive demo that resonates with both technical teams and executives. You know the product—this gives you the structure and talking points to make it shine.

---

## Table of Contents

1. [Quick Start (2 Minutes to Demo-Ready)](#quick-start)
2. [Demo Flows by Duration](#demo-flows)
   - [5-Minute Executive Overview](#5-minute-executive-overview)
   - [15-Minute Core Workflow](#15-minute-core-workflow)
   - [30-Minute Technical Deep Dive](#30-minute-technical-deep-dive)
3. [Stage-by-Stage Guide](#stage-by-stage-guide)
4. [Star Features to Highlight](#star-features)
5. [Demo Tips & Tricks](#demo-tips)
6. [Technical Q&A Prep](#technical-qa-prep)
7. [Recovery Strategies](#recovery-strategies)

---

## Quick Start {#quick-start}

### 2 Minutes to Demo-Ready

```bash
# 1. Start the development server (includes hot reload)
apx dev start

# 2. Wait for startup messages (typically 10-15 seconds)
#    You should see:
#    - Backend: ✓ Running on http://0.0.0.0:8000
#    - Frontend: ✓ Running on http://localhost:5173

# 3. Open browser
open http://localhost:5173

# 4. Verify demo data is loaded
#    - Click on DATA stage → Should see sample Sheets
#    - Click on GENERATE stage → Should see Templates
#    - Click "Canonical Labels" in top right → Should see labeled items
```

**Pre-Demo Checklist:**
- ✅ Database contains sample data (defect detection, predictive maintenance)
- ✅ Backend and frontend are running without errors
- ✅ Browser console is clear of critical errors
- ✅ Have a second browser tab open to Databricks workspace (for Unity Catalog deep links)

**Pro Tip:** Keep the terminal visible on a second monitor. Developers love seeing real-time logs.

---

## Demo Flows by Duration {#demo-flows}

Choose the right flow based on your audience and time constraints.

---

## 5-Minute Executive Overview {#5-minute-executive-overview}

**Audience:** C-level, VPs, Decision Makers
**Goal:** Show business value and strategic differentiation
**Format:** High-level walk-through emphasizing ROI and competitive advantages

### Opening (30 seconds)

"VITAL Platform Workbench is Mirion's mission control for AI-powered radiation safety. It transforms 60+ years of radiation physics expertise into reusable AI assets that work across all 86 facilities—whether they're connected to the cloud or completely air-gapped."

**Navigate to: Home (DATA stage)**

### The Problem (1 minute)

"Traditional ML requires separate pipelines for images, sensors, and documents. With LLMs, everything converges through **prompt templates**—reusable IP that encodes Mirion's expertise."

**Show: Pipeline Breadcrumb**
- Point to the 7 stages: DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
- "This is the complete lifecycle—from raw detector data to production models with governance built in."

**Key Talking Point:** "We're not just building models—we're creating reusable AI assets that scale across the entire fleet."

### The Innovation: Canonical Labels (2 minutes)

**Click: "Canonical Labels" button (top right)**

"Here's our key innovation: **Label once, reuse everywhere.**"

**Show: Canonical Labeling Tool**
- Browse through labeled items (defect images, equipment telemetry)
- "When an expert labels a detector image, that label is stored independently and reused every time we generate new training data."

**Business Impact:**
- "January: Expert labels 500 images → Takes 2 weeks"
- "February: We improve the prompt template → 500 images automatically pre-approved"
- "**Zero re-labeling needed.** Expert time reduced by 90%."

**Navigate to: GENERATE stage**

### Multimodal Templates (1 minute)

**Show: Template Library**
- Defect Detection (Vision AI)
- Predictive Maintenance (Time Series)
- Anomaly Detection (Real-time)

"With LLMs, the same platform handles images, sensor data, PDFs, and telemetry. One template, deployed across Airgap, Cloud, and Edge."

**Key Talking Point:** "This isn't just a productivity tool—it's how we scale Mirion's expertise across every facility without hiring 86 separate teams."

### Closing (30 seconds)

**Navigate to: DEPLOY stage**

"And it's all built natively on Databricks—Unity Catalog for governance, MLflow for lineage, Databricks Apps for deployment. Nothing leaves the lakehouse."

**Call to Action:** "Let's schedule a deeper dive to explore your specific use cases."

---

## 15-Minute Core Workflow {#15-minute-core-workflow}

**Audience:** Technical Leads, Data Scientists, ML Engineers
**Goal:** Demonstrate the end-to-end workflow with hands-on feel
**Format:** Walk through a complete example from data to deployment

### Opening (1 minute)

"Today I'll show you how VITAL Workbench takes you from raw radiation detector data to production models—all within the Databricks lakehouse. We'll focus on a real use case: **defect detection for radiation detectors**."

**Navigate to: DATA stage**

### Stage 1: DATA (2 minutes)

**URL:** `http://localhost:5173` → DATA stage

**What to Show:**
1. Browse Sheets (dataset definitions)
2. Select "Defect Detection - Scintillator Crystals"
3. Click to view details

**Talking Points:**
- "Sheets are lightweight pointers to Unity Catalog data—we're not copying data, just defining what to use."
- "This Sheet combines images from UC Volumes with sensor metadata from Delta tables."
- "Multimodal fusion: Visual inspection + temperature readings + timestamp context."

**Show:** Click "View in Unity Catalog" deep link
- Opens to actual UC table (if workspace is configured)
- "Complete data lineage from source to model."

**Value Proposition:** "No ETL pipelines. No data lakes separate from your feature store. Everything stays in Unity Catalog."

**Expected Question:** "How do you handle images?"
**Answer:** "Images stay in Unity Catalog Volumes. We store references (file paths), not blobs. When the model needs an image, we read directly from the volume."

### Stage 2: GENERATE (3 minutes)

**Navigate to: GENERATE stage → Browse mode**

**What to Show:**
1. Browse Template Library
2. Select "Defect Classification - Visual Inspection"
3. Show template details:
   - System prompt (sets expert behavior)
   - User prompt template (with placeholders like `{{image_path}}`)
   - Input schema, output schema
   - Few-shot examples

**Talking Points:**
- "Templates encode 60 years of radiation physics expertise—crystal formation patterns, common defect types, inspection criteria."
- "They're versioned Unity Catalog assets—we can track who changed what and why."
- "This template references Mirion's internal defect taxonomy: inclusions, cracks, delamination, surface contamination."

**Show:** Click "Generate Training Sheet"
- Configure generation:
  - Select Sheet: "Defect Detection - Scintillator Crystals"
  - Labeling mode: "AI-Generated"
  - Preview: Shows how Q&A pairs will look

**Talking Points:**
- "We apply this template to the Sheet's 500 images."
- "The LLM generates initial labels, but here's the magic..."

**Navigate to: LABEL stage (automatically after generation starts)**

### Stage 3: LABEL (4 minutes)

**What to Show:**
1. Training Sheet review interface
2. Progress summary:
   ```
   Progress: 150 / 500 labeled

   ├─ Pre-approved (from canonical labels): 150
   └─ Needs Review: 350
      ├─ Unlabeled: 300
      ├─ Rejected: 30
      └─ Flagged: 20
   ```

**Key Feature: Show the dual mode workflow**

**Mode A: Review AI-Generated Q&A Pairs**
1. Click "Review" on a Training Sheet
2. Show individual Q&A pair:
   - Image of crystal defect
   - AI-generated classification
   - Expert can: Approve / Edit / Reject / Flag
3. Click "Approve" → **Creates canonical label**

**Talking Points:**
- "When the expert approves this, we create a canonical label for this specific image."
- "Next time we generate training data—maybe with a better prompt—this image is **automatically pre-approved.**"
- "The expert never has to label the same image twice."

**Mode B: Canonical Labeling Tool (The Star Feature)**

**Click: "Canonical Labels" button (top right)**

**What to Show:**
1. Select Sheet: "Defect Detection - Scintillator Crystals"
2. Browse unlabeled items
3. Label an image directly:
   - Select defect type: "Inclusion"
   - Set severity: "Major"
   - Add notes: "Foreign particle embedded during crystal growth"
   - Set usage constraints: "All uses allowed"
4. Save label

**Talking Points:**
- "This is **proactive labeling.** The expert labels source data before we even generate Q&A pairs."
- "Now watch what happens when we generate a Training Sheet..."

**Navigate back to: GENERATE stage**
- Generate new Training Sheet (show that labeled items are pre-approved)
- "See? The item we just labeled is already approved. **Zero review time needed.**"

**Value Proposition:**
- "Traditional tools: Label → Train → Improve prompt → **Re-label everything**"
- "VITAL Workbench: Label → Train → Improve prompt → **Reuse labels**"
- "Expert time reduced by 90% for iterative prompt engineering."

**Expected Question:** "What if the label changes?"
**Answer:** "Canonical labels are versioned. We track who changed what and when. You can see the history and even roll back if needed."

### Stage 4: TRAIN (2 minutes)

**Navigate to: TRAIN stage**

**What to Show:**
1. Select approved Training Sheet
2. Export summary:
   ```
   Total Labeled: 500
   Training Allowed: 450
   Training Prohibited: 50 (PHI/compliance restrictions)
   ```
3. Configure training:
   - Train/val split: 80/20
   - Base model: Llama 3.2 90B Vision
   - Hyperparameters
4. Click "Preview Export" → Shows JSONL format
5. Click "Start Training"

**Talking Points:**
- "Dual quality gates: **Status** (expert approval) + **Usage Constraints** (governance)."
- "50 images contain identifiable equipment serial numbers → Marked as training-prohibited for compliance."
- "They can still be used for few-shot examples or evaluation—just not baked into model weights."
- "Training submission goes through Foundation Model APIs, tracked in MLflow."

**Show:** MLflow lineage (if time permits)
- Click "View in MLflow"
- "Complete lineage: This model was trained on Training Sheet v2, which used Template v3, which sourced from Sheet 'Defect Detection.'"

**Value Proposition:** "When a model misbehaves in production, we can trace back to the exact training examples that influenced it."

### Stage 5: DEPLOY (1 minute)

**Navigate to: DEPLOY stage**

**What to Show:**
1. Select trained model
2. Deployment options:
   - **Cloud:** Model Serving endpoint
   - **Edge:** Containerized for local gateways
   - **Airgap:** Offline bundle for secure facilities
3. Configure deployment (ACE architecture)

**Talking Points:**
- "Mirion operates in 86 facilities with varying connectivity: Cloud-connected, edge gateways, and fully air-gapped."
- "Same model, three deployment modes—ACE architecture (Airgap, Cloud, Edge)."
- "Unity Catalog handles model registry and versioning across all environments."

**Expected Question:** "How do you handle airgap deployments?"
**Answer:** "We export the model bundle, dependencies, and example store snapshot as a single package. Install on-prem. Local inference—zero internet required."

### Stage 6: MONITOR (1 minute)

**Navigate to: MONITOR stage**

**What to Show:**
1. Deployed model metrics dashboard:
   - Accuracy over time
   - Drift detection
   - Latency, throughput
2. Sample predictions with confidence scores
3. Alerts (if drift detected)

**Talking Points:**
- "Real-time monitoring with Lakehouse Monitoring."
- "Drift detection: Are we seeing new defect types not in training data?"
- "Feedback loop ready: When users flag bad predictions, we route them back to labeling."

### Stage 7: IMPROVE (1 minute)

**Navigate to: IMPROVE stage**

**What to Show:**
1. Feedback items from production
2. Gap analysis: "Model is weak on 'delamination' defects (only 5 training examples)"
3. Click "Add to Training Sheet"
4. Shows feedback loop: Production → Labeling → Training → Redeployment

**Talking Points:**
- "Continuous improvement baked in. Feedback from production automatically suggests which Training Sheets need expansion."
- "We track which models were trained on which data—so we know exactly where to add examples."

**Closing:** "And that's the full lifecycle. Raw data to production model with complete governance and continuous improvement."

---

## 30-Minute Technical Deep Dive {#30-minute-technical-deep-dive}

**Audience:** Architects, Senior Engineers, Data Platform Teams
**Goal:** Show architecture, integrations, and advanced capabilities
**Format:** Technical walkthrough with deep dives into key components

Use the 15-minute flow as a base, but add these deep dives:

### Deep Dive 1: Composite Key Architecture (5 minutes)

**After showing Canonical Labeling Tool:**

**Technical Detail:** "Let's talk about the schema innovation that makes this work."

**Show:** Database schema (open terminal or IDE)
```sql
-- canonical_labels table
CREATE TABLE canonical_labels (
  id UUID,
  sheet_id UUID,              -- Source dataset
  item_ref STRING,            -- e.g., "image_042.png"
  label_type STRING,          -- e.g., 'classification', 'localization'
  label_data VARIANT,         -- JSON ground truth

  -- Governance
  allowed_uses ARRAY<STRING>,
  prohibited_uses ARRAY<STRING>,

  -- Composite unique key
  UNIQUE(sheet_id, item_ref, label_type)
)
```

**Talking Points:**
- "Composite key: One label per `(sheet_id, item_ref, label_type)` tuple."
- "Same image can have multiple labelsets:"
  - `label_type='classification'` → "Defect: Inclusion"
  - `label_type='localization'` → Bounding box coordinates
  - `label_type='severity'` → "Major / Minor"
  - `label_type='root_cause'` → "Foreign particle during crystal growth"
- "Different experts can label different aspects. No conflicts."
- "When we generate a Training Sheet, we check: Does a canonical label exist for this item + label_type? If yes → pre-approve. If no → needs review."

**Expected Question:** "What if I change a label?"
**Answer:** "Labels are versioned. We store version history with timestamps and user IDs. You can roll back or audit changes."

### Deep Dive 2: Dual Quality Gates (3 minutes)

**During TRAIN stage:**

**Technical Detail:** "Let's talk about the governance model—it's more nuanced than just 'approved' vs 'rejected.'"

**Show:** Q&A pair metadata
```json
{
  "status": "labeled",                    // Quality gate
  "allowed_uses": ["few_shot", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Contains identifiable equipment serial numbers - compliance restriction",
  "data_classification": "restricted"
}
```

**Talking Points:**
- "Two orthogonal dimensions:"
  1. **Status** (quality): Is this correct? → `unlabeled`, `labeled`, `rejected`
  2. **Usage Constraints** (governance): What can we use it for? → `allowed_uses`, `prohibited_uses`
- "Same Q&A pair might be:"
  - ✅ High quality (labeled)
  - ❌ Training prohibited (PHI, proprietary data)
  - ✅ Few-shot allowed (ephemeral, not persisted in weights)
- "Enforcement at export time:"
  ```python
  # Training export
  training_pairs = qa_pairs.filter(
    (col('status') == 'labeled') &
    (array_contains(col('allowed_uses'), 'training')) &
    (~array_contains(col('prohibited_uses'), 'training'))
  )
  ```

**Real-World Examples:**
- **Mammogram with PHI:** High quality, perfect for testing → Training prohibited (HIPAA)
- **Synthetic data:** No restrictions → All uses allowed
- **Proprietary client data:** Training allowed (protected weights) → Few-shot prohibited (might leak in logs)
- **Held-out test set:** Evaluation only → Training prohibited (data leakage)

**Value Proposition:** "Compliance layer separate from quality approval. One expert approves quality, security team sets constraints. No friction."

### Deep Dive 3: Multimodal Data Fusion (4 minutes)

**During DATA stage:**

**Technical Detail:** "Let's see how multimodal fusion works under the hood."

**Show:** Sheet definition (JSON format)
```json
{
  "name": "Defect Detection - Scintillator Crystals",
  "primary_table": "mirion_vital.raw.inspection_records",
  "secondary_sources": [
    {
      "type": "volume",
      "path": "/Volumes/mirion_vital/raw/crystal_images",
      "join_key": "inspection_id"
    }
  ],
  "join_keys": ["inspection_id"]
}
```

**Show:** Source table schema
```sql
-- primary_table: inspection_records
CREATE TABLE inspection_records (
  inspection_id STRING,           -- Join key
  image_path STRING,              -- /Volumes/.../IMG_0042.png

  -- Sensor context
  detector_serial STRING,
  crystal_batch_id STRING,
  temperature_c FLOAT,
  humidity_percent FLOAT,

  -- Metadata
  inspector_id STRING,
  inspection_timestamp TIMESTAMP
)
```

**Talking Points:**
- "When we generate Q&A pairs, the LLM sees:"
  - ✅ The image (visual)
  - ✅ Sensor readings at time of capture (temperature, humidity)
  - ✅ Batch metadata (which crystal growth run)
  - ✅ Temporal context (timestamp)
- "True multimodal: 'Image shows inclusion, but temperature was 5°C above spec during crystal growth—likely cause.'"
- "All data stays in Unity Catalog. We only store references."

**Show:** Generated Q&A pair (preview mode)
```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Classify the defect in this scintillator crystal image."},
        {"type": "image_url", "image_url": {"url": "dbfs:/Volumes/.../IMG_0042.png"}},
        {"type": "text", "text": "Context: Temperature 25.3°C, Humidity 42%, Batch XL-2024-03"}
      ]
    }
  ]
}
```

**Value Proposition:** "One platform for vision, time series, documents, and sensors. No more separate pipelines."

### Deep Dive 4: DSPy Integration (3 minutes)

**Navigate to: TOOLS → DSPy Optimizer (if implemented)**

**Technical Detail:** "Now let's talk about automated prompt optimization."

**What to Show:**
1. DSPy Optimizer interface
2. Select Training Sheet as evaluation set
3. Configure optimizer: BootstrapFewShot, MIPRO, etc.
4. Launch optimization run

**Talking Points:**
- "Databricks acquired DSPy—we're the only platform with native integration."
- "DSPy systematically optimizes prompts and few-shot examples against your curated Training Sheets."
- "Instead of manually tweaking prompts, DSPy explores hundreds of variations and picks the best."

**Show:** Optimization run results (if sample data exists)
```
Baseline Accuracy: 78%
Optimized Accuracy: 89%

Changes:
- Added 3 few-shot examples for 'delamination' class
- Simplified system prompt (removed verbose context)
- Adjusted temperature from 0.7 to 0.3
```

**Talking Points:**
- "Results flow back into Example Store and update Template versions."
- "You can accept or reject optimizations—full human-in-the-loop control."

**Expected Question:** "Does this replace human expertise?"
**Answer:** "No—it **amplifies** expertise. DSPy finds patterns in expert-labeled data and codifies them into optimized prompts. Experts still define the training set and approve changes."

### Deep Dive 5: Lineage & Traceability (2 minutes)

**During TRAIN or MONITOR stage:**

**Technical Detail:** "Let's see how lineage works when a model misbehaves in production."

**Show:** Model lineage query (SQL or UI)
```sql
-- Which Training Sheet was used to train Model Y?
SELECT
  ts.name,
  ts.labeled_pairs,
  mtl.trained_at,
  mtl.training_config
FROM model_training_lineage mtl
JOIN training_sheets ts ON ts.id = mtl.training_sheet_id
WHERE mtl.model_id = 'defect-classifier-v3';

-- Show me the actual Q&A pairs used
SELECT qa.messages, qa.status, qa.canonical_label_id
FROM model_training_lineage mtl
LATERAL VIEW EXPLODE(mtl.qa_pair_ids) AS qa_pair_id
JOIN qa_pairs qa ON qa.id = qa_pair_id
WHERE mtl.model_id = 'defect-classifier-v3';
```

**Talking Points:**
- "Complete audit trail: Model → Training Sheet → Q&A pairs → Canonical labels → Source data."
- "When a model misclassifies a defect, we can:"
  1. Find similar examples in the training set
  2. Identify if this defect type was underrepresented
  3. Add more canonical labels for this type
  4. Retrain with expanded data
- "All tracked in `model_training_lineage` table—Unity Catalog + MLflow integration."

**Value Proposition:** "Debugging models goes from 'black box magic' to systematic root cause analysis."

### Remaining Time: Q&A and Custom Scenarios (3 minutes)

Ask the audience:
- "What's your biggest pain point in ML workflows today?"
- "Do you have a specific use case you'd like to see mapped to this platform?"
- "Any concerns about adoption or integration with existing tools?"

---

## Stage-by-Stage Guide {#stage-by-stage-guide}

Detailed breakdown for each workflow stage.

---

### STAGE 1: DATA

**URL:** `http://localhost:5173` (default lands on DATA stage)

**What to Show:**
1. **Browse Sheets** (dataset definitions)
   - Click on "Defect Detection - Scintillator Crystals"
   - Show metadata: Primary table, secondary sources, join keys
2. **View in Unity Catalog** (deep link)
   - Opens Databricks workspace
   - Shows actual table schema and data preview
3. **Create New Sheet** (if time permits)
   - Click "Create Sheet" button
   - Walk through wizard:
     - Select UC table
     - Add images from UC Volume
     - Define join condition
     - Preview results

**Key Talking Points:**
- "**Sheets are pointers, not copies.** We're not duplicating data—just defining what to use."
- "Multimodal fusion: Images from UC Volumes + sensor data from Delta tables."
- "All governed by Unity Catalog—tags, lineage, access controls propagate automatically."

**Value Proposition:**
- **No ETL pipelines:** Data stays in UC
- **No data silos:** Feature store = lakehouse
- **Multimodal ready:** Images, sensors, documents in one place

**Common Questions:**

**Q: "How do you handle images?"**
A: "Images stay in Unity Catalog Volumes as files. We store file paths in Delta tables. When generating Q&A pairs, we read images directly from volumes. No copying."

**Q: "What about data privacy?"**
A: "Unity Catalog governance applies end-to-end. If a user doesn't have access to a UC table, they can't create Sheets from it. Tags (PII, PHI) propagate to canonical labels and Q&A pairs."

**Q: "Can I use external data sources?"**
A: "Yes—use Unity Catalog External Locations to mount S3, ADLS, or GCS. Then create Sheets pointing to external tables/volumes."

---

### STAGE 2: GENERATE

**URL:** `http://localhost:5173` → Click "GENERATE" in pipeline breadcrumb

**Sub-Navigation:**
- **Browse Mode:** Template library (default view)
- **Create Mode:** Build new template

**What to Show (Browse Mode):**
1. **Template Library** (DataTable view)
   - Defect Detection template
   - Predictive Maintenance template
   - Anomaly Detection template
2. **Select a Template**
   - Click "Defect Classification - Visual Inspection"
   - Show details:
     - System prompt: "You are a Mirion radiation safety expert..."
     - User prompt template: "Classify the defect in this crystal: {{image_path}}"
     - Input schema: `image_path`, `temperature`, `batch_id`
     - Output schema: `defect_type`, `severity`, `confidence`
     - Few-shot examples
3. **Generate Training Sheet**
   - Click "Generate Training Sheet"
   - Configure:
     - Select Sheet: "Defect Detection - Scintillator Crystals"
     - Labeling mode: "AI-Generated" (LLM labels automatically)
     - Preview: Shows sample Q&A pairs
   - Click "Start Generation"
   - Shows progress: "Generating 500 Q&A pairs..."

**What to Show (Create Mode):**
- Click "Create Template" button
- Walk through builder:
  - Name, description
  - System prompt editor
  - User prompt template with placeholders
  - Input/output schema definition
  - Few-shot example editor
- Save as draft → Publish when ready

**Key Talking Points:**
- "Templates encode Mirion's domain expertise—60 years of radiation physics knowledge."
- "They're **versioned Unity Catalog assets**—track who changed what and roll back if needed."
- "Reusable: Same template works across all 86 facilities, all detector types."
- "The prompt references Mirion's internal taxonomy: inclusion, crack, delamination, surface contamination."

**The Canonical Label Magic:**
- "When we generate Q&A pairs, we check: Does a canonical label exist for this item?"
  - **Yes:** → Pre-approved automatically (status = `labeled`)
  - **No:** → Needs expert review (status = `unlabeled`)
- "Items with canonical labels skip review—**instant reuse.**"

**Value Proposition:**
- **Template as IP:** Knowledge asset, not just code
- **Reusability:** One template → Many Training Sheets
- **Iteration speed:** Improve prompt → Regenerate → Labels reused

**Common Questions:**

**Q: "How do you prevent prompt injection?"**
A: "Input validation at template execution time. User data is escaped before insertion. System prompt is immutable at runtime."

**Q: "Can I use external models (OpenAI, Anthropic)?"**
A: "Yes—configure base model per template. Foundation Model APIs support external providers."

**Q: "What if the AI generates garbage labels?"**
A: "That's why LABEL stage exists. Expert review is mandatory before training. AI-generated labels are treated as drafts."

---

### STAGE 3: LABEL

**URL:** `http://localhost:5173` → Click "LABEL" in pipeline breadcrumb

**Two Workflows:**

#### Mode A: Review Training Sheet Q&A Pairs

**What to Show:**
1. **Select Training Sheet**
   - Click on "Defect Detection - Q&A v1"
   - Shows progress summary:
     ```
     Progress: 150 / 500 labeled

     ├─ Pre-approved (from canonical labels): 150
     └─ Needs Review: 350
        ├─ Unlabeled: 300
        ├─ Rejected: 30
        └─ Flagged: 20
     ```
2. **Review Interface**
   - Click "Review Unlabeled"
   - Shows individual Q&A pair:
     - Left: Image of crystal defect
     - Right: AI-generated classification
     - Metadata: Temperature, batch ID, timestamp
   - Actions:
     - ✅ **Approve:** Marks as `labeled`, creates canonical label
     - ✏️ **Edit:** Correct the label, then approve → Creates canonical label
     - ❌ **Reject:** Marks as `rejected`, excluded from training
     - 🚩 **Flag:** Marks for additional expert review
3. **Bulk Actions** (if time permits)
   - Filter by confidence score
   - Auto-approve high-confidence (>0.95)
   - Batch reject low-confidence (<0.5)

**Key Talking Points:**
- "Expert review is mandatory—no AI-generated label goes into training without human approval."
- "When you approve a Q&A pair, we **create a canonical label** for the source image."
- "Next time we generate training data with a better prompt, this image is **pre-approved**—zero re-labeling."
- "Reject = not good enough for training. Flag = needs senior expert review."

#### Mode B: Canonical Labeling Tool (The Star Feature)

**Access:** Click "Canonical Labels" button (top right of header)

**What to Show:**
1. **Dataset Selection**
   - Select Sheet: "Defect Detection - Scintillator Crystals"
   - Shows progress: "150 / 500 items labeled"
2. **Item Browser**
   - Grid view of unlabeled images
   - Click on an image
3. **Labeling Interface**
   - Left: Image preview (full resolution)
   - Right: Label form
     - Defect type: Dropdown (Inclusion, Crack, Delamination, Surface Contamination)
     - Severity: Radio buttons (Major, Minor)
     - Notes: Text area for expert reasoning
     - Confidence: High / Medium / Low
     - Usage constraints:
       - Allowed uses: Checkboxes (Training, Validation, Few-shot, Evaluation, Testing)
       - Prohibited uses: Checkboxes (same options)
       - Reason: Text area (e.g., "Contains identifiable equipment serial number")
   - Click "Save Label"
4. **Immediate Reuse Demo**
   - Navigate back to GENERATE stage
   - Generate a new Training Sheet
   - Show that the labeled item is automatically pre-approved

**Key Talking Points:**
- "This is **proactive labeling**—label source data before generating Q&A pairs."
- "Create test sets independent of training workflows—label 200 images, mark as 'Training Prohibited' for held-out evaluation."
- "Multiple labelsets: Same image can have classification label, localization label, severity label—all independent."
- "Usage constraints: Compliance built in. Expert labels quality, security team sets governance."

**The Workflow Efficiency Story:**
- **January:** Expert labels 500 images (2 weeks)
- **February:** Improve prompt template → Regenerate Training Sheet
- **Result:** 500 images pre-approved (0 re-labeling)
- **Time saved:** 90% reduction in expert time

**Value Proposition:**
- **Label once, reuse everywhere**
- **Template iteration is fast and cheap**
- **Test set creation** separate from training
- **Multiple labelsets** without conflicts

**Common Questions:**

**Q: "What if the label changes?"**
A: "Canonical labels are versioned. We track every change with timestamps and user IDs. You can audit history or roll back."

**Q: "How do you handle inter-annotator agreement?"**
A: "Flagged pairs can be routed to senior experts. Multiple experts can label the same item (different label_types). Conflict resolution workflows are planned for P2."

**Q: "Can I import existing labels?"**
A: "Yes—bulk upload via CSV or API. Map your existing labels to canonical label schema."

---

### STAGE 4: TRAIN

**URL:** `http://localhost:5173` → Click "TRAIN" in pipeline breadcrumb

**What to Show:**
1. **Select Training Sheet**
   - Click on "Defect Detection - Q&A v1 (Approved)"
   - Shows export summary:
     ```
     Total Labeled: 500
     Training Allowed: 450
     Training Prohibited: 50
     ```
2. **Export Configuration**
   - Train/val split: 80/20 (slider)
   - Base model: Llama 3.2 90B Vision (dropdown)
   - Hyperparameters:
     - Temperature: 0.3
     - Learning rate: 1e-5
     - Epochs: 3
3. **Preview Export**
   - Click "Preview Export"
   - Shows JSONL format (first 10 lines)
   ```jsonl
   {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
   ```
4. **Dual Quality Gates Explanation**
   - Show filter logic:
     ```python
     # Only export pairs that pass BOTH gates:
     export_pairs = qa_pairs.filter(
       # Gate 1: Quality (expert approved)
       (col('status') == 'labeled') &

       # Gate 2: Governance (compliance/usage constraints)
       (array_contains(col('allowed_uses'), 'training')) &
       (~array_contains(col('prohibited_uses'), 'training'))
     )
     ```
   - "50 pairs contain equipment serial numbers → Training prohibited (compliance)."
   - "They can still be used for few-shot examples or evaluation—just not in model weights."
5. **Submit Training Job**
   - Click "Start Training"
   - Shows submission: "Job submitted to Foundation Model APIs"
   - Progress: Links to Databricks Jobs UI
6. **Lineage Tracking** (if time permits)
   - After training completes, show lineage table:
     ```sql
     SELECT * FROM model_training_lineage
     WHERE model_id = 'defect-classifier-v3'
     ```
   - Shows:
     - Training Sheet ID
     - Q&A pair IDs used
     - Training config (hyperparameters)
     - MLflow run ID
     - Timestamp

**Key Talking Points:**
- "Dual quality gates: **Status** (expert approval) + **Usage Constraints** (governance)."
- "Training export is fully auditable—we know exactly which Q&A pairs went into which model."
- "Lineage stored in Delta table—query with SQL, visualize in MLflow."
- "Training job integrates with Foundation Model APIs—native Databricks fine-tuning."

**Value Proposition:**
- **Governance built in:** Compliance constraints enforced automatically
- **Full traceability:** Model → Training Sheet → Q&A pairs → Source data
- **Reproducibility:** Re-run the exact same training job with same data

**Common Questions:**

**Q: "What if I want to use a custom training script?"**
A: "Export Training Sheet as JSONL, use in your own pipeline. Lineage tracking still works if you log to MLflow."

**Q: "How do you handle imbalanced classes?"**
A: "Training Sheet metadata includes class distributions. You can configure oversampling or use weighted loss in training config."

**Q: "Can I train on multiple Training Sheets?"**
A: "Yes—concatenate Training Sheets before export. Lineage tracks all source Training Sheets."

---

### STAGE 5: DEPLOY

**URL:** `http://localhost:5173` → Click "DEPLOY" in pipeline breadcrumb

**What to Show:**
1. **Model Selection**
   - Select trained model: "Defect Classifier v3"
   - Shows metadata:
     - Training Sheet used
     - Training date
     - Base model
     - Accuracy metrics (if eval run exists)
2. **Deployment Modes** (ACE Architecture)
   - **Cloud:** Model Serving endpoint (online inference)
   - **Edge:** Containerized deployment for local gateways
   - **Airgap:** Offline bundle for secure facilities
3. **Cloud Deployment**
   - Click "Deploy to Cloud"
   - Configure:
     - Endpoint name: `defect-classifier-prod`
     - Auto-scaling: Min 1, Max 5 instances
     - GPU type: T4
   - Click "Deploy"
   - Shows deployment progress
4. **Endpoint Testing** (if time permits)
   - After deployment, click "Test Endpoint"
   - Upload test image
   - Shows prediction: `{"defect_type": "inclusion", "severity": "major", "confidence": 0.92}`
5. **Edge/Airgap Deployment** (conceptual)
   - Click "Export for Edge"
   - Downloads model bundle:
     - Model weights
     - Dependencies (requirements.txt)
     - Example store snapshot
     - Deployment manifest
   - "Install on edge gateway or airgap facility—zero internet required."

**Key Talking Points:**
- "ACE architecture: Airgap, Cloud, Edge—same model, three deployment modes."
- "Mirion operates in 86 facilities with varying connectivity:"
  - Cloud-connected: Real-time inference via Model Serving
  - Edge gateways: Local inference with periodic sync
  - Airgap facilities: Fully offline, manual bundle updates
- "Unity Catalog handles model registry and versioning across all environments."
- "Deployment integrates with Model Serving—native Databricks, no custom infrastructure."

**Value Proposition:**
- **Unified deployment:** One model, multiple targets
- **Compliance-ready:** Airgap support for secure facilities
- **Native integration:** Databricks Model Serving, no custom infra

**Common Questions:**

**Q: "How do you handle model updates in airgap facilities?"**
A: "Export new model bundle, transfer via secure media (USB, internal network), install on-prem. Version tracking in local Unity Catalog."

**Q: "Can I deploy to AWS SageMaker or Azure ML?"**
A: "Yes—export model in MLflow format. Compatible with SageMaker, AzureML, Vertex AI. Lineage tracking still works via MLflow."

**Q: "What about A/B testing?"**
A: "Deploy multiple model versions to the same endpoint with traffic splitting. Monitor via MONITOR stage."

---

### STAGE 6: MONITOR

**URL:** `http://localhost:5173` → Click "MONITOR" in pipeline breadcrumb

**What to Show:**
1. **Model Selection**
   - Select deployed model: "Defect Classifier v3"
   - Shows deployment info: Endpoint name, status, last updated
2. **Metrics Dashboard**
   - **Performance Metrics:**
     - Accuracy over time (line chart)
     - Latency (P50, P95, P99)
     - Throughput (requests/sec)
   - **Prediction Distribution:**
     - Defect types (pie chart): Inclusion 45%, Crack 30%, Delamination 15%, Surface 10%
     - Confidence scores (histogram): Most predictions >0.8 confidence
3. **Drift Detection**
   - **Data Drift:** Are incoming images different from training distribution?
     - Alert: "Warning: Input image resolution changed (1024x1024 → 2048x2048)"
   - **Model Drift:** Is model performance degrading?
     - Chart: Accuracy dropped from 89% → 82% over last 7 days
4. **Sample Predictions** (DataTable)
   - Timestamp, Image, Predicted Class, Confidence, True Label (if available)
   - Click on a row to see details:
     - Image preview
     - Model output (JSON)
     - Confidence scores per class
5. **Alerts Configuration** (if time permits)
   - Click "Configure Alerts"
   - Set thresholds:
     - Accuracy drops below 85% → Email alert
     - Latency exceeds 500ms → Slack notification
     - Drift detected → Create JIRA ticket

**Key Talking Points:**
- "Real-time monitoring with Lakehouse Monitoring—built on Delta Live Tables."
- "Drift detection: Are we seeing new defect types not represented in training data?"
- "Feedback loop ready: When users flag bad predictions, we route them to IMPROVE stage."
- "All prediction logs stored in Delta—query with SQL for custom analysis."

**Value Proposition:**
- **Built-in observability:** No separate tools needed
- **Drift detection:** Automatic alerts when model degrades
- **Feedback loops:** Production insights → Retraining

**Common Questions:**

**Q: "How do you handle model explainability?"**
A: "For vision models, we can generate saliency maps (Grad-CAM). For text, we log token probabilities. Explainability features are in roadmap."

**Q: "Can I integrate with external monitoring tools (Datadog, Grafana)?"**
A: "Yes—prediction logs are in Delta. Export metrics via SQL or Databricks REST API. Dashboard embeds work in Grafana/Tableau."

**Q: "What's the latency for drift detection?"**
A: "Near real-time—Lakehouse Monitoring runs on streaming data. Alerts trigger within 1-5 minutes of threshold breach."

---

### STAGE 7: IMPROVE

**URL:** `http://localhost:5173` → Click "IMPROVE" in pipeline breadcrumb

**What to Show:**
1. **Feedback Queue**
   - Shows production feedback items:
     - User-flagged predictions
     - Incorrect classifications
     - Low-confidence predictions (<0.6)
   - DataTable with columns:
     - Timestamp, Image, Model Prediction, User Correction, Status
2. **Gap Analysis**
   - Click "Analyze Gaps"
   - Shows insights:
     ```
     Model Weaknesses:
     - Delamination defects: Only 5 training examples → Add more
     - Surface contamination: 15% false positive rate → Review labels
     - New defect type detected: "Micro-crack" (not in training taxonomy)
     ```
3. **Create New Training Examples**
   - Click on a feedback item
   - Shows image + user correction
   - Options:
     - **Add to Existing Training Sheet:** Append to "Defect Detection - Q&A v1"
     - **Create New Training Sheet:** Start fresh with edge cases
     - **Update Canonical Label:** If source data label was wrong
4. **Retrain Workflow** (if time permits)
   - Click "Add to Training Sheet"
   - Navigate back to LABEL stage → Shows new items in review queue
   - Expert approves corrections
   - Navigate to TRAIN stage → Shows "50 new items added, ready to retrain"
   - Click "Start Training" → Kicks off retraining job
5. **Lineage Tracking**
   - After retraining, show lineage:
     ```sql
     SELECT * FROM model_training_lineage
     WHERE model_name = 'defect-classifier'
     ORDER BY trained_at DESC
     LIMIT 2
     ```
   - Shows v3 (original) and v4 (retrained with feedback)
   - Compare training configs and performance

**Key Talking Points:**
- "Continuous improvement baked in—production feedback automatically suggests what to fix."
- "Gap analysis: Model is weak on delamination → Only 5 training examples → Add more."
- "Lineage tracking: We know which model was trained on which data → Targeted retraining."
- "Feedback loop closes the lifecycle: IMPROVE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE."

**Value Proposition:**
- **Data-driven improvement:** No guesswork—fix actual weaknesses
- **Targeted retraining:** Add examples where model is weak, not random
- **Full lifecycle:** From production feedback to deployed model v2

**Common Questions:**

**Q: "How do you prioritize what to fix first?"**
A: "Feedback items are ranked by impact: High-severity + Frequent → Fix first. Low-frequency edge cases → Backlog."

**Q: "Can I automate retraining?"**
A: "Yes—set triggers: 'When 100 new feedback items approved → Retrain automatically.' Scheduled retraining (e.g., monthly) also supported."

**Q: "What if user feedback is wrong?"**
A: "Expert review before adding to Training Sheet. Flag suspicious feedback for senior expert validation."

---

## Star Features to Highlight {#star-features}

These are the differentiators—make sure to emphasize them in every demo.

### 1. Canonical Labeling Tool - "Label Once, Reuse Everywhere"

**The Innovation:**
- Expert labels source data once
- Labels stored independently of Q&A pairs
- Automatic reuse across all Training Sheets
- **90% reduction in expert time for template iteration**

**When to Show:** LABEL stage (Mode B)

**Talking Points:**
- "Traditional tools: Improve prompt → Re-label everything"
- "VITAL Workbench: Improve prompt → Labels reused automatically"
- "Expert time is Mirion's most valuable resource—we make it go 10x further."

**Wow Moment:**
- Label an image in Canonical Labeling Tool
- Navigate to GENERATE → Generate new Training Sheet
- Show that the labeled item is pre-approved (zero review time)

### 2. Dual Mode Labeling - Two Workflows, One Platform

**The Innovation:**
- **Mode A:** Review Q&A pairs (reactive labeling)
- **Mode B:** Label source data directly (proactive labeling)
- Both create canonical labels for reuse

**When to Show:** LABEL stage

**Talking Points:**
- "Flexible workflows: Label before or during generation—your choice."
- "Proactive: Pre-label key examples for instant reuse."
- "Reactive: Review AI-generated labels and create canonical labels as you go."

**Wow Moment:**
- Show Mode B: Label an image directly
- Show Mode A: Review a Q&A pair → Creates canonical label
- Both labels are reusable across Training Sheets

### 3. Composite Key Architecture - Multiple Labelsets Without Conflicts

**The Innovation:**
- Same source item can have multiple independent labels
- Composite key: `(sheet_id, item_ref, label_type)`
- No conflicts, no overwrites

**When to Show:** Deep dive during LABEL stage

**Talking Points:**
- "Same defect image has:"
  - Classification: "Inclusion"
  - Localization: Bounding box coordinates
  - Severity: "Major"
  - Root cause: "Foreign particle during crystal growth"
- "Four different labelsets, no conflicts."
- "Different experts can label different aspects—collaborative workflows."

**Wow Moment:**
- Show database schema with composite key
- Show UI: Same item has multiple labels in Canonical Labeling Tool

### 4. Multimodal Support - Images + Sensors + Metadata in One Platform

**The Innovation:**
- True multimodal: Visual + sensor + temporal context
- All data stays in Unity Catalog
- One prompt template handles everything

**When to Show:** DATA stage and GENERATE stage

**Talking Points:**
- "Traditional ML: Separate pipelines for images, sensors, documents."
- "With LLMs: Everything converges through prompt templates."
- "Defect classification: Image shows inclusion + Temperature was 5°C high during growth → Likely cause."

**Wow Moment:**
- Show Sheet definition: Image volume + sensor table
- Show generated Q&A pair: Includes image + sensor context + metadata
- "One platform for vision, time series, and documents."

### 5. Dual Quality Gates - Status (Quality) + Usage Constraints (Governance)

**The Innovation:**
- Two orthogonal dimensions: Quality approval vs. compliance
- Same Q&A pair can be high quality but training-prohibited
- Governance layer separate from quality approval

**When to Show:** TRAIN stage

**Talking Points:**
- "Not all high-quality data can be used for training:"
  - PHI/PII: Privacy regulations
  - Proprietary: NDA restrictions
  - Test sets: Data leakage prevention
- "Usage constraints enforce compliance without blocking quality workflows."
- "Expert approves quality, security team sets constraints—no friction."

**Wow Moment:**
- Show Q&A pair with:
  - Status: `labeled` (expert approved)
  - Prohibited uses: `training` (compliance restriction)
  - Allowed uses: `few_shot`, `evaluation`
- "High quality, perfect for testing, but can't be in model weights."

---

## Demo Tips & Tricks {#demo-tips}

### Navigation Shortcuts

- **Keyboard Shortcuts:**
  - `Escape` → Close modal
  - `Alt+T` → Open Templates (planned)
  - `Alt+E` → Open Example Store (planned)
- **Browser Back/Forward:** Works for stage navigation
- **URL Parameters:** `?stage=label&sheetId=xxx` → Jump directly to a stage

### What Impresses Technical Audiences

- **Show the code/schema:** Terminal with SQL, JSON configs
- **Deep links:** Click "View in Unity Catalog" → Opens Databricks workspace
- **Lineage queries:** SQL tracing model → training data
- **Performance:** "This runs on serverless—no cluster management"
- **Integration:** "Native Foundation Model APIs, MLflow, UC—no custom infra"

### What Impresses Executives

- **ROI:** "90% reduction in expert time for template iteration"
- **Scale:** "One template, deployed across 86 facilities"
- **Risk mitigation:** "Complete audit trail from model prediction to source data"
- **Competitive differentiation:** "Templates as IP—reusable across all customers"
- **Time to value:** "From raw data to production model in days, not months"

### Recovery Strategies {#recovery-strategies}

**If something breaks during the demo:**

1. **Backend API error:**
   - Stay calm: "Looks like the backend is restarting—happens in dev mode."
   - Show terminal logs: "See, it's hot reloading after a recent change."
   - Pivot to architecture: "This is running on Databricks Apps—same infra as production."

2. **No data visible:**
   - Check: "Let me verify demo data is loaded."
   - Terminal: `cd scripts && python verify_sheets.py`
   - If missing: "We'll skip this and use screenshots—I'll send you a live demo link after."

3. **Slow page load:**
   - Explain: "We're generating embeddings for 500 images in the background—real data, not mocks."
   - Pivot: "This is why we use Databricks—scale out compute when needed."

4. **Browser console errors:**
   - Ignore non-critical warnings: "That's a dev mode warning—doesn't affect production."
   - If blocking: "Let me switch to a clean browser tab."

5. **Databricks workspace link broken:**
   - Fallback: "The workspace is in a different region—let me show you the schema in the terminal instead."
   - Terminal: `cat schemas/sheets.sql`

### Questions to Ask the Audience (Increase Engagement)

- **Opening:** "How many of you are currently managing ML training data? What's the biggest pain point?"
- **After DATA stage:** "Are you using Unity Catalog today? How do you handle multimodal data?"
- **After LABEL stage:** "Have you faced the 're-label everything' problem when iterating on prompts?"
- **After TRAIN stage:** "How do you handle compliance constraints in training data? (PHI, PII, proprietary)"
- **After DEPLOY stage:** "Do you deploy models to edge devices or airgap environments?"
- **Closing:** "What use case would you like to see mapped to this platform?"

---

## Technical Q&A Prep {#technical-qa-prep}

### Expected Questions and Strong Answers

#### Architecture

**Q: "How does this integrate with existing Databricks workflows?"**
A: "Native integration at every layer:
- **Data:** Unity Catalog tables and volumes (no separate storage)
- **Training:** Foundation Model APIs (no custom training infra)
- **Serving:** Model Serving endpoints (native deployment)
- **Monitoring:** Lakehouse Monitoring (Delta-based observability)
- **Lineage:** MLflow (experiment tracking and model registry)

It's Databricks-native—everything stays in the lakehouse."

**Q: "What's the performance impact of generating 10,000 Q&A pairs?"**
A: "Generation runs as a Databricks Job—scale out to N workers. For 10K pairs:
- Serverless compute: ~5-10 minutes (parallel processing)
- Cost: ~$5-10 (Foundation Model API calls + compute)

Canonical labels enable reuse, so you only generate once—subsequent runs are instant for labeled items."

**Q: "How do you handle version control for templates and Training Sheets?"**
A: "Everything is versioned:
- **Templates:** Semantic versioning (v1.0.0), stored in Delta with history
- **Training Sheets:** Snapshot on generation, linked to template version
- **Canonical Labels:** Version field tracks changes per item
- **Models:** MLflow Model Registry with lineage to Training Sheet versions

Full audit trail—you can reproduce any training run."

#### Databricks Integration

**Q: "Can I use Databricks SQL to query Training Sheets?"**
A: "Yes—Training Sheets are Delta tables. Example queries:
```sql
-- Find all Q&A pairs for a specific defect type
SELECT * FROM qa_pairs
WHERE messages[1].content LIKE '%inclusion%';

-- Compare Training Sheets by size
SELECT name, labeled_pairs, rejected_pairs
FROM training_sheets
ORDER BY labeled_pairs DESC;

-- Model lineage
SELECT m.model_name, ts.name, COUNT(qa.id) AS pairs_used
FROM model_training_lineage m
JOIN training_sheets ts ON ts.id = m.training_sheet_id
JOIN qa_pairs qa ON qa.training_sheet_id = ts.id
WHERE qa.id IN (SELECT EXPLODE(m.qa_pair_ids))
GROUP BY m.model_name, ts.name;
```

It's just SQL—integrate with dashboards, notebooks, workflows."

**Q: "How does Unity Catalog governance apply to Training Sheets?"**
A: "Inheritance:
1. User creates Sheet from UC table → Checks UC permissions
2. Sheet inherits UC tags (PII, PHI, CONFIDENTIAL)
3. Q&A pairs inherit tags from Sheet
4. Usage constraints auto-populated from tags: `PHI` → `prohibited_uses=['training']`
5. Export enforces constraints: Training export excludes prohibited pairs

Governance flows end-to-end—no manual policy enforcement."

**Q: "Can I deploy this as a production Databricks App?"**
A: "Yes—that's the deployment model:
1. Build frontend: `npm run build`
2. Deploy bundle: `databricks bundle deploy -t prod`
3. Databricks Apps serves the UI + backend
4. Uses workspace auth—no separate login
5. Scales automatically with serverless

Same infra as any Databricks App—no custom hosting."

#### ACE Deployment (Airgap, Cloud, Edge)

**Q: "How do airgap deployments work without internet?"**
A: "Export bundle:
1. Model weights (MLflow format)
2. Example Store snapshot (Delta parquet files)
3. Dependencies (requirements.txt + wheels)
4. Deployment manifest (config JSON)

Transfer via secure media (USB, internal network). Install on-prem Unity Catalog + local Model Serving. Inference runs fully offline—no internet required."

**Q: "How do you sync models back from edge devices?"**
A: "Edge gateways periodically sync to cloud (when connectivity allows):
- Prediction logs → Upload to cloud Delta table
- Feedback items → Upload to cloud feedback queue
- Model updates → Download new versions from cloud UC

Sync frequency configurable (hourly, daily, manual)."

**Q: "Can edge devices do local retraining?"**
A: "Not currently—retraining happens in cloud (requires GPU, Foundation Model APIs). Edge devices download pre-trained models. Local fine-tuning is on the roadmap for P2."

#### Security & Compliance

**Q: "How do you prevent data leakage in few-shot examples?"**
A: "Usage constraints:
- Mark sensitive pairs as `prohibited_uses=['few_shot']`
- Example Store only indexes pairs with `'few_shot' IN allowed_uses`
- Runtime retrieval checks constraints before returning examples

Sensitive data never leaves secure training environment."

**Q: "What about GDPR right-to-erasure?"**
A: "Delta Lake supports row-level deletes:
```sql
DELETE FROM canonical_labels WHERE item_ref = 'patient_042.png';
DELETE FROM qa_pairs WHERE item_ref = 'patient_042.png';
```

Lineage tracking: If deleted label was used in Model X, flag for retraining. Models trained on deleted data are marked for deprecation."

**Q: "How do you audit who accessed what data?"**
A: "Unity Catalog audit logs track all access:
- Sheet creation/read/update/delete
- Canonical label creation/modification
- Training Sheet generation
- Model training runs

Query audit logs via SQL—full CRUD history with user IDs and timestamps."

#### Scaling & Performance

**Q: "What's the largest Training Sheet you've tested?"**
A: "Currently tested up to 100K Q&A pairs. Generation time scales linearly with workers:
- 1 worker: ~2 hours
- 10 workers: ~12 minutes
- 100 workers: ~2 minutes (diminishing returns after 50)

Delta Lake handles millions of rows—no practical limit."

**Q: "How do you handle skewed data (99% normal, 1% defects)?"**
A: "Oversampling at training export time:
- Specify target class distribution
- Duplicate minority class examples
- Training Sheet metadata tracks resampling config

Alternative: Use weighted loss in training config (Foundation Model APIs support class weights)."

**Q: "Can I parallelize labeling across multiple experts?"**
A: "Yes—multiple users can label concurrently:
- Canonical Labeling Tool assigns items to users (claim-based)
- Delta Lake ACID transactions prevent conflicts
- Audit trail tracks who labeled what

Conflict resolution: If two experts label the same item, flag for review (consensus workflow in roadmap)."

---

## Closing the Demo

### Executive Audience

"To summarize: VITAL Workbench transforms Mirion's 60 years of expertise into reusable AI assets—templates, labels, and models that scale across 86 facilities. We reduce expert time by 90% through label reuse, ensure compliance with built-in governance, and provide complete audit trails from production predictions back to source data.

Next steps:
1. Schedule a technical deep dive with your data platform team
2. Identify 1-2 priority use cases for proof-of-concept
3. Review deployment architecture (Cloud, Edge, Airgap)

Let's get started."

### Technical Audience

"That's the full lifecycle—DATA to IMPROVE with canonical labels, dual quality gates, and complete lineage. Everything runs natively on Databricks: Unity Catalog for data, Foundation Model APIs for training, Model Serving for deployment, Lakehouse Monitoring for observability.

Next steps:
1. Spin up a FEVM workspace and deploy the app (`./scripts/bootstrap.sh`)
2. Load your own data—we'll help map use cases to the platform
3. Run a pilot: 100-500 labeled examples, train a model, deploy to staging

Questions? Let's dive deeper into any area that interests you."

---

## Appendix: Keyboard Shortcuts & Tips

### UI Shortcuts
- `Escape` → Close modal
- Click pipeline breadcrumb → Navigate between stages
- URL params → `?stage=label&sheetId=xxx` → Direct navigation

### Terminal Commands (Keep Terminal Visible)
```bash
# Start demo
apx dev start

# Verify data
cd scripts && python verify_sheets.py

# Check database
databricks sql --statement "SELECT COUNT(*) FROM mirion_vital.workbench.sheets"

# View logs
tail -f backend/logs/app.log
```

### Browser DevTools (For Technical Audiences)
- Network tab → Show API calls (REST endpoints)
- Console → Show real-time logs (Redux actions, API responses)
- React DevTools → Show component state (WorkflowContext)

---

**You've got this. The product is solid—this guide gives you the confidence and structure to deliver an impressive demo. Good luck!**
