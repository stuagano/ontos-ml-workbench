"""
Gap Analysis API Endpoints
==========================

REST endpoints for gap analysis, gap management, and annotation tasks.

Endpoints:
- POST /gaps/analyze - Run gap analysis on a model
- GET /gaps - List identified gaps
- GET /gaps/{gap_id} - Get gap details
- POST /gaps - Create gap manually
- PUT /gaps/{gap_id} - Update gap status
- POST /gaps/{gap_id}/task - Create annotation task for a gap
- GET /tasks - List annotation tasks
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.gap_analysis import (
    AnnotationTaskCreate,
    AnnotationTaskResponse,
    GapAnalysisRequest,
    GapAnalysisResponse,
    GapCreate,
    GapListResponse,
    GapResponse,
    GapSeverity,
    GapStatus,
    GapUpdate,
)
from app.services.gap_analysis_service import (
    create_annotation_task,
    create_gap_record,
    get_gap,
    list_gaps,
    run_full_gap_analysis,
)
from app.services.mlflow_integration_service import (
    check_and_analyze_model,
    handle_model_registered_webhook,
    run_scheduled_analysis,
)

router = APIRouter(prefix="/gaps", tags=["Gap Analysis"])


# ============================================================================
# Gap Analysis Endpoints
# ============================================================================


@router.post("/analyze", response_model=GapAnalysisResponse)
async def analyze_gaps(request: GapAnalysisRequest) -> GapAnalysisResponse:
    """
    Run gap analysis on a model.

    Analyzes model errors, coverage distribution, quality by segment,
    and emerging topics to identify gaps in training data.
    """
    return await run_full_gap_analysis(
        model_name=request.model_name,
        model_version=request.model_version,
        template_id=request.template_id,
        analysis_types=request.analysis_types,
        auto_create_tasks=request.auto_create_tasks,
    )


@router.post("/check-model")
async def check_model_performance(
    model_name: str,
    model_version: str,
    baseline_version: str | None = None,
    threshold: float = Query(default=0.05, description="Degradation threshold (0-1)"),
    force: bool = Query(default=False, description="Force analysis even if no degradation"),
):
    """
    Check model performance and run gap analysis if degraded.

    Compares current model version against baseline and triggers
    gap analysis if performance has dropped below threshold.
    """
    return await check_and_analyze_model(
        model_name=model_name,
        model_version=model_version,
        baseline_version=baseline_version,
        performance_threshold=threshold,
        force=force,
    )


@router.post("/scheduled-analysis")
async def scheduled_analysis(
    models: list[dict[str, str]],
    threshold: float = Query(default=0.05, description="Degradation threshold"),
):
    """
    Run scheduled gap analysis on multiple models.

    Useful for batch analysis jobs.
    """
    return await run_scheduled_analysis(
        models_to_watch=models,
        performance_threshold=threshold,
    )


@router.post("/webhook")
async def mlflow_webhook(payload: dict):
    """
    Handle MLflow model registry webhooks.

    Automatically triggers gap analysis when new model versions
    are registered or transitioned.
    """
    return await handle_model_registered_webhook(payload)


# ============================================================================
# Gap Management Endpoints
# ============================================================================


@router.get("", response_model=GapListResponse)
async def list_all_gaps(
    model_name: str | None = Query(default=None, description="Filter by model"),
    severity: GapSeverity | None = Query(default=None, description="Filter by severity"),
    status: GapStatus | None = Query(default=None, description="Filter by status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> GapListResponse:
    """
    List identified gaps with optional filters.

    By default, excludes resolved and won't-fix gaps.
    """
    offset = (page - 1) * page_size
    gaps, total = await list_gaps(
        model_name=model_name,
        severity=severity,
        status=status,
        limit=page_size,
        offset=offset,
    )

    return GapListResponse(
        gaps=gaps,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{gap_id}", response_model=GapResponse)
async def get_gap_details(gap_id: str) -> GapResponse:
    """Get details of a specific gap."""
    gap = await get_gap(gap_id)
    if not gap:
        raise HTTPException(status_code=404, detail=f"Gap {gap_id} not found")
    return gap


@router.post("", response_model=GapResponse)
async def create_gap(gap: GapCreate) -> GapResponse:
    """
    Create a gap record manually.

    Use this to record gaps identified through other means
    (e.g., user feedback, manual review).
    """
    return await create_gap_record(gap)


@router.put("/{gap_id}", response_model=GapResponse)
async def update_gap(gap_id: str, update: GapUpdate) -> GapResponse:
    """Update a gap's status or other fields."""
    gap = await get_gap(gap_id)
    if not gap:
        raise HTTPException(status_code=404, detail=f"Gap {gap_id} not found")

    # Apply updates
    if update.status:
        gap.status = update.status
    if update.severity:
        gap.severity = update.severity
    if update.suggested_action:
        gap.suggested_action = update.suggested_action

    # TODO: Persist update to database

    return gap


# ============================================================================
# Annotation Task Endpoints
# ============================================================================


@router.post("/{gap_id}/task", response_model=AnnotationTaskResponse)
async def create_task_for_gap(
    gap_id: str,
    task: AnnotationTaskCreate | None = None,
) -> AnnotationTaskResponse:
    """
    Create an annotation task to address a gap.

    If task details are not provided, generates default task
    based on the gap information.
    """
    gap = await get_gap(gap_id)
    if not gap:
        raise HTTPException(status_code=404, detail=f"Gap {gap_id} not found")

    # Use provided task or generate from gap
    if not task:
        task = AnnotationTaskCreate(
            title=f"Fill gap: {gap.description[:50]}...",
            description=gap.description,
            instructions=f"Create training data to address: {gap.suggested_action or gap.description}",
            source_gap_id=gap_id,
            target_record_count=gap.estimated_records_needed or 100,
            priority=gap.severity.value,
        )
    else:
        task.source_gap_id = gap_id

    return await create_annotation_task(task)


@router.get("/tasks", response_model=list[AnnotationTaskResponse])
async def list_annotation_tasks(
    status: str | None = Query(default=None, description="Filter by status"),
    team: str | None = Query(default=None, description="Filter by assigned team"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """List annotation tasks."""
    # TODO: Implement task listing from database
    return []
