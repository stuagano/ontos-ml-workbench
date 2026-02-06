# Use Case Validation: Entity Extraction from PDFs

**Validation Date:** 2026-02-05  
**PRD Version:** v2.2  
**Status:** ✅ Validated - Data Model Supports Use Case

---

## Use Case Overview

**Goal:** Extract structured entities from medical invoice PDFs with human-in-the-loop validation

**Domain:** Healthcare billing / Medical records  
**Data Type:** PDF documents with patient health information (PHI)  
**Compliance:** HIPAA - PHI cannot be stored in model weights  

**Entities to Extract:**
- Patient demographics (name, DOB, insurance ID)
- Procedure codes and descriptions
- Billing amounts and payment details
- Provider information

---

## End-to-End Workflow

### Stage 1: DATA (Import PDFs)

**Source:**
```
Unity Catalog Volume: /Volumes/mirion_vital/raw/medical_invoices/
  ├── invoice_001.pdf
  ├── invoice_002.pdf
  └── ... (500 invoices)
  
Table: mirion_vital.raw.parsed_invoices
  - file_path: STRING
  - page_num: INT
  - extracted_text: STRING (from OCR)
  - extracted_images: BINARY
  - parsing_confidence: FLOAT
  
Tags: PHI, PATIENT_DATA, BILLING
```

**Sheet Creation:**
```sql
INSERT INTO mirion_vital.workbench.sheets (
  id, name, uc_catalog, uc_schema, uc_table_name, uc_volume_path,
  item_count, sheet_type
) VALUES (
  'sheet-invoices-001',
  'Medical Invoices - January 2026',
  'mirion_vital', 'raw', 'parsed_invoices',
  '/Volumes/mirion_vital/raw/medical_invoices',
  500,
  'pdf_extraction'
);
```

**✅ Validation:** Sheet successfully points to Unity Catalog table with PDF data

---

### Stage 2: GENERATE (AI-Generated Extractions)

**Prompt Template:**
```json
{
  "template_id": "entity-extraction-medical-invoice",
  "name": "Medical Invoice Entity Extraction",
  "system_prompt": "You are a medical billing expert. Extract structured entities from invoice text.",
  "user_prompt_template": "Extract the following entities:\n{extracted_text}\n\nReturn JSON: patient_name, patient_dob, insurance_id, procedure_codes[], total_amount, provider_name",
  "output_schema": {
    "patient_name": "string",
    "patient_dob": "date",
    "insurance_id": "string",
    "procedure_codes": ["string"],
    "total_amount": "number",
    "provider_name": "string"
  }
}
```

**Labeling Mode:** AI-Generated (LLM extracts entities automatically)

**Q&A Pair Generation:**
```python
for invoice in sheet.get_items():
  # AI generates extraction
  ai_response = llm.generate(
    template.format(extracted_text=invoice.extracted_text)
  )
  
  # Create Q&A pair
  qa_pair = {
    "id": f"qa-{invoice.file_path}",
    "training_sheet_id": "ts-001",
    "item_ref": invoice.file_path,  # Links back to PDF
    
    "messages": [
      {
        "role": "user",
        "content": f"Extract entities from: {invoice.extracted_text}",
        "attachments": [{"type": "pdf", "uc_path": invoice.file_path}]
      },
      {
        "role": "assistant",
        "content": ai_response  # JSON with extracted entities
      }
    ],
    
    # Quality gate - needs expert review
    "status": "unlabeled",
    "labeling_mode": "ai_generated",
    "ai_confidence": 0.87,
    
    # Governance - auto-inherited from table tags
    "allowed_uses": ["few_shot", "testing", "evaluation"],
    "prohibited_uses": ["training", "validation"],
    "usage_reason": "Contains PHI - HIPAA compliance prohibits storing in model weights",
    "data_classification": "restricted"
  }
```

**Training Sheet:**
```sql
INSERT INTO training_sheets (
  id, name, sheet_id, template_id,
  total_pairs, labeled_pairs, unlabeled_pairs,
  labeling_mode
) VALUES (
  'ts-001',
  'Medical Invoices - January 2026 Extractions',
  'sheet-invoices-001',
  'entity-extraction-medical-invoice',
  500, 0, 500,  -- All unlabeled
  'ai_generated'
);
```

**✅ Validation:** 
- Q&A pairs created with PDF reference (`item_ref`)
- AI extractions marked `unlabeled` (require review)
- Usage constraints auto-inherited from Unity Catalog tags
- Governance prohibits training on PHI

---

### Stage 3: LABEL (Human-in-the-Loop Review)

**Expert Reviewer:** Medical billing specialist

**UI Display:**
```
┌─────────────────────────────────────────────────┐
│ Training Sheet: Medical Invoices - Jan 2026    │
│ Progress: 0 / 500 labeled                       │
│                                                  │
│ ⚠️  Usage Constraints:                          │
│ ❌ Training Prohibited (PHI - HIPAA)            │
│ ✅ Allowed: Few-Shot, Testing, Evaluation       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Invoice: invoice_042.pdf                        │
│                                                  │
│ [PDF Preview]                                   │
│                                                  │
│ AI-Generated Extraction (Confidence: 87%)       │
│ {                                               │
│   "patient_name": "Jane Smith",                 │
│   "patient_dob": "1985-03-15",                  │
│   "insurance_id": "BC12345678",                 │
│   "procedure_codes": ["99213", "87426"],        │
│   "total_amount": 285.50,                       │
│   "provider_name": "City Medical Center"        │
│ }                                               │
│                                                  │
│ [✓ Approve] [✏️ Edit] [✗ Reject] [🚩 Flag]     │
└─────────────────────────────────────────────────┘
```

**Review Actions:**

**Scenario A: Correct Extraction (85% of cases)**
```python
# Expert clicks "Approve"
qa_pair.status = "labeled"
qa_pair.reviewed_by = "expert@hospital.com"
qa_pair.reviewed_at = datetime.now()
```

**Scenario B: Incorrect Extraction (10% of cases)**
```python
# Expert clicks "Edit" → corrects JSON → clicks "Approve"
qa_pair.messages[1].content = corrected_json  # Stores correction
qa_pair.status = "labeled"
qa_pair.review_notes = "Corrected patient middle initial"
```

**Scenario C: Unusable (3% of cases)**
```python
# Expert clicks "Reject" (e.g., PDF parsing failed)
qa_pair.status = "rejected"
qa_pair.review_notes = "OCR failed - illegible scan"
```

**Scenario D: Uncertain (2% of cases)**
```python
# Expert clicks "Flag" for senior reviewer
qa_pair.status = "flagged"
qa_pair.review_notes = "Ambiguous procedure code - need clinical review"
```

**After Review:**
```sql
UPDATE training_sheets SET
  labeled_pairs = 450,
  rejected_pairs = 30,
  flagged_pairs = 20,
  unlabeled_pairs = 0
WHERE id = 'ts-001';
```

**✅ Validation:**
- Human-in-the-loop workflow fully supported
- Expert can approve/edit/reject/flag
- Corrected extractions stored in `messages` array
- Progress tracking works
- Usage constraints visible during review

---

### Stage 4: TRAIN (Attempt Export)

**Export Filter (Dual Quality Gates):**
```python
training_pairs = qa_pairs.filter(
  # Gate 1: Quality - expert approved
  (col('status') == 'labeled') &
  
  # Gate 2: Governance - training allowed
  (array_contains(col('allowed_uses'), 'training')) &
  (~array_contains(col('prohibited_uses'), 'training'))
)

# Result: 0 pairs (PHI prohibited from training)
```

**UI Shows:**
```
❌ Export Blocked

Export Summary:
  Total Q&A Pairs: 500
  ├─ Approved (labeled): 450
  │  ├─ Training Allowed: 0
  │  └─ Training Prohibited: 450 (PHI - HIPAA)
  ├─ Rejected: 30
  └─ Flagged: 20

Cannot export training data - all pairs contain PHI.

💡 Recommendations:
  1. Create synthetic training data
  2. Use de-identified examples
  3. Use real PHI for evaluation only
```

**✅ Validation:** Governance correctly blocks PHI from training export

**Alternative: Train on Synthetic Data**

Create separate Training Sheet:
```sql
-- Synthetic invoices (no PHI)
INSERT INTO sheets VALUES (
  'sheet-synthetic-invoices',
  'Synthetic Medical Invoices',
  'synthetic_invoices',
  1000
);

-- Generate Q&A pairs from synthetic data
-- Usage constraints: all uses allowed
INSERT INTO qa_pairs (
  ...
  "allowed_uses": ["training", "validation", "evaluation", "few_shot", "testing"],
  "prohibited_uses": [],
  "usage_reason": "Synthetic data - no PHI",
  "data_classification": "internal"
);
```

**Export from Synthetic Training Sheet:**
```python
# Now export works!
training_pairs = synthetic_ts.qa_pairs.filter(
  (col('status') == 'labeled') &
  (array_contains(col('allowed_uses'), 'training'))
)
# Result: 1000 pairs ✅

# Export to JSONL for FMAPI
export_to_jsonl(training_pairs, "synthetic_invoices_train.jsonl")
```

**Fine-Tune Model:**
```python
# Foundation Model API training
fmapi_job = foundation_model_api.fine_tune(
  base_model="meta-llama/Llama-3-8B-Instruct",
  training_data="synthetic_invoices_train.jsonl",
  task="entity_extraction"
)

# Register model
uc_model = register_model(
  name="invoice-entity-extractor",
  version=1,
  model_uri=fmapi_job.model_uri
)

# Record lineage
INSERT INTO model_training_lineage (
  model_id = uc_model.id,
  training_sheet_id = 'ts-synthetic-001',
  qa_pair_ids = [list of 1000 synthetic pair IDs],
  train_pair_count = 800,
  val_pair_count = 200
);
```

**✅ Validation:** Can train on synthetic data while keeping PHI for evaluation

---

### Stage 5: DEPLOY (Runtime with Few-Shot Examples)

**Model Deployed:**
```python
# Create serving endpoint
endpoint = create_serving_endpoint(
  name="invoice-extractor",
  model_name="invoice-entity-extractor",
  model_version=1
)
```

**Runtime Inference with Few-Shot Examples:**

**Example Store Population:**
```python
# Sync approved PHI examples to Example Store
# (allowed for few_shot even though training prohibited)
example_store.sync_from_training_sheet(
  training_sheet_id='ts-001',
  filters={
    "status": "labeled",
    "allowed_uses": ["few_shot"]  # PHI examples allowed!
  }
)
# Result: 450 real PHI examples in Example Store
```

**Inference Request:**
```python
# New invoice arrives
new_invoice_text = parse_pdf("invoice_501.pdf")

# Retrieve few-shot examples (real PHI)
few_shot_examples = example_store.query(
  input_query=new_invoice_text,
  filters={"domain": "medical_invoices"},
  limit=3
)

# Build prompt with few-shot examples
prompt = f"""
You are extracting entities from medical invoices.

Example 1 (similar invoice):
Input: {few_shot_examples[0].input}
Output: {few_shot_examples[0].expected_output}

Example 2 (similar invoice):
Input: {few_shot_examples[1].input}
Output: {few_shot_examples[1].expected_output}

Example 3 (similar invoice):
Input: {few_shot_examples[2].input}
Output: {few_shot_examples[2].expected_output}

Now extract from this new invoice:
{new_invoice_text}
"""

# Call fine-tuned model with few-shot context
response = endpoint.predict(prompt)
```

**✅ Validation:**
- PHI examples used for few-shot (ephemeral) ✅
- Model trained on synthetic data ✅
- Best of both worlds: safe training + real examples at runtime

---

### Stage 6: MONITOR

**Feedback Collection:**
```sql
-- User reports incorrect extraction
INSERT INTO feedback (
  model_id = 'invoice-entity-extractor-v1',
  endpoint_name = 'invoice-extractor',
  request_id = 'req-12345',
  feedback_type = 'correction',
  correction = '{"patient_name": "Jane R. Smith"}',  -- Corrected
  
  -- Lineage trace-back
  training_sheet_id = 'ts-001',
  qa_pair_id = 'qa-invoice-042'
);
```

**✅ Validation:** Feedback traces back to Training Sheet and specific Q&A pair

---

### Stage 7: IMPROVE

**Improvement Loop:**
1. Collect production corrections
2. Add to Training Sheet as new Q&A pairs (status: unlabeled)
3. Expert reviews and approves corrections
4. Update Example Store with corrected examples
5. Optionally re-train model on expanded synthetic dataset

```python
# Add correction to Training Sheet
INSERT INTO qa_pairs (
  training_sheet_id = 'ts-001',
  item_ref = 'invoice-042',
  messages = [...],  # With corrected extraction
  status = 'unlabeled',  # Needs review
  labeling_mode = 'manual'  # Human provided correction
);

# Expert reviews and approves
UPDATE qa_pairs 
SET status = 'labeled' 
WHERE id = 'qa-invoice-042-corrected';

# Auto-sync to Example Store
example_store.sync_updates();
```

**✅ Validation:** Continuous improvement loop works

---

## Data Model Validation Summary

### ✅ Fully Supported

1. **PDF Input + Structured Output**
   - `item_ref` links to PDF in Unity Catalog Volume
   - `messages` array stores extracted JSON entities
   
2. **AI-Generated Extractions**
   - `labeling_mode = ai_generated`
   - `status = unlabeled` requires human review
   
3. **Human-in-the-Loop Labeling**
   - Expert can approve/edit/reject/flag
   - Stores corrections in messages array
   - Tracks who reviewed and when
   
4. **PHI Compliance (HIPAA)**
   - Usage constraints prevent training on PHI
   - PHI allowed for few-shot (ephemeral)
   - Auto-inherited from Unity Catalog tags
   
5. **Dual Quality Gates**
   - Status gate: expert approval
   - Governance gate: usage constraints
   - Both must pass for training export
   
6. **Train on Synthetic, Evaluate on Real**
   - Separate Training Sheets with different constraints
   - Synthetic data: training allowed
   - Real PHI: evaluation only
   
7. **Few-Shot with Real PHI**
   - Example Store syncs PHI examples
   - Used at runtime (ephemeral)
   - Improves accuracy without training on PHI
   
8. **Feedback Loop**
   - Production corrections trace back to source
   - Continuous improvement cycle

---

## Minor Enhancements Identified

### 1. Support for PDF/Image Attachments

**Current:** `messages` array assumes text  
**Enhancement:** Add attachments field for PDFs/images

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Extract entities from invoice",
      "attachments": [
        {
          "type": "pdf",
          "uc_path": "/Volumes/mirion_vital/raw/medical_invoices/invoice_042.pdf",
          "page_num": 1
        }
      ]
    }
  ]
}
```

**Impact:** Better multimodal support, clearer PDF reference

---

### 2. Output Schema Validation

**Current:** Free-form text in assistant response  
**Enhancement:** Validate against template's output_schema

```python
# During Q&A pair creation
if template.output_schema:
  try:
    parsed = json.loads(qa_pair.messages[1].content)
    validate_schema(parsed, template.output_schema)
    qa_pair.quality_score = 1.0
  except (JSONDecodeError, SchemaValidationError) as e:
    qa_pair.quality_score = 0.0
    qa_pair.review_notes = f"Schema validation failed: {e}"
```

**Impact:** Catch format errors early, improve quality scores

---

### 3. Batch Import for Large Datasets

**Current:** Individual Q&A pair creation  
**Enhancement:** Spark job for bulk import

```python
# Spark job to generate Q&A pairs for 10k+ PDFs
df_invoices = spark.table("mirion_vital.raw.parsed_invoices")

df_qa_pairs = df_invoices.withColumn(
  "qa_pair",
  generate_qa_pair_udf(
    col("extracted_text"),
    lit(template_id),
    lit(training_sheet_id)
  )
)

df_qa_pairs.write.saveAsTable("mirion_vital.workbench.qa_pairs")
```

**Impact:** Handle 10k+ invoices efficiently

---

## Conclusion

**✅ PRD v2.2 Data Model Fully Supports Entity Extraction Use Case**

The data model successfully handles:
- ✅ PDF parsing and entity extraction workflow
- ✅ AI-generated extractions with human validation
- ✅ HIPAA compliance (PHI governance)
- ✅ Human-in-the-loop labeling (approve/edit/reject/flag)
- ✅ Dual quality gates (status + governance)
- ✅ Training on synthetic, evaluation on real data
- ✅ Few-shot examples with real PHI at runtime
- ✅ Feedback loop and continuous improvement
- ✅ Full lineage tracking

**Minor enhancements** identified (attachments, schema validation, batch import) but not blocking. Core data model is solid.

**Recommendation:** Proceed with implementation. Data model is production-ready for regulated entity extraction use cases.
