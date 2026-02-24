/**
 * CuratedDatasetForm - Create/Edit form for curated datasets
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  useCreateCuratedDataset,
  useUpdateCuratedDataset,
} from '../hooks/useCuratedDatasets';
import type { CuratedDataset, DatasetSplit } from '../types';
import { useToast } from './Toast';

interface CuratedDatasetFormProps {
  dataset?: CuratedDataset;
  onCancel: () => void;
  onSaved: (dataset: CuratedDataset) => void;
}

export function CuratedDatasetForm({
  dataset,
  onCancel,
  onSaved,
}: CuratedDatasetFormProps) {
  const isEditing = !!dataset;
  const createMutation = useCreateCuratedDataset();
  const updateMutation = useUpdateCuratedDataset();
  const { success: successToast, error: errorToast } = useToast();

  // Form state
  const [name, setName] = useState(dataset?.name || '');
  const [description, setDescription] = useState(dataset?.description || '');
  const [useCase, setUseCase] = useState(dataset?.use_case || '');
  const [labelsetId, setLabelsetId] = useState(dataset?.labelset_id || '');
  const [qualityThreshold, setQualityThreshold] = useState(
    dataset?.quality_threshold || 0.7
  );
  const [trainingSheetIds, setTrainingSheetIds] = useState<string[]>(
    dataset?.training_sheet_ids || []
  );
  const [newTrainingSheetId, setNewTrainingSheetId] = useState('');

  // Split config
  const [splitConfig, setSplitConfig] = useState<DatasetSplit>(
    dataset?.split_config || {
      train_pct: 0.8,
      val_pct: 0.1,
      test_pct: 0.1,
      stratify_by: undefined,
    }
  );

  // Tags
  const [tags, setTags] = useState<string[]>(dataset?.tags || []);
  const [newTag, setNewTag] = useState('');

  // Intended models
  const [intendedModels, setIntendedModels] = useState<string[]>(
    dataset?.intended_models || []
  );
  const [newModel, setNewModel] = useState('');

  // Prohibited uses
  const [prohibitedUses, setProhibitedUses] = useState<string[]>(
    dataset?.prohibited_uses || []
  );
  const [newProhibitedUse, setNewProhibitedUse] = useState('');

  const handleAddTrainingSheetId = () => {
    if (newTrainingSheetId.trim() && !trainingSheetIds.includes(newTrainingSheetId.trim())) {
      setTrainingSheetIds([...trainingSheetIds, newTrainingSheetId.trim()]);
      setNewTrainingSheetId('');
    }
  };

  const handleRemoveTrainingSheetId = (id: string) => {
    setTrainingSheetIds(trainingSheetIds.filter((aid) => aid !== id));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddModel = () => {
    if (newModel.trim() && !intendedModels.includes(newModel.trim())) {
      setIntendedModels([...intendedModels, newModel.trim()]);
      setNewModel('');
    }
  };

  const handleRemoveModel = (model: string) => {
    setIntendedModels(intendedModels.filter((m) => m !== model));
  };

  const handleAddProhibitedUse = () => {
    if (
      newProhibitedUse.trim() &&
      !prohibitedUses.includes(newProhibitedUse.trim())
    ) {
      setProhibitedUses([...prohibitedUses, newProhibitedUse.trim()]);
      setNewProhibitedUse('');
    }
  };

  const handleRemoveProhibitedUse = (use: string) => {
    setProhibitedUses(prohibitedUses.filter((u) => u !== use));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      errorToast('Name is required');
      return;
    }

    // Validate split percentages sum to 1
    const sum =
      splitConfig.train_pct + splitConfig.val_pct + splitConfig.test_pct;
    if (Math.abs(sum - 1.0) > 0.01) {
      errorToast('Split percentages must sum to 100%');
      return;
    }

    try {
      if (isEditing) {
        const updated = await updateMutation.mutateAsync({
          id: dataset.id,
          data: {
            name,
            description: description || undefined,
            training_sheet_ids: trainingSheetIds,
            split_config: splitConfig,
            quality_threshold: qualityThreshold,
            tags,
            use_case: useCase || undefined,
            intended_models: intendedModels,
            prohibited_uses: prohibitedUses,
          },
        });
        successToast('Dataset updated successfully');
        onSaved(updated);
      } else {
        const created = await createMutation.mutateAsync({
          name,
          description: description || undefined,
          labelset_id: labelsetId || undefined,
          training_sheet_ids: trainingSheetIds,
          split_config: splitConfig,
          quality_threshold: qualityThreshold,
          tags,
          use_case: useCase || undefined,
          intended_models: intendedModels,
          prohibited_uses: prohibitedUses,
        });
        successToast('Dataset created successfully');
        onSaved(created);
      }
    } catch (error: any) {
      errorToast(
        error.message || `Failed to ${isEditing ? 'update' : 'create'} dataset`
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Basic Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Defect Detection Training Set v1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe the purpose and contents of this dataset"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Use Case
              </label>
              <input
                type="text"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., Defect detection in manufacturing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Labelset ID
              </label>
              <input
                type="text"
                value={labelsetId}
                onChange={(e) => setLabelsetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Optional labelset reference"
                disabled={isEditing}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Training Sheet IDs */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Source Training Sheets
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTrainingSheetId}
              onChange={(e) => setNewTrainingSheetId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTrainingSheetId();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter training sheet ID"
            />
            <button
              type="button"
              onClick={handleAddTrainingSheetId}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {trainingSheetIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trainingSheetIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                >
                  {id}
                  <button
                    type="button"
                    onClick={() => handleRemoveTrainingSheetId(id)}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quality & Split Config */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quality & Split Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality Threshold (0-1)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={qualityThreshold}
              onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum confidence score for including examples
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Train %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={splitConfig.train_pct}
                onChange={(e) =>
                  setSplitConfig({
                    ...splitConfig,
                    train_pct: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validation %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={splitConfig.val_pct}
                onChange={(e) =>
                  setSplitConfig({
                    ...splitConfig,
                    val_pct: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={splitConfig.test_pct}
                onChange={(e) =>
                  setSplitConfig({
                    ...splitConfig,
                    test_pct: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stratify By (Optional)
            </label>
            <input
              type="text"
              value={splitConfig.stratify_by || ''}
              onChange={(e) =>
                setSplitConfig({
                  ...splitConfig,
                  stratify_by: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., label, sheet_id"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Field to use for stratified splitting
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tags
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add tag"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Intended Models & Prohibited Uses */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Intended Models
          </h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModel();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="e.g., llama-3-70b"
              />
              <button
                type="button"
                onClick={handleAddModel}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {intendedModels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {intendedModels.map((model) => (
                  <span
                    key={model}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm"
                  >
                    {model}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(model)}
                      className="hover:text-green-600 dark:hover:text-green-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Prohibited Uses
          </h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newProhibitedUse}
                onChange={(e) => setNewProhibitedUse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProhibitedUse();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="e.g., Medical diagnosis"
              />
              <button
                type="button"
                onClick={handleAddProhibitedUse}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {prohibitedUses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prohibitedUses.map((use) => (
                  <span
                    key={use}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm"
                  >
                    {use}
                    <button
                      type="button"
                      onClick={() => handleRemoveProhibitedUse(use)}
                      className="hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="px-4 py-2 bg-db-blue-600 text-white rounded-lg hover:bg-db-blue-700 disabled:opacity-50"
        >
          {isEditing ? 'Update Dataset' : 'Create Dataset'}
        </button>
      </div>
    </form>
  );
}
