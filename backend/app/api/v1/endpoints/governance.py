"""Governance API endpoints (Roles, Teams, Domains)."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import CurrentUser, get_current_user
from app.core.databricks import get_current_user as get_db_user
from app.models.governance import (
    AppRoleCreate,
    AppRoleResponse,
    AppRoleUpdate,
    CurrentUserResponse,
    DataDomainCreate,
    DataDomainResponse,
    DataDomainUpdate,
    DomainTreeNode,
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
async def create_role(role: AppRoleCreate):
    """Create a new role."""
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
async def update_role(role_id: str, role: AppRoleUpdate):
    """Update a role."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_role(role_id, role.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(role_id: str):
    """Delete a role."""
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
async def assign_user_role(assignment: UserRoleAssignCreate):
    """Assign a role to a user (creates or updates)."""
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
async def create_team(team: TeamCreate):
    """Create a new team."""
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
async def update_team(team_id: str, team: TeamUpdate):
    """Update a team."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_team(team_id, team.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Team not found")
    return result


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(team_id: str):
    """Delete a team and its members."""
    svc = get_governance_service()
    svc.delete_team(team_id)


@router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(team_id: str):
    """List members of a team."""
    svc = get_governance_service()
    return svc.list_team_members(team_id)


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
async def add_team_member(team_id: str, member: TeamMemberAdd):
    """Add a member to a team."""
    user = get_db_user()
    svc = get_governance_service()
    return svc.add_team_member(team_id, member.model_dump(), user)


@router.put("/teams/{team_id}/members/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(team_id: str, member_id: str, member: TeamMemberUpdate):
    """Update a team member's role override."""
    svc = get_governance_service()
    return svc.update_team_member(member_id, member.model_dump(exclude_unset=True))


@router.delete("/teams/{team_id}/members/{member_id}", status_code=204)
async def remove_team_member(team_id: str, member_id: str):
    """Remove a member from a team."""
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
async def create_domain(domain: DataDomainCreate):
    """Create a new data domain."""
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
async def update_domain(domain_id: str, domain: DataDomainUpdate):
    """Update a data domain."""
    user = get_db_user()
    svc = get_governance_service()
    result = svc.update_domain(domain_id, domain.model_dump(exclude_unset=True), user)
    if not result:
        raise HTTPException(status_code=404, detail="Domain not found")
    return result


@router.delete("/domains/{domain_id}", status_code=204)
async def delete_domain(domain_id: str):
    """Delete a data domain."""
    svc = get_governance_service()
    svc.delete_domain(domain_id)
