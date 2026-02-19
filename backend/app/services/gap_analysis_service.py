"""
Gap Analysis Service
====================

Identifies gaps in training data by analyzing:
1. Model prediction errors and failure patterns
2. Coverage distribution vs expected categories
3. Quality scores by data segment
4. Emerging topics from recent queries

Uses LangGraph-compatible tool functions that can be orchestrated
by an AI agent or called directly via API.
"""

import logging
import uuid
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.models.gap_analysis import (
    AnnotationTaskCreate,
    AnnotationTaskResponse,
    CoverageGap,
    EmergingTopic,
    ErrorCluster,
    GapAnalysisResponse,
    GapCreate,
    GapResponse,
    GapSeverity,
    GapStatus,
    GapType,
    GapUpdate,
    QualityGap,
    TaskStatus,
)
from app.services.sql_service import execute_sql

logger = logging.getLogger(__name__)


def _get_tables() -> dict[str, str]:
    """Get fully qualified table names using settings.get_table()."""
    settings = get_settings()
    return {
        "feedback": settings.get_table("feedback_items"),
        "endpoints": settings.get_table("endpoints_registry"),
        "qa_pairs": settings.get_table("qa_pairs"),
        "training_sheets": settings.get_table("training_sheets"),
        "evaluations": settings.get_table("model_evaluations"),
        "gaps": settings.get_table("identified_gaps"),
        "tasks": settings.get_table("annotation_tasks"),
    }


# ============================================================================
# Gap Analysis Tools (LangGraph Compatible)
# ============================================================================


async def analyze_model_errors(
    model_name: str,
    model_version: str,
    error_threshold: float = 0.1,
    min_cluster_size: int = 10,
) -> dict[str, Any]:
    """
    Analyze model prediction errors to identify systematic failure patterns.

    Combines two data sources:
    1. model_evaluations — metrics below threshold from mlflow.evaluate()
    2. feedback_items JOIN endpoints_registry — user-reported errors (low rating or flagged)

    Args:
        model_name: Name of the model to analyze
        model_version: Version of the model
        error_threshold: Minimum error rate to flag (0-1)
        min_cluster_size: Minimum errors to form a cluster

    Returns:
        Dictionary with error clusters and recommendations
    """
    tables = _get_tables()
    logger.info(f"Analyzing errors for {model_name} v{model_version}")

    # Source 1: Evaluation metrics below threshold
    eval_query = f"""
    SELECT metric_name as error_category, COUNT(*) as error_count
    FROM {tables["evaluations"]}
    WHERE model_name = '{_escape_sql(model_name)}'
      AND model_version = '{_escape_sql(model_version)}'
      AND metric_value < 0.7
    GROUP BY metric_name
    """

    # Source 2: Negative user feedback joined to endpoints
    feedback_query = f"""
    SELECT
        er.endpoint_name as error_category,
        COUNT(*) as error_count,
        COLLECT_LIST(SUBSTRING(fi.input_data, 1, 200)) as sample_queries
    FROM {tables["feedback"]} fi
    JOIN {tables["endpoints"]} er ON fi.endpoint_id = er.id
    WHERE er.model_name = '{_escape_sql(model_name)}'
      AND er.model_version = '{_escape_sql(model_version)}'
      AND (CAST(fi.rating AS INT) < 3 OR fi.flagged = TRUE)
    GROUP BY er.endpoint_name
    HAVING COUNT(*) >= {min_cluster_size}
    """

    try:
        # Try both sources, combine results
        rows: list[dict] = []
        try:
            eval_rows = await execute_sql(eval_query)
            rows.extend(eval_rows)
        except Exception as eval_err:
            logger.debug(f"Eval metrics query returned no results: {eval_err}")

        feedback_rows = await execute_sql(feedback_query)
        rows.extend(feedback_rows)

        # Transform to error clusters
        error_clusters = []
        total_errors = sum(row.get("error_count", 0) for row in rows)

        for i, row in enumerate(rows):
            error_count = row.get("error_count", 0)
            error_rate = error_count / max(total_errors, 1)

            if error_rate >= error_threshold:
                cluster = ErrorCluster(
                    cluster_id=f"cluster_{i:03d}",
                    topic=row.get("error_category", "Unknown"),
                    error_count=error_count,
                    error_rate=error_rate,
                    sample_queries=row.get("sample_queries", [])[:5],
                    common_failure_mode=None,
                    suggested_gap_type=GapType.COVERAGE,
                    severity=_severity_from_error_rate(error_rate),
                    suggested_action=f"Add training data for {row.get('error_category')}",
                    estimated_records_needed=min(500, error_count * 2),
                )
                error_clusters.append(cluster)

        return {
            "model_name": model_name,
            "model_version": model_version,
            "total_errors": total_errors,
            "error_clusters": [c.model_dump() for c in error_clusters],
            "recommendations": _generate_error_recommendations(error_clusters),
        }

    except Exception as e:
        logger.warning(f"Error querying feedback data: {e}, using simulated data")
        return _simulate_error_analysis(model_name, model_version)


async def analyze_coverage_distribution(
    template_id: str,
    expected_distribution: dict[str, float] | None = None,
) -> dict[str, Any]:
    """
    Analyze how well training data covers expected topic/category distribution.

    Queries qa_pairs joined to training_sheets to get distribution by
    training sheet name (the closest proxy for "category" in the real data model).

    Args:
        template_id: Template to analyze
        expected_distribution: Expected % by category (uniform if not provided)

    Returns:
        Coverage analysis with identified gaps
    """
    tables = _get_tables()
    logger.info(f"Analyzing coverage for template {template_id}")

    query = f"""
    SELECT
        ts.name as category,
        COUNT(*) as record_count
    FROM {tables["qa_pairs"]} qp
    JOIN {tables["training_sheets"]} ts ON qp.training_sheet_id = ts.id
    WHERE ts.template_id = '{_escape_sql(template_id)}'
      AND qp.review_status IN ('approved', 'edited')
    GROUP BY ts.name
    ORDER BY record_count DESC
    """

    try:
        rows = await execute_sql(query)

        total_records = sum(row.get("record_count", 0) for row in rows)
        actual_distribution = {
            row.get("category"): row.get("record_count", 0) / max(total_records, 1)
            for row in rows
        }

        # Default to uniform expected if not provided
        if not expected_distribution:
            categories = list(actual_distribution.keys())
            if categories:
                expected_distribution = {c: 1.0 / len(categories) for c in categories}
            else:
                expected_distribution = {}

        # Find coverage gaps
        coverage_gaps = []
        for category, expected in expected_distribution.items():
            actual = actual_distribution.get(category, 0)
            delta = actual - expected

            if delta < -0.05:  # More than 5% under-represented
                gap = CoverageGap(
                    category=category,
                    actual_coverage=round(actual * 100, 1),
                    expected_coverage=round(expected * 100, 1),
                    gap_percentage=round(abs(delta) * 100, 1),
                    severity=GapSeverity.HIGH if abs(delta) > 0.10 else GapSeverity.MEDIUM,
                    estimated_records_needed=int(abs(delta) * total_records),
                    suggested_action=f"Add more {category.replace('_', ' ')} examples",
                )
                coverage_gaps.append(gap)

        # Calculate balance score
        total_variance = sum(
            (actual_distribution.get(k, 0) - v) ** 2
            for k, v in expected_distribution.items()
        )
        balance_score = max(0, 1 - (total_variance * 10))

        return {
            "template_id": template_id,
            "actual_distribution": {
                k: f"{v*100:.1f}%" for k, v in actual_distribution.items()
            },
            "expected_distribution": {
                k: f"{v*100:.1f}%" for k, v in expected_distribution.items()
            },
            "coverage_gaps": [g.model_dump() for g in coverage_gaps],
            "overall_balance_score": round(balance_score, 2),
            "total_gap_records_needed": sum(g.estimated_records_needed for g in coverage_gaps),
        }

    except Exception as e:
        logger.warning(f"Error querying coverage data: {e}, using simulated data")
        return _simulate_coverage_analysis(template_id)


async def analyze_quality_by_segment(
    template_id: str,
) -> dict[str, Any]:
    """
    Analyze quality scores broken down by training sheet.

    Queries qa_pairs grouped by training_sheet name for quality scores.

    Args:
        template_id: Template to analyze

    Returns:
        Quality analysis by segment with recommendations
    """
    tables = _get_tables()
    logger.info(f"Analyzing quality by training sheet for template {template_id}")

    query = f"""
    SELECT
        ts.name as segment,
        COUNT(*) as record_count,
        AVG(COALESCE(qp.quality_score, 0.5)) as avg_quality,
        SUM(CASE WHEN qp.review_status = 'flagged' THEN 1 ELSE 0 END) as flagged_count
    FROM {tables["qa_pairs"]} qp
    JOIN {tables["training_sheets"]} ts ON qp.training_sheet_id = ts.id
    WHERE ts.template_id = '{_escape_sql(template_id)}'
    GROUP BY ts.name
    HAVING COUNT(*) >= 10
    ORDER BY avg_quality ASC
    """

    try:
        rows = await execute_sql(query)

        quality_gaps = []
        for row in rows:
            quality = row.get("avg_quality", 0)
            # quality_score is already 0-1 range (not 0-5)
            if quality < 0.80:
                gap = QualityGap(
                    segment=row.get("segment", "unknown"),
                    record_count=row.get("record_count", 0),
                    quality_score=round(quality, 2),
                    issues=_infer_quality_issues(quality, row.get("flagged_count", 0)),
                    severity=GapSeverity.HIGH if quality < 0.70 else GapSeverity.MEDIUM,
                    suggested_action=f"Review and curate {row.get('segment')} segment",
                    estimated_effort_hours=row.get("record_count", 0) * 0.02,
                )
                quality_gaps.append(gap)

        return {
            "template_id": template_id,
            "segment_by": "training_sheet",
            "quality_gaps": [g.model_dump() for g in quality_gaps],
            "total_records_needing_review": sum(g.record_count for g in quality_gaps),
            "total_estimated_effort_hours": round(
                sum(g.estimated_effort_hours for g in quality_gaps), 1
            ),
        }

    except Exception as e:
        logger.warning(f"Error querying quality data: {e}, using simulated data")
        return _simulate_quality_analysis(template_id)


async def detect_emerging_topics(
    model_name: str,
    lookback_days: int = 30,
) -> dict[str, Any]:
    """
    Detect emerging topics from recent queries that may not be well covered.

    Queries recent feedback_items joined to endpoints_registry, grouped by
    endpoint to find models with high negative feedback.

    Args:
        model_name: Model to analyze queries for
        lookback_days: How many days of queries to analyze

    Returns:
        Emerging topics with coverage assessment
    """
    tables = _get_tables()
    logger.info(f"Detecting emerging topics for {model_name} (last {lookback_days} days)")

    query = f"""
    SELECT
        er.endpoint_name as topic,
        COUNT(*) as query_count,
        SUM(CASE WHEN CAST(fi.rating AS INT) >= 3 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN CAST(fi.rating AS INT) < 3 THEN 1 ELSE 0 END) as negative_count
    FROM {tables["feedback"]} fi
    JOIN {tables["endpoints"]} er ON fi.endpoint_id = er.id
    WHERE er.model_name = '{_escape_sql(model_name)}'
      AND fi.created_at >= DATE_SUB(CURRENT_DATE(), {lookback_days})
    GROUP BY er.endpoint_name
    HAVING COUNT(*) >= 10
    ORDER BY query_count DESC
    LIMIT 20
    """

    try:
        rows = await execute_sql(query)

        emerging_topics = []
        for row in rows:
            positive = row.get("positive_count", 0)
            negative = row.get("negative_count", 0)
            total = positive + negative

            # Topics with high negative feedback or new topics
            if negative > positive or total < 50:
                coverage = "partial" if positive > negative else "minimal"
                topic = EmergingTopic(
                    topic=row.get("topic", "unknown"),
                    query_count=row.get("query_count", 0),
                    trend="increasing" if total > 20 else "new",
                    week_over_week_growth=None,
                    sample_queries=[],
                    current_coverage=coverage,
                    suggested_records=min(200, row.get("query_count", 50)),
                    priority=GapSeverity.HIGH if negative > positive * 2 else GapSeverity.MEDIUM,
                )
                emerging_topics.append(topic)

        return {
            "model_name": model_name,
            "analysis_period_days": lookback_days,
            "emerging_topics": [t.model_dump() for t in emerging_topics],
            "total_suggested_records": sum(t.suggested_records for t in emerging_topics),
        }

    except Exception as e:
        logger.warning(f"Error detecting emerging topics: {e}, using simulated data")
        return _simulate_emerging_topics(model_name)


# ============================================================================
# Gap Record Management
# ============================================================================


async def create_gap_record(gap: GapCreate) -> GapResponse:
    """Create a gap record in the database."""
    tables = _get_tables()
    gap_id = f"gap_{uuid.uuid4().hex[:12]}"

    # Calculate priority score
    severity_scores = {"critical": 100, "high": 75, "medium": 50, "low": 25}
    base_priority = severity_scores.get(gap.severity.value, 50)

    if gap.affected_queries_count > 500:
        base_priority += 15
    elif gap.affected_queries_count > 100:
        base_priority += 10

    if gap.error_rate and gap.error_rate > 0.3:
        base_priority += 10

    priority = min(100, base_priority)

    query = f"""
    INSERT INTO {tables["gaps"]}
    (gap_id, model_name, template_id, gap_type, severity, description,
     evidence_type, evidence_summary, affected_queries_count, error_rate,
     suggested_action, suggested_bit_name, estimated_records_needed,
     status, priority, identified_at, identified_by)
    VALUES (
        '{gap_id}',
        {_sql_str(gap.model_name)},
        {_sql_str(gap.template_id)},
        '{gap.gap_type.value}',
        '{gap.severity.value}',
        '{_escape_sql(gap.description)}',
        {_sql_str(gap.evidence_type)},
        {_sql_str(gap.evidence_summary)},
        {gap.affected_queries_count},
        {gap.error_rate if gap.error_rate else 'NULL'},
        {_sql_str(gap.suggested_action)},
        {_sql_str(gap.suggested_bit_name)},
        {gap.estimated_records_needed},
        'identified',
        {priority},
        CURRENT_TIMESTAMP(),
        'gap_analysis_service'
    )
    """

    try:
        await execute_sql(query)
    except Exception as e:
        logger.warning(f"Failed to persist gap: {e}")

    return GapResponse(
        gap_id=gap_id,
        gap_type=gap.gap_type,
        severity=gap.severity,
        description=gap.description,
        evidence_summary=gap.evidence_summary,
        suggested_action=gap.suggested_action,
        suggested_bit_name=gap.suggested_bit_name,
        estimated_records_needed=gap.estimated_records_needed,
        status=GapStatus.IDENTIFIED,
        priority=priority,
        created_at=datetime.now(),
    )


async def list_gaps(
    model_name: str | None = None,
    severity: GapSeverity | None = None,
    status: GapStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[GapResponse], int]:
    """List gaps with optional filters."""
    tables = _get_tables()

    conditions = ["1=1"]
    if model_name:
        conditions.append(f"model_name = '{_escape_sql(model_name)}'")
    if severity:
        conditions.append(f"severity = '{severity.value}'")
    if status:
        conditions.append(f"status = '{status.value}'")
    else:
        conditions.append("status NOT IN ('resolved', 'wont_fix')")

    where_clause = " AND ".join(conditions)

    query = f"""
    SELECT * FROM {tables["gaps"]}
    WHERE {where_clause}
    ORDER BY priority DESC, identified_at DESC
    LIMIT {limit} OFFSET {offset}
    """

    count_query = f"""
    SELECT COUNT(*) as total FROM {tables["gaps"]}
    WHERE {where_clause}
    """

    try:
        rows = await execute_sql(query)
        count_rows = await execute_sql(count_query)

        total = count_rows[0].get("total", 0) if count_rows else 0

        gaps = [_row_to_gap_response(row) for row in rows]
        return gaps, total

    except Exception as e:
        logger.warning(f"Error listing gaps: {e}")
        return [], 0


async def get_gap(gap_id: str) -> GapResponse | None:
    """Get a specific gap by ID."""
    tables = _get_tables()

    query = f"""
    SELECT * FROM {tables["gaps"]}
    WHERE gap_id = '{_escape_sql(gap_id)}'
    """

    try:
        rows = await execute_sql(query)
        if rows:
            return _row_to_gap_response(rows[0])
    except Exception as e:
        logger.warning(f"Error getting gap: {e}")

    return None


# ============================================================================
# Annotation Task Management
# ============================================================================


async def create_annotation_task(
    task: AnnotationTaskCreate,
) -> AnnotationTaskResponse:
    """Create an annotation task to fill a gap."""
    tables = _get_tables()
    task_id = f"task_{uuid.uuid4().hex[:12]}"

    query = f"""
    INSERT INTO {tables["tasks"]}
    (task_id, task_type, title, description, instructions,
     source_gap_id, target_record_count, assigned_team,
     priority, status, created_at, created_by)
    VALUES (
        '{task_id}',
        'gap_fill',
        '{_escape_sql(task.title)}',
        {_sql_str(task.description)},
        {_sql_str(task.instructions)},
        {_sql_str(task.source_gap_id)},
        {task.target_record_count},
        {_sql_str(task.assigned_team)},
        '{task.priority}',
        'pending',
        CURRENT_TIMESTAMP(),
        'gap_analysis_service'
    )
    """

    try:
        await execute_sql(query)

        # Update gap status if linked
        if task.source_gap_id:
            update_query = f"""
            UPDATE {tables["gaps"]}
            SET status = 'task_created', resolution_task_id = '{task_id}'
            WHERE gap_id = '{_escape_sql(task.source_gap_id)}'
            """
            await execute_sql(update_query)

    except Exception as e:
        logger.warning(f"Failed to persist task: {e}")

    return AnnotationTaskResponse(
        task_id=task_id,
        task_type="gap_fill",
        title=task.title,
        description=task.description,
        instructions=task.instructions,
        source_gap_id=task.source_gap_id,
        target_record_count=task.target_record_count,
        records_completed=0,
        assigned_team=task.assigned_team,
        priority=task.priority,
        status=TaskStatus.PENDING,
        created_at=datetime.now(),
    )


async def update_gap_in_db(gap_id: str, update: GapUpdate) -> GapResponse:
    """Persist gap updates to the identified_gaps table."""
    tables = _get_tables()

    set_clauses = []
    if update.status:
        set_clauses.append(f"status = '{_escape_sql(update.status.value)}'")
    if update.severity:
        set_clauses.append(f"severity = '{_escape_sql(update.severity.value)}'")
    if update.suggested_action:
        set_clauses.append(
            f"suggested_action = '{_escape_sql(update.suggested_action)}'"
        )
    if update.resolution_notes:
        set_clauses.append(
            f"resolution_notes = '{_escape_sql(update.resolution_notes)}'"
        )

    if set_clauses:
        query = f"""
        UPDATE {tables["gaps"]}
        SET {', '.join(set_clauses)}
        WHERE gap_id = '{_escape_sql(gap_id)}'
        """
        try:
            await execute_sql(query)
        except Exception as e:
            logger.warning(f"Failed to persist gap update: {e}")

    # Return updated gap
    gap = await get_gap(gap_id)
    if not gap:
        raise ValueError(f"Gap {gap_id} not found after update")
    return gap


async def list_annotation_tasks(
    status: str | None = None,
    team: str | None = None,
    limit: int = 20,
) -> list[AnnotationTaskResponse]:
    """List annotation tasks from the database."""
    tables = _get_tables()

    where_clauses = []
    if status:
        where_clauses.append(f"status = '{_escape_sql(status)}'")
    if team:
        where_clauses.append(f"assigned_team = '{_escape_sql(team)}'")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
    SELECT * FROM {tables["tasks"]}
    {where_sql}
    ORDER BY created_at DESC
    LIMIT {limit}
    """

    try:
        rows = await execute_sql(query)
        return [_row_to_annotation_task(row) for row in rows]
    except Exception as e:
        logger.warning(f"Failed to list annotation tasks: {e}")
        return []


def _row_to_annotation_task(row: dict) -> AnnotationTaskResponse:
    """Convert a database row to AnnotationTaskResponse."""
    return AnnotationTaskResponse(
        task_id=row.get("task_id", ""),
        task_type=row.get("task_type", "gap_fill"),
        title=row.get("title", ""),
        description=row.get("description"),
        instructions=row.get("instructions"),
        source_gap_id=row.get("source_gap_id"),
        target_record_count=row.get("target_record_count", 0),
        records_completed=row.get("records_completed", 0),
        assigned_to=row.get("assigned_to"),
        assigned_team=row.get("assigned_team"),
        priority=row.get("priority", "medium"),
        status=TaskStatus(row.get("status", "pending")),
        due_date=row.get("due_date"),
        output_bit_id=row.get("output_bit_id"),
        created_at=row.get("created_at"),
        created_by=row.get("created_by"),
    )


# ============================================================================
# Full Gap Analysis Orchestrator
# ============================================================================


async def run_full_gap_analysis(
    model_name: str,
    model_version: str,
    template_id: str | None = None,
    analysis_types: list[str] | None = None,
    auto_create_tasks: bool = False,
) -> GapAnalysisResponse:
    """
    Run comprehensive gap analysis on a model and its training data.

    Args:
        model_name: Model to analyze
        model_version: Version of the model
        template_id: Template used for training
        analysis_types: Types of analysis to run
        auto_create_tasks: Auto-create tasks for critical gaps

    Returns:
        Complete gap analysis results
    """
    analysis_types = analysis_types or ["errors", "coverage", "quality", "emerging"]
    all_gaps: list[GapResponse] = []
    error_clusters: list[ErrorCluster] = []
    coverage_gaps: list[CoverageGap] = []
    quality_gaps: list[QualityGap] = []
    emerging_topics: list[EmergingTopic] = []
    recommendations: list[str] = []

    # Run requested analyses
    if "errors" in analysis_types:
        result = await analyze_model_errors(model_name, model_version)
        error_clusters = [ErrorCluster(**c) for c in result.get("error_clusters", [])]
        recommendations.extend(result.get("recommendations", []))

        # Convert error clusters to gaps
        for cluster in error_clusters:
            gap = await create_gap_record(
                GapCreate(
                    gap_type=cluster.suggested_gap_type,
                    severity=cluster.severity,
                    description=f"{cluster.topic}: {cluster.error_rate*100:.0f}% error rate",
                    model_name=model_name,
                    evidence_type="error_clustering",
                    evidence_summary=f"{cluster.error_count} errors clustered",
                    affected_queries_count=cluster.error_count,
                    error_rate=cluster.error_rate,
                    suggested_action=cluster.suggested_action,
                    estimated_records_needed=cluster.estimated_records_needed,
                )
            )
            all_gaps.append(gap)

    if "coverage" in analysis_types and template_id:
        result = await analyze_coverage_distribution(template_id)
        coverage_gaps = [CoverageGap(**g) for g in result.get("coverage_gaps", [])]

        for cg in coverage_gaps:
            gap = await create_gap_record(
                GapCreate(
                    gap_type=GapType.DISTRIBUTION,
                    severity=cg.severity,
                    description=f"{cg.category}: {cg.actual_coverage}% vs {cg.expected_coverage}% expected",
                    template_id=template_id,
                    suggested_action=cg.suggested_action,
                    estimated_records_needed=cg.estimated_records_needed,
                )
            )
            all_gaps.append(gap)

    if "quality" in analysis_types and template_id:
        result = await analyze_quality_by_segment(template_id)
        quality_gaps = [QualityGap(**g) for g in result.get("quality_gaps", [])]

        for qg in quality_gaps:
            gap = await create_gap_record(
                GapCreate(
                    gap_type=GapType.QUALITY,
                    severity=qg.severity,
                    description=f"{qg.segment}: quality score {qg.quality_score}",
                    template_id=template_id,
                    suggested_action=qg.suggested_action,
                )
            )
            all_gaps.append(gap)

    if "emerging" in analysis_types:
        result = await detect_emerging_topics(model_name)
        emerging_topics = [EmergingTopic(**t) for t in result.get("emerging_topics", [])]

        for et in emerging_topics:
            gap = await create_gap_record(
                GapCreate(
                    gap_type=GapType.COVERAGE,
                    severity=et.priority,
                    description=f"Emerging topic: {et.topic} ({et.query_count} queries)",
                    model_name=model_name,
                    suggested_action=f"Create training data for {et.topic}",
                    estimated_records_needed=et.suggested_records,
                )
            )
            all_gaps.append(gap)

    # Auto-create tasks for critical/high severity gaps
    tasks_created: list[str] = []
    if auto_create_tasks:
        for gap in all_gaps:
            if gap.severity in [GapSeverity.CRITICAL, GapSeverity.HIGH]:
                task = await create_annotation_task(
                    AnnotationTaskCreate(
                        title=f"Fill gap: {gap.description[:50]}",
                        description=gap.description,
                        source_gap_id=gap.gap_id,
                        target_record_count=gap.estimated_records_needed or 100,
                        priority=gap.severity.value,
                    )
                )
                tasks_created.append(task.task_id)

    critical_count = sum(1 for g in all_gaps if g.severity == GapSeverity.CRITICAL)

    return GapAnalysisResponse(
        status="completed",
        model_name=model_name,
        model_version=model_version,
        analysis_timestamp=datetime.now(),
        gaps_found=len(all_gaps),
        critical_gaps=critical_count,
        gaps=all_gaps,
        error_clusters=error_clusters,
        coverage_gaps=coverage_gaps,
        quality_gaps=quality_gaps,
        emerging_topics=emerging_topics,
        tasks_created=tasks_created,
        recommendations=recommendations,
    )


# ============================================================================
# Helper Functions
# ============================================================================


def _severity_from_error_rate(error_rate: float) -> GapSeverity:
    """Determine severity based on error rate."""
    if error_rate >= 0.4:
        return GapSeverity.CRITICAL
    elif error_rate >= 0.25:
        return GapSeverity.HIGH
    elif error_rate >= 0.15:
        return GapSeverity.MEDIUM
    return GapSeverity.LOW


def _infer_quality_issues(quality: float, flagged_count: int) -> list[str]:
    """Infer quality issues from metrics."""
    issues = []
    if quality < 0.6:
        issues.append("Very low quality scores")
    elif quality < 0.75:
        issues.append("Below average quality")
    if flagged_count > 0:
        issues.append(f"{flagged_count} flagged items")
    return issues or ["Quality below threshold"]


def _generate_error_recommendations(clusters: list[ErrorCluster]) -> list[str]:
    """Generate recommendations from error clusters."""
    recommendations = []
    for i, cluster in enumerate(clusters[:3], 1):
        rec = f"Priority {i}: {cluster.suggested_action} ({cluster.error_count} errors)"
        recommendations.append(rec)
    return recommendations


def _sql_str(value: str | None) -> str:
    """Convert Python string to SQL string literal or NULL."""
    if value is None:
        return "NULL"
    return f"'{_escape_sql(value)}'"


def _escape_sql(value: str) -> str:
    """Escape single quotes for SQL."""
    return value.replace("'", "''")


def _row_to_gap_response(row: dict) -> GapResponse:
    """Convert a database row to GapResponse."""
    return GapResponse(
        gap_id=row.get("gap_id", ""),
        gap_type=GapType(row.get("gap_type", "coverage")),
        severity=GapSeverity(row.get("severity", "medium")),
        description=row.get("description", ""),
        evidence_summary=row.get("evidence_summary"),
        suggested_action=row.get("suggested_action"),
        suggested_bit_name=row.get("suggested_bit_name"),
        estimated_records_needed=row.get("estimated_records_needed", 0),
        status=GapStatus(row.get("status", "identified")),
        priority=row.get("priority", 50),
        created_at=row.get("identified_at"),
    )


# ============================================================================
# Simulated Data (fallback when tables don't exist yet)
# ============================================================================


def _simulate_error_analysis(model_name: str, model_version: str) -> dict:
    """Return simulated error analysis when real data is unavailable."""
    logger.warning(
        "SIMULATED DATA: analyze_model_errors using hardcoded demo data. "
        "Create feedback_items + endpoints_registry tables for real results."
    )
    return {
        "model_name": model_name,
        "model_version": model_version,
        "total_errors": 1250,
        "error_clusters": [
            {
                "cluster_id": "cluster_001",
                "topic": "GDPR compliance questions",
                "error_count": 245,
                "error_rate": 0.42,
                "sample_queries": [
                    "What are my rights under GDPR?",
                    "How do I request data deletion?",
                ],
                "common_failure_mode": "Missing specific article references",
                "suggested_gap_type": "coverage",
                "severity": "high",
                "suggested_action": "Create GDPR-specific Q&A training data",
                "estimated_records_needed": 200,
            },
            {
                "cluster_id": "cluster_002",
                "topic": "Multi-step troubleshooting",
                "error_count": 189,
                "error_rate": 0.35,
                "sample_queries": ["My cluster won't start", "Pipeline fails intermittently"],
                "common_failure_mode": "Single-step answers instead of workflows",
                "suggested_gap_type": "capability",
                "severity": "high",
                "suggested_action": "Add diagnostic workflow training data",
                "estimated_records_needed": 150,
            },
        ],
        "recommendations": [
            "Priority 1: Address GDPR coverage - highest error rate",
            "Priority 2: Add troubleshooting workflows",
        ],
    }


def _simulate_coverage_analysis(template_id: str) -> dict:
    """Return simulated coverage analysis when real data is unavailable."""
    logger.warning(
        "SIMULATED DATA: analyze_coverage_distribution using hardcoded demo data. "
        "Create qa_pairs + training_sheets tables for real results."
    )
    return {
        "template_id": template_id,
        "actual_distribution": {
            "setup_onboarding": "25.0%",
            "pricing_billing": "8.0%",
            "integration_apis": "30.0%",
            "governance_security": "15.0%",
            "troubleshooting": "12.0%",
            "best_practices": "10.0%",
        },
        "expected_distribution": {
            "setup_onboarding": "15.0%",
            "pricing_billing": "15.0%",
            "integration_apis": "20.0%",
            "governance_security": "15.0%",
            "troubleshooting": "20.0%",
            "best_practices": "15.0%",
        },
        "coverage_gaps": [
            {
                "category": "pricing_billing",
                "actual_coverage": 8.0,
                "expected_coverage": 15.0,
                "gap_percentage": 7.0,
                "severity": "high",
                "estimated_records_needed": 70,
                "suggested_action": "Add more pricing billing examples",
            },
            {
                "category": "troubleshooting",
                "actual_coverage": 12.0,
                "expected_coverage": 20.0,
                "gap_percentage": 8.0,
                "severity": "high",
                "estimated_records_needed": 80,
                "suggested_action": "Add more troubleshooting examples",
            },
        ],
        "overall_balance_score": 0.72,
        "total_gap_records_needed": 150,
    }


def _simulate_quality_analysis(template_id: str) -> dict:
    """Return simulated quality analysis when real data is unavailable."""
    logger.warning(
        "SIMULATED DATA: analyze_quality_by_segment using hardcoded demo data. "
        "Create qa_pairs + training_sheets tables for real results."
    )
    return {
        "template_id": template_id,
        "segment_by": "category",
        "quality_gaps": [
            {
                "segment": "edge_cases",
                "record_count": 180,
                "quality_score": 0.65,
                "issues": ["many unlabeled", "ambiguous categories"],
                "severity": "high",
                "suggested_action": "Review and curate edge_cases segment",
                "estimated_effort_hours": 3.6,
            },
            {
                "segment": "technical_deep_dive",
                "record_count": 420,
                "quality_score": 0.78,
                "issues": ["some outdated examples"],
                "severity": "medium",
                "suggested_action": "Review and curate technical_deep_dive segment",
                "estimated_effort_hours": 8.4,
            },
        ],
        "total_records_needing_review": 600,
        "total_estimated_effort_hours": 12.0,
    }


def _simulate_emerging_topics(model_name: str) -> dict:
    """Return simulated emerging topics when real data is unavailable."""
    logger.warning(
        "SIMULATED DATA: detect_emerging_topics using hardcoded demo data. "
        "Create feedback_items + endpoints_registry tables for real results."
    )
    return {
        "model_name": model_name,
        "analysis_period_days": 30,
        "emerging_topics": [
            {
                "topic": "Serverless GPU compute",
                "query_count": 342,
                "trend": "new",
                "week_over_week_growth": None,
                "sample_queries": ["How do I use serverless GPU?"],
                "current_coverage": "none",
                "suggested_records": 150,
                "priority": "high",
            },
            {
                "topic": "MCP server integration",
                "query_count": 189,
                "trend": "new",
                "week_over_week_growth": None,
                "sample_queries": ["How do I connect MCP servers?"],
                "current_coverage": "minimal",
                "suggested_records": 100,
                "priority": "high",
            },
        ],
        "total_suggested_records": 250,
    }
