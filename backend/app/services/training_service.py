"""Training service for managing Foundation Model API fine-tuning jobs."""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.core.databricks import get_workspace_client
from app.models.training_job import (
    TrainingJobCreate,
    TrainingJobResponse,
    TrainingJobStatus,
)
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class TrainingService:
    """Service for managing training jobs."""

    def __init__(self):
        self.settings = get_settings()
        self.sql_service = get_sql_service()
        self.workspace_client = get_workspace_client()
        self.jobs_table = self.settings.get_table("training_jobs")
        self.lineage_table = self.settings.get_table("training_job_lineage")
        self.metrics_table = self.settings.get_table("training_job_metrics")
        self.events_table = self.settings.get_table("training_job_events")

    def create_job(
        self, job_request: TrainingJobCreate, created_by: str
    ) -> TrainingJobResponse:
        """Create a new training job.

        Steps:
        1. Validate Training Sheet exists and has labeled pairs
        2. Export training data to JSONL
        3. Create job record in database
        4. Submit to Foundation Model API
        5. Return job details
        """
        job_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # 1. Validate Training Sheet
        training_sheet = self._get_training_sheet(job_request.training_sheet_id)
        if not training_sheet:
            raise ValueError(
                f"Training Sheet {job_request.training_sheet_id} not found"
            )

        labeled_pairs = training_sheet.get(
            "human_labeled_count", 0
        ) + training_sheet.get("human_verified_count", 0)
        if labeled_pairs == 0:
            raise ValueError(
                f"Training Sheet has no labeled pairs. Label some pairs before training."
            )

        # 2. Export training data
        export_result = self._export_training_data(
            job_request.training_sheet_id, job_request.train_val_split
        )

        # 3. Calculate splits
        total_pairs = export_result["total_pairs"]
        train_pairs = int(total_pairs * job_request.train_val_split)
        val_pairs = total_pairs - train_pairs

        # 4. Create job record
        training_config_json = json.dumps(job_request.training_config)
        insert_sql = f"""
        INSERT INTO {self.jobs_table} (
            id, training_sheet_id, model_name, base_model,
            training_config, train_val_split, status,
            total_pairs, train_pairs, val_pairs,
            register_to_uc, uc_catalog, uc_schema,
            created_at, created_by, updated_at
        ) VALUES (
            '{job_id}',
            '{job_request.training_sheet_id}',
            '{job_request.model_name}',
            '{job_request.base_model}',
            '{training_config_json}',
            {job_request.train_val_split},
            '{TrainingJobStatus.PENDING.value}',
            {total_pairs},
            {train_pairs},
            {val_pairs},
            {job_request.register_to_uc},
            {self._sql_escape(job_request.uc_catalog)},
            {self._sql_escape(job_request.uc_schema)},
            '{now.isoformat()}',
            '{created_by}',
            '{now.isoformat()}'
        )
        """
        self.sql_service.execute(insert_sql)

        # 5. Submit to FMAPI (asynchronous)
        try:
            fmapi_job = self._submit_to_fmapi(
                job_id=job_id,
                export_path=export_result["export_path"],
                base_model=job_request.base_model,
                training_config=job_request.training_config,
            )

            # Update with FMAPI job ID
            update_sql = f"""
            UPDATE {self.jobs_table}
            SET fmapi_job_id = '{fmapi_job["job_id"]}',
                status = '{TrainingJobStatus.QUEUED.value}',
                started_at = '{now.isoformat()}',
                updated_at = '{now.isoformat()}'
            WHERE id = '{job_id}'
            """
            self.sql_service.execute(update_sql)

            # Log event
            self._log_event(
                job_id=job_id,
                event_type="status_change",
                old_status=TrainingJobStatus.PENDING.value,
                new_status=TrainingJobStatus.QUEUED.value,
                message=f"Submitted to FMAPI: {fmapi_job['job_id']}",
            )

        except Exception as e:
            logger.error(f"Failed to submit job {job_id} to FMAPI: {e}")
            # Update status to failed
            self._update_job_status(
                job_id=job_id,
                status=TrainingJobStatus.FAILED,
                error_message=str(e),
            )
            raise

        # 6. Create lineage record
        self._create_lineage_record(job_id, job_request, training_sheet)

        # 7. Return job details
        return self.get_job(job_id)

    def get_job(self, job_id: str) -> TrainingJobResponse:
        """Get training job by ID."""
        query_sql = f"""
        SELECT j.*, ts.name as training_sheet_name
        FROM {self.jobs_table} j
        LEFT JOIN {self.settings.get_table("training_sheets")} ts ON ts.id = j.training_sheet_id
        WHERE j.id = '{job_id}'
        """
        rows = self.sql_service.execute(query_sql)
        if not rows:
            raise ValueError(f"Training job {job_id} not found")

        return self._row_to_response(rows[0])

    def list_jobs(
        self,
        training_sheet_id: str | None = None,
        status: TrainingJobStatus | None = None,
        created_by: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TrainingJobResponse], int]:
        """List training jobs with optional filtering."""
        conditions = ["1=1"]
        if training_sheet_id:
            conditions.append(f"j.training_sheet_id = '{training_sheet_id}'")
        if status:
            conditions.append(f"j.status = '{status.value}'")
        if created_by:
            conditions.append(f"j.created_by = '{created_by}'")

        where_clause = " AND ".join(conditions)
        offset = (page - 1) * page_size

        # Get total count
        count_sql = (
            f"SELECT COUNT(*) as cnt FROM {self.jobs_table} j WHERE {where_clause}"
        )
        count_result = self.sql_service.execute(count_sql)
        total = int(count_result[0]["cnt"]) if count_result else 0

        # Get paginated results
        query_sql = f"""
        SELECT j.*, ts.name as training_sheet_name
        FROM {self.jobs_table} j
        LEFT JOIN {self.settings.get_table("training_sheets")} ts ON ts.id = j.training_sheet_id
        WHERE {where_clause}
        ORDER BY j.created_at DESC
        LIMIT {page_size} OFFSET {offset}
        """
        rows = self.sql_service.execute(query_sql)
        jobs = [self._row_to_response(row) for row in rows]

        return jobs, total

    def cancel_job(self, job_id: str, reason: str | None = None) -> TrainingJobResponse:
        """Cancel a running training job."""
        job = self.get_job(job_id)

        if job.status not in [
            TrainingJobStatus.PENDING,
            TrainingJobStatus.QUEUED,
            TrainingJobStatus.RUNNING,
        ]:
            raise ValueError(f"Cannot cancel job in status: {job.status}")

        # Cancel FMAPI job if it exists
        if job.fmapi_job_id:
            try:
                self._cancel_fmapi_job(job.fmapi_job_id)
            except Exception as e:
                logger.error(f"Failed to cancel FMAPI job {job.fmapi_job_id}: {e}")
                # Continue anyway - update our status

        # Update job status
        self._update_job_status(
            job_id=job_id,
            status=TrainingJobStatus.CANCELLED,
            error_message=reason or "Cancelled by user",
        )

        # Log event
        self._log_event(
            job_id=job_id,
            event_type="status_change",
            old_status=job.status.value,
            new_status=TrainingJobStatus.CANCELLED.value,
            message=reason or "Cancelled by user",
        )

        return self.get_job(job_id)

    def poll_job_status(self, job_id: str) -> TrainingJobResponse:
        """Poll FMAPI for job status and update database."""
        job = self.get_job(job_id)

        if not job.fmapi_job_id:
            raise ValueError("Job has no FMAPI job ID")

        if job.status in [
            TrainingJobStatus.SUCCEEDED,
            TrainingJobStatus.FAILED,
            TrainingJobStatus.CANCELLED,
        ]:
            # Job already terminal, no need to poll
            return job

        try:
            # Get status from FMAPI
            fmapi_status = self._get_fmapi_job_status(job.fmapi_job_id)

            # Map FMAPI status to our status
            new_status = self._map_fmapi_status(fmapi_status["status"])
            progress = fmapi_status.get("progress_percent", job.progress_percent)
            current_epoch = fmapi_status.get("current_epoch")

            # Update job if status changed
            if new_status != job.status or progress != job.progress_percent:
                update_fields = {
                    "status": new_status.value,
                    "progress_percent": progress,
                    "updated_at": datetime.utcnow().isoformat(),
                }

                if current_epoch:
                    update_fields["current_epoch"] = current_epoch

                if new_status == TrainingJobStatus.SUCCEEDED:
                    update_fields["completed_at"] = datetime.utcnow().isoformat()
                    # Store metrics if available
                    if fmapi_status.get("metrics"):
                        self._store_metrics(job_id, fmapi_status["metrics"])

                elif new_status == TrainingJobStatus.FAILED:
                    update_fields["completed_at"] = datetime.utcnow().isoformat()
                    update_fields["error_message"] = fmapi_status.get(
                        "error", "Training failed"
                    )

                # Build update SQL
                set_clause = ", ".join(
                    [f"{k} = '{v}'" for k, v in update_fields.items()]
                )
                update_sql = (
                    f"UPDATE {self.jobs_table} SET {set_clause} WHERE id = '{job_id}'"
                )
                self.sql_service.execute(update_sql)

                # Log event if status changed
                if new_status != job.status:
                    self._log_event(
                        job_id=job_id,
                        event_type="status_change",
                        old_status=job.status.value,
                        new_status=new_status.value,
                        message=f"Status updated to {new_status.value}",
                    )

        except Exception as e:
            logger.error(f"Failed to poll FMAPI job {job.fmapi_job_id}: {e}")
            # Don't fail - return current job state

        return self.get_job(job_id)

    # Private helper methods

    def _get_training_sheet(self, training_sheet_id: str) -> dict | None:
        """Get Training Sheet details."""
        query_sql = f"SELECT * FROM {self.settings.get_table('training_sheets')} WHERE id = '{training_sheet_id}'"
        rows = self.sql_service.execute(query_sql)
        return rows[0] if rows else None

    def _export_training_data(
        self, training_sheet_id: str, train_val_split: float
    ) -> dict[str, Any]:
        """Export Training Sheet data to JSONL format.

        Returns:
            dict with export_path, total_pairs, train_pairs, val_pairs
        """
        # Get labeled Q&A pairs
        query_sql = f"""
        SELECT messages, item_ref
        FROM {self.settings.get_table("qa_pairs")}
        WHERE training_sheet_id = '{training_sheet_id}'
        AND review_status = 'approved'
        AND 'training' IN allowed_uses
        AND NOT array_contains(prohibited_uses, 'training')
        """
        rows = self.sql_service.execute(query_sql)

        if not rows:
            raise ValueError("No labeled pairs eligible for training")

        # Convert to JSONL
        export_lines = []
        for row in rows:
            messages = (
                json.loads(row["messages"])
                if isinstance(row["messages"], str)
                else row["messages"]
            )
            export_lines.append(json.dumps({"messages": messages}))

        # Write to temp file (in production, write to DBFS or Volume)
        export_path = f"/tmp/training_export_{training_sheet_id}_{uuid.uuid4()}.jsonl"
        with open(export_path, "w") as f:
            f.write("\n".join(export_lines))

        total_pairs = len(export_lines)
        train_pairs = int(total_pairs * train_val_split)

        return {
            "export_path": export_path,
            "total_pairs": total_pairs,
            "train_pairs": train_pairs,
            "val_pairs": total_pairs - train_pairs,
        }

    def _submit_to_fmapi(
        self, job_id: str, export_path: str, base_model: str, training_config: dict
    ) -> dict[str, str]:
        """Submit training job to Foundation Model API.

        Returns:
            dict with job_id, run_id
        """
        # TODO: Implement actual FMAPI submission
        # This is a placeholder for the real implementation
        logger.info(f"Submitting job {job_id} to FMAPI with base model {base_model}")
        logger.info(f"Training data: {export_path}")
        logger.info(f"Config: {training_config}")

        # Placeholder response
        fmapi_job_id = f"fmapi-job-{uuid.uuid4()}"
        return {
            "job_id": fmapi_job_id,
            "run_id": f"run-{uuid.uuid4()}",
        }

    def _cancel_fmapi_job(self, fmapi_job_id: str) -> None:
        """Cancel a running FMAPI job."""
        # TODO: Implement actual FMAPI cancellation
        logger.info(f"Cancelling FMAPI job: {fmapi_job_id}")

    def _get_fmapi_job_status(self, fmapi_job_id: str) -> dict[str, Any]:
        """Get job status from FMAPI."""
        # TODO: Implement actual FMAPI status check
        # Placeholder response
        return {
            "status": "running",
            "progress_percent": 50,
            "current_epoch": 2,
            "metrics": None,
        }

    def _map_fmapi_status(self, fmapi_status: str) -> TrainingJobStatus:
        """Map FMAPI status to our status enum."""
        status_map = {
            "pending": TrainingJobStatus.PENDING,
            "queued": TrainingJobStatus.QUEUED,
            "running": TrainingJobStatus.RUNNING,
            "succeeded": TrainingJobStatus.SUCCEEDED,
            "failed": TrainingJobStatus.FAILED,
            "cancelled": TrainingJobStatus.CANCELLED,
        }
        return status_map.get(fmapi_status, TrainingJobStatus.FAILED)

    def _update_job_status(
        self,
        job_id: str,
        status: TrainingJobStatus,
        error_message: str | None = None,
    ) -> None:
        """Update job status."""
        now = datetime.utcnow().isoformat()
        update_parts = [
            f"status = '{status.value}'",
            f"updated_at = '{now}'",
        ]

        if status in [
            TrainingJobStatus.SUCCEEDED,
            TrainingJobStatus.FAILED,
            TrainingJobStatus.CANCELLED,
        ]:
            update_parts.append(f"completed_at = '{now}'")

        if error_message:
            update_parts.append(f"error_message = '{self._sql_escape(error_message)}'")

        update_sql = f"""
        UPDATE {self.jobs_table}
        SET {", ".join(update_parts)}
        WHERE id = '{job_id}'
        """
        self.sql_service.execute(update_sql)

    def _create_lineage_record(
        self, job_id: str, job_request: TrainingJobCreate, training_sheet: dict
    ) -> None:
        """Create lineage record linking job to source assets."""
        lineage_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        insert_sql = f"""
        INSERT INTO {self.lineage_table} (
            id, job_id, training_sheet_id, training_sheet_name,
            model_name, created_at
        ) VALUES (
            '{lineage_id}',
            '{job_id}',
            '{job_request.training_sheet_id}',
            '{self._sql_escape(training_sheet.get("name"))}',
            '{job_request.model_name}',
            '{now}'
        )
        """
        self.sql_service.execute(insert_sql)

    def _store_metrics(self, job_id: str, metrics: dict[str, Any]) -> None:
        """Store training metrics."""
        metrics_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        insert_sql = f"""
        INSERT INTO {self.metrics_table} (
            id, job_id,
            train_loss, val_loss, train_accuracy, val_accuracy,
            recorded_at
        ) VALUES (
            '{metrics_id}',
            '{job_id}',
            {metrics.get("train_loss", "NULL")},
            {metrics.get("val_loss", "NULL")},
            {metrics.get("train_accuracy", "NULL")},
            {metrics.get("val_accuracy", "NULL")},
            '{now}'
        )
        """
        self.sql_service.execute(insert_sql)

    def _log_event(
        self,
        job_id: str,
        event_type: str,
        old_status: str | None = None,
        new_status: str | None = None,
        message: str | None = None,
    ) -> None:
        """Log job event."""
        event_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        insert_sql = f"""
        INSERT INTO {self.events_table} (
            id, job_id, event_type,
            old_status, new_status, message, created_at
        ) VALUES (
            '{event_id}',
            '{job_id}',
            '{event_type}',
            {self._sql_escape(old_status)},
            {self._sql_escape(new_status)},
            {self._sql_escape(message)},
            '{now}'
        )
        """
        self.sql_service.execute(insert_sql)

    def _row_to_response(self, row: dict) -> TrainingJobResponse:
        """Convert database row to TrainingJobResponse."""
        training_config = row.get("training_config")
        if isinstance(training_config, str):
            training_config = json.loads(training_config) if training_config else {}

        metrics = row.get("metrics")
        if isinstance(metrics, str):
            metrics = json.loads(metrics) if metrics else None

        return TrainingJobResponse(
            id=row["id"],
            training_sheet_id=row["training_sheet_id"],
            training_sheet_name=row.get("training_sheet_name"),
            model_name=row["model_name"],
            base_model=row["base_model"],
            status=TrainingJobStatus(row["status"]),
            training_config=training_config,
            train_val_split=float(row.get("train_val_split", 0.8)),
            total_pairs=int(row.get("total_pairs", 0)),
            train_pairs=int(row.get("train_pairs", 0)),
            val_pairs=int(row.get("val_pairs", 0)),
            fmapi_job_id=row.get("fmapi_job_id"),
            fmapi_run_id=row.get("fmapi_run_id"),
            mlflow_experiment_id=row.get("mlflow_experiment_id"),
            mlflow_run_id=row.get("mlflow_run_id"),
            register_to_uc=bool(row.get("register_to_uc", True)),
            uc_model_name=row.get("uc_model_name"),
            uc_model_version=row.get("uc_model_version"),
            metrics=metrics,
            progress_percent=int(row.get("progress_percent", 0)),
            current_epoch=row.get("current_epoch"),
            total_epochs=row.get("total_epochs"),
            error_message=row.get("error_message"),
            created_at=row.get("created_at"),
            created_by=row.get("created_by"),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            updated_at=row.get("updated_at"),
        )

    @staticmethod
    def _sql_escape(value: str | None) -> str:
        """Escape SQL string or return NULL."""
        if value is None:
            return "NULL"
        escaped = value.replace("'", "''")
        return f"'{escaped}'"


# Singleton instance
_training_service: TrainingService | None = None


def get_training_service() -> TrainingService:
    """Get or create training service singleton."""
    global _training_service
    if _training_service is None:
        _training_service = TrainingService()
    return _training_service
