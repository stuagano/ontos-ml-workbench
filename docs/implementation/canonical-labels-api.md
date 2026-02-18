# Canonical Labels API - Implementation Complete

**Status:** ✅ Complete  
**Date:** 2026-02-05  
**File:** `backend/app/api/v1/endpoints/canonical_labels.py`

## Summary

The Canonical Labels REST API is now fully implemented with all CRUD operations, lookup methods, statistics, governance checks, and version history tracking. The API follows the existing codebase patterns using SQL service for database access.

## API Endpoints Overview

### Base Path: `/api/v1/canonical-labels`

## CRUD Operations

### 1. Create Canonical Label
**POST** `/`

Creates a new canonical label with composite key validation.

**Request Body:**
```json
{
  "sheet_id": "sheet_123",
  "item_ref": "image_001.jpg",
  "label_type": "classification",
  "label_data": {"defect_type": "scratch", "severity": "high"},
  "confidence": "high",
  "allowed_uses": ["training", "validation", "evaluation"],
  "prohibited_uses": [],
  "labeled_by": "expert@company.com"
}
```

**Response:** `201 Created` with `CanonicalLabel` object

**Features:**
- Validates composite key uniqueness `(sheet_id, item_ref, label_type)`
- Verifies sheet exists before creating label
- Initializes `reuse_count = 0` and `version = 1`

---

### 2. Get Canonical Label
**GET** `/{label_id}`

Retrieves a single canonical label by UUID.

**Response:** `200 OK` with `CanonicalLabel` object

---

### 3. Update Canonical Label
**PUT** `/{label_id}`

Updates a canonical label and creates version history entry.

**Request Body:**
```json
{
  "label_data": {"defect_type": "crack", "severity": "critical"},
  "confidence": "high",
  "last_modified_by": "reviewer@company.com"
}
```

**Response:** `200 OK` with updated `CanonicalLabel`

**Features:**
- Automatically increments version number
- Saves previous version to `canonical_label_versions` table
- Supports partial updates (only provided fields are updated)

---

### 4. Delete Canonical Label
**DELETE** `/{label_id}`

Deletes a canonical label if not in use.

**Response:** `204 No Content`

**Safety:**
- Checks if label is referenced by any Training Sheet rows
- Returns `409 Conflict` if label is in use
- Recommends checking usage before deletion

---

## Lookup Operations

### 5. Single Lookup
**POST** `/lookup`

Lookup by composite key - primary method for Training Sheet assembly.

**Request Body:**
```json
{
  "sheet_id": "sheet_123",
  "item_ref": "image_001.jpg",
  "label_type": "classification"
}
```

**Response:** `200 OK` with `CanonicalLabel` object or `null`

---

### 6. Bulk Lookup
**POST** `/lookup/bulk`

Efficient batch lookup for multiple items.

**Request Body:**
```json
{
  "sheet_id": "sheet_123",
  "items": [
    {"item_ref": "image_001.jpg", "label_type": "classification"},
    {"item_ref": "image_002.jpg", "label_type": "classification"},
    {"item_ref": "image_003.jpg", "label_type": "localization"}
  ]
}
```

**Response:**
```json
{
  "found": [/* CanonicalLabel objects */],
  "not_found": [
    {"item_ref": "image_003.jpg", "label_type": "localization"}
  ],
  "found_count": 2,
  "not_found_count": 1
}
```

**Use Case:** Training Sheet assembly checks all rows at once

---

## List & Search

### 7. List Canonical Labels
**GET** `/?sheet_id=...&label_type=...&confidence=...&min_reuse_count=...&page=1&page_size=50`

List with filtering and pagination.

**Query Parameters:**
- `sheet_id` (optional) - Filter by sheet
- `label_type` (optional) - Filter by type (e.g., "classification")
- `confidence` (optional) - Filter by confidence level (high/medium/low)
- `min_reuse_count` (optional) - Only show labels reused N+ times
- `page` (default: 1) - Page number
- `page_size` (default: 50, max: 500) - Items per page

**Response:**
```json
{
  "labels": [/* CanonicalLabel objects */],
  "total": 150,
  "page": 1,
  "page_size": 50
}
```

---

## Statistics & Analytics

### 8. Sheet Statistics
**GET** `/sheets/{sheet_id}/stats`

Aggregated statistics for a sheet's canonical labels.

**Response:**
```json
{
  "sheet_id": "sheet_123",
  "total_labels": 450,
  "labels_by_type": {
    "classification": 200,
    "localization": 150,
    "root_cause": 100
  },
  "avg_reuse_count": 3.2,
  "most_reused_labels": [/* Top 10 CanonicalLabel objects */],
  "coverage_percent": 85.5
}
```

**Metrics:**
- Total labels created
- Breakdown by label_type
- Average reuse count
- Top 10 most reused labels
- Coverage % (items with at least one label)

---

### 9. Item Labelsets
**GET** `/items/{sheet_id}/{item_ref}`

Get all labelsets for a single source item.

**Response:**
```json
{
  "sheet_id": "sheet_123",
  "item_ref": "image_001.jpg",
  "labelsets": [
    {/* classification label */},
    {/* localization label */},
    {/* root_cause label */},
    {/* pass_fail label */}
  ],
  "label_types": ["classification", "localization", "root_cause", "pass_fail"]
}
```

**Use Case:** Shows all the different ways an item has been labeled

---

## Governance & Usage

### 10. Check Usage Constraints
**POST** `/usage/check`

Validate if a requested usage is allowed.

**Request Body:**
```json
{
  "canonical_label_id": "label_123",
  "requested_usage": "training"
}
```

**Response:**
```json
{
  "allowed": true,
  "reason": null,
  "canonical_label_id": "label_123",
  "requested_usage": "training"
}
```

**Validation Rules:**
1. Usage must be in `allowed_uses` list
2. Usage must NOT be in `prohibited_uses` list

---

### 11. Get Label Usage
**GET** `/{label_id}/usage`

Find all Training Sheets using this label.

**Response:**
```json
{
  "canonical_label_id": "label_123",
  "usage_count": 5,
  "used_in": [
    {
      "assembly_id": "assembly_001",
      "assembly_name": "PCB Defect Detection v1",
      "sheet_id": "sheet_123",
      "row_index": 42
    }
  ]
}
```

**Use Case:** Check where a label is used before deleting/modifying

---

## Version History

### 12. Get Version History
**GET** `/{label_id}/versions`

Retrieve all previous versions of a label.

**Response:**
```json
[
  {
    "version": 3,
    "label_data": {"defect_type": "crack", "severity": "critical"},
    "confidence": "high",
    "notes": "Updated after expert review",
    "modified_by": "reviewer@company.com",
    "modified_at": "2026-02-05T10:30:00Z"
  },
  {
    "version": 2,
    "label_data": {"defect_type": "scratch", "severity": "high"},
    "confidence": "medium",
    "notes": null,
    "modified_by": "expert@company.com",
    "modified_at": "2026-02-04T14:15:00Z"
  }
]
```

**Use Case:** Audit trail for label evolution

---

## Internal Operations

### 13. Increment Reuse Count
**POST** `/{label_id}/increment-reuse`

Automatically increments `reuse_count` when a Training Sheet links to the label.

**Response:** `204 No Content`

**Note:** Internal use only - called by Training Sheet assembly logic

---

## Implementation Details

### Database Access Pattern
- Uses `SQLService` for all database operations
- Follows existing codebase patterns from `sheets.py` and `assemblies.py`
- Handles JSON serialization/deserialization for flexible fields

### Table References
```python
CANONICAL_LABELS_TABLE = catalog.schema.canonical_labels
CANONICAL_LABEL_VERSIONS_TABLE = catalog.schema.canonical_label_versions
SHEETS_TABLE = catalog.schema.sheets
ASSEMBLIES_TABLE = catalog.schema.assemblies
ASSEMBLY_ROWS_TABLE = catalog.schema.assembly_rows
```

### JSON Field Handling
The following fields are stored as JSON and require serialization:
- `label_data` - Flexible schema for any label structure
- `allowed_uses` - Array of usage types
- `prohibited_uses` - Array of prohibited usage types

### Composite Key Pattern
The unique constraint `(sheet_id, item_ref, label_type)` enables:
- Multiple independent labelsets per source item
- Same PCB image can have classification, localization, root_cause, pass_fail labels
- Type-safe separation of different annotation tasks

### Error Handling
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Composite key violation or label in use
- **422 Unprocessable Entity** - Validation errors (automatic from Pydantic)

### Performance Optimizations
1. **Bulk Lookup** - Single query for multiple labels (vs N queries)
2. **Pagination** - Limits result set size (max 500 per page)
3. **Indexed Queries** - Composite key and foreign keys are indexed
4. **Aggregation** - Stats use SQL GROUP BY for efficiency

---

## Integration Points

### Frontend Integration
The API is ready for the frontend `canonical-labels.ts` service:
```typescript
// Example usage
const label = await createCanonicalLabel({
  sheet_id: "sheet_123",
  item_ref: "image_001.jpg",
  label_type: "classification",
  label_data: { defect_type: "scratch" },
  confidence: "high",
  allowed_uses: ["training", "validation"],
  labeled_by: currentUser.email
});

// Bulk lookup during assembly
const { found, not_found } = await bulkLookupCanonicalLabels({
  sheet_id: "sheet_123",
  items: rows.map(r => ({ item_ref: r.image_path, label_type: "classification" }))
});
```

### Training Sheet Assembly Integration
When assembling a Training Sheet:
1. Use bulk lookup to check for canonical labels
2. For found labels: link via `canonical_label_id` and set `labeling_mode = "canonical"`
3. For not found labels: use AI generation or manual labeling
4. Call increment-reuse for each canonical label used

### Usage Governance Workflow
Before using a canonical label:
1. Call `/usage/check` to validate usage constraints
2. If `allowed = false`, show reason to user
3. If `allowed = true`, proceed with linking the label

---

## Testing Recommendations

### Unit Tests
- Test composite key uniqueness validation
- Test version history creation on updates
- Test usage constraint checking logic
- Test bulk lookup with mixed found/not_found results

### Integration Tests
- Create label → Lookup by composite key → Verify found
- Create label → Update → Check version history
- Create label → Use in Training Sheet → Check usage endpoint
- Create label → Delete (should succeed)
- Create label → Use in Training Sheet → Delete (should fail with 409)

### Load Tests
- Bulk lookup with 1000+ items
- List endpoint pagination with large datasets
- Concurrent label creation with same composite key (should handle race condition)

---

## Next Steps

1. **Frontend API Client** - Create `frontend/src/services/canonical-labels.ts`
2. **UI Components** - Build canonical labeling tool interface
3. **Training Sheet Integration** - Update assembly logic to use canonical labels
4. **Generate Page Integration** - Show canonical label lookup status
5. **Label Page Integration** - Show canonical label source
6. **Testing** - Create test datasets and validate workflows

---

## API Documentation

All endpoints are automatically documented in FastAPI's OpenAPI schema:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

The API follows REST conventions and returns proper HTTP status codes for all operations.
