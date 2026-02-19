"""Training Job API endpoints - manage Foundation Model API fine-tuning jobs."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.core.databricks import get_current_user
from app.models.evaluation import (
    ComparisonResult,
    EvaluationMetric,
    EvaluationRequest,
    EvaluationResult,
)
from app.models.training_job import (
    TrainingJobCancelRequest,
    TrainingJobCreate,
    TrainingJobListResponse,
    TrainingJobResponse,
    TrainingJobStatus,
)
from app.services.evaluation_service import (
    compare_evaluations,
    evaluate_model,
    get_evaluation_results,
)
from app.services.training_service import get_training_service

router = APIRouter(prefix="/training", tags=["training"])
logger = logging.getLogger(__name__)


@router.post("/jobs", response_model=TrainingJobResponse, status_code=201)
async def create_training_job(job_request: TrainingJobCreate):
    """Create a new training job.

    Steps:
    1. Validates Training Sheet exists and has labeled pairs
    2. Exports training data in JSONL format
    3. Submits job to Foundation Model API
    4. Creates lineage record
    5. Returns job details

    **Quality Gates:**
    - Only includes Q&A pairs with status='labeled' (expert-approved)
    - Only includes pairs where 'training' IN allowed_uses (governance)
    - Excludes pairs with 'training' IN prohibited_uses (compliance)

    **Example:**
    ```json
    {
      "training_sheet_id": "sheet-123",
      "model_name": "my-invoice-extractor",
      "base_model": "databricks-meta-llama-3-1-70b-instruct",
      "training_config": {
        "epochs": 3,
        "learning_rate": 0.0001,
        "batch_size": 4
      },
      "train_val_split": 0.8,
      "register_to_uc": true,
      "uc_catalog": "ontos_ml",
      "uc_schema": "models"
    }
    ```
    """
    try:
        user = get_current_user()
        training_service = get_training_service()
        job = training_service.create_job(job_request, created_by=user)
        return job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create training job: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create training job: {e}"
        )


@router.get("/jobs", response_model=TrainingJobListResponse)
async def list_training_jobs(
    training_sheet_id: str | None = Query(None, description="Filter by Training Sheet"),
    status: TrainingJobStatus | None = Query(None, description="Filter by status"),
    created_by: str | None = Query(None, description="Filter by creator"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
):
    """List training jobs with optional filtering.

    **Filters:**
    - `training_sheet_id`: See all training runs for a Training Sheet
    - `status`: Filter by job status (pending, queued, running, succeeded, failed, cancelled)
    - `created_by`: See your jobs
    - `page`, `page_size`: Pagination

    **Example:**
    ```
    GET /training/jobs?training_sheet_id=sheet-123&status=succeeded&page=1&page_size=10
    ```
    """
    try:
        training_service = get_training_service()
        jobs, total = training_service.list_jobs(
            training_sheet_id=training_sheet_id,
            status=status,
            created_by=created_by,
            page=page,
            page_size=page_size,
        )
        return TrainingJobListResponse(
            jobs=jobs, total=total, page=page, page_size=page_size
        )
    except Exception as e:
        logger.error(f"Failed to list training jobs: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to list training jobs: {e}"
        )


@router.get("/jobs/{job_id}", response_model=TrainingJobResponse)
async def get_training_job(job_id: str):
    """Get training job details by ID.

    Returns:
    - Job configuration and status
    - Progress information (percent, current epoch)
    - FMAPI and MLflow tracking IDs
    - Metrics (when completed)
    - Error details (if failed)
    """
    try:
        training_service = get_training_service()
        job = training_service.get_job(job_id)
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get training job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get training job: {e}")


@router.post("/jobs/{job_id}/cancel", response_model=TrainingJobResponse)
async def cancel_training_job(
    job_id: str, request: TrainingJobCancelRequest | None = None
):
    """Cancel a running training job.

    **Can only cancel jobs in these statuses:**
    - pending
    - queued
    - running

    **Cannot cancel:**
    - succeeded (already done)
    - failed (already failed)
    - cancelled (already cancelled)

    **Example:**
    ```json
    {
      "reason": "Incorrect hyperparameters - need to adjust learning rate"
    }
    ```
    """
    try:
        training_service = get_training_service()
        reason = request.reason if request else None
        job = training_service.cancel_job(job_id, reason=reason)
        return job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to cancel training job {job_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to cancel training job: {e}"
        )


@router.post("/jobs/{job_id}/poll", response_model=TrainingJobResponse)
async def poll_training_job(job_id: str):
    """Poll Foundation Model API for job status and update database.

    **Use this endpoint to:**
    - Get latest job status from FMAPI
    - Update progress percentage
    - Retrieve final metrics when job completes
    - Check for errors

    **Returns updated job details.**

    **Typical polling pattern:**
    ```python
    # Poll every 30 seconds for running jobs
    while job.status in ['queued', 'running']:
        job = poll_training_job(job.id)
        time.sleep(30)
    ```
    """
    try:
        training_service = get_training_service()
        job = training_service.poll_job_status(job_id)
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to poll training job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to poll training job: {e}")


@router.get("/jobs/{job_id}/events")
async def get_training_job_events(
    job_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Get event history for a training job.

    Returns:
    - Status changes
    - Progress updates
    - Error events
    - Metric updates

    Events are ordered by timestamp (most recent first).
    """
    try:
        training_service = get_training_service()
        # Verify job exists
        training_service.get_job(job_id)

        # Get events from database
        from app.services.sql_service import get_sql_service

        sql_service = get_sql_service()
        offset = (page - 1) * page_size

        # Get total count
        count_sql = f"""
        SELECT COUNT(*) as cnt
        FROM {training_service.events_table}
        WHERE job_id = '{job_id}'
        """
        count_result = sql_service.execute(count_sql)
        total = int(count_result[0]["cnt"]) if count_result else 0

        # Get events
        query_sql = f"""
        SELECT *
        FROM {training_service.events_table}
        WHERE job_id = '{job_id}'
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        """
        events = sql_service.execute(query_sql)

        return {"events": events, "total": total, "page": page, "page_size": page_size}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get events for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job events: {e}")


@router.get("/jobs/{job_id}/metrics")
async def get_training_job_metrics(job_id: str):
    """Get metrics for a training job.

    Returns:
    - Training and validation loss
    - Training and validation accuracy
    - Learning rate
    - Epochs completed
    - Training duration
    - Token counts
    - Estimated DBU cost
    - Custom metrics

    **Only available after job completes successfully.**
    """
    try:
        training_service = get_training_service()
        # Verify job exists
        job = training_service.get_job(job_id)

        if job.status != TrainingJobStatus.SUCCEEDED:
            raise HTTPException(
                status_code=400,
                detail=f"Metrics not available - job status is {job.status.value}",
            )

        # Get metrics from database
        from app.services.sql_service import get_sql_service

        sql_service = get_sql_service()
        query_sql = f"""
        SELECT *
        FROM {training_service.metrics_table}
        WHERE job_id = '{job_id}'
        ORDER BY recorded_at DESC
        LIMIT 1
        """
        rows = sql_service.execute(query_sql)

        if not rows:
            return {"message": "Metrics not yet available"}

        return rows[0]

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get metrics for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job metrics: {e}")


@router.get("/jobs/{job_id}/lineage")
async def get_training_job_lineage(job_id: str):
    """Get lineage information for a training job.

    Returns:
    - Source Training Sheet
    - Original Sheet (data source)
    - Prompt Template used
    - Q&A pair IDs included in training
    - Canonical label IDs referenced
    - Model name and version

    **Use this to:**
    - Trace model back to source data
    - Understand what data influenced the model
    - Debug model behavior by inspecting training examples
    """
    try:
        training_service = get_training_service()
        # Verify job exists
        training_service.get_job(job_id)

        # Get lineage from database
        from app.services.sql_service import get_sql_service

        sql_service = get_sql_service()
        query_sql = f"""
        SELECT *
        FROM {training_service.lineage_table}
        WHERE job_id = '{job_id}'
        """
        rows = sql_service.execute(query_sql)

        if not rows:
            raise HTTPException(status_code=404, detail="Lineage record not found")

        return rows[0]

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get lineage for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job lineage: {e}")


@router.post("/jobs/{job_id}/evaluate", response_model=EvaluationResult)
async def evaluate_training_job(job_id: str, request: EvaluationRequest | None = None):
    """Run mlflow.evaluate() on a completed training job.

    Evaluates the model produced by this job against validation Q&A pairs.
    Falls back to basic string-match metrics if MLflow is unavailable.

    **Only available for jobs with status = succeeded.**
    """
    try:
        eval_type = request.eval_type if request else "post_training"
        result = await evaluate_model(job_id, eval_type=eval_type)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to evaluate job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")


@router.get("/jobs/{job_id}/evaluation", response_model=list[EvaluationMetric])
async def get_training_job_evaluation(job_id: str):
    """Get stored evaluation results for a training job.

    Returns per-metric evaluation results previously generated by
    the POST /evaluate endpoint.
    """
    try:
        return await get_evaluation_results(job_id)
    except Exception as e:
        logger.error(f"Failed to get evaluation for job {job_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get evaluation: {e}"
        )


@router.get("/compare/{model_name}", response_model=ComparisonResult)
async def compare_model_versions(
    model_name: str,
    version_a: str = Query(..., description="Baseline version"),
    version_b: str = Query(..., description="Comparison version"),
):
    """Compare evaluation metrics between two model versions.

    Returns metrics for both versions and flags regressions where
    version_b scores lower than version_a.
    """
    try:
        return await compare_evaluations(model_name, version_a, version_b)
    except Exception as e:
        logger.error(f"Failed to compare {model_name} v{version_a} vs v{version_b}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Comparison failed: {e}"
        )


@router.get("/active")
async def get_active_jobs():
    """Get all active training jobs (queued or running).

    Useful for:
    - Monitoring dashboard
    - Resource usage tracking
    - Finding jobs that need polling
    """
    try:
        training_service = get_training_service()
        jobs, total = training_service.list_jobs(
            status=TrainingJobStatus.RUNNING, page=1, page_size=100
        )
        return {"jobs": jobs, "total": total}
    except Exception as e:
        logger.error(f"Failed to get active jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get active jobs: {e}")
