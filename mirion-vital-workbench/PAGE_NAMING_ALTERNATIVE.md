# Alternative Page Naming: Task-Oriented Workflow

## Your Proposal

```
📊 Sheets       - Define data sources
📝 Templates    - Create prompt templates
🏷️  Labels      - Generate AI labels
✅ Verification - Verify/correct AI labels
🎯 Curation     - Select best examples for training
🤖 Train        - Fine-tune models
🚀 Deploy       - Deploy to production
📈 Monitor      - Monitor performance
```

---

## Analysis: Does This Match the Current Architecture?

### Current Pages vs. Your Proposed Flow

| Current Page | What It Does | Your Proposed Name | Does It Fit? |
|--------------|--------------|-------------------|--------------|
| **DataPage** (Data) | Create Sheets (Unity Catalog pointers) | **Sheets** | ✅ Perfect match |
| **CuratePage** (Generate) | Create Assembly + Generate AI responses + Human review | **Labels** + **Verification** + **Curation**? | ⚠️ This is 3 steps in 1 page |
| **LabelingJobsPage** (Label) | Human labeling workflow | Already covered above? | ⚠️ Overlap with Verification? |
| **TrainPage** | Fine-tune models | **Train** | ✅ Perfect match |
| **DeployPage** | Deploy models | **Deploy** | ✅ Perfect match |
| **MonitorPage** | Monitor performance | **Monitor** | ✅ Perfect match |

### The Challenge: Templates

**Where does "Templates" fit?**

Looking at the architecture:
- **TemplateConfig** is attached to a Sheet (not a separate stage)
- Current UI: Templates are managed in a **Tool** (not a lifecycle stage)
  - Tools section: "Prompt Templates", "Example Store", "DSPy Optimizer"

**Two options:**
1. Keep Templates as a Tool (current design)
2. Make Templates a lifecycle stage before generating labels

---

## Proposed Workflow Mapping

### Option 1: Keep Templates as Tool (Current Design)

```
Lifecycle Stages:
  📊 Sheets       - Create/manage data sources
  🏷️  Generate    - Attach template + generate AI labels
  ✅ Verify       - Review and correct AI labels
  🤖 Train        - Fine-tune models
  🚀 Deploy       - Deploy to production
  📈 Monitor      - Monitor performance
  🔄 Improve      - Continuous improvement

Tools (separate from workflow):
  📝 Templates    - Manage reusable prompt templates
  📚 Examples     - Dynamic few-shot example store
  🧪 DSPy         - Optimize prompts with DSPy
```

**This is closest to current architecture** - Templates are created once and reused across many Sheets.

---

### Option 2: Make Templates a Lifecycle Stage (Requires Refactor)

```
Lifecycle Stages:
  📊 Sheets       - Create/manage data sources
  📝 Templates    - Create/attach prompt template to Sheet
  🏷️  Labels      - Generate AI labels (Assembly)
  ✅ Verify       - Review and correct AI labels
  🎯 Curate       - Select best examples for training
  🤖 Train        - Fine-tune models
  🚀 Deploy       - Deploy to production
  📈 Monitor      - Monitor performance
```

**This would require architectural changes:**
- Split current CuratePage into 3 separate pages: Labels → Verify → Curate
- Move Template creation into main workflow (not a tool)

---

## The Real Question: What Happens in CuratePage?

Let me check what CuratePage actually does:

**CuratePage (currently labeled "Generate") does:**
1. ✅ List Assemblies (prompt/response pairs)
2. ✅ Generate AI responses for empty rows
3. ✅ Display AI predictions with confidence scores
4. ✅ Allow human to review each prediction
5. ✅ Allow human to edit/verify predictions
6. ✅ Flag problematic examples
7. ✅ Show canonical label reuse (cyan badges)
8. ✅ Create new canonical labels

**So CuratePage combines: Labels + Verification + Curation in one interface**

---

## Recommendation: Simplified 3-Option Approach

### Option 1: Noun-Based (Data Model Terms)

```
📊 Sheets       - Create and manage data sources
🔧 Assemblies   - Generate and review prompt/response pairs
🤖 Train        - Fine-tune models
🚀 Deploy       - Deploy to production
📈 Monitor      - Monitor performance
🔄 Improve      - Continuous improvement
```

**Pros:** Matches data model exactly (Sheet → Assembly → Model)
**Cons:** "Assemblies" is technical jargon

---

### Option 2: Verb-Based (Action-Oriented)

```
📊 Import       - Import and configure data sources
✨ Generate     - Generate and verify labeled examples
🤖 Train        - Fine-tune models
🚀 Deploy       - Deploy to production
📈 Monitor      - Monitor performance
🔄 Improve      - Continuous improvement
```

**Pros:** Action verbs are intuitive
**Cons:** "Generate" hides the verification/review aspect

---

### Option 3: Your Proposal (Granular Workflow) - **WITH SIMPLIFICATION**

**Simplified version (5-6 stages instead of 8):**

```
📊 Sheets       - Create and manage data sources
🏷️  Label       - Generate, verify, and curate labels
🤖 Train        - Fine-tune models
🚀 Deploy       - Deploy to production
📈 Monitor      - Monitor performance
🔄 Improve      - Continuous improvement
```

**OR with one more split:**

```
📊 Sheets       - Create and manage data sources
✨ Generate     - Generate AI labels
✅ Review       - Review and correct labels
🤖 Train        - Fine-tune models
🚀 Deploy       - Deploy to production
📈 Monitor      - Monitor performance
```

---

## My Recommendation: **Option 3B (Sheets + Generate + Review)**

**Proposed Navigation:**

```
Lifecycle:
  📊 Sheets      - Create and manage data sources
  ✨ Generate    - Generate AI labels with prompt templates
  ✅ Review      - Review, verify, and select training examples
  🤖 Train       - Fine-tune models
  🚀 Deploy      - Deploy to production
  📈 Monitor     - Monitor performance
  🔄 Improve     - Continuous improvement

Tools:
  📝 Templates   - Manage reusable prompt templates
  📚 Examples    - Dynamic few-shot examples
  🧪 DSPy        - Optimize prompts
```

**Why this works:**
1. **"Sheets"** - Clear that you're creating Sheet objects (not just "data")
2. **"Generate"** - Focus on AI label generation (what happens first in CuratePage)
3. **"Review"** - Focus on human verification/correction (what happens after generation)
4. **Templates stay as Tool** - They're reusable assets, not a one-time stage
5. **Removed "Label"** - Confusing because AI generates labels, humans review them

**Changes needed:**
- Rename: "Data" → "Sheets"
- Rename: Current "Generate" (curate stage) → "Generate" (keep same)
- Rename: "Label" → "Review" (if LabelingJobsPage is separate from CuratePage)

---

## Questions to Clarify

1. **Is LabelingJobsPage a separate page from CuratePage?**
   - If YES: Then we have "Generate" (CuratePage) + "Review" (LabelingJobsPage)
   - If NO: Then we just have "Generate" (does everything) or rename it to "Label" or "Review"

2. **Should Templates be a lifecycle stage or stay as a Tool?**
   - Current design: Tool (reusable asset)
   - Your proposal: Lifecycle stage (sequential step)

3. **Do you want to split CuratePage into multiple pages?**
   - Current: One page does generation + verification + curation
   - Alternative: Split into "Generate" page + "Review" page + "Curate" page

---

## My Final Recommendation

**Keep it simple with minimal renaming:**

```
📊 Sheets      - Create and manage Sheets
✨ Generate    - Generate and review labeled examples
🤖 Train       - Fine-tune models
🚀 Deploy      - Deploy to production
📈 Monitor     - Monitor performance
🔄 Improve     - Continuous improvement
```

**Just change "Data" → "Sheets"** and keep everything else. The words aren't too big, but the current architecture doesn't naturally split into Sheets/Templates/Labels/Verification/Curation without refactoring.

**If you want more granular stages**, we'd need to split CuratePage into 2-3 separate pages, which is a bigger refactor.

What do you think? Should we:
- **A)** Keep it simple: Just rename "Data" → "Sheets"
- **B)** Do "Sheets" + "Generate" + "Review" (rename Label page to Review)
- **C)** Refactor to split CuratePage into separate stages
