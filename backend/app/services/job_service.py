"""Job execution service for triggering and monitoring Databricks jobs."""

import json
import uuid
from datetime import datetime
from typing import Any

from databricks.sdk.service.jobs import RunLifeCycleState, RunResultState

from app.core.databricks import get_current_user, get_workspace_client
from app.services.sql_service import get_sql_service

# Job type to DAB job name mapping
JOB_TYPE_MAP = {
    # DATA stage - extraction and ingestion
    "ocr_extraction": "[Ontos ML] OCR Extraction",
    "audio_transcription": "[Ontos ML] Audio Transcription",
    "image_captioning": "[Ontos ML] Image Captioning",
    "embedding_generation": "[Ontos ML] Embedding Generation",
    # DATA stage - AI functions
    "ai_classify": "[Ontos ML] AI Classify",
    "ai_extract": "[Ontos ML] AI Extract",
    "ai_summarize": "[Ontos ML] AI Summarize",
    "ai_mask": "[Ontos ML] AI Mask",
    # CURATE stage
    "labeling_agent": "[Ontos ML] Labeling Agent",
    "quality_scoring": "[Ontos ML] Quality Scoring",
    # TRAIN stage
    "training_sheet_generation": "[Ontos ML] Training Sheet Generation",
    "finetune_fmapi": "[Ontos ML] Fine-tune (FMAPI)",
    "model_evaluation": "[Ontos ML] Model Evaluation",
    # MONITOR stage
    "drift_detection": "[Ontos ML] Drift Detection",
    "feedback_analysis": "[Ontos ML] Feedback Analysis",
}


class JobService:
    """Service for triggering and monitoring Databricks jobs."""

    def __init__(self):
        self.client = get_workspace_client()
        self.sql = get_sql_service()

    def list_job_types(self) -> list[dict[str, Any]]:
        """List all available job types."""
        return [
            {"type": k, "name": v, "stage": self._get_stage(k)}
            for k, v in JOB_TYPE_MAP.items()
        ]

    def _get_stage(self, job_type: str) -> str:
        """Get the pipeline stage for a job type."""
        if job_type in [
            "ocr_extraction",
            "audio_transcription",
            "image_captioning",
            "embedding_generation",
            "ai_classify",
            "ai_extract",
            "ai_summarize",
            "ai_mask",
        ]:
            return "DATA"
        elif job_type in ["labeling_agent", "quality_scoring"]:
            return "CURATE"
        elif job_type in ["training_sheet_generation", "finetune_fmapi", "model_evaluation"]:
            return "TRAIN"
        elif job_type in ["drift_detection", "feedback_analysis"]:
            return "MONITOR"
        return "UNKNOWN"

    def _find_job_by_name(self, job_name: str) -> int | None:
        """Find job ID by name."""
        jobs = self.client.jobs.list(name=job_name)
        for job in jobs:
            if job.settings.name == job_name:
                return job.job_id
        return None

    def trigger_job(
        self,
        job_type: str,
        config: dict[str, Any],
        template_id: str | None = None,
        model_id: str | None = None,
        endpoint_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Trigger a Databricks job and record it in job_runs table.

        Args:
            job_type: Type of job (e.g., "labeling_agent")
            config: Job-specific configuration parameters
            template_id: Optional template ID this job relates to
            model_id: Optional model ID this job relates to
            endpoint_id: Optional endpoint ID this job relates to

        Returns:
            Job run record
        """
        job_name = JOB_TYPE_MAP.get(job_type)
        if not job_name:
            raise ValueError(f"Unknown job type: {job_type}")

        # Find the job
        job_id = self._find_job_by_name(job_name)
        if not job_id:
            # Return a helpful message instead of crashing
            return {
                "id": None,
                "job_type": job_type,
                "databricks_run_id": None,
                "status": "not_configured",
                "error": f"Job '{job_name}' not found in workspace. Please create the job first using the setup notebooks.",
            }

        # Trigger the job with notebook parameters
        run = self.client.jobs.run_now(
            job_id=job_id,
            notebook_params=config,
        )

        # Record in job_runs table
        run_id = str(uuid.uuid4())
        user = get_current_user()
        esc_config = json.dumps(config).replace("'", "''")

        sql = f"""
        INSERT INTO job_runs (
            id, job_type, job_name, template_id, model_id, endpoint_id,
            databricks_run_id, databricks_job_id, status, config,
            started_at, created_at, created_by
        ) VALUES (
            '{run_id}', '{job_type}', '{job_name}',
            {f"'{template_id}'" if template_id else "NULL"},
            {f"'{model_id}'" if model_id else "NULL"},
            {f"'{endpoint_id}'" if endpoint_id else "NULL"},
            '{run.run_id}', '{job_id}', 'running',
            '{esc_config}',
            current_timestamp(), current_timestamp(), '{user}'
        )
        """
        # Note: In production, use parameterized queries
        self.sql.execute_update(sql)

        return {
            "id": run_id,
            "job_type": job_type,
            "databricks_run_id": run.run_id,
            "status": "running",
        }

    def get_job_status(self, run_id: str) -> dict[str, Any]:
        """Get status of a job run."""
        # Get from our table first
        sql = f"SELECT * FROM job_runs WHERE id = '{run_id}'"
        rows = self.sql.execute(sql)

        if not rows:
            raise ValueError(f"Job run not found: {run_id}")

        job_run = rows[0]
        databricks_run_id = job_run.get("databricks_run_id")

        if databricks_run_id:
            # Get live status from Databricks
            run = self.client.jobs.get_run(int(databricks_run_id))
            state = run.state

            # Map Databricks state to our status
            if state.life_cycle_state == RunLifeCycleState.TERMINATED:
                if state.result_state == RunResultState.SUCCESS:
                    status = "succeeded"
                else:
                    status = "failed"
            elif state.life_cycle_state in (
                RunLifeCycleState.PENDING,
                RunLifeCycleState.RUNNING,
            ):
                status = "running"
            else:
                status = "failed"

            # Update our table if status changed
            if status != job_run.get("status"):
                update_sql = f"""
                UPDATE job_runs
                SET status = '{status}',
                    completed_at = {f"current_timestamp()" if status in ("succeeded", "failed") else "NULL"}
                WHERE id = '{run_id}'
                """
                self.sql.execute_update(update_sql)
                job_run["status"] = status

        return job_run

    def cancel_job(self, run_id: str) -> dict[str, Any]:
        """Cancel a running job."""
        sql = f"SELECT databricks_run_id FROM job_runs WHERE id = '{run_id}'"
        rows = self.sql.execute(sql)

        if not rows:
            raise ValueError(f"Job run not found: {run_id}")

        databricks_run_id = rows[0].get("databricks_run_id")
        if databricks_run_id:
            self.client.jobs.cancel_run(int(databricks_run_id))

        # Update status
        update_sql = f"""
        UPDATE job_runs
        SET status = 'cancelled', completed_at = current_timestamp()
        WHERE id = '{run_id}'
        """
        self.sql.execute_update(update_sql)

        return {"id": run_id, "status": "cancelled"}

    def list_runs(
        self,
        template_id: str | None = None,
        job_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """List job runs with optional filters."""
        conditions = []
        if template_id:
            conditions.append(f"template_id = '{template_id}'")
        if job_type:
            conditions.append(f"job_type = '{job_type}'")
        if status:
            conditions.append(f"status = '{status}'")

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        sql = f"""
        SELECT * FROM job_runs
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT {limit}
        """
        return self.sql.execute(sql)


# Singleton
_job_service: JobService | None = None


def get_job_service() -> JobService:
    """Get or create job service singleton."""
    global _job_service
    if _job_service is None:
        _job_service = JobService()
    return _job_service
