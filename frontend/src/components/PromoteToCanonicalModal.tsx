/**
 * Promote to Canonical Label Modal
 *
 * Lightweight modal for promoting a Q&A pair to a canonical label.
 * Focuses on governance metadata: usage constraints, PII classification, confidence.
 */

import { useState } from "react";
import {
  X,
  Shield,
  Check,
  AlertTriangle,
  Loader2,
  Tag,
  FileText,
} from "lucide-react";
import { createCanonicalLabel } from "../services/api";
import { useToast } from "./Toast";
import type {
  AssembledRow,
  LabelConfidence,
  DataClassification,
  UsageType,
  CanonicalLabelCreateRequest,
} from "../types";

interface PromoteToCanonicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** The Q&A pair being promoted */
  row: AssembledRow;
  /** Sheet ID for the canonical label */
  sheetId: string;
  /** Label type from the template (e.g., "classification", "defect_detection") */
  labelType: string;
  /** Current user's name/email */
  labeledBy: string;
}

const USAGE_OPTIONS: { value: UsageType; label: string; description: string }[] = [
  {
    value: "training",
    label: "Training",
    description: "Can be used to train models",
  },
  {
    value: "validation",
    label: "Validation",
    description: "Can be used to validate model performance",
  },
  {
    value: "few_shot",
    label: "Few-Shot Examples",
    description: "Can be used as few-shot examples in prompts",
  },
];

const CLASSIFICATION_OPTIONS: {
  value: DataClassification;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "No restrictions on use",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  {
    value: "internal",
    label: "Internal",
    description: "Internal use only",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    value: "confidential",
    label: "Confidential",
    description: "Contains sensitive information",
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  {
    value: "restricted",
    label: "Restricted (PII)",
    description: "Contains PII or highly sensitive data",
    color: "bg-red-100 text-red-800 border-red-300",
  },
];

export function PromoteToCanonicalModal({
  isOpen,
  onClose,
  onSuccess,
  row,
  sheetId,
  labelType,
  labeledBy,
}: PromoteToCanonicalModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [confidence, setConfidence] = useState<LabelConfidence>("high");
  const [allowedUses, setAllowedUses] = useState<UsageType[]>(["training"]);
  const [prohibitedUses, setProhibitedUses] = useState<UsageType[]>([]);
  const [dataClassification, setDataClassification] =
    useState<DataClassification>("internal");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleUsageToggle = (usage: UsageType, isAllowed: boolean) => {
    if (isAllowed) {
      // Toggle in allowed uses
      if (allowedUses.includes(usage)) {
        setAllowedUses(allowedUses.filter((u) => u !== usage));
      } else {
        setAllowedUses([...allowedUses, usage]);
        // Remove from prohibited if adding to allowed
        setProhibitedUses(prohibitedUses.filter((u) => u !== usage));
      }
    } else {
      // Toggle in prohibited uses
      if (prohibitedUses.includes(usage)) {
        setProhibitedUses(prohibitedUses.filter((u) => u !== usage));
      } else {
        setProhibitedUses([...prohibitedUses, usage]);
        // Remove from allowed if adding to prohibited
        setAllowedUses(allowedUses.filter((u) => u !== usage));
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const itemRef = row.item_ref || `row_${row.row_index}`;

      const request: CanonicalLabelCreateRequest = {
        sheet_id: sheetId,
        item_ref: itemRef,
        label_type: labelType,
        label_data: {
          prompt: row.prompt,
          response: row.response,
          source_data: row.source_data,
        },
        confidence,
        notes: notes || undefined,
        allowed_uses: allowedUses,
        prohibited_uses: prohibitedUses,
        data_classification: dataClassification,
        labeled_by: labeledBy,
      };

      await createCanonicalLabel(request);

      toast.success(
        "Canonical Label Created",
        "This Q&A pair is now available for reuse across all Training Sheets"
      );

      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(
        "Failed to create canonical label",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <Tag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Promote to Canonical Label
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set governance metadata for this Q&A pair
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Q&A Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="w-4 h-4" />
              Q&A Pair Preview
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Prompt
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 rounded p-2 max-h-24 overflow-y-auto">
                  {row.prompt}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Response
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 rounded p-2 max-h-24 overflow-y-auto font-mono">
                  {row.response || (
                    <span className="text-gray-400 italic">No response yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confidence Level
            </label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as LabelConfidence[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setConfidence(level)}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    confidence === level
                      ? level === "high"
                        ? "bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : level === "medium"
                          ? "bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-red-100 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-300"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Data Classification (PII indicator) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Shield className="w-4 h-4 inline mr-1" />
              Data Classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLASSIFICATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDataClassification(option.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    dataClassification === option.value
                      ? option.color + " border-current"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs opacity-75">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Usage Constraints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Usage Constraints
            </label>
            <div className="space-y-2">
              {USAGE_OPTIONS.map((option) => {
                const isAllowed = allowedUses.includes(option.value);
                const isProhibited = prohibitedUses.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUsageToggle(option.value, true)}
                        className={`p-2 rounded-lg transition-colors ${
                          isAllowed
                            ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-700 hover:bg-green-50 hover:text-green-500"
                        }`}
                        title="Allow"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUsageToggle(option.value, false)}
                        className={`p-2 rounded-lg transition-colors ${
                          isProhibited
                            ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-700 hover:bg-red-50 hover:text-red-500"
                        }`}
                        title="Prohibit"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this canonical label..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Label type: <span className="font-medium">{labelType}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !row.response}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  Create Canonical Label
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
