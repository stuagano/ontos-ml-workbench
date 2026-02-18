"""
Monitoring API endpoints for MONITOR stage.

Provides real-time monitoring, performance metrics tracking, alerting,
and drift detection for deployed models.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query
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
    severity: str  # low, medium, high, critical


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

            metrics.append(
                PerformanceMetrics(
                    endpoint_id=row["endpoint_id"],
                    endpoint_name=endpoint_name,
                    time_period=f"last_{hours}h",
                    total_requests=int(row["total_requests"]),
                    successful_requests=int(row["successful_requests"]),
                    failed_requests=int(row["failed_requests"]),
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
async def create_alert(config: AlertConfig) -> AlertResponse:
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
async def acknowledge_alert(alert_id: str) -> AlertResponse:
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
async def resolve_alert(alert_id: str) -> AlertResponse:
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
async def delete_alert(alert_id: str) -> None:
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

        # Get baseline statistics
        baseline_sql = f"""
        SELECT
            COUNT(*) as baseline_count,
            AVG(rating) as baseline_avg_rating,
            STDDEV(rating) as baseline_stddev_rating
        FROM {FEEDBACK_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
          AND created_at >= current_timestamp() - INTERVAL {baseline_days} DAY
          AND created_at < current_timestamp() - INTERVAL {comparison_hours} HOUR
        """
        baseline_result = _sql.execute(baseline_sql)

        # Get recent statistics
        recent_sql = f"""
        SELECT
            COUNT(*) as recent_count,
            AVG(rating) as recent_avg_rating,
            STDDEV(rating) as recent_stddev_rating
        FROM {FEEDBACK_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
          AND created_at >= current_timestamp() - INTERVAL {comparison_hours} HOUR
        """
        recent_result = _sql.execute(recent_sql)

        if not baseline_result or not recent_result:
            return DriftReport(
                endpoint_id=endpoint_id,
                endpoint_name=endpoint_name,
                detection_time=datetime.utcnow(),
                drift_detected=False,
                drift_score=0.0,
                baseline_period=f"{baseline_days}d",
                comparison_period=f"{comparison_hours}h",
                severity="low",
            )

        baseline = baseline_result[0]
        recent = recent_result[0]

        # Calculate drift score (simplified - in production use statistical tests)
        baseline_avg = float(baseline.get("baseline_avg_rating") or 0)
        recent_avg = float(recent.get("recent_avg_rating") or 0)

        drift_score = abs(baseline_avg - recent_avg) / (baseline_avg + 0.001)

        # Determine severity
        drift_detected = drift_score > 0.1  # 10% threshold
        if drift_score > 0.3:
            severity = "critical"
        elif drift_score > 0.2:
            severity = "high"
        elif drift_score > 0.1:
            severity = "medium"
        else:
            severity = "low"

        return DriftReport(
            endpoint_id=endpoint_id,
            endpoint_name=endpoint_name,
            detection_time=datetime.utcnow(),
            drift_detected=drift_detected,
            drift_score=drift_score,
            baseline_period=f"{baseline_days}d",
            comparison_period=f"{comparison_hours}h",
            affected_features=["rating"] if drift_detected else None,
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
