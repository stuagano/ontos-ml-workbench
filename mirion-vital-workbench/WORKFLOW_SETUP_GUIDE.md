# Fixing "No Templates Found" Issue

## The Problem

You're seeing "No templates found" and can't step through the workflow because:

1. **Database is empty** - No templates have been created yet
2. **Workflow enforcement** - The app requires completing each stage in order:
   - DATA stage: Must select a data source
   - TEMPLATE stage: Must select a template
   - Cannot skip ahead until previous stage complete

## The Solution

### Quick Fix (5 minutes)

**Step 1: Create Tables via SQL**

1. Open Databricks SQL Editor
2. Connect to warehouse: `387bcda0f2ece20c`
3. Copy and run `schemas/create_tables.sql`
4. This creates the required tables (templates, sheets, assemblies, etc.)
5. Verify tables created: should see 4 tables in output

**Step 2: Seed Templates via SQL**

1. In the same SQL Editor
2. Copy and run `schemas/seed_templates.sql`
3. This inserts 4 demo templates into the templates table

**Step 3: Walk Through Workflow**

1. **DATA Stage**
   - Click "Browse & Create Sheets"
   - Browse Unity Catalog
   - Select any catalog → schema → table
   - Click "Select"
   - ✅ DATA stage complete

2. **TEMPLATE Stage**
   - Now you can navigate to TEMPLATE
   - Click "Browse & Create"
   - See the 4 templates you just created
   - Select one (e.g., "Document Classifier")
   - ✅ TEMPLATE stage complete

3. **Continue Workflow**
   - Now you can navigate through CURATE → LABEL → TRAIN → DEPLOY
   - Each stage follows the same pattern

## Understanding Workflow Stages

```
┌─────────────────────────────────────────────────┐
│ Stage Flow (enforced order)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  DATA → TEMPLATE → CURATE → LABEL → TRAIN      │
│   ✓       ✓          •        •        •       │
│                                                 │
│  ✓ = Completed (has selection)                 │
│  • = Current or available                      │
│  ⊘ = Locked (previous stage incomplete)        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Stage Requirements

| Stage | Required? | What You Need |
|-------|-----------|---------------|
| **DATA** | Yes | Select a UC table or create sheet |
| **TEMPLATE** | Yes | Select or create a prompt template |
| **CURATE** | Optional | Review AI responses (can skip) |
| **LABEL** | Optional | Assign labeling tasks (can skip) |
| **TRAIN** | Optional | Configure fine-tuning (can skip) |
| **DEPLOY** | Optional | Deploy endpoint (can skip) |
| **MONITOR** | Optional | View predictions (can skip) |

### Why This Design?

The workflow enforces **data → prompt → process** order because:

1. **DATA first**: Need source data before anything else
2. **TEMPLATE second**: Need prompt before generating responses
3. **Rest optional**: CURATE, LABEL, TRAIN are iterative improvements

This prevents issues like:
- Selecting template before data source
- Starting training without data
- Deploying without a model

## Seed Scripts Available

### Option 1: SQL Scripts (Fastest)
```bash
# Step 1 - Create tables
# Location: schemas/create_tables.sql
# Creates: templates, sheets, assemblies, assembly_rows

# Step 2 - Seed demo data
# Location: schemas/seed_templates.sql
# Creates: 4 demo templates
```

### Option 2: Python Script
```bash
# Location: backend/scripts/seed_demo_data.py
# Requires local env setup
cd backend
export DATABRICKS_HOST="https://fevm-serverless-dxukih.cloud.databricks.com"
export DATABRICKS_TOKEN="your-token"
export DATABRICKS_WAREHOUSE_ID="387bcda0f2ece20c"
python scripts/seed_demo_data.py
```

### Option 3: Manual via UI
1. Open app
2. Go to TEMPLATE stage
3. Click "Create New"
4. Fill form and save

## Demo Templates Included

After seeding, you'll have:

1. **Document Classifier**
   - Status: Published
   - Use case: Categorize documents
   - Model: Llama 3.1 70B

2. **Sentiment Analyzer**
   - Status: Published
   - Use case: Analyze customer feedback
   - Model: Llama 3.1 8B

3. **Entity Extractor**
   - Status: Draft
   - Use case: Extract named entities
   - Model: Llama 3.1 70B

4. **Radiation Equipment Defect Classifier**
   - Status: Published
   - Use case: Mirion-specific defect detection
   - Model: Llama 3.1 70B

## Verify Setup

After seeding, verify it worked:

```sql
-- Run in SQL Editor
SELECT id, name, status, base_model, created_at
FROM erp_demonstrations.vital_workbench.templates
ORDER BY created_at DESC;
```

Should return 4 rows.

## Troubleshooting

### Still seeing "No templates found"?

1. **Check cache**: Hard refresh browser (Cmd+Shift+R)
2. **Check database**: Run verify query above
3. **Check logs**:
   ```bash
   databricks apps logs vital-workbench-fevm-v3 --profile fe-vm-serverless-dxukih | grep template
   ```

### Can't navigate to TEMPLATE stage?

1. **Go back to DATA**: Select a data source first
2. **Check breadcrumb**: DATA stage should show ✓
3. **Refresh page**: Sometimes state gets stale

### Templates created but can't select?

1. **Check status**: Only "published" templates shown by default
2. **Use filter**: Change status filter in modal
3. **Check console**: F12 → Console tab for JavaScript errors

## Next Steps

Once templates are seeded and you've selected data + template:

1. **Explore CURATE**: Review AI-generated responses
2. **Try LABEL**: Set up labeling workflows
3. **Configure TRAIN**: Fine-tune models
4. **Deploy**: Publish to serving endpoints

See `GETTING_STARTED.md` for full tutorial.

---

**TL;DR:**
1. Run `schemas/create_tables.sql` in SQL Editor (creates tables)
2. Run `schemas/seed_templates.sql` in SQL Editor (adds demo templates)
3. Select data source in DATA stage
4. Select template in TEMPLATE stage
5. Continue through workflow!
