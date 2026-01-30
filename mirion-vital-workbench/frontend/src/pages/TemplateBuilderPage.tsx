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
  AlertCircle,
  Database,
  Wand2,
  Layers,
} from "lucide-react";
import { useWorkflow } from "../context/WorkflowContext";
import { useToast } from "../components/Toast";
import {
  getSheet,
  getSheetPreview,
  attachTemplateToSheet,
  assembleSheet,
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

export function TemplateBuilderPage() {
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

  // Load sheet and columns from workflow context
  useEffect(() => {
    const selectedSource = workflow.state.selectedSource;
    if (!selectedSource || !selectedSource.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const sheetId = selectedSource.id;

    Promise.all([getSheet(sheetId), getSheetPreview(sheetId, 5)])
      .then(([loadedSheet, loadedPreview]) => {
        setSheet(loadedSheet);
        setPreview(loadedPreview);

        // Extract columns from sheet (all columns are now imported)
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
      })
      .catch((err) => {
        console.error("Failed to load sheet:", err);
        toast.error("Failed to load data", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [workflow.state.selectedSource]);

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
    try {
      const result = await assembleSheet(sheet.id, {});

      toast.success(
        "Dataset assembled!",
        `Created ${result.total_rows} prompt/response pairs`,
      );

      // Store assembly ID in workflow context for CuratePage
      workflow.setSelectedTemplate({
        id: result.assembly_id,
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

  // No data selected
  if (!workflow.state.selectedSource) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            No Data Selected
          </h2>
          <p className="text-gray-500 mb-4">
            Please select a dataset in the DATA stage first before building a
            template.
          </p>
          <button
            onClick={() => workflow.setCurrentStage("data")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to DATA Stage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              Build Prompt Template
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create a template to transform your data using AI
            </p>
          </div>
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
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            Assemble & Continue
          </button>
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
    </div>
  );
}

export default TemplateBuilderPage;
