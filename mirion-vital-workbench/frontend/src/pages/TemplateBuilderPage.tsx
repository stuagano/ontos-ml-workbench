/**
 * TemplateBuilderPage - Build and attach prompt templates to sheets
 *
 * Following the GCP Vertex AI pattern:
 * - Sheet = Dataset (raw imported data)
 * - TemplateConfig = Attached to sheet (defines prompt template)
 * - AssembledDataset = Materialized prompt/response pairs
 *
 * This page allows users to:
 * 1. See available columns from their selected sheet
 * 2. Build a prompt template using {{column_name}} syntax
 * 3. Select the response column (for expected outputs)
 * 4. Attach the template config to the sheet
 * 5. Assemble the dataset to create prompt/response pairs
 */

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Play,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Database,
  Wand2,
  Layers,
  X,
  CheckCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { useWorkflow } from "../context/WorkflowContext";
import { useToast } from "../components/Toast";
import {
  getSheet,
  getSheetPreview,
  attachTemplateToSheet,
  assembleSheet,
  getAssembly,
  listSheets,
} from "../services/api";
import type {
  Sheet,
  SheetPreview,
  SourceColumn,
  TemplateConfigAttachRequest,
  ResponseSchemaField,
} from "../types";

// ============================================================================
// Types
// ============================================================================

interface OutputField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
}

type ResponseSourceMode =
  | "existing_column"
  | "ai_generated"
  | "manual_labeling";

interface LocalTemplateConfig {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  responseSourceMode: ResponseSourceMode; // How to get the response
  responseColumn?: string; // Column to use as expected response (for existing_column mode)
  outputFields: OutputField[];
  model: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// Column Pill Component
// ============================================================================

interface ColumnPillProps {
  column: SourceColumn;
  onClick: () => void;
}

function ColumnPill({ column, onClick }: ColumnPillProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm font-mono transition-colors"
      title={`Type: ${column.type}${column.comment ? `\n${column.comment}` : ""}`}
    >
      <Database className="w-3 h-3" />
      {column.name}
    </button>
  );
}

// ============================================================================
// Output Field Editor
// ============================================================================

interface OutputFieldEditorProps {
  field: OutputField;
  onChange: (field: OutputField) => void;
  onDelete: () => void;
}

function OutputFieldEditor({
  field,
  onChange,
  onDelete,
}: OutputFieldEditorProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Field Name
          </label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => onChange({ ...field, name: e.target.value })}
            placeholder="field_name"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Type
          </label>
          <select
            value={field.type}
            onChange={(e) =>
              onChange({
                ...field,
                type: e.target.value as OutputField["type"],
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Description
          </label>
          <input
            type="text"
            value={field.description}
            onChange={(e) =>
              onChange({ ...field, description: e.target.value })
            }
            placeholder="What this field represents..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 pt-5">
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          Required
        </label>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Template Browser Modal - Unified browse existing + create new
// ============================================================================

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSheet: (sheetId: string) => void;
}

function TemplateBrowserModal({
  isOpen,
  onClose,
  onSelectSheet,
}: TemplateBrowserModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      listSheets({ page_size: 50 })
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

  const filteredSheets = sheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sheets with templates (for browsing)
  const sheetsWithTemplates = filteredSheets.filter((s) => s.has_template);

  // Sheets without templates (for creating new template)
  const sheetsWithoutTemplates = filteredSheets.filter((s) => !s.has_template);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-db-gray-800 flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-600" />
              Select or Create Template
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
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700",
              )}
            >
              Your Templates ({sheetsWithTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={clsx(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                activeTab === "create"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700",
              )}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Create New ({sheetsWithoutTemplates.length} available sheets)
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
                placeholder="Search templates..."
                className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              ) : sheetsWithTemplates.length > 0 ? (
                <div className="space-y-2">
                  {sheetsWithTemplates.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSelectSheet(sheet.id);
                        onClose();
                      }}
                      className="w-full p-4 text-left bg-white border border-db-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-db-gray-800">
                            {sheet.template_config?.name || sheet.name}
                          </div>
                          {sheet.template_config?.description && (
                            <div className="text-sm text-db-gray-500 mt-0.5">
                              {sheet.template_config.description}
                            </div>
                          )}
                          <div className="text-xs text-db-gray-400 mt-1">
                            Sheet: {sheet.name} · {sheet.columns.length} columns
                            {sheet.updated_at &&
                              ` · ${new Date(sheet.updated_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-db-gray-500">
                  <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No templates found</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Create your first template →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4">
              <p className="text-sm text-db-gray-500">
                Select a sheet to attach a template. Only sheets without templates
                are shown.
              </p>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sheets..."
                className="w-full px-4 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : sheetsWithoutTemplates.length > 0 ? (
                <div className="space-y-2">
                  {sheetsWithoutTemplates.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSelectSheet(sheet.id);
                        onClose();
                      }}
                      className="w-full p-4 text-left bg-white border border-db-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
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
                        {sheet.columns.length} columns · {sheet.status}
                        {sheet.updated_at &&
                          ` · ${new Date(sheet.updated_at).toLocaleDateString()}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-db-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>All sheets already have templates</p>
                  <p className="text-sm mt-2">
                    Create a new sheet in the DATA stage to add more templates.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Preview Panel
// ============================================================================

interface PreviewPanelProps {
  template: LocalTemplateConfig;
  sampleRow: Record<string, unknown> | null;
  columns: SourceColumn[];
}

function PreviewPanel({ template, sampleRow, columns }: PreviewPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Render the prompt with sample data
  const renderPrompt = (promptTemplate: string): string => {
    if (!sampleRow) return promptTemplate;

    let rendered = promptTemplate;
    columns.forEach((col) => {
      const value = sampleRow[col.name];
      const placeholder = `{{${col.name}}}`;
      rendered = rendered.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        String(value ?? ""),
      );
    });
    return rendered;
  };

  const renderedPrompt = renderPrompt(template.userPromptTemplate);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-700 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Live Preview
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* System Prompt */}
          {template.systemPrompt && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                System Prompt
              </div>
              <div className="p-3 bg-gray-900 text-gray-100 rounded text-sm font-mono whitespace-pre-wrap">
                {template.systemPrompt}
              </div>
            </div>
          )}

          {/* User Prompt */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              User Prompt {sampleRow ? "(with sample data)" : "(template)"}
            </div>
            <div className="p-3 bg-blue-900 text-blue-100 rounded text-sm font-mono whitespace-pre-wrap">
              {renderedPrompt || (
                <span className="text-blue-400 italic">
                  Enter a prompt template above...
                </span>
              )}
            </div>
          </div>

          {/* Expected Output */}
          {template.outputFields.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Expected Output Schema
              </div>
              <div className="p-3 bg-purple-900 text-purple-100 rounded text-sm font-mono">
                {`{\n${template.outputFields.map((f) => `  "${f.name}": <${f.type}>${f.required ? "" : "?"}`).join(",\n")}\n}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface TemplateBuilderPageProps {
  onCancel?: () => void;
}

export function TemplateBuilderPage({ onCancel }: TemplateBuilderPageProps) {
  console.log("[TemplateBuilderPage] Component rendering");
  const workflow = useWorkflow();
  const toast = useToast();

  console.log("[TemplateBuilderPage] workflow.state:", workflow.state);
  console.log(
    "[TemplateBuilderPage] selectedSource:",
    workflow.state.selectedSource,
  );

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [columns, setColumns] = useState<SourceColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState<{ current: number; total: number } | null>(null);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);

  const [config, setConfig] = useState<LocalTemplateConfig>({
    name: "",
    description: "",
    systemPrompt:
      "You are an expert assistant helping with data analysis and classification.",
    userPromptTemplate: "",
    responseSourceMode: "existing_column", // Default to using existing labels
    responseColumn: "", // Will be set from columns
    outputFields: [],
    model: "databricks-meta-llama-3-1-70b-instruct",
    temperature: 0.7,
    maxTokens: 1024,
  });

  // Handle sheet selection from modal or workflow context
  const handleSelectSheet = async (sheetId: string) => {
    setIsLoading(true);
    try {
      const [loadedSheet, loadedPreview] = await Promise.all([
        getSheet(sheetId),
        getSheetPreview(sheetId, 5),
      ]);

      setSheet(loadedSheet);
      setPreview(loadedPreview);

      // Extract columns from sheet
      const cols: SourceColumn[] = loadedSheet.columns.map((c) => ({
        name: c.name,
        type: c.data_type,
        comment: c.import_config?.table,
      }));
      setColumns(cols);

      // If sheet already has a template attached, load it
      if (loadedSheet.template_config) {
        const tc = loadedSheet.template_config;
        setConfig((prev) => ({
          ...prev,
          name: tc.name || `Template for ${loadedSheet.name}`,
          description: tc.description || "",
          systemPrompt: tc.system_instruction || prev.systemPrompt,
          userPromptTemplate: tc.prompt_template,
          responseSourceMode: tc.response_source_mode || "existing_column",
          responseColumn: tc.response_column,
          model: tc.model,
          temperature: tc.temperature,
          maxTokens: tc.max_tokens,
          outputFields: (tc.response_schema || []).map((f) => ({
            id: crypto.randomUUID(),
            name: f.name,
            type: f.type,
            description: f.description || "",
            required: f.required ?? true,
          })),
        }));
      } else {
        // Pre-populate template name
        setConfig((prev) => ({
          ...prev,
          name: `Template for ${loadedSheet.name}`,
          responseSourceMode: "existing_column",
          // Default response column to last column if available
          responseColumn: cols.length > 0 ? cols[cols.length - 1].name : "",
        }));
      }

      // Update workflow context
      workflow.setSelectedSource({
        id: loadedSheet.id,
        name: loadedSheet.name,
        type: "table",
        fullPath: loadedSheet.name,
      });
    } catch (err) {
      console.error("Failed to load sheet:", err);
      toast.error(
        "Failed to load data",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load sheet and columns from workflow context
  useEffect(() => {
    const selectedSource = workflow.state.selectedSource;
    if (!selectedSource || !selectedSource.id) {
      setIsLoading(false);
      return;
    }

    const sheetId = selectedSource.id;
    handleSelectSheet(sheetId);
  }, []);

  // Insert column reference into prompt
  const insertColumn = (columnName: string) => {
    setConfig((prev) => ({
      ...prev,
      userPromptTemplate: prev.userPromptTemplate + `{{${columnName}}}`,
    }));
  };

  // Add output field
  const addOutputField = () => {
    const newField: OutputField = {
      id: crypto.randomUUID(),
      name: "",
      type: "string",
      description: "",
      required: true,
    };
    setConfig((prev) => ({
      ...prev,
      outputFields: [...prev.outputFields, newField],
    }));
  };

  // Update output field
  const updateOutputField = (index: number, field: OutputField) => {
    setConfig((prev) => ({
      ...prev,
      outputFields: prev.outputFields.map((f, i) => (i === index ? field : f)),
    }));
  };

  // Delete output field
  const deleteOutputField = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      outputFields: prev.outputFields.filter((_, i) => i !== index),
    }));
  };

  // Save template (attach to sheet)
  const handleSave = async () => {
    if (!sheet) return;

    // Validate based on response source mode
    if (!config.userPromptTemplate) {
      toast.error(
        "Missing required fields",
        "Please provide a prompt template",
      );
      return;
    }

    if (
      config.responseSourceMode === "existing_column" &&
      !config.responseColumn
    ) {
      toast.error(
        "Missing response column",
        "Please select a column containing the expected responses",
      );
      return;
    }

    setIsSaving(true);
    try {
      // Build response schema from output fields
      const responseSchema: ResponseSchemaField[] = config.outputFields.map(
        (f) => ({
          name: f.name,
          type: f.type,
          description: f.description || undefined,
          required: f.required,
        }),
      );

      // Build the attach request
      const attachRequest: TemplateConfigAttachRequest = {
        system_instruction: config.systemPrompt || undefined,
        prompt_template: config.userPromptTemplate,
        response_source_mode: config.responseSourceMode,
        response_column:
          config.responseSourceMode === "existing_column"
            ? config.responseColumn
            : undefined,
        response_schema: responseSchema.length > 0 ? responseSchema : undefined,
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        name: config.name || undefined,
        description: config.description || undefined,
      };

      // Attach template to sheet
      const updatedSheet = await attachTemplateToSheet(sheet.id, attachRequest);
      setSheet(updatedSheet);

      toast.success(
        "Template attached!",
        `Template "${config.name}" is now attached to the sheet`,
      );
    } catch (err) {
      toast.error(
        "Failed to attach template",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Assemble the dataset and continue to curation
  const handleAssembleAndContinue = async () => {
    if (!sheet || !sheet.has_template) {
      toast.error("No template attached", "Please save a template first");
      return;
    }

    setIsAssembling(true);
    setAssemblyProgress(null);
    try {
      // Start assembly
      const result = await assembleSheet(sheet.id, {});
      const assemblyId = result.assembly_id;

      // Poll for progress until complete
      let assembly = await getAssembly(assemblyId);
      while (assembly.status === "assembling") {
        // Update progress state
        const progress = assembly.ai_generated_count || 0;
        const total = assembly.total_rows || 0;
        setAssemblyProgress({ current: progress, total });
        console.log(`Assembly progress: ${progress}/${total} rows`);

        // Wait 500ms before next poll
        await new Promise(resolve => setTimeout(resolve, 500));
        assembly = await getAssembly(assemblyId);
      }

      toast.success(
        "Dataset assembled!",
        `Created ${assembly.total_rows} prompt/response pairs`,
      );

      // Store assembly ID in workflow context for CuratePage
      workflow.setSelectedTemplate({
        id: assemblyId,
        name: config.name,
        description: config.description,
        system_prompt: config.systemPrompt,
        input_template: config.userPromptTemplate,
        output_schema: JSON.stringify(config.outputFields),
      });

      // Navigate to curate stage
      workflow.setCurrentStage("curate");
    } catch (err) {
      toast.error(
        "Failed to assemble dataset",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsAssembling(false);
      setAssemblyProgress(null);
    }
  };

  // Get sample row for preview
  const sampleRow = preview?.rows[0]?.cells
    ? Object.fromEntries(
        Object.entries(preview.rows[0].cells).map(([colId, cell]) => {
          const col = sheet?.columns.find((c) => c.id === colId);
          return [col?.name || colId, cell.value];
        }),
      )
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // No sheet selected - show button to open browser modal
  if (!sheet) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
            <Wand2 className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-semibold text-db-gray-800 mb-2">
            Prompt Templates
          </h2>
          <p className="text-db-gray-500 mb-6">
            Browse your existing templates or create a new one by attaching a
            template to a sheet.
          </p>
          <button
            onClick={() => setIsTemplateBrowserOpen(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2 font-medium"
          >
            <Wand2 className="w-5 h-5" />
            Browse & Create Templates
          </button>
        </div>

        {/* Template Browser Modal */}
        <TemplateBrowserModal
          isOpen={isTemplateBrowserOpen}
          onClose={() => setIsTemplateBrowserOpen(false)}
          onSelectSheet={handleSelectSheet}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTemplateBrowserOpen(true)}
              className="text-db-gray-400 hover:text-db-gray-600 flex items-center gap-2"
              title="Switch template"
            >
              <Wand2 className="w-4 h-4" />
              <span className="text-sm">Switch</span>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                {config.name || sheet?.name || "Prompt Template"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Sheet: {sheet?.name} · {sheet?.columns.length || 0} columns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={
                isSaving || !config.userPromptTemplate || !config.responseColumn
              }
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Template
            </button>
            <button
              onClick={handleAssembleAndContinue}
              disabled={isAssembling || !sheet?.has_template}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssembling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {assemblyProgress ? (
                    <span>Assembling {assemblyProgress.current}/{assemblyProgress.total}...</span>
                  ) : (
                    <span>Assembling...</span>
                  )}
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Assemble & Continue
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Template Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Template Info
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Defect Classification"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={config.model}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, model: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="databricks-meta-llama-3-1-70b-instruct">
                    Llama 3.1 70B
                  </option>
                  <option value="databricks-meta-llama-3-1-405b-instruct">
                    Llama 3.1 405B
                  </option>
                  <option value="databricks-dbrx-instruct">DBRX</option>
                  <option value="databricks-mixtral-8x7b-instruct">
                    Mixtral 8x7B
                  </option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={config.description}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What does this template do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Available Columns */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-2">
              Available Columns
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Click a column to insert it into your prompt template as{" "}
              {"{{column_name}}"}
            </p>
            <div className="flex flex-wrap gap-2">
              {columns.length > 0 ? (
                columns.map((col) => (
                  <ColumnPill
                    key={col.name}
                    column={col}
                    onClick={() => insertColumn(col.name)}
                  />
                ))
              ) : (
                <p className="text-gray-400 italic">No columns available</p>
              )}
            </div>
          </div>

          {/* Response Source Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-2">
              Response Configuration *
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              How should the response (label/output) be determined for each row?
            </p>

            {/* Response Source Mode Selection */}
            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="responseSourceMode"
                  value="existing_column"
                  checked={config.responseSourceMode === "existing_column"}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      responseSourceMode: "existing_column",
                    }))
                  }
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Use existing column (pre-labeled data)
                  </div>
                  <div className="text-sm text-gray-500">
                    Your data already has labels. Select the column containing
                    the expected responses to create a training dataset.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="responseSourceMode"
                  value="ai_generated"
                  checked={config.responseSourceMode === "ai_generated"}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      responseSourceMode: "ai_generated",
                    }))
                  }
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Generate with AI (auto-labeling)
                  </div>
                  <div className="text-sm text-gray-500">
                    AI will suggest labels for each row. Review and correct
                    suggestions in the Curate stage before training.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="responseSourceMode"
                  value="manual_labeling"
                  checked={config.responseSourceMode === "manual_labeling"}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      responseSourceMode: "manual_labeling",
                    }))
                  }
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Manual labeling (human-in-the-loop)
                  </div>
                  <div className="text-sm text-gray-500">
                    Leave responses blank for human annotators to fill in during
                    the Curate stage.
                  </div>
                </div>
              </label>
            </div>

            {/* Column selector - only shown for existing_column mode */}
            {config.responseSourceMode === "existing_column" && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Select label column
                </label>
                <select
                  value={config.responseColumn}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      responseColumn: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select a column...</option>
                  {columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  ))}
                </select>
                {config.responseColumn && (
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ The "{config.responseColumn}" column will be used as the
                    expected response for training.
                  </p>
                )}
              </div>
            )}

            {/* AI generation info */}
            {config.responseSourceMode === "ai_generated" && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>AI-assisted labeling:</strong> When you assemble, the
                  model will generate suggested labels for each row. You can
                  review, edit, and approve these in the Curate stage before
                  using them for training.
                </p>
              </div>
            )}

            {/* Manual labeling info */}
            {config.responseSourceMode === "manual_labeling" && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Manual labeling:</strong> Assembled rows will have
                  empty responses. Human annotators will provide labels in the
                  Curate stage.
                </p>
              </div>
            )}
          </div>

          {/* Prompt Template */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Prompt Template
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Prompt
                </label>
                <textarea
                  value={config.systemPrompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="You are an expert..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Prompt Template *
                </label>
                <textarea
                  value={config.userPromptTemplate}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      userPromptTemplate: e.target.value,
                    }))
                  }
                  placeholder="Analyze the following data and classify the defect type:

Equipment ID: {{equipment_id}}
Sensor Reading: {{sensor_value}}
Timestamp: {{timestamp}}

Provide your classification and reasoning."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use {"{{column_name}}"} syntax to reference data columns
                </p>
              </div>
            </div>
          </div>

          {/* Output Schema */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-800">
                  Output Schema
                </h2>
                <p className="text-sm text-gray-500">
                  Define the structure of AI-generated responses
                </p>
              </div>
              <button
                onClick={addOutputField}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>

            <div className="space-y-3">
              {config.outputFields.length > 0 ? (
                config.outputFields.map((field, index) => (
                  <OutputFieldEditor
                    key={field.id}
                    field={field}
                    onChange={(f) => updateOutputField(index, f)}
                    onDelete={() => deleteOutputField(index)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No output fields defined</p>
                  <p className="text-sm">
                    Add fields to structure the AI response
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <PreviewPanel
            template={config}
            sampleRow={sampleRow}
            columns={columns}
          />

          {/* Model Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Model Settings
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {config.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value) || 1024,
                    }))
                  }
                  min={1}
                  max={4096}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Browser Modal */}
      <TemplateBrowserModal
        isOpen={isTemplateBrowserOpen}
        onClose={() => setIsTemplateBrowserOpen(false)}
        onSelectSheet={handleSelectSheet}
      />
    </div>
  );
}

export default TemplateBuilderPage;
