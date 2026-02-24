"""API endpoints for Labelsets - reusable label collections.

Provides full CRUD operations plus:
- List with filtering (status, use_case, tags)
- Publish/archive workflow
- Link to canonical labels
- Usage statistics
"""

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.models.labelset import (
    Labelset,
    LabelsetCreate,
    LabelsetListResponse,
    LabelsetStats,
    LabelsetStatus,
    LabelsetUpdate,
)
from app.services.sql_service import get_sql_service

router = APIRouter()

_settings = get_settings()
LABELSETS_TABLE = _settings.get_table("labelsets")
CANONICAL_LABELS_TABLE = _settings.get_table("canonical_labels")


# ============================================================================
# CRUD Operations
# ============================================================================


@router.post("/", response_model=Labelset, status_code=201)
async def create_labelset(
    labelset: LabelsetCreate, created_by: str = "system"
) -> Labelset:
    """Create a new labelset.

    Args:
        labelset: Labelset creation data
        created_by: User creating the labelset

    Returns:
        Created labelset

    Example:
        POST /labelsets
        {
            "name": "PCB Defect Types",
            "description": "Standard defect classifications for PCB inspection",
            "label_type": "defect_detection",
            "label_classes": [
                {
                    "name": "solder_bridge",
                    "display_name": "Solder Bridge",
                    "color": "#ef4444",
                    "hotkey": "1"
                },
                {
                    "name": "cold_joint",
                    "display_name": "Cold Joint",
                    "color": "#3b82f6",
                    "hotkey": "2"
                }
            ]
        }
    """
    _sql = get_sql_service()
    labelset_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Serialize complex fields to JSON
    label_classes_json = json.dumps([lc.model_dump() for lc in labelset.label_classes])
    response_schema_json = (
        json.dumps(labelset.response_schema.model_dump())
        if labelset.response_schema
        else None
    )
    allowed_uses_json = (
        json.dumps(labelset.allowed_uses) if labelset.allowed_uses else None
    )
    prohibited_uses_json = (
        json.dumps(labelset.prohibited_uses) if labelset.prohibited_uses else None
    )
    tags_json = json.dumps(labelset.tags) if labelset.tags else None

    esc_name = labelset.name.replace("'", "''")
    esc_desc = labelset.description.replace("'", "''") if labelset.description else None
    esc_classes = label_classes_json.replace("'", "''")
    esc_schema = response_schema_json.replace("'", "''") if response_schema_json else None
    esc_allowed = allowed_uses_json.replace("'", "''") if allowed_uses_json else None
    esc_prohibited = prohibited_uses_json.replace("'", "''") if prohibited_uses_json else None
    esc_tags = tags_json.replace("'", "''") if tags_json else None
    esc_use_case = labelset.use_case.replace("'", "''") if labelset.use_case else None

    sql = f"""
        INSERT INTO {LABELSETS_TABLE} (
            id, name, description, label_classes, response_schema, label_type,
            canonical_label_count, status, version, allowed_uses, prohibited_uses,
            created_by, created_at, updated_at, tags, use_case
        ) VALUES (
            '{labelset_id}',
            '{esc_name}',
            {f"'{esc_desc}'" if esc_desc else "NULL"},
            '{esc_classes}',
            {f"'{esc_schema}'" if esc_schema else "NULL"},
            '{labelset.label_type}',
            0,
            'draft',
            '1.0.0',
            {f"'{esc_allowed}'" if esc_allowed else "NULL"},
            {f"'{esc_prohibited}'" if esc_prohibited else "NULL"},
            '{created_by}',
            '{now}',
            '{now}',
            {f"'{esc_tags}'" if esc_tags else "NULL"},
            {f"'{esc_use_case}'" if esc_use_case else "NULL"}
        )
    """

    _sql.execute(sql)

    # Fetch and return created labelset
    return await get_labelset(labelset_id)


@router.get("/{labelset_id}", response_model=Labelset)
async def get_labelset(labelset_id: str) -> Labelset:
    """Get a labelset by ID.

    Args:
        labelset_id: Labelset ID

    Returns:
        Labelset details

    Raises:
        HTTPException: 404 if labelset not found
    """
    _sql = get_sql_service()

    sql = f"""
        SELECT *
        FROM {LABELSETS_TABLE}
        WHERE id = '{labelset_id}'
    """

    result = _sql.execute(sql)

    if not result or len(result) == 0:
        raise HTTPException(status_code=404, detail=f"Labelset {labelset_id} not found")

    row = result[0]

    # Parse JSON fields
    label_classes = json.loads(row["label_classes"]) if row["label_classes"] else []
    response_schema = (
        json.loads(row["response_schema"]) if row["response_schema"] else None
    )
    allowed_uses = json.loads(row["allowed_uses"]) if row["allowed_uses"] else None
    prohibited_uses = (
        json.loads(row["prohibited_uses"]) if row["prohibited_uses"] else None
    )
    tags = json.loads(row["tags"]) if row["tags"] else None

    return Labelset(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        label_classes=label_classes,
        response_schema=response_schema,
        label_type=row["label_type"],
        canonical_label_count=row["canonical_label_count"],
        status=row["status"],
        version=row["version"],
        allowed_uses=allowed_uses,
        prohibited_uses=prohibited_uses,
        created_by=row["created_by"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        published_by=row.get("published_by"),
        published_at=row.get("published_at"),
        tags=tags,
        use_case=row["use_case"],
    )


@router.put("/{labelset_id}", response_model=Labelset)
async def update_labelset(labelset_id: str, updates: LabelsetUpdate) -> Labelset:
    """Update a labelset.

    Args:
        labelset_id: Labelset ID
        updates: Fields to update

    Returns:
        Updated labelset

    Raises:
        HTTPException: 404 if labelset not found, 400 if labelset is published
    """
    _sql = get_sql_service()

    # Check if labelset exists and is not published
    existing = await get_labelset(labelset_id)
    if existing.status == LabelsetStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Cannot update published labelset. Archive and create new version.",
        )

    # Build update SQL
    update_fields = []
    now = datetime.utcnow().isoformat()

    if updates.name is not None:
        escaped_name = updates.name.replace("'", "''")
        update_fields.append(f"name = '{escaped_name}'")
    if updates.description is not None:
        escaped_desc = updates.description.replace("'", "''")
        update_fields.append(f"description = '{escaped_desc}'")
    if updates.label_classes is not None:
        label_classes_json = json.dumps(
            [lc.model_dump() for lc in updates.label_classes]
        )
        escaped_json = label_classes_json.replace("'", "''")
        update_fields.append(f"label_classes = '{escaped_json}'")
    if updates.response_schema is not None:
        response_schema_json = json.dumps(updates.response_schema.model_dump())
        escaped_schema = response_schema_json.replace("'", "''")
        update_fields.append(f"response_schema = '{escaped_schema}'")
    if updates.allowed_uses is not None:
        allowed_uses_json = json.dumps(updates.allowed_uses)
        escaped_allowed = allowed_uses_json.replace("'", "''")
        update_fields.append(f"allowed_uses = '{escaped_allowed}'")
    if updates.prohibited_uses is not None:
        prohibited_uses_json = json.dumps(updates.prohibited_uses)
        escaped_prohibited = prohibited_uses_json.replace("'", "''")
        update_fields.append(f"prohibited_uses = '{escaped_prohibited}'")
    if updates.tags is not None:
        tags_json = json.dumps(updates.tags)
        escaped_tags = tags_json.replace("'", "''")
        update_fields.append(f"tags = '{escaped_tags}'")
    if updates.use_case is not None:
        escaped_use_case = updates.use_case.replace("'", "''")
        update_fields.append(f"use_case = '{escaped_use_case}'")
    if updates.version is not None:
        update_fields.append(f"version = '{updates.version}'")

    update_fields.append(f"updated_at = '{now}'")

    if not update_fields:
        return existing

    sql = f"""
        UPDATE {LABELSETS_TABLE}
        SET {", ".join(update_fields)}
        WHERE id = '{labelset_id}'
    """

    _sql.execute(sql)

    return await get_labelset(labelset_id)


@router.delete("/{labelset_id}", status_code=204)
async def delete_labelset(labelset_id: str):
    """Delete a labelset.

    Args:
        labelset_id: Labelset ID

    Raises:
        HTTPException: 404 if labelset not found, 400 if labelset is in use
    """
    _sql = get_sql_service()

    # Check if labelset exists
    existing = await get_labelset(labelset_id)

    # Check if labelset is in use (has canonical labels)
    if existing.canonical_label_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete labelset with {existing.canonical_label_count} linked canonical labels. Archive instead.",
        )

    sql = f"""
        DELETE FROM {LABELSETS_TABLE}
        WHERE id = '{labelset_id}'
    """

    _sql.execute(sql)


@router.get("/", response_model=LabelsetListResponse)
async def list_labelsets(
    status: LabelsetStatus | None = None,
    use_case: str | None = None,
    label_type: str | None = None,
    tags: list[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> LabelsetListResponse:
    """List labelsets with filtering.

    Args:
        status: Filter by status (draft, published, archived)
        use_case: Filter by use case
        label_type: Filter by label type
        tags: Filter by tags (any match)
        page: Page number (1-indexed)
        page_size: Items per page

    Returns:
        Paginated list of labelsets
    """
    _sql = get_sql_service()

    # Build WHERE clause
    where_conditions = []
    if status:
        where_conditions.append(f"status = '{status}'")
    if use_case:
        esc_uc = use_case.replace("'", "''")
        where_conditions.append(f"use_case = '{esc_uc}'")
    if label_type:
        esc_lt = label_type.replace("'", "''")
        where_conditions.append(f"label_type = '{esc_lt}'")
    if tags:
        # Check if any tag matches (JSON array contains)
        tag_conditions = [f"tags LIKE '%\"{tag}\"%'" for tag in tags]
        where_conditions.append(f"({' OR '.join(tag_conditions)})")

    where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

    # Count total
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM {LABELSETS_TABLE}
        {where_clause}
    """
    count_result = _sql.execute(count_sql)
    total = count_result[0]["total"] if count_result else 0

    # Get paginated results
    offset = (page - 1) * page_size
    sql = f"""
        SELECT *
        FROM {LABELSETS_TABLE}
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
    """

    results = _sql.execute(sql)

    labelsets = []
    for row in results:
        # Parse JSON fields
        label_classes = json.loads(row["label_classes"]) if row["label_classes"] else []
        response_schema = (
            json.loads(row["response_schema"]) if row["response_schema"] else None
        )
        allowed_uses = json.loads(row["allowed_uses"]) if row["allowed_uses"] else None
        prohibited_uses = (
            json.loads(row["prohibited_uses"]) if row["prohibited_uses"] else None
        )
        tags_parsed = json.loads(row["tags"]) if row["tags"] else None

        labelsets.append(
            Labelset(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                label_classes=label_classes,
                response_schema=response_schema,
                label_type=row["label_type"],
                canonical_label_count=row["canonical_label_count"],
                status=row["status"],
                version=row["version"],
                allowed_uses=allowed_uses,
                prohibited_uses=prohibited_uses,
                created_by=row["created_by"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                published_by=row.get("published_by"),
                published_at=row.get("published_at"),
                tags=tags_parsed,
                use_case=row["use_case"],
            )
        )

    return LabelsetListResponse(
        labelsets=labelsets, total=total, page=page, page_size=page_size
    )


# ============================================================================
# Canonical Labels Association
# ============================================================================


@router.get("/{labelset_id}/canonical-labels")
async def get_labelset_canonical_labels(labelset_id: str):
    """Get all canonical labels associated with this labelset.

    Args:
        labelset_id: Labelset ID

    Returns:
        List of canonical labels that use this labelset's label_type
    """
    _sql = get_sql_service()

    # Get labelset to find label_type
    labelset = await get_labelset(labelset_id)

    sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE label_type = '{labelset.label_type}'
        ORDER BY created_at DESC
    """

    results = _sql.execute(sql)

    canonical_labels = []
    for row in results:
        label_data = json.loads(row["label_data"]) if row["label_data"] else {}
        allowed_uses = json.loads(row["allowed_uses"]) if row["allowed_uses"] else None
        prohibited_uses = (
            json.loads(row["prohibited_uses"]) if row["prohibited_uses"] else None
        )

        canonical_labels.append(
            {
                "id": row["id"],
                "sheet_id": row["sheet_id"],
                "item_ref": row["item_ref"],
                "label_type": row["label_type"],
                "label_data": label_data,
                "confidence": row["confidence"],
                "labeled_by": row["labeled_by"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "version": row["version"],
                "reuse_count": row["reuse_count"],
                "allowed_uses": allowed_uses,
                "prohibited_uses": prohibited_uses,
                "notes": row["notes"],
            }
        )

    return {
        "labelset_id": labelset_id,
        "labelset_name": labelset.name,
        "label_type": labelset.label_type,
        "canonical_labels": canonical_labels,
        "total": len(canonical_labels),
    }


# ============================================================================
# Status Transitions
# ============================================================================


@router.post("/{labelset_id}/publish", response_model=Labelset)
async def publish_labelset(labelset_id: str, published_by: str = "system") -> Labelset:
    """Publish a labelset (draft → published).

    Publishing locks the labelset for reuse. Published labelsets cannot be edited.

    Args:
        labelset_id: Labelset ID
        published_by: User publishing the labelset

    Returns:
        Published labelset

    Raises:
        HTTPException: 400 if labelset is not in draft status
    """
    _sql = get_sql_service()

    # Check if labelset exists and is draft
    existing = await get_labelset(labelset_id)
    if existing.status != LabelsetStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Can only publish draft labelsets. Current status: {existing.status}",
        )

    now = datetime.utcnow().isoformat()

    sql = f"""
        UPDATE {LABELSETS_TABLE}
        SET status = 'published',
            published_by = '{published_by}',
            published_at = '{now}',
            updated_at = '{now}'
        WHERE id = '{labelset_id}'
    """

    _sql.execute(sql)

    return await get_labelset(labelset_id)


@router.post("/{labelset_id}/archive", response_model=Labelset)
async def archive_labelset(labelset_id: str) -> Labelset:
    """Archive a labelset (published/draft → archived).

    Archived labelsets are hidden from normal lists but remain for reference.

    Args:
        labelset_id: Labelset ID

    Returns:
        Archived labelset
    """
    _sql = get_sql_service()

    # Check if labelset exists
    await get_labelset(labelset_id)

    now = datetime.utcnow().isoformat()

    sql = f"""
        UPDATE {LABELSETS_TABLE}
        SET status = 'archived',
            updated_at = '{now}'
        WHERE id = '{labelset_id}'
    """

    _sql.execute(sql)

    return await get_labelset(labelset_id)


# ============================================================================
# Statistics
# ============================================================================


@router.get("/{labelset_id}/stats", response_model=LabelsetStats)
async def get_labelset_stats(labelset_id: str) -> LabelsetStats:
    """Get statistics for a labelset.

    Args:
        labelset_id: Labelset ID

    Returns:
        Usage statistics including canonical label count, training sheets using, etc.
    """
    _sql = get_sql_service()

    # Get labelset
    labelset = await get_labelset(labelset_id)

    # Count canonical labels
    canonical_count_sql = f"""
        SELECT COUNT(*) as count
        FROM {CANONICAL_LABELS_TABLE}
        WHERE label_type = '{labelset.label_type}'
    """
    canonical_result = _sql.execute(canonical_count_sql)
    canonical_count = canonical_result[0]["count"] if canonical_result else 0

    # TODO: Count training sheets using this labelset (when TrainingSheet-Labelset link is implemented)
    # For now, return 0
    training_sheets_count = 0

    # TODO: Count training jobs using this labelset (when training jobs track labelsets)
    training_jobs_count = 0

    # Update canonical_label_count in labelset table
    if canonical_count != labelset.canonical_label_count:
        update_sql = f"""
            UPDATE {LABELSETS_TABLE}
            SET canonical_label_count = {canonical_count}
            WHERE id = '{labelset_id}'
        """
        _sql.execute(update_sql)

    return LabelsetStats(
        labelset_id=labelset_id,
        labelset_name=labelset.name,
        canonical_label_count=canonical_count,
        total_label_classes=len(labelset.label_classes),
        training_sheets_using_count=training_sheets_count,
        training_jobs_count=training_jobs_count,
        coverage_stats=None,  # TODO: Calculate coverage across training sheets
    )
