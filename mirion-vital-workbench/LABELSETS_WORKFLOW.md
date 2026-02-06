# Labelsets and Curated QA Pairs Workflow

## Understanding Your Vision

You're describing a workflow with:

1. **Labelsets** - Collections of labels/annotations (possibly reusable across use cases)
2. **Curated QA pairs** - Approved, high-quality examples
3. **Use cases** - Different use case contexts that can share labelsets
4. **Approval steps** - Formal approval/review gates before progressing

This suggests a more **asset-oriented workflow** rather than just linear stages.

---

## Proposed Architecture: Asset-Based Workflow

### Core Assets

```
1. Sheets (Data Sources)
   └─ Unity Catalog tables/volumes
   └─ Canonical label coverage stats

2. Labelsets (Reusable Label Collections)
   └─ Label definitions (classes, schemas)
   └─ Canonical labels (expert-validated examples)
   └─ Can be shared across use cases
   └─ Versioned and governed

3. Templates (Prompt Configs)
   └─ Prompt templates with variables
   └─ Response schemas
   └─ Can be shared across use cases

4. Assemblies (QA Pairs)
   └─ Prompt/response pairs
   └─ Generated from Sheet + Template
   └─ Multiple approval states

5. Curated Datasets (Training-Ready)
   └─ Approved, high-quality QA pairs
   └─ Selected from Assemblies
   └─ Ready for fine-tuning
   └─ Can be shared across models
```

---

## Workflow with Approval Gates

### 1. SHEETS Page - Define Data Sources
**Status:** Draft → Published

**Actions:**
- Create Sheet (point to Unity Catalog)
- Configure multimodal sources
- Preview data
- **Approval Gate:** Publish Sheet (marks as ready)

**Output:** Published Sheet

---

### 2. LABELSETS Page (NEW) - Manage Label Collections
**Status:** Draft → Published

**Purpose:** Create and manage reusable label definitions

**Actions:**
- Create Labelset:
  - Name: "PCB Defect Types"
  - Label classes: solder_bridge, cold_joint, missing_component, etc.
  - Response schema (JSON structure)
  - Usage constraints
- Attach canonical labels to Labelset:
  - Import from existing canonical labels
  - Expert-validated examples
  - Version and governance metadata
- **Approval Gate:** Publish Labelset (marks as ready for use)

**Use Cases:**
- **Manufacturing QA:** "PCB Defect Types" labelset
- **Invoice Processing:** "Invoice Line Items" labelset
- **Medical Imaging:** "Pathology Classifications" labelset

**Output:** Published Labelset (reusable across Assemblies)

---

### 3. TEMPLATES Page - Manage Prompt Templates
**Status:** Draft → Published

**Actions:**
- Create/edit prompt templates
- Reference Labelset for response schema
- Test template with sample data
- **Approval Gate:** Publish Template (marks as production-ready)

**Output:** Published Template

---

### 4. CONFIGURE Page - Attach Assets to Sheet
**Purpose:** Combine Sheet + Template + Labelset

**Actions:**
- Select Published Sheet
- Attach Published Template
- Attach Published Labelset (optional)
- Choose response source mode:
  - Pre-labeled (existing column)
  - AI-generated (use canonical labels from Labelset)
  - Manual (use label classes from Labelset)
- Preview configuration

**Output:** Sheet with TemplateConfig attached, ready to assemble

---

### 5. ASSEMBLE Page - Create QA Pairs
**Status:** Assembling → Ready → Approved

**Purpose:** Generate prompt/response pairs (Assembly)

**Actions:**
- Create Assembly from configured Sheet
- Populate responses:
  - **Pre-labeled:** Map existing column
  - **AI-generated:** Run inference with canonical label lookup
  - **Manual:** Launch annotation interface
- View Assembly statistics:
  - Total rows
  - AI-generated count
  - Canonical reused count
  - Empty count
- **Approval Gate:** Mark Assembly as "Ready for Review"

**Output:** Assembly with populated responses (status: Ready)

---

### 6. REVIEW Page - Verify and Correct
**Status:** Ready → Reviewed → Approved

**Purpose:** Human verification of generated labels

**Actions:**
- Load Assembly marked "Ready for Review"
- Review each QA pair:
  - View prompt + response
  - Correct AI predictions
  - Create canonical labels (adds to Labelset)
  - Flag bad examples
  - Mark as verified
- Assembly statistics update:
  - Human verified count
  - Canonical labels created
  - Flagged count
- **Approval Gate:** Mark Assembly as "Reviewed" (ready for curation)

**Output:** Assembly with verified examples (status: Reviewed)

---

### 7. CURATE Page (NEW) - Select Training Examples
**Status:** Reviewed → Curated → Approved for Training

**Purpose:** Final selection and curation of training-ready examples

**Actions:**
- Load Reviewed Assembly
- Filter and select examples:
  - Exclude flagged examples
  - Include only verified examples
  - Apply quality thresholds (confidence scores)
  - Split train/validation sets (80/20)
  - Set usage constraints (training, validation, testing)
- Create **Curated Dataset** from selected examples:
  - Name: "PCB Defect Detection v1"
  - Source Assembly reference
  - Training examples count
  - Validation examples count
  - Quality metrics
- Preview curated dataset
- **Approval Gate:** Approve for Training

**Output:** Curated Dataset (training-ready, status: Approved)

---

### 8. TRAIN Page - Fine-tune Models
**Actions:**
- Select Approved Curated Dataset
- Configure fine-tuning:
  - Base model
  - Hyperparameters
  - Training/validation split (from Curated Dataset)
- Export to JSONL (only approved examples)
- Start training job
- Monitor training progress

**Output:** Trained model registered to Unity Catalog

---

### 9. DEPLOY, MONITOR, IMPROVE
(Same as before)

---

## Complete Navigation Structure

### Main Workflow Stages

```
📊 Sheets      - Create and manage data sources
📝 Configure   - Attach templates and labelsets to Sheets
🔧 Assemble    - Generate prompt/response pairs
✅ Review      - Verify and correct labels
🎯 Curate      - Select and approve training examples
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

### Asset Management (Side Panel or Tools)

```
📋 Labelsets   - Manage reusable label collections
📝 Templates   - Manage prompt templates
📦 Curated Datasets - Manage training-ready datasets
📚 Examples    - Example store (few-shot)
🧪 DSPy        - Prompt optimization
```

---

## Approval State Machine

### Assembly States
```
Assembling → Ready → Reviewed → Curated → Approved for Training
                ↓
              Failed
```

### Asset States (Labelsets, Templates, Sheets)
```
Draft → Published → Archived
```

### Curated Dataset States
```
Draft → Approved for Training → In Use → Archived
```

---

## Use Case: PCB Defect Detection with Labelsets

### Setup Phase
1. **Labelsets Page:** Create "PCB Defect Types" labelset
   - Define 6 defect classes (solder_bridge, cold_joint, etc.)
   - Attach 30 canonical labels (pre-seeded expert examples)
   - Publish Labelset

2. **Templates Page:** Create "PCB Defect Detection VLM" template
   - Reference "PCB Defect Types" labelset for response schema
   - Publish Template

3. **Sheets Page:** Create Sheet pointing to `pcb_inspection.raw_images`
   - Preview 100 PCB images
   - Publish Sheet

### Execution Phase
4. **Configure Page:** Attach Template + Labelset to Sheet
   - Mode: AI-generated (with canonical label reuse)
   - Preview configuration

5. **Assemble Page:** Create Assembly
   - Run inference: 30% canonical reuse, 70% fresh generation
   - Status: Ready for Review

6. **Review Page:** Verify AI predictions
   - Correct 5 misclassifications
   - Create 5 new canonical labels (added to Labelset)
   - Status: Reviewed

7. **Curate Page:** Select training examples
   - Filter: only verified examples
   - Split: 80 training, 20 validation
   - Create Curated Dataset: "PCB Defect v1"
   - Status: Approved for Training

8. **Train Page:** Fine-tune Florence-2 model
   - Use Curated Dataset "PCB Defect v1"
   - Export 100 approved examples
   - Start training

---

## Benefits of This Workflow

### 1. Reusability
- **Labelsets** can be shared across use cases:
  - "PCB Defect Types" used for multiple PCB models
  - Same labelset for different factories
- **Templates** can be shared:
  - Same prompt template with different models
- **Curated Datasets** can be versioned:
  - v1 → v2 → v3 as quality improves

### 2. Governance
- **Approval gates** ensure quality control
- **Version tracking** for all assets
- **Usage constraints** prevent misuse
- **Audit trail** for compliance

### 3. Canonical Labels
- Stored in **Labelsets** (not just floating in database)
- Versioned with the Labelset
- Reused across multiple Assemblies
- Grow organically through Review/Curate stages

### 4. Separation of Concerns
- **Assemble:** Just create QA pairs (no approval yet)
- **Review:** Human verification (quality gate)
- **Curate:** Final selection (training gate)
- **Train:** Just execute training on approved data

---

## Implementation: What to Build

### New Pages
1. **LabelSetsPage** - Manage label collections
2. **ConfigurePage** - Attach Template + Labelset to Sheet
3. **CuratePage** - Select and approve training examples (separate from Review)

### Modify Existing Pages
1. **CuratePage** → **AssemblePage** (just creates Assemblies)
2. **LabelingJobsPage** → **ReviewPage** (verifies and corrects)
3. **TemplatesPage** - Already exists, just add "Publish" approval

### New Data Model
1. **Labelset** model:
   ```typescript
   {
     id: string
     name: string
     label_classes: LabelClass[]
     response_schema: ResponseSchemaField[]
     canonical_labels: CanonicalLabel[]  // Associated canonical labels
     status: "draft" | "published" | "archived"
     version: string
     created_by: string
     created_at: datetime
   }
   ```

2. **CuratedDataset** model:
   ```typescript
   {
     id: string
     name: string
     assembly_id: string  // Source Assembly
     selected_rows: number[]  // Row indices included
     train_count: number
     val_count: number
     quality_metrics: object
     status: "draft" | "approved" | "in_use" | "archived"
     approved_by: string
     approved_at: datetime
   }
   ```

---

## Simplified Alternative: Keep Current Structure

If you don't want to add Labelsets/Curated Dataset models, you could:

1. **Add approval states to existing Assembly:**
   ```
   Assembly.status: assembling → ready → reviewed → curated → approved
   ```

2. **Store label definitions in TemplateConfig:**
   ```typescript
   TemplateConfig {
     label_classes: LabelClass[]  // Labelset embedded
     response_schema: ResponseSchemaField[]
   }
   ```

3. **Add "Curate" sub-stage to ReviewPage:**
   - Review tab: Verify labels
   - Curate tab: Select final examples
   - Approve button: Marks as approved for training

---

## My Recommendation

**Implement the full Labelsets + Curated Datasets workflow:**

**Navigation:**
```
📊 Sheets      - Create data sources
📝 Configure   - Attach templates/labelsets
🔧 Assemble    - Generate QA pairs
✅ Review      - Verify labels
🎯 Curate      - Approve training examples
🤖 Train       - Fine-tune models
🚀 Deploy, 📈 Monitor, 🔄 Improve
```

**Asset Management Panel:**
```
📋 Labelsets
📝 Templates
📦 Datasets (Curated)
```

This gives you the **reusability, governance, and approval gates** you're looking for.

Does this match your vision? Should I start implementing Labelsets and Curated Datasets?
