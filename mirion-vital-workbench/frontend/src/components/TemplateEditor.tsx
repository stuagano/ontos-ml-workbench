/**
 * TemplateEditor - Full editor for creating/editing Databits (prompt templates)
 *
 * Features:
 * - Input/output schema builder
 * - Prompt template editor with variable interpolation
 * - Few-shot examples manager
 * - Model selection and configuration
 * - Source data linking
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  AlertCircle,
  Loader2,
  GripVertical,
  Code,
  FileText,
  Settings,
  Database,
  Lightbulb,
  Download,
  Table2,
} from "lucide-react";
import { clsx } from "clsx";

import { createTemplate, updateTemplate } from "../services/api";
import { useToast } from "./Toast";
import { useWorkflow } from "../context/WorkflowContext";
import type { Template, SchemaField, Example } from "../types";

// Available FMAPI models
const AVAILABLE_MODELS = [
  {
    id: "databricks-meta-llama-3-1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    provider: "Meta",
  },
  {
    id: "databricks-meta-llama-3-1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    provider: "Meta",
  },
  {
    id: "databricks-meta-llama-3-3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
  },
  {
    id: "databricks-dbrx-instruct",
    name: "DBRX Instruct",
    provider: "Databricks",
  },
  {
    id: "databricks-mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    provider: "Mistral",
  },
];

const FIELD_TYPES = ["string", "number", "boolean", "array", "object"];

interface TemplateEditorProps {
  template: Template | null;
  onClose: () => void;
  onSaved: (template: Template) => void;
}

type EditorTab = "schema" | "prompt" | "examples" | "settings";

interface FormState {
  name: string;
  description: string;
  input_schema: SchemaField[];
  output_schema: SchemaField[];
  prompt_template: string;
  system_prompt: string;
  examples: Example[];
  base_model: string;
  temperature: number;
  max_tokens: number;
  source_catalog: string;
  source_schema: string;
  source_table: string;
  source_volume: string;
}

// Helper to extract variables from prompt template
function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
}

// Map Unity Catalog types to schema field types
function mapUCTypeToSchemaType(ucType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    int: "number",
    integer: "number",
    long: "number",
    bigint: "number",
    float: "number",
    double: "number",
    decimal: "number",
    boolean: "boolean",
    array: "array",
    struct: "object",
    map: "object",
  };

  const lowerType = ucType.toLowerCase();
  // Handle parameterized types like "decimal(10,2)" or "array<string>"
  const baseType = lowerType.split(/[<(]/)[0].trim();
  return typeMap[baseType] || "string";
}

export function TemplateEditor({
  template,
  onClose,
  onSaved,
}: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { state: workflowState, getAllSourceColumns } = useWorkflow();
  const [activeTab, setActiveTab] = useState<EditorTab>("schema");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!template;
  const allSourceColumns = getAllSourceColumns();
  const hasSourceColumns = allSourceColumns.length > 0;

  // Get data source info for display
  const getSourceDescription = () => {
    if (workflowState.datasetConfig?.sources.length) {
      const sources = workflowState.datasetConfig.sources;
      if (sources.length === 1) {
        return sources[0].source.fullPath;
      }
      return `${sources.length} data sources (${sources.map((s) => s.alias || s.role).join(", ")})`;
    }
    return workflowState.selectedSource?.fullPath || "configured sources";
  };

  // Form state
  const [form, setForm] = useState<FormState>({
    name: template?.name || "",
    description: template?.description || "",
    input_schema: template?.input_schema || [],
    output_schema: template?.output_schema || [],
    prompt_template:
      template?.prompt_template ||
      "Given the following input:\n{{input}}\n\nProvide the output as JSON.",
    system_prompt:
      template?.system_prompt ||
      "You are a helpful assistant that follows instructions precisely.",
    examples: template?.examples || [],
    base_model:
      template?.base_model || "databricks-meta-llama-3-1-70b-instruct",
    temperature: template?.temperature ?? 0.7,
    max_tokens: template?.max_tokens ?? 1024,
    source_catalog: template?.source_catalog || "",
    source_schema: template?.source_schema || "",
    source_table: template?.source_table || "",
    source_volume: template?.source_volume || "",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Template>) => createTemplate(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Databit created", `"${newTemplate.name}" is ready to use`);
      onSaved(newTemplate);
    },
    onError: (error) => {
      toast.error("Failed to create Databit", error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Template>) => updateTemplate(template!.id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(
        "Changes saved",
        `"${updatedTemplate.name}" has been updated`,
      );
      onSaved(updatedTemplate);
    },
    onError: (error) => {
      toast.error("Failed to save changes", error.message);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (form.input_schema.some((f) => !f.name.trim())) {
      newErrors.input_schema = "All input fields must have names";
    }

    if (form.output_schema.some((f) => !f.name.trim())) {
      newErrors.output_schema = "All output fields must have names";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validate()) return;

    const data: Partial<Template> = {
      name: form.name,
      description: form.description || undefined,
      input_schema:
        form.input_schema.length > 0 ? form.input_schema : undefined,
      output_schema:
        form.output_schema.length > 0 ? form.output_schema : undefined,
      prompt_template: form.prompt_template || undefined,
      system_prompt: form.system_prompt || undefined,
      examples: form.examples.length > 0 ? form.examples : undefined,
      base_model: form.base_model,
      temperature: form.temperature,
      max_tokens: form.max_tokens,
      source_catalog: form.source_catalog || undefined,
      source_schema: form.source_schema || undefined,
      source_table: form.source_table || undefined,
      source_volume: form.source_volume || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Schema field management
  const addSchemaField = (type: "input" | "output") => {
    const key = type === "input" ? "input_schema" : "output_schema";
    setForm({
      ...form,
      [key]: [
        ...form[key],
        { name: "", type: "string", description: "", required: true },
      ],
    });
  };

  const updateSchemaField = (
    type: "input" | "output",
    index: number,
    field: Partial<SchemaField>,
  ) => {
    const key = type === "input" ? "input_schema" : "output_schema";
    const updated = [...form[key]];
    updated[index] = { ...updated[index], ...field };
    setForm({ ...form, [key]: updated });
  };

  const removeSchemaField = (type: "input" | "output", index: number) => {
    const key = type === "input" ? "input_schema" : "output_schema";
    setForm({ ...form, [key]: form[key].filter((_, i) => i !== index) });
  };

  // Example management
  const addExample = () => {
    setForm({
      ...form,
      examples: [...form.examples, { input: {}, output: {}, explanation: "" }],
    });
  };

  const updateExample = (index: number, example: Partial<Example>) => {
    const updated = [...form.examples];
    updated[index] = { ...updated[index], ...example };
    setForm({ ...form, examples: updated });
  };

  const removeExample = (index: number) => {
    setForm({ ...form, examples: form.examples.filter((_, i) => i !== index) });
  };

  // Tab content renderers
  // Import columns from source table(s)
  const importFromSource = () => {
    if (!hasSourceColumns) return;

    const newFields: SchemaField[] = allSourceColumns.map((col) => ({
      name: col.name,
      type: mapUCTypeToSchemaType(col.type),
      description: col.comment || `From source: ${col.type}`,
      required: true,
    }));

    setForm((prev) => ({
      ...prev,
      input_schema: newFields,
    }));

    toast.success(
      "Schema imported",
      `${newFields.length} fields imported from ${getSourceDescription()}`,
    );
  };

  const renderSchemaTab = () => (
    <div className="space-y-6">
      {/* Import from Source Banner */}
      {hasSourceColumns && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Table2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-800">
                  {workflowState.datasetConfig?.sources.length
                    ? `${workflowState.datasetConfig.sources.length} data source${workflowState.datasetConfig.sources.length > 1 ? "s" : ""} configured`
                    : "Source table columns available"}
                </p>
                <p className="text-sm text-blue-600">
                  {allSourceColumns.length} columns from{" "}
                  <span className="font-mono">{getSourceDescription()}</span>
                </p>
              </div>
            </div>
            <button
              onClick={importFromSource}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Import as Input Schema
            </button>
          </div>
        </div>
      )}

      {/* Input Schema */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-db-gray-800">Input Schema</h3>
          <div className="flex items-center gap-2">
            {hasSourceColumns && form.input_schema.length > 0 && (
              <button
                onClick={importFromSource}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                title="Replace current fields with source columns"
              >
                <Download className="w-4 h-4" /> Re-import
              </button>
            )}
            <button
              onClick={() => addSchemaField("input")}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>
        </div>
        {errors.input_schema && (
          <p className="text-red-500 text-sm mb-2">{errors.input_schema}</p>
        )}
        <div className="space-y-2">
          {form.input_schema.length === 0 ? (
            <p className="text-sm text-db-gray-400 italic">
              No input fields defined
              {hasSourceColumns &&
                ' - click "Import as Input Schema" above to get started'}
            </p>
          ) : (
            form.input_schema.map((field, index) => (
              <SchemaFieldRow
                key={index}
                field={field}
                onChange={(f) => updateSchemaField("input", index, f)}
                onRemove={() => removeSchemaField("input", index)}
              />
            ))
          )}
        </div>
      </div>

      {/* Output Schema */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-db-gray-800">Output Schema</h3>
          <button
            onClick={() => addSchemaField("output")}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
        {errors.output_schema && (
          <p className="text-red-500 text-sm mb-2">{errors.output_schema}</p>
        )}
        <div className="space-y-2">
          {form.output_schema.length === 0 ? (
            <p className="text-sm text-db-gray-400 italic">
              No output fields defined
            </p>
          ) : (
            form.output_schema.map((field, index) => (
              <SchemaFieldRow
                key={index}
                field={field}
                onChange={(f) => updateSchemaField("output", index, f)}
                onRemove={() => removeSchemaField("output", index)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderPromptTab = () => {
    const variables = extractVariables(form.prompt_template);

    return (
      <div className="space-y-6">
        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            value={form.system_prompt}
            onChange={(e) =>
              setForm({ ...form, system_prompt: e.target.value })
            }
            className="w-full h-24 px-3 py-2 border border-db-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Define the assistant's behavior and constraints..."
          />
        </div>

        {/* Prompt Template */}
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-2">
            Prompt Template
          </label>
          <p className="text-xs text-db-gray-500 mb-2">
            Use {"{{variable}}"} syntax to define placeholders that will be
            filled with input data.
          </p>
          <textarea
            value={form.prompt_template}
            onChange={(e) =>
              setForm({ ...form, prompt_template: e.target.value })
            }
            className="w-full h-48 px-3 py-2 border border-db-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter your prompt template..."
          />
        </div>

        {/* Extracted Variables */}
        {variables.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-800 mb-2">
              Detected Variables
            </h4>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <span
                  key={v}
                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-mono"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExamplesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-db-gray-800">Few-Shot Examples</h3>
          <p className="text-sm text-db-gray-500">
            Add examples to guide the model's responses
          </p>
        </div>
        <button
          onClick={addExample}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Example
        </button>
      </div>

      {form.examples.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-db-gray-200 rounded-lg">
          <Lightbulb className="w-8 h-8 text-db-gray-300 mx-auto mb-2" />
          <p className="text-sm text-db-gray-500">No examples yet</p>
          <button
            onClick={addExample}
            className="mt-2 text-sm text-purple-600 hover:text-purple-700"
          >
            Add your first example
          </button>
        </div>
      ) : (
        form.examples.map((example, index) => (
          <ExampleCard
            key={index}
            example={example}
            index={index}
            inputSchema={form.input_schema}
            outputSchema={form.output_schema}
            onChange={(e) => updateExample(index, e)}
            onRemove={() => removeExample(index)}
          />
        ))
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-2">
          Base Model
        </label>
        <select
          value={form.base_model}
          onChange={(e) => setForm({ ...form, base_model: e.target.value })}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-2">
          Temperature: {form.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={form.temperature}
          onChange={(e) =>
            setForm({ ...form, temperature: parseFloat(e.target.value) })
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-db-gray-400 mt-1">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          min="1"
          max="32000"
          value={form.max_tokens}
          onChange={(e) =>
            setForm({ ...form, max_tokens: parseInt(e.target.value) || 1024 })
          }
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Source Data */}
      <div className="border-t border-db-gray-200 pt-6">
        <h3 className="font-medium text-db-gray-800 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Source Data (Optional)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-db-gray-500 mb-1">
              Catalog
            </label>
            <input
              type="text"
              value={form.source_catalog}
              onChange={(e) =>
                setForm({ ...form, source_catalog: e.target.value })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="my_catalog"
            />
          </div>
          <div>
            <label className="block text-xs text-db-gray-500 mb-1">
              Schema
            </label>
            <input
              type="text"
              value={form.source_schema}
              onChange={(e) =>
                setForm({ ...form, source_schema: e.target.value })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="my_schema"
            />
          </div>
          <div>
            <label className="block text-xs text-db-gray-500 mb-1">Table</label>
            <input
              type="text"
              value={form.source_table}
              onChange={(e) =>
                setForm({ ...form, source_table: e.target.value })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="source_table"
            />
          </div>
          <div>
            <label className="block text-xs text-db-gray-500 mb-1">
              Volume
            </label>
            <input
              type="text"
              value={form.source_volume}
              onChange={(e) =>
                setForm({ ...form, source_volume: e.target.value })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="source_volume"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: "schema", label: "Schema", icon: <Code className="w-4 h-4" /> },
    { id: "prompt", label: "Prompt", icon: <FileText className="w-4 h-4" /> },
    {
      id: "examples",
      label: "Examples",
      icon: <Lightbulb className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-db-gray-900">
              {isEditing ? "Edit Databit" : "Create New Databit"}
            </h2>
            {template && (
              <p className="text-sm text-db-gray-500">
                v{template.version} • {template.status}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-db-gray-400 hover:text-db-gray-600 rounded-lg hover:bg-db-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name and Description */}
        <div className="px-6 py-4 border-b border-db-gray-100 space-y-3">
          <div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={clsx(
                "w-full text-lg font-medium px-0 py-1 border-0 border-b-2 focus:outline-none",
                errors.name
                  ? "border-red-300"
                  : "border-transparent focus:border-purple-500",
              )}
              placeholder="Databit Name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full text-sm text-db-gray-600 px-0 py-1 border-0 resize-none focus:outline-none"
            placeholder="Add a description..."
            rows={2}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-db-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-db-gray-500 hover:text-db-gray-700",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "schema" && renderSchemaTab()}
          {activeTab === "prompt" && renderPromptTab()}
          {activeTab === "examples" && renderExamplesTab()}
          {activeTab === "settings" && renderSettingsTab()}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? "Save Changes" : "Create Databit"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Schema Field Row Component
interface SchemaFieldRowProps {
  field: SchemaField;
  onChange: (field: Partial<SchemaField>) => void;
  onRemove: () => void;
}

function SchemaFieldRow({ field, onChange, onRemove }: SchemaFieldRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-db-gray-50 rounded-lg group">
      <GripVertical className="w-4 h-4 text-db-gray-300 cursor-grab" />
      <input
        type="text"
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="flex-1 px-2 py-1 text-sm border border-db-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
        placeholder="Field name"
      />
      <select
        value={field.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className="px-2 py-1 text-sm border border-db-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={field.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        className="flex-1 px-2 py-1 text-sm border border-db-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
        placeholder="Description"
      />
      <label className="flex items-center gap-1 text-xs text-db-gray-500">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="rounded border-db-gray-300"
        />
        Req
      </label>
      <button
        onClick={onRemove}
        className="p-1 text-db-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Example Card Component
interface ExampleCardProps {
  example: Example;
  index: number;
  inputSchema: SchemaField[];
  outputSchema: SchemaField[];
  onChange: (example: Partial<Example>) => void;
  onRemove: () => void;
}

function ExampleCard({
  example,
  index,
  inputSchema,
  outputSchema,
  onChange,
  onRemove,
}: ExampleCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-db-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-db-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="font-medium text-sm">Example {index + 1}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-db-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Input */}
          <div>
            <label className="block text-xs font-medium text-db-gray-500 mb-2">
              Input (JSON)
            </label>
            <textarea
              value={JSON.stringify(example.input, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange({ input: parsed });
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full h-24 px-3 py-2 font-mono text-xs border border-db-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="{}"
            />
          </div>

          {/* Output */}
          <div>
            <label className="block text-xs font-medium text-db-gray-500 mb-2">
              Output (JSON)
            </label>
            <textarea
              value={JSON.stringify(example.output, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange({ output: parsed });
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full h-24 px-3 py-2 font-mono text-xs border border-db-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="{}"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-medium text-db-gray-500 mb-2">
              Explanation (Optional)
            </label>
            <input
              type="text"
              value={example.explanation || ""}
              onChange={(e) => onChange({ explanation: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-db-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Why this output is correct..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
