/**
 * Canonical Labeling Tool Component
 *
 * Interface for creating and editing canonical labels with expert validation.
 * Supports multiple label types per item (classification, localization, etc.)
 */

import React, { useState } from "react";
import type {
  CanonicalLabelCreateRequest,
  LabelConfidence,
  DataClassification,
  UsageType,
} from "../types";
import { useCreateCanonicalLabel } from "../hooks/useCanonicalLabels";

interface CanonicalLabelingToolProps {
  sheetId: string;
  itemRef: string;
  labeledBy: string;
  onSuccess?: (labelId: string) => void;
  onCancel?: () => void;
  defaultLabelType?: string;
  defaultLabelData?: any;
}

const LABEL_TYPES = [
  { value: "classification", label: "Classification" },
  { value: "localization", label: "Localization (Bounding Boxes)" },
  { value: "segmentation", label: "Segmentation (Masks)" },
  { value: "root_cause", label: "Root Cause Analysis" },
  { value: "pass_fail", label: "Pass/Fail Decision" },
  { value: "entity_extraction", label: "Entity Extraction" },
  { value: "custom", label: "Custom Type..." },
];

const CONFIDENCE_LEVELS: { value: LabelConfidence; label: string; description: string }[] = [
  { value: "high", label: "High", description: "Expert validated, production ready" },
  { value: "medium", label: "Medium", description: "Reviewed, may need refinement" },
  { value: "low", label: "Low", description: "Initial label, needs validation" },
];

const DATA_CLASSIFICATIONS: { value: DataClassification; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
];

const USAGE_TYPES: { value: UsageType; label: string }[] = [
  { value: "training", label: "Training" },
  { value: "validation", label: "Validation" },
  { value: "evaluation", label: "Evaluation" },
  { value: "few_shot", label: "Few-Shot Examples" },
  { value: "testing", label: "Testing" },
];

export function CanonicalLabelingTool({
  sheetId,
  itemRef,
  labeledBy,
  onSuccess,
  onCancel,
  defaultLabelType,
  defaultLabelData,
}: CanonicalLabelingToolProps) {
  const [labelType, setLabelType] = useState(defaultLabelType || "classification");
  const [customLabelType, setCustomLabelType] = useState("");
  const [labelDataText, setLabelDataText] = useState(
    defaultLabelData ? JSON.stringify(defaultLabelData, null, 2) : '{\n  \n}'
  );
  const [confidence, setConfidence] = useState<LabelConfidence>("high");
  const [notes, setNotes] = useState("");
  const [allowedUses, setAllowedUses] = useState<UsageType[]>([
    "training",
    "validation",
    "evaluation",
    "few_shot",
    "testing",
  ]);
  const [prohibitedUses, setProhibitedUses] = useState<UsageType[]>([]);
  const [dataClassification, setDataClassification] =
    useState<DataClassification>("internal");
  const [usageReason, setUsageReason] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const createMutation = useCreateCanonicalLabel();

  const handleLabelDataChange = (text: string) => {
    setLabelDataText(text);
    // Validate JSON
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const handleAllowedUseToggle = (use: UsageType) => {
    setAllowedUses((prev) =>
      prev.includes(use) ? prev.filter((u) => u !== use) : [...prev, use]
    );
  };

  const handleProhibitedUseToggle = (use: UsageType) => {
    setProhibitedUses((prev) =>
      prev.includes(use) ? prev.filter((u) => u !== use) : [...prev, use]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (jsonError) {
      alert("Please fix the JSON error before submitting");
      return;
    }

    try {
      const labelData = JSON.parse(labelDataText);
      const finalLabelType =
        labelType === "custom" ? customLabelType : labelType;

      if (!finalLabelType) {
        alert("Please enter a custom label type");
        return;
      }

      const request: CanonicalLabelCreateRequest = {
        sheet_id: sheetId,
        item_ref: itemRef,
        label_type: finalLabelType,
        label_data: labelData,
        confidence,
        notes: notes || undefined,
        allowed_uses: allowedUses,
        prohibited_uses: prohibitedUses,
        data_classification: dataClassification,
        usage_reason: usageReason || undefined,
        labeled_by: labeledBy,
      };

      const result = await createMutation.mutateAsync(request);
      onSuccess?.(result.id);
    } catch (error) {
      alert(
        `Failed to create canonical label: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Canonical Label
        </h2>
        <p className="text-sm text-gray-600">
          Expert-validated ground truth label for <code className="bg-gray-100 px-2 py-1 rounded">{itemRef}</code>
        </p>
      </div>

      {/* Label Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Label Type *
        </label>
        <select
          value={labelType}
          onChange={(e) => setLabelType(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {LABEL_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {labelType === "custom" && (
          <input
            type="text"
            value={customLabelType}
            onChange={(e) => setCustomLabelType(e.target.value)}
            placeholder="Enter custom label type (e.g., temperature_reading)"
            className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        )}
      </div>

      {/* Label Data */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Label Data (JSON) *
        </label>
        <textarea
          value={labelDataText}
          onChange={(e) => handleLabelDataChange(e.target.value)}
          rows={10}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            jsonError ? "border-red-500" : ""
          }`}
          placeholder='{\n  "defect_type": "scratch",\n  "severity": "high"\n}'
          required
        />
        {jsonError && (
          <p className="mt-1 text-sm text-red-600">JSON Error: {jsonError}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Enter the label data as valid JSON. This can be any structure (objects, arrays, primitives).
        </p>
      </div>

      {/* Confidence Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Confidence Level *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setConfidence(level.value)}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                confidence === level.value
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="font-semibold text-gray-900">{level.label}</div>
              <div className="text-xs text-gray-600 mt-1">
                {level.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional context, reasoning, or instructions..."
        />
      </div>

      {/* Usage Constraints */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Usage Constraints
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Allowed Uses */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Allowed Uses
            </label>
            <div className="space-y-2">
              {USAGE_TYPES.map((use) => (
                <label key={use.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowedUses.includes(use.value)}
                    onChange={() => handleAllowedUseToggle(use.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{use.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prohibited Uses */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Prohibited Uses (Optional)
            </label>
            <div className="space-y-2">
              {USAGE_TYPES.map((use) => (
                <label key={use.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prohibitedUses.includes(use.value)}
                    onChange={() => handleProhibitedUseToggle(use.value)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">{use.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Reason */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Usage Reason (Optional)
          </label>
          <input
            type="text"
            value={usageReason}
            onChange={(e) => setUsageReason(e.target.value)}
            placeholder="Explain any usage restrictions..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Data Classification */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Data Classification *
        </label>
        <select
          value={dataClassification}
          onChange={(e) =>
            setDataClassification(e.target.value as DataClassification)
          }
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {DATA_CLASSIFICATIONS.map((classification) => (
            <option key={classification.value} value={classification.value}>
              {classification.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={createMutation.isPending || !!jsonError}
          className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? "Creating..." : "Create Canonical Label"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {createMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error: {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create label"}
          </p>
        </div>
      )}
    </form>
  );
}
