/**
 * Canonical Labeling Tool - Promote Q&A Pairs to Canonical Labels
 *
 * Review Q&A pairs from Training Sheets and promote them to canonical labels
 * with governance metadata (usage constraints, PII classification, confidence).
 *
 * Features:
 * - Browse Q&A pairs across all assemblies
 * - Filter by assembly, response source, status
 * - Promote selected pairs with governance metadata
 * - Bulk selection support
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  X,
  Loader2,
  Check,
  AlertTriangle,
  Shield,
  Filter,
  Search,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useToast } from "./Toast";
import {
  listAssemblies,
  previewAssembly,
  createCanonicalLabel,
  getConfig,
} from "../services/api";
import type {
  AssembledDataset,
  AssembledRow,
  ResponseSource,
  LabelConfidence,
  DataClassification,
  UsageType,
  CanonicalLabelCreateRequest,
} from "../types";

interface CanonicalLabelingToolProps {
  onClose: () => void;
}

// Response source display config
const SOURCE_LABELS: Record<ResponseSource, { label: string; color: string }> = {
  empty: { label: "Empty", color: "bg-gray-100 text-gray-700" },
  imported: { label: "Imported", color: "bg-blue-100 text-blue-700" },
  ai_generated: { label: "AI Generated", color: "bg-purple-100 text-purple-700" },
  human_labeled: { label: "Human Labeled", color: "bg-green-100 text-green-700" },
  human_verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700" },
  canonical: { label: "Canonical", color: "bg-cyan-100 text-cyan-700" },
};

const USAGE_OPTIONS: { value: UsageType; label: string; description: string }[] = [
  { value: "training", label: "Training", description: "Fine-tune models" },
  { value: "validation", label: "Validation", description: "Evaluate models" },
  { value: "few_shot", label: "Few-Shot", description: "Runtime examples" },
];

const CLASSIFICATION_OPTIONS: {
  value: DataClassification;
  label: string;
  color: string;
}[] = [
  { value: "public", label: "Public", color: "bg-green-100 text-green-800" },
  { value: "internal", label: "Internal", color: "bg-blue-100 text-blue-800" },
  { value: "confidential", label: "Confidential", color: "bg-orange-100 text-orange-800" },
  { value: "restricted", label: "Restricted (PII)", color: "bg-red-100 text-red-800" },
];

export function CanonicalLabelingTool({ onClose }: CanonicalLabelingToolProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  // View state
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<ResponseSource | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Promote modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [rowToPromote, setRowToPromote] = useState<AssembledRow | null>(null);

  // Promote form state
  const [confidence, setConfidence] = useState<LabelConfidence>("high");
  const [allowedUses, setAllowedUses] = useState<UsageType[]>(["training"]);
  const [prohibitedUses, setProhibitedUses] = useState<UsageType[]>([]);
  const [dataClassification, setDataClassification] = useState<DataClassification>("internal");
  const [notes, setNotes] = useState("");

  // Fetch config for current user
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: Infinity,
  });

  // Fetch all assemblies
  const { data: assemblies } = useQuery({
    queryKey: ["assemblies"],
    queryFn: () => listAssemblies(),
  });

  // Fetch selected assembly's rows
  const { data: assemblyData, isLoading: rowsLoading } = useQuery({
    queryKey: ["assembly-preview", selectedAssemblyId, sourceFilter],
    queryFn: () =>
      previewAssembly(selectedAssemblyId!, {
        limit: 200,
        response_source: sourceFilter === "all" ? undefined : sourceFilter,
      }),
    enabled: !!selectedAssemblyId,
  });

  // Get current assembly metadata
  const currentAssembly = assemblies?.find(
    (a: AssembledDataset) => a.id === selectedAssemblyId
  );

  // Filter rows by search
  const filteredRows = assemblyData?.rows?.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.prompt.toLowerCase().includes(query) ||
      row.response?.toLowerCase().includes(query)
    );
  }) || [];

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: async (row: AssembledRow) => {
      if (!currentAssembly) throw new Error("No assembly selected");

      const request: CanonicalLabelCreateRequest = {
        sheet_id: currentAssembly.sheet_id,
        item_ref: row.item_ref || `row_${row.row_index}`,
        label_type: currentAssembly.template_config?.label_type || "qa",
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
        labeled_by: config?.current_user || "unknown",
      };

      return createCanonicalLabel(request);
    },
    onSuccess: () => {
      toast.success(
        "Canonical Label Created",
        "Q&A pair promoted to canonical label"
      );
      queryClient.invalidateQueries({ queryKey: ["assembly-preview"] });
      setShowPromoteModal(false);
      setRowToPromote(null);
      resetPromoteForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to promote", error.message);
    },
  });

  const resetPromoteForm = () => {
    setConfidence("high");
    setAllowedUses(["training"]);
    setProhibitedUses([]);
    setDataClassification("internal");
    setNotes("");
  };

  const handlePromote = (row: AssembledRow) => {
    setRowToPromote(row);
    setShowPromoteModal(true);
  };

  const handleUsageToggle = (usage: UsageType, isAllowed: boolean) => {
    if (isAllowed) {
      if (allowedUses.includes(usage)) {
        setAllowedUses(allowedUses.filter((u) => u !== usage));
      } else {
        setAllowedUses([...allowedUses, usage]);
        setProhibitedUses(prohibitedUses.filter((u) => u !== usage));
      }
    } else {
      if (prohibitedUses.includes(usage)) {
        setProhibitedUses(prohibitedUses.filter((u) => u !== usage));
      } else {
        setProhibitedUses([...prohibitedUses, usage]);
        setAllowedUses(allowedUses.filter((u) => u !== usage));
      }
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <Tag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Canonical Labels
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Promote Q&A pairs to reusable canonical labels with governance metadata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {/* Assembly Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedAssemblyId || ""}
              onChange={(e) => {
                setSelectedAssemblyId(e.target.value || null);
                setSelectedRows(new Set());
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select Training Sheet...</option>
              {assemblies?.map((asm: AssembledDataset) => (
                <option key={asm.id} value={asm.id}>
                  {asm.template_config?.name || asm.sheet_name || asm.id} ({asm.total_rows} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          {selectedAssemblyId && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as ResponseSource | "all")}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All Sources</option>
              <option value="ai_generated">AI Generated</option>
              <option value="human_labeled">Human Labeled</option>
              <option value="human_verified">Verified</option>
              <option value="canonical">Already Canonical</option>
            </select>
          )}

          {/* Search */}
          {selectedAssemblyId && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts/responses..."
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900"
              />
            </div>
          )}

          {/* Stats */}
          {currentAssembly && (
            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {filteredRows.length} Q&A pairs
              {selectedRows.size > 0 && (
                <span className="ml-2 text-cyan-600">
                  ({selectedRows.size} selected)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!selectedAssemblyId ? (
          // Empty state - no assembly selected
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select a Training Sheet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Choose a Training Sheet from the dropdown above to review Q&A pairs
              and promote them to canonical labels.
            </p>
          </div>
        ) : rowsLoading ? (
          // Loading
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          // No rows
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-gray-500 dark:text-gray-400">
              No Q&A pairs found matching your filters.
            </p>
          </div>
        ) : (
          // Q&A Pairs List
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRows.map((row) => (
              <div
                key={row.row_index}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  row.response_source === "canonical" ? "bg-cyan-50 dark:bg-cyan-900/20" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.row_index)}
                    onChange={() => toggleRowSelection(row.row_index)}
                    className="mt-1.5 w-4 h-4 text-cyan-600 rounded border-gray-300"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Prompt */}
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Prompt
                      </span>
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {row.prompt}
                      </p>
                    </div>

                    {/* Response */}
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Response
                      </span>
                      {row.response ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-mono line-clamp-2 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                          {row.response}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-1">
                          No response
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          SOURCE_LABELS[row.response_source].color
                        }`}
                      >
                        {SOURCE_LABELS[row.response_source].label}
                      </span>
                      {row.item_ref && (
                        <span className="text-xs text-gray-500 font-mono">
                          {row.item_ref}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {row.response_source === "canonical" ? (
                      <span className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400">
                        <CheckCircle className="w-4 h-4" />
                        Promoted
                      </span>
                    ) : row.response ? (
                      <button
                        onClick={() => handlePromote(row)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors"
                      >
                        <Tag className="w-4 h-4" />
                        Promote
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Needs response
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promote Modal */}
      {showPromoteModal && rowToPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowPromoteModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                  <Tag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Promote to Canonical Label
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set governance metadata
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Q&A Preview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500">Prompt</span>
                  <p className="text-gray-800 dark:text-gray-200 line-clamp-2">
                    {rowToPromote.prompt}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Response</span>
                  <p className="text-gray-700 dark:text-gray-300 font-mono line-clamp-2">
                    {rowToPromote.response}
                  </p>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Level
                </label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as LabelConfidence[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidence(level)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        confidence === level
                          ? level === "high"
                            ? "bg-green-100 border-green-500 text-green-700"
                            : level === "medium"
                              ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                              : "bg-red-100 border-red-500 text-red-700"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Data Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSIFICATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDataClassification(opt.value)}
                      className={`p-2 rounded-lg border-2 text-left text-sm transition-colors ${
                        dataClassification === opt.value
                          ? opt.color + " border-current"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      {opt.label}
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
                  {USAGE_OPTIONS.map((opt) => {
                    const isAllowed = allowedUses.includes(opt.value);
                    const isProhibited = prohibitedUses.includes(opt.value);

                    return (
                      <div
                        key={opt.value}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {opt.label}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {opt.description}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUsageToggle(opt.value, true)}
                            className={`p-1.5 rounded transition-colors ${
                              isAllowed
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
                            }`}
                            title="Allow"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUsageToggle(opt.value, false)}
                            className={`p-1.5 rounded transition-colors ${
                              isProhibited
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
                  placeholder="Add context about this label..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => promoteMutation.mutate(rowToPromote)}
                disabled={promoteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                {promoteMutation.isPending ? (
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
      )}
    </div>
  );
}
