# Workflow Gap Analysis - Missing Steps

## Current Page Mapping

| Navigation | Stage ID | Component | What It Actually Does |
|-----------|----------|-----------|----------------------|
| **Sheets** | `data` | DataPage (SheetBuilder) | Create/manage Sheets (Unity Catalog pointers) |
| **Prepare** | `curate` | CuratePage | Create Assembly + Generate/Review labels |
| **Review** | `label` | LabelingJobsPage | Enterprise labeling workflows (team task assignment) |
| **Train** | `train` | TrainPage | Fine-tune models |
| **Deploy** | `deploy` | DeployPage | Deploy models |
| **Monitor** | `monitor` | MonitorPage | Monitor performance |
| **Improve** | `improve` | ImprovePage | Continuous improvement |

## The Problem: CuratePage Does Too Much

**CuratePage currently handles:**
1. ✅ List/create Assemblies
2. ✅ Configure prompt template
3. ✅ Generate AI responses
4. ✅ Display generated responses
5. ✅ Human review/verification
6. ✅ Edit/correct responses
7. ✅ Flag problematic examples
8. ✅ Create canonical labels
9. ✅ Select examples for training (curation)

**This is 3-4 distinct stages crammed into one page!**

---

## Proposed Granular Workflow

### Option A: 5-Stage Split (Granular)

```
📊 Sheets      - Create and manage data sources
📝 Templates   - Create/attach prompt templates to Sheets
✨ Generate    - Generate responses (AI, manual, or pre-labeled)
✅ Verify      - Review and verify generated responses
🎯 Curate      - Select best examples for training
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

**What each stage does:**

1. **Sheets** - Define data sources from Unity Catalog
2. **Templates** - Create TemplateConfig and attach to Sheet
3. **Generate** - Create Assembly and populate responses via three modes:
   - Pre-labeled: Map from existing column
   - AI-generated: Run inference (with canonical label reuse)
   - Manual: Human annotators label from scratch
4. **Verify** - Human review of generated responses:
   - Correct AI predictions
   - Flag bad examples
   - Create canonical labels
   - Mark as verified
5. **Curate** - Final selection:
   - Filter verified examples
   - Split train/validation sets
   - Set usage constraints
   - Export for training
6. **Train** - Fine-tune models
7. **Deploy** - Deploy to production
8. **Monitor** - Track performance
9. **Improve** - Iterate based on feedback

---

### Option B: 4-Stage Split (Balanced) - **RECOMMENDED**

```
📊 Sheets      - Create and manage data sources
📝 Configure   - Configure prompts and label sources
✨ Label       - Generate/import/annotate labels
✅ Verify      - Review and approve labeled examples
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

**What each stage does:**

1. **Sheets** - Point to Unity Catalog data
2. **Configure** - Attach TemplateConfig (system prompt, template, response source mode)
3. **Label** - Create Assembly and get labels via:
   - Pre-labeled: Map from existing column → ready for Verify
   - AI-generated: Run inference → goes to Verify
   - Manual: Human annotation → goes to Verify
   - Shows canonical label reuse stats
4. **Verify** - Review and approve:
   - Correct AI predictions
   - Create canonical labels
   - Select examples for training
   - Flag bad examples
5. **Train** - Export verified examples and fine-tune
6-8. Deploy, Monitor, Improve

---

### Option C: 3-Stage Split (Minimal) - **CURRENT + TWEAKS**

```
📊 Sheets      - Create and manage data sources
✨ Prepare     - Label and prepare training examples (all-in-one)
✅ Review      - Enterprise labeling workflows (team assignment)
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

**Keep current architecture, just:**
- Move Templates tool into Prepare page workflow
- Add mode selector in Prepare page (pre-labeled / AI / manual)
- Keep Review for enterprise team labeling only

---

## What's Missing in Current Architecture

### Missing: Template Configuration as Workflow Step

**Current:** Templates are a separate **Tool** (overlay), not a workflow step
**Problem:** Users need to context-switch to create templates before preparing data

**Solution Options:**
1. Make Templates a workflow stage (Add page before Prepare)
2. Embed template configuration into Prepare page
3. Keep as Tool but add "attach template" step in Prepare

---

### Missing: Clear Separation of Label Generation vs. Verification

**Current:** CuratePage does both generation AND verification in one interface
**Problem:** Cognitive overload - users are simultaneously generating and reviewing

**Solution Options:**
1. Split into two pages: Label (generation) → Verify (review)
2. Add sub-navigation within CuratePage: "Generate" tab vs "Review" tab
3. Keep combined but add clearer mode indicators

---

### Missing: Curation/Selection Stage

**Current:** Selection of training examples happens ad-hoc in CuratePage
**Problem:** No dedicated step for finalizing the training set (train/val split, usage constraints, etc.)

**Solution Options:**
1. Add dedicated Curate page after Verify (selects final examples)
2. Handle in Train page (select examples before training)
3. Keep combined in Prepare/Verify

---

## Detailed 4-Stage Workflow (Recommended)

### 1. SHEETS Page
**Purpose:** Define data sources

**Actions:**
- Browse Unity Catalog
- Select table/volume
- Configure join keys (for multimodal)
- Preview data
- See canonical label stats

**Output:** Sheet object created

---

### 2. CONFIGURE Page (NEW)
**Purpose:** Attach TemplateConfig to Sheet

**Actions:**
- Select Sheet from previous stage
- Create/select prompt template:
  - System instruction
  - Prompt template with `{{column}}` placeholders
  - Response schema (optional)
- Choose response source mode:
  - ✅ Pre-labeled: Select existing column
  - ✅ AI-generated: Select model, temperature, etc.
  - ✅ Manual: Define label classes
- Save TemplateConfig attached to Sheet

**Output:** Sheet with TemplateConfig attached

---

### 3. LABEL Page (Renamed from "Prepare")
**Purpose:** Create Assembly and populate labels

**Mode A: Pre-labeled**
- Create Assembly
- Map existing column to responses
- Preview examples
- → Go to Verify

**Mode B: AI-generated**
- Create Assembly
- Run batch inference:
  - Bulk lookup canonical labels (30% reuse)
  - Generate AI predictions for remaining (70%)
- Display results with canonical badge
- Show generation stats
- → Go to Verify

**Mode C: Manual annotation**
- Create Assembly
- Launch annotation interface
- Human annotators label examples
- Track progress
- → Go to Verify

**Output:** Assembly with responses populated

---

### 4. VERIFY Page (Currently "Review")
**Purpose:** Human review and approval

**Actions:**
- Load Assembly from Label page
- Review each example:
  - View prompt + response
  - View source data
  - Edit/correct response
  - Mark as verified
  - Flag bad examples
- **Create canonical labels** for high-quality examples
- Filter/sort verified examples
- Select for training (optional: train/val split)

**Output:** Assembly with verified, curated examples ready for training

---

### 5. TRAIN Page
**Simplified:** Just exports and trains

**Actions:**
- Select Assembly from Verify
- Export to JSONL (only verified examples)
- Configure fine-tuning
- Start training job

---

## My Recommendation: Option B (4-Stage)

**Add one new page: CONFIGURE**

```
📊 Sheets      - Create and manage data sources
📝 Configure   - Configure prompts and label sources
✨ Label       - Generate/import/annotate labels
✅ Verify      - Review and approve labeled examples
🤖 Train       - Fine-tune models
🚀 Deploy, 📈 Monitor, 🔄 Improve
```

**Changes needed:**
1. Create new **ConfigurePage** for template attachment
2. Rename "Prepare" (curate) → **"Label"** (focuses on getting labels)
3. Keep "Review" → **"Verify"** (focuses on quality verification)
4. Split CuratePage into:
   - **LabelPage** (create Assembly, populate responses)
   - **VerifyPage** (review, correct, create canonical labels)

**Benefits:**
- Clear workflow progression
- Separation of concerns (configure → label → verify → train)
- Templates become part of main workflow
- Not too granular (4 stages instead of 5-9)

---

## Alternative: Keep Current but Add Sub-Navigation

If you don't want to add pages, add **sub-navigation within CuratePage**:

```
Prepare Page (CuratePage)

Tabs:
  1. Configure  - Attach template, choose mode
  2. Generate   - Create Assembly, populate labels
  3. Verify     - Review and correct labels
  4. Curate     - Select final training examples
```

**This keeps the same page but clarifies the workflow steps.**

---

## Questions for You

1. **Do you want Templates as a workflow stage or keep as a Tool?**
   - Workflow stage: Forces sequential flow (Sheets → Configure → Label)
   - Tool: Flexible, can create templates anytime

2. **Should Label and Verify be separate pages or tabs within one page?**
   - Separate pages: Clearer separation, more navigation
   - Tabs: Keeps related work together

3. **Do you need a dedicated Curate stage (select final examples)?**
   - Yes: Add 5th stage for final selection/curation
   - No: Handle in Verify or Train page

4. **What about the enterprise LabelingJobsPage?**
   - Keep as separate "Review" stage for team workflows
   - Merge with Verify page
   - Move to Tools section

Let me know what resonates with you and I'll implement it!
