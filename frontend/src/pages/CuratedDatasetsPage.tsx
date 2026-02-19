/**
 * CuratedDatasetsPage - Manage training-ready QA datasets
 *
 * Features:
 * - Browse view: DataTable with all curated datasets
 * - Create view: Form to create new dataset
 * - Detail view: View dataset with metrics and preview
 * - Edit view: Form to edit existing dataset
 * - Actions: Approve, archive, mark in-use, export, compute metrics
 */

import { useState } from 'react';
import {
  Plus,
  Edit,
  Archive,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Download,
  BarChart3,
  ArrowLeft,
  RefreshCw,
  Play,
  Database,
} from 'lucide-react';
import { clsx } from 'clsx';
import { QualityGatePanel } from '../components/QualityGatePanel';
import { DataTable, Column, RowAction } from '../components/DataTable';
import {
  useCuratedDatasets,
  useDeleteCuratedDataset,
  useApproveDataset,
  useArchiveDataset,
  useMarkDatasetInUse,
  useComputeDatasetMetrics,
  useExportDataset,
  useCuratedDataset,
  useDatasetPreview,
} from '../hooks/useCuratedDatasets';
import { CuratedDatasetForm } from '../components/CuratedDatasetForm';
import type { CuratedDataset, DatasetStatus } from '../types';
import { useToast } from '../components/Toast';

type ViewMode = 'browse' | 'create' | 'detail' | 'edit';

// ============================================================================
// Main Page Component
// ============================================================================

export function CuratedDatasetsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedDataset, setSelectedDataset] = useState<CuratedDataset | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<DatasetStatus | ''>('');

  const handleSelectDataset = (dataset: CuratedDataset, mode: ViewMode) => {
    setSelectedDataset(dataset);
    setViewMode(mode);
  };

  const handleBack = () => {
    setViewMode('browse');
    setSelectedDataset(null);
  };

  return (
    <div className="h-screen flex flex-col bg-db-gray-50 dark:bg-gray-950">
      {viewMode === 'browse' && (
        <DatasetBrowseView
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectDataset={handleSelectDataset}
          onCreate={() => setViewMode('create')}
        />
      )}

      {viewMode === 'create' && (
        <DatasetCreateView
          onBack={handleBack}
          onSaved={(dataset) => {
            setSelectedDataset(dataset);
            setViewMode('detail');
          }}
        />
      )}

      {viewMode === 'detail' && selectedDataset && (
        <DatasetDetailView
          dataset={selectedDataset}
          onBack={handleBack}
          onEdit={() => setViewMode('edit')}
        />
      )}

      {viewMode === 'edit' && selectedDataset && (
        <DatasetEditView
          dataset={selectedDataset}
          onBack={handleBack}
          onSaved={(dataset) => {
            setSelectedDataset(dataset);
            setViewMode('detail');
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Browse View
// ============================================================================

interface DatasetBrowseViewProps {
  statusFilter: DatasetStatus | '';
  onStatusFilterChange: (status: DatasetStatus | '') => void;
  onSelectDataset: (dataset: CuratedDataset, mode: ViewMode) => void;
  onCreate: () => void;
}

function DatasetBrowseView({
  statusFilter,
  onStatusFilterChange,
  onSelectDataset,
  onCreate,
}: DatasetBrowseViewProps) {
  const { data, isLoading, error } = useCuratedDatasets({
    status: statusFilter || undefined,
  });
  const deleteMutation = useDeleteCuratedDataset();
  const approveMutation = useApproveDataset();
  const archiveMutation = useArchiveDataset();
  const markInUseMutation = useMarkDatasetInUse();
  const computeMetricsMutation = useComputeDatasetMetrics();
  const exportMutation = useExportDataset();
  const { success: successToast, error: errorToast } = useToast();

  const columns: Column<CuratedDataset>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (dataset: CuratedDataset) => <StatusBadge status={dataset.status} />,
    },
    {
      key: 'name',
      header: 'Name',
      render: (dataset: CuratedDataset) => dataset.name,
    },
    {
      key: 'use_case',
      header: 'Use Case',
      render: (dataset: CuratedDataset) => dataset.use_case || '-',
    },
    {
      key: 'example_count',
      header: 'Examples',
      render: (dataset: CuratedDataset) => dataset.example_count,
    },
    {
      key: 'quality_metrics',
      header: 'Avg Confidence',
      render: (dataset: CuratedDataset) => {
        const conf = dataset.quality_metrics?.avg_confidence;
        return conf !== undefined ? `${(conf * 100).toFixed(1)}%` : '-';
      },
    },
    {
      key: 'version',
      header: 'Version',
      render: (dataset: CuratedDataset) => dataset.version,
    },
  ];

  const rowActions: RowAction<CuratedDataset>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (dataset: CuratedDataset) => onSelectDataset(dataset, 'detail'),
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (dataset: CuratedDataset) => onSelectDataset(dataset, 'edit'),
      show: (dataset: CuratedDataset) => dataset.status === 'draft',
    },
    {
      label: 'Compute Metrics',
      icon: RefreshCw,
      onClick: async (dataset: CuratedDataset) => {
        try {
          await computeMetricsMutation.mutateAsync(dataset.id);
          successToast('Metrics computed successfully');
        } catch {
          errorToast('Failed to compute metrics');
        }
      },
    },
    {
      label: 'Approve',
      icon: CheckCircle,
      onClick: async (dataset: CuratedDataset) => {
        try {
          await approveMutation.mutateAsync({
            id: dataset.id,
            approval: { approved_by: 'current-user' },
          });
          successToast('Dataset approved');
        } catch {
          errorToast('Failed to approve dataset');
        }
      },
      show: (dataset: CuratedDataset) => dataset.status === 'draft',
    },
    {
      label: 'Mark In Use',
      icon: Play,
      onClick: async (dataset: CuratedDataset) => {
        try {
          await markInUseMutation.mutateAsync(dataset.id);
          successToast('Dataset marked as in-use');
        } catch {
          errorToast('Failed to mark dataset in-use');
        }
      },
      show: (dataset: CuratedDataset) => dataset.status === 'approved',
    },
    {
      label: 'Export',
      icon: Download,
      onClick: async (dataset: CuratedDataset) => {
        try {
          const result = await exportMutation.mutateAsync({
            id: dataset.id,
            format: 'jsonl',
          });
          // Trigger download
          const blob = new Blob([JSON.stringify(result.examples, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${dataset.name}-${dataset.version}.jsonl`;
          a.click();
          URL.revokeObjectURL(url);
          successToast('Dataset exported');
        } catch {
          errorToast('Failed to export dataset');
        }
      },
      show: (dataset: CuratedDataset) =>
        dataset.status === 'approved' || dataset.status === 'in_use',
    },
    {
      label: 'Archive',
      icon: Archive,
      onClick: async (dataset: CuratedDataset) => {
        try {
          await archiveMutation.mutateAsync(dataset.id);
          successToast('Dataset archived');
        } catch {
          errorToast('Failed to archive dataset');
        }
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: async (dataset: CuratedDataset) => {
        if (
          confirm(
            `Delete dataset "${dataset.name}"? This cannot be undone.`
          )
        ) {
          try {
            await deleteMutation.mutateAsync(dataset.id);
            successToast('Dataset deleted');
          } catch {
            errorToast('Failed to delete dataset');
          }
        }
      },
      show: (dataset: CuratedDataset) =>
        dataset.status === 'draft' || dataset.status === 'archived',
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Curated Datasets
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Training-ready QA pairs selected from reviewed assemblies
            </p>
          </div>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-db-blue-600 text-white rounded-lg hover:bg-db-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Dataset
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as DatasetStatus | '')
            }
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="in_use">In Use</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Error loading datasets: {error.message}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {data && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.total} dataset{data.total !== 1 ? 's' : ''} found
              </p>
            </div>

            <DataTable
              columns={columns}
              data={data.datasets}
              rowKey={(dataset: CuratedDataset) => dataset.id}
              rowActions={rowActions}
              emptyState={
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No curated datasets found. Create your first dataset to get started.
                </div>
              }
            />
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Create View
// ============================================================================

interface DatasetCreateViewProps {
  onBack: () => void;
  onSaved: (dataset: CuratedDataset) => void;
}

function DatasetCreateView({ onBack, onSaved }: DatasetCreateViewProps) {
  return (
    <>
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Create Curated Dataset
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select assemblies and configure training dataset
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <CuratedDatasetForm onCancel={onBack} onSaved={onSaved} />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Detail View
// ============================================================================

interface DatasetDetailViewProps {
  dataset: CuratedDataset;
  onBack: () => void;
  onEdit: () => void;
}

function DatasetDetailView({ dataset, onBack, onEdit }: DatasetDetailViewProps) {
  const { data: refreshedDataset } = useCuratedDataset(dataset.id);
  const { data: preview } = useDatasetPreview(dataset.id, 10);
  const currentDataset = refreshedDataset || dataset;

  return (
    <>
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {currentDataset.name}
                </h1>
                <StatusBadge status={currentDataset.status} />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {currentDataset.description || 'No description'}
              </p>
            </div>
          </div>
          {currentDataset.status === 'draft' && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-db-blue-600 text-white rounded-lg hover:bg-db-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Examples"
              value={currentDataset.example_count.toLocaleString()}
              icon={Database}
            />
            <StatCard
              label="Avg Confidence"
              value={
                currentDataset.quality_metrics?.avg_confidence
                  ? `${(currentDataset.quality_metrics.avg_confidence * 100).toFixed(1)}%`
                  : '-'
              }
              icon={BarChart3}
            />
            <StatCard
              label="Human Verified"
              value={
                currentDataset.quality_metrics?.human_verified_count?.toLocaleString() ||
                '-'
              }
              icon={CheckCircle}
            />
            <StatCard
              label="Version"
              value={currentDataset.version}
              icon={AlertCircle}
            />
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Metadata
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Use Case
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentDataset.use_case || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Labelset ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentDataset.labelset_id || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Quality Threshold
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {(currentDataset.quality_threshold * 100).toFixed(0)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Assemblies
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {currentDataset.assembly_ids.length} linked
                </dd>
              </div>
              {currentDataset.created_by && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created By
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.created_by}
                  </dd>
                </div>
              )}
              {currentDataset.approved_by && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Approved By
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.approved_by}
                  </dd>
                </div>
              )}
            </dl>

            {currentDataset.tags && currentDataset.tags.length > 0 && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Tags
                </dt>
                <div className="flex flex-wrap gap-2">
                  {currentDataset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quality Metrics */}
          {currentDataset.quality_metrics && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quality Metrics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Response Length (Avg)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.quality_metrics.response_length_avg.toFixed(1)}{' '}
                    chars
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Response Length (Std)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.quality_metrics.response_length_std.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    AI Generated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.quality_metrics.ai_generated_count.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pre-Labeled
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {currentDataset.quality_metrics.pre_labeled_count.toLocaleString()}
                  </dd>
                </div>
              </div>

              {Object.keys(currentDataset.quality_metrics.label_distribution)
                .length > 0 && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Label Distribution
                  </dt>
                  <div className="space-y-2">
                    {Object.entries(
                      currentDataset.quality_metrics.label_distribution
                    ).map(([label, count]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {label}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality Gate */}
          <QualityGatePanel collectionId={currentDataset.id} />

          {/* Preview */}
          {preview && preview.examples.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Example Preview
              </h2>
              <div className="space-y-4">
                {preview.examples.map((example) => (
                  <div
                    key={example.example_id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Prompt:
                      </span>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {example.prompt}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Response:
                      </span>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {example.response}
                      </p>
                    </div>
                    {example.label && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {example.label}
                        </span>
                        {example.confidence && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(example.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Edit View
// ============================================================================

interface DatasetEditViewProps {
  dataset: CuratedDataset;
  onBack: () => void;
  onSaved: (dataset: CuratedDataset) => void;
}

function DatasetEditView({ dataset, onBack, onSaved }: DatasetEditViewProps) {
  return (
    <>
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Edit Dataset
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {dataset.name}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <CuratedDatasetForm
            dataset={dataset}
            onCancel={onBack}
            onSaved={onSaved}
          />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: DatasetStatus }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    approved:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    in_use: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    archived:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };

  const icons = {
    draft: AlertCircle,
    approved: CheckCircle,
    in_use: Play,
    archived: Archive,
  };

  const Icon = icons[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        styles[status]
      )}
    >
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ')}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
