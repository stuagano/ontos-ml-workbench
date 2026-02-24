"""
Deployment API endpoints for model serving management.

Provides one-click deployment from trained models to Databricks Model Serving.
Supports endpoint lifecycle management, traffic configuration, and A/B testing.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import CurrentUser, require_permission

from app.core.config import get_settings
from app.services.deployment_service import get_deployment_service
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/deployment", tags=["deployment"])
logger = logging.getLogger(__name__)

# Get services
_settings = get_settings()
_sql = get_sql_service()

# Table names
ENDPOINTS_TABLE = _settings.get_table("endpoints_registry")


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
async def deploy_model(request: DeployModelRequest, _auth: CurrentUser = Depends(require_permission("deploy", "write"))) -> DeploymentResponse:
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
async def delete_endpoint(endpoint_name: str, _auth: CurrentUser = Depends(require_permission("deploy", "admin"))) -> dict[str, Any]:
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
    _auth: CurrentUser = Depends(require_permission("deploy", "read")),
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


@router.get("/deployments")
async def list_deployments(
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    """
    List all deployments from the registry.

    Args:
        status: Filter by deployment status
        page: Page number
        page_size: Items per page

    Returns:
        Paginated list of deployments
    """
    service = get_deployment_service()
    try:
        from app.core.config import get_settings

        settings = get_settings()
        table_name = settings.get_table("endpoints_registry")

        conditions = []
        if status:
            conditions.append(f"status = '{status}'")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        offset = (page - 1) * page_size

        # Get total count
        count_sql = f"SELECT COUNT(*) as cnt FROM {table_name} {where_clause}"
        count_result = service.sql.execute(count_sql)
        total = count_result[0]["cnt"] if count_result else 0

        # Get deployments
        query_sql = f"""
        SELECT *
        FROM {table_name}
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        """
        deployments = service.sql.execute(query_sql)

        return {
            "deployments": deployments,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/endpoints/{endpoint_name}/rollback")
async def rollback_deployment(
    endpoint_name: str,
    target_version: str = Query(..., description="Model version to roll back to"),
    _auth: CurrentUser = Depends(require_permission("deploy", "write")),
) -> dict[str, Any]:
    """
    Rollback a deployment to a previous model version.

    Args:
        endpoint_name: Name of the endpoint
        target_version: Model version to roll back to

    Returns:
        Rollback result
    """
    service = get_deployment_service()
    try:
        # Get current endpoint config
        endpoint = service.client.serving_endpoints.get(endpoint_name)

        if not endpoint.config or not endpoint.config.served_entities:
            raise HTTPException(
                status_code=400, detail="Cannot determine current model configuration"
            )

        # Get the model name from current config
        current_entity = endpoint.config.served_entities[0]
        model_name = current_entity.entity_name

        # Deploy the target version
        result = service.deploy_model(
            model_name=model_name,
            model_version=target_version,
            endpoint_name=endpoint_name,
            workload_size=current_entity.workload_size or "Small",
            scale_to_zero=current_entity.scale_to_zero_enabled or True,
        )

        return {
            **result,
            "action": "rollback",
            "previous_version": current_entity.entity_version,
            "target_version": target_version,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/endpoints/{endpoint_name}")
async def update_deployment(
    endpoint_name: str,
    model_version: str = Query(..., description="New model version to deploy"),
    workload_size: str | None = Query(None, description="Update workload size"),
    scale_to_zero: bool | None = Query(None, description="Update scale to zero setting"),
    _auth: CurrentUser = Depends(require_permission("deploy", "write")),
) -> dict[str, Any]:
    """
    Update an existing deployment with a new version or configuration.

    Args:
        endpoint_name: Name of the endpoint
        model_version: New model version
        workload_size: Optional new workload size
        scale_to_zero: Optional new scale to zero setting

    Returns:
        Update result
    """
    service = get_deployment_service()
    try:
        # Get current endpoint config
        endpoint = service.client.serving_endpoints.get(endpoint_name)

        if not endpoint.config or not endpoint.config.served_entities:
            raise HTTPException(
                status_code=400, detail="Cannot determine current model configuration"
            )

        current_entity = endpoint.config.served_entities[0]
        model_name = current_entity.entity_name

        # Use current values if not specified
        final_workload_size = workload_size or current_entity.workload_size or "Small"
        final_scale_to_zero = (
            scale_to_zero
            if scale_to_zero is not None
            else current_entity.scale_to_zero_enabled or True
        )

        # Deploy the new version
        result = service.deploy_model(
            model_name=model_name,
            model_version=model_version,
            endpoint_name=endpoint_name,
            workload_size=final_workload_size,
            scale_to_zero=final_scale_to_zero,
        )

        return {
            **result,
            "previous_version": current_entity.entity_version,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/endpoints/{endpoint_name}/history")
async def get_deployment_history(
    endpoint_name: str,
    limit: int = Query(10, ge=1, le=100, description="Number of history entries"),
) -> dict[str, Any]:
    """
    Get deployment history for an endpoint.

    Shows all model versions that have been deployed to this endpoint
    along with deployment timestamps and status.

    Args:
        endpoint_name: Name of the endpoint
        limit: Number of history entries to return

    Returns:
        Deployment history
    """
    try:
        # Query lineage table for deployment history
        query_sql = f"""
        SELECT
            model_name,
            model_version,
            status,
            created_at,
            created_by
        FROM {ENDPOINTS_TABLE}
        WHERE endpoint_name = '{endpoint_name}'
        ORDER BY created_at DESC
        LIMIT {limit}
        """
        rows = _sql.execute(query_sql)

        return {
            "endpoint_name": endpoint_name,
            "history": [
                {
                    "model_name": row["model_name"],
                    "model_version": row["model_version"],
                    "status": row["status"],
                    "deployed_at": row["created_at"],
                    "deployed_by": row["created_by"],
                }
                for row in rows
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get deployment history: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get deployment history: {e}"
        )


@router.get("/models/{model_name}/deployments")
async def get_model_deployments(model_name: str) -> dict[str, Any]:
    """
    Get all deployments for a specific model.

    Shows which endpoints are currently serving this model
    and their deployment status.

    Args:
        model_name: Full model name (catalog.schema.model)

    Returns:
        List of endpoints serving this model
    """
    try:
        # Handle URL-encoded model names
        model_name = model_name.replace("%2F", "/").replace("%2E", ".")

        query_sql = f"""
        SELECT
            id,
            name,
            endpoint_name,
            model_version,
            status,
            created_at
        FROM {ENDPOINTS_TABLE}
        WHERE model_name = '{model_name}'
        ORDER BY created_at DESC
        """
        rows = _sql.execute(query_sql)

        return {
            "model_name": model_name,
            "deployments": [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "endpoint_name": row["endpoint_name"],
                    "model_version": row["model_version"],
                    "status": row["status"],
                    "deployed_at": row["created_at"],
                }
                for row in rows
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get model deployments: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get model deployments: {e}"
        )


@router.post("/endpoints/{endpoint_name}/validate")
async def validate_endpoint(endpoint_name: str, _auth: CurrentUser = Depends(require_permission("deploy", "read"))) -> dict[str, Any]:
    """
    Validate an endpoint configuration.

    Performs health checks and configuration validation
    before deployment or after updates.

    Args:
        endpoint_name: Name of the endpoint to validate

    Returns:
        Validation results
    """
    service = get_deployment_service()
    try:
        # Get endpoint status
        status = service.get_endpoint_status(endpoint_name)

        validation_results = {
            "endpoint_name": endpoint_name,
            "is_valid": True,
            "checks": [],
        }

        # Check 1: Endpoint exists and is ready
        if status["state"] != "READY":
            validation_results["checks"].append({
                "check": "endpoint_ready",
                "status": "warning",
                "message": f"Endpoint state is {status['state']}, not READY",
            })
            validation_results["is_valid"] = False
        else:
            validation_results["checks"].append({
                "check": "endpoint_ready",
                "status": "pass",
                "message": "Endpoint is ready",
            })

        # Check 2: Has served entities
        if not status.get("served_entities"):
            validation_results["checks"].append({
                "check": "served_entities",
                "status": "fail",
                "message": "No served entities configured",
            })
            validation_results["is_valid"] = False
        else:
            validation_results["checks"].append({
                "check": "served_entities",
                "status": "pass",
                "message": f"{len(status['served_entities'])} served entities configured",
            })

        # Check 3: All entities are deployed
        for entity in status.get("served_entities", []):
            entity_state = entity.get("state", "unknown")
            if entity_state != "DEPLOYED":
                validation_results["checks"].append({
                    "check": f"entity_{entity['name']}_deployed",
                    "status": "warning",
                    "message": f"Entity {entity['name']} state is {entity_state}",
                })
                validation_results["is_valid"] = False
            else:
                validation_results["checks"].append({
                    "check": f"entity_{entity['name']}_deployed",
                    "status": "pass",
                    "message": f"Entity {entity['name']} is deployed",
                })

        return validation_results

    except Exception as e:
        logger.error(f"Failed to validate endpoint: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to validate endpoint: {e}"
        )


# ============================================================================
# Guardrails
# ============================================================================


class GuardrailParameters(BaseModel):
    """Guardrail parameters for input or output."""

    safety: bool = Field(False, description="Enable safety content filters")
    pii_behavior: str = Field(
        "NONE", description="PII handling: NONE, MASK, BLOCK"
    )
    invalid_keywords: list[str] = Field(
        default_factory=list, description="Keywords to reject"
    )
    valid_topics: list[str] = Field(
        default_factory=list, description="Allowed topics whitelist"
    )


class RateLimitConfig(BaseModel):
    """Rate limit configuration."""

    key: str = Field(
        "ENDPOINT", description="Limit scope: USER, SERVICE_PRINCIPAL, ENDPOINT"
    )
    calls: int = Field(100, description="Calls per renewal period")
    renewal_period: str = Field("minute", description="Renewal period")


class GuardrailsConfig(BaseModel):
    """Full guardrails configuration for a serving endpoint."""

    input_guardrails: GuardrailParameters = Field(
        default_factory=GuardrailParameters
    )
    output_guardrails: GuardrailParameters = Field(
        default_factory=GuardrailParameters
    )
    rate_limits: list[RateLimitConfig] = Field(default_factory=list)


class GuardrailsResponse(BaseModel):
    """Current guardrails state for an endpoint."""

    endpoint_name: str
    guardrails: GuardrailsConfig | None = None
    applied: bool = False


@router.get(
    "/endpoints/{endpoint_name}/guardrails", response_model=GuardrailsResponse
)
async def get_guardrails(endpoint_name: str) -> GuardrailsResponse:
    """Get current guardrails configuration for a serving endpoint."""
    service = get_deployment_service()
    try:
        ws = service.get_workspace_client()
        endpoint = ws.serving_endpoints.get(endpoint_name)

        if not endpoint.ai_gateway:
            return GuardrailsResponse(
                endpoint_name=endpoint_name, applied=False
            )

        gw = endpoint.ai_gateway
        guardrails = gw.guardrails

        def _parse_params(params: Any) -> GuardrailParameters:
            if not params:
                return GuardrailParameters()
            return GuardrailParameters(
                safety=getattr(params, "safety", False) or False,
                pii_behavior=(
                    getattr(getattr(params, "pii", None), "behavior", "NONE")
                    if getattr(params, "pii", None)
                    else "NONE"
                ),
                invalid_keywords=list(
                    getattr(params, "invalid_keywords", None) or []
                ),
                valid_topics=list(
                    getattr(params, "valid_topics", None) or []
                ),
            )

        config = GuardrailsConfig(
            input_guardrails=(
                _parse_params(guardrails.input) if guardrails else GuardrailParameters()
            ),
            output_guardrails=(
                _parse_params(guardrails.output) if guardrails else GuardrailParameters()
            ),
            rate_limits=[
                RateLimitConfig(
                    key=str(getattr(rl, "key", "ENDPOINT")),
                    calls=getattr(rl, "calls", 100) or 100,
                    renewal_period=str(
                        getattr(rl, "renewal_period", "minute")
                    ),
                )
                for rl in (gw.rate_limits or [])
            ],
        )

        return GuardrailsResponse(
            endpoint_name=endpoint_name,
            guardrails=config,
            applied=True,
        )

    except Exception as e:
        logger.error(f"Failed to get guardrails: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get guardrails: {e}"
        )


@router.put(
    "/endpoints/{endpoint_name}/guardrails", response_model=GuardrailsResponse
)
async def set_guardrails(
    endpoint_name: str, config: GuardrailsConfig, _auth: CurrentUser = Depends(require_permission("deploy", "admin"))
) -> GuardrailsResponse:
    """
    Apply guardrails to a serving endpoint via AI Gateway.

    Uses the Databricks SDK `put_ai_gateway()` method to configure
    safety filters, PII handling, keyword filtering, and rate limits.
    """
    service = get_deployment_service()
    try:
        from databricks.sdk.service.serving import (
            AiGatewayGuardrailParameters,
            AiGatewayGuardrailPiiBehavior,
            AiGatewayGuardrails,
            AiGatewayRateLimit,
            AiGatewayRateLimitKey,
            AiGatewayRateLimitRenewalPeriod,
        )

        def _build_params(
            p: GuardrailParameters,
        ) -> AiGatewayGuardrailParameters:
            pii = None
            if p.pii_behavior != "NONE":
                pii = AiGatewayGuardrailPiiBehavior(behavior=p.pii_behavior)
            return AiGatewayGuardrailParameters(
                safety=p.safety,
                pii=pii,
                invalid_keywords=p.invalid_keywords or None,
                valid_topics=p.valid_topics or None,
            )

        guardrails = AiGatewayGuardrails(
            input=_build_params(config.input_guardrails),
            output=_build_params(config.output_guardrails),
        )

        rate_limits = [
            AiGatewayRateLimit(
                key=AiGatewayRateLimitKey(rl.key),
                calls=rl.calls,
                renewal_period=AiGatewayRateLimitRenewalPeriod(
                    rl.renewal_period.upper()
                ),
            )
            for rl in config.rate_limits
        ] or None

        ws = service.get_workspace_client()
        ws.serving_endpoints.put_ai_gateway(
            name=endpoint_name,
            guardrails=guardrails,
            rate_limits=rate_limits,
        )

        logger.info(f"Applied guardrails to endpoint {endpoint_name}")

        return GuardrailsResponse(
            endpoint_name=endpoint_name,
            guardrails=config,
            applied=True,
        )

    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Databricks SDK serving module not available for guardrails",
        )
    except Exception as e:
        logger.error(f"Failed to set guardrails: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to set guardrails: {e}"
        )
