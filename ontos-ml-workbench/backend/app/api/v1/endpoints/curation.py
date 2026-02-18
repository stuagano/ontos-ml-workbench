"""Curation Items API endpoints."""

import json
import uuid

from fastapi import APIRouter, HTTPException, Query

from app.core.databricks import get_current_user
from app.models.curation import (
    CurationItemBulkUpdate,
    CurationItemCreate,
    CurationItemListResponse,
    CurationItemResponse,
    CurationItemUpdate,
    CurationStatsResponse,
    CurationStatus,
)
from app.services.job_service import get_job_service
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/curation", tags=["curation"])


def _row_to_item(row: dict) -> CurationItemResponse:
    """Convert a database row to CurationItemResponse."""
    return CurationItemResponse(
        id=row["id"],
        template_id=row["template_id"],
        item_ref=row["item_ref"],
        item_data=json.loads(row["item_data"]) if row.get("item_data") else None,
        agent_label=json.loads(row["agent_label"]) if row.get("agent_label") else None,
        agent_confidence=float(row["agent_confidence"])
        if row.get("agent_confidence")
        else None,
        agent_model=row.get("agent_model"),
        agent_reasoning=row.get("agent_reasoning"),
        human_label=json.loads(row["human_label"]) if row.get("human_label") else None,
        status=CurationStatus(row.get("status", "pending")),
        quality_score=float(row["quality_score"]) if row.get("quality_score") else None,
        reviewed_by=row.get("reviewed_by"),
        reviewed_at=row.get("reviewed_at"),
        review_notes=row.get("review_notes"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/templates/{template_id}/items", response_model=CurationItemListResponse)
async def list_items(
    template_id: str,
    status: CurationStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """List curation items for a template with pagination."""
    sql_service = get_sql_service()

    conditions = [f"template_id = '{template_id}'"]
    if status:
        conditions.append(f"status = '{status.value}'")

    where_clause = " AND ".join(conditions)
    offset = (page - 1) * page_size

    # Get total count
    count_sql = f"SELECT COUNT(*) as total FROM curation_items WHERE {where_clause}"
    count_rows = sql_service.execute(count_sql)
    total = int(count_rows[0]["total"]) if count_rows else 0

    # Get paginated items
    sql = f"""
    SELECT * FROM curation_items
    WHERE {where_clause}
    ORDER BY created_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql_service.execute(sql)

    return CurationItemListResponse(
        items=[_row_to_item(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/templates/{template_id}/stats", response_model=CurationStatsResponse)
async def get_stats(template_id: str):
    """Get curation statistics for a template."""
    sql_service = get_sql_service()

    sql = f"""
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved,
        SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) as needs_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged,
        AVG(agent_confidence) as avg_confidence,
        AVG(quality_score) as avg_quality_score
    FROM curation_items
    WHERE template_id = '{template_id}'
    """
    rows = sql_service.execute(sql)

    if not rows:
        return CurationStatsResponse(
            template_id=template_id,
            total=0,
            pending=0,
            auto_approved=0,
            needs_review=0,
            approved=0,
            rejected=0,
            flagged=0,
        )

    row = rows[0]
    return CurationStatsResponse(
        template_id=template_id,
        total=int(row.get("total") or 0),
        pending=int(row.get("pending") or 0),
        auto_approved=int(row.get("auto_approved") or 0),
        needs_review=int(row.get("needs_review") or 0),
        approved=int(row.get("approved") or 0),
        rejected=int(row.get("rejected") or 0),
        flagged=int(row.get("flagged") or 0),
        avg_confidence=float(row["avg_confidence"])
        if row.get("avg_confidence")
        else None,
        avg_quality_score=float(row["avg_quality_score"])
        if row.get("avg_quality_score")
        else None,
    )


@router.post(
    "/templates/{template_id}/items",
    response_model=list[CurationItemResponse],
    status_code=201,
)
async def create_items(template_id: str, items: list[CurationItemCreate]):
    """Bulk create curation items."""
    sql_service = get_sql_service()
    created_ids = []

    for item in items:
        item_id = str(uuid.uuid4())
        item_data_json = json.dumps(item.item_data).replace("'", "''")

        sql = f"""
        INSERT INTO curation_items (
            id, template_id, item_ref, item_data, status, created_at, updated_at
        ) VALUES (
            '{item_id}', '{template_id}', '{item.item_ref}',
            '{item_data_json}', 'pending',
            current_timestamp(), current_timestamp()
        )
        """
        sql_service.execute_update(sql)
        created_ids.append(item_id)

    # Fetch created items
    ids_str = "', '".join(created_ids)
    sql = f"SELECT * FROM curation_items WHERE id IN ('{ids_str}')"
    rows = sql_service.execute(sql)

    return [_row_to_item(row) for row in rows]


@router.get("/items/{item_id}", response_model=CurationItemResponse)
async def get_item(item_id: str):
    """Get a curation item by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM curation_items WHERE id = '{item_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Curation item not found")

    return _row_to_item(rows[0])


@router.put("/items/{item_id}", response_model=CurationItemResponse)
async def update_item(item_id: str, update: CurationItemUpdate):
    """Update a curation item (human review)."""
    sql_service = get_sql_service()
    user = get_current_user()

    updates = []
    if update.status is not None:
        updates.append(f"status = '{update.status.value}'")
    if update.human_label is not None:
        label_json = json.dumps(update.human_label).replace("'", "''")
        updates.append(f"human_label = '{label_json}'")
    if update.quality_score is not None:
        updates.append(f"quality_score = {update.quality_score}")
    if update.review_notes is not None:
        updates.append(
            f"review_notes = '{update.review_notes.replace(chr(39), chr(39) + chr(39))}'"
        )

    if updates:
        updates.append(f"reviewed_by = '{user}'")
        updates.append("reviewed_at = current_timestamp()")
        updates.append("updated_at = current_timestamp()")

        sql = f"UPDATE curation_items SET {', '.join(updates)} WHERE id = '{item_id}'"
        sql_service.execute_update(sql)

    return await get_item(item_id)


@router.post("/items/bulk", response_model=dict)
async def bulk_update_items(update: CurationItemBulkUpdate):
    """Bulk update curation items."""
    sql_service = get_sql_service()
    user = get_current_user()

    ids_str = "', '".join(update.item_ids)

    updates = [
        f"status = '{update.status.value}'",
        f"reviewed_by = '{user}'",
        "reviewed_at = current_timestamp()",
        "updated_at = current_timestamp()",
    ]
    if update.review_notes:
        updates.append(
            f"review_notes = '{update.review_notes.replace(chr(39), chr(39) + chr(39))}'"
        )

    sql = f"UPDATE curation_items SET {', '.join(updates)} WHERE id IN ('{ids_str}')"
    affected = sql_service.execute_update(sql)

    return {"updated": affected, "status": update.status.value}


@router.post("/templates/{template_id}/label", response_model=dict)
async def trigger_labeling(
    template_id: str,
    confidence_threshold: float = Query(default=0.85, ge=0, le=1),
    model: str | None = None,
):
    """Trigger AI labeling job for pending items."""
    job_service = get_job_service()

    config = {
        "template_id": template_id,
        "confidence_threshold": str(confidence_threshold),
    }
    if model:
        config["model"] = model

    result = job_service.trigger_job(
        job_type="labeling_agent",
        config=config,
        template_id=template_id,
    )

    return result
