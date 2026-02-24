/**
 * Canonical Label Browser Component
 *
 * Browse, filter, and search canonical labels with pagination.
 */

import { useState } from "react";
import {
  useCanonicalLabels,
  useDeleteCanonicalLabel,
  useCanonicalLabelUsage,
  useUpdateCanonicalLabel,
} from "../hooks/useCanonicalLabels";
import { CanonicalLabelCard, CanonicalLabelCardSkeleton } from "./CanonicalLabelCard";
import { useToast } from "./Toast";
import type { CanonicalLabel, LabelConfidence } from "../types";

interface CanonicalLabelBrowserProps {
  sheetId?: string;
  onSelectLabel?: (label: CanonicalLabel) => void;
  onEditLabel?: (label: CanonicalLabel) => void;
  onDeleteLabel?: (label: CanonicalLabel) => void;
  compact?: boolean;
}

export function CanonicalLabelBrowser({
  sheetId,
  onSelectLabel,
  onEditLabel,
  onDeleteLabel,
  compact = false,
}: CanonicalLabelBrowserProps) {
  const [labelType, setLabelType] = useState<string>("");
  const [confidence, setConfidence] = useState<LabelConfidence | "">("");
  const [minReuseCount, setMinReuseCount] = useState<number | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const pageSize = compact ? 20 : 12;

  // Delete state & mutations
  const [deletingLabel, setDeletingLabel] = useState<CanonicalLabel | null>(null);
  const deleteMutation = useDeleteCanonicalLabel();
  const { data: usageData, isLoading: usageLoading } = useCanonicalLabelUsage(
    deletingLabel?.id
  );

  // Edit state & mutation
  const [editingLabel, setEditingLabel] = useState<CanonicalLabel | null>(null);
  const [editConfidence, setEditConfidence] = useState<LabelConfidence>("high");
  const [editNotes, setEditNotes] = useState("");
  const [editLabelData, setEditLabelData] = useState("");
  const updateMutation = useUpdateCanonicalLabel(editingLabel?.id ?? "");
  const toast = useToast();

  const handleStartEdit = (label: CanonicalLabel) => {
    setEditingLabel(label);
    setEditConfidence(label.confidence);
    setEditNotes(label.notes || "");
    setEditLabelData(JSON.stringify(label.label_data, null, 2));
  };

  const handleSaveEdit = () => {
    if (!editingLabel) return;
    let parsedLabelData: unknown;
    try {
      parsedLabelData = JSON.parse(editLabelData);
    } catch {
      toast.error("Invalid JSON", "Label data must be valid JSON");
      return;
    }
    updateMutation.mutate(
      { confidence: editConfidence, notes: editNotes, label_data: parsedLabelData },
      {
        onSuccess: () => {
          toast.success("Label updated");
          setEditingLabel(null);
        },
        onError: (err) =>
          toast.error("Update failed", err instanceof Error ? err.message : "Unknown error"),
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingLabel) return;
    deleteMutation.mutate(deletingLabel.id, {
      onSuccess: () => {
        toast.success("Label deleted");
        setDeletingLabel(null);
      },
      onError: (err) =>
        toast.error("Delete failed", err instanceof Error ? err.message : "Unknown error"),
    });
  };

  const { data, isLoading, error } = useCanonicalLabels({
    sheet_id: sheetId,
    label_type: labelType || undefined,
    confidence: confidence || undefined,
    min_reuse_count: minReuseCount,
    page,
    page_size: pageSize,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Label Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Label Type
            </label>
            <select
              value={labelType}
              onChange={(e) => {
                setLabelType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="classification">Classification</option>
              <option value="localization">Localization</option>
              <option value="segmentation">Segmentation</option>
              <option value="root_cause">Root Cause</option>
              <option value="pass_fail">Pass/Fail</option>
              <option value="entity_extraction">Entity Extraction</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confidence
            </label>
            <select
              value={confidence}
              onChange={(e) => {
                setConfidence(e.target.value as LabelConfidence | "");
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Confidence Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Reuse Count Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Min Reuse Count
            </label>
            <input
              type="number"
              value={minReuseCount || ""}
              onChange={(e) => {
                setMinReuseCount(
                  e.target.value ? parseInt(e.target.value) : undefined
                );
                setPage(1);
              }}
              placeholder="Any"
              min="0"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(labelType || confidence || minReuseCount) && (
          <button
            onClick={() => {
              setLabelType("");
              setConfidence("");
              setMinReuseCount(undefined);
              setPage(1);
            }}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Summary */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {data.labels.length} of {data.total} canonical labels
          </p>
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error loading canonical labels:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          className={
            compact
              ? "space-y-2"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          }
        >
          {Array.from({ length: pageSize }).map((_, i) => (
            <CanonicalLabelCardSkeleton key={i} compact={compact} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.labels.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Canonical Labels Found
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {labelType || confidence || minReuseCount
              ? "Try adjusting your filters"
              : "Create your first canonical label to get started"}
          </p>
        </div>
      )}

      {/* Label Grid */}
      {!isLoading && data && data.labels.length > 0 && (
        <div
          className={
            compact
              ? "space-y-2"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          }
        >
          {data.labels.map((label) => (
            <div
              key={label.id}
              onClick={() => onSelectLabel?.(label)}
              className={onSelectLabel ? "cursor-pointer" : ""}
            >
              <CanonicalLabelCard
                label={label}
                onEdit={onEditLabel ?? handleStartEdit}
                onDelete={onDeleteLabel ?? ((l) => setDeletingLabel(l))}
                compact={compact}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 text-sm border rounded-lg ${
                    page === pageNum
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Canonical Label?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">{deletingLabel.label_type}</span>{" "}
              &mdash;{" "}
              <span className="font-mono text-xs">{deletingLabel.item_ref}</span>
            </p>

            {usageLoading ? (
              <div className="text-sm text-gray-500 mb-4">Checking usage...</div>
            ) : usageData && usageData.usage_count > 0 ? (
              <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">
                  This label is used in {usageData.usage_count} training sheet
                  {usageData.usage_count !== 1 ? "s" : ""}
                </p>
                <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                  {usageData.used_in.slice(0, 5).map((u) => (
                    <li key={`${u.training_sheet_id}-${u.row_index}`}>
                      {u.training_sheet_name} (row {u.row_index})
                    </li>
                  ))}
                  {usageData.used_in.length > 5 && (
                    <li>...and {usageData.used_in.length - 5} more</li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                This label is not used in any training sheets.
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingLabel(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Label Modal */}
      {editingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Canonical Label
            </h3>

            <div className="space-y-4">
              {/* Read-only context */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">{editingLabel.label_type}</span>{" "}
                &mdash;{" "}
                <span className="font-mono text-xs">{editingLabel.item_ref}</span>
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence
                </label>
                <select
                  value={editConfidence}
                  onChange={(e) => setEditConfidence(e.target.value as LabelConfidence)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Optional notes about this label..."
                />
              </div>

              {/* Label Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Data (JSON)
                </label>
                <textarea
                  value={editLabelData}
                  onChange={(e) => setEditLabelData(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditingLabel(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
