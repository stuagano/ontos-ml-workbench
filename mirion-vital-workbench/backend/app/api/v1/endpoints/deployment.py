"""
Deployment API endpoints for model serving management.

Provides one-click deployment from trained models to Databricks Model Serving.
"""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.deployment_service import get_deployment_service

router = APIRouter(prefix="/deployment", tags=["deployment"])


# ============================================================================
# Request/Response Models
# ============================================================================


class DeployModelRequest(BaseModel):
    """Request to deploy a model to serving."""

    model_name: str = Field(..., description="Full model name (catalog.schema.model)")
    model_version: str = Field(..., description="Model version to deploy")
    endpoint_name: str | None = Field(
        None, description="Endpoint name (auto-generated if not provided)"
    )
    workload_size: str = Field(
        "Small", description="Compute size: Small, Medium, Large"
    )
    scale_to_zero: bool = Field(True, description="Scale to zero when idle")
    environment_vars: dict[str, str] | None = Field(
        None, description="Environment variables"
    )


class QueryEndpointRequest(BaseModel):
    """Request to query a serving endpoint."""

    inputs: dict[str, Any] | list[dict[str, Any]] = Field(
        ..., description="Input data for the model"
    )


class DeploymentResponse(BaseModel):
    """Response from deployment operation."""

    deployment_id: str
    endpoint_name: str
    model_name: str
    model_version: str
    action: str
    status: str
    message: str


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/models")
async def list_models(catalog: str | None = None) -> list[dict[str, Any]]:
    """
    List models from Unity Catalog Model Registry.

    Args:
        catalog: Optional catalog to filter by

    Returns:
        List of registered models
    """
    service = get_deployment_service()
    return service.list_models(catalog=catalog)


@router.get("/models/{model_name}/versions")
async def list_model_versions(model_name: str) -> list[dict[str, Any]]:
    """
    List versions of a model.

    Args:
        model_name: Full model name (use URL encoding for dots)

    Returns:
        List of model versions
    """
    # Handle URL-encoded model names
    model_name = model_name.replace("%2F", "/").replace("%2E", ".")

    service = get_deployment_service()
    return service.list_model_versions(model_name)


@router.get("/endpoints")
async def list_serving_endpoints() -> list[dict[str, Any]]:
    """
    List all serving endpoints.

    Returns:
        List of serving endpoints with status
    """
    service = get_deployment_service()
    return service.list_serving_endpoints()


@router.get("/endpoints/{endpoint_name}")
async def get_endpoint_status(endpoint_name: str) -> dict[str, Any]:
    """
    Get detailed status of a serving endpoint.

    Args:
        endpoint_name: Name of the endpoint

    Returns:
        Detailed endpoint status
    """
    service = get_deployment_service()
    try:
        return service.get_endpoint_status(endpoint_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/deploy", response_model=DeploymentResponse)
async def deploy_model(request: DeployModelRequest) -> DeploymentResponse:
    """
    Deploy a model to a serving endpoint.

    Creates a new endpoint or updates an existing one with the specified model.

    Args:
        request: Deployment configuration

    Returns:
        Deployment result with endpoint info
    """
    service = get_deployment_service()
    try:
        result = service.deploy_model(
            model_name=request.model_name,
            model_version=request.model_version,
            endpoint_name=request.endpoint_name,
            workload_size=request.workload_size,
            scale_to_zero=request.scale_to_zero,
            environment_vars=request.environment_vars,
        )
        return DeploymentResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/endpoints/{endpoint_name}")
async def delete_endpoint(endpoint_name: str) -> dict[str, Any]:
    """
    Delete a serving endpoint.

    Args:
        endpoint_name: Name of the endpoint to delete

    Returns:
        Deletion result
    """
    service = get_deployment_service()
    try:
        return service.delete_endpoint(endpoint_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/endpoints/{endpoint_name}/query")
async def query_endpoint(
    endpoint_name: str,
    request: QueryEndpointRequest,
) -> dict[str, Any]:
    """
    Query a serving endpoint (playground functionality).

    Args:
        endpoint_name: Name of the endpoint
        request: Input data for the model

    Returns:
        Model predictions
    """
    service = get_deployment_service()
    try:
        return service.query_endpoint(endpoint_name, request.inputs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
