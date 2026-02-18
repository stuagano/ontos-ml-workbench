"""
MLflow Integration Service
==========================

Integrates gap analysis and attribution with MLflow to:
1. Automatically trigger gap analysis when model performance drops
2. Log analysis results as MLflow artifacts
3. Link gaps back to specific model versions and training runs
4. Create alerts for critical gaps

Usage:
    # Check model and run analysis if degraded
    result = await check_and_analyze_model("my_model", "2.1")

    # Schedule periodic analysis
    results = await run_scheduled_analysis([
        {"name": "model_a", "version": "latest"},
        {"name": "model_b", "version": "2.0"},
    ])
"""

import json
import logging
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.models.gap_analysis import AnnotationTaskCreate, GapSeverity
from app.services.gap_analysis_service import (
    create_annotation_task,
    run_full_gap_analysis,
)
from app.services.sql_service import execute_sql

logger = logging.getLogger(__name__)


# ============================================================================
# MLflow Integration Functions
# ============================================================================


async def check_and_analyze_model(
    model_name: str,
    model_version: str,
    baseline_version: str | None = None,
    performance_threshold: float = 0.05,
    metrics_to_watch: list[str] | None = None,
    auto_create_tasks: bool = True,
    force: bool = False,
) -> dict[str, Any]:
    """
    Check if model performance has degraded and run gap analysis if needed.

    Args:
        model_name: Name of the model
        model_version: Current version to analyze
        baseline_version: Version to compare against (default: previous version)
        performance_threshold: % degradation to trigger analysis (0.05 = 5%)
        metrics_to_watch: Which metrics to monitor
        auto_create_tasks: Create annotation tasks for critical gaps
        force: Run analysis even if no degradation detected

    Returns:
        Analysis results including gaps found and tasks created
    """
    metrics_to_watch = metrics_to_watch or ["accuracy", "f1_score", "precision", "recall"]

    logger.info(f"Checking model {model_name} v{model_version}")

    # Get current model metrics
    current_metrics = await _get_model_metrics(model_name, model_version)
    if not current_metrics:
        logger.warning(f"No metrics found for {model_name} v{model_version}")
        return {"status": "no_metrics", "gaps": []}

    # Get baseline metrics
    if not baseline_version:
        baseline_version = await _get_previous_version(model_name, model_version)

    baseline_metrics = {}
    if baseline_version:
        baseline_metrics = await _get_model_metrics(model_name, baseline_version)

    # Check for degradation
    degradation = _calculate_degradation(
        current_metrics, baseline_metrics, metrics_to_watch
    )

    should_analyze = force or any(
        d > performance_threshold
        for m, d in degradation.items()
        if m in metrics_to_watch
    )

    if not should_analyze:
        logger.info(f"No significant degradation detected for {model_name}")
        return {
            "status": "ok",
            "model_name": model_name,
            "model_version": model_version,
            "current_metrics": current_metrics,
            "baseline_metrics": baseline_metrics,
            "degradation": degradation,
            "gaps": [],
        }

    # Run gap analysis
    logger.info(f"Degradation detected, running gap analysis for {model_name}")

    # Get template ID from model metadata
    template_id = await _get_model_template(model_name, model_version)

    # Run analysis
    analysis = await run_full_gap_analysis(
        model_name=model_name,
        model_version=model_version,
        template_id=template_id,
        analysis_types=["errors", "coverage", "quality", "emerging"],
        auto_create_tasks=auto_create_tasks,
    )

    # Log results to MLflow
    await _log_analysis_to_mlflow(
        model_name, model_version, degradation, analysis.gaps
    )

    return {
        "status": "degradation_detected",
        "model_name": model_name,
        "model_version": model_version,
        "baseline_version": baseline_version,
        "current_metrics": current_metrics,
        "baseline_metrics": baseline_metrics,
        "degradation": degradation,
        "gaps_found": analysis.gaps_found,
        "critical_gaps": analysis.critical_gaps,
        "gaps": [g.model_dump() for g in analysis.gaps],
        "tasks_created": analysis.tasks_created,
        "recommendations": analysis.recommendations,
        "timestamp": datetime.now().isoformat(),
    }


async def run_scheduled_analysis(
    models_to_watch: list[dict[str, str]],
    performance_threshold: float = 0.05,
) -> list[dict[str, Any]]:
    """
    Run gap analysis on multiple models.

    Args:
        models_to_watch: List of {"name": ..., "version": ...} to analyze
        performance_threshold: % degradation to trigger analysis

    Returns:
        List of analysis results for each model
    """
    results = []

    for model in models_to_watch:
        try:
            result = await check_and_analyze_model(
                model_name=model["name"],
                model_version=model.get("version", "latest"),
                performance_threshold=performance_threshold,
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Error analyzing {model['name']}: {e}")
            results.append({
                "model_name": model["name"],
                "status": "error",
                "error": str(e),
            })

    return results


async def handle_model_registered_webhook(payload: dict) -> dict[str, Any]:
    """
    Handle MLflow model registry webhook for new model versions.

    Can be registered as a webhook endpoint to automatically
    trigger gap analysis when new models are registered.

    Args:
        payload: Webhook payload from MLflow

    Returns:
        Analysis trigger result
    """
    event_type = payload.get("event_type")

    if event_type not in ["MODEL_VERSION_CREATED", "MODEL_VERSION_TRANSITIONED_STAGE"]:
        return {"status": "ignored", "reason": f"Event type {event_type} not handled"}

    model_name = payload.get("model_name")
    model_version = payload.get("version")

    if not model_name or not model_version:
        return {"status": "error", "reason": "Missing model_name or version"}

    # Trigger analysis
    result = await check_and_analyze_model(
        model_name=model_name,
        model_version=model_version,
        force=True,  # Always analyze new versions
    )

    return {
        "status": "triggered",
        "model_name": model_name,
        "version": model_version,
        "analysis_result": result,
    }


# ============================================================================
# MLflow Logging Functions
# ============================================================================


async def _log_analysis_to_mlflow(
    model_name: str,
    model_version: str,
    degradation: dict[str, float],
    gaps: list,
) -> None:
    """Log gap analysis results as MLflow artifacts and metrics."""
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        client = MlflowClient()

        # Try to get the run ID for this model version
        try:
            mv = client.get_model_version(model_name, model_version)
            run_id = mv.run_id
        except Exception:
            # Create a new run if model version not found
            with mlflow.start_run() as run:
                run_id = run.info.run_id

        if not run_id:
            logger.warning("No run_id found, skipping MLflow logging")
            return

        # Log metrics
        with mlflow.start_run(run_id=run_id, nested=True):
            for metric, value in degradation.items():
                mlflow.log_metric(f"degradation_{metric}", value)

            mlflow.log_metric("gaps_identified", len(gaps))
            mlflow.log_metric(
                "critical_gaps",
                sum(1 for g in gaps if g.severity == GapSeverity.CRITICAL),
            )

            # Log full analysis as artifact
            analysis_artifact = {
                "timestamp": datetime.now().isoformat(),
                "model": model_name,
                "version": model_version,
                "degradation": degradation,
                "gaps": [g.model_dump() if hasattr(g, "model_dump") else g for g in gaps],
            }

            import tempfile

            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                json.dump(analysis_artifact, f, indent=2, default=str)
                mlflow.log_artifact(f.name, "gap_analysis")

        logger.info(f"Logged gap analysis to MLflow run {run_id}")

    except ImportError:
        logger.warning("MLflow not available, skipping logging")
    except Exception as e:
        logger.error(f"Error logging to MLflow: {e}")


async def log_attribution_to_mlflow(
    model_name: str,
    model_version: str,
    attribution_result: dict,
) -> str | None:
    """Log attribution results to MLflow."""
    try:
        import mlflow

        with mlflow.start_run(nested=True) as run:
            mlflow.log_metric(
                "attribution_compute_time",
                attribution_result.get("compute_time_seconds", 0),
            )
            mlflow.log_metric("total_bits", attribution_result.get("total_bits", 0))
            mlflow.log_metric(
                "positive_contributors",
                attribution_result.get("positive_contributors", 0),
            )
            mlflow.log_metric(
                "negative_contributors",
                attribution_result.get("negative_contributors", 0),
            )

            # Log top contributions
            for i, contrib in enumerate(
                attribution_result.get("contributions", [])[:5]
            ):
                mlflow.log_metric(
                    f"bit_{i+1}_importance",
                    contrib.get("importance_score", 0),
                )

            # Log full results as artifact
            import tempfile

            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                json.dump(attribution_result, f, indent=2, default=str)
                mlflow.log_artifact(f.name, "attribution")

            return run.info.run_id

    except ImportError:
        logger.warning("MLflow not available")
        return None
    except Exception as e:
        logger.error(f"Error logging attribution to MLflow: {e}")
        return None


# ============================================================================
# Helper Functions
# ============================================================================


async def _get_model_metrics(
    model_name: str, version: str
) -> dict[str, float]:
    """Get metrics for a model version from MLflow or evaluation tables."""
    settings = get_settings()

    # First try to get from our evaluation table
    query = f"""
    SELECT metric_name, metric_value
    FROM {settings.uc_catalog}.{settings.uc_schema}.model_evaluations
    WHERE model_name = '{model_name}'
      AND model_version = '{version}'
    """

    try:
        result = await execute_sql(query)
        rows = result.get("data", [])
        if rows:
            return {row["metric_name"]: row["metric_value"] for row in rows}
    except Exception:
        pass

    # Fall back to MLflow
    try:
        from mlflow.tracking import MlflowClient

        client = MlflowClient()
        model_version = client.get_model_version(model_name, version)
        if model_version.run_id:
            run = client.get_run(model_version.run_id)
            return run.data.metrics
    except Exception as e:
        logger.warning(f"Could not get metrics from MLflow: {e}")

    # Return simulated metrics for demo
    return _simulate_metrics(model_name, version)


async def _get_previous_version(
    model_name: str, current_version: str
) -> str | None:
    """Get the previous version of a model."""
    try:
        from mlflow.tracking import MlflowClient

        client = MlflowClient()
        versions = client.search_model_versions(f"name='{model_name}'")
        versions = sorted(versions, key=lambda v: int(v.version), reverse=True)

        for v in versions:
            if v.version < current_version:
                return v.version
        return None
    except Exception:
        # Simulate previous version
        try:
            current_int = int(current_version.replace("v", "").split(".")[0])
            if current_int > 1:
                return str(current_int - 1)
        except ValueError:
            pass
        return None


async def _get_model_template(
    model_name: str, model_version: str
) -> str | None:
    """Get the template ID associated with a model."""
    settings = get_settings()

    query = f"""
    SELECT template_id
    FROM {settings.uc_catalog}.{settings.uc_schema}.model_bits
    WHERE model_name = '{model_name}'
      AND model_version = '{model_version}'
    LIMIT 1
    """

    try:
        result = await execute_sql(query)
        rows = result.get("data", [])
        if rows:
            return rows[0].get("template_id")
    except Exception:
        pass

    return None


def _calculate_degradation(
    current: dict[str, float],
    baseline: dict[str, float],
    metrics_to_watch: list[str],
) -> dict[str, float]:
    """Calculate % degradation for each metric."""
    degradation = {}
    for metric in metrics_to_watch:
        if metric in current and metric in baseline and baseline[metric] != 0:
            # Positive = degradation (current worse than baseline)
            degradation[metric] = (baseline[metric] - current[metric]) / baseline[metric]
        else:
            degradation[metric] = 0.0
    return degradation


def _simulate_metrics(model_name: str, version: str) -> dict[str, float]:
    """Return simulated metrics for demo purposes."""
    # Simulate slight degradation for newer versions
    base_accuracy = 0.92
    base_f1 = 0.89

    try:
        v = int(version.replace("v", "").split(".")[0])
        # Add some variation
        import random

        random.seed(hash(f"{model_name}{version}"))
        variation = random.uniform(-0.05, 0.02)
    except ValueError:
        variation = 0

    return {
        "accuracy": base_accuracy + variation,
        "f1_score": base_f1 + variation,
        "precision": base_accuracy + variation - 0.02,
        "recall": base_f1 + variation + 0.01,
    }


# ============================================================================
# Databricks Job Configuration Generator
# ============================================================================


def generate_databricks_job_config(
    models_to_watch: list[dict[str, str]],
    schedule: str = "0 0 * * *",
    cluster_id: str | None = None,
) -> dict:
    """
    Generate Databricks Jobs config for scheduled gap analysis.

    Args:
        models_to_watch: List of {"name": ..., "version": ...} to monitor
        schedule: Cron schedule (default: daily at midnight)
        cluster_id: Cluster to use (or will use new job cluster)

    Returns:
        Job configuration dict for Databricks Jobs API
    """
    config = {
        "name": "Ontos ML Gap Analysis - Scheduled",
        "schedule": {
            "quartz_cron_expression": schedule,
            "timezone_id": "UTC",
        },
        "tasks": [
            {
                "task_key": "gap_analysis",
                "notebook_task": {
                    "notebook_path": "/Repos/ontos-ml/notebooks/scheduled_gap_analysis",
                    "base_parameters": {"models": json.dumps(models_to_watch)},
                },
            }
        ],
        "email_notifications": {"on_failure": []},
        "tags": {"team": "ml-platform", "system": "ontos-ml"},
    }

    if cluster_id:
        config["tasks"][0]["existing_cluster_id"] = cluster_id
    else:
        config["tasks"][0]["new_cluster"] = {
            "spark_version": "14.3.x-scala2.12",
            "node_type_id": "i3.xlarge",
            "num_workers": 0,
        }

    return config
