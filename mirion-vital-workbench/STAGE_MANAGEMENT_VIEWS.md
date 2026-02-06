# Complete Stage Management Views - CRUD for All Stages

## Overview

Every stage needs:
1. **List View** - Browse all items with DataTable
2. **Create View** - Form to create new item
3. **Detail View** - View single item details
4. **Edit View** - Form to edit existing item
5. **Delete Action** - Remove item
6. **Status Actions** - Stage-specific workflow actions (publish, approve, archive, etc.)

---

## Stage 1: SHEETS - Data Sources Management

### Current State
✅ Already has full CRUD in DataPage (SheetBuilder)

### Components Needed
- ✅ List view with DataTable (exists)
- ✅ Create form with UC Browser (exists)
- ✅ Edit form (exists)
- ✅ Delete action (exists)
- ✅ Preview functionality (exists)

### API Endpoints (Existing)
```
GET    /sheets              - List all sheets
POST   /sheets              - Create sheet
GET    /sheets/{id}         - Get sheet details
PUT    /sheets/{id}         - Update sheet
DELETE /sheets/{id}         - Delete sheet
GET    /sheets/{id}/preview - Preview sheet data
POST   /sheets/{id}/publish - Publish sheet (NEW)
```

### New Features Needed
- [ ] Add **status field** to Sheet model (draft/published/archived)
- [ ] Add **Publish/Archive** buttons
- [ ] Add **version tracking**
- [ ] Add **usage stats** (how many assemblies use this sheet)

---

## Stage 2: LABELSETS - Label Collections Management

### Current State
❌ Does not exist yet

### Components Needed
- [ ] **LabelSetsPage** - Main management view
- [ ] **LabelsetCard** - Display component
- [ ] **LabelsetForm** - Create/edit form
- [ ] **LabelClassEditor** - Edit label classes
- [ ] **ResponseSchemaEditor** - Edit JSON schema
- [ ] **CanonicalLabelsView** - View linked canonical labels
- [ ] **LabelsetStatsCard** - Usage statistics

### Page Structure
```typescript
// LabelSetsPage.tsx
function LabelSetsPage() {
  // Modes: browse | create | detail | edit
  const [mode, setMode] = useState('browse');
  const [selectedLabelset, setSelectedLabelset] = useState(null);
  
  return (
    <div>
      {mode === 'browse' && <LabelsetBrowseView />}
      {mode === 'create' && <LabelsetCreateView />}
      {mode === 'detail' && <LabelsetDetailView labelset={selectedLabelset} />}
      {mode === 'edit' && <LabelsetEditView labelset={selectedLabelset} />}
    </div>
  );
}
```

### API Endpoints (New)
```
GET    /labelsets                           - List all labelsets
POST   /labelsets                           - Create labelset
GET    /labelsets/{id}                      - Get labelset details
PUT    /labelsets/{id}                      - Update labelset
DELETE /labelsets/{id}                      - Delete labelset
POST   /labelsets/{id}/publish              - Publish labelset
POST   /labelsets/{id}/archive              - Archive labelset
GET    /labelsets/{id}/canonical-labels     - Get linked canonical labels
GET    /labelsets/{id}/stats                - Get usage statistics
```

---

## Stage 3: TEMPLATES - Prompt Templates Management

### Current State
✅ Partially exists in TemplatePage (Tool overlay)

### Components Needed (Enhance Existing)
- ✅ List view (exists in TemplatePage)
- ✅ Create form (exists in TemplateBuilderPage)
- ✅ Edit form (exists in TemplateEditor)
- [ ] **Detail view** with preview
- [ ] **Version history** view
- [ ] **Usage tracking** (which assemblies use this template)
- [ ] **Publish/Archive** workflow
- [ ] **Test interface** (test template with sample data)

### Page Structure Enhancement
```typescript
// TemplatePage.tsx - ADD detail mode
function TemplatePage() {
  const [mode, setMode] = useState('browse'); // browse | create | detail | edit
  
  return (
    <div>
      {mode === 'browse' && <TemplateBrowseView />}
      {mode === 'create' && <TemplateBuilderPage />}
      {mode === 'detail' && <TemplateDetailView />}  {/* NEW */}
      {mode === 'edit' && <TemplateEditor />}
    </div>
  );
}
```

### API Endpoints (Enhance Existing)
```
GET    /templates              - List all templates
POST   /templates              - Create template
GET    /templates/{id}         - Get template details
PUT    /templates/{id}         - Update template
DELETE /templates/{id}         - Delete template
POST   /templates/{id}/publish - Publish template (NEW)
POST   /templates/{id}/archive - Archive template (NEW)
GET    /templates/{id}/stats   - Get usage statistics (NEW)
POST   /templates/{id}/test    - Test template with sample data (NEW)
```

---

## Stage 4: CONFIGURE - Sheet Configuration Management

### Current State
❌ Does not exist yet (need new page)

### Purpose
Attach TemplateConfig to Sheet (combines Sheet + Template + Labelset)

### Components Needed
- [ ] **ConfigurePage** - Main view
- [ ] **ConfigurationWizard** - Step-by-step wizard:
  - Step 1: Select Sheet
  - Step 2: Select Template
  - Step 3: Select Labelset (optional)
  - Step 4: Choose response source mode
  - Step 5: Preview configuration
- [ ] **ConfigurationCard** - Display saved configurations
- [ ] **ConfigurationPreview** - Preview what Assembly will look like

### Page Structure
```typescript
// ConfigurePage.tsx
function ConfigurePage() {
  // Two modes: list existing configs or create new
  const [mode, setMode] = useState<'browse' | 'wizard'>('browse');
  
  return (
    <div>
      {mode === 'browse' && <ConfigurationBrowseView />}
      {mode === 'wizard' && <ConfigurationWizard />}
    </div>
  );
}

// ConfigurationBrowseView shows all Sheets with attached TemplateConfigs
function ConfigurationBrowseView() {
  const { data: sheets } = useSheets({ has_template: true });
  
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Sheet Name' },
        { key: 'template_name', label: 'Template' },
        { key: 'labelset_name', label: 'Labelset' },
        { key: 'response_source_mode', label: 'Mode' },
        { key: 'status', label: 'Status' },
      ]}
      data={sheets}
      rowActions={[
        { label: 'Edit', onClick: (sheet) => openConfigWizard(sheet) },
        { label: 'Create Assembly', onClick: (sheet) => goToAssemble(sheet) },
        { label: 'Delete Config', onClick: (sheet) => detachTemplate(sheet) },
      ]}
    />
  );
}
```

### API Endpoints (Use Existing Sheet Endpoints)
```
GET    /sheets?has_template=true          - List configured sheets
POST   /sheets/{id}/attach-template       - Attach TemplateConfig to Sheet
PUT    /sheets/{id}/template-config       - Update attached TemplateConfig
DELETE /sheets/{id}/template-config       - Detach TemplateConfig
GET    /sheets/{id}/config-preview        - Preview configuration
```

---

## Stage 5: ASSEMBLE - Assembly Management

### Current State
✅ Partially exists in CuratePage

### Components Needed (Split CuratePage)
- [ ] **AssemblePage** - Main management view
- [ ] **AssemblyCard** - Display component
- [ ] **AssemblyCreateForm** - Create from configured sheet
- [ ] **AssemblyDetailView** - View assembly details
- [ ] **AssemblyPreviewTable** - Preview generated rows
- [ ] **GenerateResponsesPanel** - Trigger AI generation
- [ ] **AssemblyStatsCard** - Statistics (AI count, canonical reused, etc.)

### Page Structure
```typescript
// AssemblePage.tsx (renamed from CuratePage)
function AssemblePage() {
  const [mode, setMode] = useState<'browse' | 'create' | 'detail'>('browse');
  
  return (
    <div>
      {mode === 'browse' && <AssemblyBrowseView />}
      {mode === 'create' && <AssemblyCreateView />}
      {mode === 'detail' && <AssemblyDetailView />}
    </div>
  );
}

// Browse: List all assemblies with status
function AssemblyBrowseView() {
  const { data } = useAssemblies();
  
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Assembly Name' },
        { key: 'sheet_name', label: 'Source Sheet' },
        { key: 'total_rows', label: 'Total Rows' },
        { key: 'canonical_reused_count', label: 'Canonical Reused' },
        { key: 'ai_generated_count', label: 'AI Generated' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created' },
      ]}
      data={data?.assemblies}
      rowActions={[
        { label: 'View Details', onClick: (asm) => setMode('detail') },
        { label: 'Generate Responses', onClick: (asm) => generateResponses(asm) },
        { label: 'Mark Ready for Review', onClick: (asm) => markReady(asm) },
        { label: 'Delete', onClick: (asm) => deleteAssembly(asm) },
      ]}
    />
  );
}

// Detail: View single assembly with preview
function AssemblyDetailView({ assembly }) {
  return (
    <div>
      <AssemblyStatsCard assembly={assembly} />
      <AssemblyPreviewTable assemblyId={assembly.id} />
      <div className="flex gap-2">
        <button onClick={() => generateResponses()}>Generate Responses</button>
        <button onClick={() => markReady()}>Mark Ready for Review</button>
      </div>
    </div>
  );
}
```

### API Endpoints (Existing + New)
```
GET    /assemblies                     - List all assemblies
POST   /assemblies                     - Create assembly
GET    /assemblies/{id}                - Get assembly details
PUT    /assemblies/{id}                - Update assembly
DELETE /assemblies/{id}                - Delete assembly
GET    /assemblies/{id}/preview        - Preview rows
POST   /assemblies/{id}/generate       - Generate AI responses
POST   /assemblies/{id}/mark-ready     - Mark as ready for review (NEW)
GET    /assemblies/{id}/stats          - Get detailed statistics (NEW)
```

---

## Stage 6: REVIEW - Review & Verification Management

### Current State
✅ Exists as LabelingJobsPage (but focused on enterprise workflows)

### Components Needed (Enhance + Simplify)
- [ ] **ReviewPage** - Main management view
- [ ] **ReviewQueueView** - List assemblies ready for review
- [ ] **ReviewInterface** - Row-by-row review UI
- [ ] **VerificationPanel** - Side panel with prompt/response/source data
- [ ] **CanonicalLabelCreator** - Quick create canonical labels
- [ ] **ReviewStatsCard** - Progress tracking
- [ ] **BulkActionsPanel** - Approve/flag multiple rows

### Page Structure
```typescript
// ReviewPage.tsx
function ReviewPage() {
  const [mode, setMode] = useState<'queue' | 'reviewing'>('queue');
  const [currentAssembly, setCurrentAssembly] = useState(null);
  
  return (
    <div>
      {mode === 'queue' && (
        <ReviewQueueView
          onSelectAssembly={(asm) => {
            setCurrentAssembly(asm);
            setMode('reviewing');
          }}
        />
      )}
      {mode === 'reviewing' && (
        <ReviewInterface assembly={currentAssembly} />
      )}
    </div>
  );
}

// Queue: List assemblies ready for review
function ReviewQueueView({ onSelectAssembly }) {
  const { data } = useAssemblies({ status: 'ready' });
  
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Assembly Name' },
        { key: 'total_rows', label: 'Total Rows' },
        { key: 'ai_generated_count', label: 'Needs Review' },
        { key: 'human_verified_count', label: 'Verified' },
        { key: 'progress', label: 'Progress' },
        { key: 'created_at', label: 'Created' },
      ]}
      data={data?.assemblies}
      onRowClick={onSelectAssembly}
      rowActions={[
        { label: 'Start Review', onClick: onSelectAssembly },
        { label: 'Mark as Reviewed', onClick: (asm) => markReviewed(asm) },
      ]}
    />
  );
}

// Reviewing: Row-by-row review interface
function ReviewInterface({ assembly }) {
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const { data: rows } = useAssemblyPreview(assembly.id);
  const updateRowMutation = useUpdateAssemblyRow();
  
  const currentRow = rows?.[currentRowIndex];
  
  return (
    <div className="flex h-screen">
      {/* Left: Row list */}
      <div className="w-1/4 border-r overflow-y-auto">
        <RowList
          rows={rows}
          currentIndex={currentRowIndex}
          onSelectRow={setCurrentRowIndex}
        />
      </div>
      
      {/* Center: Prompt/Response viewer */}
      <div className="flex-1 p-6">
        <PromptViewer prompt={currentRow?.prompt} />
        <ResponseEditor
          response={currentRow?.response}
          onSave={(newResponse) => updateRowMutation.mutate({
            assemblyId: assembly.id,
            rowIndex: currentRowIndex,
            response: newResponse,
            mark_as_verified: true,
          })}
        />
        
        <div className="flex gap-2 mt-4">
          <button onClick={() => setCurrentRowIndex(i => i - 1)}>Previous</button>
          <button onClick={() => setCurrentRowIndex(i => i + 1)}>Next</button>
          <button onClick={() => createCanonicalLabel(currentRow)}>
            Save as Canonical
          </button>
          <button onClick={() => flagRow(currentRow)}>Flag</button>
        </div>
      </div>
      
      {/* Right: Source data + stats */}
      <div className="w-1/4 border-l overflow-y-auto p-4">
        <SourceDataViewer data={currentRow?.source_data} />
        <ReviewStatsCard assemblyId={assembly.id} />
      </div>
    </div>
  );
}
```

### API Endpoints (Existing + New)
```
GET    /assemblies?status=ready         - List assemblies ready for review
GET    /assemblies/{id}/rows            - Get all rows for review
PUT    /assemblies/{id}/rows/{index}    - Update single row
POST   /assemblies/{id}/bulk-update     - Update multiple rows (NEW)
POST   /assemblies/{id}/mark-reviewed   - Mark assembly as reviewed (NEW)
GET    /assemblies/{id}/review-stats    - Get review progress stats (NEW)
```

---

## Stage 7: CURATE - Curated Datasets Management

### Current State
❌ Does not exist yet

### Components Needed
- [ ] **CuratePage** - Main management view
- [ ] **CuratedDatasetCard** - Display component
- [ ] **DatasetCreationWizard** - Create from reviewed assembly
- [ ] **ExampleSelectorInterface** - Select specific rows
- [ ] **SplitConfigPanel** - Configure train/val/test splits
- [ ] **QualityMetricsCard** - Show dataset quality
- [ ] **DatasetPreviewTable** - Preview selected examples
- [ ] **ExportPanel** - Export to JSONL

### Page Structure
```typescript
// CuratePage.tsx (NEW - separate from AssemblePage)
function CuratePage() {
  const [mode, setMode] = useState<'browse' | 'create' | 'detail'>('browse');
  
  return (
    <div>
      {mode === 'browse' && <CuratedDatasetBrowseView />}
      {mode === 'create' && <DatasetCreationWizard />}
      {mode === 'detail' && <CuratedDatasetDetailView />}
    </div>
  );
}

// Browse: List all curated datasets
function CuratedDatasetBrowseView() {
  const { data } = useCuratedDatasets();
  
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Dataset Name' },
        { key: 'assembly_name', label: 'Source Assembly' },
        { key: 'quality_metrics.total_examples', label: 'Total Examples' },
        { key: 'quality_metrics.verified_count', label: 'Verified' },
        { key: 'quality_metrics.canonical_count', label: 'Canonical' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created' },
      ]}
      data={data?.datasets}
      rowActions={[
        { label: 'View Details', onClick: (ds) => setMode('detail') },
        { label: 'Edit Selection', onClick: (ds) => setMode('create') },
        { label: 'Approve', onClick: (ds) => approveDataset(ds) },
        { label: 'Export', onClick: (ds) => exportDataset(ds) },
        { label: 'Delete', onClick: (ds) => deleteDataset(ds) },
      ]}
    />
  );
}

// Create: Wizard to select examples and configure splits
function DatasetCreationWizard() {
  const [step, setStep] = useState(1);
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [splitConfig, setSplitConfig] = useState({ train: 80, val: 20 });
  
  return (
    <div>
      {step === 1 && (
        <AssemblySelector
          onSelect={(asm) => {
            setSelectedAssembly(asm);
            setStep(2);
          }}
          filter={{ status: 'reviewed' }}
        />
      )}
      {step === 2 && (
        <ExampleSelectorInterface
          assemblyId={selectedAssembly.id}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <SplitConfigPanel
          totalExamples={selectedRows.length}
          splitConfig={splitConfig}
          onConfigChange={setSplitConfig}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <DatasetReviewPanel
          assembly={selectedAssembly}
          selectedRows={selectedRows}
          splitConfig={splitConfig}
          onCreateDataset={createDataset}
        />
      )}
    </div>
  );
}

// Detail: View curated dataset with quality report
function CuratedDatasetDetailView({ dataset }) {
  return (
    <div>
      <QualityMetricsCard dataset={dataset} />
      <SplitVisualization splitConfig={dataset.split_config} />
      <DatasetPreviewTable datasetId={dataset.id} />
      <div className="flex gap-2">
        <button onClick={() => approveDataset()}>Approve for Training</button>
        <button onClick={() => exportDataset()}>Export to JSONL</button>
        <button onClick={() => editDataset()}>Edit Selection</button>
      </div>
    </div>
  );
}
```

### API Endpoints (New)
```
GET    /curated-datasets                  - List all curated datasets
POST   /curated-datasets                  - Create curated dataset
GET    /curated-datasets/{id}             - Get dataset details
PUT    /curated-datasets/{id}             - Update dataset
DELETE /curated-datasets/{id}             - Delete dataset
GET    /curated-datasets/{id}/preview     - Preview examples
POST   /curated-datasets/{id}/approve     - Approve for training
POST   /curated-datasets/{id}/export      - Export to JSONL
GET    /curated-datasets/{id}/quality-report - Get quality report
```

---

## Stage 8: TRAIN - Training Jobs Management

### Current State
✅ Exists as TrainPage (but needs enhancement)

### Components Needed (Enhance Existing)
- [ ] **TrainingJobCard** - Display component
- [ ] **TrainingJobBrowseView** - List all training jobs
- [ ] **TrainingJobCreateForm** - Create from curated dataset
- [ ] **TrainingJobDetailView** - View job details
- [ ] **TrainingMetricsChart** - Loss curves, accuracy plots
- [ ] **HyperparameterPanel** - Configure training params
- [ ] **ModelRegistryView** - View registered models

### Page Structure Enhancement
```typescript
// TrainPage.tsx - ENHANCE
function TrainPage() {
  const [mode, setMode] = useState<'browse' | 'create' | 'detail'>('browse');
  
  return (
    <div>
      {mode === 'browse' && <TrainingJobBrowseView />}
      {mode === 'create' && <TrainingJobCreateForm />}
      {mode === 'detail' && <TrainingJobDetailView />}
    </div>
  );
}

// Browse: List all training jobs
function TrainingJobBrowseView() {
  const { data } = useTrainingJobs();
  
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Job Name' },
        { key: 'dataset_name', label: 'Dataset' },
        { key: 'base_model', label: 'Base Model' },
        { key: 'status', label: 'Status' },
        { key: 'progress', label: 'Progress' },
        { key: 'best_accuracy', label: 'Best Accuracy' },
        { key: 'created_at', label: 'Started' },
      ]}
      data={data?.jobs}
      rowActions={[
        { label: 'View Details', onClick: (job) => setMode('detail') },
        { label: 'View Logs', onClick: (job) => viewLogs(job) },
        { label: 'Stop Job', onClick: (job) => stopJob(job) },
        { label: 'Register Model', onClick: (job) => registerModel(job) },
      ]}
    />
  );
}

// Create: Form to start training job
function TrainingJobCreateForm() {
  const { data: datasets } = useCuratedDatasets({ status: 'approved' });
  
  return (
    <div>
      <CuratedDatasetSelector datasets={datasets} />
      <BaseModelSelector />
      <HyperparameterPanel />
      <button onClick={startTraining}>Start Training</button>
    </div>
  );
}

// Detail: View training progress
function TrainingJobDetailView({ job }) {
  return (
    <div>
      <TrainingJobStatsCard job={job} />
      <TrainingMetricsChart jobId={job.id} />
      <LogViewer jobId={job.id} />
      <ModelArtifactsPanel jobId={job.id} />
    </div>
  );
}
```

### API Endpoints (New)
```
GET    /training-jobs              - List all training jobs
POST   /training-jobs              - Create training job
GET    /training-jobs/{id}         - Get job details
DELETE /training-jobs/{id}         - Cancel/delete job
POST   /training-jobs/{id}/stop    - Stop running job
GET    /training-jobs/{id}/metrics - Get training metrics
GET    /training-jobs/{id}/logs    - Get training logs
POST   /training-jobs/{id}/register-model - Register trained model
```

---

## Stage 9: DEPLOY, MONITOR, IMPROVE

### Deploy Page Enhancement
```
GET    /deployments                - List all deployments
POST   /deployments                - Create deployment
GET    /deployments/{id}           - Get deployment details
PUT    /deployments/{id}           - Update deployment
DELETE /deployments/{id}           - Delete deployment
POST   /deployments/{id}/start     - Start endpoint
POST   /deployments/{id}/stop      - Stop endpoint
GET    /deployments/{id}/metrics   - Get deployment metrics
```

### Monitor Page Enhancement
```
GET    /monitoring/endpoints       - List monitored endpoints
GET    /monitoring/{id}/metrics    - Get metrics for endpoint
GET    /monitoring/{id}/logs       - Get prediction logs
GET    /monitoring/{id}/alerts     - Get active alerts
POST   /monitoring/{id}/alerts     - Create alert rule
```

### Improve Page Enhancement
```
GET    /feedback                   - List feedback items
POST   /feedback                   - Submit feedback
GET    /feedback/{id}              - Get feedback details
POST   /feedback/{id}/add-to-training - Add to training set
GET    /improvement-suggestions    - Get automated suggestions
```

---

## Summary: Complete CRUD Matrix

| Stage | List View | Create | Detail | Edit | Delete | Status Actions |
|-------|-----------|--------|--------|------|--------|----------------|
| **Sheets** | ✅ | ✅ | ✅ | ✅ | ✅ | Publish, Archive |
| **Labelsets** | ❌ | ❌ | ❌ | ❌ | ❌ | Publish, Archive |
| **Templates** | ✅ | ✅ | 🟡 | ✅ | ✅ | Publish, Archive |
| **Configure** | ❌ | ❌ | ❌ | ❌ | ❌ | Attach, Detach |
| **Assemble** | 🟡 | 🟡 | 🟡 | ❌ | ❌ | Mark Ready, Generate |
| **Review** | ✅ | N/A | ✅ | ✅ | ❌ | Mark Reviewed, Flag |
| **Curate** | ❌ | ❌ | ❌ | ❌ | ❌ | Approve, Export |
| **Train** | 🟡 | 🟡 | 🟡 | ❌ | ❌ | Stop, Register |
| **Deploy** | 🟡 | 🟡 | 🟡 | ❌ | ✅ | Start, Stop |
| **Monitor** | ✅ | N/A | ✅ | ❌ | ❌ | Create Alerts |
| **Improve** | ✅ | ✅ | ✅ | ❌ | ❌ | Add to Training |

**Legend:**
- ✅ Exists and complete
- 🟡 Partially exists, needs enhancement
- ❌ Does not exist, needs to be built

---

## Implementation Priority

### High Priority (Core Workflow)
1. **Labelsets** - Complete CRUD (doesn't exist)
2. **Curate** - Complete CRUD (doesn't exist)
3. **Configure** - Complete CRUD (doesn't exist)
4. **Assemble** - Enhance with proper list/detail views
5. **Templates** - Add detail view and status actions

### Medium Priority (Enhancements)
6. **Sheets** - Add publish/archive workflow
7. **Review** - Simplify for single-user workflow
8. **Train** - Add proper list/detail views

### Low Priority (Future)
9. **Deploy** - Enhance management
10. **Monitor** - Add alert management
11. **Improve** - Build feedback system

---

## Next Steps

Should I start implementing:
1. **Labelsets full CRUD** (highest priority, brand new)
2. **Curated Datasets full CRUD** (highest priority, brand new)
3. **Configure page full CRUD** (new workflow step)
4. **Enhance existing pages** (Assemble, Train, etc.)

Which would you like me to start with?
