# PCB Defect Detection Seed Data Plan

## Overview
Create realistic seed data to validate the complete defect detection workflow with canonical labels.

---

## Data Schema

### 1. Raw PCB Images Sheet (Unity Catalog Table)
**Table:** `pcb_inspection.raw_images`

```sql
CREATE TABLE IF NOT EXISTS pcb_inspection.raw_images (
  image_id STRING,
  image_path STRING,
  serial_number STRING,
  board_type STRING,
  inspection_date TIMESTAMP,
  line_id STRING,
  shift STRING,
  metadata STRING
);
```

**Sample Data (100 PCB images):**
- 70 boards with actual defects (solder_bridge: 15, cold_joint: 12, missing_component: 8, scratch: 10, discoloration: 15, other: 10)
- 30 boards that pass inspection
- Mix of board types: "Type-A Power Board", "Type-B Control Board", "Type-C Interface Board"
- Date range: Last 30 days
- Lines: Line-1, Line-2, Line-3
- Shifts: Morning, Afternoon, Night

---

### 2. Canonical Labels (Pre-seeded Expert Annotations)
**Purpose:** Simulate existing expert-validated labels covering ~30% of the dataset

**Pre-seed 30 canonical labels:**
- 15 labels for Type-A Power Boards (common defect patterns)
- 10 labels for Type-B Control Boards
- 5 labels for Type-C Interface Boards

**Label Structure:**
```json
{
  "sheet_id": "pcb_sheet_001",
  "item_ref": "PCB-A-12345",
  "label_type": "defect_detection",
  "label_data": {
    "defect_type": "solder_bridge",
    "location": "U12",
    "severity": "high",
    "component": "resistor_R47"
  },
  "confidence": "high",
  "labeled_by": "expert_inspector@mirion.com",
  "version": 1,
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

### 3. Prompt Template
**Template Name:** "PCB Defect Detection - Manufacturing QA"

```
You are an expert PCB quality inspector. Analyze the PCB image and identify any manufacturing defects.

Classify the board into one of these categories:
- **pass**: No defects detected, board meets quality standards
- **solder_bridge**: Excess solder creating unintended connection between pads
- **cold_joint**: Insufficient solder creating weak connection
- **missing_component**: Expected component is absent or improperly placed
- **scratch**: Physical damage to PCB surface or traces
- **discoloration**: Burnt or oxidized areas indicating thermal issues
- **other**: Other manufacturing defect not listed above

For each defect found, provide:
1. defect_type: One of the categories above
2. location: Component reference (e.g., "U12", "R47") or coordinate
3. severity: "high", "medium", or "low"
4. component: Affected component type (e.g., "resistor_R47", "IC_U12")

Return your response as JSON:
{
  "defect_type": "solder_bridge",
  "location": "U12",
  "severity": "high",
  "component": "resistor_R47",
  "reasoning": "Visible solder bridge between pins 2 and 3 of U12"
}

If the board passes inspection, return:
{
  "defect_type": "pass",
  "location": null,
  "severity": null,
  "component": null,
  "reasoning": "No defects detected, all solder joints appear clean"
}
```

---

## Seed Data SQL Scripts

### Script 1: Create Schema and Tables

```sql
-- Create schema
CREATE SCHEMA IF NOT EXISTS pcb_inspection;

-- Create raw images table
CREATE TABLE IF NOT EXISTS pcb_inspection.raw_images (
  image_id STRING PRIMARY KEY,
  image_path STRING,
  serial_number STRING,
  board_type STRING,
  inspection_date TIMESTAMP,
  line_id STRING,
  shift STRING,
  metadata STRING
);

-- Insert 100 sample PCB records
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_001', '/dbfs/pcb_images/A/001.jpg', 'PCB-A-001', 'Type-A Power Board', '2026-01-20T08:15:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01"}'),
  ('img_002', '/dbfs/pcb_images/A/002.jpg', 'PCB-A-002', 'Type-A Power Board', '2026-01-20T08:17:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01"}'),
  ('img_003', '/dbfs/pcb_images/A/003.jpg', 'PCB-A-003', 'Type-A Power Board', '2026-01-20T08:19:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01"}'),
  -- ... continue for 100 rows
  ('img_100', '/dbfs/pcb_images/C/100.jpg', 'PCB-C-034', 'Type-C Interface Board', '2026-02-05T22:45:00', 'Line-3', 'Night', '{"resolution": "4K", "camera": "CAM-03"}');
```

### Script 2: Seed Canonical Labels

```sql
-- Seed 30 canonical labels (30% coverage)
-- These represent expert-validated defect annotations

-- Solder bridges on Type-A Power Boards (common pattern)
INSERT INTO lakebase_db.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-001', 'defect_detection', 
   '{"defect_type": "solder_bridge", "location": "U12", "severity": "high", "component": "resistor_R47"}',
   'high', 'expert_inspector@mirion.com', '2026-01-15T10:30:00', '2026-01-15T10:30:00', 1, 0, 
   ARRAY('training', 'validation'), ARRAY('production_inference'), 'Standard solder bridge pattern on Type-A boards'),
   
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-015', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U8", "severity": "high", "component": "capacitor_C23"}',
   'high', 'expert_inspector@mirion.com', '2026-01-16T11:15:00', '2026-01-16T11:15:00', 1, 0,
   ARRAY('training', 'validation'), ARRAY(), 'Recurring solder bridge on U8'),

  -- Cold joints on Type-B Control Boards
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-005', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J3", "severity": "medium", "component": "connector_J3"}',
   'high', 'expert_inspector@mirion.com', '2026-01-17T09:00:00', '2026-01-17T09:00:00', 1, 0,
   ARRAY('training', 'validation'), ARRAY(), 'Cold joint on connector pins'),

  -- ... continue for 30 canonical labels covering common defect patterns
```

---

## Expected Canonical Label Coverage

### Pre-seeded (30 labels)
- **Type-A Power Boards:** 15 labels (covers ~21% of 70 Type-A boards)
- **Type-B Control Boards:** 10 labels (covers ~40% of 25 Type-B boards)  
- **Type-C Interface Boards:** 5 labels (covers ~100% of 5 Type-C boards)

### After GENERATE Phase (Bulk Lookup)
- 30 PCBs will **reuse canonical labels** (no VLM inference needed)
- 70 PCBs will require **new VLM inference**
- **Cost savings:** 30% reduction in VLM API calls

### After LABEL Phase (Human Review)
- Expect ~10 new canonical labels from high-quality human corrections
- Coverage increases to 40% (40 canonical labels / 100 PCBs)

---

## Workflow Validation Steps

### 1. DATA Page
**Action:** Create sheet pointing to `pcb_inspection.raw_images`

**Expected Result:**
- Sheet shows 100 PCB image records
- Preview displays image paths and metadata
- Canonical label stats section appears below table
- Stats show: "30 total labels (30% coverage)"

---

### 2. GENERATE Page
**Action:** 
1. Select PCB sheet
2. Choose prompt template: "PCB Defect Detection - Manufacturing QA"
3. Select model: Claude 3.5 Sonnet or GPT-4V
4. Run batch inference

**Expected Result:**
- Blue banner displays: "Canonical Labels Available: 30 expert-validated labels (30% coverage) · Avg 1.0x reuse"
- Backend performs **bulk lookup** for all 100 PCBs
- 30 PCBs match canonical labels → cyan "Canonical" badge appears
- 70 PCBs require VLM inference → purple "AI" badge appears
- Total assembly: 100 rows (30 canonical + 70 fresh inferences)
- User can click "Create Canonical Label" on any row with good AI prediction

**Validation:**
- Check `assembly.canonical_reused_count` = 30
- Verify only 70 VLM API calls were made (check logs)
- Confirm cyan badges appear on canonical label rows

---

### 3. LABEL Page
**Action:**
1. Load assembly from GENERATE page
2. Review AI predictions
3. Correct 5 misclassifications (e.g., AI said "pass" but expert sees "scratch")
4. Click "Save as Canonical Label" for 5 high-quality corrections

**Expected Result:**
- 5 new canonical labels created
- Total canonical labels: 30 → 35
- Coverage: 30% → 35%
- New canonical labels have `version=1`, `reuse_count=0`

**Validation:**
- Query `lakebase_db.canonical_labels` → should show 35 rows for sheet
- Verify `labeled_by` is current user
- Confirm `confidence` is set correctly

---

### 4. TRAIN Page
**Action:**
1. Select reviewed assembly (100 labeled PCBs)
2. Choose base model: Florence-2 or BLIP-2
3. Configure training: 10 epochs, learning rate 1e-5
4. Start fine-tuning job

**Expected Result:**
- Training job launches on GPU cluster
- Dataset includes all 100 labeled PCBs (35 canonical + 65 regular)
- Model trains with mixed data sources
- Training completes with validation metrics

**Validation:**
- Check training logs for dataset composition
- Verify model artifact saved to Unity Catalog
- Confirm evaluation metrics (accuracy, precision, recall)

---

### 5. DEPLOY Page
**Action:**
1. Register model: `pcb_models.defect_detector_v1`
2. Create Model Serving endpoint
3. Test endpoint with 3 sample PCBs

**Expected Result:**
- Endpoint deployed successfully
- REST API returns defect predictions
- Latency < 500ms per image

---

### 6. MONITOR Page
**Action:**
1. View deployed model metrics
2. Check accuracy, precision, recall
3. Monitor inference requests

**Expected Result:**
- Dashboard shows model performance
- Metrics calculated from test set
- No significant drift detected

---

### 7. IMPROVE Page (Second Iteration)
**Action:**
1. Collect 20 production edge cases (new defect patterns)
2. Add to training set
3. Create 5 new canonical labels for novel patterns
4. Retrain model

**Expected Result:**
- Total canonical labels: 35 → 40
- Coverage: 35% → 40%
- New assembly for iteration 2: 120 PCBs (40 canonical + 80 fresh)
- Model v2 has better edge case handling

---

## Success Metrics

### Canonical Label Reuse
- **Baseline (no canonical labels):** 100 VLM calls, $1.00 cost
- **With 30 canonical labels:** 70 VLM calls, $0.70 cost → **30% savings**
- **With 40 canonical labels (after iteration):** 60 VLM calls, $0.60 cost → **40% savings**

### Coverage Growth
- **Month 1:** 30 labels (30% coverage)
- **Month 2:** 40 labels (40% coverage) after first production iteration
- **Month 3:** 55 labels (55% coverage) after second iteration
- **Month 6:** 75 labels (75% coverage) as edge cases stabilize

### Quality Improvement
- Training data anchored by high-confidence canonical labels
- Consistent expert judgments across batches
- Reduced label noise in training set

---

## File Artifacts to Create

1. ✅ **DEFECT_DETECTION_WORKFLOW_VALIDATION.md** - Workflow validation document
2. 📝 **seed_pcb_data.sql** - SQL script to create schema and insert 100 PCB records
3. 📝 **seed_canonical_labels.sql** - SQL script to insert 30 pre-seeded canonical labels
4. 📝 **pcb_defect_prompt_template.json** - Prompt template JSON for import
5. 📝 **test_workflow.py** - Python script to automate end-to-end workflow testing
6. 📝 **generate_sample_images.py** - Script to generate placeholder PCB images (if needed)

---

## Next Steps

1. Create SQL seed scripts
2. Execute scripts in Databricks workspace
3. Import prompt template via UI or API
4. Run end-to-end workflow validation
5. Measure VLM cost savings with canonical label reuse
6. Document results and performance metrics
