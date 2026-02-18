# Deploy & Monitor Pages Refactoring

**Date:** 2026-02-07
**Task:** Extract shared configurations, types, and utility components from DeployPage and MonitorPage

## Summary

Extracted common status configurations and created reusable components to reduce code duplication and improve maintainability across the Deploy, Monitor, and Train stages.

## Files Created

### 1. `/frontend/src/constants/statusConfig.ts`

Centralized status configuration for all entity types:

**Exports:**
- `ENDPOINT_STATUS_CONFIG` - For serving endpoints (Deploy page)
- `MONITOR_ENDPOINT_STATUS_CONFIG` - Monitor-specific variant (uses "Healthy" instead of "Ready")
- `JOB_STATUS_CONFIG` - For training job runs
- Helper functions:
  - `getStatusConfig(status, configMap, fallback)` - Get config with fallback
  - `isStatusActive(status)` - Check if status is in-progress
  - `isStatusSuccess(status)` - Check if status indicates success
  - `isStatusFailure(status)` - Check if status indicates failure

**Status Types:**

Endpoint statuses:
- `READY` - Ready/Healthy state
- `NOT_READY` - Starting up
- `PENDING` - Deployment pending
- `FAILED` - Deployment failed
- `unknown` - Unknown state

Job statuses:
- `pending` - Job queued
- `running` - Job executing
- `succeeded` - Job completed successfully
- `failed` - Job failed
- `cancelled` - Job cancelled

### 2. `/frontend/src/components/StatusBadge.tsx`

Reusable status indicator component.

**Props:**
- `config: StatusConfig` - Status configuration from statusConfig constants
- `animate?: boolean` - Enable spin animation (for loading states)
- `size?: 'sm' | 'md' | 'lg'` - Badge size
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { StatusBadge } from "../components/StatusBadge";
import { ENDPOINT_STATUS_CONFIG, getStatusConfig } from "../constants/statusConfig";

const config = getStatusConfig(endpoint.state, ENDPOINT_STATUS_CONFIG);
<StatusBadge config={config} animate={isStatusActive(endpoint.state)} />
```

## Files Updated

### 1. `/frontend/src/pages/DeployPage.tsx`

**Changes:**
- Removed local `STATUS_CONFIG` definition
- Added imports for `StatusBadge`, `ENDPOINT_STATUS_CONFIG`, `getStatusConfig`, `isStatusActive`
- Updated status column in DataTable to use `StatusBadge` component
- Simplified status badge rendering logic

**Before:**
```tsx
const STATUS_CONFIG: Record<string, {...}> = { READY: {...}, ... };
const config = STATUS_CONFIG[endpoint.state] || STATUS_CONFIG.unknown;
const Icon = config.icon;
return (
  <span className={...}>
    <Icon className={...} />
    {config.label}
  </span>
);
```

**After:**
```tsx
import { StatusBadge } from "../components/StatusBadge";
import { ENDPOINT_STATUS_CONFIG, getStatusConfig } from "../constants/statusConfig";

const config = getStatusConfig(endpoint.state, ENDPOINT_STATUS_CONFIG);
return <StatusBadge config={config} animate={isStatusActive(endpoint.state)} />;
```

### 2. `/frontend/src/pages/MonitorPage.tsx`

**Changes:**
- Removed local `STATUS_CONFIG` definition
- Added imports for `StatusBadge`, `MONITOR_ENDPOINT_STATUS_CONFIG`, `getStatusConfig`, `isStatusActive`
- Updated `EndpointStatusCard` component to use `StatusBadge`
- Updated selected endpoint banner to use `getStatusConfig`

**Key Difference:**
MonitorPage uses `MONITOR_ENDPOINT_STATUS_CONFIG` which displays "Healthy" for `READY` state instead of "Ready" (domain-specific labeling for monitoring context).

### 3. `/frontend/src/components/TrainingRunsPanel.tsx`

**Changes:**
- Removed local `STATUS_CONFIG` definition
- Added imports for `JOB_STATUS_CONFIG`, `getStatusConfig`, `isStatusActive`
- Updated `TrainingRunCard` to use shared job status configuration
- Removed unused icon imports (CheckCircle, XCircle, Clock, Loader2, AlertCircle)

## Patterns Not Extracted (Intentional)

### 1. Empty State Components

**Rationale:** Already have `/frontend/src/components/EmptyState.tsx` with preset empty states. The inline empty states in Deploy and Monitor pages are context-specific and benefit from being co-located with their page logic.

**Example:**
- DeployPage: Custom action button to open deployment wizard
- MonitorPage: Conditional rendering based on search query state

### 2. Search/Filter UI

**Rationale:** While visually similar, the filter controls differ:
- DeployPage: Has status dropdown filter (`All Status`, `Ready`, `Starting`, `Pending`, `Failed`)
- MonitorPage: Search-only (no status dropdown)

Creating a shared component would require complex props for conditional rendering, reducing readability.

### 3. Workflow Banner

**Rationale:** Already extracted to `/frontend/src/components/WorkflowBanner.tsx` (done in previous refactoring).

### 4. Metric Cards

**Rationale:** Already extracted to `/frontend/src/components/MetricCard.tsx` (used only in MonitorPage currently).

## Benefits

1. **Reduced Duplication:** Eliminated ~100 lines of duplicated STATUS_CONFIG definitions
2. **Type Safety:** Centralized status types with TypeScript interfaces
3. **Consistency:** Status badges render identically across Deploy, Monitor, and Train pages
4. **Maintainability:** Single source of truth for status styling and labels
5. **Extensibility:** Easy to add new status types or helper functions

## Future Refactoring Opportunities

### 1. DataTable Filter Bar Component

Could extract the search/filter UI pattern into a reusable component:

```tsx
<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  filters={[
    { type: 'select', value: statusFilter, onChange: setStatusFilter, options: [...] }
  ]}
  onClear={() => {...}}
/>
```

**Trade-off:** Adds abstraction complexity for moderate code savings (~15 lines per page).

### 2. Unified Empty States

Could consolidate inline empty states to use `EmptyState` component:

```tsx
const emptyState = (
  <EmptyState
    icon={Server}
    title="No serving endpoints found"
    description={search ? "Try adjusting your filters" : "Deploy your first model"}
    action={{ label: "Deploy Model", onClick: () => setShowWizard(true), icon: Rocket }}
  />
);
```

**Trade-off:** Slightly less flexible for conditional rendering logic.

### 3. Status Config Generator

Could create a factory function for generating status configs with custom labels:

```tsx
const DEPLOY_STATUS = createStatusConfig({
  READY: { label: "Ready", variant: "success" },
  NOT_READY: { label: "Starting", variant: "warning" },
  ...
});
```

**Trade-off:** Adds abstraction for marginal benefit given current usage.

## Testing Recommendations

After refactoring, verify:

1. **Deploy Page:**
   - Status badges render correctly for all endpoint states
   - Spin animation works for `NOT_READY` state
   - Empty state shows deployment wizard button
   - Filter controls work as expected

2. **Monitor Page:**
   - "Healthy" label appears for `READY` endpoints (not "Ready")
   - Status badges in sidebar cards render with correct size
   - Selected endpoint banner shows correct status label
   - Search filter works

3. **Training Runs Panel:**
   - Job status badges render correctly
   - Running jobs show spin animation
   - Pending/completed jobs show correct status

## Related Files

- `/frontend/src/components/EmptyState.tsx` - Preset empty state components
- `/frontend/src/components/WorkflowBanner.tsx` - Stage workflow navigation
- `/frontend/src/components/MetricCard.tsx` - Metric display component
- `/frontend/src/components/DataTable.tsx` - Reusable table component
- `/frontend/src/types/index.ts` - TypeScript type definitions

## Validation

Run the following to validate changes:

```bash
# Type check
npx tsc --noEmit

# Build check
npm run build

# Manual testing
npm run dev
# Navigate to Deploy page (/deploy)
# Navigate to Monitor page (/monitor)
# Navigate to Train page and check Training Runs Panel
```
