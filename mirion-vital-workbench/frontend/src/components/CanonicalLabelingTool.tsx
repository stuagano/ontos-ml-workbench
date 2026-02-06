/**
 * Canonical Labeling Tool - Label source data directly (Mode B)
 *
 * Enables "label once, reuse everywhere" workflow by creating canonical
 * labels at the source data level, independent of Training Sheets.
 *
 * Features:
 * - Sheet selector with preview
 * - Item browser with search/filter
 * - Label type selector (entity_extraction, classification, etc.)
 * - Flexible JSON editor for label_data (VARIANT field)
 * - Usage constraint controls (governance)
 * - Multiple labelsets per item support
 * - Version history tracking
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Tag,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  Shield,
  History,
  Loader2,
  ChevronRight,
  Search,
} from "lucide-react";
import { useToast } from "./Toast";
import {
  listSheets,
  getSheet,
  listCanonicalLabels,
  createCanonicalLabel,
  updateCanonicalLabel,
  getItemLabelsets,
  lookupCanonicalLabel,
} from "../services/api";
import type {
  Sheet,
  CanonicalLabel,
  CanonicalLabelCreateRequest,
  LabelConfidence,
  DataClassification,
  UsageType,
} from "../types";

interface CanonicalLabelingToolProps {
  onClose: () => void;
}

// Label types available
const LABEL_TYPES = [
  {
    id: "entity_extraction",
    name: "Entity Extraction",
    description: "Extract named entities (names, dates, amounts, etc.)",
    example: { patient_name: "John Doe", total_amount: 285.5 },
  },
  {
    id: "classification",
    name: "Classification",
    description: "Assign category or class label",
    example: { category: "emergency", subcategory: "critical" },
  },
  {
    id: "defect_localization",
    name: "Defect Localization",
    description: "Bounding boxes for object detection",
    example: {
      bounding_boxes: [
        { x: 100, y: 200, width: 50, height: 75, class: "cold_solder" },
      ],
    },
  },
  {
    id: "qa",
    name: "Question-Answer",
    description: "Question and answer pairs",
    example: { question: "What is the diagnosis?", answer: "Pneumonia" },
  },
  {
    id: "summarization",
    name: "Summarization",
    description: "Text summary or abstract",
    example: { summary: "Patient admitted with chest pain..." },
  },
  {
    id: "sentiment",
    name: "Sentiment Analysis",
    description: "Sentiment label (positive, negative, neutral)",
    example: { sentiment: "positive", confidence: 0.95 },
  },
];

const CONFIDENCE_LEVELS: {
  value: LabelConfidence;
  label: string;
  color: string;
}[] = [
  { value: "high", label: "High", color: "text-green-700 bg-green-50" },
  { value: "medium", label: "Medium", color: "text-yellow-700 bg-yellow-50" },
  { value: "low", label: "Low", color: "text-red-700 bg-red-50" },
];

const DATA_CLASSIFICATIONS: {
  value: DataClassification;
  label: string;
  color: string;
}[] = [
  { value: "public", label: "Public", color: "text-gray-700 bg-gray-50" },
  { value: "internal", label: "Internal", color: "text-blue-700 bg-blue-50" },
  {
    value: "confidential",
    label: "Confidential",
    color: "text-orange-700 bg-orange-50",
  },
  { value: "restricted", label: "Restricted", color: "text-red-700 bg-red-50" },
];

const USAGE_TYPES: { value: UsageType; label: string; description: string }[] =
  [
    {
      value: "training",
      label: "Training",
      description: "Fine-tuning (permanent in weights)",
    },
    {
      value: "validation",
      label: "Validation",
      description: "Training eval (permanent)",
    },
    {
      value: "evaluation",
      label: "Evaluation",
      description: "Benchmarking (temporary)",
    },
    {
      value: "few_shot",
      label: "Few-Shot",
      description: "Runtime examples (ephemeral)",
    },
    {
      value: "testing",
      label: "Testing",
      description: "Manual QA (temporary)",
    },
  ];

export function CanonicalLabelingTool({ onClose }: CanonicalLabelingToolProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard steps
  const [step, setStep] = useState<"select_sheet" | "select_item" | "label">(
    "select_sheet",
  );

  // Selected data
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [selectedItemRef, setSelectedItemRef] = useState<string>("");
  const [selectedLabelType, setSelectedLabelType] = useState<string>(
    LABEL_TYPES[0].id,
  );

  // Label form state
  const [labelData, setLabelData] = useState<string>("{}");
  const [confidence, setConfidence] = useState<LabelConfidence>("high");
  const [notes, setNotes] = useState<string>("");
  const [dataClassification, setDataClassification] =
    useState<DataClassification>("internal");
  const [allowedUses, setAllowedUses] = useState<UsageType[]>([
    "training",
    "validation",
    "evaluation",
    "few_shot",
    "testing",
  ]);
  const [prohibitedUses, setProhibitedUses] = useState<UsageType[]>([]);
  const [usageReason, setUsageReason] = useState<string>("");

  // Fetch sheets
  const { data: sheets, isLoading: loadingSheets } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheets(),
  });

  // Fetch existing label (if any)
  const { data: existingLabel, isLoading: loadingExistingLabel } = useQuery({
    queryKey: [
      "canonical-label-lookup",
      selectedSheet?.id,
      selectedItemRef,
      selectedLabelType,
    ],
    queryFn: () =>
      lookupCanonicalLabel({
        sheet_id: selectedSheet!.id,
        item_ref: selectedItemRef,
        label_type: selectedLabelType,
      }),
    enabled: !!selectedSheet && !!selectedItemRef && step === "label",
  });

  // Fetch all labelsets for selected item
  const { data: itemLabelsets } = useQuery({
    queryKey: ["item-labelsets", selectedSheet?.id, selectedItemRef],
    queryFn: () => getItemLabelsets(selectedSheet!.id, selectedItemRef),
    enabled: !!selectedSheet && !!selectedItemRef && step === "label",
  });

  // Create/update label mutation
  const saveLabelMutation = useMutation({
    mutationFn: async () => {
      // Validate JSON
      let parsedLabelData;
      try {
        parsedLabelData = JSON.parse(labelData);
      } catch (e) {
        throw new Error("Invalid JSON in label data");
      }

      const labelRequest: CanonicalLabelCreateRequest = {
        sheet_id: selectedSheet!.id,
        item_ref: selectedItemRef,
        label_type: selectedLabelType,
        label_data: parsedLabelData,
        confidence,
        notes: notes || undefined,
        allowed_uses: allowedUses,
        prohibited_uses: prohibitedUses,
        usage_reason: usageReason || undefined,
        data_classification: dataClassification,
        labeled_by: "current_user", // TODO: Get from auth
      };

      if (existingLabel) {
        // Update existing
        return updateCanonicalLabel(existingLabel.id, {
          label_data: parsedLabelData,
          confidence,
          notes: notes || undefined,
          allowed_uses: allowedUses,
          prohibited_uses: prohibitedUses,
          usage_reason: usageReason || undefined,
          data_classification: dataClassification,
          last_modified_by: "current_user", // TODO: Get from auth
        });
      } else {
        // Create new
        return createCanonicalLabel(labelRequest);
      }
    },
    onSuccess: () => {
      toast({
        title: existingLabel ? "Label Updated" : "Label Created",
        description: "Canonical label saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["canonical-label-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["item-labelsets"] });
      // Reset form
      setSelectedItemRef("");
      setStep("select_item");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Label",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Load existing label into form
  const loadExistingLabel = (label: CanonicalLabel) => {
    setLabelData(JSON.stringify(label.label_data, null, 2));
    setConfidence(label.confidence);
    setNotes(label.notes || "");
    setDataClassification(label.data_classification);
    setAllowedUses(label.allowed_uses);
    setProhibitedUses(label.prohibited_uses);
    setUsageReason(label.usage_reason || "");
  };

  // Toggle usage type
  const toggleUsageType = (
    type: UsageType,
    list: UsageType[],
    setList: (list: UsageType[]) => void,
  ) => {
    if (list.includes(type)) {
      setList(list.filter((t) => t !== type));
    } else {
      setList([...list, type]);
    }
  };

  // ============================================================================
  // Step 1: Select Sheet
  // ============================================================================

  if (step === "select_sheet") {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Tag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-db-gray-900">
                  Canonical Labeling Tool
                </h2>
                <p className="text-sm text-db-gray-600 mt-1">
                  Label source data once, reuse everywhere
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-db-gray-200 bg-db-gray-50">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-green-600 text-white rounded-full font-medium">
              1. Select Sheet
            </span>
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
            <span className="px-3 py-1 bg-db-gray-200 text-db-gray-600 rounded-full">
              2. Select Item
            </span>
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
            <span className="px-3 py-1 bg-db-gray-200 text-db-gray-600 rounded-full">
              3. Create Label
            </span>
          </div>
        </div>

        {/* Sheet List */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What are Canonical Labels?</p>
                  <p>
                    Canonical labels are expert-validated ground truth labels
                    stored at the source data level. Label once, and the label
                    will be automatically reused across all Training Sheets that
                    reference this data.
                  </p>
                </div>
              </div>
            </div>

            {loadingSheets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : sheets && sheets.length > 0 ? (
              <div className="grid gap-4">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => {
                      setSelectedSheet(sheet);
                      setStep("select_item");
                    }}
                    className="p-4 border border-db-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <Database className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-db-gray-900">
                          {sheet.name}
                        </h3>
                        <p className="text-sm text-db-gray-600 mt-1">
                          {sheet.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-db-gray-500">
                          <span>
                            {sheet.source_type === "uc_table"
                              ? "Table"
                              : "Volume"}
                          </span>
                          {sheet.item_count && (
                            <span>{sheet.item_count} items</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-db-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
                <p className="text-db-gray-600">No sheets available</p>
                <p className="text-sm text-db-gray-500 mt-1">
                  Create sheets in the DATA stage first
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Step 2: Select Item
  // ============================================================================

  if (step === "select_item") {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setStep("select_sheet")}
                className="text-sm text-db-gray-500 hover:text-db-gray-700 mb-2"
              >
                ← Back to Sheets
              </button>
              <h2 className="text-xl font-semibold text-db-gray-900">
                {selectedSheet?.name}
              </h2>
              <p className="text-sm text-db-gray-600 mt-1">
                {selectedSheet?.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-db-gray-200 bg-db-gray-50">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
              ✓ Select Sheet
            </span>
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
            <span className="px-3 py-1 bg-green-600 text-white rounded-full font-medium">
              2. Select Item
            </span>
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
            <span className="px-3 py-1 bg-db-gray-200 text-db-gray-600 rounded-full">
              3. Create Label
            </span>
          </div>
        </div>

        {/* Item Selector */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Enter Item Reference</p>
                  <p>
                    Enter the unique identifier for the item you want to label
                    (e.g., invoice_id, inspection_id, image_filename). This
                    should match the{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      item_id_column
                    </code>{" "}
                    defined in the sheet.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-2">
                Item Reference
                <span className="text-db-gray-500 ml-1">
                  ({selectedSheet?.item_id_column || "item_id"})
                </span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-db-gray-400" />
                <input
                  type="text"
                  value={selectedItemRef}
                  onChange={(e) => setSelectedItemRef(e.target.value)}
                  placeholder="e.g., invoice_042, inspection_12345, image_001.jpg"
                  className="w-full pl-10 pr-4 py-3 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selectedItemRef.trim()) {
                      setStep("label");
                    }
                  }}
                />
              </div>
              <p className="text-sm text-db-gray-500 mt-2">
                Press Enter or click Continue when ready
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setStep("select_sheet")}
                className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("label")}
                disabled={!selectedItemRef.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Step 3: Create/Edit Label
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-db-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setStep("select_item")}
              className="text-sm text-db-gray-500 hover:text-db-gray-700 mb-2"
            >
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-db-gray-900">
              {existingLabel ? "Edit" : "Create"} Canonical Label
            </h2>
            <p className="text-sm text-db-gray-600 mt-1">
              {selectedSheet?.name} → {selectedItemRef}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-db-gray-200 bg-db-gray-50">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
            ✓ Select Sheet
          </span>
          <ChevronRight className="w-4 h-4 text-db-gray-400" />
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
            ✓ Select Item
          </span>
          <ChevronRight className="w-4 h-4 text-db-gray-400" />
          <span className="px-3 py-1 bg-green-600 text-white rounded-full font-medium">
            3. Create Label
          </span>
        </div>
      </div>

      {/* Label Form */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Existing Labelsets Info */}
          {itemLabelsets &&
            itemLabelsets.labelsets &&
            itemLabelsets.labelsets.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 mb-2">
                      Existing Labels for this Item
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {itemLabelsets.labelsets.map((labelset) => (
                        <button
                          key={labelset.label_type}
                          onClick={() => {
                            setSelectedLabelType(labelset.label_type);
                            if (labelset.label_id) {
                              // Load existing label
                              // Note: Would need to fetch full label details here
                            }
                          }}
                          className="px-3 py-1 bg-white border border-green-300 rounded-full text-sm text-green-700 hover:bg-green-100 transition-colors"
                        >
                          {labelset.label_type} (v{labelset.version})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Label Type Selector */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-3">
              Label Type
              <span className="text-db-gray-500 ml-1 font-normal">
                (determines how data is interpreted)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LABEL_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedLabelType(type.id);
                    // Set example as initial data if creating new
                    if (!existingLabel) {
                      setLabelData(JSON.stringify(type.example, null, 2));
                    }
                  }}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedLabelType === type.id
                      ? "border-green-500 bg-green-50"
                      : "border-db-gray-200 hover:border-green-300"
                  }`}
                >
                  <div className="font-medium text-db-gray-900 mb-1">
                    {type.name}
                  </div>
                  <div className="text-xs text-db-gray-600">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Label Data Editor (JSON) */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-2">
              Label Data (JSON)
              <span className="text-db-gray-500 ml-1 font-normal">
                (flexible format - any valid JSON)
              </span>
            </label>
            <textarea
              value={labelData}
              onChange={(e) => setLabelData(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-db-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder='{"field": "value", ...}'
            />
            <p className="text-xs text-db-gray-500 mt-2">
              VARIANT field supports any JSON structure (objects, arrays,
              primitives)
            </p>
          </div>

          {/* Confidence & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-2">
                Confidence
              </label>
              <div className="flex gap-2">
                {CONFIDENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setConfidence(level.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      confidence === level.value
                        ? level.color + " border-2 border-current"
                        : "bg-db-gray-100 text-db-gray-600 hover:bg-db-gray-200"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-2">
                Data Classification
              </label>
              <select
                value={dataClassification}
                onChange={(e) =>
                  setDataClassification(e.target.value as DataClassification)
                }
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {DATA_CLASSIFICATIONS.map((cls) => (
                  <option key={cls.value} value={cls.value}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Add any notes about this label..."
            />
          </div>

          {/* Usage Constraints (Governance) */}
          <div className="border border-db-gray-200 rounded-lg p-4 bg-db-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-db-gray-900">
                Usage Constraints (Governance)
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-2">
                  Allowed Uses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {USAGE_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start gap-2 p-3 border border-db-gray-200 rounded-lg hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={allowedUses.includes(type.value)}
                        onChange={() =>
                          toggleUsageType(
                            type.value,
                            allowedUses,
                            setAllowedUses,
                          )
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-db-gray-900">
                          {type.label}
                        </div>
                        <div className="text-xs text-db-gray-600">
                          {type.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-2">
                  Prohibited Uses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {USAGE_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start gap-2 p-3 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={prohibitedUses.includes(type.value)}
                        onChange={() =>
                          toggleUsageType(
                            type.value,
                            prohibitedUses,
                            setProhibitedUses,
                          )
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-db-gray-900">
                          {type.label}
                        </div>
                        <div className="text-xs text-db-gray-600">
                          {type.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-2">
                  Usage Reason (Optional)
                </label>
                <input
                  type="text"
                  value={usageReason}
                  onChange={(e) => setUsageReason(e.target.value)}
                  placeholder='e.g., "Contains PHI - HIPAA compliance"'
                  className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setStep("select_item")}
              className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg transition-colors"
              disabled={saveLabelMutation.isPending}
            >
              Back
            </button>
            <button
              onClick={() => saveLabelMutation.mutate()}
              disabled={saveLabelMutation.isPending || !labelData.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLabelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {existingLabel ? "Update Label" : "Create Label"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
