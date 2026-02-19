"""Evaluation models for MLflow Evaluate integration."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class EvaluationRequest(BaseModel):
    """Request to evaluate a trained model."""

    job_id: str = Field(..., description="Training job ID to evaluate")
    eval_type: str = Field(
        default="post_training",
        description="Evaluation type: post_training, scheduled, manual",
    )


class EvaluationMetric(BaseModel):
    """A single evaluation metric."""

    metric_name: str = Field(..., description="Metric name (e.g., accuracy, f1_score)")
    metric_value: float = Field(..., description="Metric value")


class EvaluationResult(BaseModel):
    """Result of a model evaluation run."""

    model_name: str = Field(..., description="Model name")
    model_version: str = Field(..., description="Model version")
    eval_type: str = Field(..., description="Evaluation type")
    metrics: list[EvaluationMetric] = Field(
        default_factory=list, description="Evaluation metrics"
    )
    mlflow_run_id: str | None = Field(None, description="MLflow run ID")
    created_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Evaluation timestamp",
    )


class ComparisonResult(BaseModel):
    """Result of comparing two model versions."""

    model_name: str = Field(..., description="Model name")
    version_a: str = Field(..., description="First version")
    version_b: str = Field(..., description="Second version")
    metrics_a: list[EvaluationMetric] = Field(
        default_factory=list, description="Metrics for version A"
    )
    metrics_b: list[EvaluationMetric] = Field(
        default_factory=list, description="Metrics for version B"
    )
    regressions: list[str] = Field(
        default_factory=list,
        description="Metric names where version B regressed vs A",
    )
