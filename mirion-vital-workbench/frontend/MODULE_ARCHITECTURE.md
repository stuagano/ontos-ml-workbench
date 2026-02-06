# Module Architecture for VITAL Workbench

## Vision: Pluggable Capabilities

Each capability (DSPy, Labeling, Monitoring, etc.) is a **self-contained module** that:
1. Has its own dedicated interface
2. Integrates at specific pipeline stages
3. Can be enabled/disabled per project
4. Maintains its own state and configuration

---

## Module Types

### 1. **Optimization Modules** (TRAIN/IMPROVE stages)
Modules that improve model quality through automation:

#### DSPy Module
**Purpose:** Optimize prompts and few-shot examples using DSPy framework

**Where it fits:**
- **TRAIN stage**: Optimize template before fine-tuning
- **IMPROVE stage**: Analyze feedback → optimize examples → retrain

**Interface:**
```
DSPy Optimization
├── Input: Template + Training Data
├── Configure: Optimizer type, metrics, trials
├── Run: Execute optimization
└── Output: Optimized template + selected examples
```

**Integration points:**
- Hook into TRAIN: "Optimize Template" button
- Hook into IMPROVE: "Optimize from Feedback" workflow
- Connects to Example Store for few-shot selection

#### Example Store Module
**Purpose:** Manage few-shot examples with effectiveness tracking

**Where it fits:**
- **IMPROVE stage**: Primary interface
- Used by: DSPy, Template Editor, Fine-tuning

**Interface:**
```
Example Store
├── Browse: Search/filter examples by domain, effectiveness
├── Create: Add new examples manually or from feedback
├── Analyze: View effectiveness metrics per example
└── Export: Generate few-shot prompts or training data
```

---

### 2. **Annotation Modules** (CURATE stage)
Modules for human-in-the-loop labeling:

#### Labeling Workflows Module
**Purpose:** Multi-user annotation with task assignment

**Where it fits:**
- **CURATE stage**: Primary interface for batch labeling
- Alternative to inline review

**Interface:**
```
Labeling Workflows
├── Jobs: Create labeling jobs with schemas
├── Tasks: Assign batches to labelers
├── Annotate: Label items with keyboard shortcuts
├── Review: QA and approve/reject batches
└── Export: Verified training data
```

#### Image Annotation Module
**Purpose:** Bounding box and region labeling for images

**Where it fits:**
- **CURATE stage**: Activated when data contains images
- Integrated into labeling workflows

**Interface:**
```
Image Annotator
├── Tools: Bounding box, polygon, point
├── Classes: Label categories with colors
├── Shortcuts: Keyboard controls
└── Export: COCO, Pascal VOC, or custom format
```

---

### 3. **Deployment Modules** (DEPLOY/MONITOR stages)

#### Model Serving Module
**Purpose:** Deploy and manage serving endpoints

**Where it fits:**
- **DEPLOY stage**: Primary interface

**Interface:**
```
Model Serving
├── Deploy: Create endpoint from model
├── Configure: Workload size, auto-scaling
├── Test: Send test requests
└── Status: Health checks, version traffic
```

#### Monitoring Module
**Purpose:** Track performance, drift, and feedback

**Where it fits:**
- **MONITOR stage**: Primary interface

**Interface:**
```
Monitoring
├── Metrics: Latency, throughput, errors
├── Drift: Input/output distribution changes
├── Feedback: User ratings and comments
└── Alerts: Configurable thresholds
```

---

## Architecture Pattern: Module Registry

### Module Definition
```typescript
interface VitalModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;

  // Where this module appears
  stages: PipelineStage[];

  // Component to render
  component: React.ComponentType;

  // Integration hooks
  hooks: {
    onStageEnter?: (context: StageContext) => void;
    onStageExit?: (context: StageContext) => void;
    canActivate?: (context: StageContext) => boolean;
  };

  // Configuration
  settings?: ModuleSettings;

  // Status
  isEnabled: boolean;
  requiresSetup?: boolean;
}
```

### Example: DSPy Module Registration
```typescript
const dspyModule: VitalModule = {
  id: "dspy-optimization",
  name: "DSPy Optimizer",
  description: "Automatic prompt and example optimization",
  icon: Wand2,

  // Available in TRAIN and IMPROVE stages
  stages: ["train", "improve"],

  component: DSPyOptimizationPage,

  hooks: {
    // Show "Optimize" button in TRAIN stage
    onStageEnter: (context) => {
      if (context.stage === "train" && context.template) {
        showOptimizeButton();
      }
    },

    // Only activate if template has examples
    canActivate: (context) => {
      return context.template?.examples?.length > 0;
    }
  },

  settings: {
    defaultOptimizer: "BootstrapFewShot",
    maxTrials: 100,
    autoOptimize: false
  },

  isEnabled: true,
  requiresSetup: false
};
```

---

## Integration: Module Drawer Pattern

### UI Pattern
```
┌─────────────────────────────────────────────────────────┐
│  TRAIN STAGE                              [Modules ▼]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Main Stage Content                                     │
│  (Training configuration)                               │
│                                                          │
│                                          ┌──────────────┐│
│                                          │ 🎯 DSPy      ││
│                                          │ Optimize     ││
│                                          ├──────────────┤│
│                                          │ 📊 Examples  ││
│                                          │ Manage       ││
│                                          ├──────────────┤│
│                                          │ 🔍 Preview   ││
│                                          │ Training     ││
│                                          └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

Click module → Opens modal or side panel with dedicated interface

### Implementation
```typescript
// In each stage page
function TrainPage() {
  const availableModules = useModules("train");

  return (
    <div>
      {/* Main stage content */}
      <TrainingConfiguration />

      {/* Module access */}
      <ModuleDrawer modules={availableModules} />
    </div>
  );
}
```

---

## DSPy Placement: Two Integration Points

### 1. **TRAIN Stage: Pre-Training Optimization**
**Use case:** Optimize template before fine-tuning

**Flow:**
```
1. User creates template in TEMPLATE stage
2. User moves to TRAIN stage
3. Click "Optimize Template" → Opens DSPy module
4. DSPy runs optimization:
   - Bootstrap few-shot examples
   - Try different prompt formulations
   - Evaluate on validation set
5. User reviews optimized template
6. Save optimized version
7. Use for fine-tuning
```

**Button location:**
```tsx
function TrainPage() {
  return (
    <div>
      <h1>Train Model</h1>

      {template && (
        <button onClick={() => openModule("dspy")}>
          <Wand2 /> Optimize Template with DSPy
        </button>
      )}

      <TrainingConfiguration />
    </div>
  );
}
```

---

### 2. **IMPROVE Stage: Feedback-Driven Optimization**
**Use case:** Analyze negative feedback → optimize examples → retrain

**Flow:**
```
1. Model deployed, collecting feedback in MONITOR
2. User goes to IMPROVE stage
3. Reviews negative feedback
4. Click "Optimize from Feedback" → Opens DSPy module
5. DSPy analyzes feedback patterns:
   - Identify common failure modes
   - Find relevant examples
   - Optimize instruction/examples
6. Export optimized configuration
7. Return to CURATE → label new examples
8. Return to TRAIN → retrain with optimizations
```

**Integration in IMPROVE stage:**
```tsx
function ImprovePage() {
  const negativeFeedback = useFeedback({ rating: "negative" });

  return (
    <div>
      <FeedbackList items={negativeFeedback} />

      {negativeFeedback.length > 10 && (
        <button onClick={() => openModule("dspy", {
          mode: "feedback-optimization",
          feedbackItems: negativeFeedback
        })}>
          <Wand2 /> Optimize Based on Feedback
        </button>
      )}
    </div>
  );
}
```

---

## Recommended Module Structure

### File Organization
```
src/
├── modules/
│   ├── dspy/
│   │   ├── index.tsx                    # Module registration
│   │   ├── DSPyOptimizationInterface.tsx
│   │   ├── components/
│   │   │   ├── OptimizerSelector.tsx
│   │   │   ├── TrialResults.tsx
│   │   │   └── OptimizedTemplatePreview.tsx
│   │   └── hooks/
│   │       ├── useOptimization.ts
│   │       └── useDSPyConfig.ts
│   │
│   ├── labeling/
│   │   ├── index.tsx
│   │   ├── LabelingInterface.tsx
│   │   └── components/...
│   │
│   ├── monitoring/
│   │   ├── index.tsx
│   │   ├── MonitoringInterface.tsx
│   │   └── components/...
│   │
│   └── registry.ts                      # Central module registry
│
├── components/
│   └── ModuleDrawer.tsx                 # UI for accessing modules
│
└── pages/
    └── [stage]Page.tsx                  # Stages integrate modules
```

### Module Registry
```typescript
// src/modules/registry.ts
import { dspyModule } from "./dspy";
import { labelingModule } from "./labeling";
import { monitoringModule } from "./monitoring";

export const MODULE_REGISTRY: VitalModule[] = [
  dspyModule,
  labelingModule,
  monitoringModule,
  // ... more modules
];

export function getModulesForStage(stage: PipelineStage) {
  return MODULE_REGISTRY.filter(m =>
    m.isEnabled && m.stages.includes(stage)
  );
}
```

---

## Benefits of This Architecture

### ✅ Separation of Concerns
- Each module is self-contained
- Stages remain focused on core workflows
- Modules can be developed independently

### ✅ Flexibility
- Enable/disable modules per project
- Add new modules without changing stages
- Module configuration persists per user/project

### ✅ Discoverability
- Modules appear contextually in relevant stages
- "Modules" drawer shows what's available
- Clear integration points

### ✅ Reusability
- DSPy module can be used in TRAIN or IMPROVE
- Example Store accessed from multiple stages
- Monitoring widgets embedded anywhere

---

## Migration Path

### Phase 1: Extract DSPy as Module
1. Move DSPyOptimizationPage to `modules/dspy/`
2. Create module definition
3. Add "Optimize" buttons in TRAIN and IMPROVE stages
4. Open DSPy module as modal/drawer

### Phase 2: Modularize Labeling
1. Extract LabelingJobsPage to `modules/labeling/`
2. Make it available in CURATE stage
3. Add "Batch Label" option alongside inline review

### Phase 3: Modularize Monitoring
1. Extract monitoring components to `modules/monitoring/`
2. Create monitoring widgets
3. Embed in MONITOR stage + IMPROVE stage

### Phase 4: Module Registry & UI
1. Build ModuleDrawer component
2. Add module configuration UI
3. Allow enabling/disabling modules

---

## Example: Complete DSPy Integration

### In TRAIN Stage
```tsx
function TrainPage() {
  const { template, assemblyId } = useWorkflow();
  const { openModule } = useModules();

  return (
    <div>
      <h1>Train Model</h1>

      {/* Optimization Option */}
      {template && (
        <Card>
          <CardHeader>
            <Wand2 /> Optimize Before Training
          </CardHeader>
          <CardBody>
            <p>Use DSPy to automatically optimize your prompt template and select the best few-shot examples.</p>
            <Button onClick={() => openModule("dspy", {
              mode: "pre-training",
              templateId: template.id,
              assemblyId: assemblyId
            })}>
              Run Optimization
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Regular training config */}
      <TrainingConfiguration />
    </div>
  );
}
```

### In IMPROVE Stage
```tsx
function ImprovePage() {
  const negativeFeedback = useFeedback({ rating: "negative" });
  const { openModule } = useModules();

  return (
    <div>
      <h1>Improve</h1>

      {/* Feedback Analysis */}
      <FeedbackStats />

      {/* Optimization from Feedback */}
      {negativeFeedback.length >= 10 && (
        <Alert>
          <AlertTitle>Optimization Opportunity</AlertTitle>
          <AlertDescription>
            You have {negativeFeedback.length} negative feedback items.
            DSPy can analyze these to optimize your template.
          </AlertDescription>
          <Button onClick={() => openModule("dspy", {
            mode: "feedback-optimization",
            feedbackIds: negativeFeedback.map(f => f.id)
          })}>
            Optimize from Feedback
          </Button>
        </Alert>
      )}

      {/* Regular feedback review */}
      <FeedbackList />
    </div>
  );
}
```

---

## Conclusion: DSPy Fits in BOTH Places

**DSPy is an optimization tool** that can be used:

1. **Proactively (TRAIN):** Optimize before deploying
2. **Reactively (IMPROVE):** Optimize after collecting feedback

It's not a separate stage - it's a **capability/module** that integrates into your existing flow at the right moments.

The modular architecture lets you:
- Keep the 7-stage pipeline simple and clear
- Add powerful capabilities that appear contextually
- Let each module have a rich, dedicated interface
- Maintain clean separation between core flow and advanced features
