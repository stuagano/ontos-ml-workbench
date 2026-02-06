# Navigation Labels Updated - Option B Implementation

## Changes Made

Updated navigation labels to align with the data model and clarify the workflow:

| Old Label | New Label | Description | Rationale |
|-----------|-----------|-------------|-----------|
| **Data** | **Sheets** | Create and manage data sources | Matches data model: users create Sheet objects (Unity Catalog pointers) |
| **Generate** | **Generate** | Generate AI labels and responses | Keep - accurately describes AI generation step |
| **Label** | **Review** | Review and verify labeled examples | More accurate - users review/verify AI-generated labels, not label from scratch |
| Train | Train | Fine-tune models | ✅ No change |
| Deploy | Deploy | Deploy to production | ✅ No change |
| Monitor | Monitor | Monitor performance | ✅ No change |
| Improve | Improve | Continuous improvement | ✅ No change |

---

## New Navigation Structure

```
Lifecycle Stages:
  📊 Sheets      - Create and manage data sources
  ✨ Generate    - Generate AI labels and responses
  ✅ Review      - Review and verify labeled examples
  🤖 Train       - Fine-tune models
  🚀 Deploy      - Deploy to production
  📈 Monitor     - Monitor performance
  🔄 Improve     - Continuous improvement

Tools:
  📝 Prompt Templates - Manage reusable prompt templates
  📚 Example Store    - Dynamic few-shot examples
  🧪 DSPy Optimizer   - Optimize prompts with DSPy
```

---

## Data Model Alignment

The new labels now align perfectly with the PRD v2.3 data model:

**Workflow:**
1. **Sheets** → Create `Sheet` (Unity Catalog pointer)
2. Attach `TemplateConfig` to Sheet (via Tools or inline)
3. **Generate** → Create `AssembledDataset` (Sheet + Template → prompt/response pairs)
4. **Review** → Human verification of AI-generated labels
5. **Train** → Fine-tune model on verified examples
6. **Deploy** → Deploy model to production
7. **Monitor** → Track model performance
8. **Improve** → Iterate based on feedback

---

## Files Updated

1. ✅ `frontend/src/components/apx/AppLayout.tsx`
   - Line 61: "Data" → "Sheets"
   - Line 64: Description updated to "Create and manage data sources"
   - Line 69: "Generate" → kept same (label), description updated to "Generate AI labels and responses"
   - Line 74: "Label" → "Review"
   - Line 77: Description updated to "Review and verify labeled examples"

---

## User-Facing Impact

### Before (Confusing)
- **"Data"** - Too generic, unclear that you're creating Sheet objects
- **"Generate"** - Accurate for AI generation
- **"Label"** - Misleading, suggests labeling from scratch (but AI already generated labels)

### After (Clear)
- **"Sheets"** - Clear that you're managing Sheet objects
- **"Generate"** - Still accurate, now with clearer description
- **"Review"** - Accurate description of human verification workflow

---

## Defect Detection Workflow (Updated)

The navigation now makes more sense for PCB defect detection:

1. **Sheets** - Import PCB inspection images from Unity Catalog
2. **Generate** - Run VLM inference to detect defects (with canonical label reuse)
3. **Review** - Human inspectors verify/correct AI detections
4. **Train** - Fine-tune vision model on verified detections
5. **Deploy** - Deploy defect detector to production line
6. **Monitor** - Track detection accuracy over time
7. **Improve** - Incorporate production feedback

---

## Documentation Updates Needed

- [ ] Update `DEFECT_DETECTION_WORKFLOW_VALIDATION.md` to use new labels
- [ ] Update `CANONICAL_LABELS_READY.md` to use new labels
- [ ] Update any user guides or READMEs
- [ ] Update API documentation if it references page names

---

## Summary

✅ Navigation labels now align with data model
✅ Clearer workflow: Sheets → Generate → Review → Train
✅ No code refactoring required (just label changes)
✅ Backwards compatible (stage IDs unchanged: "data", "curate", "label")
