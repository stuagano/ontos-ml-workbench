"""Jobs API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.job_service import get_job_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobTriggerRequest(BaseModel):
    """Request body for triggering a job."""

    config: dict
    template_id: str | None = None
    model_id: str | None = None
    endpoint_id: str | None = None


@router.get("/catalog")
async def list_job_types():
    """List all available job types."""
    job_service = get_job_service()
    return job_service.list_job_types()


@router.post("/{job_type}/run")
async def trigger_job(job_type: str, request: JobTriggerRequest):
    """Trigger a job of the specified type."""
    job_service = get_job_service()

    try:
        result = job_service.trigger_job(
            job_type=job_type,
            config=request.config,
            template_id=request.template_id,
            model_id=request.model_id,
            endpoint_id=request.endpoint_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/runs")
async def list_runs(
    template_id: str | None = None,
    job_type: str | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    """List job runs with optional filters."""
    job_service = get_job_service()
    return job_service.list_runs(
        template_id=template_id,
        job_type=job_type,
        status=status,
        limit=limit,
    )


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    """Get status of a job run."""
    job_service = get_job_service()

    try:
        return job_service.get_job_status(run_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: str):
    """Cancel a running job."""
    job_service = get_job_service()

    try:
        return job_service.cancel_job(run_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
