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
