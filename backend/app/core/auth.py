"""Authentication and authorization for Ontos ML Workbench.

Provides RBAC with per-feature permission levels.
When enforce_auth=False (default), resolves user identity but doesn't block requests.
"""

import json
import logging
from dataclasses import dataclass, field
from enum import Enum

from fastapi import Depends, HTTPException, Request

from app.core.config import get_settings
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class AccessLevel(str, Enum):
    """Permission levels from least to most permissive."""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


# Ordered for comparison
_ACCESS_ORDER = {
    AccessLevel.NONE: 0,
    AccessLevel.READ: 1,
    AccessLevel.WRITE: 2,
    AccessLevel.ADMIN: 3,
}


FEATURES = {
    "sheets": "Dataset definitions",
    "templates": "Prompt templates",
    "labels": "Canonical labels and labeling",
    "training": "Model training and fine-tuning",
    "deploy": "Model deployment and serving",
    "monitor": "Performance monitoring and alerts",
    "improve": "Feedback and gap analysis",
    "labeling_jobs": "Labeling workflow management",
    "registries": "Tools, agents, and endpoints",
    "admin": "Platform administration",
    "governance": "Roles, teams, and domains",
}

# Default role for unassigned users
DEFAULT_ROLE_NAME = "data_consumer"

# Admin role for local dev (no OBO token)
ADMIN_ROLE_NAME = "admin"


@dataclass
class CurrentUser:
    """Resolved user identity with role and permissions."""
    email: str
    display_name: str
    role_id: str
    role_name: str
    permissions: dict[str, str] = field(default_factory=dict)
    allowed_stages: list[str] = field(default_factory=list)


def _has_permission(user: CurrentUser, feature: str, required: str) -> bool:
    """Check if user's permission level meets the required level."""
    user_level = AccessLevel(user.permissions.get(feature, "none"))
    required_level = AccessLevel(required)
    return _ACCESS_ORDER[user_level] >= _ACCESS_ORDER[required_level]


async def get_current_user(request: Request) -> CurrentUser:
    """FastAPI dependency: resolve current user identity and role.

    Authentication flow:
    1. Check X-Forwarded-Access-Token header (Databricks Apps OBO)
    2. Fall back to get_current_user() from databricks.py for local dev
    3. Look up role from user_role_assignments table
    4. Auto-assign data_consumer role if no assignment exists
    """
    # Return cached user if already resolved this request
    if hasattr(request.state, "current_user") and request.state.current_user:
        return request.state.current_user

    settings = get_settings()
    sql = get_sql_service()

    # Resolve user email
    obo_token = request.headers.get("X-Forwarded-Access-Token")
    if obo_token:
        # In Databricks Apps: use OBO token to get user identity
        try:
            from databricks.sdk import WorkspaceClient
            ws = WorkspaceClient(token=obo_token, host=settings.databricks_host or None)
            me = ws.current_user.me()
            user_email = me.user_name or "unknown"
            display_name = me.display_name or user_email
        except Exception as e:
            logger.warning(f"OBO token resolution failed: {e}")
            user_email = "unknown"
            display_name = "Unknown User"
    else:
        # Local dev: use SDK auth chain
        try:
            from app.core.databricks import get_current_user as get_db_user
            user_email = get_db_user()
            display_name = user_email
        except Exception:
            user_email = "local-dev@ontos.local"
            display_name = "Local Developer"

    # Look up role assignment
    table = settings.get_table("user_role_assignments")
    roles_table = settings.get_table("app_roles")

    try:
        rows = sql.execute(
            f"SELECT ura.role_id, r.name as role_name, r.feature_permissions, r.allowed_stages "
            f"FROM {table} ura JOIN {roles_table} r ON ura.role_id = r.id "
            f"WHERE ura.user_email = '{user_email.replace(chr(39), chr(39)+chr(39))}'"
        )
    except Exception as e:
        logger.warning(f"Role lookup failed (tables may not exist yet): {e}")
        rows = []

    if rows:
        row = rows[0]
        permissions = json.loads(row["feature_permissions"]) if row.get("feature_permissions") else {}
        allowed_stages = json.loads(row["allowed_stages"]) if row.get("allowed_stages") else []
        user = CurrentUser(
            email=user_email,
            display_name=display_name,
            role_id=row["role_id"],
            role_name=row["role_name"],
            permissions=permissions,
            allowed_stages=allowed_stages,
        )
    elif not obo_token:
        # Local dev with no assignment → admin role
        user = CurrentUser(
            email=user_email,
            display_name=display_name,
            role_id="role-admin",
            role_name=ADMIN_ROLE_NAME,
            permissions={f: "admin" for f in FEATURES},
            allowed_stages=["data", "label", "curate", "train", "deploy", "monitor", "improve"],
        )
    else:
        # Deployed but no assignment → data_consumer (auto-assign)
        try:
            default_rows = sql.execute(
                f"SELECT id, name, feature_permissions, allowed_stages "
                f"FROM {roles_table} WHERE name = '{DEFAULT_ROLE_NAME}'"
            )
        except Exception:
            default_rows = []

        if default_rows:
            dr = default_rows[0]
            permissions = json.loads(dr["feature_permissions"]) if dr.get("feature_permissions") else {}
            allowed_stages = json.loads(dr["allowed_stages"]) if dr.get("allowed_stages") else []
            user = CurrentUser(
                email=user_email,
                display_name=display_name,
                role_id=dr["id"],
                role_name=dr["name"],
                permissions=permissions,
                allowed_stages=allowed_stages,
            )
        else:
            # Fallback: read-only
            user = CurrentUser(
                email=user_email,
                display_name=display_name,
                role_id="role-data-consumer",
                role_name=DEFAULT_ROLE_NAME,
                permissions={f: "read" for f in FEATURES},
                allowed_stages=["data", "label", "curate", "train", "deploy", "monitor", "improve"],
            )

    # Cache on request
    request.state.current_user = user
    return user


def require_permission(feature: str, level: str):
    """FastAPI dependency factory: require a permission level for a feature.

    When enforce_auth=True: checks permission, raises 403 if insufficient.
    When enforce_auth=False (default): logs warning, allows through.
    """
    async def _check(user: CurrentUser = Depends(get_current_user)):
        if not _has_permission(user, feature, level):
            settings = get_settings()
            msg = f"User {user.email} ({user.role_name}) lacks {level} on {feature}"
            if settings.enforce_auth:
                raise HTTPException(status_code=403, detail=msg)
            else:
                logger.warning(f"[AUTH-SOFT] {msg} (enforce_auth=False, allowing)")
        return user
    return _check


def require_role(*role_names: str):
    """FastAPI dependency factory: require user to have one of the given role names."""
    async def _check(user: CurrentUser = Depends(get_current_user)):
        if user.role_name not in role_names:
            settings = get_settings()
            msg = f"User {user.email} has role {user.role_name}, requires one of {role_names}"
            if settings.enforce_auth:
                raise HTTPException(status_code=403, detail=msg)
            else:
                logger.warning(f"[AUTH-SOFT] {msg} (enforce_auth=False, allowing)")
        return user
    return _check
