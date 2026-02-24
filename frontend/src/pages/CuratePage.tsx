/**
 * CuratePage - CURATE stage for reviewing and labeling training data
 *
 * Following the GCP Vertex AI pattern:
 * - Works with TrainingSheet (prompt/response pairs)
 * - Allows human labeling and verification of responses
 * - Supports AI generation of responses
 *
 * Features:
 * - Item grid/list view with prompt preview
 * - Side panel for detailed review (prompt, response, source data)
 * - Keyboard shortcuts for efficient labeling
 * - Workflow integration showing selected sheet and training sheet
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Loader2,
  FileText,
  X,
  Keyboard,
  LayoutGrid,
  List,
  Database,
  ArrowRight,
  ArrowLeft,
  Layers,
  Download,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Table2,
  Eye,
} from "lucide-react";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { StageSubNav, StageMode } from "../components/StageSubNav";
import { clsx } from "clsx";
import { useWorkflow } from "../context/WorkflowContext";
import {
  listTrainingSheets,
  getTrainingSheet,
  previewTrainingSheet,
  updateQAPair,
  generateResponses,
  exportTrainingSheet,
  listSheets,
  generateTrainingSheet,
} from "../services/api";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import {
  ImageAnnotationPanel,
  AnnotationTask,
  LabelConfig,
  Annotation,
} from "../components/annotation";
import {
  useSheetCanonicalStats,
  useLookupCanonicalLabel,
  useItemLabelsets,
} from "../hooks/useCanonicalLabels";
import {
  useListNavigation,
  useKeyboardShortcuts,
} from "../hooks/useKeyboardShortcuts";
import { PromoteToCanonicalModal } from "../components/PromoteToCanonicalModal";
import { CanonicalLabelStats } from "../components/CanonicalLabelStats";
import { CanonicalLabelBrowser } from "../components/CanonicalLabelBrowser";
import { NoCurationItems, NoTemplates, EmptyState } from "../components/EmptyState";
import { QualityGatePanel } from "../components/QualityGatePanel";
import { LabelVersionHistory } from "../components/LabelVersionHistory";
import { ReviewPanel } from "../components/ReviewPanel";
import { getConfig } from "../services/api";
import type { TrainingSheet, QAPairRow, ResponseSource } from "../types";

// ============================================================================
// Status Colors and Labels
// ============================================================================

const sourceColors: Record<ResponseSource, string> = {
  empty: "bg-gray-100 text-gray-700",
  imported: "bg-blue-100 text-blue-700",
  ai_generated: "bg-purple-100 text-purple-700",
  human_labeled: "bg-green-100 text-green-700",
  human_verified: "bg-emerald-100 text-emerald-700",
  canonical: "bg-cyan-100 text-cyan-700",
};

const sourceLabels: Record<ResponseSource, string> = {
  empty: "Empty",
  imported: "Imported",
  ai_generated: "AI Generated",
  human_labeled: "Human Labeled",
  human_verified: "Verified",
  canonical: "Canonical",
};

// ============================================================================
// Image Detection Helpers
// ============================================================================

/**
 * Check if a URL looks like an image
 */
function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/images/") ||
    lowerUrl.includes("image_url")
  );
}

/**
 * Extract image URL from source data
 * Looks for common patterns: image_url, imageUrl, image, photo, picture, etc.
 */
function extractImageUrl(sourceData: Record<string, unknown>): string | null {
  const imageKeys = [
    "image_url",
    "imageUrl",
    "image",
    "photo",
    "picture",
    "thumbnail",
    "photo_url",
    "photoUrl",
    "img",
    "img_url",
    "file_path",
    "filePath",
    "url",
  ];

  for (const key of imageKeys) {
    const value = sourceData[key];
    if (typeof value === "string" && isImageUrl(value)) {
      return value;
    }
  }

  // Also check nested objects one level deep
  for (const value of Object.values(sourceData)) {
    if (typeof value === "object" && value !== null) {
      for (const key of imageKeys) {
        const nested = (value as Record<string, unknown>)[key];
        if (typeof nested === "string" && isImageUrl(nested)) {
          return nested;
        }
      }
    }
  }

  return null;
}

/**
 * Check if a training sheet contains image data
 */
function trainingSheetHasImages(rows: QAPairRow[]): boolean {
  if (!rows || rows.length === 0) return false;
  // Check first few rows for image URLs
  return rows
    .slice(0, 5)
    .some((row) => extractImageUrl(row.source_data) !== null);
}

// ============================================================================
// Stats Bar
// ============================================================================

function StatsBar({ trainingSheet }: { trainingSheet: TrainingSheet }) {
  const total = trainingSheet.total_rows || 1;
  const segments = [
    {
      key: "human_verified",
      count: trainingSheet.human_verified_count,
      color: "bg-emerald-500",
      label: "Verified",
    },
    {
      key: "human_labeled",
      count: trainingSheet.human_labeled_count,
      color: "bg-green-500",
      label: "Labeled",
    },
    {
      key: "ai_generated",
      count: trainingSheet.ai_generated_count,
      color: "bg-purple-500",
      label: "AI Generated",
    },
    {
      key: "empty",
      count: trainingSheet.empty_count || 0,
      color: "bg-gray-300",
      label: "Empty",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="h-3 bg-db-gray-100 rounded-full overflow-hidden flex">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={clsx("h-full transition-all duration-300", seg.color)}
            style={{ width: `${((seg.count || 0) / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-db-gray-600">
        {segments
          .filter((s) => (s.count || 0) > 0)
          .map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <div className={clsx("w-2 h-2 rounded-full", seg.color)} />
              <span>
                {seg.label}: {seg.count}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// Row Card Component
// ============================================================================

interface RowCardProps {
  row: QAPairRow;
  isSelected: boolean;
  onSelect: () => void;
}

function RowCard({ row, isSelected, onSelect }: RowCardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-lg border-2 p-4 cursor-pointer transition-all",
        isSelected
          ? "border-purple-500 shadow-md"
          : "border-db-gray-200 hover:border-db-gray-300",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-db-gray-500">
          Row {row.row_index + 1}
        </span>
        <span
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full",
            sourceColors[row.response_source],
          )}
        >
          {sourceLabels[row.response_source]}
        </span>
      </div>

      {/* Prompt preview */}
      <div className="bg-db-gray-50 rounded-lg p-3 mb-3 text-xs font-mono overflow-hidden max-h-20">
        <p className="line-clamp-3">{row.prompt}</p>
      </div>

      {/* Response preview */}
      {row.response ? (
        <div className="bg-purple-50 rounded-lg p-2 text-xs font-mono overflow-hidden max-h-16">
          <p className="line-clamp-2 text-purple-800">{row.response}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-400 italic">
          No response yet
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Detail Panel
// ============================================================================

interface DetailPanelProps {
  row: QAPairRow;
  trainingSheet: TrainingSheet;
  onClose: () => void;
  onSave: (response: string, markAsVerified: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isSaving: boolean;
  onCreateCanonicalLabel?: () => void;
}

function DetailPanel({
  row,
  trainingSheet,
  onClose,
  onSave,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  isSaving,
  onCreateCanonicalLabel,
}: DetailPanelProps) {
  const [editedResponse, setEditedResponse] = useState(row.response || "");
  const [markAsVerified, setMarkAsVerified] = useState(false);

  // Reset when row changes
  useEffect(() => {
    setEditedResponse(row.response || "");
    setMarkAsVerified(false);
  }, [row.row_index, row.response]);

  const hasChanges = editedResponse !== (row.response || "");

  // Extract item_ref from source data for canonical label lookup
  const itemRef = row.source_data?.item_ref
    ?? row.source_data?.id
    ?? row.source_data?.file_path
    ?? (Object.keys(row.source_data || {})[0]
      ? String((row.source_data as Record<string, unknown>)[Object.keys(row.source_data)[0]])
      : undefined);

  // Canonical label lookup for current source item
  const { data: matchedLabel, isLoading: lookupLoading } = useLookupCanonicalLabel(
    trainingSheet.sheet_id,
    itemRef ? String(itemRef) : undefined,
    trainingSheet.template_config?.label_type
  );

  // All labelsets for current source item
  const { data: labelsets } = useItemLabelsets(
    trainingSheet.sheet_id,
    itemRef ? String(itemRef) : undefined
  );

  return (
    <div className="w-[520px] bg-white border-l border-db-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-db-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Row {row.row_index + 1}</span>
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full",
              sourceColors[row.response_source],
            )}
          >
            {sourceLabels[row.response_source]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-db-gray-400 hover:text-db-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Source Data */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Source Data
          </h3>
          <div className="bg-db-gray-50 rounded-lg p-3 font-mono text-xs overflow-auto max-h-32">
            <pre>{JSON.stringify(row.source_data, null, 2)}</pre>
          </div>
        </div>

        {/* Canonical Label Lookup Banner */}
        {lookupLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking for canonical label...
          </div>
        )}
        {matchedLabel && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-emerald-800">
                Canonical label exists
              </span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {matchedLabel.confidence}
              </span>
            </div>
          </div>
        )}

        {/* Labelsets for Current Item */}
        {labelsets && labelsets.labelsets.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-db-gray-700 hover:text-db-gray-900 flex items-center gap-2">
              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              Labelsets for this item ({labelsets.labelsets.length})
            </summary>
            <div className="mt-2 space-y-1">
              {labelsets.labelsets.map((ls) => (
                <div
                  key={ls.id}
                  className="flex items-center justify-between text-xs px-3 py-1.5 bg-gray-50 rounded"
                >
                  <span className="font-medium text-gray-700">{ls.label_type}</span>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{ls.confidence}</span>
                    <span>{ls.labeled_by}</span>
                    {ls.created_at && (
                      <span>{new Date(ls.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Prompt */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Prompt
          </h3>
          <div className="bg-purple-50 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
            {row.prompt}
          </div>
        </div>

        {/* Response Editor */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-green-600" />
            Response
            {row.response_source === "ai_generated" && (
              <span className="text-xs text-purple-600 font-normal">
                (AI generated)
              </span>
            )}
          </h3>
          <textarea
            value={editedResponse}
            onChange={(e) => setEditedResponse(e.target.value)}
            placeholder="Enter the expected response..."
            rows={8}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none"
          />
        </div>

        {/* Verify checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={markAsVerified}
            onChange={(e) => setMarkAsVerified(e.target.checked)}
            className="rounded border-db-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-db-gray-700">
            Mark as verified (ready for fine-tuning)
          </span>
        </label>

        {/* Metadata */}
        {(row.labeled_by || row.verified_by) && (
          <div className="text-xs text-db-gray-400 space-y-1 pt-2 border-t border-db-gray-100">
            {row.labeled_by && <div>Labeled by: {row.labeled_by}</div>}
            {row.labeled_at && (
              <div>Labeled at: {new Date(row.labeled_at).toLocaleString()}</div>
            )}
            {row.verified_by && <div>Verified by: {row.verified_by}</div>}
            {row.verified_at && (
              <div>
                Verified at: {new Date(row.verified_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Canonical Label Version History */}
        {row.canonical_label_id && (
          <LabelVersionHistory labelId={row.canonical_label_id} />
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-db-gray-200 p-4 space-y-3">
        {/* Save button */}
        <button
          onClick={() => onSave(editedResponse, markAsVerified)}
          disabled={isSaving || (!hasChanges && !markAsVerified)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {markAsVerified ? "Save & Verify" : "Save Response"}
          <kbd className="ml-2 px-1.5 py-0.5 bg-green-700 rounded text-xs">
            ⌘S
          </kbd>
        </button>

        {/* Create/Update Canonical Label button */}
        {onCreateCanonicalLabel && row.response && (
          <button
            onClick={onCreateCanonicalLabel}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            {matchedLabel ? "Update Canonical Label" : "Create Canonical Label"}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
            <kbd className="ml-1 px-1 bg-db-gray-100 rounded text-xs">←</kbd>
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <kbd className="ml-1 px-1 bg-db-gray-100 rounded text-xs">→</kbd>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Training Data Browser Modal - Removed (using inline browse/create pattern)
// ============================================================================

// ============================================================================
// Workflow Context Banner
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage, goToNextStage } = useWorkflow();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-db-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data Source */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600">Sheet</p>
              <p className="text-sm font-medium text-blue-800">
                {state.selectedSource?.name || "Not selected"}
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-db-gray-300" />

          {/* Training Data */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-purple-600">Training Data</p>
              <p className="text-sm font-medium text-purple-800">
                {state.selectedTemplate?.name || "Not selected"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={goToNextStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Continue to Label
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface CuratePageProps {
  mode?: "browse" | "create";
}

export function CuratePage({ mode = "browse" }: CuratePageProps) {
  const [stageMode, setStageMode] = useState<StageMode>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<ResponseSource | "">("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTrainingSheetPicker, setShowTrainingSheetPicker] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<"text" | "image">(
    "text",
  );
  const [selectedTrainingSheetId, setSelectedTrainingSheetId] = useState<string | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCanonicalLabelModal, setShowCanonicalLabelModal] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { state: workflowState } = useWorkflow();

  // Auto-load training sheet from workflow context if available (e.g., after generating training data)
  useEffect(() => {
    if (workflowState.selectedTrainingSheetId && !selectedTrainingSheetId) {
      setSelectedTrainingSheetId(workflowState.selectedTrainingSheetId);
      setStageMode("browse"); // Switch to browse mode automatically
    }
  }, [workflowState.selectedTrainingSheetId, selectedTrainingSheetId]);

  // Get training sheet ID from local state only (template ID is NOT a training sheet ID)
  const trainingSheetId = selectedTrainingSheetId;

  // Fetch list of all training sheets for the picker
  const { data: trainingSheets, isLoading: trainingSheetsLoading } = useQuery({
    queryKey: ["training-sheets"],
    queryFn: () => listTrainingSheets(),
  });

  // Fetch config to get current user
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: Infinity,
  });

  // Fetch sheets for create mode (only sheets with templates)
  const { data: sheetsData, isLoading: sheetsLoading } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheets({ limit: 50 }),
    enabled: stageMode === "create" && !selectedTrainingSheetId,
  });

  // Fetch training sheet metadata
  const { data: trainingSheet, isLoading: trainingSheetLoading } = useQuery({
    queryKey: ["training-sheet", trainingSheetId],
    queryFn: () => getTrainingSheet(trainingSheetId!),
    enabled: !!trainingSheetId,
  });

  // Fetch Q&A pair rows
  const { data: previewData, isLoading: rowsLoading } = useQuery({
    queryKey: ["trainingSheetPreview", trainingSheetId, sourceFilter],
    queryFn: () =>
      previewTrainingSheet(trainingSheetId!, {
        limit: 100,
        response_source: sourceFilter || undefined,
      }),
    enabled: !!trainingSheetId,
  });

  // Fetch canonical label stats for the sheet
  const { data: canonicalStats } = useSheetCanonicalStats(trainingSheet?.sheet_id);

  const rows = previewData?.rows || [];
  const selectedRow =
    rows.find((r) => r.row_index === selectedRowIndex) || null;
  const selectedIndex = rows.findIndex((r) => r.row_index === selectedRowIndex);

  // Detect if this training sheet contains images (for manual labeling with image annotation)
  const isManualLabelingMode =
    trainingSheet?.template_config?.response_source_mode === "manual_labeling";
  const hasImages = useMemo(() => trainingSheetHasImages(rows), [rows]);
  const showImageAnnotation =
    isManualLabelingMode && hasImages && annotationMode === "image";

  // Auto-detect annotation mode when training sheet loads
  useEffect(() => {
    if (isManualLabelingMode && hasImages) {
      setAnnotationMode("image");
    }
  }, [isManualLabelingMode, hasImages]);

  // Convert rows to annotation tasks for ImageAnnotationPanel
  const annotationTasks: AnnotationTask[] = useMemo(() => {
    if (!showImageAnnotation) return [];
    return rows.map((row) => ({
      id: `${trainingSheetId}-${row.row_index}`,
      imageUrl: extractImageUrl(row.source_data) || "",
      rowIndex: row.row_index,
      prompt: row.prompt,
      sourceData: row.source_data,
      status:
        row.response_source === "human_labeled" ||
        row.response_source === "human_verified"
          ? "annotated"
          : row.response_source === "empty"
            ? "pending"
            : "annotated",
    }));
  }, [showImageAnnotation, rows, trainingSheetId]);

  // Label classes from template_config, with fallback to defaults
  const annotationLabels: LabelConfig[] = useMemo(() => {
    // Pull from template_config if available
    const templateLabels = trainingSheet?.template_config?.label_classes;
    if (templateLabels && templateLabels.length > 0) {
      return templateLabels.map((l) => ({
        name: l.name,
        color: l.color || "#6b7280",
      }));
    }
    // Default fallback labels
    return [
      { name: "Defect", color: "#ef4444" },
      { name: "Normal", color: "#22c55e" },
      { name: "Warning", color: "#f59e0b" },
      { name: "Unknown", color: "#6b7280" },
    ];
  }, [trainingSheet?.template_config?.label_classes]);

  // Update row mutation
  const updateMutation = useMutation({
    mutationFn: ({
      rowIndex,
      response,
      markAsVerified,
    }: {
      rowIndex: number;
      response: string;
      markAsVerified: boolean;
    }) =>
      updateQAPair(trainingSheetId!, rowIndex, {
        response,
        mark_as_verified: markAsVerified,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainingSheetPreview"] });
      queryClient.invalidateQueries({ queryKey: ["training-sheet"] });
      toast.success("Response saved");
    },
    onError: (error) =>
      toast.error(
        "Failed to save",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Generate AI responses mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      generateResponses(trainingSheetId!, { include_few_shot: true }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trainingSheetPreview"] });
      queryClient.invalidateQueries({ queryKey: ["training-sheet"] });
      toast.success(
        "AI generation complete",
        `Generated ${result.generated_count} responses`,
      );
    },
    onError: (error) =>
      toast.error(
        "Generation failed",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      exportTrainingSheet(trainingSheetId!, {
        format: "openai_chat",
        volume_path: `/Volumes/main/ontos_ml_workbench/exports/training_sheet_${trainingSheetId}.jsonl`,
        include_only_verified: true,
        include_system_instruction: true,
      }),
    onSuccess: (result) => {
      toast.success(
        "Export complete",
        `Exported ${result.examples_exported} examples to ${result.volume_path}`,
      );
    },
    onError: (error) =>
      toast.error(
        "Export failed",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Handle annotation save (for image annotation mode)
  const handleAnnotationSave = useCallback(
    (taskId: string, annotation: Annotation) => {
      const rowIndex = parseInt(taskId.split("-").pop() || "0", 10);
      // Save annotation as JSON string in the response field
      updateMutation.mutate({
        rowIndex,
        response: JSON.stringify(annotation.result),
        markAsVerified: false,
      });
    },
    [updateMutation],
  );

  // Keyboard navigation via hooks (replaces manual addEventListener)
  const navigateUp = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedRowIndex(rows[selectedIndex - 1].row_index);
    }
  }, [rows, selectedIndex]);

  const navigateDown = useCallback(() => {
    if (selectedIndex < rows.length - 1) {
      setSelectedRowIndex(rows[selectedIndex + 1].row_index);
    } else if (selectedIndex === -1 && rows.length > 0) {
      setSelectedRowIndex(rows[0].row_index);
    }
  }, [rows, selectedIndex]);

  useListNavigation({
    onUp: navigateUp,
    onDown: navigateDown,
    onEscape: () => setSelectedRowIndex(null),
    enabled: rows.length > 0,
  });

  useKeyboardShortcuts(
    [
      { key: "?", handler: () => setShowShortcuts((s) => !s), description: "Toggle shortcuts" },
      { key: "ArrowLeft", handler: navigateUp, description: "Previous row" },
      { key: "ArrowRight", handler: navigateDown, description: "Next row" },
    ],
    { enabled: rows.length > 0 },
  );

  const handleSaveRow = (response: string, markAsVerified: boolean) => {
    if (selectedRowIndex === null) return;
    updateMutation.mutate({
      rowIndex: selectedRowIndex,
      response,
      markAsVerified,
    });
  };

  const isLoading = trainingSheetLoading || rowsLoading;

  // Handle training sheet selection
  const handleSelectTrainingSheet = (id: string) => {
    setSelectedTrainingSheetId(id);
    queryClient.invalidateQueries({ queryKey: ["training-sheet", id] });
    queryClient.invalidateQueries({ queryKey: ["trainingSheetPreview", id] });
  };

  // Handle creating training sheet from sheet
  const handleCreateTrainingSheet = async (sheetId: string) => {
    setIsGenerating(true);
    try {
      const result = await generateTrainingSheet(sheetId, {});
      toast.success(
        "Training Data created!",
        `Created ${result.total_items} prompt/response pairs`,
      );
      setSelectedTrainingSheetId(result.training_sheet_id);
      queryClient.invalidateQueries({ queryKey: ["training-sheets"] });
    } catch (err) {
      toast.error(
        "Failed to create training data",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // No training sheet selected - show browse/create modes with table
  if (!trainingSheetId) {
    const filteredTrainingSheets = (trainingSheets || []).filter((ts) =>
      (ts.sheet_name || ts.id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    const sheetsWithTemplates = (sheetsData?.sheets || []).filter(
      (s) => s.has_template,
    );
    const filteredSheets = sheetsWithTemplates.filter((sheet) =>
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // BROWSE MODE: Show table of existing training sheets
    if (stageMode === "browse") {
      // Define table columns for training sheets
      const columns: Column<TrainingSheet>[] = [
        {
          key: "name",
          header: "Training Data Name",
          width: "35%",
          render: (ts) => (
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-db-gray-900">
                  {ts.sheet_name || ts.id.slice(0, 8)}
                </div>
                {ts.template_config?.name && (
                  <div className="text-sm text-db-gray-500 truncate">
                    Template: {ts.template_config.name}
                  </div>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "rows",
          header: "Total Rows",
          width: "15%",
          render: (ts) => (
            <span className="text-sm text-db-gray-600">
              {ts.total_rows.toLocaleString()}
            </span>
          ),
        },
        {
          key: "verified",
          header: "Verified",
          width: "15%",
          render: (ts) => (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-db-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${(ts.human_verified_count / ts.total_rows) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-db-gray-600">
                {ts.human_verified_count}
              </span>
            </div>
          ),
        },
        {
          key: "type",
          header: "Type",
          width: "15%",
          render: (ts) => (
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                ts.template_config?.response_source_mode === "manual_labeling"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700",
              )}
            >
              {ts.template_config?.response_source_mode === "manual_labeling"
                ? "Manual Labeling"
                : "AI Generated"}
            </span>
          ),
        },
        {
          key: "updated",
          header: "Last Updated",
          width: "20%",
          render: (ts) => (
            <span className="text-sm text-db-gray-500">
              {ts.updated_at
                ? new Date(ts.updated_at).toLocaleDateString()
                : "N/A"}
            </span>
          ),
        },
      ];

      // Define row actions
      const rowActions: RowAction<TrainingSheet>[] = [
        {
          label: "Open",
          icon: Eye,
          onClick: (ts) => handleSelectTrainingSheet(ts.id),
          className: "text-teal-600",
        },
        {
          label: "Export",
          icon: Download,
          onClick: async (ts) => {
            try {
              await exportTrainingSheet(ts.id, {
                format: "openai_chat",
                volume_path: `/Volumes/main/default/datasets/training_sheet_${ts.id}.jsonl`,
                include_only_verified: false,
                include_system_instruction: true,
              });
              toast.success("Exported", "Training Data exported successfully");
            } catch (err) {
              toast.error(
                "Export failed",
                err instanceof Error ? err.message : "Unknown error",
              );
            }
          },
        },
      ];

      const emptyState = (
        <NoCurationItems
          action={{
            label: "Create Training Data",
            onClick: () => setStageMode("create"),
          }}
          className="bg-white rounded-lg"
        />
      );

      return (
        <div className="flex-1 flex flex-col bg-db-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-db-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-db-gray-900">
                    Training Sheets
                  </h1>
                  <p className="text-db-gray-600 mt-1">
                    Review and label prompt/response pairs for fine-tuning
                  </p>
                </div>
                <button
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["training-sheets"] })
                  }
                  className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Stage Sub-Navigation */}
          <StageSubNav
            stage="label"
            mode={stageMode}
            onModeChange={setStageMode}
            browseCount={trainingSheets?.length}
          />

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
                <Filter className="w-4 h-4 text-db-gray-400" />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                  <input
                    type="text"
                    placeholder="Search training sheets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-sm text-db-gray-500 hover:text-db-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {trainingSheetsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
              ) : (
                <DataTable
                  data={filteredTrainingSheets}
                  columns={columns}
                  rowKey={(ts) => ts.id}
                  onRowClick={(ts) => handleSelectTrainingSheet(ts.id)}
                  rowActions={rowActions}
                  emptyState={emptyState}
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    // CREATE MODE: Show sheet selection to create new training sheet
    if (stageMode === "create") {
      return (
        <div className="flex-1 flex flex-col bg-db-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-db-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-db-gray-900">
                Create Training Data
              </h1>
              <p className="text-db-gray-600 mt-1">
                Select a sheet with a template to create prompt/response pairs
              </p>
            </div>
          </div>

          {/* Stage Sub-Navigation */}
          <StageSubNav
            stage="label"
            mode={stageMode}
            onModeChange={setStageMode}
            browseCount={trainingSheets?.length}
          />

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
                <Filter className="w-4 h-4 text-db-gray-400" />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sheets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sheets Grid */}
          <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {sheetsLoading || isGenerating ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  {isGenerating && (
                    <span className="ml-3 text-db-gray-600">
                      Creating training sheet...
                    </span>
                  )}
                </div>
              ) : filteredSheets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => handleCreateTrainingSheet(sheet.id)}
                      disabled={isGenerating}
                      className="p-4 text-left border border-db-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                          <Table2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-db-gray-900 truncate">
                            {sheet.name}
                          </div>
                          {sheet.template_config && (
                            <div className="text-xs text-db-gray-500 mt-1 truncate">
                              Template: {sheet.template_config.name}
                            </div>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-db-gray-500">
                            <span>{sheet.columns?.length ?? 0} columns</span>
                            {sheet.item_count && (
                              <span>
                                {sheet.item_count.toLocaleString()} rows
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <NoTemplates
                  action={{
                    label: "Go to Data Stage",
                    onClick: () =>
                      (window.location.href =
                        window.location.origin + "/#/data"),
                  }}
                  className="bg-white rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Workflow Banner */}
          <WorkflowBanner />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">
                Label Q&A Pairs
              </h1>
              <p className="text-db-gray-600 mt-1">
                {showImageAnnotation
                  ? "Annotate images with bounding boxes, polygons, or masks"
                  : "Review, edit, and approve Q&A pairs for training"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Annotation Mode Toggle (when images detected) */}
              {isManualLabelingMode && hasImages && (
                <div className="flex items-center gap-1 bg-db-gray-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setAnnotationMode("text")}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      annotationMode === "text"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-db-gray-600 hover:text-db-gray-900",
                    )}
                  >
                    <Edit3 className="w-4 h-4" />
                    Text
                  </button>
                  <button
                    onClick={() => setAnnotationMode("image")}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      annotationMode === "image"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-db-gray-600 hover:text-db-gray-900",
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded-lg"
              >
                <Keyboard className="w-4 h-4" />
                Shortcuts
              </button>
            </div>
          </div>

          {/* Training Data Info & Actions */}
          {trainingSheet && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="font-medium text-db-gray-800">
                      {trainingSheet.template_config.name || "Training Data"}
                    </h2>
                    <p className="text-sm text-db-gray-500">
                      {trainingSheet.total_rows} rows · Status: {trainingSheet.status}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTrainingSheetPicker(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {(trainingSheet.empty_count || 0) > 0 && (
                    <button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Generate {trainingSheet.empty_count} Empty
                    </button>
                  )}
                  {trainingSheet.human_verified_count > 0 && (
                    <button
                      onClick={() => exportMutation.mutate()}
                      disabled={exportMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {exportMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export {trainingSheet.human_verified_count} Verified
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <StatsBar trainingSheet={trainingSheet} />
            </div>
          )}

          {/* Asset Review */}
          {trainingSheet && (
            <div className="mb-6">
              <ReviewPanel
                assetType="training_sheet"
                assetId={trainingSheet.id}
                assetName={trainingSheet.template_config.name || "Training Data"}
              />
            </div>
          )}

          {/* Canonical Label Stats */}
          {trainingSheet?.sheet_id && (
            <div className="mb-6">
              <CanonicalLabelStats sheetId={trainingSheet.sheet_id} />
            </div>
          )}

          {/* Canonical Label Browser */}
          {trainingSheet?.sheet_id && canonicalStats && canonicalStats.total_labels > 0 && (
            <div className="mb-6">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-db-gray-700 hover:text-db-gray-900 flex items-center gap-2 mb-2">
                  <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                  Browse Canonical Labels ({canonicalStats.total_labels})
                </summary>
                <CanonicalLabelBrowser sheetId={trainingSheet.sheet_id} compact />
              </details>
            </div>
          )}

          {/* Quality Gate */}
          {trainingSheetId && (
            <div className="mb-6">
              <QualityGatePanel collectionId={trainingSheetId} />
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No rows to display"
              description={
                sourceFilter
                  ? `No rows with status "${sourceLabels[sourceFilter]}"`
                  : "The training sheet has no rows yet"
              }
              variant="compact"
            />
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-db-gray-600">Filter:</span>
                  {(
                    [
                      "",
                      "empty",
                      "ai_generated",
                      "human_labeled",
                      "human_verified",
                    ] as const
                  ).map((source) => (
                    <button
                      key={source}
                      onClick={() => setSourceFilter(source)}
                      className={clsx(
                        "px-3 py-1 text-sm rounded-full transition-colors",
                        sourceFilter === source
                          ? "bg-purple-100 text-purple-700"
                          : "bg-db-gray-100 text-db-gray-600 hover:bg-db-gray-200",
                      )}
                    >
                      {source ? sourceLabels[source] : "All"}
                    </button>
                  ))}
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-db-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={clsx(
                      "p-1.5 rounded",
                      viewMode === "grid"
                        ? "bg-white shadow-sm"
                        : "text-db-gray-500",
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={clsx(
                      "p-1.5 rounded",
                      viewMode === "list"
                        ? "bg-white shadow-sm"
                        : "text-db-gray-500",
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items grid/list */}
              <div
                className={clsx(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-2",
                )}
              >
                {rows.map((row) => (
                  <RowCard
                    key={row.row_index}
                    row={row}
                    isSelected={row.row_index === selectedRowIndex}
                    onSelect={() => setSelectedRowIndex(row.row_index)}
                  />
                ))}
              </div>

              {/* Row count */}
              <div className="mt-4 text-sm text-db-gray-500 text-center">
                Showing {rows.length} of {previewData?.total_rows || 0} rows
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Panel - Text mode or Image Annotation mode */}
      {selectedRow && trainingSheet && !showImageAnnotation && (
        <DetailPanel
          row={selectedRow}
          trainingSheet={trainingSheet}
          onClose={() => setSelectedRowIndex(null)}
          onSave={handleSaveRow}
          onNext={() => {
            if (selectedIndex < rows.length - 1) {
              setSelectedRowIndex(rows[selectedIndex + 1].row_index);
            }
          }}
          onPrevious={() => {
            if (selectedIndex > 0) {
              setSelectedRowIndex(rows[selectedIndex - 1].row_index);
            }
          }}
          hasNext={selectedIndex < rows.length - 1}
          hasPrevious={selectedIndex > 0}
          isSaving={updateMutation.isPending}
          onCreateCanonicalLabel={() => setShowCanonicalLabelModal(true)}
        />
      )}

      {/* Image Annotation Panel */}
      {showImageAnnotation &&
        selectedIndex >= 0 &&
        annotationTasks.length > 0 && (
          <div className="w-[700px] border-l border-db-gray-200">
            <ImageAnnotationPanel
              task={annotationTasks[selectedIndex]}
              tasks={annotationTasks}
              currentIndex={selectedIndex}
              labels={annotationLabels}
              defaultAnnotationType="bbox"
              onSave={handleAnnotationSave}
              onSkip={(taskId) => {
                // Move to next task on skip
                if (selectedIndex < rows.length - 1) {
                  setSelectedRowIndex(rows[selectedIndex + 1].row_index);
                }
              }}
              onFlag={(taskId, reason) => {
                toast.info("Task flagged", reason);
              }}
              onNavigate={(index) => {
                if (index >= 0 && index < rows.length) {
                  setSelectedRowIndex(rows[index].row_index);
                }
              }}
            />
          </div>
        )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-db-gray-400 hover:text-db-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: "← / ↑ / k", action: "Previous row" },
                { key: "→ / ↓ / j", action: "Next row" },
                { key: "⌘S", action: "Save response" },
                { key: "Esc", action: "Close detail panel" },
                { key: "?", action: "Toggle shortcuts" },
              ].map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-db-gray-600">{action}</span>
                  <kbd className="px-2 py-1 bg-db-gray-100 rounded text-sm font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Training Data Picker Modal */}
      {showTrainingSheetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Select Training Data</h2>
              <button
                onClick={() => setShowTrainingSheetPicker(false)}
                className="text-db-gray-400 hover:text-db-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trainingSheetsLoading ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading training sheets...
              </div>
            ) : trainingSheets && trainingSheets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trainingSheets.map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => {
                      setSelectedTrainingSheetId(ts.id);
                      setShowTrainingSheetPicker(false);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-3 border rounded-lg transition-colors",
                      ts.id === trainingSheetId
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-400 hover:bg-purple-50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          {ts.template_config?.name || ts.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ts.total_rows} rows · {ts.human_verified_count}{" "}
                          verified
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ts.template_config?.response_source_mode ===
                          "manual_labeling" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Manual Labeling
                          </span>
                        )}
                        {ts.id === trainingSheetId && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No training sheets found. Create one from the Template Builder.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promote to Canonical Label Modal */}
      {selectedRow && trainingSheet && (
        <PromoteToCanonicalModal
          isOpen={showCanonicalLabelModal}
          onClose={() => setShowCanonicalLabelModal(false)}
          row={selectedRow}
          sheetId={trainingSheet.sheet_id}
          labelType={trainingSheet.template_config?.label_type || "classification"}
          labeledBy={config?.current_user || "unknown"}
        />
      )}
    </div>
  );
}

export default CuratePage;
