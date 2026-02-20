"""Governance API endpoints (Roles, Teams, Domains, Asset Reviews)."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, get_current_user, require_permission
from app.core.databricks import get_current_user as get_db_user
from app.models.governance import (
    AppRoleCreate,
    AppRoleResponse,
    AppRoleUpdate,
    AssetReviewResponse,
    CompliancePolicyCreate,
    CompliancePolicyResponse,
    CompliancePolicyUpdate,
    CurrentUserResponse,
    DataContractCreate,
    DataContractResponse,
    DataContractUpdate,
    DataDomainCreate,
    DataDomainResponse,
    DataDomainUpdate,
    DomainTreeNode,
    PolicyEvaluationResponse,
    ProjectCreate,
    ProjectMemberAdd,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
    ReviewAssign,
    ReviewDecision,
    ReviewRequest,
    TeamCreate,
    TeamMemberAdd,
    TeamMemberResponse,
    TeamMemberUpdate,
    TeamResponse,
    TeamUpdate,
    UserRoleAssignCreate,
    UserRoleAssignmentResponse,
    WorkflowCreate,
    WorkflowExecutionResponse,
    WorkflowResponse,
    WorkflowUpdate,
    DataProductCreate,
    DataProductResponse,
    DataProductUpdate,
    DataProductPortResponse,
    DataProductPortSpec,
    SubscriptionRequest,
    SubscriptionResponse,
    SemanticModelCreate,
    SemanticModelResponse,
    SemanticModelUpdate,
    SemanticConceptCreate,
    SemanticConceptResponse,
    SemanticPropertyCreate,
    SemanticPropertyResponse,
    SemanticLinkCreate,
    SemanticLinkResponse,
    NamingConventionCreate,
    NamingConventionResponse,
    NamingConventionUpdate,
    NamingValidationResult,
    MarketplaceSearchParams,
    MarketplaceSearchResult,
    MarketplaceProductResponse,
    MarketplaceStatsResponse,
    DeliveryModeCreate,
    DeliveryModeResponse,
    DeliveryModeUpdate,
    DeliveryRecordCreate,
    DeliveryRecordResponse,
    MCPTokenCreate,
    MCPTokenCreateResult,
    MCPTokenResponse,
    MCPTokenUpdate,
    MCPToolCreate,
    MCPToolResponse,
    MCPToolUpdate,
    MCPInvocationResponse,
    MCPStatsResponse,
    ConnectorCreate,
    ConnectorResponse,
    ConnectorUpdate,
    ConnectorAssetResponse,
    ConnectorSyncResponse,
    ConnectorStatsResponse,
)
from app.services.governance_service import get_governance_service

router = APIRouter(prefix="/governance", tags=["governance"])


# ============================================================================
# Roles
# ============================================================================


@router.get("/roles", response_model=list[AppRoleResponse])
async def list_roles():
    """List all roles."""
    svc = get_governance_service()
    return svc.list_roles()


@router.post("/roles", response_model=AppRoleResponse, status_code=201)
async def create_role(role: AppRoleCreate, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Create a new role. Requires admin permission on admin feature."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_role(role.model_dump(), user)


@router.get("/roles/{role_id}", response_model=AppRoleResponse)
async def get_role(role_id: str):
    """Get a role by ID."""
    svc = get_governance_service()
    result = svc.get_role(role_id)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


@router.put("/roles/{role_id}", response_model=AppRoleResponse)
async def update_role(role_id: str, role: AppRoleUpdate, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Update a role. Requires admin permission on admin feature."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_role(role_id, role.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(role_id: str, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Delete a role. Requires admin permission on admin feature."""
    svc = get_governance_service()
    svc.delete_role(role_id)


# ============================================================================
# Users
# ============================================================================


@router.get("/users", response_model=list[UserRoleAssignmentResponse])
async def list_user_assignments():
    """List all user role assignments."""
    svc = get_governance_service()
    return svc.list_user_assignments()


@router.get("/users/me", response_model=CurrentUserResponse)
async def get_current_user_info(user: CurrentUser = Depends(get_current_user)):
    """Get current user's role and permissions."""
    return CurrentUserResponse(
        email=user.email,
        display_name=user.display_name,
        role_id=user.role_id,
        role_name=user.role_name,
        permissions=user.permissions,
        allowed_stages=user.allowed_stages,
    )


@router.post("/users/assign", response_model=UserRoleAssignmentResponse)
async def assign_user_role(assignment: UserRoleAssignCreate, _auth: CurrentUser = Depends(require_permission("governance", "admin"))):
    """Assign a role to a user. Requires admin permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.assign_user_role(assignment.model_dump(), user)


# ============================================================================
# Teams
# ============================================================================


@router.get("/teams", response_model=list[TeamResponse])
async def list_teams():
    """List all teams."""
    svc = get_governance_service()
    return svc.list_teams()


@router.post("/teams", response_model=TeamResponse, status_code=201)
async def create_team(team: TeamCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new team. Requires write permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_team(team.model_dump(), user)


@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str):
    """Get a team by ID."""
    svc = get_governance_service()
    result = svc.get_team(team_id)
    if not result:
        raise HTTPException(status_code=404, detail="Team not found")
    return result


@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, team: TeamUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a team. Requires write permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_team(team_id, team.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Team not found")
    return result


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(team_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a team and its members. Requires write permission on governance feature."""
    svc = get_governance_service()
    svc.delete_team(team_id)


@router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(team_id: str):
    """List members of a team."""
    svc = get_governance_service()
    return svc.list_team_members(team_id)


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
async def add_team_member(team_id: str, member: TeamMemberAdd, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Add a member to a team. Requires write permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.add_team_member(team_id, member.model_dump(), user)


@router.put("/teams/{team_id}/members/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(team_id: str, member_id: str, member: TeamMemberUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a team member's role override. Requires write permission on governance feature."""
    svc = get_governance_service()
    return svc.update_team_member(member_id, member.model_dump(exclude_unset=True))


@router.delete("/teams/{team_id}/members/{member_id}", status_code=204)
async def remove_team_member(team_id: str, member_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Remove a member from a team. Requires write permission on governance feature."""
    svc = get_governance_service()
    svc.remove_team_member(member_id)


# ============================================================================
# Data Domains
# ============================================================================


@router.get("/domains", response_model=list[DataDomainResponse])
async def list_domains():
    """List all data domains."""
    svc = get_governance_service()
    return svc.list_domains()


@router.post("/domains", response_model=DataDomainResponse, status_code=201)
async def create_domain(domain: DataDomainCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new data domain. Requires write permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_domain(domain.model_dump(), user)


@router.get("/domains/tree", response_model=list[DomainTreeNode])
async def get_domain_tree():
    """Get hierarchical domain tree."""
    svc = get_governance_service()
    return svc.get_domain_tree()


@router.get("/domains/{domain_id}", response_model=DataDomainResponse)
async def get_domain(domain_id: str):
    """Get a data domain by ID."""
    svc = get_governance_service()
    result = svc.get_domain(domain_id)
    if not result:
        raise HTTPException(status_code=404, detail="Domain not found")
    return result


@router.put("/domains/{domain_id}", response_model=DataDomainResponse)
async def update_domain(domain_id: str, domain: DataDomainUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a data domain. Requires write permission on governance feature."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_domain(domain_id, domain.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Domain not found")
    return result


@router.delete("/domains/{domain_id}", status_code=204)
async def delete_domain(domain_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a data domain. Requires write permission on governance feature."""
    svc = get_governance_service()
    svc.delete_domain(domain_id)


# ============================================================================
# Asset Reviews (G4)
# ============================================================================


@router.get("/reviews", response_model=list[AssetReviewResponse])
async def list_reviews(
    asset_type: str | None = Query(None),
    asset_id: str | None = Query(None),
    status: str | None = Query(None),
    reviewer_email: str | None = Query(None),
):
    """List asset reviews with optional filters."""
    svc = get_governance_service()
    return svc.list_reviews(
        asset_type=asset_type,
        asset_id=asset_id,
        status=status,
        reviewer_email=reviewer_email,
    )


@router.get("/reviews/{review_id}", response_model=AssetReviewResponse)
async def get_review(review_id: str):
    """Get a review by ID."""
    svc = get_governance_service()
    result = svc.get_review(review_id)
    if not result:
        raise HTTPException(status_code=404, detail="Review not found")
    return result


@router.post("/reviews", response_model=AssetReviewResponse, status_code=201)
async def request_review(req: ReviewRequest):
    """Submit an asset for review."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.request_review(req.model_dump(), user)


@router.put("/reviews/{review_id}/assign", response_model=AssetReviewResponse)
async def assign_reviewer(
    review_id: str,
    assignment: ReviewAssign,
    _auth: CurrentUser = Depends(require_permission("governance", "write")),
):
    """Assign a reviewer to a pending review. Requires governance write."""
    svc = get_governance_service()
    result = svc.assign_reviewer(review_id, assignment.reviewer_email)
    if not result:
        raise HTTPException(status_code=404, detail="Review not found")
    return result


@router.put("/reviews/{review_id}/decide", response_model=AssetReviewResponse)
async def submit_decision(review_id: str, decision: ReviewDecision):
    """Submit a review decision (approve, reject, or request changes)."""
    if decision.status not in ("approved", "rejected", "changes_requested"):
        raise HTTPException(status_code=400, detail="Decision must be approved, rejected, or changes_requested")
    svc = get_governance_service()
    review = svc.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return svc.submit_decision(review_id, decision.status, decision.review_notes)


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    _auth: CurrentUser = Depends(require_permission("governance", "write")),
):
    """Delete a review. Requires governance write."""
    svc = get_governance_service()
    svc.delete_review(review_id)


# ============================================================================
# Projects (G8)
# ============================================================================


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects():
    """List all projects."""
    svc = get_governance_service()
    return svc.list_projects()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(project: ProjectCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new project. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_project(project.model_dump(), user)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a project by ID."""
    svc = get_governance_service()
    result = svc.get_project(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a project. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_project(project_id, project.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a project and its members. Requires governance write."""
    svc = get_governance_service()
    svc.delete_project(project_id)


@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(project_id: str):
    """List members of a project."""
    svc = get_governance_service()
    return svc.list_project_members(project_id)


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
async def add_project_member(project_id: str, member: ProjectMemberAdd, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Add a member to a project. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.add_project_member(project_id, member.model_dump(), user)


@router.delete("/projects/{project_id}/members/{member_id}", status_code=204)
async def remove_project_member(project_id: str, member_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Remove a member from a project. Requires governance write."""
    svc = get_governance_service()
    svc.remove_project_member(member_id)


# ============================================================================
# Data Contracts (G5)
# ============================================================================


@router.get("/contracts", response_model=list[DataContractResponse])
async def list_contracts(
    status: str | None = Query(None),
    domain_id: str | None = Query(None),
):
    """List data contracts with optional filters."""
    svc = get_governance_service()
    return svc.list_contracts(status=status, domain_id=domain_id)


@router.post("/contracts", response_model=DataContractResponse, status_code=201)
async def create_contract(contract: DataContractCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new data contract. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_contract(contract.model_dump(), user)


@router.get("/contracts/{contract_id}", response_model=DataContractResponse)
async def get_contract(contract_id: str):
    """Get a data contract by ID."""
    svc = get_governance_service()
    result = svc.get_contract(contract_id)
    if not result:
        raise HTTPException(status_code=404, detail="Contract not found")
    return result


@router.put("/contracts/{contract_id}", response_model=DataContractResponse)
async def update_contract(contract_id: str, contract: DataContractUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a data contract. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_contract(contract_id, contract.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Contract not found")
    return result


@router.put("/contracts/{contract_id}/status", response_model=DataContractResponse)
async def transition_contract_status(
    contract_id: str,
    new_status: str = Query(..., description="Target status: active, deprecated, or retired"),
    _auth: CurrentUser = Depends(require_permission("governance", "write")),
):
    """Transition a contract's lifecycle status. Requires governance write."""
    valid_statuses = {"active", "deprecated", "retired"}
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
    user = get_db_user()
    svc = get_governance_service()
    contract = svc.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return svc.transition_contract(contract_id, new_status, user)


@router.delete("/contracts/{contract_id}", status_code=204)
async def delete_contract(contract_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a data contract. Requires governance write."""
    svc = get_governance_service()
    svc.delete_contract(contract_id)


# ============================================================================
# Compliance Policies (G6)
# ============================================================================


@router.get("/policies", response_model=list[CompliancePolicyResponse])
async def list_policies(
    category: str | None = Query(None),
    status: str | None = Query(None),
):
    """List compliance policies with optional filters."""
    svc = get_governance_service()
    return svc.list_policies(category=category, status=status)


@router.post("/policies", response_model=CompliancePolicyResponse, status_code=201)
async def create_policy(policy: CompliancePolicyCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new compliance policy. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_policy(policy.model_dump(), user)


@router.get("/policies/{policy_id}", response_model=CompliancePolicyResponse)
async def get_policy(policy_id: str):
    """Get a compliance policy by ID."""
    svc = get_governance_service()
    result = svc.get_policy(policy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


@router.put("/policies/{policy_id}", response_model=CompliancePolicyResponse)
async def update_policy(policy_id: str, policy: CompliancePolicyUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a compliance policy. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_policy(policy_id, policy.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


@router.put("/policies/{policy_id}/toggle", response_model=CompliancePolicyResponse)
async def toggle_policy(
    policy_id: str,
    enabled: bool = Query(..., description="Enable or disable the policy"),
    _auth: CurrentUser = Depends(require_permission("governance", "write")),
):
    """Enable or disable a compliance policy. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.toggle_policy(policy_id, enabled, user)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return result


@router.delete("/policies/{policy_id}", status_code=204)
async def delete_policy(policy_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a compliance policy and its evaluations. Requires governance write."""
    svc = get_governance_service()
    svc.delete_policy(policy_id)


@router.get("/policies/{policy_id}/evaluations", response_model=list[PolicyEvaluationResponse])
async def list_evaluations(policy_id: str):
    """List evaluation history for a policy (most recent first, limit 50)."""
    svc = get_governance_service()
    return svc.list_evaluations(policy_id)


@router.post("/policies/{policy_id}/evaluate", response_model=PolicyEvaluationResponse)
async def run_evaluation(policy_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Run a policy evaluation on-demand. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    policy = svc.get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return svc.run_evaluation(policy_id, user)


# ============================================================================
# Process Workflows (G7)
# ============================================================================


@router.get("/workflows", response_model=list[WorkflowResponse])
async def list_workflows(status: str | None = Query(None)):
    """List workflows with optional status filter."""
    svc = get_governance_service()
    return svc.list_workflows(status=status)


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def create_workflow(workflow: WorkflowCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a new workflow. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_workflow(workflow.model_dump(), user)


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str):
    """Get a workflow by ID."""
    svc = get_governance_service()
    result = svc.get_workflow(workflow_id)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.put("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: str, workflow: WorkflowUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a workflow. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_workflow(workflow_id, workflow.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.put("/workflows/{workflow_id}/activate", response_model=WorkflowResponse)
async def activate_workflow(workflow_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Activate a workflow. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.activate_workflow(workflow_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.put("/workflows/{workflow_id}/disable", response_model=WorkflowResponse)
async def disable_workflow(workflow_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Disable a workflow. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.disable_workflow(workflow_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.delete("/workflows/{workflow_id}", status_code=204)
async def delete_workflow(workflow_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a workflow and its executions. Requires governance write."""
    svc = get_governance_service()
    svc.delete_workflow(workflow_id)


@router.get("/workflows/{workflow_id}/executions", response_model=list[WorkflowExecutionResponse])
async def list_executions_for_workflow(workflow_id: str):
    """List execution history for a workflow (most recent first, limit 50)."""
    svc = get_governance_service()
    return svc.list_executions(workflow_id)


@router.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def start_workflow_execution(workflow_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Start a new execution of a workflow. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    workflow = svc.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return svc.start_execution(workflow_id, user, trigger_event={"type": "manual"})


@router.put("/workflows/executions/{execution_id}/cancel", response_model=WorkflowExecutionResponse)
async def cancel_workflow_execution(execution_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Cancel a running workflow execution. Requires governance write."""
    svc = get_governance_service()
    result = svc.cancel_execution(execution_id)
    if not result:
        raise HTTPException(status_code=404, detail="Execution not found")
    return result


# ============================================================================
# Data Products (G9)
# ============================================================================


@router.get("/products", response_model=list[DataProductResponse])
async def list_data_products(
    product_type: str | None = Query(None),
    status: str | None = Query(None),
):
    """List data products with optional filters."""
    svc = get_governance_service()
    return svc.list_data_products(product_type=product_type, status=status)


@router.get("/products/{product_id}", response_model=DataProductResponse)
async def get_data_product(product_id: str):
    """Get a data product by ID (includes ports)."""
    svc = get_governance_service()
    result = svc.get_data_product(product_id)
    if not result:
        raise HTTPException(status_code=404, detail="Data product not found")
    return result


@router.post("/products", response_model=DataProductResponse, status_code=201)
async def create_data_product(data: DataProductCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a data product. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_data_product(data.model_dump(), user)


@router.put("/products/{product_id}", response_model=DataProductResponse)
async def update_data_product(product_id: str, data: DataProductUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a data product. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_data_product(product_id, data.model_dump(exclude_none=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Data product not found")
    return result


@router.put("/products/{product_id}/status", response_model=DataProductResponse)
async def transition_product_status(
    product_id: str,
    new_status: str = Query(...),
    _auth: CurrentUser = Depends(require_permission("governance", "write")),
):
    """Transition a data product's status (publish, deprecate, retire). Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.transition_data_product(product_id, new_status, user)
    if not result:
        raise HTTPException(status_code=404, detail="Data product not found")
    return result


@router.delete("/products/{product_id}", status_code=204)
async def delete_data_product(product_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a data product and its ports/subscriptions. Requires governance write."""
    svc = get_governance_service()
    svc.delete_data_product(product_id)


# Data Product Ports


@router.get("/products/{product_id}/ports", response_model=list[DataProductPortResponse])
async def list_product_ports(product_id: str):
    """List ports for a data product."""
    svc = get_governance_service()
    return svc.list_product_ports(product_id)


@router.post("/products/{product_id}/ports", response_model=DataProductPortResponse, status_code=201)
async def add_product_port(product_id: str, data: DataProductPortSpec, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Add a port to a data product. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.add_product_port(product_id, data.model_dump(), user)


@router.delete("/products/ports/{port_id}", status_code=204)
async def remove_product_port(port_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Remove a port from a data product. Requires governance write."""
    svc = get_governance_service()
    svc.remove_product_port(port_id)


# Data Product Subscriptions


@router.get("/products/{product_id}/subscriptions", response_model=list[SubscriptionResponse])
async def list_product_subscriptions(product_id: str):
    """List subscriptions for a data product."""
    svc = get_governance_service()
    return svc.list_subscriptions(product_id)


@router.post("/products/{product_id}/subscribe", response_model=SubscriptionResponse, status_code=201)
async def subscribe_to_product(product_id: str, data: SubscriptionRequest):
    """Subscribe to a data product."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_subscription(product_id, user, data.model_dump())


@router.put("/products/subscriptions/{subscription_id}/approve", response_model=SubscriptionResponse)
async def approve_subscription(subscription_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Approve a subscription request. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.approve_subscription(subscription_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.put("/products/subscriptions/{subscription_id}/reject", response_model=SubscriptionResponse)
async def reject_subscription(subscription_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Reject a subscription request. Requires governance write."""
    svc = get_governance_service()
    result = svc.reject_subscription(subscription_id)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.put("/products/subscriptions/{subscription_id}/revoke", response_model=SubscriptionResponse)
async def revoke_subscription(subscription_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Revoke an approved subscription. Requires governance write."""
    svc = get_governance_service()
    result = svc.revoke_subscription(subscription_id)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


# ============================================================================
# Semantic Models (G10)
# ============================================================================


@router.get("/semantic-models", response_model=list[SemanticModelResponse])
async def list_semantic_models(status: str | None = Query(None)):
    """List semantic models with optional status filter."""
    svc = get_governance_service()
    return svc.list_semantic_models(status=status)


@router.get("/semantic-models/{model_id}", response_model=SemanticModelResponse)
async def get_semantic_model(model_id: str):
    """Get a semantic model by ID (includes concepts, properties, and links)."""
    svc = get_governance_service()
    result = svc.get_semantic_model(model_id)
    if not result:
        raise HTTPException(status_code=404, detail="Semantic model not found")
    return result


@router.post("/semantic-models", response_model=SemanticModelResponse, status_code=201)
async def create_semantic_model(data: SemanticModelCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a semantic model. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_semantic_model(data.model_dump(), user)


@router.put("/semantic-models/{model_id}", response_model=SemanticModelResponse)
async def update_semantic_model(model_id: str, data: SemanticModelUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a semantic model. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_semantic_model(model_id, data.model_dump(exclude_none=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Semantic model not found")
    return result


@router.put("/semantic-models/{model_id}/publish", response_model=SemanticModelResponse)
async def publish_semantic_model(model_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Publish a semantic model. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.publish_semantic_model(model_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Semantic model not found")
    return result


@router.put("/semantic-models/{model_id}/archive", response_model=SemanticModelResponse)
async def archive_semantic_model(model_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Archive a semantic model. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.archive_semantic_model(model_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Semantic model not found")
    return result


@router.delete("/semantic-models/{model_id}", status_code=204)
async def delete_semantic_model(model_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a semantic model and all its concepts, properties, and links. Requires governance write."""
    svc = get_governance_service()
    svc.delete_semantic_model(model_id)


# Concepts


@router.get("/semantic-models/{model_id}/concepts", response_model=list[SemanticConceptResponse])
async def list_concepts(model_id: str):
    """List concepts for a semantic model (with properties)."""
    svc = get_governance_service()
    return svc.list_concepts(model_id)


@router.post("/semantic-models/{model_id}/concepts", response_model=SemanticConceptResponse, status_code=201)
async def create_concept(model_id: str, data: SemanticConceptCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Add a concept to a semantic model. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_concept(model_id, data.model_dump(), user)


@router.delete("/semantic-models/concepts/{concept_id}", status_code=204)
async def delete_concept(concept_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a concept and its properties/links. Requires governance write."""
    svc = get_governance_service()
    svc.delete_concept(concept_id)


# Properties


@router.post("/semantic-models/{model_id}/concepts/{concept_id}/properties", response_model=SemanticPropertyResponse, status_code=201)
async def add_property(model_id: str, concept_id: str, data: SemanticPropertyCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Add a property to a concept. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.add_property(concept_id, model_id, data.model_dump(), user)


@router.delete("/semantic-models/properties/{property_id}", status_code=204)
async def remove_property(property_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Remove a property and its links. Requires governance write."""
    svc = get_governance_service()
    svc.remove_property(property_id)


# Semantic Links


@router.get("/semantic-models/{model_id}/links", response_model=list[SemanticLinkResponse])
async def list_links(model_id: str):
    """List semantic links for a model."""
    svc = get_governance_service()
    return svc.list_links(model_id)


@router.post("/semantic-models/{model_id}/links", response_model=SemanticLinkResponse, status_code=201)
async def create_link(model_id: str, data: SemanticLinkCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a semantic link. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_link(model_id, data.model_dump(), user)


@router.delete("/semantic-models/links/{link_id}", status_code=204)
async def delete_link(link_id: str, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Delete a semantic link. Requires governance write."""
    svc = get_governance_service()
    svc.delete_link(link_id)


# ============================================================================
# Naming Conventions (G15)
# ============================================================================


@router.get("/naming", response_model=list[NamingConventionResponse])
async def list_naming_conventions(entity_type: str | None = Query(None)):
    """List naming conventions, optionally filtered by entity type."""
    svc = get_governance_service()
    return svc.list_naming_conventions(entity_type)


@router.get("/naming/{convention_id}", response_model=NamingConventionResponse)
async def get_naming_convention(convention_id: str):
    """Get a naming convention by ID."""
    svc = get_governance_service()
    result = svc.get_naming_convention(convention_id)
    if not result:
        raise HTTPException(status_code=404, detail="Naming convention not found")
    return result


@router.post("/naming", response_model=NamingConventionResponse, status_code=201)
async def create_naming_convention(data: NamingConventionCreate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Create a naming convention. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_naming_convention(data.model_dump(), user)


@router.put("/naming/{convention_id}", response_model=NamingConventionResponse)
async def update_naming_convention(convention_id: str, data: NamingConventionUpdate, _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Update a naming convention. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_naming_convention(convention_id, data.model_dump(exclude_none=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Naming convention not found")
    return result


@router.delete("/naming/{convention_id}", status_code=204)
async def delete_naming_convention(convention_id: str, _auth: CurrentUser = Depends(require_permission("governance", "admin"))):
    """Delete a naming convention. Requires governance admin."""
    svc = get_governance_service()
    svc.delete_naming_convention(convention_id)


@router.put("/naming/{convention_id}/toggle", response_model=NamingConventionResponse)
async def toggle_naming_convention(convention_id: str, is_active: bool = Query(...), _auth: CurrentUser = Depends(require_permission("governance", "write"))):
    """Enable or disable a naming convention. Requires governance write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.toggle_naming_convention(convention_id, is_active, user)
    if not result:
        raise HTTPException(status_code=404, detail="Naming convention not found")
    return result


@router.post("/naming/validate", response_model=NamingValidationResult)
async def validate_name(entity_type: str = Query(...), name: str = Query(...)):
    """Validate a name against active naming conventions for an entity type."""
    svc = get_governance_service()
    return svc.validate_name(entity_type, name)


# ============================================================================
# Dataset Marketplace (G14)
# ============================================================================


@router.get("/marketplace/search", response_model=MarketplaceSearchResult)
async def search_marketplace(
    query: str | None = Query(None, description="Full-text search"),
    product_type: str | None = Query(None),
    domain_id: str | None = Query(None),
    team_id: str | None = Query(None),
    tags: str | None = Query(None, description="Comma-separated tag list"),
    owner_email: str | None = Query(None),
    sort_by: str = Query("updated_at"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Search published data products for marketplace discovery."""
    svc = get_governance_service()
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    return svc.search_marketplace(
        query=query,
        product_type=product_type,
        domain_id=domain_id,
        team_id=team_id,
        tags=tag_list,
        owner_email=owner_email,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )


@router.get("/marketplace/stats", response_model=MarketplaceStatsResponse)
async def get_marketplace_stats():
    """Get marketplace overview statistics."""
    svc = get_governance_service()
    return svc.get_marketplace_stats()


@router.get("/marketplace/products/{product_id}", response_model=MarketplaceProductResponse)
async def get_marketplace_product(product_id: str):
    """Get a marketplace product detail (includes ports)."""
    svc = get_governance_service()
    result = svc.get_marketplace_product(product_id)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@router.get("/marketplace/my-subscriptions")
async def get_my_subscriptions():
    """Get the current user's subscriptions across all products."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.get_user_subscriptions(user)


# ============================================================================
# Delivery Modes (G12)
# ============================================================================


@router.get("/delivery-modes", response_model=list[DeliveryModeResponse])
async def list_delivery_modes(
    mode_type: str | None = Query(None),
    active_only: bool = Query(False),
):
    """List delivery mode configurations."""
    svc = get_governance_service()
    return svc.list_delivery_modes(mode_type=mode_type, active_only=active_only)


@router.get("/delivery-modes/{mode_id}", response_model=DeliveryModeResponse)
async def get_delivery_mode(mode_id: str):
    """Get a delivery mode by ID."""
    svc = get_governance_service()
    result = svc.get_delivery_mode(mode_id)
    if not result:
        raise HTTPException(status_code=404, detail="Delivery mode not found")
    return result


@router.post("/delivery-modes", response_model=DeliveryModeResponse, status_code=201)
async def create_delivery_mode(data: DeliveryModeCreate, _auth: CurrentUser = Depends(require_permission("deploy", "admin"))):
    """Create a delivery mode. Requires deploy admin."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_delivery_mode(data.model_dump(), user)


@router.put("/delivery-modes/{mode_id}", response_model=DeliveryModeResponse)
async def update_delivery_mode(mode_id: str, data: DeliveryModeUpdate, _auth: CurrentUser = Depends(require_permission("deploy", "admin"))):
    """Update a delivery mode. Requires deploy admin."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_delivery_mode(mode_id, data.model_dump(exclude_none=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Delivery mode not found")
    return result


@router.delete("/delivery-modes/{mode_id}", status_code=204)
async def delete_delivery_mode(mode_id: str, _auth: CurrentUser = Depends(require_permission("deploy", "admin"))):
    """Delete a delivery mode and its records. Requires deploy admin."""
    svc = get_governance_service()
    svc.delete_delivery_mode(mode_id)


@router.get("/delivery-records", response_model=list[DeliveryRecordResponse])
async def list_delivery_records(
    mode_id: str | None = Query(None),
    status: str | None = Query(None),
):
    """List delivery records with optional filters."""
    svc = get_governance_service()
    return svc.list_delivery_records(mode_id=mode_id, status=status)


@router.post("/delivery-records", response_model=DeliveryRecordResponse, status_code=201)
async def create_delivery_record(data: DeliveryRecordCreate, _auth: CurrentUser = Depends(require_permission("deploy", "write"))):
    """Create a delivery record (request a deployment). Requires deploy write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_delivery_record(data.model_dump(), user)


@router.put("/delivery-records/{record_id}/transition", response_model=DeliveryRecordResponse)
async def transition_delivery_record(
    record_id: str,
    new_status: str = Query(..., description="pending|approved|in_progress|completed|failed|rejected"),
    _auth: CurrentUser = Depends(require_permission("deploy", "write")),
):
    """Transition a delivery record status. Requires deploy write."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.transition_delivery_record(record_id, new_status, user)
    if not result:
        raise HTTPException(status_code=404, detail="Delivery record not found")
    return result


# ============================================================================
# MCP Integration (G11)
# ============================================================================


@router.get("/mcp/stats", response_model=MCPStatsResponse)
async def get_mcp_stats():
    """Get MCP integration statistics."""
    svc = get_governance_service()
    return svc.get_mcp_stats()


@router.get("/mcp/tokens", response_model=list[MCPTokenResponse])
async def list_mcp_tokens(
    active_only: bool = Query(False),
    _auth: CurrentUser = Depends(require_permission("admin", "read")),
):
    """List MCP tokens. Requires admin read."""
    svc = get_governance_service()
    return svc.list_mcp_tokens(active_only=active_only)


@router.get("/mcp/tokens/{token_id}", response_model=MCPTokenResponse)
async def get_mcp_token(token_id: str, _auth: CurrentUser = Depends(require_permission("admin", "read"))):
    """Get an MCP token by ID. Requires admin read."""
    svc = get_governance_service()
    result = svc.get_mcp_token(token_id)
    if not result:
        raise HTTPException(status_code=404, detail="MCP token not found")
    return result


@router.post("/mcp/tokens", response_model=MCPTokenCreateResult, status_code=201)
async def create_mcp_token(data: MCPTokenCreate, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Create an MCP token. Returns token value once. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_mcp_token(data.model_dump(), user)


@router.put("/mcp/tokens/{token_id}", response_model=MCPTokenResponse)
async def update_mcp_token(
    token_id: str, data: MCPTokenUpdate,
    _auth: CurrentUser = Depends(require_permission("admin", "admin")),
):
    """Update an MCP token. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_mcp_token(token_id, data.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="MCP token not found")
    return result


@router.put("/mcp/tokens/{token_id}/revoke", response_model=dict)
async def revoke_mcp_token(token_id: str, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Revoke (deactivate) an MCP token. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    svc.revoke_mcp_token(token_id, user)
    return {"status": "revoked"}


@router.delete("/mcp/tokens/{token_id}", status_code=204)
async def delete_mcp_token(token_id: str, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Delete an MCP token. Requires admin admin."""
    svc = get_governance_service()
    svc.delete_mcp_token(token_id)


@router.get("/mcp/tools", response_model=list[MCPToolResponse])
async def list_mcp_tools(
    active_only: bool = Query(False),
    category: str | None = Query(None),
):
    """List registered MCP tools."""
    svc = get_governance_service()
    return svc.list_mcp_tools(active_only=active_only, category=category)


@router.get("/mcp/tools/{tool_id}", response_model=MCPToolResponse)
async def get_mcp_tool(tool_id: str):
    """Get an MCP tool by ID."""
    svc = get_governance_service()
    result = svc.get_mcp_tool(tool_id)
    if not result:
        raise HTTPException(status_code=404, detail="MCP tool not found")
    return result


@router.post("/mcp/tools", response_model=MCPToolResponse, status_code=201)
async def create_mcp_tool(data: MCPToolCreate, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Register a new MCP tool. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_mcp_tool(data.model_dump(), user)


@router.put("/mcp/tools/{tool_id}", response_model=MCPToolResponse)
async def update_mcp_tool(
    tool_id: str, data: MCPToolUpdate,
    _auth: CurrentUser = Depends(require_permission("admin", "admin")),
):
    """Update an MCP tool. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_mcp_tool(tool_id, data.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="MCP tool not found")
    return result


@router.delete("/mcp/tools/{tool_id}", status_code=204)
async def delete_mcp_tool(tool_id: str, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Delete an MCP tool. Requires admin admin."""
    svc = get_governance_service()
    svc.delete_mcp_tool(tool_id)


@router.get("/mcp/invocations", response_model=list[MCPInvocationResponse])
async def list_mcp_invocations(
    token_id: str | None = Query(None),
    tool_id: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    _auth: CurrentUser = Depends(require_permission("admin", "read")),
):
    """List MCP invocation audit log. Requires admin read."""
    svc = get_governance_service()
    return svc.list_mcp_invocations(token_id=token_id, tool_id=tool_id, status=status, limit=limit)


# ============================================================================
# Multi-Platform Connectors (G13)
# ============================================================================


@router.get("/connectors/stats", response_model=ConnectorStatsResponse)
async def get_connector_stats():
    """Get connector statistics."""
    svc = get_governance_service()
    return svc.get_connector_stats()


@router.get("/connectors", response_model=list[ConnectorResponse])
async def list_connectors(
    active_only: bool = Query(False),
    platform: str | None = Query(None),
):
    """List platform connectors."""
    svc = get_governance_service()
    return svc.list_connectors(active_only=active_only, platform=platform)


@router.get("/connectors/{connector_id}", response_model=ConnectorResponse)
async def get_connector(connector_id: str):
    """Get a connector by ID."""
    svc = get_governance_service()
    result = svc.get_connector(connector_id)
    if not result:
        raise HTTPException(status_code=404, detail="Connector not found")
    return result


@router.post("/connectors", response_model=ConnectorResponse, status_code=201)
async def create_connector(data: ConnectorCreate, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Create a platform connector. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.create_connector(data.model_dump(), user)


@router.put("/connectors/{connector_id}", response_model=ConnectorResponse)
async def update_connector(
    connector_id: str, data: ConnectorUpdate,
    _auth: CurrentUser = Depends(require_permission("admin", "admin")),
):
    """Update a connector. Requires admin admin."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_connector(connector_id, data.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Connector not found")
    return result


@router.delete("/connectors/{connector_id}", status_code=204)
async def delete_connector(connector_id: str, _auth: CurrentUser = Depends(require_permission("admin", "admin"))):
    """Delete a connector. Requires admin admin."""
    svc = get_governance_service()
    svc.delete_connector(connector_id)


@router.post("/connectors/{connector_id}/test", response_model=dict)
async def test_connector(connector_id: str, _auth: CurrentUser = Depends(require_permission("admin", "write"))):
    """Test a connector's connection. Requires admin write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.test_connector(connector_id, user)


@router.get("/connectors/{connector_id}/assets", response_model=list[ConnectorAssetResponse])
async def list_connector_assets(connector_id: str):
    """List assets discovered by a connector."""
    svc = get_governance_service()
    return svc.list_connector_assets(connector_id)


@router.post("/connectors/{connector_id}/sync", response_model=ConnectorSyncResponse)
async def sync_connector(connector_id: str, _auth: CurrentUser = Depends(require_permission("admin", "write"))):
    """Start a sync operation for a connector. Requires admin write."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.sync_connector(connector_id, user)


@router.get("/connector-syncs", response_model=list[ConnectorSyncResponse])
async def list_connector_syncs(
    connector_id: str | None = Query(None),
    status: str | None = Query(None),
):
    """List connector sync records."""
    svc = get_governance_service()
    return svc.list_connector_syncs(connector_id=connector_id, status=status)
