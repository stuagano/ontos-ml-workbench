# Schema Management Guide

**Goal:** Prevent schema mismatches between database, API, and frontend

## Problem

Schema mismatches cause 500 errors and wasted debugging time. Common issues:
- Code uses field names that don't exist in database
- Database schema changes without updating code
- Multiple conflicting schema definitions

## Solution: Single Source of Truth

The **database** is the source of truth. All code must match the database schema.

## Quick Start

### 1. Before Making Changes

```bash
# Verify current schema
cd backend && python3 ../schemas/verify_schema.py
```

### 2. When Adding/Modifying Tables

```bash
# 1. Create/update the SQL file
vim schemas/XX_tablename.sql

# 2. Run migration on database
# (Your migration process here)

# 3. Verify the change took effect
cd backend && python3 << 'EOF'
from app.services.sql_service import get_sql_service
sql = get_sql_service()
result = sql.execute("DESCRIBE tablename")
for row in result:
    print(f"{row['col_name']:30s} {row['data_type']}")
EOF

# 4. Update SCHEMA_REFERENCE.md
vim schemas/SCHEMA_REFERENCE.md

# 5. Update Pydantic models if needed
vim backend/app/models/tablename.py

# 6. Update API endpoints if needed
vim backend/app/api/v1/endpoints/tablename.py

# 7. Verify everything matches
cd backend && python3 ../schemas/verify_schema.py
```

## File Locations

| File | Purpose |
|------|---------|
| `schemas/SCHEMA_REFERENCE.md` | Human-readable schema documentation |
| `schemas/verify_schema.py` | Automated schema verification |
| `schemas/XX_*.sql` | SQL DDL statements (source of truth for structure) |
| `backend/app/models/*.py` | Pydantic models (API contracts) |
| `backend/app/api/v1/endpoints/*.py` | API endpoint implementations |
| `frontend/src/types/index.ts` | TypeScript type definitions |

## Common Field Mappings

### templates table

| API Field | Database Column | Notes |
|-----------|----------------|-------|
| `prompt_template` | `user_prompt_template` | ⚠️ Different name |
| `base_model` | (not stored) | Default: `databricks-meta-llama-3-1-70b-instruct` |
| `temperature` | (not stored) | Default: `0.7` |
| `max_tokens` | (not stored) | Default: `1024` |
| `examples` | `few_shot_examples` | Stored as `ARRAY<STRING>` |
| `output_schema` | `output_schema` | Stored as JSON `STRING` |

### sheets table

| API Field | Database Column | Notes |
|-----------|----------------|-------|
| `source_table` | `source_table` | ✅ Same name |
| `columns` | (deprecated) | Use `text_columns`, `image_columns` instead |
| `primary_table` | (deprecated) | Use `source_table` instead |
| `template_config` | (deprecated) | Templates now separate |

### canonical_labels table

| API Field | Database Column | Notes |
|-----------|----------------|-------|
| `label_value` | `label_data` | ⚠️ Different name, JSON string |
| `created_at` | `labeled_at` | ⚠️ Different name |
| `created_by` | `labeled_by` | ⚠️ Different name |

## Verification Checklist

Before committing changes that touch database schema:

- [ ] Run `python3 schemas/verify_schema.py` - all checks pass
- [ ] Updated `schemas/SCHEMA_REFERENCE.md`
- [ ] Updated relevant Pydantic models
- [ ] Updated API endpoint field mappings
- [ ] Tested API endpoints with actual database
- [ ] Updated TypeScript types if frontend affected
- [ ] No hardcoded field names that don't exist in DB

## Common Mistakes

### ❌ Mistake 1: Using API field names in SQL

```python
# WRONG - prompt_template doesn't exist in DB
sql = f"INSERT INTO templates (prompt_template) VALUES ('{value}')"
```

**Fix:** Use actual database column name

```python
# CORRECT
sql = f"INSERT INTO templates (user_prompt_template) VALUES ('{value}')"
```

### ❌ Mistake 2: Expecting runtime config in DB

```python
# WRONG - these don't exist
sql = f"SELECT temperature, max_tokens FROM templates WHERE id = '{id}'"
```

**Fix:** Use defaults in API response

```python
# CORRECT
return TemplateResponse(
    ...
    base_model="databricks-meta-llama-3-1-70b-instruct",
    temperature=0.7,
    max_tokens=1024
)
```

### ❌ Mistake 3: Outdated SQL schema files

```sql
-- WRONG - old schema file with fields that don't exist
CREATE TABLE templates (
    model_name STRING,  -- Doesn't exist!
    temperature DOUBLE,  -- Doesn't exist!
    ...
)
```

**Fix:** Verify SQL files match actual database

```bash
# Check what's actually in the database
cd backend && python3 << 'EOF'
from app.services.sql_service import get_sql_service
result = get_sql_service().execute("DESCRIBE templates")
for row in result:
    print(f"{row['col_name']:30s} {row['data_type']}")
EOF

# Then update the SQL file to match
```

## When Errors Occur

### 500 Internal Server Error - Column doesn't exist

```
KeyError: 'prompt_template'
# or
databricks.sql.exc.ServerOperationError: COLUMN_NOT_FOUND
```

**Diagnosis:**
1. Check backend logs for the actual SQL query
2. Verify the column name in the database
3. Update code to use correct column name

**Quick Fix:**
```bash
cd backend && python3 << 'EOF'
from app.services.sql_service import get_sql_service
result = get_sql_service().execute("DESCRIBE templates")
print("Actual columns in templates:")
for row in result:
    print(f"  - {row['col_name']}")
EOF
```

### Template Creation Fails

**Diagnosis:**
```bash
# Check what the INSERT query is trying to use
# Look in backend logs for the actual SQL

# Compare with actual table schema
cd backend && python3 ../schemas/verify_schema.py
```

## Best Practices

1. **Always verify after changes**
   - Run `verify_schema.py` after schema changes
   - Test API endpoints with actual database
   - Check both read and write operations

2. **Document field mappings**
   - Add comments in Pydantic models showing mappings
   - Update SCHEMA_REFERENCE.md
   - Add inline comments in API endpoint code

3. **Use constants for field names**
   ```python
   # Good practice
   DB_COLUMN_PROMPT = "user_prompt_template"
   sql = f"SELECT {DB_COLUMN_PROMPT} FROM templates"
   ```

4. **Grep for field usage before renaming**
   ```bash
   # Before renaming a field, find all uses
   grep -r "prompt_template" backend/
   ```

## Maintenance

### Weekly

- Run `verify_schema.py` to catch drift
- Review deprecated fields for removal

### Before Releases

- Full schema verification
- API integration tests
- Frontend type checking

### After Database Changes

- Immediate verification
- Update all documentation
- Test affected endpoints

## Resources

- `schemas/SCHEMA_REFERENCE.md` - Complete schema documentation
- `schemas/verify_schema.py` - Automated verification script
- Backend logs: `/tmp/backend.log`
- Databricks SQL Warehouse: [Link to your warehouse]

## Getting Help

If you encounter schema mismatches:

1. Check `schemas/SCHEMA_REFERENCE.md` for correct schema
2. Run `verify_schema.py` to identify the problem
3. Review this guide for common mistakes
4. Check backend logs for the actual SQL being executed
