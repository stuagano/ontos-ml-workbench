"""Feedback API endpoints for IMPROVE stage."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Query

from app.core.databricks import get_current_user
from app.models.feedback import (
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackRating,
    FeedbackResponse,
    FeedbackStats,
)
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse)
async def create_feedback(feedback: FeedbackCreate) -> FeedbackResponse:
    """Submit user feedback on an endpoint response."""
    sql = get_sql_service()
    user = get_current_user()
    feedback_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Insert into feedback_items table
    insert_sql = f"""
    INSERT INTO feedback_items (
        id, endpoint_id, input_text, output_text, rating,
        feedback_text, session_id, request_id, created_by, created_at
    ) VALUES (
        '{feedback_id}',
        '{feedback.endpoint_id}',
        '{feedback.input_text.replace("'", "''")}',
        '{feedback.output_text.replace("'", "''")}',
        '{feedback.rating.value}',
        {f"'{feedback.feedback_text.replace(chr(39), chr(39) + chr(39))}'" if feedback.feedback_text else "NULL"},
        {f"'{feedback.session_id}'" if feedback.session_id else "NULL"},
        {f"'{feedback.request_id}'" if feedback.request_id else "NULL"},
        '{user}',
        '{now.isoformat()}'
    )
    """
    sql.execute_update(insert_sql)

    return FeedbackResponse(
        id=feedback_id,
        endpoint_id=feedback.endpoint_id,
        input_text=feedback.input_text,
        output_text=feedback.output_text,
        rating=feedback.rating,
        feedback_text=feedback.feedback_text,
        session_id=feedback.session_id,
        request_id=feedback.request_id,
        created_by=user,
        created_at=now,
    )


@router.get("", response_model=FeedbackListResponse)
async def list_feedback(
    endpoint_id: str | None = Query(None, description="Filter by endpoint"),
    rating: FeedbackRating | None = Query(None, description="Filter by rating"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> FeedbackListResponse:
    """List feedback with optional filters."""
    sql = get_sql_service()

    conditions = []
    if endpoint_id:
        conditions.append(f"endpoint_id = '{endpoint_id}'")
    if rating:
        conditions.append(f"rating = '{rating.value}'")

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    offset = (page - 1) * page_size

    # Get total count
    count_sql = f"SELECT COUNT(*) as cnt FROM feedback_items WHERE {where_clause}"
    count_result = sql.execute(count_sql)
    total = count_result[0]["cnt"] if count_result else 0

    # Get items
    query_sql = f"""
    SELECT * FROM feedback_items
    WHERE {where_clause}
    ORDER BY created_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql.execute(query_sql)

    items = [
        FeedbackResponse(
            id=row["id"],
            endpoint_id=row["endpoint_id"],
            input_text=row["input_text"],
            output_text=row["output_text"],
            rating=FeedbackRating(row["rating"]),
            feedback_text=row.get("feedback_text"),
            session_id=row.get("session_id"),
            request_id=row.get("request_id"),
            created_by=row.get("created_by"),
            created_at=row["created_at"],
        )
        for row in rows
    ]

    return FeedbackListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    endpoint_id: str | None = Query(None, description="Filter by endpoint"),
    days: int = Query(30, ge=1, le=365, description="Period in days"),
) -> FeedbackStats:
    """Get feedback statistics."""
    sql = get_sql_service()

    conditions = [f"created_at >= current_date() - INTERVAL {days} DAY"]
    if endpoint_id:
        conditions.append(f"endpoint_id = '{endpoint_id}'")

    where_clause = " AND ".join(conditions)

    stats_sql = f"""
    SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN feedback_text IS NOT NULL THEN 1 ELSE 0 END) as with_comments_count
    FROM feedback_items
    WHERE {where_clause}
    """
    result = sql.execute(stats_sql)

    if not result:
        return FeedbackStats(endpoint_id=endpoint_id, period_days=days)

    row = result[0]
    total = row["total_count"] or 0
    positive = row["positive_count"] or 0

    return FeedbackStats(
        endpoint_id=endpoint_id,
        total_count=total,
        positive_count=positive,
        negative_count=row["negative_count"] or 0,
        positive_rate=positive / total if total > 0 else 0.0,
        with_comments_count=row["with_comments_count"] or 0,
        period_days=days,
    )


@router.post("/{feedback_id}/to-curation")
async def convert_to_curation(
    feedback_id: str,
    template_id: str = Query(..., description="Template to add the item to"),
) -> dict:
    """Convert negative feedback into a curation item for retraining."""
    sql = get_sql_service()
    user = get_current_user()

    # Get the feedback
    feedback_sql = f"SELECT * FROM feedback_items WHERE id = '{feedback_id}'"
    rows = sql.execute(feedback_sql)

    if not rows:
        return {"error": "Feedback not found"}

    feedback = rows[0]
    item_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Create curation item from feedback
    input_escaped = feedback["input_text"].replace('"', '\\"')
    output_escaped = feedback["output_text"].replace('"', '\\"')
    notes_escaped = (feedback.get("feedback_text") or "No comment").replace("'", "''")
    insert_sql = f"""
    INSERT INTO curation_items (
        id, template_id, item_ref, item_data, status,
        review_notes, created_at, created_by
    ) VALUES (
        '{item_id}',
        '{template_id}',
        'feedback:{feedback_id}',
        '{{"input": "{input_escaped}", "output": "{output_escaped}"}}',
        'needs_review',
        'Created from negative feedback: {notes_escaped}',
        '{now}',
        '{user}'
    )
    """
    sql.execute_update(insert_sql)

    return {
        "status": "created",
        "curation_item_id": item_id,
        "template_id": template_id,
    }
