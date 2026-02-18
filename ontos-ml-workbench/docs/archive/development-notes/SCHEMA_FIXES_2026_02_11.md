# Schema Fixes - February 11, 2026

## Problem

Schema mismatches between database and backend code caused:
- ❌ 500 errors when creating templates
- ❌ Templates list showing empty
- ❌ Confusion about which field names are correct
- ❌ Multiple conflicting schema definitions in codebase

## Root Cause

1. **Backend code used non-existent columns**:
   - Code tried to INSERT into `model_name`, `temperature`, `max_tokens` - **these don't exist**
   - Database actually has: `user_prompt_template`, `few_shot_examples`

2. **Outdated SQL schema files**:
   - `schemas/03_templates.sql` defined fields that were never created in database
   - No single source of truth for what the schema actually is

3. **Field name mismatches**:
   - API: `prompt_template` → DB: `user_prompt_template`
   - API: `examples` → DB: `few_shot_examples` (different type too!)

## What Was Fixed

### 1. Backend API Endpoints

**File:** `backend/app/api/v1/endpoints/templates.py`

- ✅ Fixed `create_template()` to use actual database columns
- ✅ Fixed `_row_to_template()` to read correct fields
- ✅ Added proper field mapping from API to DB
- ✅ Handled `ARRAY<STRING>` type for `few_shot_examples`

**Before:**
```python
sql = f"INSERT INTO templates (prompt_template, temperature, max_tokens) ..."  # ❌
```

**After:**
```python
sql = f"INSERT INTO templates (user_prompt_template, ...) ..."  # ✅
# temperature, max_tokens not stored - use defaults in response
```

### 2. SQL Schema Files

**File:** `schemas/03_templates.sql`

- ✅ Updated to match actual database schema
- ✅ Removed fields that don't exist (`model_name`, `temperature`, etc.)
- ✅ Added note that model config is runtime, not stored
- ✅ Marked as "VERIFIED SCHEMA" with date

### 3. Documentation

**New Files:**

1. **`schemas/SCHEMA_REFERENCE.md`**
   - Complete reference for all table schemas
   - Field mapping tables (API ↔ Database)
   - Common mistakes and how to avoid them
   - Examples of correct vs incorrect usage

2. **`SCHEMA_MANAGEMENT.md`**
   - Complete guide for managing schemas
   - Checklist for adding/modifying tables
   - Troubleshooting guide for schema errors
   - Best practices

3. **`schemas/verify_schema.py`**
   - Automated verification script
   - Checks all critical tables have expected columns
   - Reports missing or extra columns
   - Exit code 0 = pass, 1 = fail (CI-friendly)

**Updated Files:**

1. **`backend/app/models/template.py`**
   - Added documentation showing field mapping
   - Warning comments about API vs DB field names

2. **`README.md`**
   - Added link to schema management guide

### 4. Git Hooks (Optional)

**File:** `.git-hooks/pre-commit.example`

- Pre-commit hook that runs schema verification
- Prevents committing schema mismatches
- Installation instructions included

## Verification

### Before Fix
```bash
$ curl http://localhost:8000/api/v1/templates
{"templates": [], "total": 0, "page": 1, "page_size": 20}

$ # Try to create template
$ curl -X POST http://localhost:8000/api/v1/templates -d '...'
Internal Server Error  # ❌
```

### After Fix
```bash
$ curl http://localhost:8000/api/v1/templates
{"templates": [{"id": "69a19...", "name": "Test Template", ...}], ...}  # ✅

$ cd backend && python3 ../schemas/verify_schema.py
✅ PASS: All schema checks passed  # ✅
```

## Key Learnings

### 1. Database is Source of Truth

Always verify against actual database, not SQL files or assumptions:

```bash
cd backend && python3 << 'EOF'
from app.services.sql_service import get_sql_service
result = get_sql_service().execute("DESCRIBE templates")
for row in result:
    print(f"{row['col_name']:30s} {row['data_type']}")
EOF
```

### 2. Field Name Mappings Must Be Documented

Create a clear mapping table in code comments:

```python
# API Field          Database Column
# --------------     ----------------
# prompt_template → user_prompt_template
# examples        → few_shot_examples
```

### 3. Runtime Config vs Stored Config

Not everything needs to be in the database:
- ✅ Store: Template structure, label types, examples
- ❌ Don't store: Model runtime params (temperature, max_tokens)
- Return defaults in API response

### 4. Use Automated Verification

Manual schema checks are error-prone. Automate it:
- Script: `schemas/verify_schema.py`
- CI/CD: Run verification before deployment
- Git hooks: Block bad commits

## Preventing Future Issues

### Daily Development

1. **Before touching schema code:**
   ```bash
   cd backend && python3 ../schemas/verify_schema.py
   ```

2. **When adding/modifying tables:**
   - Update SQL file
   - Run migration
   - Verify with `DESCRIBE table`
   - Update `SCHEMA_REFERENCE.md`
   - Update Pydantic models
   - Update API endpoints
   - Run verification script

3. **Before committing:**
   ```bash
   # Optionally install git hook
   cp .git-hooks/pre-commit.example .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

### Code Reviews

Check these when reviewing PRs:
- [ ] Schema verification passes
- [ ] SCHEMA_REFERENCE.md updated if schema changed
- [ ] Field mappings documented in code
- [ ] No hardcoded field names that don't exist in DB

## Files Created/Modified

### Created
- ✅ `schemas/SCHEMA_REFERENCE.md` - Complete schema documentation
- ✅ `schemas/verify_schema.py` - Automated verification
- ✅ `SCHEMA_MANAGEMENT.md` - Management guide
- ✅ `.git-hooks/pre-commit.example` - Optional git hook
- ✅ `SCHEMA_FIXES_2026_02_11.md` - This document

### Modified
- ✅ `schemas/03_templates.sql` - Fixed to match reality
- ✅ `backend/app/api/v1/endpoints/templates.py` - Fixed field mappings
- ✅ `backend/app/models/template.py` - Added documentation
- ✅ `README.md` - Added schema management link

## Testing

All tests pass:

```bash
# Schema verification
cd backend && python3 ../schemas/verify_schema.py
# ✅ PASS: All schema checks passed

# Template creation
curl -X POST http://localhost:8000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "prompt_template": "test {{input}}", ...}'
# Status: 201 Created ✅

# Template listing
curl http://localhost:8000/api/v1/templates
# Returns templates array ✅
```

## Summary

**Problem:** Schema mismatches causing 500 errors
**Root Cause:** Code used non-existent database columns
**Solution:** Fixed field mappings, documented schema, added verification
**Prevention:** Automated checks + comprehensive documentation
**Status:** ✅ All schema checks passing, templates working correctly
