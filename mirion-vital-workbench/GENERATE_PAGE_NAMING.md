# Generate Page Naming - Supports Multiple Modes

## The Problem

**Current Label:** "Generate" - "Generate AI labels and responses"

**Reality:** The page (CuratePage) supports **three labeling modes**:

```typescript
enum ResponseSourceMode {
  EXISTING_COLUMN    // Pre-labeled data (Workflow A: ready for training)
  AI_GENERATED       // AI suggests labels, human reviews (Workflow B)
  MANUAL_LABELING    // Human annotators provide labels (Workflow B)
}
```

**"Generate" is too narrow** - it implies only AI generation, but the page also handles:
- ✅ Pre-labeled QA pairs from existing columns (no generation needed)
- ✅ AI-generated labels (canonical label reuse + fresh generation)
- ✅ Manual human labeling (annotation from scratch)
- ✅ Hybrid: AI suggestions + human corrections

---

## What This Page Actually Does

The "Generate" page (internally CuratePage) is where you **create an Assembly** (training dataset) by:

1. Taking a **Sheet** (data source)
2. Applying a **TemplateConfig** (prompt template)
3. Creating **AssembledDataset** (materialized prompt/response pairs)
4. Populating responses via one of three modes:
   - **existing_column**: Map from pre-labeled column
   - **ai_generated**: Generate with AI (with canonical label reuse)
   - **manual_labeling**: Human annotators label from scratch

Then users **review, verify, and curate** the assembled examples.

---

## Alternative Names

### Option 1: **Assemble** (GCP Pattern)
```
📊 Sheets      - Create and manage data sources
🔧 Assemble    - Assemble and label training examples
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**Pros:**
- Matches GCP Vertex AI pattern: `dataset.assemble(template_config)`
- Accurately describes creating an Assembly
- Neutral to labeling mode (doesn't imply AI-only)

**Cons:**
- Technical jargon ("assemble" might be unclear to non-technical users)

---

### Option 2: **Label** (Action-Oriented)
```
📊 Sheets      - Create and manage data sources
🏷️  Label      - Label and prepare training examples
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**Pros:**
- Clear user action: "label your data"
- Works for all three modes (pre-labeled, AI, manual)
- Familiar ML terminology

**Cons:**
- Might confuse with the Review stage (both involve labeling)
- We just renamed "Label" → "Review" to avoid this confusion

---

### Option 3: **Prepare** (Workflow-Oriented)
```
📊 Sheets      - Create and manage data sources
📋 Prepare     - Prepare labeled training examples
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**Pros:**
- Neutral to labeling mode
- Clearly about preparing data for training
- Intuitive workflow progression: Sheets → Prepare → Review → Train

**Cons:**
- Somewhat generic, doesn't communicate the labeling aspect

---

### Option 4: **Create** (Dataset Creation)
```
📊 Sheets      - Create and manage data sources
✨ Create      - Create labeled training dataset
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**Pros:**
- Clear that you're creating something (the Assembly)
- Neutral to labeling mode
- Natural progression: create → review → train

**Cons:**
- Very generic, could mean anything

---

### Option 5: Keep **Generate** with Updated Description
```
📊 Sheets      - Create and manage data sources
✨ Generate    - Label training examples (AI, manual, or pre-labeled)
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**Pros:**
- No navigation label change needed
- Just update the description to clarify all modes supported

**Cons:**
- "Generate" still implies AI-only to most users
- Misleading for existing_column and manual_labeling modes

---

## Recommended: **Option 3 (Prepare)**

**Proposed Navigation:**

```
Lifecycle Stages:
  📊 Sheets      - Create and manage data sources
  📋 Prepare     - Prepare labeled training examples
  ✅ Review      - Review and verify labeled examples
  🤖 Train       - Fine-tune models
  🚀 Deploy      - Deploy to production
  📈 Monitor     - Monitor performance
  🔄 Improve     - Continuous improvement
```

**Why "Prepare" works best:**

1. **Neutral to labeling mode** - Doesn't imply AI-only, works for all three:
   - Pre-labeled: "Prepare existing labels"
   - AI-generated: "Prepare AI-generated labels"
   - Manual: "Prepare manual annotations"

2. **Clear workflow progression**:
   - Sheets → data sources
   - **Prepare** → create training dataset with labels
   - Review → verify quality
   - Train → fine-tune model

3. **Matches what users actually do**: They prepare their training data by bringing labels in through various methods

4. **Description can be comprehensive**:
   - "Prepare labeled training examples (AI-assisted, manual, or pre-labeled)"

---

## Alternative: **Option 1 (Assemble)** if Technical Precision Matters

If we want to match the data model exactly:

```
📊 Sheets      - Create and manage data sources
🔧 Assemble    - Assemble prompt/response training pairs
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
```

**"Assemble"** is technically accurate (creates `AssembledDataset`) but requires users to learn the GCP pattern terminology.

---

## What About the "Review" Stage?

With the three labeling modes, let's clarify the workflow:

### Workflow A: Pre-labeled Data (existing_column)
1. **Sheets**: Point to data with existing labels column
2. **Prepare/Generate**: Map existing labels to Assembly (no AI generation)
3. **Review**: Verify quality, flag bad examples (optional)
4. **Train**: Fine-tune on pre-labeled data

### Workflow B: AI-Generated (ai_generated)
1. **Sheets**: Point to unlabeled data
2. **Prepare/Generate**: AI generates labels (with canonical reuse)
3. **Review**: Human verifies/corrects AI labels (required)
4. **Train**: Fine-tune on verified labels

### Workflow C: Manual Labeling (manual_labeling)
1. **Sheets**: Point to unlabeled data
2. **Prepare/Generate**: Human annotators label from scratch
3. **Review**: QA check of manual annotations (optional)
4. **Train**: Fine-tune on manual labels

**The "Review" stage is optional for pre-labeled and manual workflows, but critical for AI-generated.**

---

## Sub-Modes Within "Prepare/Generate"

The page could have **sub-navigation** or **mode selector** to clarify:

```
Prepare / Assemble / Generate Page

Mode Selection:
  🔵 Use Existing Labels     - Map from pre-labeled column
  🟣 Generate with AI        - AI suggests labels for review
  🟢 Manual Annotation       - Human labelers annotate from scratch
```

This makes it crystal clear that the page supports all three modes.

---

## Implementation Options

### Option A: Rename "Generate" → "Prepare"
- Update `AppLayout.tsx`: "Generate" → "Prepare"
- Description: "Prepare labeled training examples"
- Tooltip can explain three modes

### Option B: Keep "Generate" but Add Mode Clarification
- Keep label as "Generate"
- Add mode selector/indicator in the page UI
- Update description: "Generate, import, or annotate training labels"

### Option C: Use Dynamic Label Based on Mode
- Show "Generate" when in ai_generated mode
- Show "Import" when in existing_column mode
- Show "Annotate" when in manual_labeling mode
- (Complex, probably overkill)

---

## My Final Recommendation

**Rename to "Prepare":**

```
📊 Sheets      - Create and manage data sources
📋 Prepare     - Prepare labeled training examples
✅ Review      - Review and verify labeled examples
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

**Rationale:**
- Accurately describes all three labeling modes
- Natural workflow progression
- Not too technical, not too generic
- Can be explained with comprehensive description tooltip

**Alternative if you prefer technical precision:**
- Use **"Assemble"** to match GCP pattern and data model

What do you think? Should we change "Generate" → "Prepare"?
