"""Curated Datasets API endpoints."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.models.curated_dataset import (
    ApprovalRequest,
    CuratedDataset,
    CuratedDatasetCreate,
    CuratedDatasetUpdate,
    DatasetExample,
    DatasetExport,
    DatasetPreview,
    DatasetStatus,
    QualityMetrics,
)
from app.services.sql_service import get_sql_service

router = APIRouter()


@router.post("/", response_model=CuratedDataset, status_code=201)
async def create_curated_dataset(
    dataset: CuratedDatasetCreate,
    created_by: str = "system",
):
    """Create a new curated dataset."""
    _sql = get_sql_service()

    dataset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Serialize JSON fields
    assembly_ids_json = json.dumps(dataset.assembly_ids)
    split_config_json = json.dumps(
        dataset.split_config.model_dump() if dataset.split_config else None
    )
    tags_json = json.dumps(dataset.tags)
    intended_models_json = json.dumps(dataset.intended_models)
    prohibited_uses_json = json.dumps(dataset.prohibited_uses)

    _sql.execute(
        """
        INSERT INTO lakebase_db.curated_datasets (
            id, name, description, labelset_id, assembly_ids,
            split_config, quality_threshold, status, version,
            created_at, created_by, tags, use_case,
            intended_models, prohibited_uses, example_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        [
            dataset_id,
            dataset.name,
            dataset.description,
            dataset.labelset_id,
            assembly_ids_json,
            split_config_json,
            dataset.quality_threshold,
            DatasetStatus.DRAFT.value,
            "1.0.0",
            now.isoformat(),
            created_by,
            tags_json,
            dataset.use_case,
            intended_models_json,
            prohibited_uses_json,
            0,
        ],
    )

    return await get_curated_dataset(dataset_id)


@router.get("/{dataset_id}", response_model=CuratedDataset)
async def get_curated_dataset(dataset_id: str):
    """Get a curated dataset by ID."""
    _sql = get_sql_service()

    result = _sql.execute(
        """
        SELECT * FROM lakebase_db.curated_datasets WHERE id = ?
    """,
        [dataset_id],
    )

    if not result or len(result) == 0:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")

    row = result[0]

    # Parse JSON fields
    assembly_ids = json.loads(row["assembly_ids"]) if row["assembly_ids"] else []
    split_config = json.loads(row["split_config"]) if row["split_config"] else None
    tags = json.loads(row["tags"]) if row["tags"] else []
    intended_models = (
        json.loads(row["intended_models"]) if row["intended_models"] else []
    )
    prohibited_uses = (
        json.loads(row["prohibited_uses"]) if row["prohibited_uses"] else []
    )
    quality_metrics = (
        json.loads(row["quality_metrics"]) if row.get("quality_metrics") else None
    )

    return CuratedDataset(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        labelset_id=row.get("labelset_id"),
        assembly_ids=assembly_ids,
        split_config=split_config,
        quality_threshold=row["quality_threshold"],
        status=row["status"],
        version=row["version"],
        example_count=row.get("example_count", 0),
        quality_metrics=quality_metrics,
        created_at=row.get("created_at"),
        created_by=row.get("created_by"),
        approved_at=row.get("approved_at"),
        approved_by=row.get("approved_by"),
        last_used_at=row.get("last_used_at"),
        tags=tags,
        use_case=row.get("use_case"),
        intended_models=intended_models,
        prohibited_uses=prohibited_uses,
    )


@router.put("/{dataset_id}", response_model=CuratedDataset)
async def update_curated_dataset(
    dataset_id: str,
    updates: CuratedDatasetUpdate,
):
    """Update a curated dataset. Only draft datasets can be updated."""
    _sql = get_sql_service()

    # Check if dataset exists and is editable
    existing = await get_curated_dataset(dataset_id)
    if existing.status != DatasetStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot update dataset with status '{existing.status}'. Only draft datasets can be updated.",
        )

    # Build update query
    update_fields = []
    params = []

    if updates.name is not None:
        update_fields.append("name = ?")
        params.append(updates.name)

    if updates.description is not None:
        update_fields.append("description = ?")
        params.append(updates.description)

    if updates.assembly_ids is not None:
        update_fields.append("assembly_ids = ?")
        params.append(json.dumps(updates.assembly_ids))

    if updates.split_config is not None:
        update_fields.append("split_config = ?")
        params.append(json.dumps(updates.split_config.model_dump()))

    if updates.quality_threshold is not None:
        update_fields.append("quality_threshold = ?")
        params.append(updates.quality_threshold)

    if updates.tags is not None:
        update_fields.append("tags = ?")
        params.append(json.dumps(updates.tags))

    if updates.use_case is not None:
        update_fields.append("use_case = ?")
        params.append(updates.use_case)

    if updates.intended_models is not None:
        update_fields.append("intended_models = ?")
        params.append(json.dumps(updates.intended_models))

    if updates.prohibited_uses is not None:
        update_fields.append("prohibited_uses = ?")
        params.append(json.dumps(updates.prohibited_uses))

    if not update_fields:
        return existing

    params.append(dataset_id)

    _sql.execute(
        f"""
        UPDATE lakebase_db.curated_datasets
        SET {", ".join(update_fields)}
        WHERE id = ?
    """,
        params,
    )

    return await get_curated_dataset(dataset_id)


@router.delete("/{dataset_id}", status_code=204)
async def delete_curated_dataset(dataset_id: str):
    """Delete a curated dataset. Cannot delete approved or in-use datasets."""
    _sql = get_sql_service()

    # Check if dataset exists and can be deleted
    existing = await get_curated_dataset(dataset_id)
    if existing.status in [DatasetStatus.APPROVED, DatasetStatus.IN_USE]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete dataset with status '{existing.status}'. Archive it instead.",
        )

    _sql.execute(
        """
        DELETE FROM lakebase_db.curated_datasets WHERE id = ?
    """,
        [dataset_id],
    )


@router.get("/", response_model=dict)
async def list_curated_datasets(
    status: str | None = Query(None, description="Filter by status"),
    labelset_id: str | None = Query(None, description="Filter by labelset"),
    use_case: str | None = Query(None, description="Filter by use case"),
    tags: str | None = Query(None, description="Comma-separated tags to filter by"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
):
    """List curated datasets with optional filtering."""
    _sql = get_sql_service()

    # Build WHERE clause
    where_conditions = []
    params = []

    if status:
        where_conditions.append("status = ?")
        params.append(status)

    if labelset_id:
        where_conditions.append("labelset_id = ?")
        params.append(labelset_id)

    if use_case:
        where_conditions.append("use_case = ?")
        params.append(use_case)

    if tags:
        # Note: This is a simple contains check, not proper JSON querying
        tag_list = tags.split(",")
        for tag in tag_list:
            where_conditions.append("tags LIKE ?")
            params.append(f"%{tag.strip()}%")

    where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

    # Get total count
    count_result = _sql.execute(
        f"""
        SELECT COUNT(*) as total FROM lakebase_db.curated_datasets {where_clause}
    """,
        params,
    )
    total = count_result[0]["total"] if count_result else 0

    # Get paginated results
    params.extend([limit, offset])
    results = _sql.execute(
        f"""
        SELECT * FROM lakebase_db.curated_datasets
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """,
        params,
    )

    datasets = []
    for row in results:
        # Parse JSON fields
        assembly_ids = json.loads(row["assembly_ids"]) if row["assembly_ids"] else []
        split_config = json.loads(row["split_config"]) if row["split_config"] else None
        tags_parsed = json.loads(row["tags"]) if row["tags"] else []
        intended_models = (
            json.loads(row["intended_models"]) if row["intended_models"] else []
        )
        prohibited_uses = (
            json.loads(row["prohibited_uses"]) if row["prohibited_uses"] else []
        )
        quality_metrics = (
            json.loads(row["quality_metrics"]) if row.get("quality_metrics") else None
        )

        datasets.append(
            CuratedDataset(
                id=row["id"],
                name=row["name"],
                description=row.get("description"),
                labelset_id=row.get("labelset_id"),
                assembly_ids=assembly_ids,
                split_config=split_config,
                quality_threshold=row["quality_threshold"],
                status=row["status"],
                version=row["version"],
                example_count=row.get("example_count", 0),
                quality_metrics=quality_metrics,
                created_at=row.get("created_at"),
                created_by=row.get("created_by"),
                approved_at=row.get("approved_at"),
                approved_by=row.get("approved_by"),
                last_used_at=row.get("last_used_at"),
                tags=tags_parsed,
                use_case=row.get("use_case"),
                intended_models=intended_models,
                prohibited_uses=prohibited_uses,
            )
        )

    return {
        "datasets": datasets,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
async def preview_dataset(
    dataset_id: str,
    limit: int = Query(10, le=100, description="Number of examples to preview"),
):
    """Preview examples from a curated dataset."""
    _sql = get_sql_service()

    # Get dataset
    dataset = await get_curated_dataset(dataset_id)

    if not dataset.assembly_ids:
        return DatasetPreview(
            dataset_id=dataset_id,
            total_examples=0,
            examples=[],
            quality_metrics=dataset.quality_metrics or QualityMetrics(),
        )

    # Get examples from assemblies
    assembly_ids_str = ", ".join([f"'{aid}'" for aid in dataset.assembly_ids])

    results = _sql.execute(
        f"""
        SELECT
            id as example_id,
            assembly_id,
            prompt,
            response,
            label,
            confidence,
            source_mode,
            reviewed
        FROM lakebase_db.assembled_datasets
        WHERE assembly_id IN ({assembly_ids_str})
        AND (confidence >= ? OR confidence IS NULL)
        LIMIT ?
    """,
        [dataset.quality_threshold, limit],
    )

    examples = []
    for row in results:
        examples.append(
            DatasetExample(
                example_id=row["example_id"],
                assembly_id=row["assembly_id"],
                prompt=row["prompt"],
                response=row["response"],
                label=row.get("label"),
                confidence=row.get("confidence"),
                source_mode=row["source_mode"],
                reviewed=row.get("reviewed", False),
            )
        )

    return DatasetPreview(
        dataset_id=dataset_id,
        total_examples=len(examples),
        examples=examples,
        quality_metrics=dataset.quality_metrics or QualityMetrics(),
    )


@router.post("/{dataset_id}/approve", response_model=CuratedDataset)
async def approve_dataset(
    dataset_id: str,
    approval: ApprovalRequest,
):
    """Approve a curated dataset for training use."""
    _sql = get_sql_service()

    # Check if dataset exists and can be approved
    existing = await get_curated_dataset(dataset_id)
    if existing.status != DatasetStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve dataset with status '{existing.status}'. Only draft datasets can be approved.",
        )

    if existing.example_count == 0:
        raise HTTPException(
            status_code=400, detail="Cannot approve dataset with 0 examples."
        )

    now = datetime.now(timezone.utc)

    _sql.execute(
        """
        UPDATE lakebase_db.curated_datasets
        SET status = ?, approved_at = ?, approved_by = ?
        WHERE id = ?
    """,
        [
            DatasetStatus.APPROVED.value,
            now.isoformat(),
            approval.approved_by,
            dataset_id,
        ],
    )

    return await get_curated_dataset(dataset_id)


@router.post("/{dataset_id}/archive", response_model=CuratedDataset)
async def archive_dataset(dataset_id: str):
    """Archive a curated dataset."""
    _sql = get_sql_service()

    # Check if dataset exists
    existing = await get_curated_dataset(dataset_id)
    if existing.status == DatasetStatus.ARCHIVED:
        return existing

    _sql.execute(
        """
        UPDATE lakebase_db.curated_datasets
        SET status = ?
        WHERE id = ?
    """,
        [DatasetStatus.ARCHIVED.value, dataset_id],
    )

    return await get_curated_dataset(dataset_id)


@router.post("/{dataset_id}/mark-in-use", response_model=CuratedDataset)
async def mark_dataset_in_use(dataset_id: str):
    """Mark a dataset as in-use (being used for training)."""
    _sql = get_sql_service()

    # Check if dataset exists and is approved
    existing = await get_curated_dataset(dataset_id)
    if existing.status != DatasetStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark dataset as in-use. Dataset must be approved first (current status: {existing.status}).",
        )

    now = datetime.now(timezone.utc)

    _sql.execute(
        """
        UPDATE lakebase_db.curated_datasets
        SET status = ?, last_used_at = ?
        WHERE id = ?
    """,
        [DatasetStatus.IN_USE.value, now.isoformat(), dataset_id],
    )

    return await get_curated_dataset(dataset_id)


@router.post("/{dataset_id}/compute-metrics", response_model=CuratedDataset)
async def compute_dataset_metrics(dataset_id: str):
    """Compute quality metrics for a dataset."""
    _sql = get_sql_service()

    # Get dataset
    dataset = await get_curated_dataset(dataset_id)

    if not dataset.assembly_ids:
        # Empty dataset
        metrics = QualityMetrics()
        _sql.execute(
            """
            UPDATE lakebase_db.curated_datasets
            SET quality_metrics = ?, example_count = ?
            WHERE id = ?
        """,
            [json.dumps(metrics.model_dump()), 0, dataset_id],
        )
        return await get_curated_dataset(dataset_id)

    # Get examples from assemblies
    assembly_ids_str = ", ".join([f"'{aid}'" for aid in dataset.assembly_ids])

    results = _sql.execute(
        f"""
        SELECT
            COUNT(*) as total_examples,
            AVG(confidence) as avg_confidence,
            AVG(LENGTH(response)) as response_length_avg,
            STDDEV(LENGTH(response)) as response_length_std,
            SUM(CASE WHEN reviewed = TRUE THEN 1 ELSE 0 END) as human_verified_count,
            SUM(CASE WHEN source_mode = 'AI_GENERATED' THEN 1 ELSE 0 END) as ai_generated_count,
            SUM(CASE WHEN source_mode = 'EXISTING_COLUMN' THEN 1 ELSE 0 END) as pre_labeled_count
        FROM lakebase_db.assembled_datasets
        WHERE assembly_id IN ({assembly_ids_str})
        AND (confidence >= ? OR confidence IS NULL)
    """,
        [dataset.quality_threshold],
    )

    row = results[0] if results else {}

    # Get label distribution
    label_results = _sql.execute(
        f"""
        SELECT label, COUNT(*) as count
        FROM lakebase_db.assembled_datasets
        WHERE assembly_id IN ({assembly_ids_str})
        AND label IS NOT NULL
        AND (confidence >= ? OR confidence IS NULL)
        GROUP BY label
    """,
        [dataset.quality_threshold],
    )

    label_distribution = {lr["label"]: lr["count"] for lr in label_results}

    metrics = QualityMetrics(
        total_examples=row.get("total_examples", 0),
        avg_confidence=row.get("avg_confidence", 0.0) or 0.0,
        label_distribution=label_distribution,
        response_length_avg=row.get("response_length_avg", 0.0) or 0.0,
        response_length_std=row.get("response_length_std", 0.0) or 0.0,
        human_verified_count=row.get("human_verified_count", 0),
        ai_generated_count=row.get("ai_generated_count", 0),
        pre_labeled_count=row.get("pre_labeled_count", 0),
    )

    # Update dataset
    _sql.execute(
        """
        UPDATE lakebase_db.curated_datasets
        SET quality_metrics = ?, example_count = ?
        WHERE id = ?
    """,
        [json.dumps(metrics.model_dump()), metrics.total_examples, dataset_id],
    )

    return await get_curated_dataset(dataset_id)


@router.get("/{dataset_id}/export", response_model=dict)
async def export_dataset(
    dataset_id: str,
    format: str = Query("jsonl", description="Export format: jsonl, csv, parquet"),
    split: str | None = Query(
        None, description="Export specific split: train, val, test"
    ),
):
    """Export a curated dataset in various formats."""
    _sql = get_sql_service()

    # Get dataset
    dataset = await get_curated_dataset(dataset_id)

    if dataset.status not in [DatasetStatus.APPROVED, DatasetStatus.IN_USE]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot export dataset with status '{dataset.status}'. Dataset must be approved first.",
        )

    if not dataset.assembly_ids:
        raise HTTPException(status_code=400, detail="Cannot export empty dataset.")

    # Get examples from assemblies
    assembly_ids_str = ", ".join([f"'{aid}'" for aid in dataset.assembly_ids])

    where_clause = f"assembly_id IN ({assembly_ids_str})"
    if split:
        where_clause += f" AND split = '{split}'"

    results = _sql.execute(
        f"""
        SELECT
            id as example_id,
            assembly_id,
            prompt,
            response,
            label,
            confidence,
            source_mode,
            reviewed,
            split
        FROM lakebase_db.assembled_datasets
        WHERE {where_clause}
        AND (confidence >= ? OR confidence IS NULL)
    """,
        [dataset.quality_threshold],
    )

    examples = []
    for row in results:
        examples.append(
            {
                "example_id": row["example_id"],
                "assembly_id": row["assembly_id"],
                "prompt": row["prompt"],
                "response": row["response"],
                "label": row.get("label"),
                "confidence": row.get("confidence"),
                "source_mode": row["source_mode"],
                "reviewed": row.get("reviewed", False),
                "split": row.get("split"),
            }
        )

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset.name,
        "format": format,
        "split": split,
        "total_examples": len(examples),
        "examples": examples,
        "metadata": {
            "version": dataset.version,
            "quality_threshold": dataset.quality_threshold,
            "split_config": dataset.split_config,
        },
    }
