/**
 * API service for Databits Workbench
 */

import type {
  AppConfig,
  Template,
  CurationItem,
  CurationStats,
  JobRun,
  Tool,
  Agent,
  Endpoint,
  Sheet,
  SheetPreview,
  SheetCreateRequest,
  ColumnCreateRequest,
  GenerateRequest,
  GenerateResponse,
  ExportRequest,
  ExportResponse,
  FineTuningExportRequest,
  FineTuningExportResponse,
  ColumnDefinition,
  // Template Config & Assembly types (GCP pattern)
  TemplateConfig,
  TemplateConfigAttachRequest,
  AssembleRequest,
  AssembleResponse,
  AssembledDataset,
  AssembledRow,
  AssemblyPreviewResponse,
  AssembledRowUpdateRequest,
  AssemblyGenerateRequest,
  AssemblyGenerateResponse,
  AssemblyExportRequest,
  AssemblyExportResponse,
  // Labeling types
  LabelingJob,
  LabelingJobCreateRequest,
  LabelingJobUpdateRequest,
  LabelingJobStats,
  LabelingJobListResponse,
  LabelingTask,
  LabelingTaskCreateRequest,
  LabelingTaskBulkCreateRequest,
  LabelingTaskAssignRequest,
  LabelingTaskListResponse,
  TaskReviewAction,
  LabeledItem,
  LabeledItemUpdateRequest,
  LabeledItemSkipRequest,
  LabeledItemFlagRequest,
  LabeledItemListResponse,
  BulkLabelRequest,
  WorkspaceUser,
  WorkspaceUserCreateRequest,
  WorkspaceUserUpdateRequest,
  WorkspaceUserListResponse,
  UserStats,
} from "../types";

const API_BASE = "/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Config
// ============================================================================

export async function getConfig(): Promise<AppConfig> {
  return fetchJson<AppConfig>("/api/config");
}

// ============================================================================
// Templates
// ============================================================================

export async function listTemplates(params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  templates: Template[];
  total: number;
  page: number;
  page_size: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/templates${query ? `?${query}` : ""}`);
}

export async function getTemplate(id: string): Promise<Template> {
  return fetchJson(`${API_BASE}/templates/${id}`);
}

export async function createTemplate(
  data: Partial<Template>,
): Promise<Template> {
  return fetchJson(`${API_BASE}/templates`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: Partial<Template>,
): Promise<Template> {
  return fetchJson(`${API_BASE}/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function publishTemplate(id: string): Promise<Template> {
  return fetchJson(`${API_BASE}/templates/${id}/publish`, { method: "POST" });
}

export async function archiveTemplate(id: string): Promise<Template> {
  return fetchJson(`${API_BASE}/templates/${id}/archive`, { method: "POST" });
}

export async function createTemplateVersion(id: string): Promise<Template> {
  return fetchJson(`${API_BASE}/templates/${id}/version`, { method: "POST" });
}

export async function deleteTemplate(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/templates/${id}`, { method: "DELETE" });
}

// ============================================================================
// Curation
// ============================================================================

export async function listCurationItems(
  templateId: string,
  params?: { status?: string; page?: number; page_size?: number },
): Promise<{
  items: CurationItem[];
  total: number;
  page: number;
  page_size: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/curation/templates/${templateId}/items${query ? `?${query}` : ""}`,
  );
}

export async function getCurationStats(
  templateId: string,
): Promise<CurationStats> {
  return fetchJson(`${API_BASE}/curation/templates/${templateId}/stats`);
}

export async function updateCurationItem(
  itemId: string,
  data: Partial<CurationItem>,
): Promise<CurationItem> {
  return fetchJson(`${API_BASE}/curation/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function bulkUpdateCurationItems(
  itemIds: string[],
  status: string,
  reviewNotes?: string,
): Promise<{ updated: number; status: string }> {
  return fetchJson(`${API_BASE}/curation/items/bulk`, {
    method: "POST",
    body: JSON.stringify({
      item_ids: itemIds,
      status,
      review_notes: reviewNotes,
    }),
  });
}

export async function triggerLabeling(
  templateId: string,
  params?: { confidence_threshold?: number; model?: string },
): Promise<{ id: string; job_type: string; status: string }> {
  const searchParams = new URLSearchParams();
  if (params?.confidence_threshold)
    searchParams.set(
      "confidence_threshold",
      String(params.confidence_threshold),
    );
  if (params?.model) searchParams.set("model", params.model);

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/curation/templates/${templateId}/label${query ? `?${query}` : ""}`,
    {
      method: "POST",
    },
  );
}

// ============================================================================
// Jobs
// ============================================================================

export async function listJobTypes(): Promise<
  { type: string; name: string; stage: string }[]
> {
  return fetchJson(`${API_BASE}/jobs/catalog`);
}

export async function triggerJob(
  jobType: string,
  config: Record<string, unknown>,
  refs?: { template_id?: string; model_id?: string; endpoint_id?: string },
): Promise<JobRun> {
  return fetchJson(`${API_BASE}/jobs/${jobType}/run`, {
    method: "POST",
    body: JSON.stringify({ config, ...refs }),
  });
}

export async function listJobRuns(params?: {
  template_id?: string;
  job_type?: string;
  status?: string;
  limit?: number;
}): Promise<JobRun[]> {
  const searchParams = new URLSearchParams();
  if (params?.template_id) searchParams.set("template_id", params.template_id);
  if (params?.job_type) searchParams.set("job_type", params.job_type);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/jobs/runs${query ? `?${query}` : ""}`);
}

export async function getJobRun(runId: string): Promise<JobRun> {
  return fetchJson(`${API_BASE}/jobs/runs/${runId}`);
}

export async function cancelJobRun(runId: string): Promise<JobRun> {
  return fetchJson(`${API_BASE}/jobs/runs/${runId}/cancel`, { method: "POST" });
}

// ============================================================================
// Registries - Tools
// ============================================================================

export async function listTools(params?: {
  status?: string;
  search?: string;
}): Promise<Tool[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/registries/tools${query ? `?${query}` : ""}`);
}

export async function getTool(id: string): Promise<Tool> {
  return fetchJson(`${API_BASE}/registries/tools/${id}`);
}

export async function createTool(data: Partial<Tool>): Promise<Tool> {
  return fetchJson(`${API_BASE}/registries/tools`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTool(
  id: string,
  data: Partial<Tool>,
): Promise<Tool> {
  return fetchJson(`${API_BASE}/registries/tools/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTool(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/registries/tools/${id}`, { method: "DELETE" });
}

// ============================================================================
// Registries - Agents
// ============================================================================

export async function listAgents(params?: {
  status?: string;
  search?: string;
}): Promise<Agent[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/registries/agents${query ? `?${query}` : ""}`);
}

export async function getAgent(id: string): Promise<Agent> {
  return fetchJson(`${API_BASE}/registries/agents/${id}`);
}

export async function createAgent(data: Partial<Agent>): Promise<Agent> {
  return fetchJson(`${API_BASE}/registries/agents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAgent(
  id: string,
  data: Partial<Agent>,
): Promise<Agent> {
  return fetchJson(`${API_BASE}/registries/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/registries/agents/${id}`, { method: "DELETE" });
}

// ============================================================================
// Registries - Endpoints
// ============================================================================

export async function listEndpoints(params?: {
  status?: string;
  endpoint_type?: string;
}): Promise<Endpoint[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.endpoint_type)
    searchParams.set("endpoint_type", params.endpoint_type);

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/registries/endpoints${query ? `?${query}` : ""}`,
  );
}

export async function getEndpoint(id: string): Promise<Endpoint> {
  return fetchJson(`${API_BASE}/registries/endpoints/${id}`);
}

export async function createEndpoint(
  data: Partial<Endpoint>,
): Promise<Endpoint> {
  return fetchJson(`${API_BASE}/registries/endpoints`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEndpoint(
  id: string,
  data: Partial<Endpoint>,
): Promise<Endpoint> {
  return fetchJson(`${API_BASE}/registries/endpoints/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEndpoint(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/registries/endpoints/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Feedback
// ============================================================================

export interface FeedbackItem {
  id: string;
  endpoint_id: string;
  input_text: string;
  output_text: string;
  rating: "positive" | "negative";
  feedback_text?: string;
  session_id?: string;
  request_id?: string;
  created_by?: string;
  created_at: string;
}

export interface FeedbackStats {
  endpoint_id?: string;
  total_count: number;
  positive_count: number;
  negative_count: number;
  positive_rate: number;
  with_comments_count: number;
  period_days: number;
}

export async function createFeedback(data: {
  endpoint_id: string;
  input_text: string;
  output_text: string;
  rating: "positive" | "negative";
  feedback_text?: string;
}): Promise<FeedbackItem> {
  return fetchJson(`${API_BASE}/feedback`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listFeedback(params?: {
  endpoint_id?: string;
  rating?: "positive" | "negative";
  page?: number;
  page_size?: number;
}): Promise<{
  items: FeedbackItem[];
  total: number;
  page: number;
  page_size: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.endpoint_id) searchParams.set("endpoint_id", params.endpoint_id);
  if (params?.rating) searchParams.set("rating", params.rating);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/feedback${query ? `?${query}` : ""}`);
}

export async function getFeedbackStats(params?: {
  endpoint_id?: string;
  days?: number;
}): Promise<FeedbackStats> {
  const searchParams = new URLSearchParams();
  if (params?.endpoint_id) searchParams.set("endpoint_id", params.endpoint_id);
  if (params?.days) searchParams.set("days", String(params.days));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/feedback/stats${query ? `?${query}` : ""}`);
}

export async function convertFeedbackToCuration(
  feedbackId: string,
  templateId: string,
): Promise<{ status: string; curation_item_id: string; template_id: string }> {
  return fetchJson(
    `${API_BASE}/feedback/${feedbackId}/to-curation?template_id=${templateId}`,
    {
      method: "POST",
    },
  );
}

// ============================================================================
// Gaps
// ============================================================================

export interface Gap {
  id: string;
  model_name: string;
  description: string;
  category: string;
  severity: "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved" | "wont_fix";
  occurrence_count: number;
  suggested_action?: string;
  created_at: string;
}

export async function listGaps(params?: {
  model_name?: string;
  severity?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<{ gaps: Gap[]; total: number; page: number; page_size: number }> {
  const searchParams = new URLSearchParams();
  if (params?.model_name) searchParams.set("model_name", params.model_name);
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/gaps${query ? `?${query}` : ""}`);
}

// ============================================================================
// Unity Catalog Browser
// ============================================================================

export interface UCCatalog {
  name: string;
  comment?: string;
  owner?: string;
}

export interface UCSchema {
  name: string;
  catalog_name: string;
  comment?: string;
  owner?: string;
}

export interface UCTable {
  name: string;
  catalog_name: string;
  schema_name: string;
  table_type: string;
  comment?: string;
  columns?: { name: string; type: string; comment?: string }[];
}

export interface UCVolume {
  name: string;
  catalog_name: string;
  schema_name: string;
  volume_type: string;
  comment?: string;
}

export interface UCVolumeFile {
  path: string;
  name: string;
  is_dir: boolean;
  size?: number;
}

export async function listCatalogs(): Promise<UCCatalog[]> {
  return fetchJson(`${API_BASE}/uc/catalogs`);
}

export async function listSchemas(catalogName: string): Promise<UCSchema[]> {
  return fetchJson(`${API_BASE}/uc/catalogs/${catalogName}/schemas`);
}

export async function listTables(
  catalogName: string,
  schemaName: string,
): Promise<UCTable[]> {
  return fetchJson(
    `${API_BASE}/uc/catalogs/${catalogName}/schemas/${schemaName}/tables`,
  );
}

export async function listVolumes(
  catalogName: string,
  schemaName: string,
): Promise<UCVolume[]> {
  return fetchJson(
    `${API_BASE}/uc/catalogs/${catalogName}/schemas/${schemaName}/volumes`,
  );
}

export async function listVolumeFiles(
  catalogName: string,
  schemaName: string,
  volumeName: string,
  path: string = "/",
): Promise<UCVolumeFile[]> {
  const params = new URLSearchParams({ path });
  return fetchJson(
    `${API_BASE}/uc/volumes/${catalogName}/${schemaName}/${volumeName}/files?${params}`,
  );
}

export async function previewTable(
  catalogName: string,
  schemaName: string,
  tableName: string,
  limit: number = 10,
): Promise<{ rows: Record<string, unknown>[]; count: number }> {
  return fetchJson(
    `${API_BASE}/uc/table/${catalogName}/${schemaName}/${tableName}/preview?limit=${limit}`,
  );
}

// ============================================================================
// Deployment - Model Serving
// ============================================================================

export interface UCModel {
  name: string;
  full_name: string;
  description?: string;
  created_at?: number;
  updated_at?: number;
}

export interface UCModelVersion {
  version: number;
  status: string;
  created_at?: number;
  run_id?: string;
  description?: string;
}

export interface ServingEndpoint {
  name: string;
  state: string;
  config_update?: string;
  creator?: string;
  created_at?: number;
}

export interface ServingEndpointDetail extends ServingEndpoint {
  served_entities: {
    name: string;
    entity_name: string;
    entity_version: string;
    state: string;
    scale_to_zero: boolean;
  }[];
}

export interface DeploymentResult {
  deployment_id: string;
  endpoint_name: string;
  model_name: string;
  model_version: string;
  action: string;
  status: string;
  message: string;
}

export async function listModels(catalog?: string): Promise<UCModel[]> {
  const params = catalog ? `?catalog=${catalog}` : "";
  return fetchJson(`${API_BASE}/deployment/models${params}`);
}

export async function listModelVersions(
  modelName: string,
): Promise<UCModelVersion[]> {
  // URL encode the model name (it contains dots)
  const encoded = encodeURIComponent(modelName);
  return fetchJson(`${API_BASE}/deployment/models/${encoded}/versions`);
}

export async function listServingEndpoints(): Promise<ServingEndpoint[]> {
  return fetchJson(`${API_BASE}/deployment/endpoints`);
}

export async function getServingEndpointStatus(
  endpointName: string,
): Promise<ServingEndpointDetail> {
  return fetchJson(`${API_BASE}/deployment/endpoints/${endpointName}`);
}

export async function deployModel(params: {
  model_name: string;
  model_version: string;
  endpoint_name?: string;
  workload_size?: string;
  scale_to_zero?: boolean;
  environment_vars?: Record<string, string>;
}): Promise<DeploymentResult> {
  return fetchJson(`${API_BASE}/deployment/deploy`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function deleteServingEndpoint(
  endpointName: string,
): Promise<{ endpoint_name: string; status: string; message: string }> {
  return fetchJson(`${API_BASE}/deployment/endpoints/${endpointName}`, {
    method: "DELETE",
  });
}

export async function queryServingEndpoint(
  endpointName: string,
  inputs: Record<string, unknown> | Record<string, unknown>[],
): Promise<{ predictions: unknown[]; endpoint: string }> {
  return fetchJson(`${API_BASE}/deployment/endpoints/${endpointName}/query`, {
    method: "POST",
    body: JSON.stringify({ inputs }),
  });
}

// ============================================================================
// AI Sheets
// ============================================================================

/**
 * List all sheets with optional filtering
 */
export async function listSheets(params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  sheets: Sheet[];
  total: number;
  page: number;
  page_size: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/sheets${query ? `?${query}` : ""}`);
}

/**
 * Get a sheet by ID
 */
export async function getSheet(id: string): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${id}`);
}

/**
 * Create a new sheet
 */
export async function createSheet(data: SheetCreateRequest): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update a sheet's metadata
 */
export async function updateSheet(
  id: string,
  data: { name?: string; description?: string },
): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a draft sheet
 */
export async function deleteSheet(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/sheets/${id}`, { method: "DELETE" });
}

/**
 * Add a column to a sheet
 */
export async function addColumn(
  sheetId: string,
  column: ColumnCreateRequest,
): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/columns`, {
    method: "POST",
    body: JSON.stringify(column),
  });
}

/**
 * Update a column's configuration
 */
export async function updateColumn(
  sheetId: string,
  columnId: string,
  data: Partial<ColumnDefinition>,
): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/columns/${columnId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Remove a column from a sheet
 */
export async function deleteColumn(
  sheetId: string,
  columnId: string,
): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/columns/${columnId}`, {
    method: "DELETE",
  });
}

/**
 * Get preview data for a sheet (first N rows)
 */
export async function getSheetPreview(
  sheetId: string,
  limit?: number,
): Promise<SheetPreview> {
  const params = limit ? `?limit=${limit}` : "";
  return fetchJson(`${API_BASE}/sheets/${sheetId}/preview${params}`);
}

/**
 * Update a cell value (creates few-shot example for AI columns)
 */
export async function updateCell(
  sheetId: string,
  rowIndex: number,
  columnId: string,
  value: unknown,
): Promise<{ status: string; row_index: number; column_id: string }> {
  return fetchJson(
    `${API_BASE}/sheets/${sheetId}/rows/${rowIndex}/cells/${columnId}`,
    {
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  );
}

/**
 * Run AI generation on specified rows and columns
 */
export async function generateSheet(
  sheetId: string,
  request?: GenerateRequest,
): Promise<GenerateResponse> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/generate`, {
    method: "POST",
    body: JSON.stringify(request || {}),
  });
}

/**
 * Publish a sheet (makes it immutable)
 */
export async function publishSheet(id: string): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${id}/publish`, { method: "POST" });
}

/**
 * Archive a sheet
 */
export async function archiveSheet(id: string): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${id}/archive`, { method: "POST" });
}

/**
 * Export sheet data to a Delta table
 */
export async function exportSheet(
  sheetId: string,
  request: ExportRequest,
): Promise<ExportResponse> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/export`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Export sheet as fine-tuning dataset (JSONL format)
 * Creates a dataset suitable for fine-tuning LLMs with human-verified labels
 */
export async function exportForFineTuning(
  sheetId: string,
  request: FineTuningExportRequest,
): Promise<FineTuningExportResponse> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/export-finetuning`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Template Config & Assembly (GCP Vertex AI Pattern)
// ============================================================================

/**
 * Attach a template config to a sheet
 * Following GCP Vertex AI pattern: dataset.attach_template_config()
 */
export async function attachTemplateToSheet(
  sheetId: string,
  request: TemplateConfigAttachRequest,
): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/attach-template`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Remove template config from a sheet
 */
export async function detachTemplateFromSheet(sheetId: string): Promise<Sheet> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/template`, {
    method: "DELETE",
  });
}

/**
 * Get the template config attached to a sheet
 */
export async function getSheetTemplate(
  sheetId: string,
): Promise<TemplateConfig> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/template`);
}

/**
 * Assemble a sheet into prompt/response pairs
 * Following GCP Vertex AI pattern: dataset.assemble()
 */
export async function assembleSheet(
  sheetId: string,
  request?: AssembleRequest,
): Promise<AssembleResponse> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/assemble`, {
    method: "POST",
    body: JSON.stringify(request || {}),
  });
}

/**
 * List all assemblies for a sheet
 */
export async function listSheetAssemblies(
  sheetId: string,
): Promise<{ assemblies: AssembledDataset[] }> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/assemblies`);
}

/**
 * List all assemblies
 */
export async function listAssemblies(params?: {
  status?: string;
  limit?: number;
}): Promise<AssembledDataset[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.limit) query.append("limit", params.limit.toString());
  return fetchJson(
    `${API_BASE}/assemblies/list${query.toString() ? `?${query}` : ""}`,
  );
}

/**
 * Get an assembled dataset by ID
 */
export async function getAssembly(
  assemblyId: string,
): Promise<AssembledDataset> {
  return fetchJson(`${API_BASE}/assemblies/${assemblyId}`);
}

/**
 * Delete an assembled dataset
 */
export async function deleteAssembly(assemblyId: string): Promise<void> {
  return fetchJson(`${API_BASE}/assemblies/${assemblyId}`, {
    method: "DELETE",
  });
}

/**
 * Preview assembled rows with optional filtering
 */
export async function previewAssembly(
  assemblyId: string,
  params?: {
    offset?: number;
    limit?: number;
    response_source_filter?: string[];
  },
): Promise<AssemblyPreviewResponse> {
  const queryParams = new URLSearchParams();
  if (params?.offset !== undefined)
    queryParams.append("offset", String(params.offset));
  if (params?.limit !== undefined)
    queryParams.append("limit", String(params.limit));
  if (params?.response_source_filter) {
    params.response_source_filter.forEach((f) =>
      queryParams.append("response_source_filter", f),
    );
  }
  const query = queryParams.toString();
  return fetchJson(
    `${API_BASE}/assemblies/${assemblyId}/preview${query ? `?${query}` : ""}`,
  );
}

/**
 * Update an assembled row (for labeling/verification)
 */
export async function updateAssembledRow(
  assemblyId: string,
  rowIndex: number,
  request: AssembledRowUpdateRequest,
): Promise<AssembledRow> {
  return fetchJson(`${API_BASE}/assemblies/${assemblyId}/rows/${rowIndex}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Generate AI responses for assembled rows
 */
export async function generateAssemblyResponses(
  assemblyId: string,
  request?: AssemblyGenerateRequest,
): Promise<AssemblyGenerateResponse> {
  return fetchJson(`${API_BASE}/assemblies/${assemblyId}/generate`, {
    method: "POST",
    body: JSON.stringify(request || {}),
  });
}

/**
 * Export assembly for fine-tuning
 */
export async function exportAssembly(
  assemblyId: string,
  request: AssemblyExportRequest,
): Promise<AssemblyExportResponse> {
  return fetchJson(`${API_BASE}/assemblies/${assemblyId}/export`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ============================================================================
// Labeling Workflow
// ============================================================================

// --- Labeling Jobs ---

/**
 * Create a new labeling job from a sheet
 */
export async function createLabelingJob(
  data: LabelingJobCreateRequest,
): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * List all labeling jobs with optional filtering
 */
export async function listLabelingJobs(params?: {
  status?: string;
  sheet_id?: string;
  offset?: number;
  limit?: number;
}): Promise<LabelingJobListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.sheet_id) searchParams.set("sheet_id", params.sheet_id);
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/labeling/jobs${query ? `?${query}` : ""}`);
}

/**
 * Get a labeling job by ID
 */
export async function getLabelingJob(jobId: string): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}`);
}

/**
 * Update a labeling job's configuration
 */
export async function updateLabelingJob(
  jobId: string,
  data: LabelingJobUpdateRequest,
): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a labeling job (only draft jobs)
 */
export async function deleteLabelingJob(jobId: string): Promise<void> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}`, { method: "DELETE" });
}

/**
 * Start a labeling job (creates tasks from items)
 */
export async function startLabelingJob(jobId: string): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/start`, {
    method: "POST",
  });
}

/**
 * Pause an active labeling job
 */
export async function pauseLabelingJob(jobId: string): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/pause`, {
    method: "POST",
  });
}

/**
 * Resume a paused labeling job
 */
export async function resumeLabelingJob(jobId: string): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/resume`, {
    method: "POST",
  });
}

/**
 * Mark a labeling job as complete
 */
export async function completeLabelingJob(jobId: string): Promise<LabelingJob> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/complete`, {
    method: "POST",
  });
}

/**
 * Get statistics for a labeling job
 */
export async function getLabelingJobStats(
  jobId: string,
): Promise<LabelingJobStats> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/stats`);
}

// --- Labeling Tasks ---

/**
 * List tasks for a labeling job
 */
export async function listLabelingTasks(
  jobId: string,
  params?: {
    status?: string;
    assigned_to?: string;
    offset?: number;
    limit?: number;
  },
): Promise<LabelingTaskListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.assigned_to) searchParams.set("assigned_to", params.assigned_to);
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/labeling/jobs/${jobId}/tasks${query ? `?${query}` : ""}`,
  );
}

/**
 * Create a single task in a job
 */
export async function createLabelingTask(
  jobId: string,
  data: LabelingTaskCreateRequest,
): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Create multiple tasks in bulk (auto-batching)
 */
export async function bulkCreateLabelingTasks(
  jobId: string,
  data: LabelingTaskBulkCreateRequest,
): Promise<LabelingTask[]> {
  return fetchJson(`${API_BASE}/labeling/jobs/${jobId}/tasks/bulk`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get a task by ID
 */
export async function getLabelingTask(taskId: string): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}`);
}

/**
 * Assign a task to a user
 */
export async function assignLabelingTask(
  taskId: string,
  data: LabelingTaskAssignRequest,
): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Claim a task (self-assign as current user)
 */
export async function claimLabelingTask(taskId: string): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/claim`, {
    method: "POST",
  });
}

/**
 * Release a task (unassign)
 */
export async function releaseLabelingTask(
  taskId: string,
): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/release`, {
    method: "POST",
  });
}

/**
 * Start working on a task
 */
export async function startLabelingTask(taskId: string): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/start`, {
    method: "POST",
  });
}

/**
 * Submit a task for review
 */
export async function submitLabelingTask(
  taskId: string,
): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/submit`, {
    method: "POST",
  });
}

/**
 * Review a task (approve, reject, or request rework)
 */
export async function reviewLabelingTask(
  taskId: string,
  action: TaskReviewAction,
): Promise<LabelingTask> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/review`, {
    method: "POST",
    body: JSON.stringify(action),
  });
}

// --- Labeled Items ---

/**
 * List items in a task
 */
export async function listLabeledItems(
  taskId: string,
  params?: {
    status?: string;
    offset?: number;
    limit?: number;
  },
): Promise<LabeledItemListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/labeling/tasks/${taskId}/items${query ? `?${query}` : ""}`,
  );
}

/**
 * Get a single item by ID
 */
export async function getLabeledItem(itemId: string): Promise<LabeledItem> {
  return fetchJson(`${API_BASE}/labeling/items/${itemId}`);
}

/**
 * Update labels on an item
 */
export async function labelItem(
  itemId: string,
  data: LabeledItemUpdateRequest,
): Promise<LabeledItem> {
  return fetchJson(`${API_BASE}/labeling/items/${itemId}/label`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Skip an item with a reason
 */
export async function skipItem(
  itemId: string,
  data: LabeledItemSkipRequest,
): Promise<LabeledItem> {
  return fetchJson(`${API_BASE}/labeling/items/${itemId}/skip`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Flag an item as difficult or needing discussion
 */
export async function flagItem(
  itemId: string,
  data: LabeledItemFlagRequest,
): Promise<LabeledItem> {
  return fetchJson(`${API_BASE}/labeling/items/${itemId}/flag`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Bulk label multiple items at once
 */
export async function bulkLabelItems(
  taskId: string,
  data: BulkLabelRequest,
): Promise<{ labeled_count: number }> {
  return fetchJson(`${API_BASE}/labeling/tasks/${taskId}/items/bulk-label`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Workspace Users ---

/**
 * List workspace users
 */
export async function listWorkspaceUsers(params?: {
  role?: string;
  is_active?: boolean;
  offset?: number;
  limit?: number;
}): Promise<WorkspaceUserListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.is_active !== undefined)
    searchParams.set("is_active", String(params.is_active));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/labeling/users${query ? `?${query}` : ""}`);
}

/**
 * Create a new workspace user
 */
export async function createWorkspaceUser(
  data: WorkspaceUserCreateRequest,
): Promise<WorkspaceUser> {
  return fetchJson(`${API_BASE}/labeling/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get the current user's profile
 */
export async function getCurrentWorkspaceUser(): Promise<WorkspaceUser> {
  return fetchJson(`${API_BASE}/labeling/users/me`);
}

/**
 * Get a user by ID
 */
export async function getWorkspaceUser(userId: string): Promise<WorkspaceUser> {
  return fetchJson(`${API_BASE}/labeling/users/${userId}`);
}

/**
 * Update a user's profile
 */
export async function updateWorkspaceUser(
  userId: string,
  data: WorkspaceUserUpdateRequest,
): Promise<WorkspaceUser> {
  return fetchJson(`${API_BASE}/labeling/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Get a user's statistics
 */
export async function getWorkspaceUserStats(
  userId: string,
): Promise<UserStats> {
  return fetchJson(`${API_BASE}/labeling/users/${userId}/stats`);
}

/**
 * Get a user's assigned tasks
 */
export async function getWorkspaceUserTasks(
  userId: string,
  params?: {
    status?: string;
    offset?: number;
    limit?: number;
  },
): Promise<LabelingTaskListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchJson(
    `${API_BASE}/labeling/users/${userId}/tasks${query ? `?${query}` : ""}`,
  );
}
