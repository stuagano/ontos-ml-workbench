/**
 * Governance API service - Roles, Teams, Data Domains, and Asset Reviews
 */

import type {
  AppRole,
  UserRoleAssignment,
  CurrentUserInfo,
  Team,
  TeamMember,
  TeamMetadata,
  DataDomain,
  DomainTreeNode,
  AssetReview,
  AssetType,
  ReviewStatus,
  Project,
  ProjectMember,
  ProjectType,
  DataContract,
  ContractStatus,
  ContractColumnSpec,
  ContractQualityRule,
  ContractTerms,
  CompliancePolicy,
  PolicyCategory,
  PolicyRuleCondition,
  PolicyScope,
  PolicyEvaluation,
  Workflow,
  WorkflowStep,
  WorkflowTriggerConfig,
  WorkflowTriggerType,
  WorkflowExecution,
  DataProduct,
  DataProductPort,
  DataProductType,
  DataProductStatus,
  DataProductSubscription,
  SemanticModel,
  SemanticModelStatus,
  SemanticConcept,
  SemanticProperty,
  SemanticLink,
  NamingConvention,
  NamingEntityType,
  NamingValidationResult,
  MarketplaceProduct,
  MarketplaceSearchResult,
  MarketplaceSearchParams,
  MarketplaceStats,
  DeliveryMode,
  DeliveryRecord,
  MCPToken,
  MCPTokenCreateResult,
  MCPTool,
  MCPInvocation,
  MCPStats,
  PlatformConnector,
  ConnectorAsset,
  ConnectorSyncRecord,
  ConnectorStats,
  LineageGraph,
  LineageEdge,
  MaterializeResult,
  TraversalResult,
  ImpactReport,
} from "../types/governance";

const API_BASE = "/api/v1/governance";
const DEFAULT_TIMEOUT = 30000;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - please try again");
    }
    throw error;
  }
}

// ============================================================================
// Roles
// ============================================================================

export async function listRoles(): Promise<AppRole[]> {
  return fetchJson(`${API_BASE}/roles`);
}

export async function getRole(roleId: string): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles/${roleId}`);
}

export async function createRole(
  data: Partial<AppRole>,
): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  roleId: string,
  data: Partial<AppRole>,
): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles/${roleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  return fetchJson(`${API_BASE}/roles/${roleId}`, { method: "DELETE" });
}

// ============================================================================
// Users
// ============================================================================

export async function listUserAssignments(): Promise<UserRoleAssignment[]> {
  return fetchJson(`${API_BASE}/users`);
}

export async function getCurrentUser(): Promise<CurrentUserInfo> {
  return fetchJson(`${API_BASE}/users/me`);
}

export async function assignUserRole(data: {
  user_email: string;
  user_display_name?: string;
  role_id: string;
}): Promise<UserRoleAssignment> {
  return fetchJson(`${API_BASE}/users/assign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Teams
// ============================================================================

export async function listTeams(): Promise<Team[]> {
  return fetchJson(`${API_BASE}/teams`);
}

export async function getTeam(teamId: string): Promise<Team> {
  return fetchJson(`${API_BASE}/teams/${teamId}`);
}

export async function createTeam(
  data: { name: string; description?: string; domain_id?: string; leads?: string[]; metadata?: TeamMetadata },
): Promise<Team> {
  return fetchJson(`${API_BASE}/teams`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTeam(
  teamId: string,
  data: Partial<Team>,
): Promise<Team> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, { method: "DELETE" });
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members`);
}

export async function addTeamMember(
  teamId: string,
  data: { user_email: string; user_display_name?: string; role_override?: string },
): Promise<TeamMember> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTeamMember(
  teamId: string,
  memberId: string,
  data: { role_override?: string | null; user_display_name?: string },
): Promise<TeamMember> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<void> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Domains
// ============================================================================

export async function listDomains(): Promise<DataDomain[]> {
  return fetchJson(`${API_BASE}/domains`);
}

export async function getDomain(domainId: string): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains/${domainId}`);
}

export async function createDomain(
  data: { name: string; description?: string; parent_id?: string; owner_email?: string; icon?: string; color?: string },
): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDomain(
  domainId: string,
  data: Partial<DataDomain>,
): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains/${domainId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDomain(domainId: string): Promise<void> {
  return fetchJson(`${API_BASE}/domains/${domainId}`, { method: "DELETE" });
}

export async function getDomainTree(): Promise<DomainTreeNode[]> {
  return fetchJson(`${API_BASE}/domains/tree`);
}

// ============================================================================
// Asset Reviews (G4)
// ============================================================================

export async function listReviews(filters?: {
  asset_type?: AssetType;
  asset_id?: string;
  status?: ReviewStatus;
  reviewer_email?: string;
}): Promise<AssetReview[]> {
  const params = new URLSearchParams();
  if (filters?.asset_type) params.set("asset_type", filters.asset_type);
  if (filters?.asset_id) params.set("asset_id", filters.asset_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.reviewer_email) params.set("reviewer_email", filters.reviewer_email);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/reviews${qs ? `?${qs}` : ""}`);
}

export async function getReview(reviewId: string): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}`);
}

export async function requestReview(data: {
  asset_type: AssetType;
  asset_id: string;
  asset_name?: string;
  reviewer_email?: string;
}): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function assignReviewer(
  reviewId: string,
  reviewerEmail: string,
): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ reviewer_email: reviewerEmail }),
  });
}

export async function submitDecision(
  reviewId: string,
  data: { status: "approved" | "rejected" | "changes_requested"; review_notes?: string },
): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}/decide`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReview(reviewId: string): Promise<void> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}`, { method: "DELETE" });
}

// ============================================================================
// Projects (G8)
// ============================================================================

export async function listProjects(): Promise<Project[]> {
  return fetchJson(`${API_BASE}/projects`);
}

export async function getProject(projectId: string): Promise<Project> {
  return fetchJson(`${API_BASE}/projects/${projectId}`);
}

export async function createProject(
  data: { name: string; description?: string; project_type?: ProjectType; team_id?: string },
): Promise<Project> {
  return fetchJson(`${API_BASE}/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>,
): Promise<Project> {
  return fetchJson(`${API_BASE}/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  return fetchJson(`${API_BASE}/projects/${projectId}`, { method: "DELETE" });
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return fetchJson(`${API_BASE}/projects/${projectId}/members`);
}

export async function addProjectMember(
  projectId: string,
  data: { user_email: string; user_display_name?: string; role?: string },
): Promise<ProjectMember> {
  return fetchJson(`${API_BASE}/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<void> {
  return fetchJson(`${API_BASE}/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Data Contracts (G5)
// ============================================================================

export async function listContracts(filters?: {
  status?: ContractStatus;
  domain_id?: string;
}): Promise<DataContract[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.domain_id) params.set("domain_id", filters.domain_id);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/contracts${qs ? `?${qs}` : ""}`);
}

export async function getContract(contractId: string): Promise<DataContract> {
  return fetchJson(`${API_BASE}/contracts/${contractId}`);
}

export async function createContract(data: {
  name: string;
  description?: string;
  version?: string;
  dataset_id?: string;
  dataset_name?: string;
  domain_id?: string;
  owner_email?: string;
  schema_definition?: ContractColumnSpec[];
  quality_rules?: ContractQualityRule[];
  terms?: ContractTerms;
}): Promise<DataContract> {
  return fetchJson(`${API_BASE}/contracts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateContract(
  contractId: string,
  data: Partial<DataContract>,
): Promise<DataContract> {
  return fetchJson(`${API_BASE}/contracts/${contractId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function transitionContractStatus(
  contractId: string,
  newStatus: "active" | "deprecated" | "retired",
): Promise<DataContract> {
  return fetchJson(`${API_BASE}/contracts/${contractId}/status?new_status=${newStatus}`, {
    method: "PUT",
  });
}

export async function deleteContract(contractId: string): Promise<void> {
  return fetchJson(`${API_BASE}/contracts/${contractId}`, { method: "DELETE" });
}

// ============================================================================
// Compliance Policies (G6)
// ============================================================================

export async function listPolicies(filters?: {
  category?: PolicyCategory;
  status?: "enabled" | "disabled";
}): Promise<CompliancePolicy[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/policies${qs ? `?${qs}` : ""}`);
}

export async function getPolicy(policyId: string): Promise<CompliancePolicy> {
  return fetchJson(`${API_BASE}/policies/${policyId}`);
}

export async function createPolicy(data: {
  name: string;
  description?: string;
  category?: string;
  severity?: string;
  rules: PolicyRuleCondition[];
  scope?: PolicyScope;
  schedule?: string;
  owner_email?: string;
}): Promise<CompliancePolicy> {
  return fetchJson(`${API_BASE}/policies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePolicy(
  policyId: string,
  data: Partial<CompliancePolicy>,
): Promise<CompliancePolicy> {
  return fetchJson(`${API_BASE}/policies/${policyId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function togglePolicy(
  policyId: string,
  enabled: boolean,
): Promise<CompliancePolicy> {
  return fetchJson(`${API_BASE}/policies/${policyId}/toggle?enabled=${enabled}`, {
    method: "PUT",
  });
}

export async function deletePolicy(policyId: string): Promise<void> {
  return fetchJson(`${API_BASE}/policies/${policyId}`, { method: "DELETE" });
}

export async function listEvaluations(policyId: string): Promise<PolicyEvaluation[]> {
  return fetchJson(`${API_BASE}/policies/${policyId}/evaluations`);
}

export async function runEvaluation(policyId: string): Promise<PolicyEvaluation> {
  return fetchJson(`${API_BASE}/policies/${policyId}/evaluate`, {
    method: "POST",
  });
}

// ============================================================================
// Process Workflows (G7)
// ============================================================================

export async function listWorkflows(filters?: {
  status?: string;
}): Promise<Workflow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/workflows${qs ? `?${qs}` : ""}`);
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}`);
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  trigger_type?: WorkflowTriggerType;
  trigger_config?: WorkflowTriggerConfig;
  steps: WorkflowStep[];
  owner_email?: string;
}): Promise<Workflow> {
  return fetchJson(`${API_BASE}/workflows`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkflow(
  workflowId: string,
  data: Partial<Workflow>,
): Promise<Workflow> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function activateWorkflow(workflowId: string): Promise<Workflow> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}/activate`, {
    method: "PUT",
  });
}

export async function disableWorkflow(workflowId: string): Promise<Workflow> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}/disable`, {
    method: "PUT",
  });
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}`, { method: "DELETE" });
}

export async function listWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}/executions`);
}

export async function startWorkflowExecution(workflowId: string): Promise<WorkflowExecution> {
  return fetchJson(`${API_BASE}/workflows/${workflowId}/execute`, {
    method: "POST",
  });
}

export async function cancelWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  return fetchJson(`${API_BASE}/workflows/executions/${executionId}/cancel`, {
    method: "PUT",
  });
}

// ============================================================================
// Data Products (G9)
// ============================================================================

export async function listDataProducts(filters?: {
  product_type?: DataProductType;
  status?: DataProductStatus;
}): Promise<DataProduct[]> {
  const params = new URLSearchParams();
  if (filters?.product_type) params.set("product_type", filters.product_type);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/products${qs ? `?${qs}` : ""}`);
}

export async function getDataProduct(productId: string): Promise<DataProduct> {
  return fetchJson(`${API_BASE}/products/${productId}`);
}

export async function createDataProduct(data: {
  name: string;
  description?: string;
  product_type?: string;
  domain_id?: string;
  owner_email?: string;
  team_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  ports?: { name: string; description?: string; port_type?: string; entity_type?: string; entity_id?: string; entity_name?: string }[];
}): Promise<DataProduct> {
  return fetchJson(`${API_BASE}/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDataProduct(
  productId: string,
  data: Partial<DataProduct>,
): Promise<DataProduct> {
  return fetchJson(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function transitionProductStatus(
  productId: string,
  newStatus: "published" | "deprecated" | "retired",
): Promise<DataProduct> {
  return fetchJson(`${API_BASE}/products/${productId}/status?new_status=${newStatus}`, {
    method: "PUT",
  });
}

export async function deleteDataProduct(productId: string): Promise<void> {
  return fetchJson(`${API_BASE}/products/${productId}`, { method: "DELETE" });
}

export async function listProductPorts(productId: string): Promise<DataProductPort[]> {
  return fetchJson(`${API_BASE}/products/${productId}/ports`);
}

export async function addProductPort(
  productId: string,
  data: { name: string; description?: string; port_type?: string; entity_type?: string; entity_id?: string; entity_name?: string },
): Promise<DataProductPort> {
  return fetchJson(`${API_BASE}/products/${productId}/ports`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeProductPort(portId: string): Promise<void> {
  return fetchJson(`${API_BASE}/products/ports/${portId}`, { method: "DELETE" });
}

export async function listProductSubscriptions(productId: string): Promise<DataProductSubscription[]> {
  return fetchJson(`${API_BASE}/products/${productId}/subscriptions`);
}

export async function subscribeToProduct(
  productId: string,
  data: { purpose?: string; subscriber_team_id?: string },
): Promise<DataProductSubscription> {
  return fetchJson(`${API_BASE}/products/${productId}/subscribe`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function approveSubscription(subscriptionId: string): Promise<DataProductSubscription> {
  return fetchJson(`${API_BASE}/products/subscriptions/${subscriptionId}/approve`, {
    method: "PUT",
  });
}

export async function rejectSubscription(subscriptionId: string): Promise<DataProductSubscription> {
  return fetchJson(`${API_BASE}/products/subscriptions/${subscriptionId}/reject`, {
    method: "PUT",
  });
}

export async function revokeSubscription(subscriptionId: string): Promise<DataProductSubscription> {
  return fetchJson(`${API_BASE}/products/subscriptions/${subscriptionId}/revoke`, {
    method: "PUT",
  });
}

// ============================================================================
// Semantic Models (G10)
// ============================================================================

export async function listSemanticModels(filters?: {
  status?: SemanticModelStatus;
}): Promise<SemanticModel[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/semantic-models${qs ? `?${qs}` : ""}`);
}

export async function getSemanticModel(modelId: string): Promise<SemanticModel> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}`);
}

export async function createSemanticModel(data: {
  name: string;
  description?: string;
  domain_id?: string;
  owner_email?: string;
  version?: string;
}): Promise<SemanticModel> {
  return fetchJson(`${API_BASE}/semantic-models`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSemanticModel(
  modelId: string,
  data: Partial<SemanticModel>,
): Promise<SemanticModel> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function publishSemanticModel(modelId: string): Promise<SemanticModel> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/publish`, {
    method: "PUT",
  });
}

export async function archiveSemanticModel(modelId: string): Promise<SemanticModel> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/archive`, {
    method: "PUT",
  });
}

export async function deleteSemanticModel(modelId: string): Promise<void> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}`, { method: "DELETE" });
}

export async function listConcepts(modelId: string): Promise<SemanticConcept[]> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/concepts`);
}

export async function createConcept(
  modelId: string,
  data: { name: string; description?: string; parent_id?: string; concept_type?: string; tags?: string[] },
): Promise<SemanticConcept> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/concepts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteConcept(conceptId: string): Promise<void> {
  return fetchJson(`${API_BASE}/semantic-models/concepts/${conceptId}`, { method: "DELETE" });
}

export async function addConceptProperty(
  modelId: string,
  conceptId: string,
  data: { name: string; description?: string; data_type?: string; is_required?: boolean; enum_values?: string[] },
): Promise<SemanticProperty> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/concepts/${conceptId}/properties`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeConceptProperty(propertyId: string): Promise<void> {
  return fetchJson(`${API_BASE}/semantic-models/properties/${propertyId}`, { method: "DELETE" });
}

export async function listSemanticLinks(modelId: string): Promise<SemanticLink[]> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/links`);
}

export async function createSemanticLink(
  modelId: string,
  data: { source_type: string; source_id: string; target_type: string; target_id?: string; target_name?: string; link_type?: string; confidence?: number; notes?: string },
): Promise<SemanticLink> {
  return fetchJson(`${API_BASE}/semantic-models/${modelId}/links`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSemanticLink(linkId: string): Promise<void> {
  return fetchJson(`${API_BASE}/semantic-models/links/${linkId}`, { method: "DELETE" });
}

// ============================================================================
// Naming Conventions (G15)
// ============================================================================

export async function listNamingConventions(entityType?: NamingEntityType): Promise<NamingConvention[]> {
  const params = entityType ? `?entity_type=${entityType}` : "";
  return fetchJson(`${API_BASE}/naming${params}`);
}

export async function getNamingConvention(conventionId: string): Promise<NamingConvention> {
  return fetchJson(`${API_BASE}/naming/${conventionId}`);
}

export async function createNamingConvention(data: {
  entity_type: string;
  name: string;
  description?: string;
  pattern: string;
  example_valid?: string;
  example_invalid?: string;
  error_message?: string;
  priority?: number;
}): Promise<NamingConvention> {
  return fetchJson(`${API_BASE}/naming`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNamingConvention(
  conventionId: string,
  data: Partial<NamingConvention>,
): Promise<NamingConvention> {
  return fetchJson(`${API_BASE}/naming/${conventionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteNamingConvention(conventionId: string): Promise<void> {
  return fetchJson(`${API_BASE}/naming/${conventionId}`, { method: "DELETE" });
}

export async function toggleNamingConvention(conventionId: string, isActive: boolean): Promise<NamingConvention> {
  return fetchJson(`${API_BASE}/naming/${conventionId}/toggle?is_active=${isActive}`, {
    method: "PUT",
  });
}

export async function validateName(entityType: string, name: string): Promise<NamingValidationResult> {
  return fetchJson(`${API_BASE}/naming/validate?entity_type=${encodeURIComponent(entityType)}&name=${encodeURIComponent(name)}`);
}

// ============================================================================
// Dataset Marketplace (G14)
// ============================================================================

export async function searchMarketplace(params: MarketplaceSearchParams = {}): Promise<MarketplaceSearchResult> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set("query", params.query);
  if (params.product_type) searchParams.set("product_type", params.product_type);
  if (params.domain_id) searchParams.set("domain_id", params.domain_id);
  if (params.team_id) searchParams.set("team_id", params.team_id);
  if (params.tags) searchParams.set("tags", params.tags);
  if (params.owner_email) searchParams.set("owner_email", params.owner_email);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return fetchJson(`${API_BASE}/marketplace/search${qs ? `?${qs}` : ""}`);
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  return fetchJson(`${API_BASE}/marketplace/stats`);
}

export async function getMarketplaceProduct(productId: string): Promise<MarketplaceProduct> {
  return fetchJson(`${API_BASE}/marketplace/products/${productId}`);
}

export async function getMySubscriptions(): Promise<unknown[]> {
  return fetchJson(`${API_BASE}/marketplace/my-subscriptions`);
}

// ============================================================================
// Delivery Modes (G12)
// ============================================================================

export async function listDeliveryModes(modeType?: string, activeOnly?: boolean): Promise<DeliveryMode[]> {
  const params = new URLSearchParams();
  if (modeType) params.set("mode_type", modeType);
  if (activeOnly) params.set("active_only", "true");
  const qs = params.toString();
  return fetchJson(`${API_BASE}/delivery-modes${qs ? `?${qs}` : ""}`);
}

export async function getDeliveryMode(modeId: string): Promise<DeliveryMode> {
  return fetchJson(`${API_BASE}/delivery-modes/${modeId}`);
}

export async function createDeliveryMode(data: Partial<DeliveryMode>): Promise<DeliveryMode> {
  return fetchJson(`${API_BASE}/delivery-modes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDeliveryMode(modeId: string, data: Partial<DeliveryMode>): Promise<DeliveryMode> {
  return fetchJson(`${API_BASE}/delivery-modes/${modeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDeliveryMode(modeId: string): Promise<void> {
  return fetchJson(`${API_BASE}/delivery-modes/${modeId}`, { method: "DELETE" });
}

export async function listDeliveryRecords(modeId?: string, status?: string): Promise<DeliveryRecord[]> {
  const params = new URLSearchParams();
  if (modeId) params.set("mode_id", modeId);
  if (status) params.set("status", status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/delivery-records${qs ? `?${qs}` : ""}`);
}

export async function createDeliveryRecord(data: {
  delivery_mode_id: string;
  model_name: string;
  model_version?: string;
  endpoint_name?: string;
  notes?: string;
}): Promise<DeliveryRecord> {
  return fetchJson(`${API_BASE}/delivery-records`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function transitionDeliveryRecord(recordId: string, newStatus: string): Promise<DeliveryRecord> {
  return fetchJson(`${API_BASE}/delivery-records/${recordId}/transition?new_status=${encodeURIComponent(newStatus)}`, {
    method: "PUT",
  });
}

// ============================================================================
// MCP Integration (G11)
// ============================================================================

export async function getMCPStats(): Promise<MCPStats> {
  return fetchJson(`${API_BASE}/mcp/stats`);
}

export async function listMCPTokens(activeOnly = false): Promise<MCPToken[]> {
  return fetchJson(`${API_BASE}/mcp/tokens?active_only=${activeOnly}`);
}

export async function getMCPToken(tokenId: string): Promise<MCPToken> {
  return fetchJson(`${API_BASE}/mcp/tokens/${tokenId}`);
}

export async function createMCPToken(data: {
  name: string;
  description?: string;
  scope?: string;
  allowed_tools?: string[];
  allowed_resources?: string[];
  team_id?: string;
  expires_at?: string;
  rate_limit_per_minute?: number;
}): Promise<MCPTokenCreateResult> {
  return fetchJson(`${API_BASE}/mcp/tokens`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMCPToken(tokenId: string, data: Partial<MCPToken>): Promise<MCPToken> {
  return fetchJson(`${API_BASE}/mcp/tokens/${tokenId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function revokeMCPToken(tokenId: string): Promise<void> {
  return fetchJson(`${API_BASE}/mcp/tokens/${tokenId}/revoke`, { method: "PUT" });
}

export async function deleteMCPToken(tokenId: string): Promise<void> {
  return fetchJson(`${API_BASE}/mcp/tokens/${tokenId}`, { method: "DELETE" });
}

export async function listMCPTools(activeOnly = false, category?: string): Promise<MCPTool[]> {
  const params = new URLSearchParams();
  if (activeOnly) params.set("active_only", "true");
  if (category) params.set("category", category);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/mcp/tools${qs ? `?${qs}` : ""}`);
}

export async function getMCPTool(toolId: string): Promise<MCPTool> {
  return fetchJson(`${API_BASE}/mcp/tools/${toolId}`);
}

export async function createMCPTool(data: {
  name: string;
  description?: string;
  category?: string;
  input_schema?: Record<string, unknown>;
  required_scope?: string;
  required_permission?: string;
  endpoint_path?: string;
  version?: string;
}): Promise<MCPTool> {
  return fetchJson(`${API_BASE}/mcp/tools`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMCPTool(toolId: string, data: Partial<MCPTool>): Promise<MCPTool> {
  return fetchJson(`${API_BASE}/mcp/tools/${toolId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMCPTool(toolId: string): Promise<void> {
  return fetchJson(`${API_BASE}/mcp/tools/${toolId}`, { method: "DELETE" });
}

export async function listMCPInvocations(params?: {
  token_id?: string;
  tool_id?: string;
  status?: string;
  limit?: number;
}): Promise<MCPInvocation[]> {
  const qs = new URLSearchParams();
  if (params?.token_id) qs.set("token_id", params.token_id);
  if (params?.tool_id) qs.set("tool_id", params.tool_id);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const qsStr = qs.toString();
  return fetchJson(`${API_BASE}/mcp/invocations${qsStr ? `?${qsStr}` : ""}`);
}

// ============================================================================
// Multi-Platform Connectors (G13)
// ============================================================================

export async function getConnectorStats(): Promise<ConnectorStats> {
  return fetchJson(`${API_BASE}/connectors/stats`);
}

export async function listConnectors(activeOnly = false, platform?: string): Promise<PlatformConnector[]> {
  const params = new URLSearchParams();
  if (activeOnly) params.set("active_only", "true");
  if (platform) params.set("platform", platform);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/connectors${qs ? `?${qs}` : ""}`);
}

export async function getConnector(connectorId: string): Promise<PlatformConnector> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}`);
}

export async function createConnector(data: {
  name: string;
  description?: string;
  platform: string;
  connection_config?: Record<string, unknown>;
  sync_direction?: string;
  sync_schedule?: string;
  team_id?: string;
}): Promise<PlatformConnector> {
  return fetchJson(`${API_BASE}/connectors`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateConnector(connectorId: string, data: Partial<PlatformConnector>): Promise<PlatformConnector> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteConnector(connectorId: string): Promise<void> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}`, { method: "DELETE" });
}

export async function testConnector(connectorId: string): Promise<{ status: string; message: string }> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}/test`, { method: "POST" });
}

export async function listConnectorAssets(connectorId: string): Promise<ConnectorAsset[]> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}/assets`);
}

export async function syncConnector(connectorId: string): Promise<ConnectorSyncRecord> {
  return fetchJson(`${API_BASE}/connectors/${connectorId}/sync`, { method: "POST" });
}

export async function listConnectorSyncs(connectorId?: string, status?: string): Promise<ConnectorSyncRecord[]> {
  const params = new URLSearchParams();
  if (connectorId) params.set("connector_id", connectorId);
  if (status) params.set("status", status);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/connector-syncs${qs ? `?${qs}` : ""}`);
}

// ============================================================================
// Lineage Graph
// ============================================================================

export async function materializeLineage(): Promise<MaterializeResult> {
  return fetchJson(`${API_BASE}/lineage/materialize`, { method: "POST" });
}

export async function materializeEntityLineage(
  entityType: string,
  entityId: string,
): Promise<MaterializeResult> {
  return fetchJson(`${API_BASE}/lineage/materialize/${entityType}/${entityId}`, {
    method: "POST",
  });
}

export async function getLineageGraph(): Promise<LineageGraph> {
  return fetchJson(`${API_BASE}/lineage/graph`);
}

export async function getEntityLineage(
  entityType: string,
  entityId: string,
): Promise<LineageGraph> {
  return fetchJson(`${API_BASE}/lineage/entity/${entityType}/${entityId}`);
}

export async function traverseLineage(
  direction: "upstream" | "downstream",
  entityType: string,
  entityId: string,
  maxDepth = 10,
): Promise<TraversalResult> {
  return fetchJson(
    `${API_BASE}/graph/traverse/${direction}/${entityType}/${entityId}?max_depth=${maxDepth}`,
  );
}

export async function getImpactAnalysis(
  entityType: string,
  entityId: string,
): Promise<ImpactReport> {
  return fetchJson(`${API_BASE}/graph/impact/${entityType}/${entityId}`);
}

export async function findLineagePath(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
): Promise<LineageEdge[]> {
  const params = new URLSearchParams({
    from_type: fromType, from_id: fromId,
    to_type: toType, to_id: toId,
  });
  return fetchJson(`${API_BASE}/graph/path?${params}`);
}

export async function getEntityContext(
  entityType: string,
  entityId: string,
): Promise<LineageGraph> {
  return fetchJson(`${API_BASE}/graph/context/${entityType}/${entityId}`);
}
