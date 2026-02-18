"""Databricks SDK client and authentication."""

from functools import lru_cache

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

from app.core.config import get_settings


@lru_cache
def get_workspace_client() -> WorkspaceClient:
    """
    Get Databricks WorkspaceClient.

    Authentication priority:
    1. Databricks App context (automatic, uses DATABRICKS_RUNTIME_VERSION env var)
    2. CLI profile (OAuth U2M via `databricks auth login`)
    3. Explicit token (for backwards compatibility)
    4. Default SDK auth chain (env vars, ~/.databrickscfg, etc.)
    """
    settings = get_settings()

    # If a CLI profile is specified, use it (OAuth U2M)
    if settings.databricks_config_profile:
        return WorkspaceClient(profile=settings.databricks_config_profile)

    # If running locally with explicit credentials (legacy PAT approach)
    if settings.databricks_token and settings.databricks_host:
        return WorkspaceClient(
            host=settings.databricks_host, token=settings.databricks_token
        )

    # In Databricks App context or using default SDK auth chain
    return WorkspaceClient()


def get_current_user() -> str:
    """Get the current authenticated user."""
    client = get_workspace_client()
    me = client.current_user.me()
    return me.user_name or "unknown"


def get_workspace_url() -> str:
    """Get the workspace URL for deep links."""
    client = get_workspace_client()
    return client.config.host.rstrip("/")
