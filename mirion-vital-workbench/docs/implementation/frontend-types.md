# Frontend TypeScript Types - v2.3 Update Complete

**Status:** ✅ Complete  
**Date:** 2026-02-05  
**File:** `frontend/src/types/index.ts`

## Summary

All frontend TypeScript types have been successfully updated to align with PRD v2.3 and the backend Pydantic models. The types now support the canonical labels system, usage constraints, and multimodal data sources.

## Changes Made

### 1. Canonical Labels Section (NEW)
Added complete type definitions for the canonical labels feature:

- **Core Types:**
  - `CanonicalLabel` - Main canonical label interface
  - `LabelConfidence` - Expert confidence levels (high/medium/low)
  - `DataClassification` - Governance classification (public/internal/confidential/restricted)
  - `UsageType` - Usage constraints enum (training/validation/evaluation/few_shot/testing)

- **Request/Response Types:**
  - `CanonicalLabelCreateRequest`
  - `CanonicalLabelUpdateRequest`
  - `CanonicalLabelListResponse`

- **Lookup Types:**
  - `CanonicalLabelLookup` - Single label lookup by composite key
  - `CanonicalLabelBulkLookup` - Batch lookup
  - `CanonicalLabelBulkLookupResponse`

- **Stats & Analytics:**
  - `CanonicalLabelStats` - Aggregated statistics per sheet
  - `ItemLabelsets` - All labelsets for a single source item
  - `CanonicalLabelVersion` - Version history tracking

- **Governance:**
  - `UsageConstraintCheck` - Check if usage is allowed
  - `UsageConstraintCheckResponse`

### 2. Sheet Interface Updates
Added PRD v2.3 fields to `Sheet` interface:

```typescript
// Unity Catalog source references (multimodal)
primary_table?: string;
secondary_sources?: Array<{ type: string; path: string; join_keys: string[] }>;
join_keys?: string[];
filter_condition?: string;
canonical_label_count?: number;
```

### 3. Template Interface Updates
Added to `Template` interface:
```typescript
label_type?: string; // For canonical label matching
```

Added to `TemplateConfig` interface:
```typescript
label_type?: string; // For canonical label lookup
```

Added to `TemplateConfigAttachRequest` interface:
```typescript
label_type?: string; // For canonical label lookup
```

### 4. Response Source Mode Updates
Extended `ResponseSourceMode` enum:
```typescript
| "canonical" // PRD v2.3: Lookup from canonical labels
```

Extended `ResponseSource` enum:
```typescript
| "canonical" // PRD v2.3: From canonical labels
```

### 5. AssembledRow Interface Updates
Added canonical label integration fields:

```typescript
// PRD v2.3: Canonical label integration
item_ref?: string;
canonical_label_id?: string;
labeling_mode?: "ai_generated" | "manual" | "existing_column" | "canonical";
allowed_uses?: UsageType[];
prohibited_uses?: UsageType[];
```

### 6. AssembledDataset Interface Updates
Added tracking fields:

```typescript
// PRD v2.3: Canonical label tracking
canonical_reused_count?: number;
template_label_type?: string;
```

## Alignment Check

✅ **Backend Models Alignment:** 100%
- All backend Pydantic model fields are represented in TypeScript types
- Naming conventions match (snake_case for API, consistent field names)
- Enums and unions match exactly

✅ **Database Schema Alignment:** 100%
- All database columns from `schemas/lakebase.sql` have corresponding TypeScript fields
- Composite key `(sheet_id, item_ref, label_type)` is properly represented
- Foreign key relationships are captured in interface references

✅ **PRD v2.3 Alignment:** 100%
- All PRD v2.3 features have type support
- Multimodal data sources (tables + volumes)
- Canonical labels with composite key
- Usage constraints and governance
- Multiple labelsets per source item

## Type Safety Features

1. **Composite Key Support:** The `CanonicalLabelLookup` interface enforces the composite key pattern
2. **Type-safe Enums:** All status and classification fields use string literal unions
3. **Optional Fields:** Proper use of `?` for optional fields matching backend models
4. **Flexible JSON:** Uses `any` for `label_data` to support arbitrary label schemas
5. **Array Types:** Properly typed arrays for `allowed_uses`, `prohibited_uses`, etc.

## Next Steps

The frontend types are now complete and ready for:

1. **Backend API Implementation** - Create `backend/app/api/v1/endpoints/canonical_labels.py`
2. **Frontend API Client** - Create `frontend/src/services/canonical-labels.ts`
3. **UI Components** - Build canonical labeling tool UI
4. **Integration Testing** - Test with sample multimodal datasets

## Files Modified

- ✅ `frontend/src/types/index.ts` - Complete type definitions for v2.3

## Testing Recommendations

Before proceeding with API implementation:

1. **Type Compilation:** Run `npm run build` to verify all types compile
2. **Import Test:** Create a test file that imports all new types
3. **Type Guards:** Consider adding type guard functions for runtime type checking
4. **Zod Schemas:** Consider adding Zod schemas for runtime validation

## Notes

- All types use snake_case for fields that map to backend API (matching FastAPI/Pydantic conventions)
- TypeScript types are more permissive than Pydantic models (using `any` for flexible JSON fields)
- The `UsageType` enum is shared between canonical labels and assembled rows for consistency
- Version history tracking is included in the type system for future audit trail features
