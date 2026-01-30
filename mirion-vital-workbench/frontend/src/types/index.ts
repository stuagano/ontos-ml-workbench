// Pipeline stages
export type PipelineStage =
  | "data"
  | "template"
  | "curate"
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
  | "manual_labeling";

/**
 * Template configuration attached to a Sheet
 * Defines how to transform sheet data into prompt/response pairs
 */
export interface TemplateConfig {
  system_instruction?: string;
  prompt_template: string; // Uses {{column_name}} syntax
  response_source_mode: ResponseSourceMode; // How to get responses
  response_column?: string; // Column to use as expected response (for existing_column mode)
  response_schema?: ResponseSchemaField[];
  model: string;
  temperature: number;
  max_tokens: number;
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
  | "human_verified";

/**
 * A single assembled row with rendered prompt and response
 */
export interface AssembledRow {
  row_index: number;
  prompt: string;
  source_data: Record<string, unknown>;
  response?: string;
  response_source: ResponseSource;
  labeled_by?: string;
  labeled_at?: string;
  verified_by?: string;
  verified_at?: string;
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
  response_source_filter?: ResponseSource[];
}

/**
 * Response from assembly preview
 */
export interface AssemblyPreviewResponse {
  assembly_id: string;
  rows: AssembledRow[];
  total_rows: number;
  offset: number;
  limit: number;
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
}

/**
 * Response from assembly export
 */
export interface AssemblyExportResponse {
  assembly_id: string;
  volume_path: string;
  format: ExportFormat;
  examples_exported: number;
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
