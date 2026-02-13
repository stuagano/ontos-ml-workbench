"""
Canonical Labels API Endpoints

PRD v2.3: Expert-validated ground truth labels that can be reused across Training Sheets.
Enables "label once, reuse everywhere" workflow with usage governance.

Key Features:
- Composite key (sheet_id, item_ref, label_type) for multiple labelsets per item
- Usage constraints (allowed_uses, prohibited_uses) for governance
- Version history tracking
- Reuse statistics and analytics
- Bulk lookup for batch operations
"""

import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.models.canonical_label import (
    CanonicalLabelBulkLookup,
    CanonicalLabelBulkLookupResponse,
    CanonicalLabelCreate,
    CanonicalLabelListResponse,
    CanonicalLabelLookup,
    CanonicalLabelResponse,
    CanonicalLabelStats,
    CanonicalLabelUpdate,
    CanonicalLabelVersion,
    ItemLabelsets,
    UsageConstraintCheck,
    UsageConstraintCheckResponse,
)
from app.services.sql_service import get_sql_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Get services
_settings = get_settings()
_sql = get_sql_service()

# Table names
CANONICAL_LABELS_TABLE = _settings.get_table("canonical_labels")
CANONICAL_LABEL_VERSIONS_TABLE = _settings.get_table("canonical_label_versions")
SHEETS_TABLE = _settings.get_table("sheets")
ASSEMBLIES_TABLE = _settings.get_table("assemblies")
ASSEMBLY_ROWS_TABLE = _settings.get_table("assembly_rows")


def _row_to_canonical_label(row: dict) -> CanonicalLabelResponse:
    """Convert database row to CanonicalLabelResponse model."""
    # Parse JSON columns
    label_data = row.get("label_data")
    if isinstance(label_data, str):
        label_data = json.loads(label_data)

    allowed_uses = row.get("allowed_uses", [])
    if isinstance(allowed_uses, str):
        allowed_uses = json.loads(allowed_uses)

    prohibited_uses = row.get("prohibited_uses", [])
    if isinstance(prohibited_uses, str):
        prohibited_uses = json.loads(prohibited_uses)

    return CanonicalLabelResponse(
        id=row["id"],
        sheet_id=row["sheet_id"],
        item_ref=row["item_ref"],
        label_type=row["label_type"],
        label_data=label_data,
        confidence=row.get("confidence", "high"),
        notes=row.get("notes"),
        allowed_uses=allowed_uses,
        prohibited_uses=prohibited_uses,
        usage_reason=row.get("usage_reason"),
        data_classification=row.get("data_classification", "internal"),
        labeled_by=row["labeled_by"],
        labeled_at=row["labeled_at"],
        last_modified_by=row.get("last_modified_by"),
        last_modified_at=row.get("last_modified_at"),
        version=row.get("version", 1),
        reuse_count=row.get("reuse_count", 0),
        last_used_at=row.get("last_used_at"),
        created_at=row["labeled_at"],  # Use labeled_at as created_at (table has no created_at column)
    )


# ============================================================================
# CRUD Operations
# ============================================================================


@router.post("/", response_model=CanonicalLabelResponse, status_code=201)
async def create_canonical_label(
    label: CanonicalLabelCreate,
) -> CanonicalLabelResponse:
    """
    Create a new canonical label.

    The composite key (sheet_id, item_ref, label_type) must be unique.
    This enables multiple independent labelsets for the same source item.

    Example: Same PCB image can have:
    - label_type="classification" -> defect type
    - label_type="localization" -> bounding boxes
    - label_type="root_cause" -> failure analysis
    - label_type="pass_fail" -> binary decision
    """
    # Check if composite key already exists
    check_sql = f"""
        SELECT COUNT(*) as count
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{label.sheet_id}'
        AND item_ref = '{label.item_ref}'
        AND label_type = '{label.label_type}'
    """
    result = _sql.execute(check_sql)
    if result and result[0]["count"] > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Canonical label already exists for sheet_id={label.sheet_id}, "
            f"item_ref={label.item_ref}, label_type={label.label_type}",
        )

    # Verify sheet exists
    sheet_sql = f"""
        SELECT COUNT(*) as count
        FROM {SHEETS_TABLE}
        WHERE id = '{label.sheet_id}'
    """
    sheet_result = _sql.execute(sheet_sql)
    if not sheet_result or sheet_result[0]["count"] == 0:
        raise HTTPException(
            status_code=404,
            detail=f"Sheet not found: {label.sheet_id}",
        )

    # Generate ID
    label_id = str(uuid.uuid4())

    # Serialize JSON fields
    label_data_json = json.dumps(label.label_data)
    allowed_uses_json = json.dumps(label.allowed_uses)
    prohibited_uses_json = json.dumps(label.prohibited_uses)

    # Insert canonical label
    insert_sql = f"""
        INSERT INTO {CANONICAL_LABELS_TABLE} (
            id, sheet_id, item_ref, label_type, label_data,
            confidence, notes, allowed_uses, prohibited_uses,
            usage_reason, data_classification, labeled_by,
            reuse_count, version
        )
        VALUES (
            '{label_id}',
            '{label.sheet_id}',
            '{label.item_ref}',
            '{label.label_type}',
            '{label_data_json}',
            '{label.confidence}',
            {f"'{label.notes}'" if label.notes else "NULL"},
            '{allowed_uses_json}',
            '{prohibited_uses_json}',
            {f"'{label.usage_reason}'" if label.usage_reason else "NULL"},
            '{label.data_classification}',
            '{label.labeled_by}',
            0,
            1
        )
    """
    _sql.execute(insert_sql)

    # Fetch the created label
    return await get_canonical_label(label_id)


@router.get("/{label_id}", response_model=CanonicalLabelResponse)
async def get_canonical_label(label_id: str) -> CanonicalLabelResponse:
    """Get a canonical label by ID."""
    sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE id = '{label_id}'
    """
    result = _sql.execute(sql)

    if not result:
        raise HTTPException(status_code=404, detail="Canonical label not found")

    return _row_to_canonical_label(result[0])


@router.put("/{label_id}", response_model=CanonicalLabelResponse)
async def update_canonical_label(
    label_id: str,
    updates: CanonicalLabelUpdate,
) -> CanonicalLabelResponse:
    """
    Update a canonical label.

    This creates a new version in the version history table.
    The version number is automatically incremented.
    """
    # Fetch current label
    current_label = await get_canonical_label(label_id)

    # Save current version to history
    label_data_json = json.dumps(current_label.label_data)
    history_sql = f"""
        INSERT INTO {CANONICAL_LABEL_VERSIONS_TABLE} (
            canonical_label_id, version, label_data, confidence, notes,
            modified_by, modified_at
        )
        VALUES (
            '{label_id}',
            {current_label.version},
            '{label_data_json}',
            '{current_label.confidence}',
            {f"'{current_label.notes}'" if current_label.notes else "NULL"},
            '{current_label.last_modified_by or current_label.labeled_by}',
            '{current_label.last_modified_at or current_label.labeled_at}'
        )
    """
    _sql.execute(history_sql)

    # Build update statement
    update_parts = []
    if updates.label_data is not None:
        label_data_json = json.dumps(updates.label_data)
        update_parts.append(f"label_data = '{label_data_json}'")
    if updates.confidence is not None:
        update_parts.append(f"confidence = '{updates.confidence}'")
    if updates.notes is not None:
        update_parts.append(f"notes = '{updates.notes}'")
    if updates.allowed_uses is not None:
        allowed_uses_json = json.dumps(updates.allowed_uses)
        update_parts.append(f"allowed_uses = '{allowed_uses_json}'")
    if updates.prohibited_uses is not None:
        prohibited_uses_json = json.dumps(updates.prohibited_uses)
        update_parts.append(f"prohibited_uses = '{prohibited_uses_json}'")
    if updates.usage_reason is not None:
        update_parts.append(f"usage_reason = '{updates.usage_reason}'")
    if updates.data_classification is not None:
        update_parts.append(f"data_classification = '{updates.data_classification}'")
    if updates.last_modified_by is not None:
        update_parts.append(f"last_modified_by = '{updates.last_modified_by}'")

    # Increment version
    update_parts.append(f"version = {current_label.version + 1}")
    update_parts.append("last_modified_at = current_timestamp()")

    if update_parts:
        update_sql = f"""
            UPDATE {CANONICAL_LABELS_TABLE}
            SET {", ".join(update_parts)}
            WHERE id = '{label_id}'
        """
        _sql.execute(update_sql)

    return await get_canonical_label(label_id)


@router.delete("/{label_id}", status_code=204)
async def delete_canonical_label(label_id: str) -> None:
    """
    Delete a canonical label.

    This will fail if the label is currently referenced by any Training Sheet rows.
    Use GET /api/v1/canonical-labels/{label_id}/usage to check usage before deleting.
    """
    # Check if label is in use
    usage_sql = f"""
        SELECT COUNT(*) as count
        FROM {ASSEMBLY_ROWS_TABLE}
        WHERE canonical_label_id = '{label_id}'
    """
    result = _sql.execute(usage_sql)
    usage_count = result[0]["count"] if result else 0

    if usage_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete canonical label: currently used by {usage_count} Training Sheet rows. "
            "Remove references before deleting.",
        )

    # Delete the label
    delete_sql = f"""
        DELETE FROM {CANONICAL_LABELS_TABLE}
        WHERE id = '{label_id}'
    """
    _sql.execute(delete_sql)


# ============================================================================
# Lookup Operations
# ============================================================================


@router.post("/lookup", response_model=CanonicalLabelResponse | None)
async def lookup_canonical_label(
    lookup: CanonicalLabelLookup,
) -> CanonicalLabelResponse | None:
    """
    Lookup a canonical label by composite key (sheet_id, item_ref, label_type).

    Returns None if not found (status 200 with null body).
    This is the primary lookup method used during Training Sheet assembly.
    """
    sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{lookup.sheet_id}'
        AND item_ref = '{lookup.item_ref}'
        AND label_type = '{lookup.label_type}'
    """
    result = _sql.execute(sql)

    if not result:
        return None

    return _row_to_canonical_label(result[0])


@router.post("/lookup/bulk", response_model=CanonicalLabelBulkLookupResponse)
async def bulk_lookup_canonical_labels(
    lookup: CanonicalLabelBulkLookup,
) -> CanonicalLabelBulkLookupResponse:
    """
    Bulk lookup of canonical labels by composite keys.

    Efficiently retrieves multiple labels in a single query.
    Used during Training Sheet assembly to check all rows at once.
    """
    if not lookup.items:
        return CanonicalLabelBulkLookupResponse(
            found=[],
            not_found=[],
            found_count=0,
            not_found_count=0,
        )

    # Build OR conditions
    conditions = [
        f"(item_ref = '{item['item_ref']}' AND label_type = '{item['label_type']}')"
        for item in lookup.items
    ]

    sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{lookup.sheet_id}'
        AND ({" OR ".join(conditions)})
    """
    result = _sql.execute(sql)

    found_labels = [_row_to_canonical_label(row) for row in result]

    # Determine which items were not found
    found_keys = {(label.item_ref, label.label_type) for label in found_labels}
    requested_keys = {(item["item_ref"], item["label_type"]) for item in lookup.items}
    not_found_keys = requested_keys - found_keys

    not_found = [
        {"item_ref": item_ref, "label_type": label_type}
        for item_ref, label_type in not_found_keys
    ]

    return CanonicalLabelBulkLookupResponse(
        found=found_labels,
        not_found=not_found,
        found_count=len(found_labels),
        not_found_count=len(not_found),
    )


# ============================================================================
# List & Search Operations
# ============================================================================


@router.get("/", response_model=CanonicalLabelListResponse)
async def list_canonical_labels(
    sheet_id: str | None = Query(None, description="Filter by sheet ID"),
    label_type: str | None = Query(None, description="Filter by label type"),
    confidence: str | None = Query(None, description="Filter by confidence level"),
    min_reuse_count: int | None = Query(None, description="Minimum reuse count"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
) -> CanonicalLabelListResponse:
    """List canonical labels with filtering and pagination."""
    # Build WHERE conditions
    conditions = []
    if sheet_id:
        conditions.append(f"sheet_id = '{sheet_id}'")
    if label_type:
        conditions.append(f"label_type = '{label_type}'")
    if confidence:
        conditions.append(f"confidence = '{confidence}'")
    if min_reuse_count is not None:
        conditions.append(f"reuse_count >= {min_reuse_count}")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Count total
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM {CANONICAL_LABELS_TABLE}
        {where_clause}
    """
    count_result = _sql.execute(count_sql)
    total = count_result[0]["total"] if count_result else 0

    # Fetch page
    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        {where_clause}
        ORDER BY labeled_at DESC
        LIMIT {page_size} OFFSET {offset}
    """
    result = _sql.execute(list_sql)
    labels = [_row_to_canonical_label(row) for row in result]

    return CanonicalLabelListResponse(
        labels=labels,
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# Statistics & Analytics
# ============================================================================


@router.get("/sheets/{sheet_id}/stats", response_model=CanonicalLabelStats)
async def get_sheet_canonical_stats(sheet_id: str) -> CanonicalLabelStats:
    """Get canonical label statistics for a sheet."""
    # Verify sheet exists
    sheet_sql = (
        f"SELECT COUNT(*) as count FROM {SHEETS_TABLE} WHERE sheet_id = '{sheet_id}'"
    )
    sheet_result = _sql.execute(sheet_sql)
    if not sheet_result or sheet_result[0]["count"] == 0:
        raise HTTPException(status_code=404, detail="Sheet not found")

    # Total labels
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{sheet_id}'
    """
    count_result = _sql.execute(count_sql)
    total_labels = count_result[0]["total"] if count_result else 0

    # Labels by type
    type_sql = f"""
        SELECT label_type, COUNT(*) as count
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{sheet_id}'
        GROUP BY label_type
    """
    type_result = _sql.execute(type_sql)
    labels_by_type = {row["label_type"]: row["count"] for row in type_result}

    # Average reuse count
    avg_sql = f"""
        SELECT AVG(reuse_count) as avg_reuse
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{sheet_id}'
    """
    avg_result = _sql.execute(avg_sql)
    avg_reuse_count = float(avg_result[0]["avg_reuse"] or 0) if avg_result else 0.0

    # Most reused labels
    top_sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{sheet_id}'
        ORDER BY reuse_count DESC
        LIMIT 10
    """
    top_result = _sql.execute(top_sql)
    most_reused_labels = [_row_to_canonical_label(row) for row in top_result]

    # Coverage calculation
    sheet_data_sql = (
        f"SELECT row_count FROM {SHEETS_TABLE} WHERE sheet_id = '{sheet_id}'"
    )
    sheet_data_result = _sql.execute(sheet_data_sql)
    row_count = sheet_data_result[0]["row_count"] if sheet_data_result else None

    coverage_percent = None
    if row_count and row_count > 0:
        unique_sql = f"""
            SELECT COUNT(DISTINCT item_ref) as unique_items
            FROM {CANONICAL_LABELS_TABLE}
            WHERE sheet_id = '{sheet_id}'
        """
        unique_result = _sql.execute(unique_sql)
        unique_items = unique_result[0]["unique_items"] if unique_result else 0
        coverage_percent = (unique_items / row_count) * 100

    return CanonicalLabelStats(
        sheet_id=sheet_id,
        total_labels=total_labels,
        labels_by_type=labels_by_type,
        avg_reuse_count=avg_reuse_count,
        most_reused_labels=most_reused_labels,
        coverage_percent=coverage_percent,
    )


@router.get("/items/{sheet_id}/{item_ref}", response_model=ItemLabelsets)
async def get_item_labelsets(sheet_id: str, item_ref: str) -> ItemLabelsets:
    """Get all labelsets (canonical labels) for a single source item."""
    sql = f"""
        SELECT *
        FROM {CANONICAL_LABELS_TABLE}
        WHERE sheet_id = '{sheet_id}'
        AND item_ref = '{item_ref}'
    """
    result = _sql.execute(sql)

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No canonical labels found for item_ref={item_ref} in sheet={sheet_id}",
        )

    labelsets = [_row_to_canonical_label(row) for row in result]
    label_types = list({label.label_type for label in labelsets})

    return ItemLabelsets(
        sheet_id=sheet_id,
        item_ref=item_ref,
        labelsets=labelsets,
        label_types=label_types,
    )


# ============================================================================
# Usage & Governance
# ============================================================================


@router.post("/usage/check", response_model=UsageConstraintCheckResponse)
async def check_usage_constraints(
    check: UsageConstraintCheck,
) -> UsageConstraintCheckResponse:
    """Check if a requested usage is allowed for a canonical label."""
    label = await get_canonical_label(check.canonical_label_id)

    # Check if usage is explicitly prohibited
    if check.requested_usage in label.prohibited_uses:
        return UsageConstraintCheckResponse(
            allowed=False,
            reason=f"Usage '{check.requested_usage}' is explicitly prohibited for this label",
            canonical_label_id=check.canonical_label_id,
            requested_usage=check.requested_usage,
        )

    # Check if usage is in allowed list
    if check.requested_usage not in label.allowed_uses:
        return UsageConstraintCheckResponse(
            allowed=False,
            reason=f"Usage '{check.requested_usage}' is not in the allowed uses list: {label.allowed_uses}",
            canonical_label_id=check.canonical_label_id,
            requested_usage=check.requested_usage,
        )

    return UsageConstraintCheckResponse(
        allowed=True,
        reason=None,
        canonical_label_id=check.canonical_label_id,
        requested_usage=check.requested_usage,
    )


@router.get("/{label_id}/usage")
async def get_canonical_label_usage(label_id: str) -> dict[str, Any]:
    """Get all Training Sheets that use this canonical label."""
    # Verify label exists
    await get_canonical_label(label_id)

    # Find all assembly_rows that reference this label
    sql = f"""
        SELECT
            ar.assembly_id,
            ar.row_index,
            a.name as assembly_name,
            a.sheet_id
        FROM {ASSEMBLY_ROWS_TABLE} ar
        JOIN {ASSEMBLIES_TABLE} a ON ar.assembly_id = a.id
        WHERE ar.canonical_label_id = '{label_id}'
    """
    result = _sql.execute(sql)

    usage = [
        {
            "assembly_id": row["assembly_id"],
            "assembly_name": row["assembly_name"],
            "sheet_id": row["sheet_id"],
            "row_index": row["row_index"],
        }
        for row in result
    ]

    return {
        "canonical_label_id": label_id,
        "usage_count": len(usage),
        "used_in": usage,
    }


# ============================================================================
# Version History
# ============================================================================


@router.get("/{label_id}/versions", response_model=list[CanonicalLabelVersion])
async def get_canonical_label_versions(label_id: str) -> list[CanonicalLabelVersion]:
    """Get version history for a canonical label."""
    # Verify label exists
    await get_canonical_label(label_id)

    sql = f"""
        SELECT *
        FROM {CANONICAL_LABEL_VERSIONS_TABLE}
        WHERE canonical_label_id = '{label_id}'
        ORDER BY version DESC
    """
    result = _sql.execute(sql)

    versions = []
    for row in result:
        label_data = row.get("label_data")
        if isinstance(label_data, str):
            label_data = json.loads(label_data)

        versions.append(
            CanonicalLabelVersion(
                version=row["version"],
                label_data=label_data,
                confidence=row["confidence"],
                notes=row.get("notes"),
                modified_by=row["modified_by"],
                modified_at=row["modified_at"],
            )
        )

    return versions


# ============================================================================
# Increment Reuse Count (Internal)
# ============================================================================


@router.post("/{label_id}/increment-reuse", status_code=204)
async def increment_reuse_count(label_id: str) -> None:
    """
    Increment the reuse_count for a canonical label.

    This should be called automatically when a Training Sheet row links to this label.
    Internal use only - not exposed to frontend.
    """
    sql = f"""
        UPDATE {CANONICAL_LABELS_TABLE}
        SET reuse_count = reuse_count + 1,
            last_used_at = current_timestamp()
        WHERE id = '{label_id}'
    """
    _sql.execute(sql)
