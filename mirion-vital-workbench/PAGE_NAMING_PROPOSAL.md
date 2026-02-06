# Page Naming Proposal - Align with Data Model

## Problem

The current page names don't match the actual data model (PRD v2.3):

**Data Model:**
- **Sheet** → Lightweight pointer to Unity Catalog data
- **TemplateConfig** → Attached to Sheet (defines prompt transformation)
- **AssembledDataset** → Materialized prompt/response pairs from Sheet + Template

**Current Page Names (Confusing):**
- ❌ **"Data"** page → Actually creates **Sheets** (not just "data")
- ❌ **"Generate"** (internally CuratePage) → Actually works with **Assemblies** (not generating sheets)
- ❌ **"Label"** page → Unclear what artifact this labels

## Current vs. Proposed

| Current Name | What It Actually Does | Proposed Name | Why Better |
|--------------|----------------------|---------------|------------|
| **Data** | Create/manage Sheets (Unity Catalog pointers) | **Sheets** | Matches data model exactly |
| **Generate** (CuratePage) | Create/review Assemblies (materialized prompts) | **Assemble** or **Generate** | "Assemble" matches GCP pattern; "Generate" works if we clarify |
| **Label** (LabelingJobsPage) | Human labeling workflow for Assemblies | **Label** or **Review** | Keep as "Label" or rename to "Review" for clarity |
| **Train** | Fine-tune models on labeled Assemblies | **Train** | ✅ Clear, keep as-is |
| **Deploy** | Deploy trained models | **Deploy** | ✅ Clear, keep as-is |
| **Monitor** | Monitor deployed models | **Monitor** | ✅ Clear, keep as-is |
| **Improve** | Continuous improvement loop | **Improve** | ✅ Clear, keep as-is |

---

## Recommended Option A: Minimal Changes (Conservative)

**Only rename the most confusing one:**

| Stage | Navigation Label | Internal Component | Description |
|-------|-----------------|-------------------|-------------|
| data | **Sheets** | DataPage | Create and manage Sheets (Unity Catalog data sources) |
| curate | **Generate** | CuratePage | Generate and review Assemblies (prompt/response pairs) |
| label | **Label** | LabelingJobsPage | Human labeling and annotation workflow |
| train | **Train** | TrainPage | Fine-tune models on labeled data |
| deploy | **Deploy** | DeployPage | Deploy models to production |
| monitor | **Monitor** | MonitorPage | Monitor model performance |
| improve | **Improve** | ImprovePage | Continuous improvement and iteration |

**Changes:**
- ✅ "Data" → **"Sheets"** (matches data model)
- ✅ Keep "Generate" for curate stage (users understand "generate labels")
- ✅ Keep all other names

**Pros:** Minimal disruption, fixes the most confusing mismatch
**Cons:** "Generate" still doesn't perfectly match "Assembly" concept

---

## Recommended Option B: Match GCP Pattern (Aligned)

**Rename to match GCP Vertex AI terminology:**

| Stage | Navigation Label | Internal Component | Description |
|-------|-----------------|-------------------|-------------|
| data | **Datasets** | DataPage | Create and manage Sheets (Unity Catalog data sources) |
| curate | **Assemble** | CuratePage | Assemble prompts and generate responses |
| label | **Label** | LabelingJobsPage | Human labeling and annotation workflow |
| train | **Train** | TrainPage | Fine-tune models on labeled data |
| deploy | **Deploy** | DeployPage | Deploy models to production |
| monitor | **Monitor** | MonitorPage | Monitor model performance |
| improve | **Improve** | ImprovePage | Continuous improvement and iteration |

**Changes:**
- ✅ "Data" → **"Datasets"** (more accurate, matches ML terminology)
- ✅ "Generate" → **"Assemble"** (matches `dataset.assemble()` pattern)
- ✅ Keep all other names

**Pros:** Perfect alignment with data model and GCP pattern
**Cons:** "Assemble" might be unfamiliar to non-technical users

---

## Recommended Option C: User-Friendly (Conversational)

**Use verbs that describe what users do:**

| Stage | Navigation Label | Internal Component | Description |
|-------|-----------------|-------------------|-------------|
| data | **Import** | DataPage | Import and configure data sources |
| curate | **Generate** | CuratePage | Generate labeled examples with AI |
| label | **Review** | LabelingJobsPage | Review and correct labels |
| train | **Train** | TrainPage | Fine-tune models on labeled data |
| deploy | **Deploy** | DeployPage | Deploy models to production |
| monitor | **Monitor** | MonitorPage | Monitor model performance |
| improve | **Improve** | ImprovePage | Continuous improvement and iteration |

**Changes:**
- ✅ "Data" → **"Import"** (action-oriented)
- ✅ Keep "Generate" (already action-oriented)
- ✅ "Label" → **"Review"** (more accurate - users review AI labels, not label from scratch)
- ✅ Keep all other names

**Pros:** Action verbs are intuitive, matches user mental model
**Cons:** "Import" might imply data movement rather than just referencing Unity Catalog

---

## Analysis of Current "Generate" (CuratePage)

Looking at `CuratePage.tsx`, it actually does:
1. Lists Assemblies (prompt/response pairs)
2. Shows Assembly detail view with rows
3. Allows AI generation of responses (`generateResponses`)
4. Allows human labeling/verification
5. Shows canonical label indicators

**So "Generate" is somewhat accurate** - it generates AI responses. But it's also where you review/curate those responses.

Alternative names for this page:
- **Assemble** - matches `dataset.assemble()` API pattern
- **Generate** - focuses on AI response generation (current)
- **Curate** - focuses on reviewing/selecting good examples
- **Prepare** - preparing training data
- **Build** - building the training dataset

---

## My Recommendation: **Option A (Minimal)**

**Rename "Data" → "Sheets" only**

**Rationale:**
1. **"Data" is too generic** - doesn't communicate that you're creating Sheets
2. **"Sheets" matches the data model exactly** - users create Sheet objects
3. **"Generate" works for CuratePage** - users do generate AI responses there
4. **Minimal disruption** - only one rename needed

**Final Navigation:**
```
Lifecycle:
  📊 Sheets      - Create and manage data sources
  ✨ Generate    - Generate and review labeled examples
  🏷️  Label      - Human labeling workflow
  🤖 Train       - Fine-tune models
  🚀 Deploy      - Deploy to production
  📈 Monitor     - Monitor performance
  🔄 Improve     - Continuous improvement
```

---

## Alternative: **Option B (GCP-Aligned)**

If we want to be more technically precise:

```
Lifecycle:
  📊 Datasets    - Create and manage data sources
  🔧 Assemble    - Assemble prompts and generate responses
  🏷️  Label      - Human labeling workflow
  🤖 Train       - Fine-tune models
  🚀 Deploy      - Deploy to production
  📈 Monitor     - Monitor performance
  🔄 Improve     - Continuous improvement
```

---

## Implementation Impact

### Option A: Rename "Data" → "Sheets"

**Files to update:**
1. `frontend/src/components/apx/AppLayout.tsx` - Update `LIFECYCLE_STAGES` array
   ```typescript
   {
     id: "data",
     label: "Sheets",  // Was: "Data"
     icon: Database,
     color: "text-blue-500",
     description: "Create and manage Sheets",  // Was: "Define data sources"
   }
   ```

2. No component renames needed (DataPage is internal, not visible to users)
3. No route changes needed (routes are internal)
4. Update documentation to use "Sheets" instead of "Data"

**Estimated effort:** 15 minutes

### Option B: Rename "Data" → "Datasets" and "Generate" → "Assemble"

**Files to update:**
1. `frontend/src/components/apx/AppLayout.tsx` - Update `LIFECYCLE_STAGES` array (2 entries)
2. Update tooltip descriptions
3. Update documentation

**Estimated effort:** 20 minutes

---

## Decision Needed

**Question for you:** Which option do you prefer?

- **Option A** (minimal): "Data" → "Sheets", keep "Generate"
- **Option B** (GCP-aligned): "Data" → "Datasets", "Generate" → "Assemble"
- **Option C** (user-friendly): "Data" → "Import", "Label" → "Review"
- **Custom**: Mix and match or propose different names

I recommend **Option A** for minimal disruption while fixing the most confusing mismatch.
