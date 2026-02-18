# Multiple Labelsets Per Asset - Design

**Version:** PRD v2.3 (Updated)  
**Date:** 2026-02-05  
**Status:** Design Complete

---

## The Requirement

**Your Insight:** "An asset can have more than one labelset right? The same PDF might be used for more than one purpose."

**Absolutely correct.** The same source item (PDF, image, table row) can serve multiple purposes and therefore needs multiple different labelsets.

---

## The Problem

**Example: Medical Invoice PDF**

`invoice_042.pdf` might be used for:

1. **Entity Extraction** - Extract structured data (patient name, DOB, amounts)
2. **Classification** - Categorize invoice (emergency vs. routine, in-network vs. out-network)
3. **Summarization** - Generate human-readable billing summary
4. **Document Type Detection** - Identify document type (invoice vs. EOB vs. receipt)
5. **Fraud Detection** - Flag suspicious patterns
6. **Compliance Checking** - Verify HIPAA requirements

Each of these is a **different task** requiring **different ground truth labels** from the same source document.

---

## The Solution: Composite Key with `label_type`

### Data Model

**Canonical Labels Table:**
```sql
ontos_ml.workbench.canonical_labels (
  id UUID PRIMARY KEY,
  sheet_id UUID,              -- Which dataset
  item_ref STRING,            -- Which specific item (e.g., "invoice_042.pdf")
  label_type STRING,          -- Which task (e.g., "entity_extraction")
  label_data VARIANT,         -- Expert's ground truth (format varies by label_type)
  confidence STRING,
  notes TEXT,
  allowed_uses ARRAY<STRING>,
  prohibited_uses ARRAY<STRING>,
  usage_reason TEXT,
  data_classification STRING,
  labeled_by STRING,
  labeled_at TIMESTAMP,
  last_modified_by STRING,
  last_modified_at TIMESTAMP,
  version INT,
  created_at TIMESTAMP,
  
  -- Composite unique key: One label per (sheet_id, item_ref, label_type)
  UNIQUE(sheet_id, item_ref, label_type)
)
```

**Key Design Decision:**
- **Composite Key:** `(sheet_id, item_ref, label_type)`
- **Allows:** Multiple labels per item, differentiated by `label_type`
- **Enforces:** One canonical label per item per task type

---

## Complete Example: `invoice_042.pdf`

### Label 1: Entity Extraction

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

### Label 2: Classification

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

### Label 3: Summarization

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

### Label 4: Document Type Detection

```json
{
  "id": "cl-004",
  "sheet_id": "sheet-invoices-001",
  "item_ref": "invoice_042.pdf",
  "label_type": "document_type",
  "label_data": {
    "document_type": "medical_invoice",
    "sub_type": "professional_services",
    "confidence_score": 0.98
  },
  "confidence": "high",
  "labeled_by": "document_analyst@hospital.com",
  "labeled_at": "2026-01-18T11:00:00Z",
  "allowed_uses": ["training", "validation", "few_shot", "testing", "evaluation"],
  "prohibited_uses": [],
  "usage_reason": "Document type metadata - no PHI",
  "data_classification": "internal"
}
```

---

## Key Observations

### Different Ground Truth Formats

Each `label_type` has a different structure for `label_data`:

| label_type | label_data Structure |
|------------|---------------------|
| `entity_extraction` | Object with named fields (patient_name, DOB, etc.) |
| `classification` | Object with category values (urgency, department, etc.) |
| `summarization` | Object with text summary |
| `document_type` | Object with document classification |

### Different Governance Constraints

Each labelset can have **different usage constraints**:

| label_type | Training Allowed? | Reason |
|------------|------------------|---------|
| `entity_extraction` | ❌ No | Contains PHI |
| `classification` | ✅ Yes | No PHI |
| `summarization` | ❌ No | Contains PHI |
| `document_type` | ✅ Yes | No PHI |

### Different Experts

Different specialists can label different aspects:
- Billing expert → Entity extraction, summarization
- Clinical expert → Classification, medical coding
- Document analyst → Document type detection

---

## Workflow: Generate Training Sheets

### Prompt Templates Have `label_type`

Each template specifies what kind of task it performs:

```json
{
  "template_id": "tpl-entity-extraction-001",
  "name": "Medical Invoice Entity Extractor v1",
  "label_type": "entity_extraction",
  "system_prompt": "You are a medical billing expert...",
  "user_prompt_template": "Extract entities from: {invoice_text}",
  "output_schema": {
    "patient_name": "string",
    "patient_dob": "date",
    "insurance_id": "string",
    "procedure_codes": ["string"],
    "total_amount": "number"
  }
}
```

```json
{
  "template_id": "tpl-classification-001",
  "name": "Invoice Classification v1",
  "label_type": "classification",
  "system_prompt": "You are a medical billing classifier...",
  "user_prompt_template": "Classify this invoice: {invoice_text}",
  "output_schema": {
    "urgency": "enum[emergency, urgent, routine]",
    "network_status": "enum[in_network, out_network]",
    "department": "string"
  }
}
```

### Generation Matches by `label_type`

```python
def generate_training_sheet(sheet_id, template_id, mode):
  template = get_template(template_id)
  template_label_type = template.label_type  # e.g., 'entity_extraction'
  
  for item in sheet.get_items():
    # Look up canonical label matching BOTH item_ref AND label_type
    canonical_label = canonical_labels.get(
      sheet_id=sheet_id,
      item_ref=item.ref,
      label_type=template_label_type  # Must match!
    )
    
    if canonical_label:
      # Found matching canonical label - use it
      qa_pair = create_qa_pair_from_canonical(canonical_label)
      qa_pair.status = "labeled"  # Pre-approved
    else:
      # No canonical label for this label_type - generate
      qa_pair = generate_qa_pair(item, template, mode)
      qa_pair.status = "unlabeled"  # Needs review
```

### Example: Multiple Training Sheets from Same Invoice

**Scenario:** Generate 3 different Training Sheets from the same 500 invoices

**Training Sheet 1: Entity Extraction**
```python
template = get_template("entity-extraction-v1")
template.label_type = "entity_extraction"

generate_training_sheet(sheet_id, template)

Result:
- invoice_042.pdf → Has cl-001 (entity_extraction) → Pre-approved ✅
- invoice_043.pdf → No label → Needs review
- invoice_044.pdf → Has label → Pre-approved ✅
- ...
```

**Training Sheet 2: Classification**
```python
template = get_template("classification-v1")
template.label_type = "classification"

generate_training_sheet(sheet_id, template)

Result:
- invoice_042.pdf → Has cl-002 (classification) → Pre-approved ✅
- invoice_043.pdf → No label → Needs review
- invoice_044.pdf → Has label → Pre-approved ✅
- ...
```

**Training Sheet 3: Summarization**
```python
template = get_template("summarization-v1")
template.label_type = "summarization"

generate_training_sheet(sheet_id, template)

Result:
- invoice_042.pdf → Has cl-003 (summarization) → Pre-approved ✅
- invoice_043.pdf → No label → Needs review
- invoice_044.pdf → No label → Needs review
- ...
```

**Key Point:** Same invoice has different labelsets, each reused for its specific task.

---

## UI Design

### Canonical Labeling Tool

**Show Multiple Labelsets Per Item:**

```
┌─────────────────────────────────────────────────────────┐
│ Canonical Labeling Tool                                 │
│ Dataset: Medical Invoices - January 2026                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Invoice: invoice_042.pdf                                │
│                                                          │
│ [PDF Preview]                                           │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Existing Labels:                                    │ │
│ │ ✅ Entity Extraction (labeled 2026-01-15)           │ │
│ │ ✅ Classification (labeled 2026-01-16)              │ │
│ │ ✅ Summarization (labeled 2026-01-17)               │ │
│ │ ⚪ Document Type (not labeled)                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Select Label Type: [Entity Extraction ▼]                │
│                                                          │
│ [Edit Existing Label] [Add New Label Type]              │
└─────────────────────────────────────────────────────────┘
```

**When Adding New Label Type:**

```
┌─────────────────────────────────────────────────────────┐
│ Add New Label Type                                      │
│                                                          │
│ Label Type: [Document Type ▼]                           │
│             (entity_extraction, classification,          │
│              summarization, document_type, fraud, ...)   │
│                                                          │
│ Ground Truth Data:                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Document Type:  [Medical Invoice ▼]                │ │
│ │ Sub Type:       [Professional Services ▼]          │ │
│ │ Confidence:     [0.98                     ]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Save Label] [Cancel]                                   │
└─────────────────────────────────────────────────────────┘
```

### Training Sheet Generation UI

**Show Label Type Matching:**

```
┌─────────────────────────────────────────────────────────┐
│ Generate Training Sheet                                 │
│                                                          │
│ Sheet: Medical Invoices (500 items)                     │
│ Template: Invoice Classification v1                     │
│ Task Type: classification ← Matches canonical labels    │
│                                                          │
│ Canonical Label Coverage:                               │
│ ✅ 350 items have 'classification' labels               │
│ ⚪ 150 items need labeling                              │
│                                                          │
│ Mode: [AI-Generated ▼]                                  │
│                                                          │
│ [Generate] [Cancel]                                     │
└─────────────────────────────────────────────────────────┘

After generation:
┌─────────────────────────────────────────────────────────┐
│ Training Sheet Created: "Invoice Classification"        │
│                                                          │
│ Status:                                                  │
│ ✅ 350 items pre-approved (from canonical labels)       │
│ ⚪ 150 items need review (AI-generated)                 │
│                                                          │
│ [Go to LABEL Stage]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Benefits of Multiple Labelsets

### 1. Multi-Task Learning from Same Data

**One Dataset, Multiple Models:**
```
500 medical invoices (one time collection cost)
    ↓
Entity Extraction Model (PHI-free synthetic training)
Classification Model (train on real data)
Summarization Model (PHI-free synthetic training)
Document Type Model (train on real data)
Fraud Detection Model (train on real data)
```

### 2. Specialized Expert Input

Different experts contribute their domain knowledge:
- **Billing specialists** → Entity extraction, summarization
- **Clinical staff** → Medical classification, coding
- **Document analysts** → Document type detection
- **Compliance officers** → Fraud/compliance checking

### 3. Independent Governance

Each labelset can have different constraints:
```
Entity extraction labels:
  - prohibited_uses: ['training'] (PHI)
  - allowed_uses: ['few_shot', 'evaluation']

Classification labels:
  - allowed_uses: ['training', 'validation', 'few_shot', 'evaluation']
  - prohibited_uses: [] (no PHI)
```

### 4. Incremental Labeling

Label different aspects over time:
```
Week 1: Label entity extraction for 500 invoices
Week 2: Label classification for same 500 invoices
Week 3: Label summarization for same 500 invoices
```

Each week adds new task coverage without re-labeling previous work.

---

## SQL Queries

### Find All Labelsets for an Item

```sql
SELECT label_type, label_data, confidence, labeled_by, labeled_at
FROM canonical_labels
WHERE sheet_id = 'sheet-invoices-001'
  AND item_ref = 'invoice_042.pdf'
ORDER BY labeled_at;
```

### Find Items with Specific Labelset

```sql
SELECT item_ref, label_data, confidence
FROM canonical_labels
WHERE sheet_id = 'sheet-invoices-001'
  AND label_type = 'classification'
  AND confidence = 'high';
```

### Find Items Missing Specific Labelset

```sql
-- All items in sheet
WITH all_items AS (
  SELECT DISTINCT item_ref
  FROM canonical_labels
  WHERE sheet_id = 'sheet-invoices-001'
),
-- Items with classification labels
classified_items AS (
  SELECT item_ref
  FROM canonical_labels
  WHERE sheet_id = 'sheet-invoices-001'
    AND label_type = 'classification'
)
-- Items without classification
SELECT ai.item_ref
FROM all_items ai
LEFT JOIN classified_items ci ON ai.item_ref = ci.item_ref
WHERE ci.item_ref IS NULL;
```

### Coverage Report

```sql
-- How many items have each label_type
SELECT 
  label_type,
  COUNT(DISTINCT item_ref) AS items_labeled,
  AVG(CASE WHEN confidence = 'high' THEN 1.0 ELSE 0.0 END) AS high_confidence_ratio
FROM canonical_labels
WHERE sheet_id = 'sheet-invoices-001'
GROUP BY label_type
ORDER BY items_labeled DESC;
```

---

## Migration Strategy

### Add label_type to Existing Canonical Labels

If you have existing canonical labels without `label_type`:

```sql
-- Infer label_type from template used
UPDATE canonical_labels cl
SET label_type = (
  SELECT t.label_type
  FROM qa_pairs qa
  JOIN training_sheets ts ON ts.id = qa.training_sheet_id
  JOIN templates t ON t.id = ts.template_id
  WHERE qa.canonical_label_id = cl.id
  LIMIT 1
)
WHERE cl.label_type IS NULL;

-- Default to 'entity_extraction' for remaining
UPDATE canonical_labels
SET label_type = 'entity_extraction'
WHERE label_type IS NULL;
```

---

## Conclusion

**Multiple labelsets per asset enables:**

✅ **Multi-task learning** from same data source  
✅ **Specialized expert input** per task type  
✅ **Independent governance** constraints  
✅ **Incremental labeling** over time  
✅ **Label reuse** across different Training Sheets  
✅ **Task-specific ground truth** without redundancy

**Design Decision:** Composite key `(sheet_id, item_ref, label_type)` elegantly supports multiple labelsets while maintaining uniqueness per task type.

The same PDF can serve multiple purposes, and each purpose gets its own canonical label that's independently managed, versioned, and governed.
