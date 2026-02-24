"""Pydantic models for Governance (Roles, Teams, Domains, Asset Reviews)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================================
# App Roles
# ============================================================================


class AppRoleCreate(BaseModel):
    """Request body for creating a role."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    feature_permissions: dict[str, str] = Field(
        ..., description='Map of feature_id to access level (none/read/write/admin)'
    )
    allowed_stages: list[str] = Field(default_factory=list)
    is_default: bool = False


class AppRoleUpdate(BaseModel):
    """Request body for updating a role."""
    name: str | None = None
    description: str | None = None
    feature_permissions: dict[str, str] | None = None
    allowed_stages: list[str] | None = None
    is_default: bool | None = None


class AppRoleResponse(BaseModel):
    """Role response model."""
    id: str
    name: str
    description: str | None = None
    feature_permissions: dict[str, str] = Field(default_factory=dict)
    allowed_stages: list[str] = Field(default_factory=list)
    is_default: bool = False
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


# ============================================================================
# User Role Assignments
# ============================================================================


class UserRoleAssignCreate(BaseModel):
    """Request body for assigning a role to a user."""
    user_email: str = Field(..., min_length=1)
    user_display_name: str | None = None
    role_id: str = Field(..., min_length=1)


class UserRoleAssignmentResponse(BaseModel):
    """User role assignment response model."""
    id: str
    user_email: str
    user_display_name: str | None = None
    role_id: str
    role_name: str | None = None
    assigned_at: datetime | None = None
    assigned_by: str | None = None


# ============================================================================
# Current User (for /users/me)
# ============================================================================


class CurrentUserResponse(BaseModel):
    """Current user info with resolved role and permissions."""
    email: str
    display_name: str
    role_id: str
    role_name: str
    permissions: dict[str, str] = Field(default_factory=dict)
    allowed_stages: list[str] = Field(default_factory=list)


# ============================================================================
# Teams
# ============================================================================


class TeamMetadata(BaseModel):
    """Flexible team metadata (tools, integrations, etc.)."""
    tools: list[str] = Field(default_factory=list, description="Tools/platforms the team uses")


class TeamCreate(BaseModel):
    """Request body for creating a team."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    domain_id: str | None = None
    leads: list[str] = Field(default_factory=list, description="Team lead emails")
    metadata: TeamMetadata | None = None


class TeamUpdate(BaseModel):
    """Request body for updating a team."""
    name: str | None = None
    description: str | None = None
    domain_id: str | None = None
    leads: list[str] | None = None
    metadata: TeamMetadata | None = None
    is_active: bool | None = None


class TeamMemberAdd(BaseModel):
    """Request body for adding a team member."""
    user_email: str = Field(..., min_length=1)
    user_display_name: str | None = None
    role_override: str | None = Field(None, description="Role ID to override global role in team context")


class TeamMemberUpdate(BaseModel):
    """Request body for updating a team member."""
    role_override: str | None = None
    user_display_name: str | None = None


class TeamMemberResponse(BaseModel):
    """Team member response model."""
    id: str
    team_id: str
    user_email: str
    user_display_name: str | None = None
    role_override: str | None = None
    role_override_name: str | None = None
    added_at: datetime | None = None
    added_by: str | None = None


class TeamResponse(BaseModel):
    """Team response model."""
    id: str
    name: str
    description: str | None = None
    domain_id: str | None = None
    domain_name: str | None = None
    leads: list[str] = Field(default_factory=list)
    metadata: TeamMetadata = Field(default_factory=TeamMetadata)
    is_active: bool = True
    member_count: int = 0
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


# ============================================================================
# Data Domains
# ============================================================================


class DataDomainCreate(BaseModel):
    """Request body for creating a data domain."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    parent_id: str | None = None
    owner_email: str | None = None
    icon: str | None = None
    color: str | None = Field(None, description="Hex color for UI (e.g., #3B82F6)")


class DataDomainUpdate(BaseModel):
    """Request body for updating a data domain."""
    name: str | None = None
    description: str | None = None
    parent_id: str | None = None
    owner_email: str | None = None
    icon: str | None = None
    color: str | None = None
    is_active: bool | None = None


class DataDomainResponse(BaseModel):
    """Data domain response model."""
    id: str
    name: str
    description: str | None = None
    parent_id: str | None = None
    owner_email: str | None = None
    icon: str | None = None
    color: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class DomainTreeNode(BaseModel):
    """A domain node in the hierarchy tree."""
    id: str
    name: str
    description: str | None = None
    owner_email: str | None = None
    icon: str | None = None
    color: str | None = None
    is_active: bool = True
    children: list["DomainTreeNode"] = Field(default_factory=list)


# ============================================================================
# Asset Reviews (G4)
# ============================================================================


class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class AssetType(str, Enum):
    SHEET = "sheet"
    TEMPLATE = "template"
    TRAINING_SHEET = "training_sheet"


class ReviewRequest(BaseModel):
    """Request body for submitting an asset for review."""
    asset_type: AssetType
    asset_id: str = Field(..., min_length=1)
    asset_name: str | None = None
    reviewer_email: str | None = Field(None, description="Optionally assign a reviewer upfront")


class ReviewDecision(BaseModel):
    """Request body for a reviewer making a decision."""
    status: ReviewStatus = Field(..., description="Decision: approved, rejected, or changes_requested")
    review_notes: str | None = None


class ReviewAssign(BaseModel):
    """Request body for assigning a reviewer."""
    reviewer_email: str = Field(..., min_length=1)


class AssetReviewResponse(BaseModel):
    """Asset review response model."""
    id: str
    asset_type: str
    asset_id: str
    asset_name: str | None = None
    status: str
    requested_by: str
    reviewer_email: str | None = None
    review_notes: str | None = None
    decision_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ============================================================================
# Projects (G8)
# ============================================================================


class ProjectType(str, Enum):
    PERSONAL = "personal"
    TEAM = "team"


class ProjectCreate(BaseModel):
    """Request body for creating a project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    project_type: ProjectType = ProjectType.TEAM
    team_id: str | None = Field(None, description="FK to teams.id (for team projects)")


class ProjectUpdate(BaseModel):
    """Request body for updating a project."""
    name: str | None = None
    description: str | None = None
    team_id: str | None = None
    is_active: bool | None = None


class ProjectMemberAdd(BaseModel):
    """Request body for adding a project member."""
    user_email: str = Field(..., min_length=1)
    user_display_name: str | None = None
    role: str = Field("member", description="owner | admin | member | viewer")


class ProjectMemberResponse(BaseModel):
    """Project member response model."""
    id: str
    project_id: str
    user_email: str
    user_display_name: str | None = None
    role: str = "member"
    added_at: datetime | None = None
    added_by: str | None = None


class ProjectResponse(BaseModel):
    """Project response model."""
    id: str
    name: str
    description: str | None = None
    project_type: str = "team"
    team_id: str | None = None
    team_name: str | None = None
    owner_email: str
    is_active: bool = True
    member_count: int = 0
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


# ============================================================================
# Data Contracts (G5)
# ============================================================================


class ContractStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    RETIRED = "retired"


class ContractColumnSpec(BaseModel):
    """A column definition within a data contract schema."""
    name: str = Field(..., min_length=1)
    type: str = Field(..., description="Data type (e.g., STRING, INT, DOUBLE, TIMESTAMP)")
    required: bool = False
    description: str | None = None
    constraints: str | None = Field(None, description="Additional constraints (e.g., 'NOT NULL', 'UNIQUE', regex)")


class ContractQualityRule(BaseModel):
    """A quality SLO rule for a data contract."""
    metric: str = Field(..., description="Quality metric (e.g., completeness, freshness, accuracy, uniqueness)")
    operator: str = Field(..., description="Comparison operator (>=, <=, ==, >, <)")
    threshold: float = Field(..., description="Threshold value (e.g., 0.99 for 99%)")
    description: str | None = None


class ContractTerms(BaseModel):
    """Usage terms for a data contract."""
    purpose: str | None = Field(None, description="Intended use of the data")
    limitations: str | None = Field(None, description="Usage restrictions or limitations")
    retention_days: int | None = Field(None, description="Data retention period in days")


class DataContractCreate(BaseModel):
    """Request body for creating a data contract."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    version: str = "1.0.0"
    dataset_id: str | None = Field(None, description="FK to sheets.id")
    dataset_name: str | None = None
    domain_id: str | None = Field(None, description="FK to data_domains.id")
    owner_email: str | None = None
    schema_definition: list[ContractColumnSpec] = Field(default_factory=list)
    quality_rules: list[ContractQualityRule] = Field(default_factory=list)
    terms: ContractTerms | None = None


class DataContractUpdate(BaseModel):
    """Request body for updating a data contract."""
    name: str | None = None
    description: str | None = None
    version: str | None = None
    dataset_id: str | None = None
    dataset_name: str | None = None
    domain_id: str | None = None
    owner_email: str | None = None
    schema_definition: list[ContractColumnSpec] | None = None
    quality_rules: list[ContractQualityRule] | None = None
    terms: ContractTerms | None = None


class DataContractResponse(BaseModel):
    """Data contract response model."""
    id: str
    name: str
    description: str | None = None
    version: str = "1.0.0"
    status: str = "draft"
    dataset_id: str | None = None
    dataset_name: str | None = None
    domain_id: str | None = None
    domain_name: str | None = None
    owner_email: str | None = None
    schema_definition: list[ContractColumnSpec] = Field(default_factory=list)
    quality_rules: list[ContractQualityRule] = Field(default_factory=list)
    terms: ContractTerms | None = None
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None
    activated_at: datetime | None = None


# ============================================================================
# Compliance Policies (G6)
# ============================================================================


class PolicyCategory(str, Enum):
    DATA_QUALITY = "data_quality"
    ACCESS_CONTROL = "access_control"
    RETENTION = "retention"
    NAMING = "naming"
    LINEAGE = "lineage"


class PolicySeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class PolicyRuleCondition(BaseModel):
    """A single rule condition within a compliance policy."""
    field: str = Field(..., description="Field or metric to check (e.g., completeness, row_count, column_exists)")
    operator: str = Field(..., description="Comparison: >=, <=, ==, !=, >, <, contains, matches")
    value: str | float | int | bool = Field(..., description="Expected value or threshold")
    message: str | None = Field(None, description="Human-readable violation message")


class PolicyScope(BaseModel):
    """Scope defining what assets a policy applies to."""
    catalog: str | None = Field(None, description="Unity Catalog catalog (or * for all)")
    schema_name: str | None = Field(None, description="Schema name (or * for all)")
    tables: list[str] | None = Field(None, description="Specific table names")
    asset_types: list[str] | None = Field(None, description="Asset types: sheet, template, training_sheet, qa_pair")


class CompliancePolicyCreate(BaseModel):
    """Request body for creating a compliance policy."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: str = "data_quality"
    severity: str = "warning"
    rules: list[PolicyRuleCondition] = Field(..., min_length=1)
    scope: PolicyScope | None = None
    schedule: str | None = Field(None, description="Cron expression for scheduled runs")
    owner_email: str | None = None


class CompliancePolicyUpdate(BaseModel):
    """Request body for updating a compliance policy."""
    name: str | None = None
    description: str | None = None
    category: str | None = None
    severity: str | None = None
    status: str | None = None
    rules: list[PolicyRuleCondition] | None = None
    scope: PolicyScope | None = None
    schedule: str | None = None
    owner_email: str | None = None


class CompliancePolicyResponse(BaseModel):
    """Compliance policy response model."""
    id: str
    name: str
    description: str | None = None
    category: str = "data_quality"
    severity: str = "warning"
    status: str = "enabled"
    rules: list[PolicyRuleCondition] = Field(default_factory=list)
    scope: PolicyScope | None = None
    schedule: str | None = None
    owner_email: str | None = None
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None
    last_evaluation: dict | None = Field(None, description="Most recent evaluation summary")


class PolicyEvaluationRuleResult(BaseModel):
    """Result for a single rule within an evaluation."""
    rule_index: int
    passed: bool
    actual_value: str | float | int | bool | None = None
    message: str | None = None


class PolicyEvaluationResponse(BaseModel):
    """Policy evaluation result."""
    id: str
    policy_id: str
    status: str
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    results: list[PolicyEvaluationRuleResult] = Field(default_factory=list)
    evaluated_at: datetime | None = None
    evaluated_by: str | None = None
    duration_ms: int | None = None


# ============================================================================
# Process Workflows (G7)
# ============================================================================


class WorkflowTriggerType(str, Enum):
    MANUAL = "manual"
    ON_CREATE = "on_create"
    ON_UPDATE = "on_update"
    ON_REVIEW = "on_review"
    SCHEDULED = "scheduled"


class WorkflowStepType(str, Enum):
    ACTION = "action"
    APPROVAL = "approval"
    NOTIFICATION = "notification"
    CONDITION = "condition"


class WorkflowStep(BaseModel):
    """A step within a workflow definition."""
    step_id: str = Field(..., description="Unique step identifier within the workflow")
    name: str = Field(..., min_length=1)
    type: str = Field(..., description="action | approval | notification | condition")
    action: str | None = Field(None, description="Action to perform (e.g., request_review, run_policy, send_notification, update_status)")
    config: dict | None = Field(None, description="Step-specific configuration")
    next_step: str | None = Field(None, description="step_id of next step (null = end)")
    on_reject: str | None = Field(None, description="step_id if approval is rejected")


class WorkflowTriggerConfig(BaseModel):
    """Configuration for workflow triggers."""
    entity_type: str | None = Field(None, description="Entity type: sheet, template, training_sheet")
    schedule: str | None = Field(None, description="Cron expression for scheduled triggers")
    conditions: dict | None = Field(None, description="Additional trigger conditions")


class WorkflowCreate(BaseModel):
    """Request body for creating a workflow."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    trigger_type: str = "manual"
    trigger_config: WorkflowTriggerConfig | None = None
    steps: list[WorkflowStep] = Field(..., min_length=1)
    owner_email: str | None = None


class WorkflowUpdate(BaseModel):
    """Request body for updating a workflow."""
    name: str | None = None
    description: str | None = None
    trigger_type: str | None = None
    trigger_config: WorkflowTriggerConfig | None = None
    steps: list[WorkflowStep] | None = None
    status: str | None = None
    owner_email: str | None = None


class WorkflowResponse(BaseModel):
    """Workflow response model."""
    id: str
    name: str
    description: str | None = None
    trigger_type: str = "manual"
    trigger_config: WorkflowTriggerConfig | None = None
    steps: list[WorkflowStep] = Field(default_factory=list)
    status: str = "draft"
    owner_email: str | None = None
    execution_count: int = 0
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class WorkflowStepResult(BaseModel):
    """Result of executing a single workflow step."""
    step_id: str
    status: str = Field(..., description="completed | failed | skipped")
    output: dict | None = None
    completed_at: str | None = None


class WorkflowExecutionResponse(BaseModel):
    """Workflow execution instance."""
    id: str
    workflow_id: str
    workflow_name: str | None = None
    status: str = "running"
    current_step: str | None = None
    trigger_event: dict | None = None
    step_results: list[WorkflowStepResult] = Field(default_factory=list)
    started_at: datetime | None = None
    started_by: str | None = None
    completed_at: datetime | None = None


# ============================================================================
# Data Products (G9)
# ============================================================================


class DataProductType(str, Enum):
    SOURCE = "source"
    SOURCE_ALIGNED = "source_aligned"
    AGGREGATE = "aggregate"
    CONSUMER_ALIGNED = "consumer_aligned"


class DataProductStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"
    RETIRED = "retired"


class PortType(str, Enum):
    INPUT = "input"
    OUTPUT = "output"


class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVOKED = "revoked"


class DataProductPortSpec(BaseModel):
    """A port (input/output) on a data product."""
    name: str = Field(..., min_length=1)
    description: str | None = None
    port_type: str = Field("output", description="input | output")
    entity_type: str | None = Field(None, description="dataset | contract | model | endpoint")
    entity_id: str | None = None
    entity_name: str | None = None
    config: dict | None = Field(None, description="Port configuration (format, schema, SLA)")


class DataProductCreate(BaseModel):
    """Request body for creating a data product."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    product_type: str = "source"
    domain_id: str | None = Field(None, description="FK to data_domains.id")
    owner_email: str | None = None
    team_id: str | None = Field(None, description="FK to teams.id")
    tags: list[str] = Field(default_factory=list)
    metadata: dict | None = None
    ports: list[DataProductPortSpec] = Field(default_factory=list)


class DataProductUpdate(BaseModel):
    """Request body for updating a data product."""
    name: str | None = None
    description: str | None = None
    product_type: str | None = None
    domain_id: str | None = None
    owner_email: str | None = None
    team_id: str | None = None
    tags: list[str] | None = None
    metadata: dict | None = None


class DataProductPortResponse(BaseModel):
    """Data product port response."""
    id: str
    product_id: str
    name: str
    description: str | None = None
    port_type: str = "output"
    entity_type: str | None = None
    entity_id: str | None = None
    entity_name: str | None = None
    config: dict | None = None
    created_at: datetime | None = None
    created_by: str | None = None


class SubscriptionRequest(BaseModel):
    """Request body for subscribing to a data product."""
    purpose: str | None = Field(None, description="Reason for subscription")
    subscriber_team_id: str | None = None


class SubscriptionResponse(BaseModel):
    """Data product subscription response."""
    id: str
    product_id: str
    subscriber_email: str
    subscriber_team_id: str | None = None
    status: str = "pending"
    purpose: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    created_at: datetime | None = None


class DataProductResponse(BaseModel):
    """Data product response model."""
    id: str
    name: str
    description: str | None = None
    product_type: str = "source"
    status: str = "draft"
    domain_id: str | None = None
    domain_name: str | None = None
    owner_email: str | None = None
    team_id: str | None = None
    team_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict | None = None
    port_count: int = 0
    subscription_count: int = 0
    ports: list[DataProductPortResponse] = Field(default_factory=list)
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None
    published_at: datetime | None = None


# ============================================================================
# Semantic Models (G10)
# ============================================================================


class ConceptType(str, Enum):
    ENTITY = "entity"
    EVENT = "event"
    METRIC = "metric"
    DIMENSION = "dimension"


class LinkType(str, Enum):
    # Business-concept mappings (original)
    MAPS_TO = "maps_to"
    DERIVED_FROM = "derived_from"
    AGGREGATES = "aggregates"
    REPRESENTS = "represents"
    # Lineage forward types
    PRODUCES = "produces"
    TRAINS_ON = "trains_on"
    DEPLOYED_AS = "deployed_as"
    GENERATED_FROM = "generated_from"
    LABELED_BY = "labeled_by"
    FEEDS_INTO = "feeds_into"
    # Lineage inverse types
    PRODUCED_BY = "produced_by"
    USED_TO_TRAIN = "used_to_train"
    DEPLOYMENT_OF = "deployment_of"
    GENERATES = "generates"
    LABELS = "labels"
    FED_BY = "fed_by"
    MAPPED_FROM = "mapped_from"
    DERIVES = "derives"


# Lineage link type relationships (forward → inverse)
LINEAGE_INVERSE_MAP: dict[str, str] = {
    "produces": "produced_by",
    "trains_on": "used_to_train",
    "deployed_as": "deployment_of",
    "generated_from": "generates",
    "labeled_by": "labels",
    "feeds_into": "fed_by",
    "maps_to": "mapped_from",
    "derived_from": "derives",
}

LINEAGE_FORWARD_TYPES = frozenset(LINEAGE_INVERSE_MAP.keys())
LINEAGE_INVERSE_TYPES = frozenset(LINEAGE_INVERSE_MAP.values())
LINEAGE_ALL_TYPES = LINEAGE_FORWARD_TYPES | LINEAGE_INVERSE_TYPES


class SemanticConceptCreate(BaseModel):
    """Request body for creating a business concept."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    parent_id: str | None = None
    concept_type: str = "entity"
    tags: list[str] = Field(default_factory=list)


class SemanticConceptResponse(BaseModel):
    """Business concept response."""
    id: str
    model_id: str
    name: str
    description: str | None = None
    parent_id: str | None = None
    concept_type: str = "entity"
    tags: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    created_by: str | None = None
    properties: list["SemanticPropertyResponse"] = Field(default_factory=list)


class SemanticPropertyCreate(BaseModel):
    """Request body for creating a business property."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    data_type: str | None = Field(None, description="string | number | boolean | date | enum")
    is_required: bool = False
    enum_values: list[str] | None = None


class SemanticPropertyResponse(BaseModel):
    """Business property response."""
    id: str
    concept_id: str
    model_id: str
    name: str
    description: str | None = None
    data_type: str | None = None
    is_required: bool = False
    enum_values: list[str] | None = None
    created_at: datetime | None = None
    created_by: str | None = None


class SemanticLinkCreate(BaseModel):
    """Request body for creating a semantic link."""
    source_type: str = Field(..., description="concept | property")
    source_id: str = Field(..., min_length=1)
    target_type: str = Field(..., description="table | column | sheet | contract | product")
    target_id: str | None = None
    target_name: str | None = None
    link_type: str = "maps_to"
    confidence: float | None = Field(None, ge=0.0, le=1.0)
    notes: str | None = None


class SemanticLinkResponse(BaseModel):
    """Semantic link response."""
    id: str
    model_id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str | None = None
    target_name: str | None = None
    link_type: str = "maps_to"
    confidence: float | None = None
    notes: str | None = None
    created_at: datetime | None = None
    created_by: str | None = None


class SemanticModelCreate(BaseModel):
    """Request body for creating a semantic model."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    domain_id: str | None = None
    owner_email: str | None = None
    version: str = "1.0.0"


class SemanticModelUpdate(BaseModel):
    """Request body for updating a semantic model."""
    name: str | None = None
    description: str | None = None
    domain_id: str | None = None
    owner_email: str | None = None
    version: str | None = None


class SemanticModelResponse(BaseModel):
    """Semantic model response."""
    id: str
    name: str
    description: str | None = None
    domain_id: str | None = None
    domain_name: str | None = None
    owner_email: str | None = None
    status: str = "draft"
    version: str = "1.0.0"
    metadata: dict | None = None
    concept_count: int = 0
    link_count: int = 0
    concepts: list[SemanticConceptResponse] = Field(default_factory=list)
    links: list[SemanticLinkResponse] = Field(default_factory=list)
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


# ============================================================================
# Naming Conventions (G15)
# ============================================================================


class NamingEntityType(str, Enum):
    SHEET = "sheet"
    TEMPLATE = "template"
    TRAINING_SHEET = "training_sheet"
    DOMAIN = "domain"
    TEAM = "team"
    PROJECT = "project"
    CONTRACT = "contract"
    PRODUCT = "product"
    SEMANTIC_MODEL = "semantic_model"
    ROLE = "role"


class NamingConventionCreate(BaseModel):
    """Request body for creating a naming convention."""
    entity_type: str = Field(..., description="Entity type this convention applies to")
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    pattern: str = Field(..., min_length=1, description="Regex pattern that names must match")
    example_valid: str | None = None
    example_invalid: str | None = None
    error_message: str | None = None
    is_active: bool = True
    priority: int = 0


class NamingConventionUpdate(BaseModel):
    """Request body for updating a naming convention."""
    name: str | None = None
    description: str | None = None
    pattern: str | None = None
    example_valid: str | None = None
    example_invalid: str | None = None
    error_message: str | None = None
    is_active: bool | None = None
    priority: int | None = None


class NamingConventionResponse(BaseModel):
    """Naming convention response model."""
    id: str
    entity_type: str
    name: str
    description: str | None = None
    pattern: str
    example_valid: str | None = None
    example_invalid: str | None = None
    error_message: str | None = None
    is_active: bool = True
    priority: int = 0
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class NamingValidationResult(BaseModel):
    """Result of validating a name against conventions."""
    entity_type: str
    name: str
    valid: bool
    violations: list[dict] = Field(default_factory=list, description="List of {convention_id, convention_name, pattern, error_message}")


# ============================================================================
# Dataset Marketplace (G14)
# ============================================================================


class MarketplaceSearchParams(BaseModel):
    """Parameters for marketplace search."""
    query: str | None = Field(None, description="Full-text search across name and description")
    product_type: str | None = Field(None, description="Filter by product type")
    domain_id: str | None = Field(None, description="Filter by domain")
    team_id: str | None = Field(None, description="Filter by team")
    tags: list[str] | None = Field(None, description="Filter by tags (any match)")
    owner_email: str | None = Field(None, description="Filter by owner")
    sort_by: str = Field("updated_at", description="Sort field: updated_at, name, subscription_count")
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class MarketplaceProductResponse(BaseModel):
    """Marketplace product card data."""
    id: str
    name: str
    description: str | None = None
    product_type: str
    status: str
    domain_id: str | None = None
    domain_name: str | None = None
    team_id: str | None = None
    team_name: str | None = None
    owner_email: str | None = None
    tags: list[str] = Field(default_factory=list)
    port_count: int = 0
    subscription_count: int = 0
    ports: list[dict] = Field(default_factory=list)
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None


class MarketplaceSearchResult(BaseModel):
    """Paginated marketplace search results."""
    products: list[MarketplaceProductResponse] = Field(default_factory=list)
    total: int = 0
    limit: int = 20
    offset: int = 0
    facets: dict = Field(default_factory=dict, description="Facet counts for filters")


class MarketplaceStatsResponse(BaseModel):
    """Marketplace overview statistics."""
    total_products: int = 0
    published_products: int = 0
    total_subscriptions: int = 0
    products_by_type: dict[str, int] = Field(default_factory=dict)
    products_by_domain: list[dict] = Field(default_factory=list)
    recent_products: list[MarketplaceProductResponse] = Field(default_factory=list)
    conventions_checked: int = 0


# ============================================================================
# Delivery Modes (G12)
# ============================================================================


class DeliveryModeType(str, Enum):
    direct = "direct"
    indirect = "indirect"
    manual = "manual"


class DeliveryRecordStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    rejected = "rejected"


class DeliveryModeCreate(BaseModel):
    """Create a delivery mode configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    mode_type: DeliveryModeType
    is_default: bool = False
    requires_approval: bool = False
    approved_roles: list[str] | None = None
    git_repo_url: str | None = None
    git_branch: str | None = None
    git_path: str | None = None
    yaml_template: str | None = None
    manual_instructions: str | None = None
    environment: str | None = None
    config: dict | None = None


class DeliveryModeUpdate(BaseModel):
    """Update a delivery mode configuration."""
    name: str | None = None
    description: str | None = None
    requires_approval: bool | None = None
    approved_roles: list[str] | None = None
    git_repo_url: str | None = None
    git_branch: str | None = None
    git_path: str | None = None
    yaml_template: str | None = None
    manual_instructions: str | None = None
    environment: str | None = None
    config: dict | None = None
    is_active: bool | None = None


class DeliveryModeResponse(BaseModel):
    """Delivery mode response."""
    id: str
    name: str
    description: str | None = None
    mode_type: str
    is_default: bool = False
    requires_approval: bool = False
    approved_roles: list[str] | None = None
    git_repo_url: str | None = None
    git_branch: str | None = None
    git_path: str | None = None
    yaml_template: str | None = None
    manual_instructions: str | None = None
    environment: str | None = None
    config: dict | None = None
    is_active: bool = True
    delivery_count: int = 0
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class DeliveryRecordCreate(BaseModel):
    """Create a delivery record."""
    delivery_mode_id: str
    model_name: str
    model_version: str | None = None
    endpoint_name: str | None = None
    notes: str | None = None


class DeliveryRecordResponse(BaseModel):
    """Delivery record response."""
    id: str
    delivery_mode_id: str
    delivery_mode_name: str | None = None
    mode_type: str | None = None
    model_name: str
    model_version: str | None = None
    endpoint_name: str | None = None
    status: str = "pending"
    requested_by: str
    requested_at: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None
    notes: str | None = None
    result: dict | None = None


# ============================================================================
# MCP Integration (G11)
# ============================================================================

class MCPTokenScope(str, Enum):
    read = "read"
    read_write = "read_write"
    admin = "admin"


class MCPToolCategory(str, Enum):
    data = "data"
    training = "training"
    deployment = "deployment"
    monitoring = "monitoring"
    governance = "governance"
    general = "general"


class MCPInvocationStatus(str, Enum):
    success = "success"
    error = "error"
    denied = "denied"
    rate_limited = "rate_limited"


class MCPTokenCreate(BaseModel):
    """Create an MCP token."""
    name: str
    description: str | None = None
    scope: MCPTokenScope = MCPTokenScope.read
    allowed_tools: list[str] | None = None
    allowed_resources: list[str] | None = None
    team_id: str | None = None
    expires_at: datetime | None = None
    rate_limit_per_minute: int = 60


class MCPTokenUpdate(BaseModel):
    """Update an MCP token."""
    name: str | None = None
    description: str | None = None
    scope: MCPTokenScope | None = None
    allowed_tools: list[str] | None = None
    allowed_resources: list[str] | None = None
    is_active: bool | None = None
    expires_at: datetime | None = None
    rate_limit_per_minute: int | None = None


class MCPTokenResponse(BaseModel):
    """MCP token response (never includes token value)."""
    id: str
    name: str
    description: str | None = None
    token_prefix: str
    scope: str
    allowed_tools: list[str] | None = None
    allowed_resources: list[str] | None = None
    owner_email: str
    team_id: str | None = None
    team_name: str | None = None
    is_active: bool = True
    expires_at: datetime | None = None
    last_used_at: datetime | None = None
    usage_count: int = 0
    rate_limit_per_minute: int = 60
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class MCPTokenCreateResult(BaseModel):
    """Result of token creation — includes plain-text token value (shown once)."""
    token: MCPTokenResponse
    token_value: str


class MCPToolCreate(BaseModel):
    """Create/register an MCP tool."""
    name: str
    description: str | None = None
    category: MCPToolCategory = MCPToolCategory.general
    input_schema: dict | None = None
    required_scope: MCPTokenScope = MCPTokenScope.read
    required_permission: str | None = None
    endpoint_path: str | None = None
    version: str = "1.0"


class MCPToolUpdate(BaseModel):
    """Update an MCP tool."""
    name: str | None = None
    description: str | None = None
    category: MCPToolCategory | None = None
    input_schema: dict | None = None
    required_scope: MCPTokenScope | None = None
    required_permission: str | None = None
    is_active: bool | None = None
    endpoint_path: str | None = None
    version: str | None = None


class MCPToolResponse(BaseModel):
    """MCP tool response."""
    id: str
    name: str
    description: str | None = None
    category: str
    input_schema: dict | None = None
    required_scope: str
    required_permission: str | None = None
    is_active: bool = True
    version: str = "1.0"
    endpoint_path: str | None = None
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class MCPInvocationResponse(BaseModel):
    """MCP invocation audit log entry."""
    id: str
    token_id: str
    token_name: str | None = None
    tool_id: str
    tool_name: str | None = None
    input_params: dict | None = None
    output_summary: str | None = None
    status: str
    error_message: str | None = None
    duration_ms: int | None = None
    invoked_at: datetime | None = None


class MCPStatsResponse(BaseModel):
    """MCP integration statistics."""
    total_tokens: int
    active_tokens: int
    total_tools: int
    active_tools: int
    total_invocations: int
    invocations_today: int
    invocations_by_status: dict[str, int]
    top_tools: list[dict]


# ============================================================================
# Multi-Platform Connectors (G13)
# ============================================================================

class ConnectorPlatform(str, Enum):
    unity_catalog = "unity_catalog"
    snowflake = "snowflake"
    kafka = "kafka"
    power_bi = "power_bi"
    s3 = "s3"
    custom = "custom"


class ConnectorStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    error = "error"
    testing = "testing"


class SyncDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"
    bidirectional = "bidirectional"


class SyncStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class ConnectorCreate(BaseModel):
    """Create a platform connector."""
    name: str
    description: str | None = None
    platform: ConnectorPlatform
    connection_config: dict | None = None
    sync_direction: SyncDirection = SyncDirection.inbound
    sync_schedule: str | None = None
    team_id: str | None = None


class ConnectorUpdate(BaseModel):
    """Update a platform connector."""
    name: str | None = None
    description: str | None = None
    connection_config: dict | None = None
    sync_direction: SyncDirection | None = None
    sync_schedule: str | None = None
    status: ConnectorStatus | None = None
    is_active: bool | None = None


class ConnectorResponse(BaseModel):
    """Platform connector response."""
    id: str
    name: str
    description: str | None = None
    platform: str
    status: str
    connection_config: dict | None = None
    sync_direction: str
    sync_schedule: str | None = None
    owner_email: str | None = None
    team_id: str | None = None
    team_name: str | None = None
    last_sync_at: datetime | None = None
    last_sync_status: str | None = None
    asset_count: int = 0
    sync_count: int = 0
    is_active: bool = True
    created_at: datetime | None = None
    created_by: str | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class ConnectorAssetResponse(BaseModel):
    """Connector asset response."""
    id: str
    connector_id: str
    external_id: str
    external_name: str
    asset_type: str
    local_reference: str | None = None
    metadata: dict | None = None
    last_synced_at: datetime | None = None
    created_at: datetime | None = None


class ConnectorSyncResponse(BaseModel):
    """Connector sync record response."""
    id: str
    connector_id: str
    connector_name: str | None = None
    status: str
    direction: str
    assets_synced: int = 0
    assets_failed: int = 0
    error_message: str | None = None
    started_at: datetime | None = None
    started_by: str | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None


class ConnectorStatsResponse(BaseModel):
    """Connector statistics."""
    total_connectors: int
    active_connectors: int
    total_assets: int
    total_syncs: int
    connectors_by_platform: dict[str, int]
    recent_syncs: list[dict]


# ============================================================================
# Lineage Graph (extends G10)
# ============================================================================


class LineageEntityType(str, Enum):
    SHEET = "sheet"
    TEMPLATE = "template"
    TRAINING_SHEET = "training_sheet"
    MODEL = "model"
    ENDPOINT = "endpoint"


class LineageNode(BaseModel):
    """A node in the lineage graph representing a pipeline entity."""
    entity_type: str = Field(..., description="sheet | template | training_sheet | model | endpoint")
    entity_id: str
    entity_name: str | None = None
    metadata: dict | None = None


class LineageEdge(BaseModel):
    """A directed edge in the lineage graph."""
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    link_type: str
    confidence: float | None = None


class MaterializeResult(BaseModel):
    """Result of a lineage materialization run."""
    edges_created: int = 0
    edges_updated: int = 0
    edges_deleted: int = 0
    edges_by_type: dict[str, int] = Field(default_factory=dict)
    duration_ms: float = 0


class LineageGraph(BaseModel):
    """Full lineage graph with nodes and edges."""
    nodes: list[LineageNode] = Field(default_factory=list)
    edges: list[LineageEdge] = Field(default_factory=list)
    model_id: str | None = None
    materialize_stats: MaterializeResult | None = None


class ImpactReport(BaseModel):
    """Impact analysis report showing blast radius from a source entity change."""
    source_entity: LineageNode
    affected_training_sheets: list[LineageNode] = Field(default_factory=list)
    affected_models: list[LineageNode] = Field(default_factory=list)
    affected_endpoints: list[LineageNode] = Field(default_factory=list)
    total_affected: int = 0
    risk_level: str = "low"
    paths: list[list[LineageEdge]] = Field(default_factory=list)


class TraversalResult(BaseModel):
    """Result of a graph traversal (upstream or downstream)."""
    root_entity: LineageNode
    direction: str = Field(..., description="upstream | downstream")
    max_depth: int = 10
    graph: LineageGraph = Field(default_factory=LineageGraph)
    entity_count_by_type: dict[str, int] = Field(default_factory=dict)
