"""Training Job models for Foundation Model API fine-tuning."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TrainingJobStatus(str, Enum):
    """Training job status."""

    PENDING = "pending"  # Job created, not yet submitted
    QUEUED = "queued"  # Submitted to FMAPI, waiting to start
    RUNNING = "running"  # Training in progress
    SUCCEEDED = "succeeded"  # Training completed successfully
    FAILED = "failed"  # Training failed with error
    CANCELLED = "cancelled"  # User cancelled the job
    TIMEOUT = "timeout"  # Job timed out


class TrainingJobCreate(BaseModel):
    """Request to create a training job."""

    training_sheet_id: str = Field(
        ..., description="Training Sheet to train from"
    )
    model_name: str = Field(..., description="Name for the trained model")
    base_model: str = Field(
        default="databricks-meta-llama-3-1-70b-instruct",
        description="Base model to fine-tune",
    )
    training_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Training hyperparameters (epochs, learning_rate, etc.)",
    )
    train_val_split: float = Field(
        default=0.8, ge=0.1, le=0.9, description="Train/validation split ratio"
    )
    register_to_uc: bool = Field(
        default=True, description="Register model to Unity Catalog when complete"
    )
    uc_catalog: str | None = Field(
        default=None, description="Unity Catalog catalog name"
    )
    uc_schema: str | None = Field(default=None, description="Unity Catalog schema name")


class TrainingJobResponse(BaseModel):
    """Training job details."""

    id: str = Field(..., description="Job ID (UUID)")
    training_sheet_id: str = Field(..., description="Source Training Sheet")
    training_sheet_name: str | None = Field(None, description="Training Sheet name")
    model_name: str = Field(..., description="Target model name")
    base_model: str = Field(..., description="Base model being fine-tuned")
    status: TrainingJobStatus = Field(..., description="Current job status")
    training_config: dict[str, Any] = Field(..., description="Training hyperparameters")
    train_val_split: float = Field(..., description="Train/validation split ratio")

    # Counts
    total_pairs: int = Field(default=0, description="Total Q&A pairs in Training Sheet")
    train_pairs: int = Field(default=0, description="Pairs used for training")
    val_pairs: int = Field(default=0, description="Pairs used for validation")

    # FMAPI job details
    fmapi_job_id: str | None = Field(None, description="Foundation Model API job ID")
    fmapi_run_id: str | None = Field(None, description="FMAPI run ID")

    # MLflow tracking
    mlflow_experiment_id: str | None = Field(None, description="MLflow experiment ID")
    mlflow_run_id: str | None = Field(None, description="MLflow run ID")

    # Unity Catalog registration
    register_to_uc: bool = Field(..., description="Whether to register model")
    uc_model_name: str | None = Field(None, description="UC registered model name")
    uc_model_version: str | None = Field(None, description="UC model version")

    # Metrics (populated when training completes)
    metrics: dict[str, Any] | None = Field(None, description="Training metrics")

    # Progress tracking
    progress_percent: int = Field(
        default=0, ge=0, le=100, description="Training progress %"
    )
    current_epoch: int | None = Field(None, description="Current epoch number")
    total_epochs: int | None = Field(None, description="Total epochs configured")

    # Error handling
    error_message: str | None = Field(None, description="Error message if failed")
    error_details: dict[str, Any] | None = Field(
        None, description="Detailed error info"
    )

    # Timestamps
    created_at: datetime | None = Field(None, description="Job creation time")
    created_by: str | None = Field(None, description="User who created job")
    started_at: datetime | None = Field(None, description="Training start time")
    completed_at: datetime | None = Field(None, description="Training completion time")
    updated_at: datetime | None = Field(None, description="Last status update")


class TrainingJobListResponse(BaseModel):
    """List of training jobs."""

    jobs: list[TrainingJobResponse] = Field(..., description="Training jobs")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Page size")


class TrainingJobUpdate(BaseModel):
    """Update training job (primarily for status changes)."""

    status: TrainingJobStatus | None = Field(None, description="New status")
    progress_percent: int | None = Field(
        None, ge=0, le=100, description="Progress update"
    )
    current_epoch: int | None = Field(None, description="Current epoch")
    metrics: dict[str, Any] | None = Field(None, description="Updated metrics")
    error_message: str | None = Field(None, description="Error message")
    error_details: dict[str, Any] | None = Field(None, description="Error details")


class TrainingJobCancelRequest(BaseModel):
    """Request to cancel a training job."""

    reason: str | None = Field(None, description="Reason for cancellation")


class TrainingJobRetryRequest(BaseModel):
    """Request to retry a failed training job."""

    modify_config: dict[str, Any] | None = Field(
        None, description="Optional config changes for retry"
    )


class TrainingJobExportResponse(BaseModel):
    """Training data export details."""

    training_sheet_id: str
    export_path: str = Field(..., description="Path to exported JSONL file")
    train_pairs: int
    val_pairs: int
    total_pairs: int
    export_format: str = Field(default="jsonl", description="Export format")
    created_at: datetime


class TrainingJobMetrics(BaseModel):
    """Training job metrics and performance."""

    job_id: str
    train_loss: float | None = None
    val_loss: float | None = None
    train_accuracy: float | None = None
    val_accuracy: float | None = None
    learning_rate: float | None = None
    epochs_completed: int | None = None
    training_duration_seconds: float | None = None
    tokens_processed: int | None = None
    cost_dbu: float | None = Field(None, description="Estimated DBU cost")
    custom_metrics: dict[str, Any] | None = Field(
        None, description="Additional custom metrics"
    )


class TrainingJobLineage(BaseModel):
    """Lineage information linking job to assets."""

    job_id: str
    training_sheet_id: str
    training_sheet_name: str | None = None
    sheet_id: str | None = Field(None, description="Source Sheet (dataset)")
    sheet_name: str | None = None
    template_id: str | None = Field(None, description="Prompt Template used")
    template_name: str | None = None
    model_name: str
    model_version: str | None = None
    qa_pair_ids: list[str] = Field(
        default_factory=list, description="Specific Q&A pairs used"
    )
    canonical_label_ids: list[str] = Field(
        default_factory=list, description="Canonical labels used"
    )
