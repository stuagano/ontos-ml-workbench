// Pipeline stages (PRD v2.3: updated workflow)
export type PipelineStage =
  | "data"
  | "generate" // v2.3: renamed from "curate"
  | "label"
  | "train"
  | "deploy"
  | "monitor"
  | "improve";

export const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
  description: string;
}[] = [
  {
    id: "data",
    label: "DATA",
    description: "Extract, transform, and enrich raw data",
  },
  {
    id: "template",
    label: "TEMPLATE",
    description: "Create and manage Databits (prompt templates)",
  },
  {
    id: "curate",
    label: "CURATE",
    description: "Review and label training data",
  },
  {
    id: "label",
    label: "LABEL",
    description: "Manage labeling workflows and annotation tasks",
  },
  {
    id: "train",
    label: "TRAIN",
    description: "Fine-tune models on curated data",
  },
  {
    id: "deploy",
    label: "DEPLOY",
    description: "Deploy models and agents to endpoints",
  },
  {
    id: "monitor",
    label: "MONITOR",
    description: "Track performance and detect drift",
  },
  {
    id: "improve",
    label: "IMPROVE",
    description: "Collect feedback and retrain",
  },
];

// Template types
export type TemplateStatus = "draft" | "published" | "archived";

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

export interface Example {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  explanation?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: TemplateStatus;
  label_type?: string; // PRD v2.3: For canonical label matching
  input_schema?: SchemaField[];
  output_schema?: SchemaField[];
  prompt_template?: string;
  system_prompt?: string;
  examples?: Example[];
  base_model: string;
  temperature: number;
  max_tokens: number;
  source_catalog?: string;
  source_schema?: string;
  source_table?: string;
  source_volume?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Labelsets (PRD v2.3) - Reusable Label Collections
// ============================================================================

export type LabelsetStatus = "draft" | "published" | "archived";

export interface LabelClass {
  name: string;
  display_name?: string;
  color: string;
  description?: string;
  hotkey?: string;
  confidence_threshold?: number;
}

export interface ResponseSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  examples?: Record<string, any>[];
}

export interface Labelset {
  id: string;
  name: string;
  description?: string;
  label_classes: LabelClass[];
  response_schema?: ResponseSchema;
  label_type: string;
  canonical_label_count: number;
  status: LabelsetStatus;
  version: string;
  allowed_uses?: string[];
  prohibited_uses?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  published_by?: string;
  published_at?: string;
  tags?: string[];
  use_case?: string;
}

export interface LabelsetCreate {
  name: string;
  description?: string;
  label_classes?: LabelClass[];
  response_schema?: ResponseSchema;
  label_type: string;
  allowed_uses?: string[];
  prohibited_uses?: string[];
  tags?: string[];
  use_case?: string;
}

export interface LabelsetUpdate {
  name?: string;
  description?: string;
  label_classes?: LabelClass[];
  response_schema?: ResponseSchema;
  allowed_uses?: string[];
  prohibited_uses?: string[];
  tags?: string[];
  use_case?: string;
  version?: string;
}

export interface LabelsetStats {
  labelset_id: string;
  labelset_name: string;
  canonical_label_count: number;
  total_label_classes: number;
  assemblies_using_count: number;
  training_jobs_count: number;
  coverage_stats?: Record<string, any>;
}

// ============================================================================
// Curated Datasets (PRD v2.3) - Training-Ready QA Pairs
// ============================================================================

export type DatasetStatus = "draft" | "approved" | "in_use" | "archived";

export interface QualityMetrics {
  total_examples: number;
  avg_confidence: number;
  label_distribution: Record<string, number>;
  response_length_avg: number;
  response_length_std: number;
  human_verified_count: number;
  ai_generated_count: number;
  pre_labeled_count: number;
}

export interface DatasetSplit {
  train_pct: number;
  val_pct: number;
  test_pct: number;
  stratify_by?: string;
}

export interface CuratedDataset {
  id: string;
  name: string;
  description?: string;
  labelset_id?: string;
  assembly_ids: string[];
  split_config?: DatasetSplit;
  quality_threshold: number;
  status: DatasetStatus;
  version: string;
  example_count: number;
  quality_metrics?: QualityMetrics;
  created_at?: string;
  created_by?: string;
  approved_at?: string;
  approved_by?: string;
  last_used_at?: string;
  tags: string[];
  use_case?: string;
  intended_models: string[];
  prohibited_uses: string[];
}

export interface CuratedDatasetCreate {
  name: string;
  description?: string;
  labelset_id?: string;
  assembly_ids?: string[];
  split_config?: DatasetSplit;
  quality_threshold?: number;
  tags?: string[];
  use_case?: string;
  intended_models?: string[];
  prohibited_uses?: string[];
}

export interface CuratedDatasetUpdate {
  name?: string;
  description?: string;
  assembly_ids?: string[];
  split_config?: DatasetSplit;
  quality_threshold?: number;
  tags?: string[];
  use_case?: string;
  intended_models?: string[];
  prohibited_uses?: string[];
}

export interface DatasetExample {
  example_id: string;
  assembly_id: string;
  prompt: string;
  response: string;
  label?: string;
  confidence?: number;
  source_mode: string;
  reviewed: boolean;
  split?: string;
}

export interface DatasetPreview {
  dataset_id: string;
  total_examples: number;
  examples: DatasetExample[];
  quality_metrics: QualityMetrics;
}

export interface ApprovalRequest {
  approved_by: string;
  notes?: string;
}

export interface ListCuratedDatasetsParams {
  status?: DatasetStatus;
  labelset_id?: string;
  use_case?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}

export interface ListCuratedDatasetsResponse {
  datasets: CuratedDataset[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Canonical Labels (PRD v2.3) - Ground Truth Layer
// ============================================================================

/**
 * Expert confidence in the label
 */
export type LabelConfidence = "high" | "medium" | "low";

/**
 * Data classification for governance
 */
export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

/**
 * Usage types for data governance
 */
export type UsageType =
  | "training"
  | "validation"
  | "evaluation"
  | "few_shot"
  | "testing";

/**
 * Canonical label - expert-validated ground truth
 * Enables "label once, reuse everywhere" across Training Sheets
 */
export interface CanonicalLabel {
  id: string;
  sheet_id: string;
  item_ref: string; // Reference to source item
  label_type: string; // Composite key component (e.g., "entity_extraction", "classification")

  // Expert's ground truth label (flexible JSON)
  label_data: any; // Entities, bounding boxes, classifications, etc.

  // Quality metadata
  confidence: LabelConfidence;
  notes?: string;

  // Governance constraints (PRD v2.2)
  allowed_uses: UsageType[];
  prohibited_uses: UsageType[];
  usage_reason?: string;
  data_classification: DataClassification;

  // Audit trail
  labeled_by: string;
  labeled_at: string;
  last_modified_by?: string;
  last_modified_at?: string;

  // Version control
  version: number;

  // Statistics
  reuse_count: number; // How many Training Sheets use this label
  last_used_at?: string;

  created_at: string;
}

/**
 * Request to create a canonical label
 */
export interface CanonicalLabelCreateRequest {
  sheet_id: string;
  item_ref: string;
  label_type: string;
  label_data: any;
  confidence?: LabelConfidence;
  notes?: string;
  allowed_uses?: UsageType[];
  prohibited_uses?: UsageType[];
  usage_reason?: string;
  data_classification?: DataClassification;
  labeled_by: string;
}

/**
 * Request to update a canonical label
 */
export interface CanonicalLabelUpdateRequest {
  label_data?: any;
  confidence?: LabelConfidence;
  notes?: string;
  allowed_uses?: UsageType[];
  prohibited_uses?: UsageType[];
  usage_reason?: string;
  data_classification?: DataClassification;
  last_modified_by?: string;
}

/**
 * Canonical label lookup by composite key
 */
export interface CanonicalLabelLookup {
  sheet_id: string;
  item_ref: string;
  label_type: string;
}

/**
 * Bulk canonical label lookup
 */
export interface CanonicalLabelBulkLookup {
  sheet_id: string;
  items: Array<{ item_ref: string; label_type: string }>;
}

/**
 * Bulk lookup response
 */
export interface CanonicalLabelBulkLookupResponse {
  found: CanonicalLabel[];
  not_found: Array<{ item_ref: string; label_type: string }>;
  found_count: number;
  not_found_count: number;
}

/**
 * Statistics about canonical labels for a sheet
 */
export interface CanonicalLabelStats {
  sheet_id: string;
  total_labels: number;
  labels_by_type: Record<string, number>; // label_type -> count
  coverage_percent?: number; // % of sheet items with at least one label
  avg_reuse_count: number;
  most_reused_labels: CanonicalLabel[];
}

/**
 * All labelsets for a single source item
 */
export interface ItemLabelsets {
  sheet_id: string;
  item_ref: string;
  labelsets: CanonicalLabel[]; // All canonical labels for this item
  label_types: string[]; // Unique label types available
}

/**
 * Usage constraint check request
 */
export interface UsageConstraintCheck {
  canonical_label_id: string;
  requested_usage: UsageType;
}

/**
 * Usage constraint check response
 */
export interface UsageConstraintCheckResponse {
  allowed: boolean;
  reason?: string;
  canonical_label_id: string;
  requested_usage: UsageType;
}

/**
 * Canonical label version history
 */
export interface CanonicalLabelVersion {
  version: number;
  label_data: any;
  confidence: LabelConfidence;
  notes?: string;
  modified_by: string;
  modified_at: string;
}

/**
 * List response with pagination
 */
export interface CanonicalLabelListResponse {
  labels: CanonicalLabel[];
  total: number;
  page: number;
  page_size: number;
}

// Curation types
export type CurationStatus =
  | "pending"
  | "auto_approved"
  | "needs_review"
  | "approved"
  | "rejected"
  | "flagged";

export interface CurationItem {
  id: string;
  template_id: string;
  item_ref: string;
  item_data?: Record<string, unknown>;
  agent_label?: Record<string, unknown>;
  agent_confidence?: number;
  agent_model?: string;
  agent_reasoning?: string;
  human_label?: Record<string, unknown>;
  status: CurationStatus;
  quality_score?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CurationStats {
  template_id: string;
  total: number;
  pending: number;
  auto_approved: number;
  needs_review: number;
  approved: number;
  rejected: number;
  flagged: number;
  avg_confidence?: number;
  avg_quality_score?: number;
}

// Job types
export type JobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface JobRun {
  id: string;
  job_type: string;
  job_name: string;
  template_id?: string;
  model_id?: string;
  endpoint_id?: string;
  databricks_run_id?: string;
  status: JobStatus;
  progress: number;
  config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error_message?: string;
  items_processed?: number;
  duration_seconds?: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  created_by?: string;
}

// Registry types
export type ToolStatus = "draft" | "published" | "deprecated";
export type AgentStatus = "draft" | "deployed" | "archived";
export type EndpointStatus =
  | "creating"
  | "ready"
  | "updating"
  | "failed"
  | "stopped";
export type EndpointType = "model" | "agent" | "chain";

export interface Tool {
  id: string;
  name: string;
  description?: string;
  uc_function_path?: string;
  parameters_schema?: Record<string, unknown>;
  return_type?: string;
  documentation?: string;
  examples?: unknown[];
  version: string;
  status: ToolStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model_endpoint?: string;
  system_prompt?: string;
  tools?: string[];
  template_id?: string;
  temperature: number;
  max_tokens: number;
  version: string;
  status: AgentStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Endpoint {
  id: string;
  name: string;
  description?: string;
  endpoint_name: string;
  endpoint_type: EndpointType;
  agent_id?: string;
  model_name?: string;
  model_version?: string;
  traffic_config?: Record<string, number>;
  status: EndpointStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// App config
export interface AppConfig {
  app_name: string;
  workspace_url: string;
  catalog: string;
  schema: string;
  current_user: string;
}

// ============================================================================
// Multi-Dataset Configuration Types
// ============================================================================

/**
 * Column metadata from a Unity Catalog table
 */
export interface SourceColumn {
  name: string;
  type: string;
  comment?: string;
  isJoinKey?: boolean; // User-selected as join key
}

/**
 * A data source reference (table or volume)
 */
export interface DataSource {
  type: "table" | "volume";
  catalog: string;
  schema: string;
  name: string; // table name or volume name
  fullPath: string; // catalog.schema.name or /Volumes/catalog/schema/name
  columns?: SourceColumn[];
}

/**
 * How to extract metadata from images (for joining with other data)
 */
export type ImageMetadataSource =
  | {
      type: "manifest";
      table: DataSource; // Table containing image paths + metadata
      imagePathColumn: string; // Column with image file paths
      joinKeyColumns: string[]; // Columns to use for joining
    }
  | {
      type: "filename";
      pattern: string; // e.g., "{equipment_id}_{reading_id}_{timestamp}.jpg"
      extractedFields: string[]; // Fields that will be extracted
    }
  | {
      type: "ocr";
      fieldsToExtract: string[]; // What to look for in image text
    };

/**
 * Configuration for a single data source in the pipeline
 */
export interface DataSourceConfig {
  source: DataSource;
  role: "primary" | "secondary" | "images" | "labels";
  alias?: string; // User-friendly name, e.g., "Sensor Readings"
  joinKeys: string[]; // Columns to join on
  selectedColumns?: string[]; // Subset of columns to use (null = all)
  imageMetadata?: ImageMetadataSource; // Only for volume/image sources
}

/**
 * Mapping between join keys across data sources
 */
export interface JoinKeyMapping {
  sourceAlias: string; // e.g., "sensor_data"
  sourceColumn: string; // e.g., "equipment_id"
  targetAlias: string; // e.g., "quality_metrics"
  targetColumn: string; // e.g., "asset_id"
}

/**
 * Complete multi-dataset configuration
 */
export interface MultiDatasetConfig {
  // All data sources (at least one required)
  sources: DataSourceConfig[];

  // How to join the sources
  joinConfig: {
    keyMappings: JoinKeyMapping[];
    joinType: "inner" | "left" | "full";
    timeWindow?: {
      enabled: boolean;
      column1: string; // e.g., "sensor_data.timestamp"
      column2: string; // e.g., "images.captured_at"
      windowMinutes: number; // e.g., 5 (±5 minutes)
    };
  };

  // Preview/validation
  previewRowCount?: number;
  validationErrors?: string[];
  matchStats?: {
    totalPrimaryRows: number;
    matchedRows: number;
    unmatchedRows: number;
    matchPercentage: number;
  };
}

/**
 * Preset configurations for common use cases
 */
export interface DatasetPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  sourceTemplates: Partial<DataSourceConfig>[];
  suggestedJoinKeys: string[];
}

// ============================================================================
// AI Sheets Types (Spreadsheet-style datasets)
// ============================================================================

/**
 * Sheet lifecycle status
 */
export type SheetStatus = "draft" | "published" | "archived";

/**
 * How the column data is sourced
 */
export type ColumnSourceType = "imported" | "generated";

/**
 * Data type of column values
 */
export type ColumnDataType =
  | "string"
  | "number"
  | "boolean"
  | "image"
  | "object";

/**
 * Configuration for importing a column from Unity Catalog
 */
export interface ImportConfig {
  catalog: string;
  schema: string;
  table: string;
  column: string;
}

/**
 * A few-shot example from manually edited cells
 */
export interface FewShotExample {
  input: Record<string, unknown>;
  output: unknown;
}

/**
 * Configuration for AI-generating a column
 * Note: Uses snake_case to match backend API
 */
export interface GenerationConfig {
  prompt: string; // Uses {{column_name}} syntax
  system_prompt?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  examples?: FewShotExample[];
}

/**
 * Definition of a column in an AI Sheet
 * Note: Uses snake_case to match backend API
 */
export interface ColumnDefinition {
  id: string;
  name: string;
  data_type: ColumnDataType;
  source_type: ColumnSourceType;
  import_config?: ImportConfig;
  generation_config?: GenerationConfig;
  order: number;
}

/**
 * An AI Sheet - a spreadsheet with imported and AI-generated columns
 * Note: Uses snake_case to match backend API
 */
export interface Sheet {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: SheetStatus;
  columns: ColumnDefinition[];
  row_count?: number;
  template_config?: TemplateConfig; // Attached template (GCP pattern)
  has_template: boolean; // Quick check if template is attached

  // PRD v2.3: Unity Catalog source references (multimodal)
  primary_table?: string; // e.g., 'mirion_vital.raw.pcb_inspections'
  secondary_sources?: Array<{
    type: string;
    path: string;
    join_keys: string[];
  }>;
  join_keys?: string[];
  filter_condition?: string;
  canonical_label_count?: number; // v2.3: Number of canonical labels created from this sheet

  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * A single cell value with metadata
 * Note: Uses snake_case to match backend API
 */
export interface CellValue {
  column_id: string;
  value: unknown;
  source: "imported" | "generated" | "manual";
  generated_at?: string;
  edited_at?: string;
}

/**
 * Data for a single row in the sheet
 * Note: Uses snake_case to match backend API
 */
export interface RowData {
  row_index: number;
  cells: Record<string, CellValue>;
}

/**
 * Response for sheet preview
 * Note: Uses snake_case to match backend API
 */
export interface SheetPreview {
  sheet_id: string;
  columns: ColumnDefinition[];
  rows: RowData[];
  total_rows: number;
  preview_rows: number;
}

/**
 * Request for creating a column
 * Note: Uses snake_case to match backend API
 */
export interface ColumnCreateRequest {
  name: string;
  data_type: ColumnDataType;
  source_type: ColumnSourceType;
  import_config?: ImportConfig;
  generation_config?: GenerationConfig;
}

/**
 * Request for creating a sheet
 */
export interface SheetCreateRequest {
  name: string;
  description?: string;
  columns?: ColumnCreateRequest[];
}

/**
 * Request for AI generation
 * Note: Uses snake_case to match backend API
 */
export interface GenerateRequest {
  column_ids?: string[];
  row_indices?: number[];
  include_examples?: boolean;
}

/**
 * Response from AI generation
 * Note: Uses snake_case to match backend API
 */
export interface GenerateResponse {
  sheet_id: string;
  generated_cells: number;
  errors?: Array<{ row_index: number; column_id: string; error: string }>;
}

/**
 * Request for exporting sheet to Delta table
 */
export interface ExportRequest {
  catalog: string;
  schema: string;
  table: string;
  overwrite?: boolean;
}

/**
 * Response from export operation
 * Note: Uses snake_case to match backend API
 */
export interface ExportResponse {
  sheet_id: string;
  destination: string;
  rows_exported: number;
}

/**
 * Request for exporting sheet as fine-tuning dataset
 */
export interface FineTuningExportRequest {
  target_column_id: string;
  volume_path: string; // e.g., /Volumes/catalog/schema/volume/dataset.jsonl
  include_only_verified?: boolean; // Only include human-edited rows
  include_system_prompt?: boolean;
}

/**
 * Response from fine-tuning export
 */
export interface FineTuningExportResponse {
  sheet_id: string;
  volume_path: string;
  examples_exported: number;
  format: string; // "openai_chat"
}

// ============================================================================
// Template Config & Assembly Types (GCP Vertex AI Pattern)
// ============================================================================

/**
 * A field in the response schema for structured outputs
 */
export interface ResponseSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
}

/**
 * How responses are sourced for the training dataset
 */
export type ResponseSourceMode =
  | "existing_column"
  | "ai_generated"
  | "manual_labeling"
  | "canonical"; // PRD v2.3: Lookup from canonical labels

/**
 * Template configuration attached to a Sheet
 * Defines how to transform sheet data into prompt/response pairs
 */
/**
 * A label class for annotation tasks
 */
export interface LabelClass {
  name: string;
  color: string;
  description?: string;
  hotkey?: string;
}

export interface TemplateConfig {
  system_instruction?: string;
  prompt_template: string; // Uses {{column_name}} syntax
  response_source_mode: ResponseSourceMode; // How to get responses
  response_column?: string; // Column to use as expected response (for existing_column mode)
  response_schema?: ResponseSchemaField[];
  model: string;
  temperature: number;
  max_tokens: number;
  label_classes?: LabelClass[]; // Labels for annotation tasks
  label_type?: string; // PRD v2.3: For canonical label lookup (e.g., "entity_extraction", "classification")
  name?: string;
  description?: string;
  version: string;
}

/**
 * Request to attach a template config to a sheet
 */
export interface TemplateConfigAttachRequest {
  system_instruction?: string;
  prompt_template: string;
  response_source_mode?: ResponseSourceMode; // How to get responses
  response_column?: string; // Required for existing_column mode
  response_schema?: ResponseSchemaField[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  label_classes?: LabelClass[]; // Labels for annotation tasks
  label_type?: string; // PRD v2.3: For canonical label lookup
  name?: string;
  description?: string;
}

/**
 * Assembly lifecycle status
 */
export type AssemblyStatus = "assembling" | "ready" | "failed" | "archived";

/**
 * How the response was sourced
 */
export type ResponseSource =
  | "empty"
  | "imported"
  | "ai_generated"
  | "human_labeled"
  | "human_verified"
  | "canonical"; // PRD v2.3: From canonical labels

/**
 * A single assembled row with rendered prompt and response
 */
export interface AssembledRow {
  row_index: number;
  prompt: string;
  source_data: Record<string, unknown>;
  response?: string;
  response_source: ResponseSource;

  // PRD v2.3: Canonical label integration
  item_ref?: string; // Reference to source item for canonical lookup
  canonical_label_id?: string; // Link to ground truth label
  labeling_mode?: "ai_generated" | "manual" | "existing_column" | "canonical";
  allowed_uses?: UsageType[]; // v2.3: Usage constraints from canonical label
  prohibited_uses?: UsageType[];

  generated_at?: string;
  labeled_by?: string;
  labeled_at?: string;
  verified_by?: string;
  verified_at?: string;
  is_flagged?: boolean;
  flag_reason?: string;
  confidence_score?: number;
  notes?: string;
}

/**
 * An assembled dataset - materialized result of applying template to sheet
 */
export interface AssembledDataset {
  id: string;
  sheet_id: string;
  sheet_name?: string;
  template_config: TemplateConfig;
  status: AssemblyStatus;
  total_rows: number;
  empty_count?: number;
  ai_generated_count: number;
  human_labeled_count: number;
  human_verified_count: number;
  flagged_count?: number;

  // PRD v2.3: Canonical label tracking
  canonical_reused_count?: number; // How many rows use canonical labels
  template_label_type?: string; // Label type from template config

  error_message?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

/**
 * Request to create an assembly from a sheet
 */
export interface AssembleRequest {
  name?: string;
  description?: string;
  row_indices?: number[]; // Subset of rows (null = all)
}

/**
 * Response from assembly creation
 */
export interface AssembleResponse {
  assembly_id: string;
  sheet_id: string;
  status: AssemblyStatus;
  total_rows: number;
  message?: string;
}

/**
 * Request to preview assembled rows
 */
export interface AssemblyPreviewRequest {
  offset?: number;
  limit?: number;
  response_source?: ResponseSource;
  flagged_only?: boolean;
}

/**
 * Response from assembly preview
 */
export interface AssemblyPreviewResponse {
  assembly_id: string;
  rows: AssembledRow[];
  total_rows: number;
  preview_rows: number;
  offset: number;
  limit: number;
  // Stats
  ai_generated_count: number;
  human_labeled_count: number;
  human_verified_count: number;
  flagged_count: number;
  empty_count: number;
}

/**
 * Request to update an assembled row (for labeling)
 */
export interface AssembledRowUpdateRequest {
  response: string;
  mark_as_verified?: boolean;
  notes?: string;
}

/**
 * Request to generate AI responses for assembled rows
 */
export interface AssemblyGenerateRequest {
  row_indices?: number[]; // Rows to generate (null = all empty)
  include_few_shot?: boolean;
  few_shot_count?: number;
}

/**
 * Response from AI generation
 */
export interface AssemblyGenerateResponse {
  assembly_id: string;
  generated_count: number;
  errors?: Array<{ row_index: number; error: string }>;
}

/**
 * Export format for fine-tuning
 */
export type ExportFormat = "openai_chat" | "anthropic" | "gemini";

/**
 * Request to export assembly for fine-tuning
 */
export interface AssemblyExportRequest {
  format: ExportFormat;
  volume_path: string;
  include_only_verified?: boolean;
  include_system_instruction?: boolean;
  // Train/validation split
  train_split?: number; // 0.5-0.95, if provided creates separate train/val files
  random_seed?: number; // Default 42
}

/**
 * Response from assembly export
 */
export interface AssemblyExportResponse {
  assembly_id: string;
  volume_path: string;
  format: ExportFormat;
  examples_exported: number;
  excluded_count?: number;
  // Train/val split info (when train_split is provided)
  train_path?: string;
  val_path?: string;
  train_count?: number;
  val_count?: number;
}

// Common presets
export const DATASET_PRESETS: DatasetPreset[] = [
  {
    id: "sensor-only",
    name: "Sensor Data Only",
    description: "Single table of sensor readings or telemetry",
    icon: "activity",
    sourceTemplates: [{ role: "primary" }],
    suggestedJoinKeys: ["equipment_id", "device_id", "sensor_id", "timestamp"],
  },
  {
    id: "sensor-quality",
    name: "Sensor + Quality Metrics",
    description: "Sensor readings joined with quality/defect labels",
    icon: "git-merge",
    sourceTemplates: [
      { role: "primary", alias: "Sensor Readings" },
      { role: "labels", alias: "Quality Labels" },
    ],
    suggestedJoinKeys: ["equipment_id", "reading_id", "batch_id", "timestamp"],
  },
  {
    id: "sensor-images",
    name: "Sensor + Inspection Images",
    description: "Sensor readings with associated inspection photos",
    icon: "image",
    sourceTemplates: [
      { role: "primary", alias: "Sensor Readings" },
      { role: "images", alias: "Inspection Images" },
    ],
    suggestedJoinKeys: ["equipment_id", "inspection_id", "reading_id"],
  },
  {
    id: "full-multimodal",
    name: "Full Multimodal Dataset",
    description: "Sensor data + quality metrics + inspection images",
    icon: "layers",
    sourceTemplates: [
      { role: "primary", alias: "Sensor Readings" },
      { role: "secondary", alias: "Quality Metrics" },
      { role: "images", alias: "Inspection Images" },
    ],
    suggestedJoinKeys: [
      "equipment_id",
      "reading_id",
      "inspection_id",
      "timestamp",
    ],
  },
];

// ============================================================================
// Labeling Workflow Types (Roboflow-inspired)
// ============================================================================

/**
 * Labeling job lifecycle status
 */
export type LabelingJobStatus = "draft" | "active" | "paused" | "completed";

/**
 * Task/batch lifecycle status
 */
export type LabelingTaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "review"
  | "approved"
  | "rejected"
  | "rework";

/**
 * Individual item status
 */
export type LabeledItemStatus =
  | "pending"
  | "ai_labeled"
  | "human_labeled"
  | "reviewed"
  | "flagged";

/**
 * Review decision
 */
export type ReviewStatus = "approved" | "rejected" | "needs_correction";

/**
 * User role in the labeling workspace
 */
export type LabelingUserRole = "labeler" | "reviewer" | "manager" | "admin";

/**
 * Task priority
 */
export type TaskPriority = "low" | "normal" | "high" | "urgent";

/**
 * How tasks are assigned to labelers
 */
export type AssignmentStrategy = "manual" | "round_robin" | "load_balanced";

/**
 * Label field types for schema definition
 */
export type LabelFieldType =
  | "text"
  | "select"
  | "multi_select"
  | "number"
  | "boolean"
  | "bounding_box"
  | "polygon";

/**
 * A single field in the label schema
 */
export interface LabelField {
  id: string;
  name: string;
  field_type: LabelFieldType;
  required: boolean;
  options?: string[]; // For select/multi_select
  default_value?: unknown;
  description?: string;
  min_value?: number; // For number fields
  max_value?: number;
}

/**
 * Schema defining what labelers annotate
 */
export interface LabelSchema {
  fields: LabelField[];
}

/**
 * Statistics for a labeling job
 */
export interface LabelingJobStats {
  total_items: number;
  labeled_items: number;
  reviewed_items: number;
  approved_items: number;
  ai_labeled_items: number;
  human_labeled_items: number;
  flagged_items: number;
  ai_human_agreement_rate?: number;
  average_label_time_seconds?: number;
  labels_per_hour?: number;
}

/**
 * Request to create a labeling job
 */
export interface LabelingJobCreateRequest {
  name: string;
  description?: string;
  sheet_id: string;
  target_columns: string[]; // Column IDs to label
  label_schema: LabelSchema;
  instructions?: string; // Markdown for labelers
  ai_assist_enabled?: boolean;
  ai_model?: string;
  assignment_strategy?: AssignmentStrategy;
  default_batch_size?: number;
}

/**
 * Request to update a labeling job
 */
export interface LabelingJobUpdateRequest {
  name?: string;
  description?: string;
  label_schema?: LabelSchema;
  instructions?: string;
  ai_assist_enabled?: boolean;
  ai_model?: string;
  assignment_strategy?: AssignmentStrategy;
  default_batch_size?: number;
}

/**
 * A labeling job response
 */
export interface LabelingJob {
  id: string;
  name: string;
  description?: string;
  sheet_id: string;
  target_columns: string[];
  label_schema: LabelSchema;
  instructions?: string;
  ai_assist_enabled: boolean;
  ai_model?: string;
  assignment_strategy: AssignmentStrategy;
  default_batch_size: number;
  status: LabelingJobStatus;
  total_items: number;
  labeled_items: number;
  reviewed_items: number;
  approved_items: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request to create a task/batch
 */
export interface LabelingTaskCreateRequest {
  name?: string;
  item_indices: number[];
  assigned_to?: string;
  priority?: TaskPriority;
  due_date?: string;
}

/**
 * Request to create multiple tasks at once
 */
export interface LabelingTaskBulkCreateRequest {
  batch_size: number;
  assignment_strategy?: AssignmentStrategy;
  assignees?: string[]; // For round_robin or load_balanced
  priority?: TaskPriority;
}

/**
 * Request to assign a task
 */
export interface LabelingTaskAssignRequest {
  assigned_to: string;
}

/**
 * A labeling task response
 */
export interface LabelingTask {
  id: string;
  job_id: string;
  name: string;
  item_indices: number[];
  item_count: number;
  assigned_to?: string;
  assigned_at?: string;
  status: LabelingTaskStatus;
  labeled_count: number;
  started_at?: string;
  submitted_at?: string;
  reviewer?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  priority: TaskPriority;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Review action for a task
 */
export interface TaskReviewAction {
  action: "approve" | "reject" | "request_rework";
  notes?: string;
  rejection_reason?: string;
}

/**
 * Request to update labels on an item
 */
export interface LabeledItemUpdateRequest {
  human_labels: Record<string, unknown>;
}

/**
 * Request to skip an item
 */
export interface LabeledItemSkipRequest {
  skip_reason: string;
}

/**
 * Request to flag an item
 */
export interface LabeledItemFlagRequest {
  is_difficult?: boolean;
  needs_discussion?: boolean;
  flag_reason?: string;
}

/**
 * A labeled item response
 */
export interface LabeledItem {
  id: string;
  task_id: string;
  job_id: string;
  row_index: number;
  ai_labels?: Record<string, unknown>;
  ai_confidence?: number;
  human_labels?: Record<string, unknown>;
  labeled_by?: string;
  labeled_at?: string;
  status: LabeledItemStatus;
  review_status?: ReviewStatus;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  is_difficult: boolean;
  needs_discussion: boolean;
  skip_reason?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request to bulk label items
 */
export interface BulkLabelRequest {
  items: Array<{
    row_index: number;
    human_labels: Record<string, unknown>;
  }>;
}

/**
 * Request to create a workspace user
 */
export interface WorkspaceUserCreateRequest {
  email: string;
  display_name: string;
  role?: LabelingUserRole;
  max_concurrent_tasks?: number;
}

/**
 * Request to update a workspace user
 */
export interface WorkspaceUserUpdateRequest {
  display_name?: string;
  role?: LabelingUserRole;
  max_concurrent_tasks?: number;
  is_active?: boolean;
}

/**
 * A workspace user response
 */
export interface WorkspaceUser {
  id: string;
  email: string;
  display_name: string;
  role: LabelingUserRole;
  max_concurrent_tasks: number;
  current_task_count: number;
  total_labeled: number;
  total_reviewed: number;
  accuracy_score?: number;
  avg_time_per_item?: number;
  is_active: boolean;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * User performance statistics
 */
export interface UserStats {
  user_id: string;
  total_labeled: number;
  total_reviewed: number;
  tasks_completed: number;
  tasks_rejected: number;
  accuracy_score?: number;
  avg_time_per_item?: number;
  labels_this_week: number;
  labels_this_month: number;
}

/**
 * List response with pagination
 */
export interface LabelingJobListResponse {
  jobs: LabelingJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface LabelingTaskListResponse {
  tasks: LabelingTask[];
  total: number;
  page: number;
  page_size: number;
}

export interface LabeledItemListResponse {
  items: LabeledItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface WorkspaceUserListResponse {
  users: WorkspaceUser[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Example Store Types (Few-shot Learning)
// ============================================================================

/**
 * Domain categories for examples
 */
export type ExampleDomain =
  | "defect_detection"
  | "predictive_maintenance"
  | "anomaly_detection"
  | "calibration"
  | "document_extraction"
  | "general";

/**
 * Difficulty level of examples
 */
export type ExampleDifficulty = "easy" | "medium" | "hard";

/**
 * Source of example data
 */
export type ExampleSource =
  | "human_authored"
  | "synthetic"
  | "production_captured"
  | "feedback_derived";

/**
 * A few-shot example for training or inference
 */
export interface ExampleRecord {
  example_id: string;
  version: number;
  input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  explanation?: string;
  databit_id?: string;
  databit_name?: string;
  domain: ExampleDomain | string;
  function_name?: string;
  difficulty: ExampleDifficulty;
  capability_tags?: string[];
  search_keys?: string[];
  has_embedding: boolean;
  quality_score?: number;
  usage_count: number;
  effectiveness_score?: number;
  source: ExampleSource;
  attribution_notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request to create a new example
 */
export interface ExampleCreateRequest {
  input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  explanation?: string;
  databit_id?: string;
  domain?: ExampleDomain | string;
  function_name?: string;
  difficulty?: ExampleDifficulty;
  capability_tags?: string[];
  search_keys?: string[];
  source?: ExampleSource;
  attribution_notes?: string;
}

/**
 * Request to update an example
 */
export interface ExampleUpdateRequest {
  input?: Record<string, unknown>;
  expected_output?: Record<string, unknown>;
  explanation?: string;
  databit_id?: string;
  domain?: ExampleDomain | string;
  function_name?: string;
  difficulty?: ExampleDifficulty;
  capability_tags?: string[];
  search_keys?: string[];
  source?: ExampleSource;
  attribution_notes?: string;
  quality_score?: number;
}

/**
 * Search query for examples
 */
export interface ExampleSearchQuery {
  query_text?: string;
  query_embedding?: number[];
  databit_id?: string;
  domain?: ExampleDomain | string;
  function_name?: string;
  difficulty?: ExampleDifficulty;
  capability_tags?: string[];
  min_quality_score?: number;
  min_effectiveness_score?: number;
  k?: number;
  sort_by?: string;
  sort_desc?: boolean;
}

/**
 * Search result with similarity score
 */
export interface ExampleSearchResult {
  example: ExampleRecord;
  similarity_score?: number;
  match_type: "embedding" | "text" | "metadata";
}

/**
 * Response from example search
 */
export interface ExampleSearchResponse {
  results: ExampleSearchResult[];
  total_matches: number;
  query_embedding_generated: boolean;
  search_type: string;
}

/**
 * Effectiveness statistics for an example
 */
export interface ExampleEffectivenessStats {
  example_id: string;
  total_uses: number;
  success_count: number;
  failure_count: number;
  success_rate?: number;
  effectiveness_score?: number;
  effectiveness_trend?: string;
  last_used_at?: string;
}

// -----------------------------------------------------------------------------
// Dashboard Aggregation Types
// -----------------------------------------------------------------------------

/**
 * Daily usage data point for time series charts
 */
export interface DailyUsagePoint {
  date: string;
  uses: number;
  successes: number;
  failures: number;
}

/**
 * Domain breakdown for dashboard
 */
export interface DomainEffectiveness {
  domain: string;
  example_count: number;
  total_uses: number;
  success_rate?: number;
  avg_effectiveness?: number;
}

/**
 * Function breakdown for dashboard
 */
export interface FunctionEffectiveness {
  function_name: string;
  example_count: number;
  total_uses: number;
  success_rate?: number;
  avg_effectiveness?: number;
}

/**
 * Example with ranking info for top/bottom lists
 */
export interface ExampleRankingItem {
  example_id: string;
  domain: string;
  function_name?: string;
  explanation?: string;
  effectiveness_score?: number;
  usage_count: number;
  success_rate?: number;
}

/**
 * Aggregated dashboard statistics
 */
export interface EffectivenessDashboardStats {
  total_examples: number;
  examples_with_usage: number;
  total_uses: number;
  total_successes: number;
  total_failures: number;
  overall_success_rate?: number;
  avg_effectiveness_score?: number;
  period_days: number;
  domain_breakdown: DomainEffectiveness[];
  function_breakdown: FunctionEffectiveness[];
  daily_usage: DailyUsagePoint[];
  top_examples: ExampleRankingItem[];
  bottom_examples: ExampleRankingItem[];
  stale_examples_count: number;
}

/**
 * Request to create examples in batch
 */
export interface ExampleBatchCreateRequest {
  examples: ExampleCreateRequest[];
  generate_embeddings?: boolean;
}

/**
 * Response from batch create
 */
export interface ExampleBatchCreateResponse {
  created_count: number;
  failed_count: number;
  created_ids: string[];
  errors?: Array<{ index: string; error: string }>;
}

/**
 * List response with pagination
 */
export interface ExampleListResponse {
  examples: ExampleRecord[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Domain options for UI
 */
export const EXAMPLE_DOMAINS: { id: ExampleDomain; label: string }[] = [
  { id: "defect_detection", label: "Defect Detection" },
  { id: "predictive_maintenance", label: "Predictive Maintenance" },
  { id: "anomaly_detection", label: "Anomaly Detection" },
  { id: "calibration", label: "Calibration" },
  { id: "document_extraction", label: "Document Extraction" },
  { id: "general", label: "General" },
];

/**
 * Difficulty options for UI
 */
export const EXAMPLE_DIFFICULTIES: {
  id: ExampleDifficulty;
  label: string;
  color: string;
}[] = [
  { id: "easy", label: "Easy", color: "green" },
  { id: "medium", label: "Medium", color: "amber" },
  { id: "hard", label: "Hard", color: "red" },
];

// ============================================================================
// DSPy Integration Types
// ============================================================================

/**
 * DSPy optimizer types
 */
export type DSPyOptimizerType =
  | "BootstrapFewShot"
  | "BootstrapFewShotWithRandomSearch"
  | "MIPRO"
  | "COPRO"
  | "KNNFewShot";

/**
 * Optimization run status
 */
export type OptimizationRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Export format options
 */
export type DSPyExportFormat = "python_module" | "json_config" | "notebook";

/**
 * DSPy field specification
 */
export interface DSPyFieldSpec {
  name: string;
  description: string;
  field_type: string;
  prefix?: string;
  required: boolean;
}

/**
 * DSPy Signature definition
 */
export interface DSPySignature {
  signature_name: string;
  docstring: string;
  input_fields: DSPyFieldSpec[];
  output_fields: DSPyFieldSpec[];
  databit_id?: string;
  databit_version?: string;
}

/**
 * DSPy example for training
 */
export interface DSPyExample {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  example_id?: string;
  effectiveness_score?: number;
}

/**
 * DSPy module configuration
 */
export interface DSPyModuleConfig {
  module_type: string;
  signature_name: string;
  num_examples: number;
  temperature: number;
  max_tokens: number;
}

/**
 * Complete DSPy program
 */
export interface DSPyProgram {
  program_name: string;
  description: string;
  signature: DSPySignature;
  module_config: DSPyModuleConfig;
  training_examples: DSPyExample[];
  model_name: string;
  databit_id?: string;
  example_ids: string[];
}

/**
 * Optimization configuration
 */
export interface OptimizationConfig {
  optimizer_type: DSPyOptimizerType;
  max_bootstrapped_demos: number;
  max_labeled_demos: number;
  num_candidate_programs: number;
  num_trials: number;
  metric_name: string;
  max_runtime_minutes: number;
}

/**
 * Request to create optimization run
 */
export interface OptimizationRunCreate {
  databit_id: string;
  config: OptimizationConfig;
  example_ids?: string[];
  eval_dataset_id?: string;
}

/**
 * Optimization trial result
 */
export interface OptimizationTrialResult {
  trial_id: number;
  score: number;
  metrics: Record<string, number>;
  examples_used: string[];
  prompt_version?: string;
  timestamp: string;
}

/**
 * Optimization run response
 */
export interface OptimizationRunResponse {
  run_id: string;
  mlflow_run_id?: string;
  status: OptimizationRunStatus;
  databit_id: string;
  program_name: string;
  trials_completed: number;
  trials_total: number;
  current_best_score?: number;
  started_at?: string;
  estimated_completion?: string;
  best_score?: number;
  top_example_ids: string[];
}

/**
 * DSPy export request
 */
export interface DSPyExportRequest {
  databit_id: string;
  format: DSPyExportFormat;
  include_examples: boolean;
  max_examples: number;
  min_effectiveness: number;
  include_metrics: boolean;
  include_optimizer_setup: boolean;
}

/**
 * DSPy export result
 */
export interface DSPyExportResult {
  databit_id: string;
  databit_name: string;
  format: DSPyExportFormat;
  signature_code: string;
  program_code: string;
  examples_json?: string;
  num_examples_included: number;
  example_ids: string[];
  generated_at: string;
  is_valid: boolean;
  validation_errors: string[];
}

/**
 * Default optimization config
 */
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  optimizer_type: "BootstrapFewShot",
  max_bootstrapped_demos: 4,
  max_labeled_demos: 16,
  num_candidate_programs: 10,
  num_trials: 100,
  metric_name: "accuracy",
  max_runtime_minutes: 60,
};

/**
 * Optimizer options for UI
 */
export const DSPY_OPTIMIZERS: {
  id: DSPyOptimizerType;
  label: string;
  description: string;
}[] = [
  {
    id: "BootstrapFewShot",
    label: "Bootstrap Few-Shot",
    description: "Basic few-shot optimization",
  },
  {
    id: "BootstrapFewShotWithRandomSearch",
    label: "Bootstrap + Random Search",
    description: "Few-shot with hyperparameter search",
  },
  {
    id: "MIPRO",
    label: "MIPRO",
    description: "Multi-stage instruction optimization",
  },
  {
    id: "COPRO",
    label: "COPRO",
    description: "Collaborative prompt optimization",
  },
  {
    id: "KNNFewShot",
    label: "KNN Few-Shot",
    description: "K-nearest neighbor example selection",
  },
];

// ============================================================================
// Training Jobs (TRAIN Stage)
// ============================================================================

export type TrainingJobStatus = 
  | "pending" 
  | "queued" 
  | "running" 
  | "succeeded" 
  | "failed" 
  | "cancelled" 
  | "timeout";

export interface TrainingJob {
  id: string;
  training_sheet_id: string;
  training_sheet_name?: string;
  model_name: string;
  base_model: string;
  status: TrainingJobStatus;
  training_config: Record<string, any>;
  train_val_split: number;
  
  // Counts (calculated by backend)
  total_pairs: number;
  train_pairs: number;
  val_pairs: number;
  
  // Progress tracking
  progress_percent: number;
  current_epoch?: number;
  total_epochs?: number;
  
  // External IDs
  fmapi_job_id?: string;
  fmapi_run_id?: string;
  mlflow_experiment_id?: string;
  mlflow_run_id?: string;
  
  // Unity Catalog registration
  register_to_uc: boolean;
  uc_model_name?: string;
  uc_model_version?: string;
  
  // Metrics (populated on completion)
  metrics?: Record<string, any>;
  
  // Error handling
  error_message?: string;
  error_details?: Record<string, any>;
  
  // Timestamps
  created_at?: string;
  created_by?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface TrainingJobCreateRequest {
  training_sheet_id: string;
  model_name: string;
  base_model: string;
  training_config: Record<string, any>;
  train_val_split: number;
  register_to_uc?: boolean;
  uc_catalog?: string;
  uc_schema?: string;
}

export interface TrainingJobListResponse {
  jobs: TrainingJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrainingJobMetrics {
  job_id: string;
  train_loss?: number;
  val_loss?: number;
  train_accuracy?: number;
  val_accuracy?: number;
  learning_rate?: number;
  epochs_completed?: number;
  training_duration_seconds?: number;
  tokens_processed?: number;
  cost_dbu?: number;
  custom_metrics?: Record<string, any>;
}

export interface TrainingJobEvent {
  id: string;
  job_id: string;
  event_type: string;
  old_status?: string;
  new_status?: string;
  event_data?: Record<string, any>;
  message?: string;
  created_at: string;
}

export interface TrainingJobEventsResponse {
  events: TrainingJobEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrainingJobLineage {
  job_id: string;
  training_sheet_id: string;
  training_sheet_name?: string;
  sheet_id?: string;
  sheet_name?: string;
  template_id?: string;
  template_name?: string;
  model_name: string;
  model_version?: string;
  qa_pair_ids: string[];
  canonical_label_ids: string[];
}

export interface TrainingJobCancelRequest {
  reason?: string;
}

// Available base models for training
export const AVAILABLE_TRAINING_MODELS = [
  {
    id: "databricks-meta-llama-3-1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    description: "Best quality, higher cost",
    recommended: false,
  },
  {
    id: "databricks-meta-llama-3-1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    description: "Good balance of quality and speed",
    recommended: true,
  },
  {
    id: "databricks-dbrx-instruct",
    name: "DBRX Instruct",
    description: "Databricks native model",
    recommended: false,
  },
  {
    id: "databricks-mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    description: "Strong reasoning capabilities",
    recommended: false,
  },
] as const;
