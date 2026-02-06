/**
 * DataPage - DATA stage for managing sheets and data sources
 *
 * Features:
 * - Browse mode: DataTable view of all sheets
 * - Create mode: Multi-dataset source configuration
 * - Sheet management (create, edit, delete, export)
 * - Unity Catalog integration for data source selection
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Table2,
  ArrowRight,
  Loader2,
  Check,
  X,
  Plus,
  Trash2,
  Image,
  Activity,
  GitMerge,
  Layers,
  Link2,
  Settings2,
  AlertCircle,
  Key,
  Eye,
  Download,
  Calendar,
} from "lucide-react";
import { clsx } from "clsx";
import { UCBrowser, type UCItem } from "../components/UCBrowser";
import {
  DataTable,
  type Column,
  type RowAction,
} from "../components/DataTable";
import { StageSubNav } from "../components/StageSubNav";
import { CanonicalLabelStats } from "../components/CanonicalLabelStats";
import {
  previewTable,
  listTables,
  listSheets,
  deleteSheet,
  exportSheet,
} from "../services/api";
import { useToast } from "../components/Toast";
import { useWorkflow } from "../context/WorkflowContext";
import type {
  DataSourceConfig,
  SourceColumn,
  JoinKeyMapping,
  Sheet,
} from "../types";
import { DATASET_PRESETS } from "../types";

// ============================================================================
// Type Definitions
// ============================================================================

type ViewMode = "browse" | "create";

// ============================================================================
// Preset Selection Component
// ============================================================================

interface PresetCardProps {
  preset: (typeof DATASET_PRESETS)[number];
  isSelected: boolean;
  onSelect: () => void;
}

function PresetCard({ preset, isSelected, onSelect }: PresetCardProps) {
  const icons: Record<string, React.ReactNode> = {
    activity: <Activity className="w-6 h-6" />,
    "git-merge": <GitMerge className="w-6 h-6" />,
    image: <Image className="w-6 h-6" />,
    layers: <Layers className="w-6 h-6" />,
  };

  return (
    <button
      onClick={onSelect}
      className={clsx(
        "p-4 rounded-lg border-2 text-left transition-all",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-db-gray-200 hover:border-blue-300 hover:bg-db-gray-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "p-2 rounded-lg",
            isSelected
              ? "bg-blue-100 text-blue-600"
              : "bg-db-gray-100 text-db-gray-500",
          )}
        >
          {icons[preset.icon] || <Database className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3
            className={clsx(
              "font-medium",
              isSelected ? "text-blue-800" : "text-db-gray-800",
            )}
          >
            {preset.name}
          </h3>
          <p className="text-sm text-db-gray-500 mt-1">{preset.description}</p>
        </div>
        {isSelected && <Check className="w-5 h-5 text-blue-600" />}
      </div>
    </button>
  );
}

// ============================================================================
// Data Source Card Component
// ============================================================================

interface DataSourceCardProps {
  role: DataSourceConfig["role"];
  config: DataSourceConfig | null;
  onBrowse: () => void;
  onRemove: () => void;
  onSelectJoinKeys: (keys: string[]) => void;
  suggestedJoinKeys: string[];
  isRequired: boolean;
}

const ROLE_INFO: Record<
  DataSourceConfig["role"],
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  primary: {
    label: "Primary Data",
    description:
      "Main data source (e.g., sensor readings, equipment telemetry)",
    icon: <Database className="w-5 h-5" />,
    color: "blue",
  },
  secondary: {
    label: "Secondary Data",
    description: "Additional context data (e.g., equipment specs, calibration)",
    icon: <Table2 className="w-5 h-5" />,
    color: "purple",
  },
  images: {
    label: "Image Data",
    description: "Inspection images or visual data with metadata",
    icon: <Image className="w-5 h-5" />,
    color: "green",
  },
  labels: {
    label: "Labels / Ground Truth",
    description:
      "Quality metrics, defect classifications, or human annotations",
    icon: <Check className="w-5 h-5" />,
    color: "amber",
  },
};

function DataSourceCard({
  role,
  config,
  onBrowse,
  onRemove,
  onSelectJoinKeys,
  suggestedJoinKeys,
  isRequired,
}: DataSourceCardProps) {
  const [showJoinKeys, setShowJoinKeys] = useState(false);
  const info = ROLE_INFO[role];
  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-800",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      text: "text-purple-800",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      text: "text-green-800",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-600",
      text: "text-amber-800",
    },
  };
  const colorClasses =
    colorMap[info.color as keyof typeof colorMap] || colorMap.blue;

  if (!config) {
    return (
      <div
        className={clsx(
          "rounded-lg border-2 border-dashed p-4",
          isRequired ? "border-db-gray-300" : "border-db-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-db-gray-100 rounded-lg text-db-gray-400">
              {info.icon}
            </div>
            <div>
              <h4 className="font-medium text-db-gray-700">
                {info.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </h4>
              <p className="text-sm text-db-gray-500">{info.description}</p>
            </div>
          </div>
          <button
            onClick={onBrowse}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-lg border p-4",
        colorClasses.bg,
        colorClasses.border,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={clsx("p-2 rounded-lg bg-white", colorClasses.icon)}>
            {info.icon}
          </div>
          <div>
            <h4 className={clsx("font-medium", colorClasses.text)}>
              {config.alias || info.label}
            </h4>
            <p className="text-sm font-mono text-db-gray-600 mt-0.5">
              {config.source.fullPath}
            </p>
            {config.source.columns && (
              <p className="text-xs text-db-gray-500 mt-1">
                {config.source.columns.length} columns
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinKeys(!showJoinKeys)}
            className="p-1.5 text-db-gray-500 hover:text-db-gray-700 hover:bg-white rounded"
            title="Configure join keys"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={onBrowse}
            className="p-1.5 text-db-gray-500 hover:text-db-gray-700 hover:bg-white rounded"
            title="Change source"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          {!isRequired && (
            <button
              onClick={onRemove}
              className="p-1.5 text-db-gray-400 hover:text-red-600 hover:bg-white rounded"
              title="Remove source"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Join Keys Section */}
      {showJoinKeys && config.source.columns && (
        <div className="mt-3 pt-3 border-t border-white/50">
          <p className="text-xs font-medium text-db-gray-600 mb-2">
            Select join key columns:
          </p>
          <div className="flex flex-wrap gap-2">
            {config.source.columns.map((col) => {
              const isSelected = config.joinKeys.includes(col.name);
              const isSuggested = suggestedJoinKeys.some((k) =>
                col.name.toLowerCase().includes(k.toLowerCase()),
              );

              return (
                <button
                  key={col.name}
                  onClick={() => {
                    const newKeys = isSelected
                      ? config.joinKeys.filter((k) => k !== col.name)
                      : [...config.joinKeys, col.name];
                    onSelectJoinKeys(newKeys);
                  }}
                  className={clsx(
                    "px-2 py-1 text-xs rounded border transition-colors",
                    isSelected
                      ? "bg-white border-blue-400 text-blue-700"
                      : isSuggested
                        ? "bg-white/50 border-db-gray-300 text-db-gray-700 ring-1 ring-amber-300"
                        : "bg-white/30 border-db-gray-200 text-db-gray-600 hover:bg-white/50",
                  )}
                  title={isSuggested ? "Suggested join key" : undefined}
                >
                  {col.name}
                  {isSelected && <Check className="w-3 h-3 ml-1 inline" />}
                  {isSuggested && !isSelected && (
                    <span className="ml-1 text-amber-500">*</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Join Configuration Component
// ============================================================================

interface JoinConfigProps {
  sources: DataSourceConfig[];
  mappings: JoinKeyMapping[];
  onUpdateMappings: (mappings: JoinKeyMapping[]) => void;
}

function JoinConfig({ sources, mappings, onUpdateMappings }: JoinConfigProps) {
  const primarySource = sources.find((s) => s.role === "primary");
  const otherSources = sources.filter((s) => s.role !== "primary");

  if (!primarySource || otherSources.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-db-gray-500" />
        <h3 className="font-medium text-db-gray-800">Join Configuration</h3>
      </div>

      <div className="space-y-4">
        {otherSources.map((source) => {
          const sourceMapping = mappings.filter(
            (m) => m.targetAlias === (source.alias || source.source.name),
          );

          return (
            <div key={source.role} className="p-3 bg-db-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-db-gray-700">
                  {primarySource.alias || "Primary"}
                </span>
                <ArrowRight className="w-4 h-4 text-db-gray-400" />
                <span className="text-sm font-medium text-db-gray-700">
                  {source.alias || ROLE_INFO[source.role].label}
                </span>
              </div>

              {primarySource.joinKeys.length > 0 &&
              source.joinKeys.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {primarySource.joinKeys.map((pk) => (
                    <div key={pk} className="flex items-center gap-1 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {pk}
                      </span>
                      <span className="text-db-gray-400">=</span>
                      <select
                        className="px-2 py-1 bg-white border border-db-gray-200 rounded text-db-gray-700"
                        value={
                          sourceMapping.find((m) => m.sourceColumn === pk)
                            ?.targetColumn || ""
                        }
                        onChange={(e) => {
                          const newMappings = mappings.filter(
                            (m) =>
                              !(
                                m.sourceColumn === pk &&
                                m.targetAlias ===
                                  (source.alias || source.source.name)
                              ),
                          );
                          if (e.target.value) {
                            newMappings.push({
                              sourceAlias: primarySource.alias || "primary",
                              sourceColumn: pk,
                              targetAlias: source.alias || source.source.name,
                              targetColumn: e.target.value,
                            });
                          }
                          onUpdateMappings(newMappings);
                        }}
                      >
                        <option value="">Select column...</option>
                        {source.joinKeys.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Select join keys for both sources to configure the join
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Data Preview Component
// ============================================================================

interface DataPreviewProps {
  source: DataSourceConfig;
}

function DataPreview({ source }: DataPreviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "table-preview",
      source.source.catalog,
      source.source.schema,
      source.source.name,
    ],
    queryFn: () =>
      previewTable(
        source.source.catalog,
        source.source.schema,
        source.source.name,
        10,
      ),
    enabled: source.source.type === "table",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-db-gray-500">Loading preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500">
        <X className="w-5 h-5 mr-2" />
        Failed to load preview
      </div>
    );
  }

  if (!data?.rows || data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-db-gray-500">
        <Database className="w-5 h-5 mr-2" />
        No data in this table
      </div>
    );
  }

  const columns = Object.keys(data.rows[0]);

  return (
    <div className="overflow-auto max-h-64 border border-db-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-db-gray-200">
        <thead className="bg-db-gray-50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-db-gray-600 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-db-gray-100">
          {data.rows.slice(0, 5).map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-2 text-sm text-db-gray-700 truncate max-w-xs"
                >
                  {row[col] === null ? (
                    <span className="text-db-gray-300 italic">null</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-db-gray-50 text-xs text-db-gray-500">
        Showing 5 of {data.count} rows
      </div>
    </div>
  );
}

// ============================================================================
// UC Browser Modal
// ============================================================================

interface BrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: UCItem, columns: SourceColumn[]) => void;
  title: string;
  filter?: ("table" | "volume")[];
}

function BrowserModal({
  isOpen,
  onClose,
  onSelect,
  title,
  filter = ["table"],
}: BrowserModalProps) {
  const [selectedItem, setSelectedItem] = useState<UCItem | null>(null);
  const toast = useToast();

  // Fetch columns when table is selected
  const { data: tableInfo } = useQuery({
    queryKey: [
      "table-columns",
      selectedItem?.catalogName,
      selectedItem?.schemaName,
      selectedItem?.tableName,
    ],
    queryFn: async () => {
      if (!selectedItem?.catalogName || !selectedItem?.schemaName) return null;
      const tables = await listTables(
        selectedItem.catalogName,
        selectedItem.schemaName,
      );
      return tables.find((t) => t.name === selectedItem.tableName);
    },
    enabled:
      !!selectedItem?.catalogName &&
      !!selectedItem?.schemaName &&
      !!selectedItem?.tableName,
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedItem) {
      const columns: SourceColumn[] =
        tableInfo?.columns?.map((c) => ({
          name: c.name,
          type: c.type,
          comment: c.comment,
        })) || [];
      onSelect(selectedItem, columns);
      setSelectedItem(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* UC Browser */}
          <div className="w-80 border-r border-db-gray-200 overflow-auto">
            <UCBrowser
              onSelect={(item) => {
                if (filter.includes(item.type as "table" | "volume")) {
                  setSelectedItem(item);
                } else {
                  toast.warning(
                    "Invalid selection",
                    `Please select a ${filter.join(" or ")}`,
                  );
                }
              }}
              filter={filter}
            />
          </div>

          {/* Preview */}
          <div className="flex-1 p-4 overflow-auto">
            {selectedItem ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Table2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-db-gray-800">
                    {selectedItem.name}
                  </span>
                  <span className="text-sm text-db-gray-500">
                    ({selectedItem.fullPath})
                  </span>
                </div>

                {tableInfo?.columns && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-db-gray-700 mb-2">
                      Columns ({tableInfo.columns.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {tableInfo.columns.map((col) => (
                        <span
                          key={col.name}
                          className="px-2 py-0.5 bg-db-gray-100 text-db-gray-700 rounded text-xs"
                          title={`Type: ${col.type}`}
                        >
                          {col.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.catalogName &&
                  selectedItem.schemaName &&
                  selectedItem.tableName && (
                    <DataPreview
                      source={{
                        source: {
                          type: "table",
                          catalog: selectedItem.catalogName,
                          schema: selectedItem.schemaName,
                          name: selectedItem.tableName,
                          fullPath: selectedItem.fullPath,
                        },
                        role: "primary",
                        joinKeys: [],
                      }}
                    />
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-db-gray-500">
                <Database className="w-8 h-8 mr-3 text-db-gray-300" />
                <span>Select a table from the browser</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Select Source
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Browse Mode: Sheet List with DataTable
// ============================================================================

interface BrowseModeProps {
  onCreateNew: () => void;
  onSelectSheet: (sheet: Sheet) => void;
}

function BrowseMode({ onCreateNew, onSelectSheet }: BrowseModeProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);

  // Fetch sheets
  const { data, isLoading, error } = useQuery({
    queryKey: ["sheets", searchTerm],
    queryFn: () =>
      listSheets({
        search: searchTerm || undefined,
        page: 1,
        page_size: 100,
      }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
      toast.success("Sheet deleted", "Sheet has been removed");
    },
    onError: (error: Error) => {
      toast.error("Delete failed", error.message);
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (sheet: Sheet) =>
      exportSheet(sheet.id, {
        catalog: "main",
        schema: "default",
        table: `${sheet.name}_export`,
        overwrite: true,
      }),
    onSuccess: (data) => {
      toast.success("Export started", `Exporting to ${data.destination}`);
    },
    onError: (error: Error) => {
      toast.error("Export failed", error.message);
    },
  });

  // Define columns
  const columns: Column<Sheet>[] = [
    {
      key: "name",
      header: "Sheet Name",
      width: "30%",
      render: (sheet) => (
        <div>
          <div className="font-medium text-db-gray-900">{sheet.name}</div>
          {sheet.description && (
            <div className="text-xs text-db-gray-500 mt-0.5">
              {sheet.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "columns",
      header: "Columns",
      width: "10%",
      render: (sheet) => (
        <span className="text-db-gray-700">{sheet.columns.length}</span>
      ),
    },
    {
      key: "row_count",
      header: "Rows",
      width: "10%",
      render: (sheet) => (
        <span className="text-db-gray-700">
          {sheet.row_count?.toLocaleString() || "0"}
        </span>
      ),
    },
    {
      key: "has_template",
      header: "Template",
      width: "10%",
      render: (sheet) => (
        <div className="flex items-center gap-1">
          {sheet.has_template ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">Yes</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4 text-db-gray-300" />
              <span className="text-xs text-db-gray-400">No</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (sheet) => (
        <span
          className={clsx(
            "px-2 py-1 rounded text-xs font-medium",
            sheet.status === "published"
              ? "bg-green-100 text-green-700"
              : sheet.status === "draft"
                ? "bg-blue-100 text-blue-700"
                : "bg-db-gray-100 text-db-gray-600",
          )}
        >
          {sheet.status}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      width: "15%",
      render: (sheet) => (
        <div className="flex items-center gap-1 text-sm text-db-gray-600">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {sheet.created_at
              ? new Date(sheet.created_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
      ),
    },
  ];

  // Define row actions
  const rowActions: RowAction<Sheet>[] = [
    {
      label: "Open",
      icon: Eye,
      onClick: (sheet) => {
        setSelectedSheet(sheet);
        onSelectSheet(sheet);
      },
    },
    {
      label: "Export",
      icon: Download,
      onClick: (sheet) => exportMutation.mutate(sheet),
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (sheet) => {
        if (confirm(`Delete sheet "${sheet.name}"?`)) {
          deleteMutation.mutate(sheet.id);
        }
      },
      className: "text-red-600 hover:bg-red-50",
    },
  ];

  // Empty state
  const emptyState = (
    <div className="text-center py-12">
      <Database className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-db-gray-700 mb-1">
        No sheets yet
      </h3>
      <p className="text-sm text-db-gray-500 mb-4">
        Create your first sheet to get started
      </p>
      <button
        onClick={onCreateNew}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Create Sheet
      </button>
    </div>
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <X className="w-5 h-5 mr-2" />
        Failed to load sheets: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-db-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-db-gray-900">
              All Sheets
            </h2>
            <p className="text-sm text-db-gray-500 mt-0.5">
              {data?.total || 0} total sheets
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-db-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Sheet
            </button>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-db-gray-500">Loading sheets...</span>
          </div>
        ) : (
          <>
            <DataTable
              data={data?.sheets || []}
              columns={columns}
              rowKey={(sheet) => sheet.id}
              onRowClick={(sheet) => {
                setSelectedSheet(sheet);
                onSelectSheet(sheet);
              }}
              rowActions={rowActions}
              emptyState={emptyState}
            />

            {/* Canonical Label Stats */}
            {selectedSheet && (
              <div className="mt-8 border-t pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-db-gray-900">
                    Canonical Labels for "{selectedSheet.name}"
                  </h3>
                  <button
                    onClick={() => setSelectedSheet(null)}
                    className="text-sm text-db-gray-500 hover:text-db-gray-700"
                  >
                    Close
                  </button>
                </div>
                <CanonicalLabelStats
                  sheetId={selectedSheet.id}
                  onViewMostReused={(label) => {
                    console.log("View label:", label);
                    toast.success(
                      "Label selected",
                      `Viewing ${label.label_type} label`,
                    );
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Create Mode: Original Configuration UI
// ============================================================================

interface CreateModeProps {
  onCancel: () => void;
  onComplete: () => void;
}

function CreateMode({ onCancel, onComplete }: CreateModeProps) {
  const toast = useToast();
  const {
    state,
    addDataSource,
    removeDataSource,
    updateDataSource,
    setJoinKeyMappings,
  } = useWorkflow();

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [browserModal, setBrowserModal] = useState<{
    isOpen: boolean;
    role: DataSourceConfig["role"];
    title: string;
  }>({ isOpen: false, role: "primary", title: "" });

  const sources = state.datasetConfig?.sources || [];
  const mappings = state.datasetConfig?.joinConfig?.keyMappings || [];

  const getSourceForRole = (role: DataSourceConfig["role"]) =>
    sources.find((s) => s.role === role) || null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
  };

  const handleBrowseForRole = (role: DataSourceConfig["role"]) => {
    setBrowserModal({
      isOpen: true,
      role,
      title: `Select ${ROLE_INFO[role].label}`,
    });
  };

  const handleSourceSelected = (item: UCItem, columns: SourceColumn[]) => {
    const newSource: DataSourceConfig = {
      source: {
        type: item.type as "table" | "volume",
        catalog: item.catalogName || "",
        schema: item.schemaName || "",
        name: item.tableName || item.volumeName || item.name,
        fullPath: item.fullPath,
        columns,
      },
      role: browserModal.role,
      alias: ROLE_INFO[browserModal.role].label,
      joinKeys: [],
    };

    addDataSource(newSource);
    toast.success(
      "Source added",
      `${item.name} added as ${ROLE_INFO[browserModal.role].label}`,
    );
  };

  const handleSave = () => {
    const primarySource = getSourceForRole("primary");
    if (!primarySource) {
      toast.error(
        "Primary source required",
        "Please add at least a primary data source",
      );
      return;
    }

    toast.success("Sheet configured", "Data sources configured successfully");
    onComplete();
  };

  const currentPreset = DATASET_PRESETS.find((p) => p.id === selectedPreset);
  const suggestedJoinKeys = currentPreset?.suggestedJoinKeys || [];
  const canSave = getSourceForRole("primary") !== null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-db-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-db-gray-900">
              Create New Sheet
            </h2>
            <p className="text-sm text-db-gray-500 mt-0.5">
              Configure data sources for your sheet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg"
            >
              Cancel
            </button>
            {canSave && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Save Sheet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Step 1: Select Preset */}
          <div className="bg-white rounded-lg border border-db-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                1
              </span>
              <h3 className="text-lg font-semibold text-db-gray-800">
                What kind of data are you working with?
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {DATASET_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onSelect={() => handleSelectPreset(preset.id)}
                />
              ))}
            </div>
          </div>

          {/* Step 2: Configure Sources */}
          {selectedPreset && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  2
                </span>
                <h3 className="text-lg font-semibold text-db-gray-800">
                  Add your data sources
                </h3>
              </div>

              <div className="space-y-4">
                {/* Primary Source */}
                <DataSourceCard
                  role="primary"
                  config={getSourceForRole("primary")}
                  onBrowse={() => handleBrowseForRole("primary")}
                  onRemove={() => removeDataSource("primary")}
                  onSelectJoinKeys={(keys) =>
                    updateDataSource("primary", { joinKeys: keys })
                  }
                  suggestedJoinKeys={suggestedJoinKeys}
                  isRequired={true}
                />

                {/* Conditional sources */}
                {(selectedPreset === "sensor-quality" ||
                  selectedPreset === "full-multimodal") && (
                  <DataSourceCard
                    role="labels"
                    config={getSourceForRole("labels")}
                    onBrowse={() => handleBrowseForRole("labels")}
                    onRemove={() => removeDataSource("labels")}
                    onSelectJoinKeys={(keys) =>
                      updateDataSource("labels", { joinKeys: keys })
                    }
                    suggestedJoinKeys={suggestedJoinKeys}
                    isRequired={false}
                  />
                )}

                {(selectedPreset === "sensor-images" ||
                  selectedPreset === "full-multimodal") && (
                  <DataSourceCard
                    role="images"
                    config={getSourceForRole("images")}
                    onBrowse={() => handleBrowseForRole("images")}
                    onRemove={() => removeDataSource("images")}
                    onSelectJoinKeys={(keys) =>
                      updateDataSource("images", { joinKeys: keys })
                    }
                    suggestedJoinKeys={suggestedJoinKeys}
                    isRequired={false}
                  />
                )}

                {selectedPreset === "full-multimodal" && (
                  <DataSourceCard
                    role="secondary"
                    config={getSourceForRole("secondary")}
                    onBrowse={() => handleBrowseForRole("secondary")}
                    onRemove={() => removeDataSource("secondary")}
                    onSelectJoinKeys={(keys) =>
                      updateDataSource("secondary", { joinKeys: keys })
                    }
                    suggestedJoinKeys={suggestedJoinKeys}
                    isRequired={false}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 3: Join Configuration */}
          {sources.length > 1 && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  3
                </span>
                <h3 className="text-lg font-semibold text-db-gray-800">
                  Configure how data sources are joined
                </h3>
              </div>

              <JoinConfig
                sources={sources}
                mappings={mappings}
                onUpdateMappings={setJoinKeyMappings}
              />
            </div>
          )}
        </div>
      </div>

      {/* UC Browser Modal */}
      <BrowserModal
        isOpen={browserModal.isOpen}
        onClose={() => setBrowserModal({ ...browserModal, isOpen: false })}
        onSelect={handleSourceSelected}
        title={browserModal.title}
        filter={
          browserModal.role === "images" ? ["table", "volume"] : ["table"]
        }
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("browse");

  const handleSelectSheet = (sheet: Sheet) => {
    // Navigate to sheet detail view or open in modal
    // For now, just show a toast
    console.log("Selected sheet:", sheet);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-db-gray-50">
      {/* Stage Sub-Navigation */}
      <StageSubNav
        stage="data"
        mode={viewMode}
        onModeChange={(mode) => setViewMode(mode as ViewMode)}
      />

      {/* Content */}
      {viewMode === "browse" ? (
        <BrowseMode
          onCreateNew={() => setViewMode("create")}
          onSelectSheet={handleSelectSheet}
        />
      ) : (
        <CreateMode
          onCancel={() => setViewMode("browse")}
          onComplete={() => setViewMode("browse")}
        />
      )}
    </div>
  );
}
