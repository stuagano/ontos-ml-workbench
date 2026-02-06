/**
 * Canonical Label Card Component
 *
 * Displays a single canonical label with metadata, confidence, and actions.
 */

import React from "react";
import type { CanonicalLabel } from "../types";

interface CanonicalLabelCardProps {
  label: CanonicalLabel;
  onEdit?: (label: CanonicalLabel) => void;
  onDelete?: (label: CanonicalLabel) => void;
  onViewVersions?: (label: CanonicalLabel) => void;
  compact?: boolean;
}

export function CanonicalLabelCard({
  label,
  onEdit,
  onDelete,
  onViewVersions,
  compact = false,
}: CanonicalLabelCardProps) {
  const confidenceColor = {
    high: "bg-green-100 text-green-800 border-green-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-red-100 text-red-800 border-red-300",
  }[label.confidence];

  const classificationColor = {
    public: "bg-blue-100 text-blue-800",
    internal: "bg-gray-100 text-gray-800",
    confidential: "bg-orange-100 text-orange-800",
    restricted: "bg-red-100 text-red-800",
  }[label.data_classification];

  if (compact) {
    return (
      <div className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 truncate">
                {label.item_ref}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor} border`}
              >
                {label.confidence}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {label.label_type}
            </div>
            {label.reuse_count > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Reused {label.reuse_count}x
              </div>
            )}
          </div>
          {onEdit && (
            <button
              onClick={() => onEdit(label)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {label.label_type}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${confidenceColor} border font-medium`}
            >
              {label.confidence}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${classificationColor}`}
            >
              {label.data_classification}
            </span>
          </div>
          <div className="text-sm text-gray-600 font-mono truncate">
            {label.item_ref}
          </div>
        </div>
      </div>

      {/* Label Data Preview */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-gray-700 mb-1">
          Label Data:
        </div>
        <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-800 max-h-32 overflow-auto">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(label.label_data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Notes */}
      {label.notes && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">Notes:</div>
          <div className="text-sm text-gray-600 italic">{label.notes}</div>
        </div>
      )}

      {/* Usage Constraints */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Allowed Uses:
          </div>
          <div className="flex flex-wrap gap-1">
            {label.allowed_uses.map((use) => (
              <span
                key={use}
                className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200"
              >
                {use}
              </span>
            ))}
          </div>
        </div>
        {label.prohibited_uses.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">
              Prohibited Uses:
            </div>
            <div className="flex flex-wrap gap-1">
              {label.prohibited_uses.map((use) => (
                <span
                  key={use}
                  className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200"
                >
                  {use}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border-t pt-3 mt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Labeled by:</span>
          <span className="font-medium">{label.labeled_by}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Created:</span>
          <span>{new Date(label.created_at).toLocaleDateString()}</span>
        </div>
        {label.last_modified_at && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Last modified:</span>
            <span>
              {new Date(label.last_modified_at).toLocaleDateString()} by{" "}
              {label.last_modified_by}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-600">
          <span>Version:</span>
          <span className="font-medium">v{label.version}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Reuse count:</span>
          <span className="font-semibold text-blue-600">
            {label.reuse_count}x
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t">
        {onEdit && (
          <button
            onClick={() => onEdit(label)}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
        )}
        {onViewVersions && (
          <button
            onClick={() => onViewVersions(label)}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            View History (v{label.version})
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(label)}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for canonical label card
 */
export function CanonicalLabelCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="border rounded-lg p-3 bg-white animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
      <div className="h-32 bg-gray-200 rounded mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}
