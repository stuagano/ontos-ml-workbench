# Multimodal Data Flow - Complete Example

**Version:** PRD v2.3  
**Date:** 2026-02-05  
**Status:** Design Complete

---

## The Reality: Inherently Multimodal Source Data

**Your Insight:** "The raw data for example is inherently multimodal. So invoice has pdf path and then amount, number, account etc."

This is exactly right. Source data isn't just a PDF - it's a **rich multimodal record** with:
- 📄 PDF document (visual/text content)
- 🔢 Structured fields (amount, account number, date)
- 📊 Metadata (confidence scores, timestamps)

---

## Complete Example: Medical Invoice

### Step 1: Source Data in Unity Catalog

**Table:** `mirion_vital.raw.parsed_invoices`

```sql
-- Single invoice record (multimodal)
SELECT * FROM parsed_invoices WHERE invoice_id = 'inv-042';

Result:
{
  "invoice_id": "inv-042",
  "pdf_path": "/Volumes/mirion_vital/raw/medical_invoices/invoice_042.pdf",
  
  -- Structured fields (pre-extracted or from metadata)
  "invoice_number": "INV-2024-001",
  "invoice_date": "2024-01-15",
  "total_amount": 285.50,
  "account_number": "ACC-12345",
  "provider_name": "City Medical Center",
  "provider_npi": "1234567890",
  "department": "Cardiology",
  
  -- OCR/Parsed content
  "extracted_text": "INVOICE\nCity Medical Center...",
  "page_count": 2,
  "parsing_confidence": 0.94,
  
  -- Metadata
  "file_size_bytes": 245678,
  "uploaded_at": "2024-01-16T08:30:00Z",
  "uploaded_by": "billing_system"
}
```

**Key Point:** This is ONE record with MULTIPLE modalities (PDF + structured fields + metadata).

---

### Step 2: Sheet Definition (Dataset Pointer)

**Sheet:** `sheet-invoices-001`

```json
{
  "sheet_id": "sheet-invoices-001",
  "name": "Medical Invoices - January 2026",
  "primary_table": "mirion_vital.raw.parsed_invoices",
  "secondary_sources": [
    {
      "type": "volume",
      "path": "/Volumes/mirion_vital/raw/medical_invoices",
      "join_key": "invoice_id"
    }
  ],
  "join_keys": ["invoice_id"],
  "filter_condition": "invoice_date >= '2024-01-01' AND invoice_date < '2024-02-01'",
  "item_count": 500
}
```

**What the Sheet Provides:**
- Points to table with structured fields
- Links to volume with PDF files
- Each item is identified by `invoice_id` (used as `item_ref`)

---

### Step 3: Canonical Labeling (Expert Uses ALL Data)

**Scenario:** Expert labels `inv-042` for entity extraction

**What Expert Sees in UI:**

```
┌─────────────────────────────────────────────────────────┐
│ Canonical Labeling Tool                                 │
│ Item: inv-042                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📄 PDF Preview                                          │
│ [Displays /Volumes/.../invoice_042.pdf]                │
│                                                          │
│ Page 1 of 2                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📊 Structured Fields (from table)                       │
│                                                          │
│ Invoice Number:  INV-2024-001                           │
│ Date:            2024-01-15                             │
│ Amount:          $285.50                                │
│ Account:         ACC-12345                              │
│ Provider:        City Medical Center                    │
│ Department:      Cardiology                             │
│ Confidence:      94%                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Label Type: [Entity Extraction ▼]                       │
│                                                          │
│ Ground Truth Entities:                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Patient Name:     [Jane Smith              ]       │ │
│ │ Patient DOB:      [1985-03-15              ]       │ │
│ │ Insurance ID:     [BC12345678              ]       │ │
│ │ Procedure Codes:  [99213, 87426            ]       │ │
│ │ Total Amount:     [285.50                  ] ← Pre-filled!
│ │ Provider:         [City Medical Center     ] ← Pre-filled!
│ │ Invoice Number:   [INV-2024-001            ] ← Pre-filled!
│ │ Service Date:     [2024-01-15              ] ← Pre-filled!
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Save Label] [Skip] [Previous] [Next]                   │
└─────────────────────────────────────────────────────────┘
```

**Key Benefits:**
- ✅ Structured fields **pre-populate** form (less manual entry)
- ✅ Expert verifies/corrects pre-filled values
- ✅ Expert adds missing fields (Patient Name, DOB from PDF)
- ✅ Faster labeling (structured fields already extracted)

**Saved Canonical Label:**

```json
{
  "id": "cl-001",
  "sheet_id": "sheet-invoices-001",
  "item_ref": "inv-042",  // Points to invoice_id in table
  "label_type": "entity_extraction",
  "label_data": {
    // From PDF (manual extraction)
    "patient_name": "Jane Smith",
    "patient_dob": "1985-03-15",
    "insurance_id": "BC12345678",
    "procedure_codes": ["99213", "87426"],
    
    // From structured fields (verified/corrected)
    "total_amount": 285.50,
    "provider_name": "City Medical Center",
    "invoice_number": "INV-2024-001",
    "service_date": "2024-01-15"
  },
  "confidence": "high",
  "labeled_by": "billing_expert@hospital.com",
  "labeled_at": "2026-01-15T10:30:00Z",
  "notes": "Verified amount and provider from structured fields. Extracted patient info from PDF page 1.",
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training", "validation"],
  "usage_reason": "Contains PHI - HIPAA compliance",
  "data_classification": "restricted"
}
```

---

### Step 4: Template with Multimodal Input

**Prompt Template:** Entity Extraction v1

```json
{
  "template_id": "tpl-entity-extraction-001",
  "name": "Medical Invoice Entity Extractor v1",
  "label_type": "entity_extraction",
  "system_prompt": "You are a medical billing expert. Extract structured entities from invoices.",
  "user_prompt_template": `Extract entities from this medical invoice:

**PDF Content:**
{extracted_text}

**Pre-extracted Structured Fields:**
- Invoice Number: {invoice_number}
- Invoice Date: {invoice_date}
- Total Amount: {total_amount}
- Provider: {provider_name}
- Department: {department}

**Instructions:**
1. Use the structured fields when accurate
2. Extract patient information from PDF content
3. Extract procedure codes from PDF content
4. Return JSON with: patient_name, patient_dob, insurance_id, procedure_codes, total_amount, provider_name, invoice_number, service_date`,
  "input_schema": [
    {"name": "extracted_text", "type": "string", "source": "table.extracted_text"},
    {"name": "invoice_number", "type": "string", "source": "table.invoice_number"},
    {"name": "invoice_date", "type": "date", "source": "table.invoice_date"},
    {"name": "total_amount", "type": "decimal", "source": "table.total_amount"},
    {"name": "provider_name", "type": "string", "source": "table.provider_name"},
    {"name": "department", "type": "string", "source": "table.department"}
  ],
  "output_schema": {
    "patient_name": "string",
    "patient_dob": "date",
    "insurance_id": "string",
    "procedure_codes": ["string"],
    "total_amount": "decimal",
    "provider_name": "string",
    "invoice_number": "string",
    "service_date": "date"
  }
}
```

**Key Point:** Template specifies which table columns to use as inputs (`input_schema`).

---

### Step 5: Q&A Pair Generation (Multimodal Input)

**Process:**

```python
def generate_qa_pair(sheet, template, item):
  # Fetch multimodal data from Sheet
  row = sheet.get_row(item_ref="inv-042")
  
  # Row contains ALL fields:
  # {
  #   "invoice_id": "inv-042",
  #   "pdf_path": "/Volumes/.../invoice_042.pdf",
  #   "extracted_text": "...",
  #   "invoice_number": "INV-2024-001",
  #   "total_amount": 285.50,
  #   ...
  # }
  
  # Check for canonical label
  canonical_label = canonical_labels.get(
    sheet_id=sheet.id,
    item_ref="inv-042",
    label_type="entity_extraction"
  )
  
  if canonical_label:
    # Use expert ground truth
    response = canonical_label.label_data
  else:
    # Generate with LLM using multimodal inputs
    prompt = template.format(
      extracted_text=row["extracted_text"],      # From OCR
      invoice_number=row["invoice_number"],      # Structured field
      invoice_date=row["invoice_date"],          # Structured field
      total_amount=row["total_amount"],          # Structured field
      provider_name=row["provider_name"],        # Structured field
      department=row["department"]               # Structured field
    )
    
    response = llm.generate(prompt)
  
  # Create Q&A pair
  qa_pair = {
    "messages": [
      {
        "role": "user",
        "content": prompt,
        "attachments": [
          {
            "type": "pdf",
            "path": row["pdf_path"],  # Link to PDF
            "pages": [1, 2]
          }
        ],
        "context": {
          // Store structured fields for reference
          "invoice_number": row["invoice_number"],
          "total_amount": row["total_amount"],
          "provider_name": row["provider_name"]
        }
      },
      {
        "role": "assistant",
        "content": response
      }
    ],
    "canonical_label_id": canonical_label.id if canonical_label else None,
    "status": "labeled" if canonical_label else "unlabeled"
  }
  
  return qa_pair
```

**Result Q&A Pair:**

```json
{
  "id": "qa-001",
  "training_sheet_id": "ts-001",
  "item_ref": "inv-042",
  "canonical_label_id": "cl-001",
  "messages": [
    {
      "role": "user",
      "content": "Extract entities from this medical invoice:\n\n**PDF Content:**\nINVOICE\nCity Medical Center...\n\n**Pre-extracted Structured Fields:**\n- Invoice Number: INV-2024-001\n- Invoice Date: 2024-01-15\n- Total Amount: 285.50\n- Provider: City Medical Center\n- Department: Cardiology",
      "attachments": [
        {
          "type": "pdf",
          "path": "/Volumes/mirion_vital/raw/medical_invoices/invoice_042.pdf",
          "pages": [1, 2]
        }
      ],
      "context": {
        "invoice_number": "INV-2024-001",
        "total_amount": 285.50,
        "provider_name": "City Medical Center"
      }
    },
    {
      "role": "assistant",
      "content": {
        "patient_name": "Jane Smith",
        "patient_dob": "1985-03-15",
        "insurance_id": "BC12345678",
        "procedure_codes": ["99213", "87426"],
        "total_amount": 285.50,
        "provider_name": "City Medical Center",
        "invoice_number": "INV-2024-001",
        "service_date": "2024-01-15"
      }
    }
  ],
  "status": "labeled",
  "labeling_mode": "canonical"
}
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│ Unity Catalog Table: parsed_invoices                    │
│                                                          │
│ invoice_id | pdf_path           | invoice_number | ...  │
│ inv-042    | /Volumes/.../042   | INV-2024-001   | ...  │
│            ↓                                             │
│     [PDF + Structured Fields + Metadata]                │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Sheet (Dataset Definition)                              │
│ - Points to table                                       │
│ - Points to volume                                      │
│ - Joins on invoice_id                                   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Canonical Label (Expert Ground Truth)                   │
│ - Expert sees PDF + structured fields                   │
│ - Pre-fills from structured fields                      │
│ - Extracts missing data from PDF                        │
│ - Saves ground truth                                    │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Q&A Pair (Training Data)                                │
│ - User prompt includes structured fields                │
│ - Attachments link to PDF                               │
│ - Response from canonical label or LLM                  │
│ - Context preserves structured fields                   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ Training Sheet → Model                                  │
│ - Fine-tune with multimodal context                     │
│ - Model learns to leverage structured fields            │
│ - Better accuracy than PDF-only                         │
└─────────────────────────────────────────────────────────┘
```

---

## Benefits of Multimodal Source Data

### 1. Pre-Filled Labeling Forms

**Without structured fields:**
```
Expert must type: INV-2024-001, $285.50, City Medical Center
Time: 30 seconds per invoice
```

**With structured fields:**
```
Expert sees: INV-2024-001 (pre-filled), $285.50 (pre-filled), City Medical Center (pre-filled)
Expert only adds: Patient name, DOB, insurance ID from PDF
Time: 10 seconds per invoice (67% faster!)
```

### 2. Higher Accuracy

**LLM Prompt with Structured Fields:**
```
The invoice amount is $285.50 (from structured field - high confidence).
The provider is City Medical Center (from structured field - verified).

Please extract the patient information from the PDF.
```

**Result:** LLM focuses on missing fields, leverages known-good structured data.

### 3. Validation & Quality Checks

```python
# Validate LLM extraction against structured fields
def validate_extraction(llm_response, structured_fields):
  if llm_response["total_amount"] != structured_fields["total_amount"]:
    flag_for_review("Amount mismatch")
  
  if llm_response["invoice_number"] != structured_fields["invoice_number"]:
    flag_for_review("Invoice number mismatch")
```

### 4. Progressive Extraction

**Phase 1: Use Structured Fields**
- Train model using only pre-extracted fields
- Fast, high accuracy on structured data

**Phase 2: Add PDF Content**
- Teach model to extract missing fields from PDF
- Combines structured + unstructured

**Phase 3: End-to-End**
- Model learns to extract everything from PDF
- Validates against structured fields

---

## Implementation Notes

### Backend: Multimodal Data Access

```python
class Sheet:
  def get_item(self, item_ref):
    # Fetch row from primary table
    row = spark.sql(f"""
      SELECT *
      FROM {self.primary_table}
      WHERE {self.primary_key} = '{item_ref}'
    """).first()
    
    # Add volume path if joined
    if self.secondary_sources:
      for source in self.secondary_sources:
        if source['type'] == 'volume':
          row['pdf_path'] = f"{source['path']}/{row[source['join_key']]}.pdf"
    
    return row
```

### Frontend: Multimodal Display

```typescript
interface CanonicalLabelingUI {
  item: {
    pdf_path: string;              // Display PDF
    structured_fields: Record<string, any>;  // Display table
    metadata: Record<string, any>; // Display metadata
  };
  
  labelForm: {
    pre_fill_from_structured: boolean;  // Auto-fill from table
    allow_edit_structured: boolean;     // Let expert correct
    show_pdf_preview: boolean;          // Display PDF
  };
}
```

---

## Conclusion

**Your insight is exactly right:** Source data is inherently multimodal (PDF + structured fields + metadata), and the system must handle ALL of it throughout the pipeline.

**Design enables:**
✅ **Multimodal source data** (Unity Catalog table + volume)  
✅ **Multimodal labeling** (expert sees PDF + structured fields)  
✅ **Multimodal prompts** (template uses both PDF and fields)  
✅ **Multimodal training** (Q&A pairs include all context)  

**Result:** Faster labeling, higher accuracy, better models.
