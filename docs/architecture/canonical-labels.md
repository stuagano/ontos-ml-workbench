# Canonical Labels Design - "Label Once, Reuse Everywhere"

**Version:** PRD v2.3  
**Date:** 2026-02-05  
**Status:** Design Complete

---

## The Problem

**Your Insight:** "The expert should be able to come into a tool and do her labeling task and save that once so it can be reused anywhere."

**Current Issue (v2.2):**
```
January: Generate Training Sheet v1 (Template v1)
         → Expert labels 500 items (takes 20 hours)

February: Improve prompt template (Template v2)  
          → Generate Training Sheet v2
          → Expert must re-label THE SAME 500 items! (another 20 hours)

March: Refine template again (Template v3)
       → Generate Training Sheet v3
       → Expert re-labels AGAIN! (another 20 hours)

Total: 60 hours of redundant expert time
```

**Root Cause:**  
Labels are stored in Q&A pairs, which are tied to specific Training Sheets. When you generate a new Training Sheet (even from the same source data), the labels don't transfer.

---

## The Solution: Canonical Labels

**Canonical Labels** = Expert ground truth stored **independent** of Q&A pairs and Training Sheets

**Architecture:**
```
Unity Catalog (Source Data)
    ↓
Canonical Labels (Ground Truth) ← Expert labels ONCE
    ↓              ↓              ↓
Training Sheet  Training Sheet  Training Sheet
   (v1)            (v2)            (v3)
```

**With Canonical Labels:**
```
January: Expert labels 500 items ONCE → Creates 500 canonical labels (20 hours)

February: Improve template → Generate Training Sheet v2
          → ALL 500 items pre-approved automatically! (0 hours)

March: Refine template → Generate Training Sheet v3
       → ALL 500 items pre-approved automatically! (0 hours)

Total: 20 hours (vs. 60 hours without canonical labels)
```

---

## Data Model

### New Table: `canonical_labels`

```sql
ontos_ml.workbench.canonical_labels (
  id UUID PRIMARY KEY,
  
  -- Links to source data
  sheet_id UUID,              -- Which dataset
  item_ref STRING,            -- Specific item (e.g., "invoice_042.pdf", "row_123")
  
  -- Expert's ground truth
  label_data VARIANT,         -- JSON with extracted entities, classification, etc.
  label_type STRING,          -- 'entity_extraction', 'classification', 'qa', 'generation'
  confidence STRING,          -- 'high', 'medium', 'low'
  notes TEXT,                 -- Expert's reasoning
  
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
  version INT,                -- Label versioning
  
  created_at TIMESTAMP,
  
  UNIQUE(sheet_id, item_ref, label_type)  -- One canonical label per source item per label type
)
```

### Updated Table: `qa_pairs`

```sql
ontos_ml.workbench.qa_pairs (
  id UUID PRIMARY KEY,
  training_sheet_id UUID,
  item_ref STRING,
  messages ARRAY<STRUCT>,
  
  -- NEW: Link to canonical label
  canonical_label_id UUID,    -- FK to canonical_labels.id
  
  status STRING,              -- unlabeled, labeled, rejected, flagged
  labeling_mode STRING,       -- ai_generated, manual, existing_column, canonical
  ...
)
```

**Key Change:** Q&A pairs now **reference** canonical labels instead of storing labels inline.

---

## Two Labeling Workflows

### Mode A: Label During Training Sheet Review

Expert reviews Q&A pairs in LABEL stage (LIFECYCLE workflow):

**Process:**
1. Expert opens Training Sheet for review
2. Progress shows:
   ```
   150 / 500 labeled
   
   ├─ Pre-approved (from canonical labels): 150
   └─ Needs Review: 350
   ```
3. Expert reviews unlabeled Q&A pairs
4. When expert **Approves or Edits**:
   - Q&A pair status → `labeled`
   - **Creates canonical label** (or updates existing)
   - Links Q&A pair to canonical label

**Code:**
```python
def approve_qa_pair(qa_pair):
  # Create/update canonical label
  canonical_label = upsert_canonical_label(
    sheet_id=qa_pair.sheet_id,
    item_ref=qa_pair.item_ref,
    label_data=qa_pair.messages[1].content,  # Approved response
    labeled_by=current_user
  )
  
  # Link Q&A pair to canonical label
  qa_pair.canonical_label_id = canonical_label.id
  qa_pair.status = "labeled"
  qa_pair.labeling_mode = "canonical"
```

**Benefit:** Labeling work in Training Sheets automatically creates reusable canonical labels.

---

### Mode B: Label Source Data Directly

**New Tool:** Canonical Labeling Tool (TOOLS section)

Expert labels source data **before** generating Q&A pairs:

**Process:**
1. Expert opens Canonical Labeling Tool (TOOLS → Canonical Labeling)
2. Selects Sheet (dataset)
3. Browses source items (PDFs, images, table rows)
4. For each item, provides ground truth label
5. Sets usage constraints (if applicable)
6. Saves canonical label

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
│ Notes: [Verified against original paper invoice]       │
│                                                          │
│ [Save Label] [Skip] [Previous] [Next]                   │
└─────────────────────────────────────────────────────────┘
```

**Benefit:** Pre-label key examples before any Q&A generation. Labels immediately available for reuse.

---

## Q&A Generation with Canonical Label Lookup

**Updated GENERATE Stage Logic:**

```python
def generate_training_sheet(sheet_id, template_id, mode):
  sheet = get_sheet(sheet_id)
  template = get_template(template_id)
  qa_pairs = []
  
  for item in sheet.get_items():
    # CHECK FOR CANONICAL LABEL FIRST (match by label_type from template)
    canonical_label = canonical_labels.get(
      sheet_id=sheet_id,
      item_ref=item.ref,
      label_type=template.label_type  # v2.3: composite key includes label_type
    )
    
    if canonical_label:
      # Expert already labeled this! Use ground truth
      qa_pair = {
        "messages": [
          {"role": "user", "content": template.format(item)},
          {"role": "assistant", "content": canonical_label.label_data}
        ],
        "canonical_label_id": canonical_label.id,
        "status": "labeled",           # Pre-approved!
        "labeling_mode": "canonical",
        "reviewed_by": canonical_label.labeled_by,
        "reviewed_at": canonical_label.labeled_at
      }
    else:
      # No canonical label - generate based on mode
      if mode == "ai_generated":
        ai_response = llm.generate(template.format(item))
        qa_pair = {
          "messages": [...],
          "canonical_label_id": None,
          "status": "unlabeled",       # Needs review
          "labeling_mode": "ai_generated"
        }
      # ... other modes
    
    qa_pairs.append(qa_pair)
  
  return create_training_sheet(qa_pairs)
```

**Result:**
- Items with canonical labels → Pre-approved (`status=labeled`)
- Items without canonical labels → Need review (`status=unlabeled`)

---

## Complete Workflow Example

### Scenario: Medical Invoice Entity Extraction

**Month 1: Initial Labeling**

1. **DATA Stage:** Import 500 invoices to Unity Catalog
2. **Canonical Labeling Tool:**
   - Expert labels 100 representative invoices
   - Creates 100 canonical labels (4 hours)
3. **GENERATE Stage:**
   - Generate Training Sheet v1 (Template v1)
   - 100 items pre-approved (canonical labels)
   - 400 items unlabeled (AI-generated)
4. **LABEL Stage:**
   - Expert reviews 400 unlabeled items
   - Approves/edits → creates 400 more canonical labels (16 hours)
   - Total: 500 canonical labels created
5. **TRAIN:** Export 500 labeled pairs for training

**Total expert time: 20 hours**

---

**Month 2: Template Improvement**

1. **Improve template** (better prompt, clearer instructions)
2. **GENERATE Stage:**
   - Generate Training Sheet v2 (Template v2)
   - ALL 500 items have canonical labels
   - ALL 500 items pre-approved automatically!
3. **LABEL Stage:**
   - 0 items need review
   - Expert time: **0 hours!**
4. **TRAIN:** Export 500 labeled pairs for training

**Total expert time: 0 hours** (vs. 20 hours without canonical labels)

---

**Month 3: Add New Data**

1. **DATA Stage:** Add 200 new invoices
2. **GENERATE Stage:**
   - Generate Training Sheet v3 (Template v2)
   - 500 old items pre-approved (canonical labels)
   - 200 new items unlabeled (AI-generated)
3. **LABEL Stage:**
   - Expert reviews only 200 new items (8 hours)
   - Creates 200 more canonical labels
4. **TRAIN:** Export 700 labeled pairs

**Total expert time: 8 hours** (only for new data)

---

**Total Across 3 Months:**
- **With canonical labels:** 28 hours (20 + 0 + 8)
- **Without canonical labels:** 60 hours (20 + 20 + 20)
- **Time saved:** 32 hours (53% reduction)

---

## Use Cases

### 1. Iterative Template Improvement

**Problem:** Want to experiment with different prompt templates without re-labeling  
**Solution:** Label once, generate multiple Training Sheets with different templates  
**Benefit:** Fast iteration on prompt quality

### 2. Test Set Creation

**Problem:** Need held-out test set that's never seen during training  
**Solution:** Use Canonical Labeling Tool to create test set, mark `prohibited_uses: ['training']`  
**Benefit:** Clean test/train separation, no data leakage

### 3. Pre-Labeling Key Examples

**Problem:** Want to label representative examples before bulk generation  
**Solution:** Use Canonical Labeling Tool to label 100 key items first  
**Benefit:** Immediate quality signal, guide AI generation

### 4. Collaborative Labeling

**Problem:** Multiple experts need to label different subsets  
**Solution:** Experts work independently in Canonical Labeling Tool  
**Benefit:** Parallel labeling, canonical labels aggregate all work

### 5. Cross-Template Consistency

**Problem:** Different models/tasks need consistent ground truth  
**Solution:** Canonical labels shared across multiple Training Sheets/templates  
**Benefit:** Single source of truth, no conflicting labels

---

## Technical Implementation

### Backend API Endpoints

```python
# Canonical Labels
POST   /api/v1/canonical-labels                    # Create label
GET    /api/v1/canonical-labels/{sheet_id}         # List labels for sheet
GET    /api/v1/canonical-labels/{sheet_id}/{item}  # Get specific label
PUT    /api/v1/canonical-labels/{id}               # Update label
DELETE /api/v1/canonical-labels/{id}               # Delete label
GET    /api/v1/sheets/{id}/labeling-progress       # Progress stats

# Q&A Pair approval (creates/updates canonical label)
POST   /api/v1/qa-pairs/{id}/approve                # Approve & create canonical label
POST   /api/v1/qa-pairs/{id}/edit-and-approve       # Edit, approve, create canonical label
```

### Database Indexes

```sql
-- Fast lookup by source item
CREATE INDEX idx_canonical_labels_lookup 
ON canonical_labels(sheet_id, item_ref);

-- Fast lookup for labeling progress
CREATE INDEX idx_canonical_labels_sheet 
ON canonical_labels(sheet_id, labeled_at);

-- Link from Q&A pairs to canonical labels
CREATE INDEX idx_qa_pairs_canonical 
ON qa_pairs(canonical_label_id);
```

### Frontend Components

```typescript
// New page: Canonical Labeling Tool
<CanonicalLabelingTool 
  sheetId={sheetId}
  labelType="entity_extraction"
  onLabelSaved={handleLabelSaved}
/>

// Updated: Training Sheet Review
<TrainingSheetReview 
  trainingSheetId={id}
  onApprove={(qa_pair) => approveAndCreateCanonicalLabel(qa_pair)}
  showCanonicalLabelStatus={true}  // Show which items have canonical labels
/>

// Progress indicator
<LabelingProgress 
  totalItems={500}
  labeledItems={150}
  source="canonical_labels"
/>
```

---

## Benefits Summary

### For Experts
- ✅ **53% time savings** on template iteration
- ✅ Label once, reused everywhere
- ✅ Two flexible workflows (during review or standalone)
- ✅ No redundant work

### For Platform
- ✅ Consistent ground truth across Training Sheets
- ✅ Version control for labels
- ✅ Audit trail (who labeled what, when)
- ✅ Test set creation independent of training

### For Organizations
- ✅ Faster iteration cycles (hours vs. days)
- ✅ Better ROI on expert time
- ✅ Higher quality labels (single source of truth)
- ✅ Compliance-friendly (audit trail, versioning)

---

## Migration from v2.2 to v2.3

### For Existing Training Sheets

**Option A: Backfill Canonical Labels**
```sql
-- Extract canonical labels from existing Q&A pairs
INSERT INTO canonical_labels (sheet_id, item_ref, label_data, labeled_by, labeled_at)
SELECT 
  ts.sheet_id,
  qa.item_ref,
  qa.messages[1].content AS label_data,
  qa.reviewed_by AS labeled_by,
  qa.reviewed_at AS labeled_at
FROM qa_pairs qa
JOIN training_sheets ts ON ts.id = qa.training_sheet_id
WHERE qa.status = 'labeled'
  AND qa.item_ref IS NOT NULL
ON CONFLICT (sheet_id, item_ref) DO NOTHING;  -- Keep first label only

-- Link Q&A pairs to canonical labels
UPDATE qa_pairs qa
SET canonical_label_id = cl.id
FROM canonical_labels cl
WHERE qa.item_ref = cl.item_ref
  AND qa.training_sheet_id IN (
    SELECT id FROM training_sheets WHERE sheet_id = cl.sheet_id
  );
```

**Option B: Fresh Start**
- New Training Sheets use canonical labels
- Old Training Sheets continue as-is
- Gradually migrate as data is re-labeled

---

## Next Steps

1. **Backend Implementation**
   - [x] Create `canonical_labels` table (`schemas/04_canonical_labels.sql`)
   - [x] Add `canonical_label_id` to `qa_pairs` (`schemas/06_qa_pairs.sql`)
   - [x] Implement canonical label CRUD APIs (13 endpoints under `/api/v1/canonical-labels`)
   - [x] Update Q&A generation logic (canonical label lookup with coverage stats)
   - [x] Update approval logic (create canonical label on approve/edit)

2. **Frontend Implementation**
   - [x] Build Canonical Labeling Tool page (`CanonicalLabelingTool.tsx`)
   - [x] Add canonical label indicators to Training Sheet review (coverage banner in SheetBuilder)
   - [x] Show labeling progress with canonical label stats
   - [x] Label version history UI (`LabelVersionHistory.tsx`)
   - [ ] Export canonical labels as JSONL (not yet implemented)

3. **Testing**
   - [ ] Test label reuse across Training Sheets
   - [ ] Test two labeling workflows
   - [ ] Validate performance with 10k+ labels
   - [ ] Test migration from v2.2

4. **Documentation**
   - [ ] User guide for Canonical Labeling Tool
   - [ ] Best practices for labeling workflow
   - [ ] Migration guide for existing data

---

## Conclusion

**Canonical Labels solve the core problem:** "Expert should label once, reuse everywhere."

This design enables:
- ✅ 53% time savings on template iteration
- ✅ Consistent ground truth across all Training Sheets
- ✅ Flexible labeling workflows (standalone or integrated)
- ✅ Test set creation independent of training
- ✅ Version control and audit trail

**Impact:** Transforms labeling from a repetitive bottleneck into a one-time investment that compounds value across iterations.
