/**
 * ReviewInterface - Reviewer's view for approving/rejecting labeled items
 *
 * Features:
 * - Grid/table view of labeled items
 * - Compare AI vs human labels
 * - Approve/reject individual items or bulk
 * - Filter by disagreements, flagged items
 * - Task-level approve/reject/rework
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  Sparkles,
  Eye,
  Loader2,
  AlertCircle,
  Check,
  X,
  Filter,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listLabeledItems,
  getLabelingJob,
  getSheetPreview,
  reviewLabelingTask,
} from "../../services/api";
import { useToast } from "../Toast";
import type {
  LabelingTask,
  LabelingJob,
  LabeledItem,
  TaskReviewAction,
} from "../../types";

// ============================================================================
// Item Row Component
// ============================================================================

interface ItemRowProps {
  item: LabeledItem;
  job: LabelingJob;
  rowData: Record<string, unknown> | null;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

function ItemRow({
  item,
  job,
  rowData,
  isSelected,
  onSelect,
  onViewDetails,
}: ItemRowProps) {
  // Check if AI and human labels agree
  const hasDisagreement = useMemo(() => {
    if (!item.ai_labels || !item.human_labels) return false;
    return Object.keys(item.ai_labels).some(
      (key) => item.ai_labels![key] !== item.human_labels![key],
    );
  }, [item.ai_labels, item.human_labels]);

  return (
    <tr
      className={clsx(
        "border-b border-db-gray-100 hover:bg-db-gray-50 cursor-pointer transition-colors",
        isSelected && "bg-amber-50",
      )}
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-db-orange focus:ring-db-orange"
        />
      </td>
      <td className="px-4 py-3 text-sm text-db-gray-600">
        #{item.row_index + 1}
      </td>

      {/* Show key context columns */}
      <td className="px-4 py-3 text-sm text-db-gray-800 max-w-[200px] truncate">
        {rowData
          ? Object.values(rowData)[0]?.toString().slice(0, 50) || "-"
          : "-"}
      </td>

      {/* Label columns */}
      {job.label_schema.fields.slice(0, 2).map((field) => {
        const aiValue = item.ai_labels?.[field.id];
        const humanValue = item.human_labels?.[field.id];
        const disagrees = aiValue !== undefined && aiValue !== humanValue;

        return (
          <td key={field.id} className="px-4 py-3">
            <div className="space-y-1">
              {/* Human label */}
              <div
                className={clsx(
                  "text-sm font-medium",
                  disagrees ? "text-amber-600" : "text-db-gray-800",
                )}
              >
                {humanValue !== undefined ? String(humanValue) : "-"}
              </div>
              {/* AI label (if different) */}
              {disagrees && (
                <div className="flex items-center gap-1 text-xs text-purple-500">
                  <Sparkles className="w-3 h-3" />
                  {String(aiValue)}
                </div>
              )}
            </div>
          </td>
        );
      })}

      {/* Status indicators */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {hasDisagreement && (
            <span
              className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center"
              title="AI-Human disagreement"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
            </span>
          )}
          {item.is_difficult && (
            <span
              className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center"
              title="Flagged as difficult"
            >
              <Flag className="w-3 h-3 text-purple-600" />
            </span>
          )}
          {item.needs_discussion && (
            <span
              className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"
              title="Needs discussion"
            >
              <MessageSquare className="w-3 h-3 text-blue-600" />
            </span>
          )}
          {item.ai_confidence !== undefined && (
            <span
              className={clsx(
                "text-xs px-1.5 py-0.5 rounded",
                item.ai_confidence >= 0.85
                  ? "bg-green-100 text-green-700"
                  : item.ai_confidence >= 0.6
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700",
              )}
              title={`AI confidence: ${(item.ai_confidence * 100).toFixed(0)}%`}
            >
              {(item.ai_confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="p-1.5 hover:bg-db-gray-100 rounded text-db-gray-500"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Item Detail Modal
// ============================================================================

interface ItemDetailModalProps {
  item: LabeledItem | null;
  job: LabelingJob;
  rowData: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

function ItemDetailModal({
  item,
  job,
  rowData,
  isOpen,
  onClose,
}: ItemDetailModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            Item #{item.row_index + 1} Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Context data */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-db-gray-700 mb-3">
              Item Data
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {rowData &&
                Object.entries(rowData).map(([key, value]) => (
                  <div key={key} className="p-2 bg-db-gray-50 rounded">
                    <div className="text-xs text-db-gray-500">{key}</div>
                    <div className="text-sm text-db-gray-800 truncate">
                      {value !== null && value !== undefined
                        ? String(value)
                        : "-"}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Label comparison */}
          <div>
            <h3 className="text-sm font-medium text-db-gray-700 mb-3">
              Labels
            </h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-db-gray-500 uppercase">
                  <th className="pb-2">Field</th>
                  <th className="pb-2">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Label
                    </span>
                  </th>
                  <th className="pb-2">Human Label</th>
                  <th className="pb-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {job.label_schema.fields.map((field) => {
                  const aiValue = item.ai_labels?.[field.id];
                  const humanValue = item.human_labels?.[field.id];
                  const matches = aiValue === humanValue;

                  return (
                    <tr key={field.id} className="border-t border-db-gray-100">
                      <td className="py-2 text-sm font-medium text-db-gray-700">
                        {field.name}
                      </td>
                      <td className="py-2 text-sm text-purple-600">
                        {aiValue !== undefined ? String(aiValue) : "-"}
                      </td>
                      <td className="py-2 text-sm text-db-gray-800">
                        {humanValue !== undefined ? String(humanValue) : "-"}
                      </td>
                      <td className="py-2">
                        {aiValue !== undefined && humanValue !== undefined ? (
                          matches ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )
                        ) : (
                          <span className="text-db-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Flags */}
          {(item.is_difficult || item.needs_discussion || item.skip_reason) && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Flags</h3>
              <div className="space-y-1 text-sm text-amber-700">
                {item.is_difficult && <p>Marked as difficult</p>}
                {item.needs_discussion && <p>Needs team discussion</p>}
                {item.skip_reason && <p>Skipped: {item.skip_reason}</p>}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="mt-6 text-xs text-db-gray-500">
            <p>Labeled by: {item.labeled_by || "Unknown"}</p>
            {item.labeled_at && (
              <p>Labeled at: {new Date(item.labeled_at).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-db-gray-200 text-db-gray-700 rounded-lg hover:bg-db-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Review Action Modal
// ============================================================================

interface ReviewActionModalProps {
  action: "approve" | "reject" | "rework" | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string, reason?: string) => void;
  isPending: boolean;
}

function ReviewActionModal({
  action,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: ReviewActionModalProps) {
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  if (!isOpen || !action) return null;

  const config = {
    approve: {
      title: "Approve Task",
      description: "The labeler's work will be marked as approved.",
      buttonText: "Approve",
      buttonClass: "bg-green-600 hover:bg-green-700",
      showReason: false,
    },
    reject: {
      title: "Reject Task",
      description:
        "The task will be marked as rejected. The labeler will be notified.",
      buttonText: "Reject",
      buttonClass: "bg-red-600 hover:bg-red-700",
      showReason: true,
    },
    rework: {
      title: "Request Rework",
      description: "The task will be sent back to the labeler for corrections.",
      buttonText: "Request Rework",
      buttonClass: "bg-amber-600 hover:bg-amber-700",
      showReason: true,
    },
  }[action];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            {config.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-db-gray-600">{config.description}</p>

          {config.showReason && (
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
                placeholder="Why are you rejecting or requesting rework?"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
              placeholder="Additional notes for the labeler..."
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
              onSubmit(notes, reason);
              setNotes("");
              setReason("");
            }}
            disabled={isPending || (config.showReason && !reason.trim())}
            className={clsx(
              "px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2",
              config.buttonClass,
            )}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main ReviewInterface Component
// ============================================================================

interface ReviewInterfaceProps {
  task: LabelingTask;
  onBack: () => void;
  onComplete?: () => void;
}

export function ReviewInterface({
  task,
  onBack,
  onComplete,
}: ReviewInterfaceProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<LabeledItem | null>(null);
  const [reviewAction, setReviewAction] = useState<
    "approve" | "reject" | "rework" | null
  >(null);
  const [filter, setFilter] = useState<
    "all" | "disagreements" | "flagged" | "low_confidence"
  >("all");

  // Fetch job
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["labeling-job", task.job_id],
    queryFn: () => getLabelingJob(task.job_id),
  });

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["labeled-items", task.id],
    queryFn: () => listLabeledItems(task.id, { limit: 500 }),
  });

  // Fetch sheet preview
  const { data: sheetPreview } = useQuery({
    queryKey: ["sheet-preview", job?.sheet_id],
    queryFn: () => getSheetPreview(job!.sheet_id, 500),
    enabled: !!job?.sheet_id,
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: (action: TaskReviewAction) =>
      reviewLabelingTask(task.id, action),
    onSuccess: (updatedTask) => {
      const actionName =
        reviewAction === "approve"
          ? "approved"
          : reviewAction === "reject"
            ? "rejected"
            : "sent back for rework";
      toast.success("Review Complete", `Task has been ${actionName}`);
      queryClient.invalidateQueries({ queryKey: ["labeling-tasks"] });
      if (onComplete) onComplete();
      onBack();
    },
    onError: (error: Error) => {
      toast.error("Review Failed", error.message);
    },
  });

  const items = itemsData?.items || [];

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "disagreements") {
        if (!item.ai_labels || !item.human_labels) return false;
        return Object.keys(item.ai_labels).some(
          (key) => item.ai_labels![key] !== item.human_labels![key],
        );
      }
      if (filter === "flagged") {
        return item.is_difficult || item.needs_discussion;
      }
      if (filter === "low_confidence") {
        return item.ai_confidence !== undefined && item.ai_confidence < 0.7;
      }
      return true;
    });
  }, [items, filter]);

  // Get row data for an item
  const getRowData = useCallback(
    (item: LabeledItem): Record<string, unknown> | null => {
      if (!sheetPreview) return null;
      const row = sheetPreview.rows.find((r) => r.row_index === item.row_index);
      if (!row) return null;

      const data: Record<string, unknown> = {};
      for (const [colId, cell] of Object.entries(row.cells)) {
        const column = sheetPreview.columns.find((c) => c.id === colId);
        if (column && !job?.target_columns.includes(colId)) {
          data[column.name] = cell.value;
        }
      }
      return data;
    },
    [sheetPreview, job?.target_columns],
  );

  // Stats
  const stats = useMemo(() => {
    let disagreements = 0;
    let flagged = 0;
    let lowConfidence = 0;

    for (const item of items) {
      if (item.ai_labels && item.human_labels) {
        const hasDisagreement = Object.keys(item.ai_labels).some(
          (key) => item.ai_labels![key] !== item.human_labels![key],
        );
        if (hasDisagreement) disagreements++;
      }
      if (item.is_difficult || item.needs_discussion) flagged++;
      if (item.ai_confidence !== undefined && item.ai_confidence < 0.7) {
        lowConfidence++;
      }
    }

    return {
      total: items.length,
      disagreements,
      flagged,
      lowConfidence,
      agreementRate:
        items.length > 0
          ? ((items.length - disagreements) / items.length) * 100
          : 100,
    };
  }, [items]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.id)));
    }
  }, [filteredItems, selectedItems.size]);

  // Handle review submit
  const handleReviewSubmit = useCallback(
    (notes: string, reason?: string) => {
      if (!reviewAction) return;

      const actionMap: Record<typeof reviewAction, TaskReviewAction["action"]> =
        {
          approve: "approve",
          reject: "reject",
          rework: "request_rework",
        };

      reviewMutation.mutate({
        action: actionMap[reviewAction],
        notes: notes || undefined,
        rejection_reason: reason || undefined,
      });
    },
    [reviewAction, reviewMutation],
  );

  // Loading
  if (jobLoading || itemsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
      </div>
    );
  }

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
              <h1 className="font-semibold text-db-gray-800">
                Review: {task.name}
              </h1>
              <p className="text-sm text-db-gray-500">
                by {task.assigned_to || "Unknown"} • {items.length} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReviewAction("rework")}
              className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50"
            >
              <RotateCcw className="w-4 h-4" />
              Request Rework
            </button>
            <button
              onClick={() => setReviewAction("reject")}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => setReviewAction("approve")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-db-gray-500">Agreement Rate:</span>
            <span
              className={clsx(
                "text-sm font-semibold",
                stats.agreementRate >= 90
                  ? "text-green-600"
                  : stats.agreementRate >= 70
                    ? "text-amber-600"
                    : "text-red-600",
              )}
            >
              {stats.agreementRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-4 w-px bg-db-gray-200" />
          <div className="text-sm">
            <span className="text-amber-600 font-medium">
              {stats.disagreements}
            </span>{" "}
            <span className="text-db-gray-500">disagreements</span>
          </div>
          <div className="text-sm">
            <span className="text-purple-600 font-medium">{stats.flagged}</span>{" "}
            <span className="text-db-gray-500">flagged</span>
          </div>
          <div className="text-sm">
            <span className="text-red-600 font-medium">
              {stats.lowConfidence}
            </span>{" "}
            <span className="text-db-gray-500">low confidence</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-db-gray-400" />
          <span className="text-sm text-db-gray-500">Filter:</span>
          {(
            [
              { value: "all", label: "All Items" },
              { value: "disagreements", label: "Disagreements" },
              { value: "flagged", label: "Flagged" },
              { value: "low_confidence", label: "Low Confidence" },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "px-3 py-1 rounded-full text-sm transition-colors",
                filter === f.value
                  ? "bg-db-orange text-white"
                  : "bg-db-gray-100 text-db-gray-600 hover:bg-db-gray-200",
              )}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 opacity-70">
                  (
                  {f.value === "disagreements"
                    ? stats.disagreements
                    : f.value === "flagged"
                      ? stats.flagged
                      : stats.lowConfidence}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg border border-db-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-db-gray-50 border-b border-db-gray-200">
              <tr className="text-left text-xs text-db-gray-500 uppercase">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.size === filteredItems.length &&
                      filteredItems.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded text-db-orange focus:ring-db-orange"
                  />
                </th>
                <th className="px-4 py-3 w-20">#</th>
                <th className="px-4 py-3">Context</th>
                {job.label_schema.fields.slice(0, 2).map((field) => (
                  <th key={field.id} className="px-4 py-3">
                    {field.name}
                  </th>
                ))}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + Math.min(job.label_schema.fields.length, 2)}
                    className="px-4 py-12 text-center text-db-gray-500"
                  >
                    No items match the current filter
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    job={job}
                    rowData={getRowData(item)}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => {
                      const newSelected = new Set(selectedItems);
                      if (newSelected.has(item.id)) {
                        newSelected.delete(item.id);
                      } else {
                        newSelected.add(item.id);
                      }
                      setSelectedItems(newSelected);
                    }}
                    onViewDetails={() => setDetailItem(item)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={detailItem}
        job={job}
        rowData={detailItem ? getRowData(detailItem) : null}
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
      />

      {/* Review Action Modal */}
      <ReviewActionModal
        action={reviewAction}
        isOpen={!!reviewAction}
        onClose={() => setReviewAction(null)}
        onSubmit={handleReviewSubmit}
        isPending={reviewMutation.isPending}
      />
    </div>
  );
}
