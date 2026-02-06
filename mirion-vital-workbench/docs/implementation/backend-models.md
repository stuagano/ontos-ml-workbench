# Backend Models Update Complete

**Date:** February 5, 2026  
**Status:** ✅ All backend Pydantic models updated to PRD v2.3

---

## Summary

Successfully updated all backend Pydantic models to support PRD v2.3 features:
- Canonical Labels (new model)
- Multiple labelsets per item
- Usage constraints for data governance
- Canonical label linkage in Training Sheets
- Template label_type for canonical label matching

---

## ✅ Completed Updates

### 1. NEW: canonical_label.py
**Status:** ✅ Created

**Models Added:**
- `CanonicalLabelBase` - Base model with all core fields
- `CanonicalLabelCreate` - Request for creating labels
- `CanonicalLabelUpdate` - Request for updating labels
- `CanonicalLabelResponse` - Response with full label data
- `CanonicalLabelListResponse` - Paginated list response

**Lookup & Query Models:**
- `CanonicalLabelLookup` - Single label lookup by composite key
- `CanonicalLabelBulkLookup` - Bulk lookup for Training Sheet generation
- `CanonicalLabelStats` - Statistics about labels for a sheet
- `ItemLabelsets` - All labelsets for a single source item

**Governance Models:**
- `UsageConstraintCheck` - Check if label can be used for specific purpose
- `CanonicalLabelBulkUsageCheck` - Bulk usage constraint validation
- `CanonicalLabelExportRequest` - Export labels for Training Sheet generation

**Versioning Models:**
- `CanonicalLabelVersion` - Historical version data
- `CanonicalLabelVersionHistory` - Complete version history

**Key Features:**
```python
class CanonicalLabelBase(BaseModel):
    sheet_id: str
    item_ref: str
    label_type: str  # Composite key component
    label_data: dict[str, Any] | list[Any]  # Flexible VARIANT field
    confidence: LabelConfidence
    notes: str | None
    allowed_uses: list[UsageType]  # Governance
    prohibited_uses: list[UsageType]  # Governance
    usage_reason: str | None
    data_classification: DataClassification
```

---

### 2. UPDATED: sheet.py
**Status:** ✅ Updated

**Changes to `SheetResponse`:**
```python
# PRD v2.3: Unity Catalog source references (multimodal)
primary_table: str | None  # e.g., 'mirion_vital.raw.pcb_inspections'
secondary_sources: list[dict[str, Any]] | None  # [{type, path, join_key}, ...]
join_keys: list[str] | None
filter_condition: str | None
sample_size: int | None

# Statistics
canonical_label_count: int | None  # v2.3: Count of canonical labels
```

**Impact:**
- Sheets now reference Unity Catalog tables/volumes directly
- Support for multimodal data fusion (images + sensors + metadata)
- Track how many canonical labels exist for each sheet

---

### 3. UPDATED: assembly.py
**Status:** ✅ Updated

**New Enums:**
```python
class ResponseSource(str, Enum):
    CANONICAL = "canonical"  # v2.3: Added for canonical label reuse

class LabelingMode(str, Enum):  # v2.3: NEW enum
    AI_GENERATED = "ai_generated"
    MANUAL = "manual"
    EXISTING_COLUMN = "existing_column"
    CANONICAL = "canonical"  # Label reused from canonical label
```

**Changes to `AssembledRow`:**
```python
# PRD v2.3: Reference to source item for canonical label lookup
item_ref: str | None

# PRD v2.3: Canonical label linkage
canonical_label_id: str | None
labeling_mode: LabelingMode

# PRD v2.3: Usage constraints
allowed_uses: list[str] | None
prohibited_uses: list[str] | None
```

**Changes to `AssembledDataset`:**
```python
# PRD v2.3: Label type for canonical label matching
template_label_type: str | None

# Statistics (PRD v2.3: added canonical_reused_count)
canonical_reused_count: int  # Rows pre-approved via canonical labels
```

**Impact:**
- Q&A pairs now link to canonical labels
- Track labeling mode (AI vs manual vs canonical reuse)
- Usage constraints enforced at Q&A pair level
- Statistics show how many items were pre-approved

---

### 4. UPDATED: template.py
**Status:** ✅ Updated

**Changes to All Template Models:**
```python
# PRD v2.3: Label type for canonical label matching
label_type: str | None  # entity_extraction, classification, localization, etc.
```

**Models Updated:**
- `TemplateCreate` - Added label_type field
- `TemplateUpdate` - Added label_type field  
- `TemplateResponse` - Added label_type field

**Impact:**
- Templates can specify label_type
- During Training Sheet generation, system looks up canonical labels by matching template.label_type
- Enables automatic label reuse across template iterations

---

## Schema Alignment Check

| Feature | PRD v2.3 Schema | Backend Model | Status |
|---------|-----------------|---------------|--------|
| Canonical Labels | `canonical_labels` table | `CanonicalLabelResponse` | ✅ Aligned |
| Composite Key | `UNIQUE(sheet_id, item_ref, label_type)` | `CanonicalLabelBase` has all 3 fields | ✅ Aligned |
| Multiple Labelsets | Composite key supports | `ItemLabelsets` model | ✅ Aligned |
| Usage Constraints | `allowed_uses`, `prohibited_uses` arrays | `allowed_uses`, `prohibited_uses` in models | ✅ Aligned |
| Canonical Label ID | FK in `assembly_rows` | `canonical_label_id` in `AssembledRow` | ✅ Aligned |
| Labeling Mode | `labeling_mode` column | `LabelingMode` enum | ✅ Aligned |
| Label Type | In `canonical_labels`, `templates` | Fields in both models | ✅ Aligned |
| Reuse Count | `reuse_count`, `canonical_reused_count` | Statistics in both models | ✅ Aligned |
| Unity Catalog Refs | `primary_table`, `secondary_sources` | Fields in `SheetResponse` | ✅ Aligned |
| Model Lineage | `model_training_lineage` table | (Pending - needs separate model) | ⚠️ TODO |

---

## API Endpoint Requirements

### NEW: /api/v1/canonical-labels

**Endpoints to Implement:**

1. **POST /canonical-labels** - Create canonical label
   - Request: `CanonicalLabelCreate`
   - Response: `CanonicalLabelResponse`

2. **GET /canonical-labels** - List canonical labels
   - Query params: sheet_id, label_type, page, page_size
   - Response: `CanonicalLabelListResponse`

3. **GET /canonical-labels/{id}** - Get single label
   - Response: `CanonicalLabelResponse`

4. **PUT /canonical-labels/{id}** - Update label
   - Request: `CanonicalLabelUpdate`
   - Response: `CanonicalLabelResponse`

5. **DELETE /canonical-labels/{id}** - Delete label
   - Response: 204 No Content

6. **POST /canonical-labels/lookup** - Lookup by composite key
   - Request: `CanonicalLabelLookup`
   - Response: `CanonicalLabelResponse` or 404

7. **POST /canonical-labels/bulk-lookup** - Bulk lookup
   - Request: `CanonicalLabelBulkLookup`
   - Response: `CanonicalLabelBulkLookupResponse`

8. **GET /canonical-labels/stats** - Get statistics
   - Query params: sheet_id
   - Response: `CanonicalLabelStats`

9. **POST /canonical-labels/check-usage** - Check usage constraints
   - Request: `UsageConstraintCheck`
   - Response: `UsageConstraintCheckResponse`

10. **POST /canonical-labels/export** - Export for training
    - Request: `CanonicalLabelExportRequest`
    - Response: `CanonicalLabelExportResponse`

### UPDATED: /api/v1/assemblies

**Changes Needed:**
- Update generation logic to perform canonical label lookup
- Add `canonical_label_id` to assembled rows
- Update statistics to include `canonical_reused_count`
- Filter by usage constraints during export

### UPDATED: /api/v1/sheets

**Changes Needed:**
- Add Unity Catalog reference fields to create/update
- Return `canonical_label_count` in responses
- Add endpoint: GET /sheets/{id}/canonical-labels

### UPDATED: /api/v1/templates

**Changes Needed:**
- Add `label_type` field to create/update requests
- Return `label_type` in responses

---

## Frontend TypeScript Types (TODO)

Next steps for frontend:

1. **Create `types/canonical-label.ts`:**
```typescript
export interface CanonicalLabel {
  id: string;
  sheet_id: string;
  item_ref: string;
  label_type: string;
  label_data: any;  // JSON
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  allowed_uses: UsageType[];
  prohibited_uses: UsageType[];
  usage_reason?: string;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
  labeled_by: string;
  labeled_at: string;
  reuse_count: number;
  last_used_at?: string;
  version: number;
}

export type UsageType = 'training' | 'validation' | 'evaluation' | 'few_shot' | 'testing';
```

2. **Update `types/index.ts`:**
   - Add `canonical_label_count` to Sheet interface
   - Add `canonical_label_id`, `labeling_mode` to AssembledRow
   - Add `canonical_reused_count` to AssembledDataset
   - Add `label_type` to Template interface
   - Add Unity Catalog fields to Sheet interface

3. **Create `services/canonical-labels.ts`:**
   - API client methods for all canonical label endpoints

---

## Testing Checklist

### Unit Tests (Pydantic Validation)

- [ ] `CanonicalLabelBase` validates required fields
- [ ] `CanonicalLabelBase` enforces data_classification enum
- [ ] `CanonicalLabelBase` validates allowed_uses/prohibited_uses
- [ ] Composite key fields (sheet_id, item_ref, label_type) are non-nullable
- [ ] `label_data` accepts both dict and list types
- [ ] `AssembledRow` validates labeling_mode enum
- [ ] `Template` accepts optional label_type

### Integration Tests (API)

- [ ] Create canonical label with valid data
- [ ] Lookup canonical label by composite key
- [ ] Bulk lookup returns correct found/not_found split
- [ ] Usage constraint check enforces prohibited_uses
- [ ] Training Sheet generation performs canonical label lookup
- [ ] Statistics show correct canonical_label_count
- [ ] Export filters by usage constraints

### End-to-End Tests

- [ ] Create canonical label via UI
- [ ] Generate Training Sheet with canonical label reuse
- [ ] Verify pre-approval of items with canonical labels
- [ ] Update canonical label and verify version increment
- [ ] Multiple labelsets per item work correctly

---

## Next Steps

### Immediate (This Session)

1. ✅ Create `canonical_label.py` model
2. ✅ Update `sheet.py` model
3. ✅ Update `assembly.py` model
4. ✅ Update `template.py` model
5. 🔄 Update `frontend/src/types/index.ts`
6. ⏳ Create `backend/app/api/v1/endpoints/canonical_labels.py`

### This Week

- Update backend services to use canonical labels
- Implement canonical label API endpoints
- Update frontend types and API client
- Create Canonical Labeling Tool UI component

### Next Week

- End-to-end testing
- Load sample data (medical invoices + PCB images)
- Verify multimodal workflows

---

## File Summary

### Created Files
1. `backend/app/models/canonical_label.py` - Complete canonical label models

### Updated Files
1. `backend/app/models/sheet.py` - Added Unity Catalog refs, canonical_label_count
2. `backend/app/models/assembly.py` - Added canonical label linkage, usage constraints
3. `backend/app/models/template.py` - Added label_type field

### Pending Updates
1. `backend/app/models/__init__.py` - Export canonical_label models
2. `frontend/src/types/index.ts` - Add TypeScript interfaces
3. `backend/app/api/v1/endpoints/canonical_labels.py` - Create API endpoints

---

**Last Updated:** 2026-02-05  
**Next Milestone:** Frontend Types + API Endpoints (Today)
