# Module Development with APX Hot Reload

This guide shows how APX hot reload supercharges the module development workflow you just built.

## The Scenario: Adding a Cost Tracker Module

Let's build a new module from scratch using APX hot reload.

### Setup (One Time)
```bash
# Start APX dev server
apx dev start

# Leave it running! We'll develop the entire module without restarting.
```

---

## Step 1: Create Module Structure (10 seconds)

**Create files:**
```bash
mkdir -p frontend/src/modules/cost
touch frontend/src/modules/cost/index.ts
touch frontend/src/modules/cost/CostTracker.tsx
```

**✨ APX reloads → No errors yet, waiting for content**

---

## Step 2: Define Module Interface (30 seconds)

**`frontend/src/modules/cost/index.ts`**
```typescript
import { DollarSign } from "lucide-react";
import type { VitalModule } from "../types";
import CostTracker from "./CostTracker";

export const costTrackerModule: VitalModule = {
  id: "cost-tracker",
  name: "Cost Tracker",
  description: "Monitor inference costs and budget alerts",
  icon: DollarSign,
  stages: ["monitor", "deploy"],
  component: CostTracker,
  isEnabled: true,
  categories: ["monitoring", "analytics"],
  version: "1.0.0",
};
```

**Save → ✨ APX hot reloads TypeScript instantly**

---

## Step 3: Build UI Component (2 minutes)

**`frontend/src/modules/cost/CostTracker.tsx`**
```typescript
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import type { ModuleComponentProps } from "../types";

interface CostData {
  daily: number;
  weekly: number;
  monthly: number;
  budget: number;
  percentUsed: number;
}

export default function CostTracker({ context, onClose }: ModuleComponentProps) {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setTimeout(() => {
      setCosts({
        daily: 12.45,
        weekly: 87.32,
        monthly: 342.89,
        budget: 500,
        percentUsed: 68.6,
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading costs...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cost Tracker</h2>
        <button onClick={() => onClose()} className="text-db-gray-500">Close</button>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-db-gray-600">Daily</div>
          <div className="text-2xl font-bold">${costs?.daily}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-db-gray-600">Weekly</div>
          <div className="text-2xl font-bold">${costs?.weekly}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-db-gray-600">Monthly</div>
          <div className="text-2xl font-bold">${costs?.monthly}</div>
        </div>
      </div>

      {/* Budget Alert */}
      {costs && costs.percentUsed > 70 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <div className="font-medium text-amber-900">Budget Alert</div>
            <div className="text-sm text-amber-700">
              Using {costs.percentUsed}% of monthly budget (${costs.monthly} / ${costs.budget})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Save → ✨ APX hot reloads component instantly!**

**Check browser: Module UI renders but not registered yet**

---

## Step 4: Register Module (5 seconds)

**`frontend/src/modules/registry.ts`**
```typescript
import { dspyModule } from "./dspy";
import { dataQualityModule } from "./quality";
import { costTrackerModule } from "./cost";  // Add import

export const MODULE_REGISTRY: VitalModule[] = [
  dspyModule,
  dataQualityModule,
  costTrackerModule,  // Add to registry
];
```

**Save → ✨ APX hot reloads registry → Module now available!**

---

## Step 5: Add to Monitor Page (30 seconds)

**`frontend/src/pages/MonitorPage.tsx`** (wherever appropriate)
```typescript
import { useModules } from "../hooks/useModules";

export function MonitorPage() {
  const { openModule, activeModule, isOpen, closeModule } = useModules({
    stage: "monitor"
  });

  return (
    <div>
      {/* Somewhere in your UI */}
      <button onClick={() => openModule("cost-tracker", {
        stage: "monitor",
        endpointId: "endpoint_123"
      })}>
        💰 Track Costs
      </button>

      {/* Module Modal */}
      {isOpen && activeModule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl max-w-4xl w-full">
            <activeModule.component
              context={{ stage: "monitor", endpointId: "endpoint_123" }}
              onClose={closeModule}
              displayMode="modal"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Save → ✨ APX hot reloads page → Button appears!**

**Click button → Module opens!** 🎉

---

## Step 6: Add Backend API (1 minute)

**`backend/app/api/v1/endpoints/costs.py`** (new file)
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class CostData(BaseModel):
    daily: float
    weekly: float
    monthly: float
    budget: float
    percent_used: float

@router.get("/costs/summary")
async def get_cost_summary(endpoint_id: str):
    """Get cost summary for an endpoint"""
    # TODO: Query from Databricks System tables
    return CostData(
        daily=12.45,
        weekly=87.32,
        monthly=342.89,
        budget=500.0,
        percent_used=68.6
    )
```

**Save → ✨ APX hot reloads backend!**

**`backend/app/api/v1/router.py`**
```python
from app.api.v1.endpoints import costs

api_router.include_router(costs.router, prefix="/costs", tags=["costs"])
```

**Save → ✨ APX hot reloads router → API endpoint live!**

---

## Step 7: Connect Frontend to API (30 seconds)

**`frontend/src/services/api.ts`**
```typescript
export async function getCostSummary(endpointId: string) {
  const response = await api.get(`/costs/summary?endpoint_id=${endpointId}`);
  return response.data;
}
```

**Save → ✨ Hot reload**

**`frontend/src/modules/cost/CostTracker.tsx`** (update useEffect)
```typescript
import { getCostSummary } from "../../services/api";

useEffect(() => {
  getCostSummary(context.endpointId || "")
    .then(setCosts)
    .finally(() => setLoading(false));
}, [context.endpointId]);
```

**Save → ✨ APX hot reloads → Component fetches from real API!**

---

## Step 8: Test End-to-End (0 seconds)

**You've been testing all along!**
- Every save showed instant feedback
- No restarts needed
- Full stack working in under 5 minutes

---

## Timeline Comparison

### Without APX (Traditional)
```
1. Write frontend component              2 min
2. Save → npm run build                  10 sec
3. Restart frontend server               5 sec
4. Test in browser                       5 sec
5. Write backend endpoint                1 min
6. Restart backend server                5 sec
7. Write API client                      30 sec
8. npm run build                         10 sec
9. Restart frontend server               5 sec
10. Test end-to-end                      10 sec

Total: ~6-7 minutes + context switching
```

### With APX (Hot Reload)
```
1. Write frontend component              2 min
   → Save → see it instantly
2. Write backend endpoint                1 min
   → Save → works instantly
3. Write API client                      30 sec
   → Save → updates instantly
4. Test end-to-end                       0 sec
   → Already working!

Total: ~4 minutes, no context switching
```

**APX saves ~40% time + maintains flow state!**

---

## Real-World Module Development

### Data Quality Inspector (You Just Built)
With APX, you could have:
1. Created component → Instant preview
2. Added checks one-by-one → See each render live
3. Tweaked styling → Instant feedback
4. Connected to backend → No restart
5. Tested all 8 quality checks → Immediate results

**Estimated time saved: 15-20 minutes over traditional workflow**

### DSPy Optimizer Integration
With APX, extracting DSPy:
1. Create wrapper → Hot reload shows it
2. Register module → Appears in UI
3. Add button to TrainPage → See it immediately
4. Test modal opening → Works right away
5. Tweak modal styling → Instant updates

**Estimated time saved: 10-15 minutes**

---

## Best Practices with APX

### 1. Keep It Running
Start APX once in the morning, code all day. Only restart for:
- `package.json` changes
- `.env` changes
- New Python packages

### 2. Test Incrementally
Don't wait to test:
```typescript
// Add one feature
const newFeature = () => { ... };

// Save → Hot reload → Test it → Works? Continue!
```

### 3. Use Browser DevTools
APX hot reload preserves your DevTools state:
- Network tab stays open
- Console logs persist
- React DevTools component selection maintained

### 4. Watch APX Terminal
Errors appear immediately:
- TypeScript errors
- Python exceptions
- Build warnings

Fix → Save → See result instantly

### 5. Module Registry Last
When adding a module:
1. Build component first (test UI in isolation)
2. Add API endpoints (test via direct URL)
3. Register in MODULE_REGISTRY last (now full integration works)

---

## Module Ideas to Build with APX

Now that hot reload is set up, build these modules fast:

### High Priority (30 min each with APX)
- **Evaluation Harness** - Compare model outputs
- **Debug Console** - Live prompt testing
- **Prompt Library** - Reusable prompt snippets

### Medium Priority (45 min each)
- **A/B Testing Manager** - Experiment framework
- **Drift Detector** - Distribution monitoring
- **Synthetic Data Generator** - Data augmentation

### Advanced (1-2 hours each)
- **RAG Configuration** - Vector store setup
- **Agent Framework** - Multi-step workflows
- **Guardrails Manager** - Safety controls

**All with instant hot reload feedback!** 🚀

---

## Summary

APX transforms module development:
- **No restart overhead** - every change visible instantly
- **Faster iteration** - test ideas immediately
- **Maintained focus** - no terminal switching
- **Unified debugging** - see all errors in one place

**Your module architecture + APX hot reload = Development superpowers! ⚡**

Start with:
```bash
apx dev start
```

Then build modules at lightning speed! 🏎️
