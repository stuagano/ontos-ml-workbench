/**
 * JobConfigModal - Modal for configuring and triggering data jobs
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Play,
  Loader2,
  Database,
  FileText,
  Mic,
  Image,
  Wand2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { triggerJob } from "../services/api";
import { useToast } from "./Toast";

interface JobConfig {
  type: string;
  name: string;
  description: string;
  icon: typeof FileText;
  fields: FieldConfig[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  helpText?: string;
  defaultValue?: string | number;
}

// Job configurations with their specific fields
const JOB_CONFIGS: Record<string, JobConfig> = {
  ocr_extraction: {
    type: "ocr_extraction",
    name: "OCR Extraction",
    description: "Extract text from images and PDF documents using OCR",
    icon: FileText,
    fields: [
      {
        name: "source_volume",
        label: "Source Volume",
        type: "text",
        placeholder: "catalog.schema.volume_name",
        required: true,
        helpText: "UC Volume containing images/PDFs",
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
        helpText: "Table to write extracted text",
      },
      {
        name: "file_pattern",
        label: "File Pattern",
        type: "text",
        placeholder: "*.pdf,*.png,*.jpg",
        defaultValue: "*",
        helpText: "Glob pattern for files to process",
      },
      {
        name: "engine",
        label: "OCR Engine",
        type: "select",
        required: true,
        options: [
          { value: "azure_vision", label: "Azure Vision (recommended)" },
          { value: "tesseract", label: "Tesseract OSS" },
          { value: "spark_ocr", label: "Spark OCR" },
        ],
      },
      {
        name: "language",
        label: "Language",
        type: "select",
        options: [
          { value: "en", label: "English" },
          { value: "es", label: "Spanish" },
          { value: "fr", label: "French" },
          { value: "de", label: "German" },
          { value: "multi", label: "Multi-language" },
        ],
        defaultValue: "en",
      },
    ],
  },
  audio_transcription: {
    type: "audio_transcription",
    name: "Audio Transcription",
    description: "Transcribe audio files to text using Whisper",
    icon: Mic,
    fields: [
      {
        name: "source_volume",
        label: "Source Volume",
        type: "text",
        placeholder: "catalog.schema.volume_name",
        required: true,
        helpText: "UC Volume containing audio files",
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
        helpText: "Table to write transcriptions",
      },
      {
        name: "file_pattern",
        label: "File Pattern",
        type: "text",
        placeholder: "*.mp3,*.wav,*.m4a",
        defaultValue: "*",
        helpText: "Glob pattern for files to process",
      },
      {
        name: "model_size",
        label: "Model Size",
        type: "select",
        required: true,
        options: [
          { value: "tiny", label: "Tiny (fast, less accurate)" },
          { value: "base", label: "Base (balanced)" },
          { value: "small", label: "Small (recommended)" },
          { value: "medium", label: "Medium (slower, more accurate)" },
          { value: "large", label: "Large (slowest, most accurate)" },
        ],
        defaultValue: "small",
      },
      {
        name: "language",
        label: "Language",
        type: "select",
        options: [
          { value: "auto", label: "Auto-detect" },
          { value: "en", label: "English" },
          { value: "es", label: "Spanish" },
          { value: "fr", label: "French" },
        ],
        defaultValue: "auto",
      },
    ],
  },
  image_captioning: {
    type: "image_captioning",
    name: "Image Captioning",
    description: "Generate captions and descriptions for images",
    icon: Image,
    fields: [
      {
        name: "source_volume",
        label: "Source Volume",
        type: "text",
        placeholder: "catalog.schema.volume_name",
        required: true,
        helpText: "UC Volume containing images",
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
        helpText: "Table to write captions",
      },
      {
        name: "file_pattern",
        label: "File Pattern",
        type: "text",
        placeholder: "*.png,*.jpg,*.jpeg",
        defaultValue: "*",
        helpText: "Glob pattern for images",
      },
      {
        name: "model",
        label: "Caption Model",
        type: "select",
        required: true,
        options: [
          { value: "blip2", label: "BLIP-2 (balanced)" },
          { value: "llava", label: "LLaVA (detailed)" },
          { value: "gpt4v", label: "GPT-4 Vision (premium)" },
        ],
        defaultValue: "blip2",
      },
      {
        name: "detail_level",
        label: "Detail Level",
        type: "select",
        options: [
          { value: "brief", label: "Brief (1-2 sentences)" },
          { value: "standard", label: "Standard (paragraph)" },
          { value: "detailed", label: "Detailed (comprehensive)" },
        ],
        defaultValue: "standard",
      },
    ],
  },
  embedding_generation: {
    type: "embedding_generation",
    name: "Embedding Generation",
    description: "Create vector embeddings for text data",
    icon: Database,
    fields: [
      {
        name: "source_table",
        label: "Source Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
        helpText: "Table containing text to embed",
      },
      {
        name: "text_column",
        label: "Text Column",
        type: "text",
        placeholder: "content",
        required: true,
        helpText: "Column containing text data",
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.embeddings",
        required: true,
        helpText: "Table to write embeddings",
      },
      {
        name: "model",
        label: "Embedding Model",
        type: "select",
        required: true,
        options: [
          { value: "bge-large-en-v1.5", label: "BGE Large (1024 dim)" },
          { value: "e5-large-v2", label: "E5 Large (1024 dim)" },
          { value: "databricks-gte-large-en", label: "Databricks GTE (FMAPI)" },
          { value: "text-embedding-3-small", label: "OpenAI Small (1536 dim)" },
        ],
        defaultValue: "databricks-gte-large-en",
      },
      {
        name: "batch_size",
        label: "Batch Size",
        type: "number",
        defaultValue: 32,
        helpText: "Records per batch",
      },
    ],
  },
  ai_classify: {
    type: "ai_classify",
    name: "AI Classify",
    description: "Classify data using AI models",
    icon: Wand2,
    fields: [
      {
        name: "source_table",
        label: "Source Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
      },
      {
        name: "text_column",
        label: "Text Column",
        type: "text",
        placeholder: "content",
        required: true,
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.classified",
        required: true,
      },
      {
        name: "categories",
        label: "Categories",
        type: "textarea",
        placeholder: "positive, negative, neutral",
        required: true,
        helpText: "Comma-separated list of categories",
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        options: [
          {
            value: "databricks-meta-llama-3-1-8b-instruct",
            label: "Llama 3.1 8B (fast)",
          },
          {
            value: "databricks-meta-llama-3-1-70b-instruct",
            label: "Llama 3.1 70B (quality)",
          },
          { value: "databricks-dbrx-instruct", label: "DBRX Instruct" },
        ],
        defaultValue: "databricks-meta-llama-3-1-8b-instruct",
      },
    ],
  },
  ai_extract: {
    type: "ai_extract",
    name: "AI Extract",
    description: "Extract entities and structured data using AI",
    icon: Wand2,
    fields: [
      {
        name: "source_table",
        label: "Source Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
      },
      {
        name: "text_column",
        label: "Text Column",
        type: "text",
        placeholder: "content",
        required: true,
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.extracted",
        required: true,
      },
      {
        name: "entities",
        label: "Entities to Extract",
        type: "textarea",
        placeholder: "person, organization, date, amount",
        required: true,
        helpText: "Comma-separated entity types",
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        options: [
          {
            value: "databricks-meta-llama-3-1-8b-instruct",
            label: "Llama 3.1 8B (fast)",
          },
          {
            value: "databricks-meta-llama-3-1-70b-instruct",
            label: "Llama 3.1 70B (quality)",
          },
        ],
        defaultValue: "databricks-meta-llama-3-1-8b-instruct",
      },
    ],
  },
  ai_summarize: {
    type: "ai_summarize",
    name: "AI Summarize",
    description: "Summarize text content using AI",
    icon: Wand2,
    fields: [
      {
        name: "source_table",
        label: "Source Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
      },
      {
        name: "text_column",
        label: "Text Column",
        type: "text",
        placeholder: "content",
        required: true,
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.summarized",
        required: true,
      },
      {
        name: "max_length",
        label: "Max Summary Length",
        type: "select",
        options: [
          { value: "brief", label: "Brief (1-2 sentences)" },
          { value: "standard", label: "Standard (paragraph)" },
          { value: "detailed", label: "Detailed (multiple paragraphs)" },
        ],
        defaultValue: "standard",
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        options: [
          {
            value: "databricks-meta-llama-3-1-8b-instruct",
            label: "Llama 3.1 8B (fast)",
          },
          {
            value: "databricks-meta-llama-3-1-70b-instruct",
            label: "Llama 3.1 70B (quality)",
          },
        ],
        defaultValue: "databricks-meta-llama-3-1-8b-instruct",
      },
    ],
  },
  ai_mask: {
    type: "ai_mask",
    name: "AI Mask",
    description: "Mask PII and sensitive data using AI",
    icon: Wand2,
    fields: [
      {
        name: "source_table",
        label: "Source Table",
        type: "text",
        placeholder: "catalog.schema.table_name",
        required: true,
      },
      {
        name: "text_column",
        label: "Text Column",
        type: "text",
        placeholder: "content",
        required: true,
      },
      {
        name: "output_table",
        label: "Output Table",
        type: "text",
        placeholder: "catalog.schema.masked",
        required: true,
      },
      {
        name: "pii_types",
        label: "PII Types to Mask",
        type: "textarea",
        placeholder: "ssn, email, phone, name, address",
        required: true,
        helpText: "Comma-separated PII types",
      },
      {
        name: "mask_style",
        label: "Mask Style",
        type: "select",
        options: [
          { value: "redact", label: "Redact ([REDACTED])" },
          { value: "replace", label: "Replace (fake data)" },
          { value: "hash", label: "Hash (consistent token)" },
        ],
        defaultValue: "redact",
      },
    ],
  },
  // CURATE stage jobs
  labeling_agent: {
    type: "labeling_agent",
    name: "AI Labeling Agent",
    description: "Pre-label items using AI for human review",
    icon: Wand2,
    fields: [
      {
        name: "template_id",
        label: "Template",
        type: "text",
        placeholder: "template-uuid",
        required: true,
        helpText: "ID of the template to label items for",
      },
      {
        name: "confidence_threshold",
        label: "Confidence Threshold",
        type: "number",
        defaultValue: 0.8,
        helpText: "Minimum confidence to auto-approve (0.0-1.0)",
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        options: [
          {
            value: "databricks-meta-llama-3-1-8b-instruct",
            label: "Llama 3.1 8B (fast)",
          },
          {
            value: "databricks-meta-llama-3-1-70b-instruct",
            label: "Llama 3.1 70B (quality)",
          },
          { value: "gpt-4", label: "GPT-4 (premium)" },
        ],
        defaultValue: "databricks-meta-llama-3-1-70b-instruct",
      },
      {
        name: "batch_size",
        label: "Batch Size",
        type: "number",
        defaultValue: 100,
        helpText: "Items to process per batch",
      },
    ],
  },
  quality_scoring: {
    type: "quality_scoring",
    name: "Quality Scoring",
    description: "Score data quality and detect anomalies",
    icon: Database,
    fields: [
      {
        name: "template_id",
        label: "Template",
        type: "text",
        placeholder: "template-uuid",
        required: true,
      },
      {
        name: "scoring_model",
        label: "Scoring Method",
        type: "select",
        required: true,
        options: [
          { value: "heuristic", label: "Heuristic Rules" },
          { value: "ml_based", label: "ML-Based Scoring" },
          { value: "llm_judge", label: "LLM Judge" },
        ],
        defaultValue: "heuristic",
      },
      {
        name: "quality_dimensions",
        label: "Quality Dimensions",
        type: "textarea",
        placeholder: "completeness, accuracy, relevance",
        helpText: "Comma-separated quality dimensions to evaluate",
      },
    ],
  },
  // TRAIN stage jobs
  data_assembly: {
    type: "data_assembly",
    name: "Training Data Assembly",
    description: "Assemble curated data into training format",
    icon: FolderOpen,
    fields: [
      {
        name: "template_id",
        label: "Template",
        type: "text",
        placeholder: "template-uuid",
        required: true,
      },
      {
        name: "output_format",
        label: "Output Format",
        type: "select",
        required: true,
        options: [
          { value: "jsonl", label: "JSONL (chat format)" },
          { value: "parquet", label: "Parquet" },
          { value: "delta", label: "Delta Table" },
        ],
        defaultValue: "jsonl",
      },
      {
        name: "split_ratio",
        label: "Train/Val Split",
        type: "select",
        options: [
          { value: "0.9", label: "90% Train / 10% Val" },
          { value: "0.8", label: "80% Train / 20% Val" },
          { value: "0.7", label: "70% Train / 30% Val" },
        ],
        defaultValue: "0.9",
      },
      {
        name: "include_only_approved",
        label: "Approved Items Only",
        type: "select",
        options: [
          { value: "true", label: "Yes - Only approved items" },
          { value: "false", label: "No - Include pending items" },
        ],
        defaultValue: "true",
      },
    ],
  },
  finetune_fmapi: {
    type: "finetune_fmapi",
    name: "Fine-tune (FMAPI)",
    description: "Fine-tune a model using Foundation Model API",
    icon: Wand2,
    fields: [
      {
        name: "training_data",
        label: "Training Data Path",
        type: "text",
        placeholder: "/Volumes/catalog/schema/training_data",
        required: true,
      },
      {
        name: "base_model",
        label: "Base Model",
        type: "select",
        required: true,
        options: [
          {
            value: "meta-llama/Meta-Llama-3.1-8B-Instruct",
            label: "Llama 3.1 8B Instruct",
          },
          {
            value: "meta-llama/Meta-Llama-3.1-70B-Instruct",
            label: "Llama 3.1 70B Instruct",
          },
          {
            value: "mistralai/Mistral-7B-Instruct-v0.2",
            label: "Mistral 7B Instruct",
          },
        ],
      },
      {
        name: "epochs",
        label: "Training Epochs",
        type: "number",
        defaultValue: 3,
        helpText: "Number of training epochs",
      },
      {
        name: "learning_rate",
        label: "Learning Rate",
        type: "select",
        options: [
          { value: "1e-5", label: "1e-5 (conservative)" },
          { value: "2e-5", label: "2e-5 (recommended)" },
          { value: "5e-5", label: "5e-5 (aggressive)" },
        ],
        defaultValue: "2e-5",
      },
      {
        name: "output_model_name",
        label: "Output Model Name",
        type: "text",
        placeholder: "my-finetuned-model",
        required: true,
      },
    ],
  },
  model_evaluation: {
    type: "model_evaluation",
    name: "Model Evaluation",
    description: "Evaluate model performance on test data",
    icon: Database,
    fields: [
      {
        name: "model_name",
        label: "Model Name",
        type: "text",
        placeholder: "catalog.schema.model_name",
        required: true,
      },
      {
        name: "eval_data",
        label: "Evaluation Data",
        type: "text",
        placeholder: "/Volumes/catalog/schema/eval_data",
        required: true,
      },
      {
        name: "metrics",
        label: "Evaluation Metrics",
        type: "textarea",
        placeholder: "accuracy, f1, perplexity",
        defaultValue: "accuracy, f1",
        helpText: "Comma-separated metrics to compute",
      },
      {
        name: "baseline_model",
        label: "Baseline Model (optional)",
        type: "text",
        placeholder: "catalog.schema.baseline_model",
        helpText: "Compare against a baseline model",
      },
    ],
  },
};

interface JobConfigModalProps {
  jobType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobConfigModal({
  jobType,
  isOpen,
  onClose,
}: JobConfigModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const config = JOB_CONFIGS[jobType];

  // Initialize form state with default values
  const getInitialValues = () => {
    const initial: Record<string, string | number> = {};
    config?.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      }
    });
    return initial;
  };

  const [formValues, setFormValues] =
    useState<Record<string, string | number>>(getInitialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const triggerMutation = useMutation({
    mutationFn: (params: { config: Record<string, unknown> }) =>
      triggerJob(jobType, params.config),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["jobRuns"] });
      toast.success("Job started", `${config?.name || "Job"} is now running`);
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to start job", error.message);
    },
  });

  if (!isOpen || !config) return null;

  const handleChange = (name: string, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    config.fields.forEach((field) => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    triggerMutation.mutate({ config: formValues });
  };

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-db-gray-900">
                {config.name}
              </h2>
              <p className="text-sm text-db-gray-500">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {config.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  value={formValues[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors[field.name]
                      ? "border-red-300"
                      : "border-db-gray-300",
                  )}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={formValues[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors[field.name]
                      ? "border-red-300"
                      : "border-db-gray-300",
                  )}
                />
              ) : field.type === "number" ? (
                <input
                  type="number"
                  value={formValues[field.name] || ""}
                  onChange={(e) =>
                    handleChange(field.name, Number(e.target.value))
                  }
                  placeholder={field.placeholder}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors[field.name]
                      ? "border-red-300"
                      : "border-db-gray-300",
                  )}
                />
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={formValues[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={clsx(
                      "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors[field.name]
                        ? "border-red-300"
                        : "border-db-gray-300",
                    )}
                  />
                  {(field.name.includes("volume") ||
                    field.name.includes("table")) && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-db-gray-400 hover:text-blue-600"
                      title="Browse Unity Catalog"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {field.helpText && !errors[field.name] && (
                <p className="mt-1 text-xs text-db-gray-500">
                  {field.helpText}
                </p>
              )}
              {errors[field.name] && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-db-gray-50 border-t border-db-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={triggerMutation.isPending}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium",
              triggerMutation.isPending
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Job
              </>
            )}
          </button>
        </div>

        {/* Error banner */}
        {triggerMutation.isError && (
          <div className="absolute bottom-20 left-6 right-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              {(triggerMutation.error as Error).message ||
                "Failed to start job"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
