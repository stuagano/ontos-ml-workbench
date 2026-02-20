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
