# Seeding Sample Sheets Data

The DATA stage requires sheets (dataset definitions) to be useful. Here are the options for seeding sample data.

## Problem

The `sheets` table starts empty, making the DATA stage unusable until sheets are created.

## Solutions

### Option 1: SQL (Recommended - Most Reliable)

**File:** `schemas/seed_sheets.sql`

**Steps:**
1. Open Databricks SQL Editor
2. Connect to your SQL Warehouse
3. Copy entire contents of `schemas/seed_sheets.sql`
4. Run the SQL
5. Verify: Should see 5 sheets inserted

**Pros:**
- ✅ Most reliable (direct SQL insert)
- ✅ No dependencies on running backend
- ✅ No authentication issues
- ✅ Fast (< 5 seconds)

**Cons:**
- ❌ Requires manual copy-paste
- ❌ Need access to Databricks workspace

---

### Option 2: Via Backend API (If Backend Running)

**File:** `backend/scripts/seed_sheets_via_api.py`

**Steps:**
```bash
# 1. Ensure backend is running
cd backend
uvicorn app.main:app --reload

# 2. In another terminal, run seed script
cd backend
python scripts/seed_sheets_via_api.py
```

**Pros:**
- ✅ Programmatic (can be automated)
- ✅ Uses backend validation logic
- ✅ Good for development workflow

**Cons:**
- ❌ Requires backend to be running locally
- ❌ May timeout on slow connections

---

### Option 3: Via Databricks Notebook (For Production)

**File:** `backend/scripts/seed_sheets.py`

**Steps:**
1. Upload `seed_sheets.py` to Databricks workspace
2. Create a notebook
3. Run the Python script (creates a Databricks job)
4. Wait for job completion

**Pros:**
- ✅ Runs in Databricks (no local backend needed)
- ✅ Production-ready approach
- ✅ Works with proper authentication

**Cons:**
- ❌ More complex setup
- ❌ Requires cluster

---

## Sample Sheets Created

All options create the same 5 sample sheets:

| Name | Type | Use Case | Item Count |
|------|------|----------|------------|
| **PCB Defect Detection Dataset** | Volume | Vision AI (defect detection) | 150 |
| **Radiation Sensor Telemetry** | Table | Time series (anomaly detection) | 5,000 |
| **Medical Invoice Entity Extraction** | Table | Document AI + NER | 2,500 |
| **Equipment Maintenance Logs** | Table | Text classification | 1,200 |
| **Quality Control Inspection Photos** | Volume | Vision AI (QC) | 800 |

**Total:** 9,650 items across 5 diverse use cases

---

## Verification

After seeding, verify sheets exist:

**Via API:**
```bash
curl http://localhost:8000/api/v1/sheets-v2
```

**Via SQL:**
```sql
SELECT name, source_type, item_count, status
FROM your_catalog.ontos_ml_workbench.sheets;
```

**Via UI:**
1. Open http://localhost:5173
2. Navigate to DATA stage
3. Click "Browse & Create Sheets"
4. Should see 5 sheets listed

---

## Troubleshooting

### "Table not found"
- Ensure you've run `schemas/02_sheets.sql` to create the table first
- Verify catalog/schema names match your environment

### "Timeout on INSERT"
- SQL warehouse may be too slow
- Use Option 1 (SQL Editor) - most reliable
- Or use Option 3 (Databricks job) - bypasses warehouse

### "Authentication error" (API)
- Ensure backend is running: `uvicorn app.main:app --reload`
- Check `.env` file has correct Databricks credentials

### "No sheets showing in UI"
- Refresh the page (Ctrl+R)
- Check browser console for errors
- Verify API returns data: `curl http://localhost:8000/api/v1/sheets-v2`

---

## Next Steps

After seeding sheets:

1. **Browse in UI** - Navigate to DATA stage
2. **Select a Sheet** - Click to select for workflow
3. **Apply Template** - Move to GENERATE stage
4. **Create Training Sheet** - Generate Q&A pairs

The sheets provide diverse examples across:
- Vision AI (images)
- Document AI (PDFs + text)
- Time series (sensor data)
- Text classification (maintenance logs)

---

## Custom Sheets

To add your own sheets, use the API or SQL:

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/sheets-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Dataset",
    "description": "My dataset for XYZ use case",
    "source_type": "uc_table",
    "source_table": "catalog.schema.my_table",
    "item_id_column": "id",
    "text_columns": ["text_field"],
    "metadata_columns": ["created_at"],
    "sampling_strategy": "all",
    "status": "active"
  }'
```

**Via SQL:**
```sql
INSERT INTO sheets (
  id, name, description, source_type, source_table,
  item_id_column, text_columns, metadata_columns,
  sampling_strategy, status, created_at, created_by,
  updated_at, updated_by
) VALUES (
  'sheet-custom-001',
  'My Custom Dataset',
  'My dataset for XYZ use case',
  'uc_table',
  'catalog.schema.my_table',
  'id',
  ARRAY('text_field'),
  ARRAY('created_at'),
  'all',
  'active',
  CURRENT_TIMESTAMP(),
  'your.email@company.com',
  CURRENT_TIMESTAMP(),
  'your.email@company.com'
);
```

---

**Recommended:** Start with Option 1 (SQL) - it's the fastest and most reliable way to get sheets data for development.
