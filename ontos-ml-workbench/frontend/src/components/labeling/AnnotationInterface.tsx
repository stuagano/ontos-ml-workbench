/**
 * AnnotationInterface - Labeler's view for annotating items
 *
 * Features:
 * - Item-by-item annotation with AI suggestions
 * - Keyboard shortcuts for fast labeling
 * - Progress tracking and navigation
 * - Flag/skip functionality
 * - Auto-save on navigation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flag,
  SkipForward,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Keyboard,
  X,
  MessageSquare,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listLabeledItems,
  labelItem,
  skipItem,
  flagItem,
  submitLabelingTask,
  getLabelingJob,
  getSheetPreview,
} from "../../services/api";
import { useToast } from "../Toast";
import type { LabelingTask, LabelField } from "../../types";

// ============================================================================
// Label Field Components
// ============================================================================

interface FieldProps {
  field: LabelField;
  value: unknown;
  aiValue?: unknown;
  onChange: (value: unknown) => void;
}

function TextField({ field, value, aiValue, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-db-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {aiValue !== undefined && aiValue !== value && (
        <div className="flex items-center gap-2 mb-1 text-xs text-purple-600">
          <Sparkles className="w-3 h-3" />
          AI suggestion: {String(aiValue)}
          <button
            onClick={() => onChange(aiValue)}
            className="underline hover:no-underline"
          >
            Use
          </button>
        </div>
      )}
      <input
        type="text"
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.description || `Enter ${field.name}`}
        className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
      />
    </div>
  );
}

function SelectField({ field, value, aiValue, onChange }: FieldProps) {
  const options = field.options || [];

  return (
    <div>
      <label className="block text-sm font-medium text-db-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {aiValue !== undefined && aiValue !== value && (
        <div className="flex items-center gap-2 mb-1 text-xs text-purple-600">
          <Sparkles className="w-3 h-3" />
          AI suggestion: {String(aiValue)}
        </div>
      )}
      <div className="space-y-1">
        {options.map((option, index) => (
          <label
            key={option}
            className={clsx(
              "flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors",
              value === option
                ? "border-db-orange bg-amber-50"
                : aiValue === option
                  ? "border-purple-300 bg-purple-50"
                  : "border-db-gray-200 hover:border-db-gray-300",
            )}
          >
            <input
              type="radio"
              name={field.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="text-db-orange focus:ring-db-orange"
            />
            <span className="text-sm">
              <span className="text-db-gray-400 mr-2">{index + 1}</span>
              {option}
            </span>
            {aiValue === option && (
              <Sparkles className="w-3 h-3 text-purple-500 ml-auto" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function MultiSelectField({ field, value, aiValue, onChange }: FieldProps) {
  const options = field.options || [];
  const selected = Array.isArray(value) ? value : [];
  const aiSelected = Array.isArray(aiValue) ? aiValue : [];

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-db-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className={clsx(
              "flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors",
              selected.includes(option)
                ? "border-db-orange bg-amber-50"
                : aiSelected.includes(option)
                  ? "border-purple-300 bg-purple-50"
                  : "border-db-gray-200 hover:border-db-gray-300",
            )}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggleOption(option)}
              className="rounded text-db-orange focus:ring-db-orange"
            />
            <span className="text-sm">{option}</span>
            {aiSelected.includes(option) && (
              <Sparkles className="w-3 h-3 text-purple-500 ml-auto" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function NumberField({ field, value, aiValue, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-db-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {aiValue !== undefined && aiValue !== value && (
        <div className="flex items-center gap-2 mb-1 text-xs text-purple-600">
          <Sparkles className="w-3 h-3" />
          AI suggestion: {String(aiValue)}
          <button
            onClick={() => onChange(aiValue)}
            className="underline hover:no-underline"
          >
            Use
          </button>
        </div>
      )}
      <input
        type="number"
        value={value !== undefined && value !== null ? Number(value) : ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
        min={field.min_value}
        max={field.max_value}
        placeholder={field.description || `Enter ${field.name}`}
        className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
      />
      {(field.min_value !== undefined || field.max_value !== undefined) && (
        <p className="text-xs text-db-gray-400 mt-1">
          Range: {field.min_value ?? "∞"} - {field.max_value ?? "∞"}
        </p>
      )}
    </div>
  );
}

function BooleanField({ field, value, aiValue, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-db-gray-700 mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-4">
        {[true, false].map((option) => (
          <label
            key={String(option)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors",
              value === option
                ? "border-db-orange bg-amber-50"
                : aiValue === option
                  ? "border-purple-300 bg-purple-50"
                  : "border-db-gray-200 hover:border-db-gray-300",
            )}
          >
            <input
              type="radio"
              name={field.id}
              checked={value === option}
              onChange={() => onChange(option)}
              className="text-db-orange focus:ring-db-orange"
            />
            <span className="text-sm">{option ? "Yes" : "No"}</span>
            {aiValue === option && (
              <Sparkles className="w-3 h-3 text-purple-500" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function LabelFieldInput({ field, value, aiValue, onChange }: FieldProps) {
  switch (field.field_type) {
    case "select":
      return (
        <SelectField
          field={field}
          value={value}
          aiValue={aiValue}
          onChange={onChange}
        />
      );
    case "multi_select":
      return (
        <MultiSelectField
          field={field}
          value={value}
          aiValue={aiValue}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberField
          field={field}
          value={value}
          aiValue={aiValue}
          onChange={onChange}
        />
      );
    case "boolean":
      return (
        <BooleanField
          field={field}
          value={value}
          aiValue={aiValue}
          onChange={onChange}
        />
      );
    default:
      return (
        <TextField
          field={field}
          value={value}
          aiValue={aiValue}
          onChange={onChange}
        />
      );
  }
}

// ============================================================================
// Skip Modal
// ============================================================================

interface SkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: (reason: string) => void;
}

function SkipModal({ isOpen, onClose, onSkip }: SkipModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">Skip Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-db-gray-700 mb-2">
            Reason for skipping
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
            placeholder="e.g., Image is corrupted, Data is unclear..."
          />
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSkip(reason);
              setReason("");
              onClose();
            }}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Flag Modal
// ============================================================================

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlag: (
    difficult: boolean,
    needsDiscussion: boolean,
    reason: string,
  ) => void;
}

function FlagModal({ isOpen, onClose, onFlag }: FlagModalProps) {
  const [isDifficult, setIsDifficult] = useState(false);
  const [needsDiscussion, setNeedsDiscussion] = useState(false);
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">Flag Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDifficult}
              onChange={(e) => setIsDifficult(e.target.checked)}
              className="rounded text-db-orange focus:ring-db-orange"
            />
            <span className="text-sm text-db-gray-700">Mark as difficult</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={needsDiscussion}
              onChange={(e) => setNeedsDiscussion(e.target.checked)}
              className="rounded text-db-orange focus:ring-db-orange"
            />
            <span className="text-sm text-db-gray-700">
              Needs team discussion
            </span>
          </label>
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
              placeholder="Add any notes..."
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onFlag(isDifficult, needsDiscussion, reason);
              setIsDifficult(false);
              setNeedsDiscussion(false);
              setReason("");
              onClose();
            }}
            disabled={!isDifficult && !needsDiscussion}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            Flag
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Keyboard Shortcuts Help
// ============================================================================

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "←", description: "Previous item" },
    { key: "→", description: "Next item / Save & Next" },
    { key: "1-9", description: "Select option (for select fields)" },
    { key: "S", description: "Skip item" },
    { key: "F", description: "Flag item" },
    { key: "Enter", description: "Save current item" },
    { key: "Esc", description: "Exit annotation" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-2">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="flex items-center justify-between">
                <kbd className="px-2 py-1 bg-db-gray-100 rounded text-sm font-mono">
                  {key}
                </kbd>
                <span className="text-sm text-db-gray-600">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main AnnotationInterface Component
// ============================================================================

interface AnnotationInterfaceProps {
  task: LabelingTask;
  onBack: () => void;
  onComplete?: () => void;
}

export function AnnotationInterface({
  task,
  onBack,
  onComplete,
}: AnnotationInterfaceProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [labels, setLabels] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Fetch job for label schema
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["labeling-job", task.job_id],
    queryFn: () => getLabelingJob(task.job_id),
  });

  // Fetch items for this task
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["labeled-items", task.id],
    queryFn: () => listLabeledItems(task.id, { limit: 500 }),
  });

  // Fetch sheet preview for context data
  const { data: sheetPreview } = useQuery({
    queryKey: ["sheet-preview", job?.sheet_id],
    queryFn: () => getSheetPreview(job!.sheet_id, 500),
    enabled: !!job?.sheet_id,
  });

  const items = itemsData?.items || [];
  const currentItem = items[currentIndex];

  // Get row data from sheet preview
  const rowData = useMemo(() => {
    if (!sheetPreview || !currentItem) return null;
    return sheetPreview.rows.find((r) => r.row_index === currentItem.row_index);
  }, [sheetPreview, currentItem]);

  // Initialize labels when item changes
  useEffect(() => {
    if (currentItem?.human_labels) {
      setLabels(currentItem.human_labels);
    } else if (currentItem?.ai_labels) {
      setLabels(currentItem.ai_labels);
    } else {
      setLabels({});
    }
    setHasChanges(false);
  }, [currentItem]);

  // Label mutation
  const labelMutation = useMutation({
    mutationFn: () => labelItem(currentItem!.id, { human_labels: labels }),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["labeled-items", task.id] });
    },
    onError: (error: Error) => {
      toast.error("Save Failed", error.message);
    },
  });

  // Skip mutation
  const skipMutation = useMutation({
    mutationFn: (reason: string) =>
      skipItem(currentItem!.id, { skip_reason: reason }),
    onSuccess: () => {
      toast.info("Item Skipped", "Moving to next item");
      queryClient.invalidateQueries({ queryKey: ["labeled-items", task.id] });
      goToNext();
    },
    onError: (error: Error) => {
      toast.error("Skip Failed", error.message);
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: ({
      difficult,
      discussion,
      reason,
    }: {
      difficult: boolean;
      discussion: boolean;
      reason: string;
    }) =>
      flagItem(currentItem!.id, {
        is_difficult: difficult,
        needs_discussion: discussion,
        flag_reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.info("Item Flagged", "Flag has been recorded");
      queryClient.invalidateQueries({ queryKey: ["labeled-items", task.id] });
    },
    onError: (error: Error) => {
      toast.error("Flag Failed", error.message);
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => submitLabelingTask(task.id),
    onSuccess: () => {
      toast.success(
        "Task Submitted",
        "Your work has been submitted for review",
      );
      if (onComplete) onComplete();
      onBack();
    },
    onError: (error: Error) => {
      toast.error("Submit Failed", error.message);
    },
  });

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, items.length]);

  const saveAndNext = useCallback(async () => {
    if (hasChanges && currentItem) {
      await labelMutation.mutateAsync();
    }
    goToNext();
  }, [hasChanges, currentItem, labelMutation, goToNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          saveAndNext();
          break;
        case "s":
        case "S":
          setShowSkipModal(true);
          break;
        case "f":
        case "F":
          setShowFlagModal(true);
          break;
        case "Enter":
          if (hasChanges) labelMutation.mutate();
          break;
        case "Escape":
          onBack();
          break;
        case "?":
          setShowShortcuts(true);
          break;
        default:
          // Number keys for select fields
          if (/^[1-9]$/.test(e.key) && job?.label_schema.fields) {
            const selectField = job.label_schema.fields.find(
              (f) => f.field_type === "select",
            );
            if (selectField?.options) {
              const index = parseInt(e.key) - 1;
              if (index < selectField.options.length) {
                setLabels((prev) => ({
                  ...prev,
                  [selectField.id]: selectField.options![index],
                }));
                setHasChanges(true);
              }
            }
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    goToPrevious,
    saveAndNext,
    hasChanges,
    labelMutation,
    onBack,
    job?.label_schema.fields,
  ]);

  // Loading state
  if (jobLoading || itemsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
      </div>
    );
  }

  if (!job || !currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-db-gray-600">No items to annotate</p>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / items.length) * 100;
  const labeledCount = items.filter(
    (i) => i.status === "human_labeled" || i.human_labels,
  ).length;

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-db-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-db-gray-600" />
            </button>
            <div>
              <h1 className="font-semibold text-db-gray-800">{task.name}</h1>
              <p className="text-sm text-db-gray-500">
                Item {currentIndex + 1} of {items.length} • {labeledCount}{" "}
                labeled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 hover:bg-db-gray-100 rounded-lg text-db-gray-500"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {labeledCount === items.length && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Submit for Review
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-db-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-db-orange transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Context data */}
        <div className="w-1/2 border-r border-db-gray-200 bg-white overflow-auto p-6">
          <h2 className="text-lg font-semibold text-db-gray-800 mb-4">
            Item Data
          </h2>

          {rowData ? (
            <div className="space-y-4">
              {Object.entries(rowData.cells).map(([columnId, cell]) => {
                const column = sheetPreview?.columns.find(
                  (c) => c.id === columnId,
                );
                const isTargetColumn = job.target_columns.includes(columnId);

                if (isTargetColumn) return null; // Don't show target columns in context

                return (
                  <div key={columnId} className="p-3 bg-db-gray-50 rounded-lg">
                    <div className="text-xs text-db-gray-500 mb-1">
                      {column?.name || columnId}
                    </div>
                    <div className="text-sm text-db-gray-800">
                      {cell.value !== null && cell.value !== undefined
                        ? typeof cell.value === "object"
                          ? JSON.stringify(cell.value)
                          : String(cell.value)
                        : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-db-gray-500">Loading item data...</p>
          )}

          {/* Show AI labels if available */}
          {currentItem.ai_labels && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Suggestions
              </h3>
              <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                {Object.entries(currentItem.ai_labels).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-purple-700">{key}</span>
                    <span className="text-sm font-medium text-purple-900">
                      {String(value)}
                    </span>
                  </div>
                ))}
                {currentItem.ai_confidence !== undefined && (
                  <div className="text-xs text-purple-500 mt-2">
                    Confidence: {(currentItem.ai_confidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Label form */}
        <div className="w-1/2 overflow-auto p-6">
          <h2 className="text-lg font-semibold text-db-gray-800 mb-4">
            Labels
          </h2>

          <div className="space-y-6">
            {job.label_schema.fields.map((field) => (
              <LabelFieldInput
                key={field.id}
                field={field}
                value={labels[field.id]}
                aiValue={currentItem.ai_labels?.[field.id]}
                onChange={(value) => {
                  setLabels((prev) => ({ ...prev, [field.id]: value }));
                  setHasChanges(true);
                }}
              />
            ))}
          </div>

          {/* Item status indicators */}
          <div className="mt-6 flex items-center gap-4">
            {currentItem.is_difficult && (
              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                <Flag className="w-3 h-3" />
                Flagged as difficult
              </span>
            )}
            {currentItem.needs_discussion && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <MessageSquare className="w-3 h-3" />
                Needs discussion
              </span>
            )}
            {currentItem.skip_reason && (
              <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <SkipForward className="w-3 h-3" />
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Navigation */}
      <div className="bg-white border-t border-db-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSkipModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:bg-db-gray-100 rounded-lg"
            >
              <SkipForward className="w-4 h-4" />
              Skip (S)
            </button>
            <button
              onClick={() => setShowFlagModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:bg-db-gray-100 rounded-lg"
            >
              <Flag className="w-4 h-4" />
              Flag (F)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {hasChanges && (
              <button
                onClick={() => labelMutation.mutate()}
                disabled={labelMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-db-gray-200 text-db-gray-700 rounded-lg hover:bg-db-gray-300"
              >
                {labelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            )}

            <button
              onClick={saveAndNext}
              disabled={
                currentIndex === items.length - 1 || labelMutation.isPending
              }
              className="flex items-center gap-2 px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              {labelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {hasChanges ? "Save & " : ""}Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SkipModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onSkip={(reason) => skipMutation.mutate(reason)}
      />

      <FlagModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        onFlag={(difficult, discussion, reason) =>
          flagMutation.mutate({ difficult, discussion, reason })
        }
      />

      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
