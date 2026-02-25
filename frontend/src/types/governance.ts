/**
 * Governance types - Roles, Teams, Data Domains, and Asset Reviews
 */

export type AccessLevel = "none" | "read" | "write" | "admin";

export interface AppRole {
  id: string;
  name: string;
  description: string | null;
  feature_permissions: Record<string, AccessLevel>;
  allowed_stages: string[];
  is_default: boolean;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_email: string;
  user_display_name: string | null;
  role_id: string;
  role_name: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
}

export interface CurrentUserInfo {
  email: string;
  display_name: string;
  role_id: string;
  role_name: string;
  permissions: Record<string, AccessLevel>;
  allowed_stages: string[];
}

export interface TeamMetadata {
  tools: string[];
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  domain_id: string | null;
  domain_name: string | null;
  leads: string[];
  metadata: TeamMetadata;
  is_active: boolean;
  member_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_email: string;
  user_display_name: string | null;
  role_override: string | null;
  role_override_name: string | null;
  added_at: string | null;
  added_by: string | null;
}

export interface DataDomain {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  owner_email: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface DomainTreeNode {
  id: string;
  name: string;
  description: string | null;
  owner_email: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  children: DomainTreeNode[];
}

// Asset Reviews (G4)

export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected" | "changes_requested";

export type AssetType = "sheet" | "template" | "training_sheet";

export interface AssetReview {
  id: string;
  asset_type: AssetType;
  asset_id: string;
  asset_name: string | null;
  status: ReviewStatus;
  requested_by: string;
  reviewer_email: string | null;
  review_notes: string | null;
  decision_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Projects (G8)

export type ProjectType = "personal" | "team";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  team_id: string | null;
  team_name: string | null;
  owner_email: string;
  is_active: boolean;
  member_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_email: string;
  user_display_name: string | null;
  role: string;
  added_at: string | null;
  added_by: string | null;
}

// Data Contracts (G5)

export type ContractStatus = "draft" | "active" | "deprecated" | "retired";

export interface ContractColumnSpec {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
  constraints: string | null;
}

export interface ContractQualityRule {
  metric: string;
  operator: string;
  threshold: number;
  description: string | null;
}

export interface ContractTerms {
  purpose: string | null;
  limitations: string | null;
  retention_days: number | null;
}

export interface DataContract {
  id: string;
  name: string;
  description: string | null;
  version: string;
  status: ContractStatus;
  dataset_id: string | null;
  dataset_name: string | null;
  domain_id: string | null;
  domain_name: string | null;
  owner_email: string | null;
  schema_definition: ContractColumnSpec[];
  quality_rules: ContractQualityRule[];
  terms: ContractTerms | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  activated_at: string | null;
}

// Compliance Policies (G6)

export type PolicyCategory = "data_quality" | "access_control" | "retention" | "naming" | "lineage";
export type PolicySeverity = "info" | "warning" | "critical";

export interface PolicyRuleCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
  message: string | null;
}

export interface PolicyScope {
  catalog: string | null;
  schema_name: string | null;
  tables: string[] | null;
  asset_types: string[] | null;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string | null;
  category: PolicyCategory;
  severity: PolicySeverity;
  status: "enabled" | "disabled";
  rules: PolicyRuleCondition[];
  scope: PolicyScope | null;
  schedule: string | null;
  owner_email: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  last_evaluation: PolicyEvaluation | null;
}

export interface PolicyEvaluationRuleResult {
  rule_index: number;
  passed: boolean;
  actual_value: string | number | boolean | null;
  message: string | null;
}

export interface PolicyEvaluation {
  id: string;
  policy_id: string;
  status: "passed" | "failed" | "error";
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  results: PolicyEvaluationRuleResult[];
  evaluated_at: string | null;
  evaluated_by: string | null;
  duration_ms: number | null;
}

// Process Workflows (G7)

export type WorkflowTriggerType = "manual" | "on_create" | "on_update" | "on_review" | "scheduled";
export type WorkflowStepType = "action" | "approval" | "notification" | "condition";

export interface WorkflowStep {
  step_id: string;
  name: string;
  type: WorkflowStepType;
  action: string | null;
  config: Record<string, unknown> | null;
  next_step: string | null;
  on_reject: string | null;
}

export interface WorkflowTriggerConfig {
  entity_type: string | null;
  schedule: string | null;
  conditions: Record<string, unknown> | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: WorkflowTriggerType;
  trigger_config: WorkflowTriggerConfig | null;
  steps: WorkflowStep[];
  status: "draft" | "active" | "disabled";
  owner_email: string | null;
  execution_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface WorkflowStepResult {
  step_id: string;
  status: string;
  output: Record<string, unknown> | null;
  completed_at: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string | null;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  current_step: string | null;
  trigger_event: Record<string, unknown> | null;
  step_results: WorkflowStepResult[];
  started_at: string | null;
  started_by: string | null;
  completed_at: string | null;
}

// Data Products (G9)

export type DataProductType = "source" | "source_aligned" | "aggregate" | "consumer_aligned";
export type DataProductStatus = "draft" | "published" | "deprecated" | "retired";
export type PortType = "input" | "output";
export type SubscriptionStatus = "pending" | "approved" | "rejected" | "revoked";

export interface DataProductPort {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  port_type: PortType;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  config: Record<string, unknown> | null;
  created_at: string | null;
  created_by: string | null;
}

export interface DataProductSubscription {
  id: string;
  product_id: string;
  subscriber_email: string;
  subscriber_team_id: string | null;
  status: SubscriptionStatus;
  purpose: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
}

export interface DataProduct {
  id: string;
  name: string;
  description: string | null;
  product_type: DataProductType;
  status: DataProductStatus;
  domain_id: string | null;
  domain_name: string | null;
  owner_email: string | null;
  team_id: string | null;
  team_name: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  port_count: number;
  subscription_count: number;
  ports: DataProductPort[];
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  published_at: string | null;
}

// Semantic Models (G10)

export type ConceptType = "entity" | "event" | "metric" | "dimension";
export type SemanticLinkType =
  | "maps_to" | "derived_from" | "aggregates" | "represents"
  | "produces" | "trains_on" | "deployed_as" | "generated_from" | "labeled_by" | "feeds_into"
  | "produced_by" | "used_to_train" | "deployment_of" | "generates" | "labels" | "fed_by" | "mapped_from" | "derives"
  | "in_domain" | "domain_contains" | "exposes" | "exposed_by" | "governs" | "governed_by" | "targets" | "targeted_by"
  | "contains_task" | "task_in" | "contains_item" | "item_in"
  | "evaluated_with" | "evaluation_of" | "evaluates_model" | "model_evaluated_by"
  | "attributed_to" | "attributes"
  | "owned_by_team" | "team_owns"
  | "parent_of" | "child_of"
  | "reviews" | "reviewed_by"
  | "identifies_gap" | "gap_found_in" | "gap_for_model" | "model_has_gap"
  | "remediates" | "remediated_by"
  | "sourced_from" | "source_for"
  | "subscribes_to" | "subscribed_by"
  | "quality_check_for" | "quality_checked_by"
  | "contains_qa_pair" | "qa_pair_in" | "linked_to_label" | "label_for_qa"
  | "member_of_team" | "team_has_member" | "member_of_project" | "project_has_member"
  | "assigned_role" | "role_assigned_to"
  | "measures_endpoint" | "endpoint_measured_by" | "feedback_for" | "has_feedback"
  | "delivered_via" | "mode_used_for" | "delivers_model" | "model_delivered_by"
  | "registers_model" | "model_registered_in"
  | "concept_in_model" | "model_has_concept" | "property_of" | "has_property"
  | "evaluates_policy" | "policy_evaluated_by"
  | "executes_workflow" | "workflow_executed_by"
  | "discovered_by" | "discovers" | "sync_for" | "has_sync"
  | "token_for_team" | "team_has_token" | "invoked_with_token" | "token_used_in"
  | "invokes_tool" | "tool_invoked_by"
  | "job_uses_template" | "template_used_by_job" | "job_trains_model" | "model_trained_by_job"
  | "job_targets_endpoint" | "endpoint_targeted_by_job";
export type SemanticModelStatus = "draft" | "published" | "archived";

export interface SemanticProperty {
  id: string;
  concept_id: string;
  model_id: string;
  name: string;
  description: string | null;
  data_type: string | null;
  is_required: boolean;
  enum_values: string[] | null;
  created_at: string | null;
  created_by: string | null;
}

export interface SemanticConcept {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  concept_type: ConceptType;
  tags: string[];
  created_at: string | null;
  created_by: string | null;
  properties: SemanticProperty[];
}

export interface SemanticLink {
  id: string;
  model_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  link_type: SemanticLinkType;
  confidence: number | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface SemanticModel {
  id: string;
  name: string;
  description: string | null;
  domain_id: string | null;
  domain_name: string | null;
  owner_email: string | null;
  status: SemanticModelStatus;
  version: string;
  metadata: Record<string, unknown> | null;
  concept_count: number;
  link_count: number;
  concepts: SemanticConcept[];
  links: SemanticLink[];
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

// Naming Conventions (G15)

export type NamingEntityType = "sheet" | "template" | "training_sheet" | "domain" | "team" | "project" | "contract" | "product" | "semantic_model" | "role";

export interface NamingConvention {
  id: string;
  entity_type: NamingEntityType;
  name: string;
  description: string | null;
  pattern: string;
  example_valid: string | null;
  example_invalid: string | null;
  error_message: string | null;
  is_active: boolean;
  priority: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface NamingValidationResult {
  entity_type: string;
  name: string;
  valid: boolean;
  violations: { convention_id: string; convention_name: string; pattern: string; error_message: string }[];
  conventions_checked: number;
}

// ============================================================================
// Dataset Marketplace (G14)
// ============================================================================

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  status: string;
  domain_id: string | null;
  domain_name: string | null;
  team_id: string | null;
  team_name: string | null;
  owner_email: string | null;
  tags: string[];
  port_count: number;
  subscription_count: number;
  ports: DataProductPort[];
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  published_at: string | null;
}

export interface MarketplaceFacets {
  product_types: Record<string, number>;
  domains: { id: string; name: string; count: number }[];
  teams: { id: string; name: string; count: number }[];
}

export interface MarketplaceSearchResult {
  products: MarketplaceProduct[];
  total: number;
  limit: number;
  offset: number;
  facets: MarketplaceFacets;
}

export interface MarketplaceStats {
  total_products: number;
  published_products: number;
  total_subscriptions: number;
  products_by_type: Record<string, number>;
  products_by_domain: { name: string; count: number }[];
  recent_products: MarketplaceProduct[];
}

export interface MarketplaceSearchParams {
  query?: string;
  product_type?: string;
  domain_id?: string;
  team_id?: string;
  tags?: string;
  owner_email?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Delivery Modes (G12)
// ============================================================================

export type DeliveryModeType = "direct" | "indirect" | "manual";
export type DeliveryRecordStatus = "pending" | "approved" | "in_progress" | "completed" | "failed" | "rejected";

export interface DeliveryMode {
  id: string;
  name: string;
  description: string | null;
  mode_type: DeliveryModeType;
  is_default: boolean;
  requires_approval: boolean;
  approved_roles: string[] | null;
  git_repo_url: string | null;
  git_branch: string | null;
  git_path: string | null;
  yaml_template: string | null;
  manual_instructions: string | null;
  environment: string | null;
  config: Record<string, unknown> | null;
  is_active: boolean;
  delivery_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface DeliveryRecord {
  id: string;
  delivery_mode_id: string;
  delivery_mode_name: string | null;
  mode_type: string | null;
  model_name: string;
  model_version: string | null;
  endpoint_name: string | null;
  status: DeliveryRecordStatus;
  requested_by: string;
  requested_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  notes: string | null;
  result: Record<string, unknown> | null;
}

// ============================================================================
// MCP Integration (G11)
// ============================================================================

export type MCPTokenScope = "read" | "read_write" | "admin";
export type MCPToolCategory = "data" | "training" | "deployment" | "monitoring" | "governance" | "general";
export type MCPInvocationStatus = "success" | "error" | "denied" | "rate_limited";

export interface MCPToken {
  id: string;
  name: string;
  description: string | null;
  token_prefix: string;
  scope: MCPTokenScope;
  allowed_tools: string[] | null;
  allowed_resources: string[] | null;
  owner_email: string;
  team_id: string | null;
  team_name: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_minute: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MCPTokenCreateResult {
  token: MCPToken;
  token_value: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string | null;
  category: MCPToolCategory;
  input_schema: Record<string, unknown> | null;
  required_scope: MCPTokenScope;
  required_permission: string | null;
  is_active: boolean;
  version: string;
  endpoint_path: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MCPInvocation {
  id: string;
  token_id: string;
  token_name: string | null;
  tool_id: string;
  tool_name: string | null;
  input_params: Record<string, unknown> | null;
  output_summary: string | null;
  status: MCPInvocationStatus;
  error_message: string | null;
  duration_ms: number | null;
  invoked_at: string | null;
}

export interface MCPStats {
  total_tokens: number;
  active_tokens: number;
  total_tools: number;
  active_tools: number;
  total_invocations: number;
  invocations_today: number;
  invocations_by_status: Record<string, number>;
  top_tools: { name: string; category: string; invocation_count: number }[];
}

// ============================================================================
// Multi-Platform Connectors (G13)
// ============================================================================

export type ConnectorPlatform = "unity_catalog" | "snowflake" | "kafka" | "power_bi" | "s3" | "custom";
export type ConnectorStatus = "active" | "inactive" | "error" | "testing";
export type SyncDirection = "inbound" | "outbound" | "bidirectional";
export type SyncStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface PlatformConnector {
  id: string;
  name: string;
  description: string | null;
  platform: ConnectorPlatform;
  status: ConnectorStatus;
  connection_config: Record<string, unknown> | null;
  sync_direction: SyncDirection;
  sync_schedule: string | null;
  owner_email: string | null;
  team_id: string | null;
  team_name: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  asset_count: number;
  sync_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ConnectorAsset {
  id: string;
  connector_id: string;
  external_id: string;
  external_name: string;
  asset_type: string;
  local_reference: string | null;
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string | null;
}

export interface ConnectorSyncRecord {
  id: string;
  connector_id: string;
  connector_name: string | null;
  status: SyncStatus;
  direction: SyncDirection;
  assets_synced: number;
  assets_failed: number;
  error_message: string | null;
  started_at: string | null;
  started_by: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface ConnectorStats {
  total_connectors: number;
  active_connectors: number;
  total_assets: number;
  total_syncs: number;
  connectors_by_platform: Record<string, number>;
  recent_syncs: ConnectorSyncRecord[];
}

// ============================================================================
// Lineage Graph (extends G10)
// ============================================================================

export type LineageEntityType =
  | "sheet" | "template" | "training_sheet" | "model" | "endpoint"
  | "canonical_label" | "domain" | "data_product" | "data_contract" | "labeling_job"
  | "labeling_task" | "labeled_item" | "model_evaluation" | "team" | "project"
  | "identified_gap" | "annotation_task" | "asset_review" | "example" | "connector"
  | "dqx_quality_result" | "qa_pair" | "team_member" | "project_member"
  | "user_role_assignment" | "app_role" | "endpoint_metric" | "feedback_item"
  | "delivery_mode" | "delivery_record" | "endpoint_registry" | "semantic_model"
  | "semantic_concept" | "semantic_property" | "compliance_policy" | "policy_evaluation"
  | "workflow" | "workflow_execution" | "connector_asset" | "connector_sync"
  | "mcp_token" | "mcp_tool" | "mcp_invocation" | "job_run";

export interface LineageNode {
  entity_type: LineageEntityType;
  entity_id: string;
  entity_name: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LineageEdge {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  link_type: SemanticLinkType;
  confidence: number | null;
}

export interface MaterializeResult {
  edges_created: number;
  edges_updated: number;
  edges_deleted: number;
  edges_by_type: Record<string, number>;
  duration_ms: number;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  model_id: string | null;
  materialize_stats: MaterializeResult | null;
}

export interface ImpactReport {
  source_entity: LineageNode;
  affected_training_sheets: LineageNode[];
  affected_models: LineageNode[];
  affected_endpoints: LineageNode[];
  affected_canonical_labels: LineageNode[];
  affected_data_products: LineageNode[];
  affected_data_contracts: LineageNode[];
  affected_labeling_jobs: LineageNode[];
  affected_teams: LineageNode[];
  affected_identified_gaps: LineageNode[];
  total_affected: number;
  risk_level: "low" | "medium" | "high" | "critical";
  paths: LineageEdge[][];
}

export interface TraversalResult {
  root_entity: LineageNode;
  direction: "upstream" | "downstream";
  max_depth: number;
  graph: LineageGraph;
  entity_count_by_type: Record<string, number>;
}

/** Forward lineage link types (data flows in this direction) */
export const LINEAGE_FORWARD_TYPES: ReadonlySet<string> = new Set([
  "produces", "trains_on", "deployed_as", "generated_from", "labeled_by", "feeds_into",
  "in_domain", "exposes", "governs", "targets",
  "contains_task", "contains_item", "evaluated_with", "evaluates_model",
  "attributed_to", "owned_by_team", "parent_of", "reviews",
  "identifies_gap", "gap_for_model", "remediates", "sourced_from", "subscribes_to",
  "quality_check_for",
  "contains_qa_pair", "linked_to_label",
  "member_of_team", "member_of_project", "assigned_role",
  "measures_endpoint", "feedback_for",
  "delivered_via", "delivers_model", "registers_model",
  "concept_in_model", "property_of",
  "evaluates_policy", "executes_workflow",
  "discovered_by", "sync_for",
  "token_for_team", "invoked_with_token", "invokes_tool",
  "job_uses_template", "job_trains_model", "job_targets_endpoint",
]);

/** All lineage link types (forward + inverse) */
export const LINEAGE_ALL_TYPES: ReadonlySet<string> = new Set([
  ...LINEAGE_FORWARD_TYPES,
  "produced_by", "used_to_train", "deployment_of", "generates", "labels", "fed_by", "mapped_from", "derives",
  "domain_contains", "exposed_by", "governed_by", "targeted_by",
  "task_in", "item_in", "evaluation_of", "model_evaluated_by",
  "attributes", "team_owns", "child_of", "reviewed_by",
  "gap_found_in", "model_has_gap", "remediated_by", "source_for", "subscribed_by",
  "quality_checked_by",
  "qa_pair_in", "label_for_qa",
  "team_has_member", "project_has_member", "role_assigned_to",
  "endpoint_measured_by", "has_feedback",
  "mode_used_for", "model_delivered_by", "model_registered_in",
  "model_has_concept", "has_property",
  "policy_evaluated_by", "workflow_executed_by",
  "discovers", "has_sync",
  "team_has_token", "token_used_in", "tool_invoked_by",
  "template_used_by_job", "model_trained_by_job", "endpoint_targeted_by_job",
]);
