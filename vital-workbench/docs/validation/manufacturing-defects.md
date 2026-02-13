# Use Case Validation: Manufacturing Defect Detection

**Validation Date:** 2026-02-05  
**PRD Version:** v2.3  
**Status:** ✅ Validated - Mental Model Holds for Vision Use Cases

---

## Use Case Overview

**Goal:** Detect and classify defects in printed circuit boards (PCBs) on electronics assembly line

**Domain:** Electronics manufacturing  
**Data Type:** High-resolution images + sensor data + manufacturing metadata  
**Challenge:** Vision AI with multimodal context (image + sensors)

**Tasks:**
1. Defect classification (what defects are present)
2. Defect localization (where defects are located - bounding boxes)
3. Root cause analysis (why defects occurred - sensor correlation)
4. Pass/fail binary classification

---

## Source Data Structure

### Unity Catalog Table

```sql
CREATE TABLE manufacturing.quality.pcb_inspections (
  inspection_id STRING PRIMARY KEY,
  
  -- Image reference
  image_path STRING,  -- /Volumes/.../pcb_12345.jpg
  
  -- Manufacturing metadata
  board_id STRING,
  batch_id STRING,
  production_line STRING,
  station STRING,
  timestamp TIMESTAMP,
  
  -- Sensor data (critical for root cause)
  temperature_celsius FLOAT,     -- 245.3 (target: 250)
  solder_pressure_psi FLOAT,     -- 18.5
  conveyor_speed_mpm FLOAT,      -- 1.2
  humidity_percent FLOAT,        -- 45.2 (target: 40)
  
  -- Image metadata
  image_width_px INT,            -- 4096
  image_height_px INT,           -- 3072
  resolution_dpi INT,            -- 300
  lighting_conditions STRING,    -- UV + White LED
  camera_id STRING,              -- CAM-03
  
  -- Pre-computed features (legacy system)
  detected_components_count INT, -- 156
  solder_joint_count INT,        -- 312
  legacy_defect_flag BOOLEAN,    -- true/false
  legacy_confidence FLOAT,       -- 0.73
  
  -- Quality metadata
  operator_id STRING,
  shift STRING,                  -- Day/Night/Weekend
  uploaded_at TIMESTAMP
)
```

### Unity Catalog Volume

```
/Volumes/manufacturing/quality/pcb_images/
  ├── pcb_12345.jpg (4096x3072, 8MB)
  ├── pcb_12346.jpg
  └── ...
```

**Key Point:** Each inspection = image + sensor readings + manufacturing context

---

## Sheet Definition

```json
{
  "sheet_id": "sheet-pcb-defects-001",
  "name": "PCB Assembly Line - Batch 001",
  "description": "PCB inspections with defect examples",
  "primary_table": "manufacturing.quality.pcb_inspections",
  "secondary_sources": [
    {
      "type": "volume",
      "path": "/Volumes/manufacturing/quality/pcb_images",
      "join_key": "inspection_id"
    }
  ],
  "join_keys": ["inspection_id"],
  "filter_condition": "batch_id = 'BATCH-001' AND timestamp >= '2024-01-01'",
  "item_count": 5000
}
```

**✅ Validation:** Sheet concept works perfectly for vision + sensor fusion

---

## Canonical Labels (Multiple Labelsets)

### Same PCB Image, Four Different Labelsets

**Item:** `inspection_id = "insp-12345"`

#### Label 1: Defect Classification

```json
{
  "id": "cl-001",
  "sheet_id": "sheet-pcb-defects-001",
  "item_ref": "insp-12345",
  "label_type": "defect_classification",
  "label_data": {
    "defect_present": true,
    "defect_types": ["cold_solder", "misaligned_component"],
    "severity": "major",
    "affected_components": ["R45", "C12"],
    "repair_action": "rework_required"
  },
  "confidence": "high",
  "labeled_by": "quality_engineer@factory.com",
  "labeled_at": "2024-01-16T08:30:00Z",
  "notes": "Cold solder on R45. C12 misaligned but within tolerance.",
  "allowed_uses": ["training", "validation", "few_shot", "testing", "evaluation"],
  "prohibited_uses": [],
  "data_classification": "internal"
}
```

#### Label 2: Defect Localization (Bounding Boxes)

```json
{
  "id": "cl-002",
  "sheet_id": "sheet-pcb-defects-001",
  "item_ref": "insp-12345",
  "label_type": "defect_localization",
  "label_data": {
    "bounding_boxes": [
      {
        "defect_type": "cold_solder",
        "component": "R45",
        "bbox": {"x": 1024, "y": 768, "width": 128, "height": 96},
        "confidence": 0.95
      },
      {
        "defect_type": "misaligned_component",
        "component": "C12",
        "bbox": {"x": 2048, "y": 1536, "width": 256, "height": 192},
        "confidence": 0.88
      }
    ]
  },
  "confidence": "high",
  "labeled_by": "vision_engineer@factory.com",
  "labeled_at": "2024-01-16T09:15:00Z",
  "allowed_uses": ["training", "validation", "few_shot", "testing", "evaluation"],
  "prohibited_uses": [],
  "data_classification": "internal"
}
```

#### Label 3: Root Cause Analysis

```json
{
  "id": "cl-003",
  "sheet_id": "sheet-pcb-defects-001",
  "item_ref": "insp-12345",
  "label_type": "root_cause",
  "label_data": {
    "primary_cause": "temperature_deviation",
    "contributing_factors": ["humidity_high", "conveyor_speed_fast"],
    "sensor_anomalies": {
      "temperature_celsius": {"expected": 250.0, "actual": 245.3, "deviation": -4.7},
      "humidity_percent": {"expected": 40.0, "actual": 45.2, "deviation": 5.2}
    },
    "recommendations": [
      "Increase solder station temperature to 250°C",
      "Check humidity control system",
      "Reduce conveyor speed to 1.0 mpm"
    ]
  },
  "confidence": "medium",
  "labeled_by": "process_engineer@factory.com",
  "labeled_at": "2024-01-16T10:00:00Z",
  "notes": "Temperature low correlates with humidity spike.",
  "allowed_uses": ["few_shot", "testing", "evaluation"],
  "prohibited_uses": ["training"],
  "usage_reason": "Contains proprietary manufacturing process parameters",
  "data_classification": "confidential"
}
```

#### Label 4: Pass/Fail Binary Classification

```json
{
  "id": "cl-004",
  "sheet_id": "sheet-pcb-defects-001",
  "item_ref": "insp-12345",
  "label_type": "pass_fail",
  "label_data": {
    "quality_status": "fail",
    "pass_probability": 0.15,
    "fail_reason": "Critical defect - cold solder on power component"
  },
  "confidence": "high",
  "labeled_by": "quality_inspector@factory.com",
  "labeled_at": "2024-01-16T08:20:00Z",
  "allowed_uses": ["training", "validation", "few_shot", "testing", "evaluation"],
  "prohibited_uses": [],
  "data_classification": "internal"
}
```

**✅ Validation:**
- Multiple labelsets per image work perfectly
- Different experts label different aspects
- Different governance per labelset (root cause is confidential)
- VARIANT `label_data` handles bounding boxes, classifications, etc.

---

## Canonical Labeling UI (Vision)

**What Quality Engineer Sees:**

```
┌─────────────────────────────────────────────────────────┐
│ 📷 Image Viewer                                         │
│ [High-res PCB image: 4096x3072]                        │
│ Tools: [Zoom 5x] [Pan] [Draw Bbox] [Annotate]         │
│                                                          │
│ Existing Labels:                                        │
│ ✅ Defect Classification (labeled 2024-01-16)          │
│ ✅ Defect Localization (labeled 2024-01-16)            │
│ ✅ Root Cause (labeled 2024-01-16)                     │
│ ⚪ Pass/Fail (not labeled yet)                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📊 Manufacturing Context                                │
│                                                          │
│ Batch: BATCH-001          Station: SOLDER-03           │
│ Time: 2024-01-15 14:32:15                              │
│                                                          │
│ Sensor Data:                                            │
│ Temperature: 245.3°C ⚠️ (Target: 250°C) LOW            │
│ Pressure: 18.5 PSI ✅                                   │
│ Speed: 1.2 m/min ⚠️ (Target: 1.0) FAST                │
│ Humidity: 45.2% ⚠️ (Target: 40%) HIGH                 │
│                                                          │
│ Legacy System: Defect Flag = TRUE (conf: 0.73)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Label Type: [Defect Classification ▼]                   │
│                                                          │
│ Defect Types: ☑ Cold Solder  ☑ Misaligned Component   │
│ Severity: [Major ▼]                                     │
│ Components: [R45, C12]                                  │
│                                                          │
│ [Save Label] [Next]                                     │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ Image viewer with zoom/annotation tools
- ✅ Sensor data visible (anomalies highlighted)
- ✅ Multiple label types tracked
- ✅ Legacy system output shown for reference

**✅ Validation:** UI supports vision labeling with multimodal context

---

## Prompt Template (Vision + Multimodal)

```json
{
  "template_id": "tpl-pcb-defect-classification",
  "name": "PCB Defect Classifier v2",
  "label_type": "defect_classification",
  "system_prompt": "You are an expert PCB quality inspector.",
  "user_prompt_template": `Analyze PCB for defects.

**Image:** {image_path}

**Manufacturing Context:**
- Batch: {batch_id}, Station: {station}
- Timestamp: {timestamp}

**Sensor Readings:**
- Temperature: {temperature_celsius}°C (target: 250°C)
- Pressure: {solder_pressure_psi} PSI
- Speed: {conveyor_speed_mpm} m/min
- Humidity: {humidity_percent}%

**Component Info:**
- Detected: {detected_components_count}
- Solder Joints: {solder_joint_count}

**Legacy System:** Flag={legacy_defect_flag}, Conf={legacy_confidence}

Classify defects. Return JSON: {defect_present, defect_types[], severity, affected_components[], repair_action}`,
  "input_schema": [
    {"name": "image_path", "type": "image", "source": "volume.image_path"},
    {"name": "batch_id", "type": "string", "source": "table.batch_id"},
    {"name": "temperature_celsius", "type": "float", "source": "table.temperature_celsius"},
    {"name": "humidity_percent", "type": "float", "source": "table.humidity_percent"},
    // ... all other fields
  ],
  "output_schema": {
    "defect_present": "boolean",
    "defect_types": ["string"],
    "severity": "enum[critical,major,minor,cosmetic]",
    "affected_components": ["string"],
    "repair_action": "string"
  }
}
```

**✅ Validation:**
- Template specifies `label_type` for canonical label matching
- `input_schema` references both image (volume) and sensor data (table)
- Vision LLM gets full multimodal context

---

## Q&A Pair Generation

```python
# Generate Training Sheet
for item in sheet.get_items():
  row = item.get_data()
  
  # Check for canonical label
  canonical_label = canonical_labels.get(
    sheet_id=sheet_id,
    item_ref=row["inspection_id"],
    label_type="defect_classification"  # Match by label_type!
  )
  
  if canonical_label:
    response = canonical_label.label_data
    status = "labeled"
  else:
    prompt = template.format(**row)  # All fields: image + sensors + metadata
    response = vision_llm.generate(prompt, image=row["image_path"])
    status = "unlabeled"
  
  qa_pair = {
    "messages": [
      {
        "role": "user",
        "content": prompt,
        "attachments": [{"type": "image", "path": row["image_path"]}],
        "context": {
          "batch_id": row["batch_id"],
          "temperature_celsius": row["temperature_celsius"],
          "humidity_percent": row["humidity_percent"]
        }
      },
      {
        "role": "assistant",
        "content": response
      }
    ],
    "canonical_label_id": canonical_label.id if canonical_label else None,
    "status": status
  }
```

**✅ Validation:**
- Q&A pairs include image attachment
- Sensor/manufacturing context preserved
- Canonical label reuse works for vision

---

## Training Export (Vision Fine-Tuning)

**JSONL Format for FMAPI:**

```jsonl
{"messages": [
  {
    "role": "user",
    "content": "Analyze PCB.\n\nBatch: BATCH-001\nStation: SOLDER-03\nTemp: 245.3°C (low)\nHumidity: 45.2% (high)\nComponents: 156",
    "images": ["/Volumes/.../pcb_12345.jpg"]
  },
  {
    "role": "assistant",
    "content": "{\"defect_present\": true, \"defect_types\": [\"cold_solder\", \"misaligned_component\"], \"severity\": \"major\", \"affected_components\": [\"R45\", \"C12\"], \"repair_action\": \"rework_required\"}"
  }
]}
```

**✅ Validation:**
- Vision model gets image + sensor context
- Model learns: "low temp + high humidity → cold solder"
- Multimodal training works

---

## Real-World Manufacturing Scenarios

### Scenario 1: Multi-Shift Defect Patterns

**Day Shift (Week 1):**
- Label 500 images → Create 500 canonical labels
- Common defects: cold solder, misalignment

**Night Shift (Week 2):**
- Generate Training Sheet
- 200 images match day shift patterns → Pre-approved ✅
- 300 new defects → Need review

**Weekend Shift (Week 3):**
- Different patterns (equipment warm-up issues)
- 50 images match previous labels → Pre-approved ✅
- 450 new patterns → Need review

**✅ Validation:** Label reuse across shifts works

---

### Scenario 2: Multi-Station Coverage

**SOLDER-01 (Station 1):**
- Label 1000 images → Create canonical labels

**SOLDER-02 (Station 2) - Identical Equipment:**
- Generate Training Sheet
- 800 images match Station 1 patterns → Pre-approved ✅
- 200 new defects → Need review

**✅ Validation:** Label reuse across identical stations works

---

### Scenario 3: Root Cause Feedback Loop

**Production Issue:**
- Temperature drops → Cold solder defects spike
- Process engineer creates `root_cause` canonical labels
- Links temp < 248°C → cold solder

**Model Training:**
- Model learns sensor-defect correlation
- Prediction: "Temp 245°C → 85% probability cold solder"

**Deployment:**
- Model flags potential defects in real-time
- Alerts process engineer when temp drops
- **Prevents defects before they occur** ✅

**✅ Validation:** Sensor-defect correlation enables proactive prevention

---

## Vision-Specific Considerations

### 1. Bounding Box Annotations

**Challenge:** Store spatial annotations?

**Solution:** VARIANT `label_data` field

```json
{
  "label_type": "defect_localization",
  "label_data": {
    "bounding_boxes": [
      {"bbox": {"x": 1024, "y": 768, "width": 128, "height": 96}}
    ]
  }
}
```

**✅ Works:** VARIANT handles arbitrary JSON structures

---

### 2. Image Metadata

**Challenge:** Store resolution, lighting, camera info?

**Solution:** Already in source table

```sql
image_width_px INT,
image_height_px INT,
lighting_conditions STRING,
camera_id STRING
```

**✅ Works:** Multimodal table stores image metadata

---

### 3. Reference Image Comparison

**Challenge:** "This looks different from reference"

**Solution:** Join reference images in Sheet

```sql
SELECT 
  i.*,
  r.reference_image_path
FROM pcb_inspections i
JOIN reference_images r ON r.component_type = 'resistor'
```

**✅ Works:** Sheet joins reference images for comparison

---

### 4. Time-Series Sensor Data

**Challenge:** Defects correlate with sensor trends over time

**Solution:** Query historical data in template

```python
user_prompt_template = `
**Current:** Temp = {temperature_celsius}°C
**Trend:** {sensor_history_10min}
**Anomaly:** Dropped 8°C in 5 minutes
`
```

**✅ Works:** Template can query historical sensor data

---

## Mental Model Validation Results

### ✅ All Core Concepts Work

| Concept | Works for Vision? | Notes |
|---------|------------------|-------|
| **Sheets** | ✅ Yes | Multimodal fusion (images + sensors + metadata) |
| **Canonical Labels** | ✅ Yes | Multiple labelsets per image (4 different tasks) |
| **Multiple Labelsets** | ✅ Yes | Classification, localization, root cause, pass/fail |
| **Usage Constraints** | ✅ Yes | Root cause confidential, others trainable |
| **Multimodal Prompts** | ✅ Yes | Vision LLM gets image + sensor context |
| **Label Reuse** | ✅ Yes | Same defects across shifts/stations reuse labels |
| **Human-in-the-Loop** | ✅ Yes | Expert sees image + full context |

### ✅ No Breaking Changes Needed

The mental model holds perfectly for vision + sensor fusion use cases.

---

## Optional Enhancements (UI-Level Only)

### Vision-Specific UI Tools

```typescript
interface VisionLabelingUI {
  annotationTools: {
    drawBbox: boolean;        // Draw bounding boxes
    drawPolygon: boolean;     // Irregular shapes
    drawKeypoints: boolean;   // Mark specific points
  };
  
  imageControls: {
    zoom: number;             // 1x - 10x
    brightness: number;       // Enhance visibility
    contrast: number;
    filters: ["edge_detection", "threshold"]
  };
  
  comparison: {
    showReference: boolean;   // Side-by-side comparison
    showHistory: boolean;     // Compare to previous inspections
  };
}
```

**Note:** These are UI conveniences, not data model changes!

---

## Conclusion

**✅ Mental Model Validated for Manufacturing Defect Detection**

The PRD v2.3 data model successfully handles:
- ✅ Vision + sensor multimodal fusion
- ✅ Multiple labelsets per image (4 different tasks)
- ✅ Bounding box annotations (VARIANT field)
- ✅ Sensor-defect correlation (root cause analysis)
- ✅ Label reuse across shifts and stations
- ✅ Different governance per labelset
- ✅ Human-in-the-loop with full context
- ✅ Proactive defect prevention (sensor monitoring)

**No breaking changes needed.** The mental model is robust across document processing (medical invoices) and vision AI (manufacturing defects).

**Key Insight:** The multimodal architecture (Sheet → Unity Catalog table + volume) naturally extends from documents to images, and canonical labels work perfectly for vision tasks with multiple annotation types per image.
