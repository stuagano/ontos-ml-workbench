"""Governance API endpoints (Roles, Teams, Domains, Asset Reviews)."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, get_current_user, require_permission
from app.core.databricks import get_current_user as get_db_user
from app.models.governance import (
    AppRoleCreate,
    AppRoleResponse,
    AppRoleUpdate,
    AssetReviewResponse,
    CurrentUserResponse,
    DataContractCreate,
    DataContractResponse,
    DataContractUpdate,
    DataDomainCreate,
    DataDomainResponse,
    DataDomainUpdate,
    DomainTreeNode,
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
