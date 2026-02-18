"""Feedback API endpoints for IMPROVE stage.

Captures user feedback on model predictions to drive continuous improvement.
Supports conversion of feedback into training data for retraining workflows.
"""

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.core.databricks import get_current_user
from app.models.feedback import (
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackRating,
    FeedbackResponse,
    FeedbackStats,
)
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger(__name__)

# Get services
_sql = get_sql_service()
_settings = get_settings()

# Table names
FEEDBACK_TABLE = _settings.get_table("feedback_items")
ENDPOINTS_TABLE = _settings.get_table("endpoints_registry")
ASSEMBLIES_TABLE = _settings.get_table("assemblies")
ASSEMBLY_ROWS_TABLE = _settings.get_table("assembly_rows")


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(feedback: FeedbackCreate) -> FeedbackResponse:
    """
    Submit user feedback on an endpoint response.

    Captures user ratings (1-5 or thumbs up/down) along with optional
    text feedback and labels. Used to identify improvement opportunities
    and flag problematic predictions.

    Args:
        feedback: Feedback data including input, output, rating, and comments

    Returns:
        Created feedback record with ID
    """
    user = get_current_user()
    feedback_id = str(uuid.uuid4())

    try:
        # Verify endpoint exists
        endpoint_sql = f"""
        SELECT id FROM {ENDPOINTS_TABLE}
        WHERE id = '{feedback.endpoint_id}'
        """
        endpoint_result = _sql.execute(endpoint_sql)
        if not endpoint_result:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        # Escape strings for SQL
        def escape_sql(s: str | None) -> str:
            if s is None:
                return "NULL"
            return f"'{s.replace(chr(39), chr(39) + chr(39))}'"

        # Convert rating to integer (1-5 scale)
        # positive = 5, negative = 1 for simple thumbs up/down
        rating_value = 5 if feedback.rating == FeedbackRating.positive else 1

        # Insert feedback
        insert_sql = f"""
        INSERT INTO {FEEDBACK_TABLE} (
            id, endpoint_id, input_data, output_data, rating,
            feedback_text, flagged, user_id, session_id, request_id
        ) VALUES (
            '{feedback_id}',
            '{feedback.endpoint_id}',
            '{feedback.input_text.replace(chr(39), chr(39) + chr(39))}',
            '{feedback.output_text.replace(chr(39), chr(39) + chr(39))}',
            {rating_value},
            {escape_sql(feedback.feedback_text)},
            {str(feedback.rating == FeedbackRating.negative).upper()},
            '{user}',
            {escape_sql(feedback.session_id)},
            {escape_sql(feedback.request_id)}
        )
        """
        _sql.execute_update(insert_sql)

        logger.info(f"Created feedback {feedback_id} for endpoint {feedback.endpoint_id}")

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
            created_at=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create feedback: {e}")


@router.get("", response_model=FeedbackListResponse)
async def list_feedback(
    endpoint_id: str | None = Query(None, description="Filter by endpoint"),
    rating: FeedbackRating | None = Query(None, description="Filter by rating"),
    flagged_only: bool = Query(False, description="Show only flagged items"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> FeedbackListResponse:
    """
    List feedback with optional filters.

    Supports filtering by endpoint, rating, and flagged status.
    Returns paginated results sorted by creation time (newest first).

    Args:
        endpoint_id: Filter by specific endpoint
        rating: Filter by positive/negative rating
        flagged_only: Show only flagged feedback items
        page: Page number (1-indexed)
        page_size: Items per page (max 100)

    Returns:
        Paginated list of feedback items
    """
    try:
        conditions = []
        if endpoint_id:
            conditions.append(f"endpoint_id = '{endpoint_id}'")
        if rating:
            rating_value = 5 if rating == FeedbackRating.positive else 1
            conditions.append(f"CAST(rating AS INT) >= 3" if rating == FeedbackRating.positive else "CAST(rating AS INT) < 3")
        if flagged_only:
            conditions.append("flagged = TRUE")

        where_clause = " AND ".join(conditions) if conditions else "1=1"
        offset = (page - 1) * page_size

        # Get total count
        count_sql = f"SELECT COUNT(*) as cnt FROM {FEEDBACK_TABLE} WHERE {where_clause}"
        count_result = _sql.execute(count_sql)
        total = count_result[0]["cnt"] if count_result else 0

        # Get items
        query_sql = f"""
        SELECT * FROM {FEEDBACK_TABLE}
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        """
        rows = _sql.execute(query_sql)

        items = []
        for row in rows:
            # Convert rating (1-5) to positive/negative
            rating_val = int(row.get("rating", 1))
            rating_enum = FeedbackRating.positive if rating_val >= 3 else FeedbackRating.negative

            items.append(
                FeedbackResponse(
                    id=row["id"],
                    endpoint_id=row["endpoint_id"],
                    input_text=row.get("input_data", ""),
                    output_text=row.get("output_data", ""),
                    rating=rating_enum,
                    feedback_text=row.get("feedback_text"),
                    session_id=row.get("session_id"),
                    request_id=row.get("request_id"),
                    created_by=row.get("user_id"),
                    created_at=row["created_at"],
                )
            )

        return FeedbackListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f"Failed to list feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list feedback: {e}")


@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    endpoint_id: str | None = Query(None, description="Filter by endpoint"),
    days: int = Query(30, ge=1, le=365, description="Period in days"),
) -> FeedbackStats:
    """
    Get feedback statistics for an endpoint or all endpoints.

    Calculates aggregated metrics over a time period:
    - Total feedback count
    - Positive vs negative counts
    - Positive rate percentage
    - Feedback with comments

    Args:
        endpoint_id: Filter by specific endpoint (None = all endpoints)
        days: Time period in days (default: 30)

    Returns:
        Aggregated feedback statistics
    """
    try:
        conditions = [f"created_at >= current_date() - INTERVAL {days} DAY"]
        if endpoint_id:
            conditions.append(f"endpoint_id = '{endpoint_id}'")

        where_clause = " AND ".join(conditions)

        stats_sql = f"""
        SELECT
            COUNT(*) as total_count,
            SUM(CASE WHEN CAST(rating AS INT) >= 3 THEN 1 ELSE 0 END) as positive_count,
            SUM(CASE WHEN CAST(rating AS INT) < 3 THEN 1 ELSE 0 END) as negative_count,
            SUM(CASE WHEN feedback_text IS NOT NULL THEN 1 ELSE 0 END) as with_comments_count
        FROM {FEEDBACK_TABLE}
        WHERE {where_clause}
        """
        result = _sql.execute(stats_sql)

        if not result:
            return FeedbackStats(endpoint_id=endpoint_id, period_days=days)

        row = result[0]
        total = int(row["total_count"] or 0)
        positive = int(row["positive_count"] or 0)

        return FeedbackStats(
            endpoint_id=endpoint_id,
            total_count=total,
            positive_count=positive,
            negative_count=row["negative_count"] or 0,
            positive_rate=positive / total if total > 0 else 0.0,
            with_comments_count=row["with_comments_count"] or 0,
            period_days=days,
        )

    except Exception as e:
        logger.error(f"Failed to get feedback stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get feedback stats: {e}")


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(feedback_id: str) -> FeedbackResponse:
    """
    Get a single feedback item by ID.

    Args:
        feedback_id: Feedback item ID

    Returns:
        Feedback details
    """
    try:
        query_sql = f"""
        SELECT * FROM {FEEDBACK_TABLE}
        WHERE id = '{feedback_id}'
        """
        rows = _sql.execute(query_sql)

        if not rows:
            raise HTTPException(status_code=404, detail="Feedback not found")

        row = rows[0]
        rating_val = int(row.get("rating", 1))
        rating_enum = FeedbackRating.positive if rating_val >= 3 else FeedbackRating.negative

        return FeedbackResponse(
            id=row["id"],
            endpoint_id=row["endpoint_id"],
            input_text=row.get("input_data", ""),
            output_text=row.get("output_data", ""),
            rating=rating_enum,
            feedback_text=row.get("feedback_text"),
            session_id=row.get("session_id"),
            request_id=row.get("request_id"),
            created_by=row.get("user_id"),
            created_at=row["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {e}")


@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback(feedback_id: str) -> None:
    """
    Delete a feedback item.

    Args:
        feedback_id: Feedback item ID to delete
    """
    try:
        # Verify exists
        await get_feedback(feedback_id)

        # Delete
        delete_sql = f"""
        DELETE FROM {FEEDBACK_TABLE}
        WHERE id = '{feedback_id}'
        """
        _sql.execute_update(delete_sql)

        logger.info(f"Deleted feedback {feedback_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete feedback: {e}")


@router.post("/{feedback_id}/flag")
async def flag_feedback(feedback_id: str) -> FeedbackResponse:
    """
    Flag a feedback item for review.

    Marks the feedback as requiring attention from the team.

    Args:
        feedback_id: Feedback item ID

    Returns:
        Updated feedback item
    """
    try:
        # Verify exists
        await get_feedback(feedback_id)

        # Update flag
        update_sql = f"""
        UPDATE {FEEDBACK_TABLE}
        SET flagged = TRUE
        WHERE id = '{feedback_id}'
        """
        _sql.execute_update(update_sql)

        logger.info(f"Flagged feedback {feedback_id}")
        return await get_feedback(feedback_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to flag feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to flag feedback: {e}")


@router.delete("/{feedback_id}/flag")
async def unflag_feedback(feedback_id: str) -> FeedbackResponse:
    """
    Remove flag from a feedback item.

    Args:
        feedback_id: Feedback item ID

    Returns:
        Updated feedback item
    """
    try:
        # Verify exists
        await get_feedback(feedback_id)

        # Remove flag
        update_sql = f"""
        UPDATE {FEEDBACK_TABLE}
        SET flagged = FALSE
        WHERE id = '{feedback_id}'
        """
        _sql.execute_update(update_sql)

        logger.info(f"Unflagged feedback {feedback_id}")
        return await get_feedback(feedback_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unflag feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unflag feedback: {e}")


@router.post("/{feedback_id}/to-training")
async def convert_to_training_data(
    feedback_id: str,
    assembly_id: str = Query(..., description="Training Sheet (assembly) to add to"),
) -> dict:
    """
    Convert feedback into training data for retraining.

    Takes a feedback item and creates a new assembly row in the specified
    Training Sheet. This enables continuous improvement by converting
    real-world feedback directly into training examples.

    Args:
        feedback_id: Feedback item ID
        assembly_id: Target Training Sheet (assembly) ID

    Returns:
        Created training row details
    """
    user = get_current_user()
    row_id = str(uuid.uuid4())

    try:
        # Get the feedback
        feedback = await get_feedback(feedback_id)

        # Verify assembly exists
        assembly_sql = f"""
        SELECT id, total_rows FROM {ASSEMBLIES_TABLE}
        WHERE id = '{assembly_id}'
        """
        assembly_result = _sql.execute(assembly_sql)
        if not assembly_result:
            raise HTTPException(status_code=404, detail="Training Sheet not found")

        assembly = assembly_result[0]
        next_row_index = assembly["total_rows"]

        # Create assembly row from feedback
        # Use feedback input as prompt, output as human-verified response
        insert_sql = f"""
        INSERT INTO {ASSEMBLY_ROWS_TABLE} (
            id, assembly_id, row_index, prompt, response,
            response_source, labeled_by, labeled_at,
            source_data
        ) VALUES (
            '{row_id}',
            '{assembly_id}',
            {next_row_index},
            '{feedback.input_text.replace(chr(39), chr(39) + chr(39))}',
            '{feedback.output_text.replace(chr(39), chr(39) + chr(39))}',
            'human_verified',
            '{user}',
            current_timestamp(),
            '{json.dumps({"source": "feedback", "feedback_id": feedback_id})}'
        )
        """
        _sql.execute_update(insert_sql)

        # Update assembly stats
        stats_sql = f"""
        UPDATE {ASSEMBLIES_TABLE}
        SET total_rows = total_rows + 1,
            human_verified_count = human_verified_count + 1,
            updated_at = current_timestamp()
        WHERE id = '{assembly_id}'
        """
        _sql.execute_update(stats_sql)

        logger.info(f"Converted feedback {feedback_id} to training data in assembly {assembly_id}")

        return {
            "status": "created",
            "assembly_row_id": row_id,
            "assembly_id": assembly_id,
            "row_index": next_row_index,
            "feedback_id": feedback_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to convert feedback to training data: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to convert feedback to training data: {e}"
        )


@router.get("/endpoint/{endpoint_id}/recent")
async def get_recent_feedback(
    endpoint_id: str,
    limit: int = Query(10, ge=1, le=100, description="Number of recent items"),
) -> list[FeedbackResponse]:
    """
    Get recent feedback for an endpoint.

    Useful for dashboards and real-time monitoring.

    Args:
        endpoint_id: Endpoint ID
        limit: Number of recent items to return

    Returns:
        List of recent feedback items
    """
    try:
        query_sql = f"""
        SELECT * FROM {FEEDBACK_TABLE}
        WHERE endpoint_id = '{endpoint_id}'
        ORDER BY created_at DESC
        LIMIT {limit}
        """
        rows = _sql.execute(query_sql)

        items = []
        for row in rows:
            rating_val = int(row.get("rating", 1))
            rating_enum = FeedbackRating.positive if rating_val >= 3 else FeedbackRating.negative

            items.append(
                FeedbackResponse(
                    id=row["id"],
                    endpoint_id=row["endpoint_id"],
                    input_text=row.get("input_data", ""),
                    output_text=row.get("output_data", ""),
                    rating=rating_enum,
                    feedback_text=row.get("feedback_text"),
                    session_id=row.get("session_id"),
                    request_id=row.get("request_id"),
                    created_by=row.get("user_id"),
                    created_at=row["created_at"],
                )
            )

        return items

    except Exception as e:
        logger.error(f"Failed to get recent feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent feedback: {e}")
