# Usage Constraints & Data Governance Design

**Version:** PRD v2.2  
**Date:** 2026-02-05  
**Status:** Design Complete

---

## The Problem

In regulated industries (healthcare, finance, legal), data can be:
- ✅ High quality and expert-approved
- ❌ But legally prohibited from certain uses

**Example:** Mammogram with patient health information (PHI)
- Expert radiologist approves accuracy
- HIPAA prohibits storing PHI in model weights (training)
- But CAN show as few-shot example (ephemeral, not persisted)

**Previous design only had:** `status` (unlabeled/labeled/rejected)  
**Missing:** Governance rules about what approved data can be used for

---

## The Solution: Two Orthogonal Dimensions

### Dimension 1: Status (Quality Gate)
**Question:** Is this data correct and approved?

| Value | Meaning |
|-------|---------|
| `unlabeled` | Pending expert review |
| `labeled` | Approved, ready for use |
| `rejected` | Incorrect, excluded |
| `flagged` | Needs additional review |

### Dimension 2: Usage Constraints (Governance)
**Question:** What can this approved data be used for?

| Field | Type | Purpose |
|-------|------|---------|
| `allowed_uses` | ARRAY<STRING> | Permitted usage types |
| `prohibited_uses` | ARRAY<STRING> | Explicitly forbidden uses |
| `usage_reason` | TEXT | Compliance/business justification |
| `data_classification` | STRING | public, internal, confidential, restricted |

---

## Usage Types

| Type | Persistence | Description |
|------|-------------|-------------|
| **`training`** | Permanent | Embedded in model weights via fine-tuning |
| **`validation`** | Permanent | Used in train/val split, influences training |
| **`evaluation`** | Temporary | Benchmark scoring, not stored |
| **`few_shot`** | Ephemeral | Shown at inference, then discarded |
| **`testing`** | Temporary | Human QA/inspection only |

---

## Real-World Scenarios

### Scenario 1: Mammogram with PHI (Healthcare/HIPAA)

**Data:** Patient mammogram image with diagnosis  
**Status:** `labeled` (expert radiologist approved)  
**Constraints:**
```json
{
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Contains identifiable patient data (PHI) - HIPAA compliance prohibits storing in model weights",
  "data_classification": "restricted"
}
```

**What This Enables:**
- ✅ Show as few-shot example to guide model at inference
- ✅ Use for manual testing by radiologists
- ✅ Use for evaluation (measuring model accuracy)
- ❌ Cannot fine-tune model with this data
- ❌ Cannot use in validation set

**Why:** HIPAA allows temporary use (few-shot, eval) but prohibits permanent storage in model weights.

---

### Scenario 2: Synthetic Training Data (No Restrictions)

**Data:** AI-generated synthetic examples  
**Status:** `labeled`  
**Constraints:**
```json
{
  "allowed_uses": ["training", "validation", "evaluation", "few_shot", "testing"],
  "prohibited_uses": [],
  "usage_reason": "Synthetic data generated for training - no restrictions",
  "data_classification": "internal"
}
```

**What This Enables:**
- ✅ Use everywhere without limitations

---

### Scenario 3: Proprietary Client Data (NDA/Confidentiality)

**Data:** Client trade secrets, IP, confidential business data  
**Status:** `labeled`  
**Constraints:**
```json
{
  "allowed_uses": ["training", "validation"],
  "prohibited_uses": ["few_shot", "evaluation"],
  "usage_reason": "Client NDA - cannot expose in runtime examples that might be logged or traced",
  "data_classification": "confidential"
}
```

**What This Enables:**
- ✅ Fine-tune model (weights are protected, not exposed)
- ✅ Use in validation set (stays in secure pipeline)
- ❌ Cannot show as few-shot example (might leak in agent traces)
- ❌ Cannot use in public benchmarks

**Why:** Model weights are secure, but runtime examples can leak in logs/traces.

---

### Scenario 4: Test Set (Data Hygiene)

**Data:** Held-out test set for final evaluation  
**Status:** `labeled`  
**Constraints:**
```json
{
  "allowed_uses": ["evaluation", "testing"],
  "prohibited_uses": ["training", "validation", "few_shot"],
  "usage_reason": "Held-out test set - must not be seen during training to prevent data leakage",
  "data_classification": "internal"
}
```

**What This Enables:**
- ✅ Use for final evaluation
- ✅ Use for manual testing
- ❌ Cannot train on this data (data leakage)
- ❌ Cannot show as few-shot (would contaminate results)

**Why:** Maintaining clean train/test split prevents overfitting.

---

## Enforcement Points

### TRAIN Stage (Export to Training Sheet)

**Code:**
```python
# Apply dual quality gates
training_pairs = qa_pairs.filter(
  # Quality gate: expert approved
  (col('status') == 'labeled') &
  
  # Governance gate: allowed for training
  (array_contains(col('allowed_uses'), 'training')) &
  (~array_contains(col('prohibited_uses'), 'training'))
)
```

**UI:**
```
Export Summary:
✅ Total Labeled: 100
✅ Training Allowed: 85
⚠️  Training Prohibited: 15

Exclusion Reasons:
- 12 pairs contain PHI (HIPAA compliance)
- 3 pairs are test set (data hygiene)
```

---

### Example Store (Runtime Few-Shot)

**Code:**
```python
# Only sync approved few-shot examples
few_shot_examples = qa_pairs.filter(
  (col('status') == 'labeled') &
  (array_contains(col('allowed_uses'), 'few_shot')) &
  (~array_contains(col('prohibited_uses'), 'few_shot'))
)
```

**Behavior:**
- Automatically syncs when status changes to `labeled`
- Respects usage constraints
- Excludes PHI, NDA, test set data

---

### Evaluation Harness

**Code:**
```python
# Filter for evaluation-allowed pairs
eval_pairs = qa_pairs.filter(
  (col('status') == 'labeled') &
  (array_contains(col('allowed_uses'), 'evaluation')) &
  (~array_contains(col('prohibited_uses'), 'evaluation'))
)
```

---

## Unity Catalog Integration

Usage constraints can be **automatically inherited** from source table tags:

```python
from databricks.sdk import WorkspaceClient

# Get source table tags
source_table = catalog.get_table('ontos_ml.raw.patient_scans')
tags = source_table.tags

# Auto-populate usage constraints
if 'PII' in tags or 'PHI' in tags:
  qa_pair.prohibited_uses.append('training')
  qa_pair.prohibited_uses.append('validation')
  qa_pair.data_classification = 'restricted'
  qa_pair.usage_reason = f"Source table tagged with {tags} - compliance restriction"
  
if 'CONFIDENTIAL' in tags:
  qa_pair.prohibited_uses.extend(['few_shot', 'evaluation'])
  qa_pair.allowed_uses = ['training', 'validation']
  qa_pair.data_classification = 'confidential'
  qa_pair.usage_reason = "Confidential data - secure pipeline only"
```

**Benefits:**
- Inherit governance rules from source data
- Consistent with existing Unity Catalog governance
- Reduces manual configuration
- Audit trail from source to model

---

## UI/UX Design

### LABEL Stage (Review UI)

**Badges on Q&A Pairs:**
- 🟢 "All Uses Allowed"
- 🟡 "Training Prohibited - PHI"
- 🔴 "Restricted - Manual Testing Only"
- 🔒 "Confidential - NDA"

**Constraint Editor:**
```
Usage Constraints:
✅ Few-Shot Examples
✅ Manual Testing
✅ Evaluation
❌ Training (prohibited)
❌ Validation (prohibited)

Reason: Contains PHI - HIPAA compliance
Classification: Restricted
```

**Expert Actions:**
- View constraints during review
- Modify constraints if needed
- Add justification for changes

---

### TRAIN Stage (Export)

**Before Export:**
```
Training Sheet Export Summary

Total Q&A Pairs: 100
├─ Approved (labeled): 85
│  ├─ Training Allowed: 70
│  └─ Training Prohibited: 15
│     ├─ PHI/HIPAA: 12 pairs
│     └─ Test Set: 3 pairs
└─ Not Approved: 15
   ├─ Unlabeled: 10
   └─ Rejected: 5

Export will include: 70 pairs
```

**After Export:**
```
✅ Training data exported: 70 pairs
📊 JSONL file: training_sheet_123.jsonl
📝 Only approved, training-allowed pairs included
🔒 15 pairs excluded due to compliance restrictions
```

---

## Audit Trail

All usage constraint changes are logged:

```sql
ontos_ml.workbench.usage_constraint_audit (
  id, qa_pair_id,
  old_allowed_uses ARRAY<STRING>,
  new_allowed_uses ARRAY<STRING>,
  old_prohibited_uses ARRAY<STRING>,
  new_prohibited_uses ARRAY<STRING>,
  old_data_classification STRING,
  new_data_classification STRING,
  reason TEXT,
  modified_by, modified_at
)
```

**Example Queries:**

```sql
-- Who changed this pair's constraints?
SELECT * FROM usage_constraint_audit 
WHERE qa_pair_id = 'qa-123' 
ORDER BY modified_at DESC;

-- What constraints were changed today?
SELECT qa_pair_id, old_prohibited_uses, new_prohibited_uses, reason
FROM usage_constraint_audit
WHERE DATE(modified_at) = CURRENT_DATE();

-- Find pairs that had training prohibited
SELECT * FROM usage_constraint_audit
WHERE NOT array_contains(old_prohibited_uses, 'training')
  AND array_contains(new_prohibited_uses, 'training');
```

---

## Migration Path

### For Existing Q&A Pairs

**Default values for existing data:**
```sql
UPDATE ontos_ml.workbench.qa_pairs
SET 
  allowed_uses = ['training', 'validation', 'evaluation', 'few_shot', 'testing'],
  prohibited_uses = [],
  usage_reason = 'Legacy data - no restrictions applied',
  data_classification = 'internal'
WHERE allowed_uses IS NULL;
```

**For PHI-tagged tables:**
```sql
-- Auto-detect and restrict PHI data
UPDATE ontos_ml.workbench.qa_pairs qa
SET 
  prohibited_uses = ['training', 'validation'],
  allowed_uses = ['few_shot', 'testing', 'evaluation'],
  usage_reason = 'Contains PHI - HIPAA compliance',
  data_classification = 'restricted'
WHERE qa.training_sheet_id IN (
  SELECT ts.id 
  FROM ontos_ml.workbench.training_sheets ts
  JOIN ontos_ml.workbench.sheets s ON s.id = ts.sheet_id
  WHERE s.uc_table_name IN (
    SELECT table_name 
    FROM system.information_schema.table_tags
    WHERE tag_name IN ('PII', 'PHI')
  )
);
```

---

## Benefits

### For Healthcare/Life Sciences
- ✅ HIPAA compliant - PHI not stored in model weights
- ✅ Can still use PHI for few-shot examples (ephemeral)
- ✅ Can measure accuracy on real patient data (evaluation)
- ✅ Audit trail for compliance

### For Financial Services
- ✅ PCI DSS compliant - cardholder data restrictions
- ✅ SOC 2 compliant - data classification tracking
- ✅ Separate production training from testing

### For Legal/Confidential Data
- ✅ NDA enforcement - no client data in examples/logs
- ✅ Trade secret protection - secure pipeline only
- ✅ Audit who accessed what data

### For Data Hygiene
- ✅ Prevent test set contamination
- ✅ Separate train/eval/test properly
- ✅ Track data provenance

---

## Implementation Checklist

### Backend
- [x] Add fields to `qa_pairs` table (`schemas/06_qa_pairs.sql` — `allowed_uses`, `prohibited_uses`, `usage_reason`, `data_classification`)
- [ ] Create `usage_constraint_audit` table (not yet implemented)
- [x] Update Q&A pair creation to set default constraints
- [ ] Add Unity Catalog tag detection (auto-detect PII/PHI tags)
- [x] Update TRAIN export filter (dual gates — status + governance)
- [ ] Update Example Store sync filter (respects usage constraints)
- [ ] Add constraint validation API

### Frontend
- [x] Add constraint indicators in Q&A pair list (backend model supports it)
- [ ] Add constraint editor UI (no dedicated UI yet)
- [ ] Show export summary with exclusion reasons
- [ ] Add constraint badges in LABEL stage
- [ ] Add audit trail viewer

### Documentation
- [x] PRD updated with usage constraints section
- [x] Real-world examples documented
- [x] Enforcement points defined
- [x] Migration path documented

---

## Next Steps

1. **Review with stakeholders** - Validate scenarios with healthcare/compliance teams
2. **Prototype UI** - Build constraint editor and badges
3. **Backend implementation** - Add fields, filters, audit trail
4. **Unity Catalog integration** - Auto-detect PII/PHI tags
5. **Testing** - Verify dual gates work correctly
6. **Documentation** - User guide for governance features
