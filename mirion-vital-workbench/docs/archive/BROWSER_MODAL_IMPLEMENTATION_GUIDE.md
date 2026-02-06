# Browser Modal Implementation Guide

This guide documents the consistent browse-first modal pattern for all pipeline stages.

## Pattern Overview

Each stage follows this pattern:
1. **Browse Mode** - Full-page grid/list of existing items
2. **Create Button** - Opens a modal with two tabs:
   - "Your [Items]" - Browse existing with search/filter
   - "Create New" - Creation workflow or builder

## Implementation Status

### ✅ DATA Stage - SheetBuilder.tsx
- **Modal**: SheetBrowserModal
- **Items**: AI Sheets
- **Tabs**: "Your Sheets" / "Create from Table"
- **Status**: COMPLETE

### ✅ TEMPLATE Stage - TemplatePage.tsx
- **Modal**: TemplateBrowserModal
- **Items**: Templates (Databits)
- **Tabs**: "Your Templates" / "Create New"
- **Status**: COMPLETE

### ✅ CURATE Stage - CuratePage.tsx
- **Modal**: AssemblyBrowserModal
- **Items**: Assembled Datasets
- **Tabs**: "Your Assemblies" / "Create New"
- **Status**: COMPLETE

### 🟡 LABEL Stage - LabelingJobsPage.tsx
- **Modal**: LabelingJobBrowserModal (TO ADD)
- **Items**: Labeling Jobs
- **Tabs**: "Your Jobs" / "Create New Job"
- **Current**: Uses LabelingWorkflow router with separate pages

### 🟡 TRAIN Stage - TrainPage.tsx
- **Modal**: TrainingBrowserModal (TO ADD)
- **Items**: Assemblies ready for training
- **Tabs**: "Training Datasets" / "Configure Training"
- **Current**: Has browse/create modes, but no modal

### 🟡 DEPLOY Stage - DeployPage.tsx
- **Modal**: DeploymentBrowserModal (TO ADD)
- **Items**: Serving Endpoints
- **Tabs**: "Your Endpoints" / "Deploy New"
- **Current**: Shows endpoint list and deployment wizard separately

### 🟡 MONITOR Stage - MonitorPage.tsx
- **Modal**: MonitorBrowserModal (TO ADD)
- **Items**: Monitoring Dashboards
- **Tabs**: "Your Dashboards" / "Create Monitor"
- **Current**: Shows metrics and endpoint status

### 🟡 IMPROVE Stage - ImprovePage.tsx
- **Modal**: ExampleBrowserModal (TO ADD)
- **Items**: Few-shot Examples
- **Tabs**: "Example Store" / "Add Examples"
- **Current**: Shows feedback items and effectiveness dashboard

## Modal Template

Here's the standard template for adding a browser modal to any stage:

```typescript
// ============================================================================
// [Stage Name] Browser Modal - Unified browse existing + create new
// ============================================================================

interface [Stage]BrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExisting: (item: [ItemType]) => void;
  onCreateNew: () => void;
}

function [Stage]BrowserModal({
  isOpen,
  onClose,
  onSelectExisting,
  onCreateNew,
}: [Stage]BrowserModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch items
  const { data, isLoading, error } = useQuery({
    queryKey: ["[items]", searchQuery],
    queryFn: () => list[Items]({ /* query params */ }),
    enabled: isOpen,
  });

  const items = data?.[items] || [];
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-db-gray-800 flex items-center gap-2">
              <[Icon] className="w-6 h-6 text-[color]-600" />
              Select or Create [Item]
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-db-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-db-gray-200">
            <button
              onClick={() => setActiveTab("browse")}
              className={clsx(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                activeTab === "browse"
                  ? "border-[color]-600 text-[color]-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700"
              )}
            >
              Your [Items] ({filteredItems.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={clsx(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                activeTab === "create"
                  ? "border-[color]-600 text-[color]-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700"
              )}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Create New
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "browse" && (
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search [items]..."
                className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-[color]-500"
              />

              {/* Items Grid */}
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectExisting(item);
                        onClose();
                      }}
                      className="p-4 text-left border rounded-lg hover:border-[color]-400 hover:bg-[color]-50"
                    >
                      {/* Item card content */}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p>No [items] found</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 text-[color]-600"
                  >
                    Create your first [item] →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4">
              <p className="text-sm text-db-gray-500">
                [Creation instructions]
              </p>
              <div className="bg-[color]-50 border border-[color]-200 rounded-lg p-6 text-center">
                <[Icon] className="w-12 h-12 text-[color]-600 mx-auto mb-3" />
                <h3 className="font-medium mb-2">[Creation title]</h3>
                <p className="text-sm text-db-gray-600 mb-4">[Creation description]</p>
                <button
                  onClick={() => {
                    onCreateNew();
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-[color]-600 text-white rounded-lg hover:bg-[color]-700"
                >
                  [Create button text]
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Integration Steps for Each Stage

For each remaining stage:

1. **Add the modal component** before the main page component
2. **Add modal state** to the main component: `const [isBrowserOpen, setIsBrowserOpen] = useState(false);`
3. **Update the create button** to open the modal instead of directly creating
4. **Add the modal** to the JSX at the bottom of the component
5. **Import required icons**: Add `X`, `Plus`, `Loader2` to lucide-react imports

## Stage-Specific Details

### LABEL Stage (LabelingJobsPage)
- **API**: `listLabelingJobs()`, `createLabelingJob()`
- **Item Type**: `LabelingJob`
- **Color**: orange (`orange-600`)
- **Icon**: `ClipboardList`
- **Create Flow**: Opens form to create new labeling job from a sheet

### TRAIN Stage (TrainPage)
- **API**: `listAssemblies()`
- **Item Type**: `AssembledDataset`
- **Color**: green (`green-600`)
- **Icon**: `Sparkles`
- **Create Flow**: Shows training configuration panel

### DEPLOY Stage (DeployPage)
- **API**: `listServingEndpoints()`, `listModels()`
- **Item Type**: `ServingEndpoint` / `UCModel`
- **Color**: cyan (`cyan-600`)
- **Icon**: `Rocket`
- **Create Flow**: Deployment wizard with model selection

### MONITOR Stage (MonitorPage)
- **API**: `listServingEndpoints()`, `getFeedbackStats()`
- **Item Type**: `ServingEndpoint` (with monitoring)
- **Color**: rose (`rose-600`)
- **Icon**: `Activity`
- **Create Flow**: Dashboard configuration

### IMPROVE Stage (ImprovePage)
- **API**: `listExamples()`, `listFeedback()`
- **Item Type**: `ExampleRecord` / `FeedbackItem`
- **Color**: indigo (`indigo-600`)
- **Icon**: `Target`
- **Create Flow**: Add examples form or feedback conversion

## Benefits of This Pattern

1. **Consistency** - Same UX across all stages
2. **Discoverability** - Users see what exists before creating duplicates
3. **Efficiency** - Quick access to both browse and create
4. **Context** - Modal keeps users oriented within the stage
5. **Flexibility** - Can easily add filters, sorting, and advanced features

## Next Steps

Implement the remaining 5 browser modals following this template, customizing:
- Color scheme per stage
- Item card layout
- Create flow content
- Search/filter options
- Stage-specific metadata display
