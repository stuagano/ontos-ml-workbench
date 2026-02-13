# Getting Started with VITAL Workbench

**App URL**: https://vital-workbench-fevm-v3-7474660127789418.aws.databricksapps.com

## First Time Setup

The app requires some demo data to work through the workflow. Here's how to set it up:

### 1. Seed Demo Data

The database starts empty. To populate it with sample templates and data:

**Option A: Via Databricks SQL Editor (Recommended)**

**Step 1: Create Tables**
```sql
-- Run this in Databricks SQL Editor
-- Connected to warehouse: 387bcda0f2ece20c
-- Location: schemas/create_tables.sql

-- This creates: templates, sheets, assemblies, assembly_rows tables
-- Copy the entire contents of schemas/create_tables.sql and run it
```

**Step 2: Seed Templates**
```sql
-- Run this in Databricks SQL Editor
-- Location: schemas/seed_templates.sql

-- Create sample templates
INSERT INTO erp_demonstrations.vital_workbench.templates (
  id, name, description, version, status,
  prompt_template, system_prompt,
  input_schema, output_schema, examples,
  base_model, temperature, max_tokens,
  created_by, created_at, updated_at
) VALUES (
  uuid(),
  'Document Classifier',
  'Classify documents into predefined categories',
  '1.0.0',
  'published',
  'Classify the following document: {document}\nCategories: {categories}',
  'You are a document classification expert.',
  '[]',
  '[]',
  '[]',
  'databricks-meta-llama-3-1-70b-instruct',
  0.7,
  1024,
  'admin',
  current_timestamp(),
  current_timestamp()
);

-- Add more templates as needed...
```

**Option B: Via Python Script (Local)**
```bash
cd backend
# Set environment variables
export DATABRICKS_HOST="https://fevm-serverless-dxukih.cloud.databricks.com"
export DATABRICKS_TOKEN="your-token-here"
export DATABRICKS_WAREHOUSE_ID="387bcda0f2ece20c"
export DATABRICKS_CATALOG="erp-demonstrations"
export DATABRICKS_SCHEMA="vital_workbench"

# Run seed script
python scripts/seed_demo_data.py
```

**Option C: Manually via UI**
1. Open the app
2. Navigate to TEMPLATE stage
3. Click "Create New"
4. Fill in template details:
   - Name: "My First Template"
   - Description: "Test template"
   - Prompt: "Analyze: {text}"
   - System Prompt: "You are a helpful AI"
   - Base Model: databricks-meta-llama-3-1-70b-instruct
5. Save

### 2. Workflow Overview

The VITAL Workbench follows a 7-stage AI development workflow:

```
DATA → TEMPLATE → CURATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

#### Stage Navigation Rules

You **must** complete each stage before moving forward:

| Stage | Required to Proceed | What to Select |
|-------|---------------------|----------------|
| **DATA** | Select a data source | Browse Unity Catalog and pick a table |
| **TEMPLATE** | Select a template | Choose a prompt template or create new |
| **CURATE** | Optional | Review AI-generated responses |
| **LABEL** | Optional | Assign labeling tasks |
| **TRAIN** | Optional | Configure fine-tuning |
| **DEPLOY** | Optional | Deploy model endpoint |
| **MONITOR** | Optional | View predictions |

**Important**: The workflow enforces stage order. If you see "No templates found" it means:
1. The database is empty (seed data first)
2. You haven't selected a data source yet (go back to DATA stage)

### 3. Typical First-Time Flow

**Step 1: DATA Stage**
1. Click "Browse & Create Sheets"
2. Browse Unity Catalog
3. Select catalog: `erp-demonstrations`
4. Select schema: `vital_workbench` (or any schema with tables)
5. Select a table (or create a new sheet)
6. Click "Select" - this unlocks TEMPLATE stage

**Step 2: TEMPLATE Stage**
1. Now you can navigate to TEMPLATE
2. Click "Browse & Create"
3. Select an existing template OR
4. Click "Create New" to build one
5. After selecting, you can proceed to CURATE

**Step 3: CURATE → TRAIN → DEPLOY**
1. Continue through remaining stages
2. Each stage is optional but follows the same pattern:
   - Browse existing items
   - Create/configure new items
   - Proceed when ready

## Understanding the UI

### Browse/Create Pattern

Every stage uses a consistent pattern:

```
┌─────────────────────────────────────┐
│  STAGE NAME                         │
├─────────────────────────────────────┤
│  [Browse & Create Button]           │  ← Click to start
├─────────────────────────────────────┤
│                                     │
│  Empty State or Selected Item Info  │
│                                     │
└─────────────────────────────────────┘
```

**Modal appears with two tabs:**
- **Browse Tab**: See existing items (tables, templates, jobs, etc.)
- **Create Tab**: Make something new

### Stage Breadcrumb

At the top, you'll see stage indicators:
```
DATA → TEMPLATE → CURATE → ...
 ✓      (current)   (locked)
```

- ✓ = Completed (has selection)
- Current = Active stage
- Locked = Cannot access until previous completed

### DataTable Views

All list views use the same DataTable component:
- **Search**: Filter items by name
- **Actions**: Click row actions (👁️ View, ✏️ Edit, 🗑️ Delete)
- **Sort**: Click column headers
- **Select**: Click row to choose item

## Troubleshooting

### "No templates found"

**Cause**: Database is empty OR you haven't selected a data source yet.

**Fix**:
1. Go back to DATA stage
2. Select a data source
3. Then navigate to TEMPLATE
4. If still empty, seed demo data (see section 1)

### "Cannot navigate to next stage"

**Cause**: Current stage requires a selection.

**Fix**:
- DATA stage: Select a table/sheet
- TEMPLATE stage: Select a template
- Other stages: Optional, can skip

### Templates appear but clicking doesn't work

**Cause**: JavaScript error or missing dependencies.

**Fix**:
1. Open browser console (F12)
2. Look for errors
3. Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
4. Clear browser cache

### API errors (500, 401, etc.)

**Cause**: Backend issue or auth problem.

**Fix**:
1. Check app logs:
   ```bash
   databricks apps logs vital-workbench-fevm-v3 --profile fe-vm-serverless-dxukih
   ```
2. Verify warehouse is running
3. Check catalog/schema permissions

## Demo Data Details

When you seed demo data, you get:

### Templates (4)
1. **Document Classifier** - Categorize documents
2. **Sentiment Analyzer** - Analyze customer feedback
3. **Entity Extractor** - Extract named entities
4. **Radiation Equipment Defect Classifier** - Mirion-specific use case

### Sample Sheets & Assemblies
- Radiation equipment inspection data
- 10 rows with prompt/response pairs
- Mixed AI-generated and human-verified labels

### Labeling Workflow
- 4 demo users (Alice, Bob, Carol, David)
- 1 active labeling job
- 2 tasks with assigned items

## Next Steps

Once you have demo data:

1. **Explore Stages**: Walk through DATA → TEMPLATE → CURATE
2. **Create Custom Templates**: Build templates for your use cases
3. **Import Real Data**: Connect to your Unity Catalog tables
4. **Train Models**: Use TRAIN stage to fine-tune
5. **Deploy**: Publish models to serving endpoints
6. **Monitor**: Track prediction quality

## Support

- **Documentation**: See README.md, CLAUDE.md
- **Performance**: See PERFORMANCE_OPTIMIZATION.md, DATA_LOADING_OPTIMIZATION.md
- **Deployment**: See DEPLOYMENT_SUCCESS.md

---

**Ready to start?**
1. Seed demo data
2. Select a data source in DATA stage
3. Pick a template in TEMPLATE stage
4. Explore the workflow!
