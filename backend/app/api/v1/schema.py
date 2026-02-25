"""API endpoints for schema management and health monitoring."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from app.core.databricks import get_workspace_client
from app.services.schema_service import SchemaService
from databricks.sdk import WorkspaceClient

router = APIRouter(prefix="/schema", tags=["schema"])


@router.get("/status")
async def get_schema_status(
    client: WorkspaceClient = Depends(get_workspace_client)
) -> Dict:
    """
    Get comprehensive schema deployment status.

    Returns:
        - Connection status to Unity Catalog
        - Current catalog and schema names
        - Table health (expected vs existing tables)
        - Row counts per table
        - Schema version information
    """
    try:
        service = SchemaService(client)
        return service.get_schema_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema status: {str(e)}")


@router.post("/deploy")
async def trigger_schema_deployment(
    client: WorkspaceClient = Depends(get_workspace_client)
) -> Dict:
    """
    Trigger schema deployment job (admin only).

    NOTE: Requires DAB schema deployment job to be configured.
    For now, returns instructions for manual deployment.
    """
    try:
        service = SchemaService(client)
        return service.trigger_schema_deployment()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger deployment: {str(e)}")
