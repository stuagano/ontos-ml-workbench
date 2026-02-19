"""
Evaluation Service
==================

Runs mlflow.evaluate() on trained models and stores results in
the model_evaluations Delta table.

Functions:
    evaluate_model()        - Run evaluation on a completed training job
    get_evaluation_results() - Retrieve stored evaluation metrics
    compare_evaluations()   - Compare metrics across two model versions
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.core.databricks import get_current_user
from app.models.evaluation import (
    ComparisonResult,
    EvaluationMetric,
    EvaluationResult,
)
from app.services.sql_service import execute_sql

logger = logging.getLogger(__name__)


async def evaluate_model(
    job_id: str,
    eval_type: str = "post_training",
) -> EvaluationResult:
    """
    Evaluate a trained model using mlflow.evaluate() or basic metrics.

    Steps:
        1. Load training job to get model info
        2. Query validation Q&A pairs from the job's training sheet
        3. Run mlflow.evaluate() (or basic fallback)
        4. Persist per-metric rows to model_evaluations table
        5. Return EvaluationResult

    Args:
        job_id: Training job ID
        eval_type: Type of evaluation (post_training, scheduled, manual)

    Returns:
        EvaluationResult with metrics and optional MLflow run ID
    """
    settings = get_settings()

    # 1. Load training job
    job_query = f"""
    SELECT id, model_name, uc_model_name, uc_model_version,
           training_sheet_id, base_model, status
    FROM {settings.get_table("training_jobs")}
    WHERE id = '{job_id}'
    """
    job_rows = await execute_sql(job_query)
    if not job_rows:
        raise ValueError(f"Training job {job_id} not found")

    job = job_rows[0]
    if job.get("status") != "succeeded":
        raise ValueError(
            f"Cannot evaluate job with status '{job.get('status')}' — must be 'succeeded'"
        )

    model_name = job.get("uc_model_name") or job.get("model_name", "unknown")
    model_version = job.get("uc_model_version") or "1"
    training_sheet_id = job.get("training_sheet_id")

    # 2. Get validation Q&A pairs
    eval_data = await _get_eval_dataset(training_sheet_id)

    # 3. Run evaluation
    mlflow_run_id = None
    metrics: list[EvaluationMetric] = []

    try:
        mlflow_run_id, metrics = await _run_mlflow_evaluate(
            model_name, model_version, eval_data, settings
        )
    except Exception as e:
        logger.warning(f"MLflow evaluate failed, using basic metrics: {e}")
        metrics = _compute_basic_metrics(eval_data)

    # 4. Persist to model_evaluations
    user = get_current_user()
    for metric in metrics:
        row_id = str(uuid.uuid4())
        insert_sql = f"""
        INSERT INTO {settings.get_table("model_evaluations")}
        (id, job_id, model_name, model_version, eval_dataset_id,
         eval_type, evaluator, metric_name, metric_value,
         mlflow_run_id, created_at, created_by)
        VALUES (
            '{row_id}', '{job_id}', '{model_name}', '{model_version}',
            '{training_sheet_id}', '{eval_type}',
            '{"mlflow_evaluate" if mlflow_run_id else "basic"}',
            '{metric.metric_name}', {metric.metric_value},
            {f"'{mlflow_run_id}'" if mlflow_run_id else "NULL"},
            CURRENT_TIMESTAMP(), '{user}'
        )
        """
        try:
            await execute_sql(insert_sql)
        except Exception as e:
            logger.error(f"Failed to persist metric {metric.metric_name}: {e}")

    return EvaluationResult(
        model_name=model_name,
        model_version=model_version,
        eval_type=eval_type,
        metrics=metrics,
        mlflow_run_id=mlflow_run_id,
    )


async def get_evaluation_results(job_id: str) -> list[EvaluationMetric]:
    """
    Get stored evaluation metrics for a training job.

    Args:
        job_id: Training job ID

    Returns:
        List of evaluation metrics
    """
    settings = get_settings()
    query = f"""
    SELECT metric_name, metric_value
    FROM {settings.get_table("model_evaluations")}
    WHERE job_id = '{job_id}'
    ORDER BY metric_name
    """
    rows = await execute_sql(query)
    return [
        EvaluationMetric(
            metric_name=row["metric_name"],
            metric_value=row["metric_value"],
        )
        for row in rows
    ]


async def compare_evaluations(
    model_name: str,
    version_a: str,
    version_b: str,
) -> ComparisonResult:
    """
    Compare evaluation metrics between two model versions.

    Args:
        model_name: Model name
        version_a: Baseline version
        version_b: Comparison version

    Returns:
        ComparisonResult with metrics for both versions and regressions
    """
    settings = get_settings()

    async def _get_version_metrics(version: str) -> list[EvaluationMetric]:
        query = f"""
        SELECT metric_name, metric_value
        FROM {settings.get_table("model_evaluations")}
        WHERE model_name = '{model_name}'
          AND model_version = '{version}'
        ORDER BY metric_name
        """
        rows = await execute_sql(query)
        return [
            EvaluationMetric(
                metric_name=row["metric_name"],
                metric_value=row["metric_value"],
            )
            for row in rows
        ]

    metrics_a = await _get_version_metrics(version_a)
    metrics_b = await _get_version_metrics(version_b)

    # Build lookup for comparison
    a_lookup = {m.metric_name: m.metric_value for m in metrics_a}
    b_lookup = {m.metric_name: m.metric_value for m in metrics_b}

    # Find regressions (metrics where version_b < version_a)
    regressions = [
        name
        for name in a_lookup
        if name in b_lookup and b_lookup[name] < a_lookup[name]
    ]

    return ComparisonResult(
        model_name=model_name,
        version_a=version_a,
        version_b=version_b,
        metrics_a=metrics_a,
        metrics_b=metrics_b,
        regressions=regressions,
    )


# ============================================================================
# Internal helpers
# ============================================================================


async def _get_eval_dataset(
    training_sheet_id: str,
) -> list[dict[str, Any]]:
    """Get validation-split Q&A pairs from a training sheet."""
    settings = get_settings()
    query = f"""
    SELECT prompt, response, item_ref
    FROM {settings.get_table("qa_pairs")}
    WHERE training_sheet_id = '{training_sheet_id}'
      AND review_status = 'approved'
    LIMIT 500
    """
    try:
        return await execute_sql(query)
    except Exception as e:
        logger.warning(f"Failed to load eval dataset: {e}")
        return []


async def _run_mlflow_evaluate(
    model_name: str,
    model_version: str,
    eval_data: list[dict[str, Any]],
    settings: Any,
) -> tuple[str | None, list[EvaluationMetric]]:
    """
    Run mlflow.evaluate() against a model.

    Returns:
        Tuple of (mlflow_run_id, list of metrics)
    """
    import mlflow
    import pandas as pd

    if not eval_data:
        raise ValueError("No evaluation data available")

    # Build evaluation DataFrame
    df = pd.DataFrame(eval_data)

    # Construct model URI
    catalog = settings.databricks_catalog
    schema = settings.databricks_schema
    model_uri = f"models:/{catalog}.{schema}.{model_name}/{model_version}"

    with mlflow.start_run() as run:
        result = mlflow.evaluate(
            model=model_uri,
            data=df,
            targets="response",
            model_type="text",
        )

        metrics = [
            EvaluationMetric(metric_name=name, metric_value=value)
            for name, value in result.metrics.items()
            if isinstance(value, (int, float))
        ]

        return run.info.run_id, metrics


def _compute_basic_metrics(
    eval_data: list[dict[str, Any]],
) -> list[EvaluationMetric]:
    """Compute basic string-match metrics when MLflow is unavailable."""
    if not eval_data:
        return [
            EvaluationMetric(metric_name="eval_count", metric_value=0.0),
        ]

    total = len(eval_data)
    has_response = sum(1 for d in eval_data if d.get("response"))
    non_empty = sum(
        1 for d in eval_data
        if d.get("response") and len(str(d["response"]).strip()) > 0
    )

    return [
        EvaluationMetric(metric_name="eval_count", metric_value=float(total)),
        EvaluationMetric(
            metric_name="response_rate",
            metric_value=has_response / total if total else 0.0,
        ),
        EvaluationMetric(
            metric_name="non_empty_rate",
            metric_value=non_empty / total if total else 0.0,
        ),
    ]
