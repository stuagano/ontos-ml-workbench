/**
 * LabelsetForm - Create/Edit form for labelsets
 *
 * Features:
 * - Basic info (name, description, label_type)
 * - Label classes editor with color picker and hotkeys
 * - Tags and use case
 * - Usage constraints
 */

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import {
  useCreateLabelset,
  useUpdateLabelset,
} from '../hooks/useLabelsets';
import type { Labelset, LabelClass } from '../types';
import { useToast } from './Toast';

interface LabelsetFormProps {
  labelset?: Labelset;
  onCancel: () => void;
  onSaved: (labelset: Labelset) => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f59e0b', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6b7280', // gray
  '#10b981', // emerald
];

export function LabelsetForm({
  labelset,
  onCancel,
  onSaved,
}: LabelsetFormProps) {
  const isEditing = !!labelset;

  // Form state
  const [name, setName] = useState(labelset?.name || '');
  const [description, setDescription] = useState(labelset?.description || '');
  const [labelType, setLabelType] = useState(labelset?.label_type || '');
  const [useCase, setUseCase] = useState(labelset?.use_case || '');
  const [labelClasses, setLabelClasses] = useState<LabelClass[]>(
    labelset?.label_classes || []
  );
  const [tags, setTags] = useState<string[]>(labelset?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const createMutation = useCreateLabelset();
  const updateMutation = useUpdateLabelset();
  const { success: successToast, error: errorToast } = useToast();

  const handleAddLabelClass = () => {
    const newClass: LabelClass = {
      name: '',
      color: DEFAULT_COLORS[labelClasses.length % DEFAULT_COLORS.length],
    };
    setLabelClasses([...labelClasses, newClass]);
  };

  const handleUpdateLabelClass = (
    index: number,
    updates: Partial<LabelClass>
  ) => {
    const updated = [...labelClasses];
    updated[index] = { ...updated[index], ...updates };
    setLabelClasses(updated);
  };

  const handleRemoveLabelClass = (index: number) => {
    setLabelClasses(labelClasses.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      errorToast('Name is required');
      return;
    }
    if (!labelType.trim()) {
      errorToast('Label type is required');
      return;
    }
    if (labelClasses.length === 0) {
      errorToast('At least one label class is required');
      return;
    }
    if (labelClasses.some((lc) => !lc.name.trim())) {
      errorToast('All label classes must have a name');
      return;
    }

    try {
      if (isEditing) {
        const updated = await updateMutation.mutateAsync({
          id: labelset.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            label_classes: labelClasses,
            use_case: useCase.trim() || undefined,
            tags: tags.length > 0 ? tags : undefined,
          },
        });
        successToast('Labelset updated successfully');
        onSaved(updated);
      } else {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          label_type: labelType.trim(),
          label_classes: labelClasses,
          use_case: useCase.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        });
        successToast('Labelset created successfully');
        onSaved(created);
      }
    } catch (error: any) {
      errorToast(
        `Failed to ${isEditing ? 'update' : 'create'} labelset`,
        error.message
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
          Basic Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-db-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., PCB Defect Types"
              className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-db-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this labelset..."
              rows={3}
              className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-db-gray-700 dark:text-gray-300 mb-1">
                Label Type * {isEditing && '(cannot edit)'}
              </label>
              <input
                type="text"
                value={labelType}
                onChange={(e) => setLabelType(e.target.value)}
                placeholder="e.g., defect_detection"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                required
                disabled={isEditing}
              />
              <p className="text-xs text-db-gray-500 dark:text-gray-500 mt-1">
                Links to canonical labels with this label_type
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 dark:text-gray-300 mb-1">
                Use Case
              </label>
              <input
                type="text"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g., pcb_defect_detection"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Label Classes */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">
            Label Classes *
          </h3>
          <button
            type="button"
            onClick={handleAddLabelClass}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>

        <div className="space-y-3">
          {labelClasses.map((labelClass, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-db-gray-200 dark:border-gray-700 rounded-lg"
            >
              {/* Color picker */}
              <input
                type="color"
                value={labelClass.color}
                onChange={(e) =>
                  handleUpdateLabelClass(index, { color: e.target.value })
                }
                className="w-10 h-10 rounded cursor-pointer"
              />

              {/* Name */}
              <input
                type="text"
                value={labelClass.name}
                onChange={(e) =>
                  handleUpdateLabelClass(index, { name: e.target.value })
                }
                placeholder="Class name (e.g., solder_bridge)"
                className="flex-1 px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
                required
              />

              {/* Display name */}
              <input
                type="text"
                value={labelClass.display_name || ''}
                onChange={(e) =>
                  handleUpdateLabelClass(index, {
                    display_name: e.target.value,
                  })
                }
                placeholder="Display name (e.g., Solder Bridge)"
                className="flex-1 px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
              />

              {/* Hotkey */}
              <input
                type="text"
                value={labelClass.hotkey || ''}
                onChange={(e) =>
                  handleUpdateLabelClass(index, { hotkey: e.target.value })
                }
                placeholder="Key"
                maxLength={1}
                className="w-16 px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white text-center"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveLabelClass(index)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {labelClasses.length === 0 && (
            <div className="text-center py-8 text-db-gray-500 dark:text-gray-500">
              No label classes yet. Click "Add Class" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
          Tags
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-2 px-3 py-1.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-700 dark:text-gray-300 rounded-lg"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-db-gray-500 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-db-gray-200 dark:border-gray-700 text-db-gray-700 dark:text-gray-300 rounded-lg hover:bg-db-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className={clsx(
            'px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : isEditing
            ? 'Update Labelset'
            : 'Create Labelset'}
        </button>
      </div>
    </form>
  );
}
