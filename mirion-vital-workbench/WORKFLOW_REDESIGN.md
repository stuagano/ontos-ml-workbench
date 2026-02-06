# VITAL Workbench - Workflow Redesign

## Core Insight

**Current confusion:** "Template" is in the workflow stages, but it's actually a **tool/asset**, not a workflow step.

**The workflow stages should be ACTIONS on data, not asset management.**

## Proposed Structure

### A. Workflow Stages (Main Pipeline)
**These are the steps you take to build a model**

```
DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
```

### B. Tools Section (Asset Management)
**These are reusable resources you create/manage**

```
TOOLS:
  - Prompt Templates
  - Agent Configurations  
  - Example Store
  - Model Registry
```

---

## Detailed Stage Redesign

### Stage 1: DATA
**Purpose:** Define what data you're working with

**Old name:** DATA ✅ (correct)

**User action:**
- Browse Unity Catalog tables
- Select primary data source
- Optional: Add secondary sources (images, telemetry) for multimodal
- Define join keys
- Preview merged dataset

**Output:** Sheet record (dataset definition)

**UI Label:** "Data Sources"

---

### Stage 2: GENERATE (formerly "CURATE")
**Purpose:** Generate Q&A training pairs

**Old name:** CURATE ❌ (wrong - curate means review/clean, not create)

**New name:** GENERATE ✅ (what you're actually doing)

**User action:**
1. **Select Sheet** (from DATA stage)
2. **Select Prompt Template** (from Tools)
3. **Configure Generation:**
   - Mode: AI-generated, Manual labeling, or Use existing column
   - If AI: Which model to use for generation
   - Sample size (how many rows to process)
   - Preview first few examples
4. **Click "Generate Q&A Pairs"**
5. **Watch Assembly Progress**

**Output:** Assembly with N Q&A pairs

**What happens under the hood:**
```python
For each row in Sheet:
  1. Fetch data (multimodal join if needed)
  2. Fill template placeholders
  3. Generate response (AI or use existing column)
  4. Create Q&A pair:
     {
       messages: [
         {role: "system", content: template.system_prompt},
         {role: "user", content: filled_user_prompt},
         {role: "assistant", content: response}
       ]
     }
  5. Store in Assembly
```

**UI Components:**

**Top Section - Configuration:**
```
┌─────────────────────────────────────────────────────┐
│ Generate Q&A Training Pairs                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Data Source:                                     │
│    [Select Sheet ▼] → "Iris Flower Multimodal"    │
│    └─ 12 rows available                            │
│                                                     │
│ 2. Prompt Template:                                 │
│    [Select Template ▼] → "Flower Classifier"      │
│    └─ Preview template                             │
│                                                     │
│ 3. Response Mode:                                   │
│    ◉ AI Generate (using Llama 3.1 70B)            │
│    ○ Manual Labeling (human provides response)     │
│    ○ Use Existing Column: [Select column ▼]       │
│                                                     │
│ 4. Sample Size:                                     │
│    ▓▓▓▓▓▓▓▓▓▓ 12 / 12 rows                        │
│    ☑ Include all rows                              │
│                                                     │
│ 5. Preview:                                         │
│    ┌──────────────────────────────────────┐       │
│    │ Example Q&A Pair #1:                 │       │
│    │                                      │       │
│    │ User: "Classify this flower...      │       │
│    │        Species: Setosa              │       │
│    │        Sepal: 5.1cm x 3.5cm..."     │       │
│    │                                      │       │
│    │ Assistant: {"name": "Iris Setosa", │       │
│    │            "confidence": 0.95}      │       │
│    └──────────────────────────────────────┘       │
│                                                     │
│    [← Back]  [Generate Q&A Pairs →]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Progress View (after clicking Generate):**
```
┌─────────────────────────────────────────────────────┐
│ ⚙️  Generating Q&A Pairs...                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Assembly: assembly-2026-02-05-001                   │
│                                                     │
│ Progress: ▓▓▓▓▓▓▓░░░░░ 7 / 12 rows (58%)          │
│                                                     │
│ ✓ Generated 7 pairs                                │
│ ⚙️  Processing row 8...                            │
│ ⏳ Waiting for 4 more                              │
│                                                     │
│ [View Generated Pairs] [Cancel]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Success View (after completion):**
```
┌─────────────────────────────────────────────────────┐
│ ✅ Q&A Pairs Generated Successfully                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Assembly: assembly-2026-02-05-001                   │
│                                                     │
│ ✓ 12 Q&A pairs generated                           │
│ ✓ 12 AI-generated (100%)                           │
│ ✓ 0 flagged for review (0%)                        │
│                                                     │
│ Next Steps:                                         │
│ • Review and label pairs (LABEL stage)             │
│ • Export and train model (TRAIN stage)             │
│                                                     │
│ [← Generate More]  [Review Pairs →]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Stage 3: LABEL (formerly "CURATE" or "LABEL")
**Purpose:** Review, edit, and approve Q&A pairs

**Old name:** CURATE or LABEL (mixed usage)

**New name:** LABEL ✅ (clear - you're labeling/reviewing)

**User action:**
1. **Select Assembly** (from GENERATE stage)
2. **Review each Q&A pair:**
   - See the prompt (user message)
   - See the response (assistant message)
   - Actions:
     - ✓ Approve (keep as-is)
     - ✏️ Edit (fix the response)
     - ❌ Reject (remove from training set)
     - 🚩 Flag (mark for expert review)
3. **Track progress:**
   - X approved / Y total
   - Quality score
4. **Complete when done**

**Output:** Curated Assembly ready for training

**UI Label:** "Label & Review"

---

### Stage 4: TRAIN
**Purpose:** Export Assembly and fine-tune model

**Old name:** TRAIN ✅ (correct)

**User action:**
1. **Select Assembly** (curated from LABEL stage)
2. **Configure Training:**
   - Train/validation split (80/20)
   - Base model selection
   - Hyperparameters (epochs, learning rate)
   - Training job name
3. **Export to JSONL** (preview format)
4. **Submit FMAPI Job**
5. **Monitor Progress**

**Output:** Fine-tuned model in registry

---

### Stages 5-7: DEPLOY → MONITOR → IMPROVE
**Keep as-is** ✅

---

## Tools Section Design

### Location
**New top-level section in sidebar**

```
LIFECYCLE:
  📊 Data
  ⚡ Generate
  ✓ Label
  🎯 Train
  🚀 Deploy
  📈 Monitor
  🔄 Improve

TOOLS:
  📝 Prompt Templates
  🤖 Agent Configs
  💎 Example Store
  📦 Model Registry
```

### Tool: Prompt Templates

**Purpose:** Create and manage reusable prompt templates

**Page Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Prompt Templates                      [+ Create New]│
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Search templates...] [Status: All ▼] [Refresh]    │
│                                                     │
│ ┌─────────────────────────────────────────┐       │
│ │ DataTable with 7 templates              │       │
│ │                                          │       │
│ │ Name              Status     Model       │       │
│ │ Defect Classifier Published  Llama 70B  │       │
│ │ Flower Classifier Published  Llama 8B   │       │
│ │ Sentiment...      Draft      Llama 70B  │       │
│ │                                          │       │
│ └─────────────────────────────────────────┘       │
│                                                     │
│ Actions (right-click menu):                        │
│ • View Details                                      │
│ • Edit                                              │
│ • Duplicate                                         │
│ • Publish / Archive                                 │
│ • Delete                                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key Point:** Templates are **NOT** part of the workflow. They're assets you create and reuse.

---

## Workflow Summary

### The User Journey

```
┌──────────────────────────────────────────────────────────┐
│ "I want to train a defect detection model"              │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 1: DATA - "I have inspection images + sensor data" │
├──────────────────────────────────────────────────────────┤
│ Action: Create Sheet (dataset definition)               │
│ Output: Sheet "Defect Dataset" pointing to data         │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 2: GENERATE - "Create training examples"           │
├──────────────────────────────────────────────────────────┤
│ Action: Select Sheet + Select Template → Generate       │
│         "Defect Dataset" + "Defect Classifier Template" │
│ Output: Assembly with 1000 Q&A pairs                    │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 3: LABEL - "Review and approve examples"           │
├──────────────────────────────────────────────────────────┤
│ Action: Review each Q&A pair, approve/edit/reject       │
│ Output: Curated Assembly (950 approved, 50 rejected)    │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 4: TRAIN - "Fine-tune the model"                   │
├──────────────────────────────────────────────────────────┤
│ Action: Export Assembly → Submit FMAPI job              │
│ Output: Fine-tuned model "defect-v1" in registry        │
└──────────────────────────────────────────────────────────┘
```

### Template Creation (Separate Flow)

```
┌──────────────────────────────────────────────────────────┐
│ "I need a new prompt template for my use case"          │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Navigate to: TOOLS → Prompt Templates                   │
├──────────────────────────────────────────────────────────┤
│ Click: [+ Create New]                                   │
│                                                          │
│ Fill out:                                                │
│ • Name: "Defect Classifier"                             │
│ • System prompt: "You are an expert..."                 │
│ • User prompt: "Analyze {{equipment_id}}..."            │
│ • Output schema: {defect: bool, type: string}           │
│ • Model: Llama 3.1 70B                                  │
│                                                          │
│ Save → Template now available in library                │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Later: Use this template in GENERATE stage              │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Navigation Restructure

**Changes:**
1. Remove "Template" from workflow stages sidebar
2. Add "TOOLS" section to sidebar
3. Move "Prompt Templates" under TOOLS
4. Rename "Template" stage to something else OR remove entirely

**New Sidebar:**
```
LIFECYCLE
├─ 📊 Data
├─ ⚡ Generate          ← RENAMED from "Curate"
├─ ✓ Label
├─ 🎯 Train
├─ 🚀 Deploy
├─ 📈 Monitor
└─ 🔄 Improve

TOOLS
├─ 📝 Prompt Templates  ← MOVED from workflow
├─ 💎 Example Store
└─ 🤖 DSPy Optimizer
```

### Phase 2: Generate Page Redesign

**File:** `CuratePage.tsx` → Rename to `GeneratePage.tsx`

**Sections:**
1. **Configuration Panel** (top)
   - Sheet selector
   - Template selector
   - Response mode (AI/Manual/Column)
   - Sample size
   - Preview

2. **Action Button**
   - "Generate Q&A Pairs" (primary CTA)

3. **Progress View** (appears after generate)
   - Assembly ID
   - Progress bar
   - Row counts
   - Cancel button

4. **Assembly Browser** (if no assembly selected)
   - DataTable of existing assemblies
   - Filter by sheet, template, status
   - Select to view/edit

### Phase 3: Label Page Clarification

**File:** `CuratePage.tsx` or separate `LabelPage.tsx`

**Purpose:** Review and approve Q&A pairs from an Assembly

**Clear separation:**
- GENERATE creates assemblies
- LABEL reviews assemblies

---

## Key Terminology Changes

| Old Term | New Term | Reason |
|----------|----------|--------|
| Template (stage) | (moved to Tools) | Not a workflow step |
| Curate | Generate | Better describes the action |
| Template | Prompt Template | Clearer what it is |
| Assembly | Assembly OR "Q&A Dataset" | Keep or add friendly name |

---

## Questions for User

### 1. Stage Name: GENERATE vs ASSEMBLE?
**Options:**
- A) GENERATE (what you're doing: generating Q&A pairs)
- B) ASSEMBLE (technical term: assembling dataset)
- C) CREATE (simple, but generic)

**My vote:** GENERATE ⭐

### 2. Should LABEL be separate from GENERATE?
**Options:**
- A) Yes - GENERATE creates, LABEL reviews (2 stages)
- B) No - GENERATE includes review mode (1 stage)

**My vote:** Yes - Separate stages ⭐

### 3. What goes in TOOLS?
**Current:**
- Prompt Templates ✓
- Example Store ✓
- DSPy Optimizer ✓

**Should we add:**
- Model Registry?
- Agent Configurations?
- Dataset Browser? (or keep in DATA stage)

### 4. GENERATE page: Default mode?
When user lands on GENERATE:
- A) Show configuration form (select sheet + template)
- B) Show existing assemblies browser
- C) Both (split screen)

**My vote:** Show configuration form, with "Browse Existing" button ⭐

---

## Next Steps

1. ✅ **Approve design** - Does this structure make sense?
2. **Implement navigation** - Move Template to TOOLS
3. **Rename CuratePage** → GeneratePage
4. **Update routing** - Workflow stages + Tools section
5. **Test end-to-end** - Create Assembly from DATA → GENERATE → LABEL → TRAIN
