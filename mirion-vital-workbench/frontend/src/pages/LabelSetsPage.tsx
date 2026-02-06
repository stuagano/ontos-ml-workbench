/**
 * LabelSetsPage - Manage reusable label collections
 *
 * Features:
 * - Browse view: DataTable with all labelsets
 * - Create view: Form to create new labelset
 * - Detail view: View labelset with stats and canonical labels
 * - Edit view: Form to edit existing labelset
 * - Actions: Publish, archive, delete
 */

import { useState } from 'react';
import {
  Plus,
  Edit,
  Archive,
  Eye,
  Trash2,
  Tag,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DataTable, Column, RowAction } from '../components/DataTable';
import {
  useLabelsets,
  useDeleteLabelset,
  usePublishLabelset,
  useArchiveLabelset,
  useLabelset,
  useLabelsetStats,
  useLabelsetCanonicalLabels,
} from '../hooks/useLabelsets';
import { LabelsetForm } from '../components/LabelsetForm';
import type { Labelset, LabelsetStatus } from '../types';
import { useToast } from '../components/Toast';

type ViewMode = 'browse' | 'create' | 'detail' | 'edit';

// ============================================================================
// Main Page Component
// ============================================================================

export function LabelSetsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedLabelset, setSelectedLabelset] = useState<Labelset | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<LabelsetStatus | ''>('');

  const handleSelectLabelset = (labelset: Labelset, mode: ViewMode) => {
    setSelectedLabelset(labelset);
    setViewMode(mode);
  };

  const handleBack = () => {
    setViewMode('browse');
    setSelectedLabelset(null);
  };

  return (
    <div className="h-screen flex flex-col bg-db-gray-50 dark:bg-gray-950">
      {viewMode === 'browse' && (
        <LabelsetBrowseView
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectLabelset={handleSelectLabelset}
          onCreate={() => setViewMode('create')}
        />
      )}

      {viewMode === 'create' && (
        <LabelsetCreateView
          onBack={handleBack}
          onSaved={(labelset) => {
            setSelectedLabelset(labelset);
            setViewMode('detail');
          }}
        />
      )}

      {viewMode === 'detail' && selectedLabelset && (
        <LabelsetDetailView
          labelset={selectedLabelset}
          onBack={handleBack}
          onEdit={() => setViewMode('edit')}
        />
      )}

      {viewMode === 'edit' && selectedLabelset && (
        <LabelsetEditView
          labelset={selectedLabelset}
          onBack={handleBack}
          onSaved={(updated) => {
            setSelectedLabelset(updated);
            setViewMode('detail');
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Browse View - List all labelsets
// ============================================================================

interface LabelsetBrowseViewProps {
  statusFilter: LabelsetStatus | '';
  onStatusFilterChange: (status: LabelsetStatus | '') => void;
  onSelectLabelset: (labelset: Labelset, mode: ViewMode) => void;
  onCreate: () => void;
}

function LabelsetBrowseView({
  statusFilter,
  onStatusFilterChange,
  onSelectLabelset,
  onCreate,
}: LabelsetBrowseViewProps) {
  const { data, isLoading } = useLabelsets({
    status: statusFilter || undefined,
  });
  const deleteMutation = useDeleteLabelset();
  const publishMutation = usePublishLabelset();
  const archiveMutation = useArchiveLabelset();
  const { showToast } = useToast();

  const columns: Column[] = [
    {
      key: 'status',
      label: 'Status',
      render: (labelset: Labelset) => (
        <StatusBadge status={labelset.status} />
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'label_type', label: 'Label Type' },
    {
      key: 'label_classes',
      label: 'Classes',
      render: (labelset: Labelset) => labelset.label_classes.length,
    },
    {
      key: 'canonical_label_count',
      label: 'Canonical Labels',
      render: (labelset: Labelset) => (
        <span className="text-cyan-600 dark:text-cyan-400">
          {labelset.canonical_label_count}
        </span>
      ),
    },
    { key: 'use_case', label: 'Use Case' },
    {
      key: 'tags',
      label: 'Tags',
      render: (labelset: Labelset) =>
        labelset.tags?.length ? (
          <div className="flex gap-1 flex-wrap">
            {labelset.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-db-gray-100 dark:bg-gray-800 text-db-gray-600 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
            {labelset.tags.length > 2 && (
              <span className="text-xs text-db-gray-500">
                +{labelset.tags.length - 2}
              </span>
            )}
          </div>
        ) : null,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (labelset: Labelset) =>
        labelset.created_at
          ? new Date(labelset.created_at).toLocaleDateString()
          : '—',
    },
  ];

  const rowActions: RowAction[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (labelset) => onSelectLabelset(labelset, 'detail'),
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (labelset) => onSelectLabelset(labelset, 'edit'),
      condition: (labelset) => labelset.status === 'draft',
    },
    {
      label: 'Publish',
      icon: CheckCircle,
      onClick: async (labelset) => {
        try {
          await publishMutation.mutateAsync(labelset.id);
          showToast('Labelset published successfully', 'success');
        } catch (error: any) {
          showToast(error.message || 'Failed to publish labelset', 'error');
        }
      },
      condition: (labelset) => labelset.status === 'draft',
    },
    {
      label: 'Archive',
      icon: Archive,
      onClick: async (labelset) => {
        if (
          confirm(
            `Archive labelset "${labelset.name}"? It will be hidden from lists.`
          )
        ) {
          try {
            await archiveMutation.mutateAsync(labelset.id);
            showToast('Labelset archived successfully', 'success');
          } catch (error: any) {
            showToast(error.message || 'Failed to archive labelset', 'error');
          }
        }
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: async (labelset) => {
        if (
          confirm(
            `Delete labelset "${labelset.name}"? This cannot be undone.`
          )
        ) {
          try {
            await deleteMutation.mutateAsync(labelset.id);
            showToast('Labelset deleted successfully', 'success');
          } catch (error: any) {
            showToast(error.message || 'Failed to delete labelset', 'error');
          }
        }
      },
      condition: (labelset) =>
        labelset.status === 'draft' && labelset.canonical_label_count === 0,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-db-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div>
          <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-pink-500" />
            Labelsets
          </h1>
          <p className="text-sm text-db-gray-600 dark:text-gray-400 mt-1">
            Manage reusable label collections for training datasets
          </p>
        </div>

        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Labelset
        </button>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-db-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-db-gray-700 dark:text-gray-300">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
            className="px-3 py-1.5 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {data && (
            <span className="text-sm text-db-gray-600 dark:text-gray-400 ml-auto">
              {data.total} labelsets
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <DataTable
          columns={columns}
          data={data?.labelsets || []}
          rowActions={rowActions}
          isLoading={isLoading}
          onRowClick={(labelset) => onSelectLabelset(labelset, 'detail')}
        />
      </div>
    </>
  );
}

// ============================================================================
// Create View - Form to create new labelset
// ============================================================================

interface LabelsetCreateViewProps {
  onBack: () => void;
  onSaved: (labelset: Labelset) => void;
}

function LabelsetCreateView({ onBack, onSaved }: LabelsetCreateViewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Labelsets
        </button>

        <h2 className="text-xl font-bold text-db-gray-800 dark:text-white mb-6">
          Create New Labelset
        </h2>

        <LabelsetForm onCancel={onBack} onSaved={onSaved} />
      </div>
    </div>
  );
}

// ============================================================================
// Detail View - View labelset details
// ============================================================================

interface LabelsetDetailViewProps {
  labelset: Labelset;
  onBack: () => void;
  onEdit: () => void;
}

function LabelsetDetailView({
  labelset,
  onBack,
  onEdit,
}: LabelsetDetailViewProps) {
  const { data: stats } = useLabelsetStats(labelset.id);
  const { data: canonicalLabelsData } = useLabelsetCanonicalLabels(labelset.id);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Labelsets
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-db-gray-800 dark:text-white">
                {labelset.name}
              </h2>
              <StatusBadge status={labelset.status} />
            </div>
            {labelset.description && (
              <p className="text-db-gray-600 dark:text-gray-400">
                {labelset.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-db-gray-500 dark:text-gray-500">
              <span>Label Type: {labelset.label_type}</span>
              <span>Version: {labelset.version}</span>
              {labelset.use_case && <span>Use Case: {labelset.use_case}</span>}
            </div>
          </div>

          {labelset.status === 'draft' && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Label Classes"
              value={stats.total_label_classes}
              icon={Tag}
              color="text-purple-600"
            />
            <StatCard
              label="Canonical Labels"
              value={stats.canonical_label_count}
              icon={CheckCircle}
              color="text-cyan-600"
            />
            <StatCard
              label="Assemblies Using"
              value={stats.assemblies_using_count}
              icon={BarChart3}
              color="text-blue-600"
            />
            <StatCard
              label="Training Jobs"
              value={stats.training_jobs_count}
              icon={ExternalLink}
              color="text-green-600"
            />
          </div>
        )}

        {/* Label Classes */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
            Label Classes
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {labelset.label_classes.map((labelClass) => (
              <div
                key={labelClass.name}
                className="flex items-center gap-3 p-3 border border-db-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: labelClass.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-db-gray-800 dark:text-white">
                    {labelClass.display_name || labelClass.name}
                  </div>
                  {labelClass.description && (
                    <div className="text-sm text-db-gray-600 dark:text-gray-400">
                      {labelClass.description}
                    </div>
                  )}
                </div>
                {labelClass.hotkey && (
                  <kbd className="px-2 py-1 text-xs bg-db-gray-100 dark:bg-gray-800 border border-db-gray-200 dark:border-gray-700 rounded">
                    {labelClass.hotkey}
                  </kbd>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canonical Labels */}
        {canonicalLabelsData && canonicalLabelsData.total > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
              Canonical Labels ({canonicalLabelsData.total})
            </h3>
            <div className="text-sm text-db-gray-600 dark:text-gray-400">
              {canonicalLabelsData.total} expert-validated labels are using this
              labelset's definitions.
            </div>
          </div>
        )}

        {/* Tags */}
        {labelset.tags && labelset.tags.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6 mt-6">
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {labelset.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-700 dark:text-gray-300 rounded-lg"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Edit View - Form to edit existing labelset
// ============================================================================

interface LabelsetEditViewProps {
  labelset: Labelset;
  onBack: () => void;
  onSaved: (labelset: Labelset) => void;
}

function LabelsetEditView({
  labelset,
  onBack,
  onSaved,
}: LabelsetEditViewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Details
        </button>

        <h2 className="text-xl font-bold text-db-gray-800 dark:text-white mb-6">
          Edit Labelset
        </h2>

        <LabelsetForm
          labelset={labelset}
          onCancel={onBack}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: LabelsetStatus }) {
  const colors = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    published:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived:
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        colors[status]
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-db-gray-600 dark:text-gray-400">
          {label}
        </span>
        <Icon className={clsx('w-5 h-5', color)} />
      </div>
      <div className="text-2xl font-bold text-db-gray-800 dark:text-white">
        {value}
      </div>
    </div>
  );
}
