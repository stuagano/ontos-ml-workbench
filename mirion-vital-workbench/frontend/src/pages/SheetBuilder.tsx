/**
 * SheetBuilder - Dataset builder for importing UC table data
 *
 * Core concept: A spreadsheet where columns are imported from Unity Catalog.
 * Following the GCP Vertex AI pattern:
 * - Sheet = Dataset (raw imported data)
 * - TemplateConfig = Attached to sheet (defines prompt template)
 * - AssembledDataset = Materialized prompt/response pairs
 *
 * Flow:
 * 1. Select base table (defines row structure)
 * 2. Import columns from base or other tables
 * 3. Continue to Template Builder to attach a TemplateConfig
 * 4. Assemble the dataset to create prompt/response pairs
 * 5. Label/verify in CuratePage
 * 6. Export for fine-tuning
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Table2,
  Plus,
  Download,
  Loader2,
  X,
  Settings2,
  Trash2,
  ArrowRight,
  Wand2,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Edit,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { UCBrowser, type UCItem } from "../components/UCBrowser";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { StageSubNav, StageMode } from "../components/StageSubNav";
import {
  createSheet,
  getSheet,
  listSheets,
  getSheetPreview,
  addColumn,
  deleteColumn,
  exportSheet,
  previewTable,
  listTemplates,
  getTemplate,
  attachTemplateToSheet,
  assembleSheet,
} from "../services/api";
import { useToast } from "../components/Toast";
import { useWorkflow } from "../context/WorkflowContext";
import { useModules } from "../hooks/useModules";
import { ColumnMappingModal, extractPlaceholders } from "../components/ColumnMappingModal";
import { DataQualityPanel } from "../components/DataQualityPanel";
import type {
  Sheet,
  SheetPreview,
  ColumnDefinition,
  ImportConfig,
  TemplateConfigAttachRequest,
} from "../types";

// ============================================================================
// Types
// ============================================================================

interface BaseTableConfig {
  catalog: string;
  schema: string;
  table: string;
  columns: { name: string; type: string }[];
  rowCount: number;
}

type BuilderStep = "build-sheet" | "no-sheet" | "preview-data";

// ============================================================================
// Sheet Browser Modal - Unified browse existing + create new
// ============================================================================

interface SheetBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExisting: (sheetId: string) => void;
  onCreateFromTable: (config: BaseTableConfig) => void;
}

function SheetBrowserModal({
  isOpen,
  onClose,
  onSelectExisting,
  onCreateFromTable,
}: SheetBrowserModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      listSheets({ limit: 50 })
        .then((result) => {
          setSheets(result.sheets);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load sheets");
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleTableSelect = async (item: UCItem) => {
    if (item.type !== "table") return;

    try {
      // Get table preview to extract columns
      const preview = await previewTable(
        item.catalogName!,
        item.schemaName!,
        item.name,
        1,
      );

      const columns: { name: string; type: string }[] = [];
      if (preview.rows.length > 0) {
        Object.keys(preview.rows[0]).forEach((key) => {
          columns.push({ name: key, type: "string" });
        });
      }

      onCreateFromTable({
        catalog: item.catalogName!,
        schema: item.schemaName!,
        table: item.name,
        columns,
        rowCount: preview.count,
      });
      onClose();
    } catch (err) {
      toast.error(
        "Failed to load table",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  const filteredSheets = sheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-db-gray-800 flex items-center gap-2">
              <Table2 className="w-6 h-6 text-blue-600" />
              Select or Create Dataset
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-db-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-db-gray-200">
            <button
              onClick={() => setActiveTab("browse")}
              className={clsx(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                activeTab === "browse"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700",
              )}
            >
              Your Sheets
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={clsx(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                activeTab === "create"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700",
              )}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Create from Table
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "browse" && (
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sheets..."
                className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              ) : filteredSheets.length > 0 ? (
                <div className="space-y-2">
                  {filteredSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSelectExisting(sheet.id);
                        onClose();
                      }}
                      className="w-full p-4 text-left bg-white border border-db-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="font-medium text-db-gray-800">
                        {sheet.name}
                      </div>
                      {sheet.description && (
                        <div className="text-sm text-db-gray-500 mt-0.5">
                          {sheet.description}
                        </div>
                      )}
                      <div className="text-xs text-db-gray-400 mt-1">
                        {((sheet.text_columns?.length || 0) + (sheet.image_columns?.length || 0) + (sheet.metadata_columns?.length || 0))} columns · {sheet.status}
                        {sheet.updated_at &&
                          ` · ${new Date(sheet.updated_at).toLocaleDateString()}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-db-gray-500">
                  <Table2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No sheets found</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Create your first sheet →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div>
              <p className="text-sm text-db-gray-500 mb-4">
                Browse Unity Catalog and select a table to create a new AI Sheet.
                Each row in the table becomes a row in your sheet.
              </p>
              <div className="bg-white border border-db-gray-200 rounded-lg overflow-hidden">
                <UCBrowser onSelect={handleTableSelect} filter={["table"]} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Column Header Component
// ============================================================================

interface ColumnHeaderProps {
  column: ColumnDefinition;
  onEdit: () => void;
  onDelete: () => void;
}

function ColumnHeader({ column, onEdit, onDelete }: ColumnHeaderProps) {
  return (
    <div className="px-3 py-2 border-b-2 min-w-[150px] bg-db-gray-50 border-db-gray-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-4 h-4 text-db-gray-400 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{column.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-white rounded"
            title="Edit column"
          >
            <Settings2 className="w-3.5 h-3.5 text-db-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-white rounded"
            title="Delete column"
          >
            <Trash2 className="w-3.5 h-3.5 text-db-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
      <div className="text-xs text-db-gray-400 mt-0.5">
        {column.import_config?.table || "Imported"}
      </div>
    </div>
  );
}

// ============================================================================
// Cell Component (read-only display)
// ============================================================================

interface CellProps {
  value: unknown;
}

function Cell({ value }: CellProps) {
  const displayValue =
    value === null || value === undefined ? "" : String(value);

  return (
    <td className="border border-db-gray-200 px-2 py-1.5 text-sm">
      <span className="truncate">{displayValue}</span>
    </td>
  );
}

// ============================================================================
// Add Column Modal (Import Only)
// ============================================================================

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseTable: BaseTableConfig;
  existingColumns: ColumnDefinition[];
  onAddImported: (config: ImportConfig, name: string) => void;
}

function AddColumnModal({
  isOpen,
  onClose,
  baseTable,
  existingColumns,
  onAddImported,
}: AddColumnModalProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [columnName, setColumnName] = useState("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [importSource, setImportSource] = useState<{
    catalog: string;
    schema: string;
    table: string;
    column: string;
  } | null>(null);

  // Available columns from base table that aren't already imported
  const availableBaseColumns = baseTable.columns.filter(
    (col) =>
      !existingColumns.some(
        (ec) =>
          ec.import_config?.table === baseTable.table &&
          ec.import_config?.column === col.name,
      ),
  );

  const handleAddImported = () => {
    if (importSource) {
      const name = columnName || importSource.column;
      onAddImported(importSource, name);
      handleClose();
    } else if (selectedColumn) {
      const name = columnName || selectedColumn;
      onAddImported(
        {
          catalog: baseTable.catalog,
          schema: baseTable.schema,
          table: baseTable.table,
          column: selectedColumn,
        },
        name,
      );
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedColumn("");
    setColumnName("");
    setImportSource(null);
    setShowBrowser(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Column</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-db-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!showBrowser && (
            <div className="space-y-4">
              {/* Quick import from base table */}
              {availableBaseColumns.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-db-gray-700 mb-2">
                    From Base Table ({baseTable.table})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableBaseColumns.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => setSelectedColumn(col.name)}
                        className={clsx(
                          "px-3 py-2 text-sm rounded border text-left",
                          selectedColumn === col.name
                            ? "border-blue-500 bg-blue-50"
                            : "border-db-gray-200 hover:border-blue-300",
                        )}
                      >
                        <div className="font-medium truncate">{col.name}</div>
                        <div className="text-xs text-db-gray-400">
                          {col.type}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableBaseColumns.length === 0 && (
                <div className="text-center py-4 text-db-gray-500">
                  All columns from the base table have been imported.
                </div>
              )}

              {/* Or browse other tables */}
              <div className="pt-4 border-t border-db-gray-200">
                <button
                  onClick={() => setShowBrowser(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Browse other tables →
                </button>
              </div>

              {/* Column name override */}
              {selectedColumn && (
                <div>
                  <label className="block text-sm font-medium text-db-gray-700 mb-1">
                    Column Name (optional)
                  </label>
                  <input
                    type="text"
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value)}
                    placeholder={selectedColumn}
                    className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-db-gray-400 mt-1">
                    Leave blank to use the original column name
                  </p>
                </div>
              )}
            </div>
          )}

          {showBrowser && (
            <div>
              <button
                onClick={() => setShowBrowser(false)}
                className="text-sm text-db-gray-500 hover:text-db-gray-700 mb-4"
              >
                ← Back to base table columns
              </button>
              <UCBrowser
                onSelect={(item) => {
                  if (item.type === "table") {
                    setImportSource({
                      catalog: item.catalogName!,
                      schema: item.schemaName!,
                      table: item.name,
                      column: "", // Will need to be selected
                    });
                  }
                }}
                filter={["table"]}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-db-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          {(selectedColumn || importSource) && (
            <button
              onClick={handleAddImported}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Sheet Builder Component
// ============================================================================

interface SheetBuilderProps {
  mode?: "browse" | "create";
  onModeChange?: (mode: "browse" | "create") => void;
}

export function SheetBuilder({ mode = "browse", onModeChange }: SheetBuilderProps) {
  const workflow = useWorkflow();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeModule, isOpen: isModuleOpen, closeModule } = useModules({ stage: "data" });

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  // (React requires hooks to be called in the same order every render)
  const [stageMode, setStageMode] = useState<StageMode>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [baseTable, setBaseTable] = useState<BaseTableConfig | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [ucTablePreview, setUcTablePreview] = useState<{ rows: Record<string, unknown>[]; count: number } | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isSheetBrowserOpen, setIsSheetBrowserOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Column mapping for template reusability
  const [isColumnMappingOpen, setIsColumnMappingOpen] = useState(false);
  // Using ref for synchronous access (React state updates are async)
  const pendingColumnMappingRef = useRef<Record<string, string> | null>(null);
  const [templateForMapping, setTemplateForMapping] = useState<{
    id: string;
    name: string;
    promptTemplate: string;
    targetColumn?: string | null;
    featureColumns?: string[] | null;
  } | null>(null);

  // Fetch sheets for browse mode
  const { data: sheetsData, isLoading: isSheetsLoading, error: sheetsError } = useQuery({
    queryKey: ["sheets", searchQuery],
    queryFn: () => listSheets({ limit: 100 }),
    enabled: stageMode === "browse",
    retry: 2,
  });

  // Derive step from workflow state - if we have a selected source (sheet), go to build-sheet
  const getInitialStep = (): BuilderStep => {
    if (workflow.state.selectedSource) {
      return "build-sheet";
    }
    return "no-sheet";
  };

  const [step, setStep] = useState<BuilderStep>(getInitialStep);

  // Fetch templates for preview mode
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates({ page_size: 100 }),
    enabled: step === "preview-data",
  });

  // Sync step with workflow state when navigating via breadcrumbs
  useEffect(() => {
    if (workflow.state.selectedSource && step === "no-sheet") {
      // If we have a selected source but showing no-sheet, restore to build-sheet
      setStep("build-sheet");
    }
  }, [workflow.state.selectedSource, step]);

  // Restore sheet from workflow context when navigating back via breadcrumbs
  useEffect(() => {
    const selectedSource = workflow.state.selectedSource;
    if (
      selectedSource &&
      selectedSource.id &&
      !sheet &&
      step === "build-sheet"
    ) {
      // We have a selected source in context but no sheet loaded - reload it
      setIsLoadingSheet(true);
      getSheet(selectedSource.id)
        .then((loadedSheet) => {
          setSheet(loadedSheet);
        })
        .catch((err) => {
          console.error("Failed to restore sheet:", err);
          // Clear the workflow state if we can't load the sheet
          workflow.setSelectedSource(null);
          setStep("no-sheet");
        })
        .finally(() => {
          setIsLoadingSheet(false);
        });
    }
  }, [workflow.state.selectedSource, sheet, step]);

  // Load preview when sheet changes
  useEffect(() => {
    const totalCols = (sheet?.text_columns?.length || 0) + (sheet?.image_columns?.length || 0) + (sheet?.metadata_columns?.length || 0);
    if (sheet?.id && totalCols > 0) {
      getSheetPreview(sheet.id, 50)
        .then(setPreview)
        .catch((err) => console.error("Failed to load preview:", err));
    }
  }, [sheet?.id, sheet?.text_columns?.length, sheet?.image_columns?.length, sheet?.metadata_columns?.length]);

  // Load an existing sheet by ID (moved up before it's used in render)
  const handleSelectExisting = async (sheetId: string) => {
    setIsLoadingSheet(true);
    try {
      const loadedSheet = await getSheet(sheetId);
      setSheet(loadedSheet);

      // Load preview of source table if available
      if (loadedSheet.source_table) {
        const [catalog, schema, table] = loadedSheet.source_table.split('.');
        if (catalog && schema && table) {
          const previewData = await previewTable(catalog, schema, table, 50);
          setUcTablePreview(previewData);
        }
      }

      setStep("preview-data");
      // Don't change stageMode - keep it as "browse" so we can navigate back

      // Save to workflow context so breadcrumb navigation works
      workflow.setSelectedSource({
        id: loadedSheet.id,
        name: loadedSheet.name,
        type: "table",
        fullPath: loadedSheet.source_table || loadedSheet.name,
      } as UCItem);

      toast.success("Dataset loaded", `Opened "${loadedSheet.name}"`);
    } catch (err) {
      toast.error(
        "Failed to load dataset",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Generate training data from dataset + template
  const handleGenerateTrainingData = async () => {
    if (!sheet || !selectedTemplate) {
      toast.error("Missing required fields", "Please select a template");
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Fetch the full template details
      const template = await getTemplate(selectedTemplate);

      // Step 1.5: Column mapping is ALWAYS an explicit step
      // (No "smart" detection - always show modal to prevent silent failures)
      const placeholders = extractPlaceholders(template.prompt_template || "");
      const hasMLConfig = template.target_column || (template.feature_columns && template.feature_columns.length > 0);
      const hasVariablesToMap = hasMLConfig || placeholders.length > 0;

      // Use ref for synchronous access (state updates are async)
      const currentMapping = pendingColumnMappingRef.current;

      // ALWAYS show mapping modal if user hasn't confirmed mapping yet
      // This is an explicit interim step - no auto-detection that could silently fail
      if (hasVariablesToMap && !currentMapping) {
        // Open mapping modal and wait for user to explicitly confirm mapping
        setTemplateForMapping({
          id: template.id,
          name: template.name,
          promptTemplate: template.prompt_template || "",
          targetColumn: template.target_column,
          featureColumns: template.feature_columns,
        });
        setIsColumnMappingOpen(true);
        setIsGenerating(false);
        return; // Exit and wait for mapping confirmation
      }

      // Step 2: Attach the template configuration to the sheet
      const attachRequest: TemplateConfigAttachRequest = {
        prompt_template: template.prompt_template || "",
        system_instruction: template.system_prompt,
        model: template.base_model,
        temperature: template.temperature,
        max_tokens: template.max_tokens,
        label_type: template.label_type,
        name: template.name,
        description: template.description,
        // Include column mapping if we have one
        column_mapping: currentMapping || undefined,
      };

      await attachTemplateToSheet(sheet.id, attachRequest);

      // Step 3: Assemble the sheet (generate Q&A pairs)
      const assembleResponse = await assembleSheet(sheet.id, {
        name: `${sheet.name} - ${template.name}`,
        description: `Training data generated from ${sheet.name} using ${template.name} template`,
      });

      // Store the training sheet ID in workflow context so Training Data stage can load it
      workflow.setSelectedAssemblyId(assembleResponse.training_sheet_id);

      toast.success(
        "Training data generated!",
        `Created ${assembleResponse.total_items} Q&A pairs. Moving to Training Data stage...`
      );

      // Auto-advance to LABEL stage to review the generated Q&A pairs
      setTimeout(() => {
        workflow.setCurrentStage("label");
      }, 1500);
    } catch (err) {
      toast.error(
        "Generation failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsGenerating(false);
      // Clear the pending mapping after generation attempt
      pendingColumnMappingRef.current = null;
    }
  };

  // Handle column mapping confirmation from modal
  const handleColumnMappingConfirm = (mapping: Record<string, string>) => {
    // Update ref for synchronous access
    pendingColumnMappingRef.current = mapping;
    setIsColumnMappingOpen(false);
    // Trigger generation again with the mapping (ref is already updated)
    setTimeout(() => {
      handleGenerateTrainingData();
    }, 50);
  };

  // Clear pending mapping when template selection changes
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId || null);
    // Reset mapping for new template
    pendingColumnMappingRef.current = null;
  };

  // Create sheet when base table is selected (moved up before any early returns)
  const handleBaseTableSelect = async (config: BaseTableConfig) => {
    setBaseTable(config);

    try {
      // Get table preview to learn column names
      const tablePreview = await previewTable(
        config.catalog,
        config.schema,
        config.table,
        1,
      );

      // Analyze columns from preview
      const columnNames: string[] = [];
      if (tablePreview.rows && tablePreview.rows.length > 0) {
        const sampleRow = tablePreview.rows[0];
        columnNames.push(...Object.keys(sampleRow));
      }

      // Create sheet with PRD v2.3 model (lightweight pointer to UC table)
      const sourceTable = `${config.catalog}.${config.schema}.${config.table}`;
      const newSheet = await createSheet({
        name: `${config.table}`,
        description: `Dataset from ${sourceTable}`,
        source_type: "uc_table",
        source_table: sourceTable,
        text_columns: columnNames, // All columns as text by default
        item_id_column: columnNames[0], // Use first column as ID
      });

      setSheet(newSheet);
      setStep("build-sheet");

      // Save to workflow context so breadcrumb navigation works
      workflow.setSelectedSource({
        id: newSheet.id,
        name: newSheet.name,
        type: "table",
        fullPath: sourceTable,
        catalogName: config.catalog,
        schemaName: config.schema,
      } as UCItem);

      toast.success(
        "Dataset created!",
        `Connected to ${sourceTable} with ${columnNames.length} columns.`,
      );

      // Don't auto-advance yet - user needs to preview data and configure template
      // They'll click "Generate Training Data" when ready
    } catch (err) {
      toast.error(
        "Failed to create sheet",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  // Handle table selection from UCBrowser (browse mode)
  const handleBrowseTableSelect = (item: UCItem) => {
    if (item.type !== "table") return;

    // When selecting a table from browse mode, switch to create mode and start sheet creation
    if (onModeChange) {
      onModeChange("create");
    }

    // Create a base table config and trigger sheet creation
    previewTable(item.catalogName!, item.schemaName!, item.name, 1)
      .then((previewResult) => {
        const columns: { name: string; type: string }[] = [];
        if (previewResult.rows.length > 0) {
          Object.keys(previewResult.rows[0]).forEach((key) => {
            columns.push({ name: key, type: "string" });
          });
        }

        handleBaseTableSelect({
          catalog: item.catalogName!,
          schema: item.schemaName!,
          table: item.name,
          columns,
          rowCount: previewResult.count,
        });
      })
      .catch((err) => {
        toast.error("Failed to load table", err instanceof Error ? err.message : "Unknown error");
      });
  };

  // PREVIEW-DATA STEP: Show data preview when a dataset is selected (takes precedence over stageMode)
  if (step === "preview-data" && sheet) {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-db-gray-900 flex items-center gap-3">
                  <Table2 className="w-6 h-6 text-blue-600" />
                  {sheet.name}
                </h1>
                <p className="text-db-gray-600 mt-1">
                  {sheet.source_table || "Dataset"}
                </p>
              </div>
              <button
                onClick={() => {
                  setSheet(null);
                  setUcTablePreview(null);
                  setStep("no-sheet");
                  setStageMode("browse");
                }}
                className="text-sm text-db-gray-500 hover:text-db-gray-700"
              >
                ← Back to datasets
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Data Preview Section */}
            <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-db-gray-200">
                <h2 className="text-lg font-semibold text-db-gray-900">Data Preview</h2>
                <p className="text-sm text-db-gray-600 mt-1">
                  First 50 rows from your dataset
                </p>
              </div>

              {isLoadingSheet ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : ucTablePreview && ucTablePreview.rows.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-db-gray-50 border-b border-db-gray-200">
                      <tr>
                        {Object.keys(ucTablePreview.rows[0]).map((col: string) => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-medium text-db-gray-600 uppercase">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-db-gray-200">
                      {ucTablePreview.rows.slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-db-gray-50">
                          {Object.values(row).map((val: any, colIdx: number) => (
                            <td key={colIdx} className="px-4 py-3 text-sm text-db-gray-900">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-db-gray-50 border-t border-db-gray-200 text-sm text-db-gray-500">
                    Showing 10 of {ucTablePreview.count?.toLocaleString() || "?"} rows
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-db-gray-500">
                  No preview available
                </div>
              )}
            </div>

            {/* Template Selection Section */}
            <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-db-gray-900">Select Prompt Template</h2>
                <button
                  onClick={() => {
                    // Infer column schema from the preview data
                    const columns: Array<{ name: string; type: string }> = [];

                    if (ucTablePreview && ucTablePreview.rows.length > 0) {
                      const firstRow = ucTablePreview.rows[0];
                      Object.entries(firstRow).forEach(([colName, value]) => {
                        // Infer type from the value
                        let type = "string";
                        if (typeof value === "number") {
                          type = Number.isInteger(value) ? "int" : "double";
                        } else if (typeof value === "boolean") {
                          type = "boolean";
                        } else if (Array.isArray(value)) {
                          type = "array";
                        } else if (value !== null && typeof value === "object") {
                          type = "struct";
                        }
                        columns.push({ name: colName, type });
                      });
                    }

                    // Dispatch custom event with dataset context
                    const event = new CustomEvent("createTemplateWithContext", {
                      detail: {
                        columns,
                        sheetName: sheet?.name || "Dataset",
                      },
                    });
                    window.dispatchEvent(event);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                  title="Create a new prompt template with inferred schema"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              </div>
              <p className="text-sm text-db-gray-600 mb-4">
                Choose a prompt template to transform your data into training Q&A pairs
              </p>

              <select
                value={selectedTemplate || ""}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {(templatesData?.templates || []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>

              {templatesData?.templates.length === 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium mb-2">No templates found</p>
                  <p className="text-sm text-orange-700">
                    Create your first template using <kbd className="px-2 py-1 bg-orange-100 rounded text-xs font-mono">Alt+N</kbd> keyboard shortcut.
                  </p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-db-gray-900 mb-1">Ready to generate?</h3>
                  <p className="text-sm text-db-gray-600">
                    This will create Training Data (Q&A pairs) from your dataset using the selected template
                  </p>
                </div>
                <button
                  onClick={handleGenerateTrainingData}
                  disabled={!selectedTemplate || isGenerating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-db-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2 font-medium whitespace-nowrap"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Generate Training Data
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column Mapping Modal - must be inside this return for preview-data step */}
        {sheet && templateForMapping && (
          <ColumnMappingModal
            isOpen={isColumnMappingOpen}
            onClose={() => {
              setIsColumnMappingOpen(false);
              setTemplateForMapping(null);
            }}
            onConfirm={handleColumnMappingConfirm}
            templateName={templateForMapping.name}
            promptTemplate={templateForMapping.promptTemplate}
            targetColumn={templateForMapping.targetColumn}
            featureColumns={templateForMapping.featureColumns}
            sheetColumns={[
              ...(sheet.text_columns || []).map((name) => ({
                name,
                type: "string",
                category: "text" as const,
              })),
              ...(sheet.image_columns || []).map((name) => ({
                name,
                type: "image",
                category: "image" as const,
              })),
              ...(sheet.metadata_columns || []).map((name) => ({
                name,
                type: "string",
                category: "metadata" as const,
              })),
            ]}
          />
        )}
      </div>
    );
  }

  // BROWSE MODE: Show table of existing sheets with StageSubNav
  if (stageMode === "browse") {
    const sheets = sheetsData?.sheets || [];
    const filteredSheets = sheets.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Define table columns for sheets
    const columns: Column<Sheet>[] = [
      {
        key: "name",
        header: "Sheet Name",
        width: "40%",
        render: (sheet) => (
          <div className="flex items-center gap-3">
            <Table2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-db-gray-900">{sheet.name}</div>
              {sheet.description && (
                <div className="text-sm text-db-gray-500 truncate">
                  {sheet.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "columns",
        header: "Columns",
        width: "15%",
        render: (sheet) => {
          const totalCols = (sheet.text_columns?.length || 0) +
                           (sheet.image_columns?.length || 0) +
                           (sheet.metadata_columns?.length || 0);
          return (
            <span className="text-sm text-db-gray-600">
              {totalCols} columns
            </span>
          );
        },
      },
      {
        key: "row_count",
        header: "Rows",
        width: "15%",
        render: (sheet) => (
          <span className="text-sm text-db-gray-600">
            {sheet.item_count?.toLocaleString() || "N/A"}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Last Updated",
        width: "20%",
        render: (sheet) => (
          <span className="text-sm text-db-gray-500">
            {sheet.updated_at
              ? new Date(sheet.updated_at).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
    ];

    // Define row actions
    const rowActions: RowAction<Sheet>[] = [
      {
        label: "Open",
        icon: Edit,
        onClick: (sheet) => handleSelectExisting(sheet.id),
        className: "text-blue-600",
      },
      {
        label: "Delete",
        icon: Trash2,
        onClick: (sheet) => {
          if (confirm(`Delete sheet "${sheet.name}"?`)) {
            // TODO: Implement delete
            toast.info("Delete", "Delete functionality coming soon");
          }
        },
        className: "text-red-600",
      },
    ];

    const emptyState = (
      <div className="text-center py-20 bg-white rounded-lg">
        <Table2 className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-db-gray-700 mb-2">
          No sheets found
        </h3>
        <p className="text-db-gray-500 mb-6">
          {searchQuery
            ? "Try adjusting your search"
            : "Create your first AI Dataset from a Unity Catalog table"}
        </p>
        <button
          onClick={() => setStageMode("create")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Dataset
        </button>
      </div>
    );

    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-db-gray-900">AI Sheets</h1>
                <p className="text-db-gray-600 mt-1">
                  Manage datasets imported from Unity Catalog tables
                </p>
              </div>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["sheets"] })}
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
          stage="data"
          mode={stageMode}
          onModeChange={setStageMode}
          browseCount={sheets.length}
        />

        {/* Search */}
        {stageMode === "browse" && (
          <div className="px-6 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
                <Filter className="w-4 h-4 text-db-gray-400" />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sheets by name..."
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
        )}

        {/* Table */}
        <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {isSheetsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sheetsError ? (
              <div className="text-center py-20 bg-white rounded-lg border border-red-200">
                <div className="text-red-500 text-5xl mb-4">!</div>
                <h3 className="text-lg font-medium text-db-gray-700 mb-2">
                  Failed to load sheets
                </h3>
                <p className="text-db-gray-500 mb-6 max-w-md mx-auto">
                  {sheetsError instanceof Error ? sheetsError.message : "Unable to connect to the database. Please check your connection and try again."}
                </p>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["sheets"] })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : (
              <DataTable
                data={filteredSheets}
                columns={columns}
                rowKey={(sheet) => sheet.id}
                onRowClick={(sheet) => handleSelectExisting(sheet.id)}
                rowActions={rowActions}
                emptyState={emptyState}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // CREATE MODE: Show UCBrowser to select table
  if (stageMode === "create") {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-db-gray-900">Create AI Dataset</h1>
            <p className="text-db-gray-600 mt-1">
              Select a Unity Catalog table to import as a new dataset
            </p>
          </div>
        </div>

        {/* Stage Sub-Navigation */}
        <StageSubNav
          stage="data"
          mode={stageMode}
          onModeChange={setStageMode}
          browseCount={sheetsData?.sheets.length}
        />

        {/* UCBrowser - full page */}
        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          <div className="max-w-7xl mx-auto h-full">
            <div className="h-full bg-white rounded-xl border border-db-gray-200 shadow-sm overflow-hidden">
              <UCBrowser
                onSelect={handleBrowseTableSelect}
                filter={["table", "volume"]}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CREATE MODE: Show the sheet creation/editing flow continues below...

  // Add imported column
  const handleAddImported = async (config: ImportConfig, name: string) => {
    if (!sheet) return;

    try {
      const updatedSheet = await addColumn(sheet.id, {
        name,
        data_type: "string",
        source_type: "imported",
        import_config: config,
      });
      setSheet(updatedSheet);
      toast.success("Column added", `"${name}" has been added to your sheet.`);
    } catch (err) {
      toast.error(
        "Failed to add column",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  // Delete column
  const handleDeleteColumn = async (columnId: string) => {
    if (!sheet) return;

    try {
      const updatedSheet = await deleteColumn(sheet.id, columnId);
      setSheet(updatedSheet);
      toast.success("Column removed");
    } catch (err) {
      toast.error(
        "Failed to remove column",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  // Export sheet to Delta table
  const handleExport = async () => {
    if (!sheet || !baseTable) return;

    try {
      const result = await exportSheet(sheet.id, {
        catalog: baseTable.catalog,
        schema: baseTable.schema,
        table: `${sheet.name.replace(/\s+/g, "_").toLowerCase()}_export`,
      });
      toast.success(
        "Export complete",
        `Exported ${result.rows_exported} rows to ${result.destination}`,
      );
    } catch (error) {
      toast.error(
        "Export failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // Render no-sheet state (show button to open browser modal) - only in create mode
  if (step === "no-sheet" && stageMode !== "browse") {
    if (isLoadingSheet) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-db-gray-400" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full bg-db-gray-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Table2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-db-gray-800 mb-2">
            AI Sheets
          </h2>
          <p className="text-db-gray-500 mb-6">
            Browse your existing sheets or create a new one from a Unity Catalog
            table.
          </p>
          <button
            onClick={() => setIsSheetBrowserOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 font-medium"
          >
            <Database className="w-5 h-5" />
            Browse & Create Datasets
          </button>
        </div>
      </div>
    );
  }

  // Render sheet builder (full editor - accessed via different route)
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-db-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSheetBrowserOpen(true)}
            className="text-db-gray-400 hover:text-db-gray-600 flex items-center gap-2"
            title="Switch sheet"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm">Switch</span>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-db-gray-800">
              {sheet?.name || "AI Sheet"}
            </h1>
            <p className="text-sm text-db-gray-500">
              {sheet?.columns?.length || 0} columns · {preview?.rows.length || 0}{" "}
              rows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddColumnOpen(true)}
            className="px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Column
          </button>

          {/* Template status indicator */}
          {sheet?.has_template && (
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              Template attached
            </div>
          )}

          {baseTable && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Delta
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Data Quality Panel (inline) */}
        {sheet && ((sheet.text_columns?.length || 0) + (sheet.image_columns?.length || 0) + (sheet.metadata_columns?.length || 0)) > 0 && (
          <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm overflow-hidden">
            <DataQualityPanel sheetId={sheet.id} sheetName={sheet.name} />
          </div>
        )}

        {sheet?.columns?.length === 0 ? (
          /* Empty state */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-db-gray-100 mb-4">
                <Table2 className="w-8 h-8 text-db-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-db-gray-800 mb-2">
                No columns yet
              </h3>
              <p className="text-db-gray-500 mb-4">
                Start by importing columns from your base table or other Unity
                Catalog tables.
              </p>
              <button
                onClick={() => setIsAddColumnOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Column
              </button>
            </div>
          </div>
        ) : (
          /* Spreadsheet view */
          <div className="bg-white rounded-lg border border-db-gray-200 overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-db-gray-100 px-3 py-2 border-b-2 border-db-gray-300 text-left text-xs font-medium text-db-gray-500 w-12">
                    #
                  </th>
                  {sheet?.columns?.map((col) => (
                    <th key={col.id} className="p-0">
                      <ColumnHeader
                        column={col}
                        onEdit={() => {
                          /* TODO: Edit column */
                        }}
                        onDelete={() => handleDeleteColumn(col.id)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview?.rows.map((row) => (
                  <tr key={row.row_index} className="hover:bg-db-gray-50">
                    <td className="px-3 py-1.5 text-xs text-db-gray-400 border border-db-gray-200 bg-db-gray-50">
                      {row.row_index + 1}
                    </td>
                    {sheet?.columns?.map((col) => {
                      const cell = row.cells[col.id];
                      return <Cell key={col.id} value={cell?.value} />;
                    })}
                  </tr>
                ))}

                {/* Show message if no preview data */}
                {(!preview || preview.rows.length === 0) && (
                  <tr>
                    <td
                      colSpan={(sheet?.columns?.length || 0) + 1}
                      className="px-4 py-8 text-center text-db-gray-500"
                    >
                      No data to preview. Add imported columns to see data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Row count footer */}
            {preview && preview.total_rows > 0 && (
              <div className="px-4 py-2 border-t border-db-gray-200 bg-db-gray-50 text-sm text-db-gray-500">
                Showing {preview.preview_rows} of {preview.total_rows} rows
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Column Modal */}
      {baseTable && sheet && (
        <AddColumnModal
          isOpen={isAddColumnOpen}
          onClose={() => setIsAddColumnOpen(false)}
          baseTable={baseTable}
          existingColumns={[]}
          onAddImported={handleAddImported}
        />
      )}

      {/* Bottom Action Bar - Continue to Template */}
      {sheet && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-db-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Table2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-db-gray-800">
                    Data Selected: {sheet.name}
                  </p>
                  <p className="text-sm text-db-gray-500">
                    {((sheet.text_columns?.length || 0) + (sheet.image_columns?.length || 0) + (sheet.metadata_columns?.length || 0))} columns · {preview?.total_rows || 0}{" "}
                    rows ready
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  workflow.setCurrentStage("label");
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 flex items-center gap-3 font-semibold text-lg shadow-md hover:shadow-lg transition-all"
              >
                <Wand2 className="w-5 h-5" />
                Continue to Template Builder
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Browser Modal */}
      <SheetBrowserModal
        isOpen={isSheetBrowserOpen}
        onClose={() => setIsSheetBrowserOpen(false)}
        onSelectExisting={handleSelectExisting}
        onCreateFromTable={handleBaseTableSelect}
      />

      {/* Module Modal */}
      {isModuleOpen && activeModule && sheet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-db-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeModule.icon && (
                  <div className="p-2 bg-green-100 rounded-lg">
                    <activeModule.icon className="w-5 h-5 text-green-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">{activeModule.name}</h2>
                  <p className="text-sm text-db-gray-500">{activeModule.description}</p>
                </div>
              </div>
              <button
                onClick={() => closeModule()}
                className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <activeModule.component
                context={{
                  stage: "data" as const,
                  sheetId: sheet.id,
                  sheetName: sheet.name,
                }}
                onClose={closeModule}
                displayMode="modal"
              />
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Modal for template reusability */}
      {sheet && templateForMapping && (
        <ColumnMappingModal
          isOpen={isColumnMappingOpen}
          onClose={() => {
            setIsColumnMappingOpen(false);
            setTemplateForMapping(null);
          }}
          onConfirm={handleColumnMappingConfirm}
          templateName={templateForMapping.name}
          promptTemplate={templateForMapping.promptTemplate}
          targetColumn={templateForMapping.targetColumn}
          featureColumns={templateForMapping.featureColumns}
          sheetColumns={[
            ...(sheet.text_columns || []).map((name) => ({
              name,
              type: "string",
              category: "text" as const,
            })),
            ...(sheet.image_columns || []).map((name) => ({
              name,
              type: "image",
              category: "image" as const,
            })),
            ...(sheet.metadata_columns || []).map((name) => ({
              name,
              type: "string",
              category: "metadata" as const,
            })),
          ]}
        />
      )}
    </div>
  );
}

export default SheetBuilder;
