"""Templates API endpoints - stores prompts in Delta tables."""

import json
import uuid

from fastapi import APIRouter, HTTPException, Query

from app.core.databricks import get_current_user
from app.models.template import (
    TemplateCreate,
    TemplateListResponse,
    TemplateResponse,
    TemplateStatus,
    TemplateUpdate,
)
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/templates", tags=["templates"])


def _row_to_template(row: dict) -> TemplateResponse:
    """Convert a database row to TemplateResponse."""
    input_schema = json.loads(row["input_schema"]) if row.get("input_schema") else None
    output_schema = (
        json.loads(row["output_schema"]) if row.get("output_schema") else None
    )
    examples = json.loads(row["examples"]) if row.get("examples") else None

    return TemplateResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        version=row.get("version", "1.0.0"),
        status=TemplateStatus(row.get("status", "draft")),
        input_schema=input_schema,
        output_schema=output_schema,
        prompt_template=row.get("prompt_template"),
        system_prompt=row.get("system_prompt"),
        examples=examples,
        base_model=row.get("base_model", "databricks-meta-llama-3-1-70b-instruct"),
        temperature=float(row.get("temperature", 0.7)),
        max_tokens=int(row.get("max_tokens", 1024)),
        source_catalog=row.get("source_catalog"),
        source_schema=row.get("source_schema"),
        source_table=row.get("source_table"),
        source_volume=row.get("source_volume"),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    status: TemplateStatus | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all templates with optional filtering."""
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if search:
        conditions.append(f"(name LIKE '%{search}%' OR description LIKE '%{search}%')")

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    offset = (page - 1) * page_size

    # Get total count
    count_sql = f"SELECT COUNT(*) as cnt FROM templates WHERE {where_clause}"
    count_result = sql_service.execute(count_sql)
    total = int(count_result[0]["cnt"]) if count_result else 0

    # Get paginated results
    query_sql = f"""
    SELECT * FROM templates
    WHERE {where_clause}
    ORDER BY updated_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql_service.execute(query_sql)

    templates = [_row_to_template(row) for row in rows]

    return TemplateListResponse(
        templates=templates,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(template: TemplateCreate):
    """Create a new template."""
    sql_service = get_sql_service()
    user = get_current_user()
    template_id = str(uuid.uuid4())

    # Serialize complex fields to JSON
    input_schema_json = (
        json.dumps([s.model_dump() for s in template.input_schema])
        if template.input_schema
        else None
    )
    output_schema_json = (
        json.dumps([s.model_dump() for s in template.output_schema])
        if template.output_schema
        else None
    )
    examples_json = (
        json.dumps([e.model_dump() for e in template.examples])
        if template.examples
        else None
    )

    def escape_sql(s: str | None) -> str:
        if s is None:
            return "NULL"
        return "'" + s.replace("'", "''") + "'"

    sql = f"""
    INSERT INTO templates (
        id, name, description, version, status,
        input_schema, output_schema, prompt_template, system_prompt, examples,
        base_model, temperature, max_tokens,
        source_catalog, source_schema, source_table, source_volume,
        created_by, created_at, updated_at
    ) VALUES (
        '{template_id}',
        {escape_sql(template.name)},
        {escape_sql(template.description)},
        '1.0.0',
        'draft',
        {escape_sql(input_schema_json)},
        {escape_sql(output_schema_json)},
        {escape_sql(template.prompt_template)},
        {escape_sql(template.system_prompt)},
        {escape_sql(examples_json)},
        '{template.base_model}',
        {template.temperature},
        {template.max_tokens},
        {escape_sql(template.source_catalog)},
        {escape_sql(template.source_schema)},
        {escape_sql(template.source_table)},
        {escape_sql(template.source_volume)},
        '{user}',
        current_timestamp(),
        current_timestamp()
    )
    """
    sql_service.execute_update(sql)

    return await get_template(template_id)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str):
    """Get a template by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM templates WHERE id = '{template_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Template not found")

    return _row_to_template(rows[0])


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: str, template: TemplateUpdate):
    """Update a template."""
    sql_service = get_sql_service()

    existing = await get_template(template_id)
    if existing.status == TemplateStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Cannot update published template. Create a new version instead.",
        )

    def escape_sql(s: str | None) -> str:
        if s is None:
            return "NULL"
        return "'" + s.replace("'", "''") + "'"

    updates = []
    if template.name is not None:
        updates.append(f"name = {escape_sql(template.name)}")
    if template.description is not None:
        updates.append(f"description = {escape_sql(template.description)}")
    if template.input_schema is not None:
        schema_json = json.dumps([s.model_dump() for s in template.input_schema])
        updates.append(f"input_schema = {escape_sql(schema_json)}")
    if template.output_schema is not None:
        schema_json = json.dumps([s.model_dump() for s in template.output_schema])
        updates.append(f"output_schema = {escape_sql(schema_json)}")
    if template.prompt_template is not None:
        updates.append(f"prompt_template = {escape_sql(template.prompt_template)}")
    if template.system_prompt is not None:
        updates.append(f"system_prompt = {escape_sql(template.system_prompt)}")
    if template.examples is not None:
        examples_json = json.dumps([e.model_dump() for e in template.examples])
        updates.append(f"examples = {escape_sql(examples_json)}")
    if template.base_model is not None:
        updates.append(f"base_model = '{template.base_model}'")
    if template.temperature is not None:
        updates.append(f"temperature = {template.temperature}")
    if template.max_tokens is not None:
        updates.append(f"max_tokens = {template.max_tokens}")
    if template.source_catalog is not None:
        updates.append(f"source_catalog = {escape_sql(template.source_catalog)}")
    if template.source_schema is not None:
        updates.append(f"source_schema = {escape_sql(template.source_schema)}")
    if template.source_table is not None:
        updates.append(f"source_table = {escape_sql(template.source_table)}")
    if template.source_volume is not None:
        updates.append(f"source_volume = {escape_sql(template.source_volume)}")

    if updates:
        updates.append("updated_at = current_timestamp()")
        update_sql = (
            f"UPDATE templates SET {', '.join(updates)} WHERE id = '{template_id}'"
        )
        sql_service.execute_update(update_sql)

    return await get_template(template_id)


@router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(template_id: str):
    """Publish a template (makes it immutable)."""
    sql_service = get_sql_service()

    existing = await get_template(template_id)
    if existing.status == TemplateStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Template is already published")

    sql = f"""
    UPDATE templates
    SET status = 'published', updated_at = current_timestamp()
    WHERE id = '{template_id}'
    """
    sql_service.execute_update(sql)

    return await get_template(template_id)


@router.post("/{template_id}/archive", response_model=TemplateResponse)
async def archive_template(template_id: str):
    """Archive a template."""
    sql_service = get_sql_service()

    sql = f"""
    UPDATE templates
    SET status = 'archived', updated_at = current_timestamp()
    WHERE id = '{template_id}'
    """
    sql_service.execute_update(sql)

    return await get_template(template_id)


@router.post("/{template_id}/version", response_model=TemplateResponse)
async def create_version(template_id: str):
    """Create a new version of a published template."""
    sql_service = get_sql_service()

    existing = await get_template(template_id)

    # Parse current version and increment
    version_parts = existing.version.split(".")
    new_version = f"{version_parts[0]}.{int(version_parts[1]) + 1}.0"

    new_id = str(uuid.uuid4())
    user = get_current_user()

    sql = f"""
    INSERT INTO templates (
        id, name, description, version, status,
        input_schema, output_schema, prompt_template, system_prompt, examples,
        base_model, temperature, max_tokens,
        source_catalog, source_schema, source_table, source_volume,
        created_by, created_at, updated_at
    )
    SELECT
        '{new_id}', name, description, '{new_version}', 'draft',
        input_schema, output_schema, prompt_template, system_prompt, examples,
        base_model, temperature, max_tokens,
        source_catalog, source_schema, source_table, source_volume,
        '{user}', current_timestamp(), current_timestamp()
    FROM templates WHERE id = '{template_id}'
    """
    sql_service.execute_update(sql)

    return await get_template(new_id)


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str):
    """Delete a draft template."""
    sql_service = get_sql_service()

    existing = await get_template(template_id)
    if existing.status == TemplateStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete published template. Archive it instead.",
        )

    sql = f"DELETE FROM templates WHERE id = '{template_id}'"
    sql_service.execute_update(sql)
