"""
DSPy Integration API Endpoints

Provides REST API for:
- Exporting Databits to DSPy format
- Managing optimization runs
- Syncing results back to Example Store
"""

import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.sql_service import get_sql_service
from app.models.dspy_models import (
    DSPyExportRequest,
    DSPyExportResult,
    DSPyProgram,
    DSPySignature,
    OptimizationRunCreate,
    OptimizationRunResponse,
)
from app.models.template import TemplateResponse, TemplateStatus
from app.services.dspy_integration_service import DSPyIntegrationService
from app.services.example_store_service import ExampleStoreService

router = APIRouter(prefix="/dspy", tags=["dspy"])


# =============================================================================
# Dependencies
# =============================================================================


def get_dspy_service() -> DSPyIntegrationService:
    """Get DSPy integration service instance."""
    example_store = ExampleStoreService()
    return DSPyIntegrationService(example_store=example_store)


async def get_template_by_id(template_id: str) -> TemplateResponse:
    """Get a template by ID from SQL."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM templates WHERE id = '{template_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Template not found")

    row = rows[0]
    return TemplateResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        version=row["version"],
        status=TemplateStatus(row["status"]),
        input_schema=row.get("input_schema"),
        output_schema=row.get("output_schema"),
        prompt_template=row.get("prompt_template"),
        system_prompt=row.get("system_prompt"),
        examples=json.loads(row["examples"]) if row.get("examples") else [],
        base_model=row.get("base_model"),
        temperature=row.get("temperature"),
        max_tokens=row.get("max_tokens"),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


# =============================================================================
# Signature & Program Export
# =============================================================================


@router.get(
    "/templates/{template_id}/signature",
    response_model=DSPySignature,
    summary="Get DSPy signature for a template",
    description="Convert a Databit/template to a DSPy Signature specification.",
)
async def get_template_signature(
    template_id: str,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> DSPySignature:
    """Get the DSPy Signature for a template."""
    template = await get_template_by_id(template_id)
    return dspy_service.databit_to_signature(template)


@router.get(
    "/templates/{template_id}/program",
    response_model=DSPyProgram,
    summary="Get DSPy program for a template",
    description="Generate a complete DSPy Program including signature and examples.",
)
async def get_template_program(
    template_id: str,
    max_examples: int = Query(5, ge=0, le=50, description="Max examples to include"),
    min_effectiveness: float = Query(0.0, ge=0.0, le=1.0, description="Min effectiveness score"),
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> DSPyProgram:
    """Get the DSPy Program for a template with examples."""
    template = await get_template_by_id(template_id)
    return await dspy_service.create_program(
        template=template,
        max_examples=max_examples,
        min_effectiveness=min_effectiveness,
    )


@router.post(
    "/templates/{template_id}/export",
    response_model=DSPyExportResult,
    summary="Export template as DSPy code",
    description="""
    Export a Databit/template as executable DSPy Python code.

    Returns:
    - Signature class definition
    - Program class definition
    - Training examples (optional)
    - Optimizer setup code (optional)
    """,
)
async def export_template_to_dspy(
    template_id: str,
    request: Optional[DSPyExportRequest] = None,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> DSPyExportResult:
    """Export a template as DSPy code."""
    template = await get_template_by_id(template_id)

    # Use defaults if no request provided
    if request is None:
        request = DSPyExportRequest(databit_id=template_id)
    else:
        request.databit_id = template_id

    return await dspy_service.export_to_dspy(template=template, request=request)


@router.get(
    "/templates/{template_id}/signature-code",
    summary="Get raw DSPy signature code",
    description="Get the Python code for a DSPy Signature class.",
)
async def get_signature_code(
    template_id: str,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> str:
    """Get raw Python code for the DSPy Signature."""
    template = await get_template_by_id(template_id)
    signature = dspy_service.databit_to_signature(template)
    return dspy_service.generate_signature_code(signature)


# =============================================================================
# Optimization Runs
# =============================================================================


@router.post(
    "/runs",
    response_model=OptimizationRunResponse,
    status_code=201,
    summary="Launch optimization run",
    description="""
    Launch a DSPy optimization run for a template.

    This creates an MLflow experiment and optionally submits
    a Databricks job to run the optimization.
    """,
)
async def create_optimization_run(
    request: OptimizationRunCreate,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> OptimizationRunResponse:
    """Launch a new DSPy optimization run."""
    template = await get_template_by_id(request.databit_id)

    run = await dspy_service.launch_optimization_run(
        request=request,
        template=template,
    )

    return dspy_service.to_response(run)


@router.get(
    "/runs/{run_id}",
    response_model=OptimizationRunResponse,
    summary="Get optimization run status",
    description="Get the current status and progress of an optimization run.",
)
async def get_optimization_run(
    run_id: UUID,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
) -> OptimizationRunResponse:
    """Get optimization run status."""
    run = await dspy_service.get_run_status(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return dspy_service.to_response(run)


@router.post(
    "/runs/{run_id}/cancel",
    status_code=204,
    summary="Cancel optimization run",
    description="Cancel a running optimization.",
)
async def cancel_optimization_run(
    run_id: UUID,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
):
    """Cancel an optimization run."""
    success = await dspy_service.cancel_run(run_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Could not cancel run (not found or already completed)",
        )


@router.get(
    "/runs/{run_id}/results",
    summary="Get optimization results",
    description="Get detailed trial results for a completed optimization run.",
)
async def get_optimization_results(
    run_id: UUID,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
):
    """Get optimization run results."""
    results = await dspy_service.get_run_results(run_id)
    if results is None:
        raise HTTPException(status_code=404, detail="Run not found")

    return {"run_id": str(run_id), "trials": results}


@router.post(
    "/runs/{run_id}/sync",
    summary="Sync results to Example Store",
    description="""
    Sync optimization results back to the Example Store.

    Updates effectiveness scores based on which examples
    performed well during optimization.
    """,
)
async def sync_optimization_results(
    run_id: UUID,
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
):
    """Sync optimization results to Example Store."""
    result = await dspy_service.sync_optimization_results(run_id)
    if not result.get("synced"):
        raise HTTPException(
            status_code=400,
            detail=result.get("reason", "Sync failed"),
        )

    return result


# =============================================================================
# Examples for Optimization
# =============================================================================


@router.get(
    "/templates/{template_id}/examples",
    summary="Get examples for optimization",
    description="""
    Get examples optimized for DSPy training.

    Strategies:
    - top: Highest effectiveness examples
    - diverse: Examples across difficulty levels
    - balanced: Mix of top performers and diverse
    """,
)
async def get_examples_for_optimization(
    template_id: str,
    max_examples: int = Query(50, ge=1, le=200),
    strategy: str = Query("balanced", pattern="^(top|diverse|balanced)$"),
    dspy_service: DSPyIntegrationService = Depends(get_dspy_service),
):
    """Get examples formatted for DSPy optimization."""
    # Verify template exists
    await get_template_by_id(template_id)

    examples = await dspy_service.get_examples_for_optimizer(
        databit_id=template_id,
        max_examples=max_examples,
        strategy=strategy,
    )

    return {
        "template_id": template_id,
        "strategy": strategy,
        "count": len(examples),
        "examples": [ex.model_dump() for ex in examples],
    }
