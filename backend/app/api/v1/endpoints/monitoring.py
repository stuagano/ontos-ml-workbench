"""
Monitoring API endpoints for MONITOR stage.

Provides real-time monitoring, performance metrics tracking, alerting,
and drift detection for deployed models.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_permission
from pydantic import BaseModel, Field

from app.core.databricks import get_current_user, get_workspace_client
from app.services.sql_service import get_sql_service
from app.core.config import get_settings

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
logger = logging.getLogger(__name__)

# Get services
_sql = get_sql_service()
_settings = get_settings()

# Table names
ENDPOINTS_TABLE = _settings.get_table("endpoints_registry")
FEEDBACK_TABLE = _settings.get_table("feedback_items")
ALERTS_TABLE = _settings.get_table("monitor_alerts")
METRICS_TABLE = _settings.get_table("endpoint_metrics")


# ============================================================================
# Request/Response Models
# ============================================================================


class MetricsFilter(BaseModel):
    """Filter for metrics queries."""

    endpoint_id: str | None = Field(None, description="Filter by endpoint")
    start_time: datetime | None = Field(None, description="Start of time range")
    end_time: datetime | None = Field(None, description="End of time range")
    aggregation: str = Field("1h", description="Aggregation window: 1m, 5m, 1h, 1d")


class PerformanceMetrics(BaseModel):
    """Performance metrics for an endpoint."""

    endpoint_id: str
    endpoint_name: str
    time_period: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_latency_ms: float | None = None
    p50_latency_ms: float | None = None
    p95_latency_ms: float | None = None
    p99_latency_ms: float | None = None
    error_rate: float
    requests_per_minute: float
    last_updated: datetime


class AlertConfig(BaseModel):
    """Alert configuration."""

    endpoint_id: str
    alert_type: str = Field(
        ..., description="Alert type: drift, latency, error_rate, quality"
    )
    threshold: float
    condition: str = Field(..., description="Condition: gt, lt, eq")
    enabled: bool = True
    notification_channels: list[str] | None = Field(
        None, description="Email addresses or webhook URLs"
    )


class AlertResponse(BaseModel):
    """Alert details."""

    id: str
    endpoint_id: str
    alert_type: str
    threshold: float
    condition: str
    status: str
    triggered_at: datetime | None = None
    current_value: float | None = None
    message: str | None = None
    created_at: datetime


class FeatureDrift(BaseModel):
    """Drift metrics for a single feature."""

    feature: str
    baseline_value: float
    recent_value: float
    drift_score: float
    drifted: bool


class DriftReport(BaseModel):
    """Data drift detection report."""

    endpoint_id: str
    endpoint_name: str
    detection_time: datetime
    drift_detected: bool
    drift_score: float
    baseline_period: str
    comparison_period: str
    affected_features: list[str] | None = None
    feature_details: list[FeatureDrift] | None = None
    severity: str  # low, medium, high, critical


class MetricIngestRequest(BaseModel):
    """Ingest a per-request metric data point."""

    endpoint_id: str
    endpoint_name: str | None = None
    request_id: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    latency_ms: float
    status_code: int = 200
    error_message: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    cost_dollars: float | None = None


class MetricIngestBatchRequest(BaseModel):
    """Ingest multiple metric data points."""

    metrics: list[MetricIngestRequest]


class TimeseriesPoint(BaseModel):
    """A single point in a time series."""

    timestamp: str
    total_requests: int = 0
    avg_latency_ms: float | None = None
    p95_latency_ms: float | None = None
    error_rate: float = 0.0
    total_tokens: int | None = None


# ============================================================================
# Metrics Ingestion
# ============================================================================


async def _ingest_single_metric(body: MetricIngestRequest) -> dict[str, str]:
    """Core logic for ingesting a single metric data point."""
    metric_id = str(uuid.uuid4())
    _sql.execute_update(f"""
        INSERT INTO {METRICS_TABLE}
        (id, endpoint_id, endpoint_name, request_id, model_name,
         model_version, latency_ms, status_code, error_message,
         input_tokens, output_tokens, total_tokens, cost_dollars)
        VALUES (
            '{metric_id}', '{body.endpoint_id}',
            {f"'{body.endpoint_name}'" if body.endpoint_name else 'NULL'},
            {f"'{body.request_id}'" if body.request_id else 'NULL'},
            {f"'{body.model_name}'" if body.model_name else 'NULL'},
            {f"'{body.model_version}'" if body.model_version else 'NULL'},
            {body.latency_ms}, {body.status_code},
            {f"'{body.error_message}'" if body.error_message else 'NULL'},
            {body.input_tokens or 'NULL'}, {body.output_tokens or 'NULL'},
            {body.total_tokens or 'NULL'}, {body.cost_dollars or 'NULL'}
        )
    """)
    return {"id": metric_id}


@router.post("/metrics/ingest", status_code=201)
async def ingest_metric(body: MetricIngestRequest, _auth: CurrentUser = Depends(require_permission("monitor", "write"))) -> dict[str, str]:
    """
    Ingest a single per-request metric data point.

    Called by the serving layer after each model inference to capture
    actual latency, token usage, and error information.
    """
    try:
        return await _ingest_single_metric(body)
    except Exception as e:
        logger.error(f"Failed to ingest metric: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest metric: {e}")


@router.post("/metrics/ingest/batch", status_code=201)
async def ingest_metrics_batch(body: MetricIngestBatchRequest, _auth: CurrentUser = Depends(require_permission("monitor", "write"))) -> dict[str, int]:
    """Ingest a batch of metric data points."""
    inserted = 0
    for m in body.metrics:
        try:
            await _ingest_single_metric(m)
            inserted += 1
        except Exception as e:
            logger.warning(f"Failed to ingest metric in batch: {e}")
    return {"inserted": inserted, "total": len(body.metrics)}


@router.get("/metrics/timeseries/{endpoint_id}", response_model=list[TimeseriesPoint])
async def get_timeseries(
    endpoint_id: str,
    hours: int = Query(24, ge=1, le=168),
    bucket_minutes: int = Query(60, ge=5, le=1440),
) -> list[TimeseriesPoint]:
    """
    Get time-bucketed metrics for charts.

    Returns aggregated metrics per time bucket for the specified endpoint.
    Queries the dedicated endpoint_metrics table for real latency data.
    """
    try:
        query = f"""
        SELECT
            date_trunc('HOUR', created_at) as bucket,
            COUNT(*) as total_requests,
            AVG(latency_ms) as avg_latency_ms,
            PERCENTILE_APPROX(latency_ms, 0.95) as p95_latency_ms,
            AVG(CASE WHEN status_code >= 400 THEN 1.0 ELSE 0.0 END) as error_rate,
            SUM(COALESCE(total_tokens, 0)) as total_tokens
        FROM {METRICS_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
          AND created_at >= current_timestamp() - INTERVAL {hours} HOUR
        GROUP BY date_trunc('HOUR', created_at)
        ORDER BY bucket
        """
        rows = _sql.execute(query)

        if rows:
            return [
                TimeseriesPoint(
                    timestamp=str(row["bucket"]),
                    total_requests=int(row["total_requests"]),
                    avg_latency_ms=float(row["avg_latency_ms"]) if row.get("avg_latency_ms") else None,
                    p95_latency_ms=float(row["p95_latency_ms"]) if row.get("p95_latency_ms") else None,
                    error_rate=float(row.get("error_rate", 0)) * 100,
                    total_tokens=int(row["total_tokens"]) if row.get("total_tokens") else None,
                )
                for row in rows
            ]

        # Fall back to feedback-derived data when no dedicated metrics exist
        fallback = f"""
        SELECT
            date_trunc('HOUR', created_at) as bucket,
            COUNT(*) as total_requests,
            AVG(CASE WHEN rating < 3 OR flagged = TRUE THEN 1.0 ELSE 0.0 END) as error_rate
        FROM {FEEDBACK_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
          AND created_at >= current_timestamp() - INTERVAL {hours} HOUR
        GROUP BY date_trunc('HOUR', created_at)
        ORDER BY bucket
        """
        fallback_rows = _sql.execute(fallback)
        return [
            TimeseriesPoint(
                timestamp=str(row["bucket"]),
                total_requests=int(row["total_requests"]),
                error_rate=float(row.get("error_rate", 0)) * 100,
            )
            for row in fallback_rows
        ]

    except Exception as e:
        logger.error(f"Failed to get timeseries: {e}")
        return []


# ============================================================================
# Performance Metrics
# ============================================================================


@router.get("/metrics/performance", response_model=list[PerformanceMetrics])
async def get_performance_metrics(
    endpoint_id: str | None = Query(None, description="Filter by endpoint ID"),
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
) -> list[PerformanceMetrics]:
    """
    Get performance metrics for endpoints.

    Calculates:
    - Request counts (total, successful, failed)
    - Latency percentiles (p50, p95, p99)
    - Error rates
    - Requests per minute

    Args:
        endpoint_id: Filter by specific endpoint
        hours: Time window in hours (default: 24h, max: 7 days)

    Returns:
        List of performance metrics
    """
    try:
        # Build filter conditions
        conditions = [
            f"created_at >= current_timestamp() - INTERVAL {hours} HOUR"
        ]
        if endpoint_id:
            conditions.append(f"endpoint_id = '{endpoint_id}'")

        where_clause = " AND ".join(conditions)

        # Calculate metrics from feedback items
        # Note: In production, you'd query from a dedicated metrics table
        # or use Databricks Lakehouse Monitoring
        metrics_sql = f"""
        SELECT
            endpoint_id,
            COUNT(*) as total_requests,
            SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as successful_requests,
            SUM(CASE WHEN rating < 3 OR flagged = TRUE THEN 1 ELSE 0 END) as failed_requests,
            AVG(CASE WHEN rating < 3 OR flagged = TRUE THEN 1.0 ELSE 0.0 END) as error_rate,
            COUNT(*) / ({hours} * 60.0) as requests_per_minute,
            MAX(created_at) as last_updated
        FROM {FEEDBACK_TABLE}
        WHERE {where_clause}
        GROUP BY endpoint_id
        """

        rows = _sql.execute(metrics_sql)

        # Try to get real latency data from endpoint_metrics
        latency_by_endpoint: dict[str, dict[str, float]] = {}
        try:
            latency_conditions = [
                f"created_at >= current_timestamp() - INTERVAL {hours} HOUR"
            ]
            if endpoint_id:
                latency_conditions.append(f"endpoint_id = '{endpoint_id}'")
            latency_where = " AND ".join(latency_conditions)

            latency_sql = f"""
            SELECT
                endpoint_id,
                AVG(latency_ms) as avg_latency,
                PERCENTILE_APPROX(latency_ms, 0.5) as p50_latency,
                PERCENTILE_APPROX(latency_ms, 0.95) as p95_latency,
                PERCENTILE_APPROX(latency_ms, 0.99) as p99_latency
            FROM {METRICS_TABLE}
            WHERE {latency_where}
            GROUP BY endpoint_id
            """
            latency_rows = _sql.execute(latency_sql)
            for lr in latency_rows:
                latency_by_endpoint[lr["endpoint_id"]] = {
                    "avg": float(lr.get("avg_latency") or 0),
                    "p50": float(lr.get("p50_latency") or 0),
                    "p95": float(lr.get("p95_latency") or 0),
                    "p99": float(lr.get("p99_latency") or 0),
                }
        except Exception:
            pass  # Metrics table may not exist yet

        metrics = []
        for row in rows:
            # Get endpoint name
            endpoint_sql = f"""
            SELECT name FROM {ENDPOINTS_TABLE}
            WHERE id = '{row['endpoint_id']}'
            """
            endpoint_rows = _sql.execute(endpoint_sql)
            endpoint_name = (
                endpoint_rows[0]["name"] if endpoint_rows else "Unknown"
            )

            latency = latency_by_endpoint.get(row["endpoint_id"], {})

            metrics.append(
                PerformanceMetrics(
                    endpoint_id=row["endpoint_id"],
                    endpoint_name=endpoint_name,
                    time_period=f"last_{hours}h",
                    total_requests=int(row["total_requests"]),
                    successful_requests=int(row["successful_requests"]),
                    failed_requests=int(row["failed_requests"]),
                    avg_latency_ms=latency.get("avg"),
                    p50_latency_ms=latency.get("p50"),
                    p95_latency_ms=latency.get("p95"),
                    p99_latency_ms=latency.get("p99"),
                    error_rate=float(row["error_rate"]) * 100,
                    requests_per_minute=float(row["requests_per_minute"]),
                    last_updated=row["last_updated"],
                )
            )

        return metrics

    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get performance metrics: {e}"
        )


@router.get("/metrics/realtime/{endpoint_id}")
async def get_realtime_metrics(
    endpoint_id: str,
    minutes: int = Query(5, ge=1, le=60, description="Time window in minutes"),
) -> dict[str, Any]:
    """
    Get real-time metrics for an endpoint.

    Provides up-to-the-minute statistics for monitoring dashboards.

    Args:
        endpoint_id: Endpoint ID
        minutes: Time window in minutes (default: 5m)

    Returns:
        Real-time metrics including current throughput and latency
    """
    try:
        # Get recent requests
        recent_sql = f"""
        SELECT
            COUNT(*) as request_count,
            SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN flagged = TRUE THEN 1 ELSE 0 END) as flagged_count,
            AVG(rating) as avg_rating
        FROM {FEEDBACK_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
          AND created_at >= current_timestamp() - INTERVAL {minutes} MINUTE
        """
        result = _sql.execute(recent_sql)

        if not result:
            return {
                "endpoint_id": endpoint_id,
                "time_window_minutes": minutes,
                "request_count": 0,
                "requests_per_minute": 0.0,
                "success_rate": 0.0,
                "avg_rating": 0.0,
                "flagged_count": 0,
            }

        row = result[0]
        request_count = int(row["request_count"] or 0)

        return {
            "endpoint_id": endpoint_id,
            "time_window_minutes": minutes,
            "request_count": request_count,
            "requests_per_minute": request_count / minutes,
            "success_rate": (
                (int(row["success_count"] or 0) / request_count * 100)
                if request_count > 0
                else 0.0
            ),
            "avg_rating": float(row["avg_rating"] or 0),
            "flagged_count": int(row["flagged_count"] or 0),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get realtime metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get realtime metrics: {e}"
        )


# ============================================================================
# Alerting
# ============================================================================


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(config: AlertConfig, _auth: CurrentUser = Depends(require_permission("monitor", "write"))) -> AlertResponse:
    """
    Create a new monitoring alert.

    Alert types:
    - drift: Data drift detection
    - latency: Response time threshold
    - error_rate: Error rate threshold
    - quality: Model quality metrics

    Args:
        config: Alert configuration

    Returns:
        Created alert details
    """
    user = get_current_user()
    alert_id = str(uuid.uuid4())

    try:
        # Verify endpoint exists
        endpoint_sql = f"""
        SELECT id FROM {ENDPOINTS_TABLE}
        WHERE id = '{config.endpoint_id}'
        """
        endpoint_result = _sql.execute(endpoint_sql)
        if not endpoint_result:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        # Insert alert
        insert_sql = f"""
        INSERT INTO {ALERTS_TABLE} (
            id, endpoint_id, alert_type, threshold, condition,
            status, created_at
        )
        VALUES (
            '{alert_id}',
            '{config.endpoint_id}',
            '{config.alert_type}',
            {config.threshold},
            '{config.condition}',
            'active',
            current_timestamp()
        )
        """
        _sql.execute_update(insert_sql)

        # Fetch created alert
        return await get_alert(alert_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {e}")


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    endpoint_id: str | None = Query(None, description="Filter by endpoint"),
    status: str | None = Query(None, description="Filter by status"),
    alert_type: str | None = Query(None, description="Filter by alert type"),
) -> list[AlertResponse]:
    """
    List monitoring alerts.

    Args:
        endpoint_id: Filter by endpoint
        status: Filter by status (active, acknowledged, resolved)
        alert_type: Filter by type (drift, latency, error_rate, quality)

    Returns:
        List of alerts
    """
    try:
        conditions = []
        if endpoint_id:
            conditions.append(f"endpoint_id = '{endpoint_id}'")
        if status:
            conditions.append(f"status = '{status}'")
        if alert_type:
            conditions.append(f"alert_type = '{alert_type}'")

        where_clause = (
            f"WHERE {' AND '.join(conditions)}" if conditions else ""
        )

        query_sql = f"""
        SELECT *
        FROM {ALERTS_TABLE}
        {where_clause}
        ORDER BY created_at DESC
        """
        rows = _sql.execute(query_sql)

        return [
            AlertResponse(
                id=row["id"],
                endpoint_id=row["endpoint_id"],
                alert_type=row["alert_type"],
                threshold=float(row["threshold"]),
                condition=row["condition"],
                status=row["status"],
                triggered_at=row.get("triggered_at"),
                current_value=float(row["current_value"]) if row.get("current_value") else None,
                message=row.get("message"),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Failed to list alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list alerts: {e}")


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str) -> AlertResponse:
    """Get alert details by ID."""
    try:
        query_sql = f"""
        SELECT *
        FROM {ALERTS_TABLE}
        WHERE id = '{alert_id}'
        """
        rows = _sql.execute(query_sql)

        if not rows:
            raise HTTPException(status_code=404, detail="Alert not found")

        row = rows[0]
        return AlertResponse(
            id=row["id"],
            endpoint_id=row["endpoint_id"],
            alert_type=row["alert_type"],
            threshold=float(row["threshold"]),
            condition=row["condition"],
            status=row["status"],
            triggered_at=row.get("triggered_at"),
            current_value=float(row["current_value"]) if row.get("current_value") else None,
            message=row.get("message"),
            created_at=row["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alert: {e}")


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, _auth: CurrentUser = Depends(require_permission("monitor", "write"))) -> AlertResponse:
    """
    Acknowledge an alert.

    Marks the alert as acknowledged by the current user.
    """
    user = get_current_user()

    try:
        # Verify alert exists
        await get_alert(alert_id)

        # Update alert
        update_sql = f"""
        UPDATE {ALERTS_TABLE}
        SET status = 'acknowledged',
            acknowledged_at = current_timestamp(),
            acknowledged_by = '{user}'
        WHERE id = '{alert_id}'
        """
        _sql.execute_update(update_sql)

        return await get_alert(alert_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to acknowledge alert: {e}"
        )


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, _auth: CurrentUser = Depends(require_permission("monitor", "write"))) -> AlertResponse:
    """
    Resolve an alert.

    Marks the alert as resolved (condition no longer met).
    """
    try:
        # Verify alert exists
        await get_alert(alert_id)

        # Update alert
        update_sql = f"""
        UPDATE {ALERTS_TABLE}
        SET status = 'resolved',
            resolved_at = current_timestamp()
        WHERE id = '{alert_id}'
        """
        _sql.execute_update(update_sql)

        return await get_alert(alert_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {e}")


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(alert_id: str, _auth: CurrentUser = Depends(require_permission("monitor", "admin"))) -> None:
    """Delete an alert configuration."""
    try:
        # Verify alert exists
        await get_alert(alert_id)

        # Delete alert
        delete_sql = f"""
        DELETE FROM {ALERTS_TABLE}
        WHERE id = '{alert_id}'
        """
        _sql.execute_update(delete_sql)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {e}")


# ============================================================================
# Drift Detection
# ============================================================================


@router.get("/drift/{endpoint_id}", response_model=DriftReport)
async def detect_drift(
    endpoint_id: str,
    baseline_days: int = Query(7, ge=1, le=30, description="Baseline period in days"),
    comparison_hours: int = Query(
        24, ge=1, le=168, description="Comparison period in hours"
    ),
) -> DriftReport:
    """
    Detect data drift for an endpoint.

    Compares recent input distributions against a baseline period
    to identify significant changes in data patterns.

    Args:
        endpoint_id: Endpoint to analyze
        baseline_days: Baseline period in days
        comparison_hours: Recent period to compare in hours

    Returns:
        Drift detection report
    """
    try:
        # Get endpoint name
        endpoint_sql = f"""
        SELECT name FROM {ENDPOINTS_TABLE}
        WHERE id = '{endpoint_id}'
        """
        endpoint_result = _sql.execute(endpoint_sql)
        if not endpoint_result:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        endpoint_name = endpoint_result[0]["name"]

        no_data_report = DriftReport(
            endpoint_id=endpoint_id,
            endpoint_name=endpoint_name,
            detection_time=datetime.utcnow(),
            drift_detected=False,
            drift_score=0.0,
            baseline_period=f"{baseline_days}d",
            comparison_period=f"{comparison_hours}h",
            severity="low",
        )

        # ── Feature 1: Latency, error rate, token count from endpoint_metrics ──
        feature_details: list[FeatureDrift] = []

        try:
            metrics_baseline_sql = f"""
            SELECT
                COUNT(*) as cnt,
                AVG(latency_ms) as avg_latency,
                AVG(CASE WHEN status_code >= 400 THEN 1.0 ELSE 0.0 END) as error_rate,
                AVG(total_tokens) as avg_tokens
            FROM {METRICS_TABLE}
            WHERE endpoint_id = '{endpoint_id}'
              AND created_at >= current_timestamp() - INTERVAL {baseline_days} DAY
              AND created_at < current_timestamp() - INTERVAL {comparison_hours} HOUR
            """
            metrics_recent_sql = f"""
            SELECT
                COUNT(*) as cnt,
                AVG(latency_ms) as avg_latency,
                AVG(CASE WHEN status_code >= 400 THEN 1.0 ELSE 0.0 END) as error_rate,
                AVG(total_tokens) as avg_tokens
            FROM {METRICS_TABLE}
            WHERE endpoint_id = '{endpoint_id}'
              AND created_at >= current_timestamp() - INTERVAL {comparison_hours} HOUR
            """
            mb = _sql.execute(metrics_baseline_sql)
            mr = _sql.execute(metrics_recent_sql)

            if mb and mr and int(mb[0].get("cnt") or 0) > 0 and int(mr[0].get("cnt") or 0) > 0:
                for feature_name, col in [("latency", "avg_latency"), ("error_rate", "error_rate"), ("token_count", "avg_tokens")]:
                    b_val = float(mb[0].get(col) or 0)
                    r_val = float(mr[0].get(col) or 0)
                    score = abs(b_val - r_val) / (b_val + 0.001)
                    feature_details.append(FeatureDrift(
                        feature=feature_name,
                        baseline_value=round(b_val, 3),
                        recent_value=round(r_val, 3),
                        drift_score=round(score, 4),
                        drifted=score > 0.1,
                    ))
        except Exception as e:
            logger.debug(f"Metrics drift check skipped (table may not exist): {e}")

        # ── Feature 2: Feedback rating drift ──
        try:
            fb_baseline_sql = f"""
            SELECT COUNT(*) as cnt, AVG(rating) as avg_rating
            FROM {FEEDBACK_TABLE}
            WHERE endpoint_id = '{endpoint_id}'
              AND created_at >= current_timestamp() - INTERVAL {baseline_days} DAY
              AND created_at < current_timestamp() - INTERVAL {comparison_hours} HOUR
            """
            fb_recent_sql = f"""
            SELECT COUNT(*) as cnt, AVG(rating) as avg_rating
            FROM {FEEDBACK_TABLE}
            WHERE endpoint_id = '{endpoint_id}'
              AND created_at >= current_timestamp() - INTERVAL {comparison_hours} HOUR
            """
            fb = _sql.execute(fb_baseline_sql)
            fr = _sql.execute(fb_recent_sql)

            if fb and fr and int(fb[0].get("cnt") or 0) > 0 and int(fr[0].get("cnt") or 0) > 0:
                b_val = float(fb[0].get("avg_rating") or 0)
                r_val = float(fr[0].get("avg_rating") or 0)
                score = abs(b_val - r_val) / (b_val + 0.001)
                feature_details.append(FeatureDrift(
                    feature="rating",
                    baseline_value=round(b_val, 3),
                    recent_value=round(r_val, 3),
                    drift_score=round(score, 4),
                    drifted=score > 0.1,
                ))
        except Exception as e:
            logger.debug(f"Feedback drift check skipped: {e}")

        if not feature_details:
            return no_data_report

        # ── Aggregate: max drift score across all features ──
        max_score = max(fd.drift_score for fd in feature_details)
        affected = [fd.feature for fd in feature_details if fd.drifted]
        drift_detected = len(affected) > 0

        if max_score > 0.3:
            severity = "critical"
        elif max_score > 0.2:
            severity = "high"
        elif max_score > 0.1:
            severity = "medium"
        else:
            severity = "low"

        return DriftReport(
            endpoint_id=endpoint_id,
            endpoint_name=endpoint_name,
            detection_time=datetime.utcnow(),
            drift_detected=drift_detected,
            drift_score=round(max_score, 4),
            baseline_period=f"{baseline_days}d",
            comparison_period=f"{comparison_hours}h",
            affected_features=affected if affected else None,
            feature_details=feature_details,
            severity=severity,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to detect drift: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect drift: {e}")


# ============================================================================
# Health Check
# ============================================================================


@router.get("/health/{endpoint_id}")
async def check_endpoint_health(endpoint_id: str) -> dict[str, Any]:
    """
    Check overall health of an endpoint.

    Combines metrics, alerts, and drift status into a single health score.

    Args:
        endpoint_id: Endpoint to check

    Returns:
        Health status and score
    """
    try:
        # Get recent metrics (last hour)
        metrics_result = await get_realtime_metrics(endpoint_id, minutes=60)

        # Get active alerts
        alerts_result = await list_alerts(endpoint_id=endpoint_id, status="active")

        # Get drift status
        drift_result = await detect_drift(endpoint_id)

        # Calculate health score (0-100)
        health_score = 100.0

        # Deduct for error rate
        success_rate = metrics_result.get("success_rate", 100.0)
        health_score -= (100 - success_rate) * 0.5

        # Deduct for active alerts
        health_score -= len(alerts_result) * 10

        # Deduct for drift
        if drift_result.drift_detected:
            if drift_result.severity == "critical":
                health_score -= 30
            elif drift_result.severity == "high":
                health_score -= 20
            elif drift_result.severity == "medium":
                health_score -= 10

        health_score = max(0.0, min(100.0, health_score))

        # Determine status
        if health_score >= 90:
            status = "healthy"
        elif health_score >= 70:
            status = "degraded"
        elif health_score >= 50:
            status = "warning"
        else:
            status = "critical"

        return {
            "endpoint_id": endpoint_id,
            "health_score": health_score,
            "status": status,
            "metrics": metrics_result,
            "active_alerts": len(alerts_result),
            "drift_detected": drift_result.drift_detected,
            "drift_severity": drift_result.severity,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to check endpoint health: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to check endpoint health: {e}"
        )
