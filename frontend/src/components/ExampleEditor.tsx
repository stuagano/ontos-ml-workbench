/**
 * ExampleEditor - Modal for creating and editing few-shot examples
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Save, AlertCircle, Sparkles } from "lucide-react";
import { clsx } from "clsx";

import { createExample, updateExample } from "../services/api";
import { useToast } from "./Toast";
import type {
  ExampleRecord,
  ExampleCreateRequest,
  ExampleUpdateRequest,
  ExampleDomain,
  ExampleDifficulty,
  ExampleSource,
} from "../types";
import { EXAMPLE_DOMAINS, EXAMPLE_DIFFICULTIES } from "../types";

const SOURCE_OPTIONS: { id: ExampleSource; label: string }[] = [
  { id: "human_authored", label: "Human Authored" },
  { id: "synthetic", label: "Synthetic" },
  { id: "production_captured", label: "Production Captured" },
  { id: "feedback_derived", label: "Feedback Derived" },
];

interface ExampleEditorProps {
  example: ExampleRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ExampleEditor({ example, onClose, onSaved }: ExampleEditorProps) {
  const toast = useToast();
  const isEditing = !!example;

  // Form state
  const [inputJson, setInputJson] = useState("{}");
  const [outputJson, setOutputJson] = useState("{}");
  const [explanation, setExplanation] = useState("");
  const [domain, setDomain] = useState<ExampleDomain>("general");
  const [difficulty, setDifficulty] = useState<ExampleDifficulty>("medium");
  const [functionName, setFunctionName] = useState("");
  const [capabilityTags, setCapabilityTags] = useState("");
  const [searchKeys, setSearchKeys] = useState("");
  const [source, setSource] = useState<ExampleSource>("human_authored");
  const [attributionNotes, setAttributionNotes] = useState("");
  const [generateEmbedding, setGenerateEmbedding] = useState(true);

  // Validation state
  const [inputError, setInputError] = useState("");
  const [outputError, setOutputError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (example) {
      setInputJson(JSON.stringify(example.input, null, 2));
      setOutputJson(JSON.stringify(example.expected_output, null, 2));
      setExplanation(example.explanation || "");
      setDomain((example.domain as ExampleDomain) || "general");
      setDifficulty(example.difficulty || "medium");
      setFunctionName(example.function_name || "");
      setCapabilityTags(example.capability_tags?.join(", ") || "");
      setSearchKeys(example.search_keys?.join(", ") || "");
      setSource((example.source as ExampleSource) || "human_authored");
      setAttributionNotes(example.attribution_notes || "");
    }
  }, [example]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ExampleCreateRequest) =>
      createExample(data, generateEmbedding),
    onSuccess: onSaved,
    onError: (error) => toast.error("Failed to create example", error.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: ExampleUpdateRequest) =>
      updateExample(example!.example_id, data),
    onSuccess: onSaved,
    onError: (error) => toast.error("Failed to update example", error.message),
  });

  const validateJson = (json: string, field: "input" | "output") => {
    try {
      JSON.parse(json);
      if (field === "input") setInputError("");
      else setOutputError("");
      return true;
    } catch {
      if (field === "input") setInputError("Invalid JSON");
      else setOutputError("Invalid JSON");
      return false;
    }
  };

  const handleSubmit = () => {
    // Validate JSON fields
    const inputValid = validateJson(inputJson, "input");
    const outputValid = validateJson(outputJson, "output");

    if (!inputValid || !outputValid) {
      toast.error("Invalid JSON", "Please fix the JSON errors before saving");
      return;
    }

    const parseTags = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const data = {
      input: JSON.parse(inputJson),
      expected_output: JSON.parse(outputJson),
      explanation: explanation || undefined,
      domain,
      difficulty,
      function_name: functionName || undefined,
      capability_tags: parseTags(capabilityTags),
      search_keys: parseTags(searchKeys),
      source,
      attribution_notes: attributionNotes || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as ExampleCreateRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-xl font-semibold text-db-gray-800">
            {isEditing ? "Edit Example" : "Create New Example"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-db-gray-400 hover:text-db-gray-600 rounded-lg hover:bg-db-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input JSON */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Input JSON <span className="text-red-500">*</span>
            </label>
            <textarea
              value={inputJson}
              onChange={(e) => {
                setInputJson(e.target.value);
                validateJson(e.target.value, "input");
              }}
              rows={6}
              className={clsx(
                "w-full px-3 py-2 border rounded-lg font-mono text-sm",
                "focus:outline-none focus:ring-2 focus:ring-purple-500",
                inputError
                  ? "border-red-300 bg-red-50"
                  : "border-db-gray-300"
              )}
              placeholder='{"query": "...", "context": {...}}'
            />
            {inputError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {inputError}
              </p>
            )}
          </div>

          {/* Output JSON */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Expected Output JSON <span className="text-red-500">*</span>
            </label>
            <textarea
              value={outputJson}
              onChange={(e) => {
                setOutputJson(e.target.value);
                validateJson(e.target.value, "output");
              }}
              rows={6}
              className={clsx(
                "w-full px-3 py-2 border rounded-lg font-mono text-sm",
                "focus:outline-none focus:ring-2 focus:ring-purple-500",
                outputError
                  ? "border-red-300 bg-red-50"
                  : "border-db-gray-300"
              )}
              placeholder='{"classification": "...", "confidence": 0.95}'
            />
            {outputError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {outputError}
              </p>
            )}
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Explanation
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe why this input leads to this output..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Domain
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as ExampleDomain)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {EXAMPLE_DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as ExampleDifficulty)
                }
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {EXAMPLE_DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Function Name */}
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Function Name
              </label>
              <input
                type="text"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., classify_defect"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ExampleSource)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Capability Tags
              </label>
              <input
                type="text"
                value={capabilityTags}
                onChange={(e) => setCapabilityTags(e.target.value)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="critical, edge_case, common (comma-separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Search Keys
              </label>
              <input
                type="text"
                value={searchKeys}
                onChange={(e) => setSearchKeys(e.target.value)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="crack, defect, critical (comma-separated)"
              />
            </div>
          </div>

          {/* Attribution Notes */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Attribution Notes
            </label>
            <input
              type="text"
              value={attributionNotes}
              onChange={(e) => setAttributionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Created by domain expert John Doe"
            />
          </div>

          {/* Generate Embedding Option (only for new examples) */}
          {!isEditing && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <input
                type="checkbox"
                id="generateEmbedding"
                checked={generateEmbedding}
                onChange={(e) => setGenerateEmbedding(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="generateEmbedding"
                className="flex items-center gap-2 text-sm text-purple-800"
              >
                <Sparkles className="w-4 h-4" />
                Generate embedding for semantic search
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg transition-colors",
              isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-purple-700"
            )}
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Saving..." : isEditing ? "Update Example" : "Create Example"}
          </button>
        </div>
      </div>
    </div>
  );
}
