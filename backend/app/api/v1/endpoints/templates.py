"""Templates API endpoints - stores prompts in Delta tables."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_permission
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
    """Convert a database row to TemplateResponse.

    Maps actual database schema to API response:
    - DB: user_prompt_template -> API: prompt_template
    - DB: output_schema (JSON string) -> API: output_schema (list)
    - DB: few_shot_examples (array<string>) -> API: examples (list)
    - DB: version (STRING) -> API: version (str)
    - DB: feature_columns (array<string>) -> API: feature_columns (list)
    - DB: target_column (string) -> API: target_column (str)
    """
    # Parse JSON fields
    output_schema = None
    if row.get("output_schema"):
        try:
            output_schema = json.loads(row["output_schema"])
        except (json.JSONDecodeError, TypeError):
            output_schema = None

    # Parse few_shot_examples array<string> to Example objects
    examples = None
    if row.get("few_shot_examples"):
        try:
            examples = [json.loads(ex) for ex in row["few_shot_examples"]]
        except (json.JSONDecodeError, TypeError):
            examples = None

    # Parse feature_columns (may come as string or list from database)
    feature_columns = None
    if row.get("feature_columns"):
        fc = row["feature_columns"]
        if isinstance(fc, str):
            try:
                feature_columns = json.loads(fc)
            except (json.JSONDecodeError, TypeError):
                feature_columns = None
        elif isinstance(fc, list):
            feature_columns = fc

    return TemplateResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        label_type=row.get("label_type"),
        feature_columns=feature_columns,
        target_column=row.get("target_column"),
        version=row.get("version", "1.0.0"),
        status=TemplateStatus(row.get("status", "draft")),
        input_schema=None,  # Not stored in current DB schema
        output_schema=output_schema,
        prompt_template=row.get("user_prompt_template"),
        system_prompt=row.get("system_prompt"),
        examples=examples,
        base_model="databricks-meta-llama-3-1-70b-instruct",  # Not in DB, use default
        temperature=0.7,  # Not in DB, use default
        max_tokens=1024,  # Not in DB, use default
        source_catalog=None,
        source_schema=None,
        source_table=None,
        source_volume=None,
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
async def create_template(template: TemplateCreate, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
    """Create a new template."""
    sql_service = get_sql_service()
    user = get_current_user()
    template_id = str(uuid.uuid4())

    # Serialize output schema to JSON string (matches actual DB schema)
    # Note: output_schema is optional, ML config (feature_columns/target_column) is the primary way
    output_schema_json = None
    if template.output_schema:
        output_schema_json = json.dumps([s.model_dump() for s in template.output_schema])

    # Convert examples to array of strings (matches actual DB schema: array<string>)
    few_shot_examples_array = (
        [json.dumps(e.model_dump()) for e in template.examples]
        if template.examples
        else []
    )

    def escape_sql(s: str | None) -> str:
        if s is None:
            return "NULL"
        return "'" + s.replace("'", "''") + "'"

    # Map API fields to actual database schema
    # API: prompt_template -> DB: user_prompt_template
    # API: feature_columns/target_column -> DB: feature_columns/target_column (ML config is primary)
    # API: base_model, temperature, max_tokens -> NOT stored (runtime config)
    label_type = template.label_type or "general"

    # Build examples array SQL
    if few_shot_examples_array:
        examples_sql = "ARRAY(" + ", ".join([escape_sql(ex) for ex in few_shot_examples_array]) + ")"
    else:
        examples_sql = "ARRAY()"

    # Build feature_columns array SQL
    if template.feature_columns:
        feature_columns_sql = "ARRAY(" + ", ".join([escape_sql(col) for col in template.feature_columns]) + ")"
    else:
        feature_columns_sql = "NULL"

    sql = f"""
    INSERT INTO templates (
        id, name, description,
        system_prompt, user_prompt_template, output_schema,
        label_type, feature_columns, target_column, few_shot_examples,
        version, status, parent_template_id,
        created_by, created_at, updated_by, updated_at
    ) VALUES (
        '{template_id}',
        {escape_sql(template.name)},
        {escape_sql(template.description)},
        {escape_sql(template.system_prompt or "You are a helpful assistant.")},
        {escape_sql(template.prompt_template or "")},
        {escape_sql(output_schema_json)},
        '{label_type}',
        {feature_columns_sql},
        {escape_sql(template.target_column)},
        {examples_sql},
        '1.0.0',
        'draft',
        NULL,
        '{user}',
        current_timestamp(),
        '{user}',
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
async def update_template(template_id: str, template: TemplateUpdate, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
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
    if template.label_type is not None:
        updates.append(f"label_type = {escape_sql(template.label_type)}")
    if template.feature_columns is not None:
        # Build feature_columns array SQL
        if template.feature_columns:
            feature_cols_sql = "ARRAY(" + ", ".join([escape_sql(col) for col in template.feature_columns]) + ")"
        else:
            feature_cols_sql = "NULL"
        updates.append(f"feature_columns = {feature_cols_sql}")
    if template.target_column is not None:
        updates.append(f"target_column = {escape_sql(template.target_column)}")
    if template.input_schema is not None:
        schema_json = json.dumps([s.model_dump() for s in template.input_schema])
        updates.append(f"input_schema = {escape_sql(schema_json)}")
    if template.output_schema is not None:
        schema_json = json.dumps([s.model_dump() for s in template.output_schema])
        updates.append(f"output_schema = {escape_sql(schema_json)}")
    if template.prompt_template is not None:
        updates.append(f"user_prompt_template = {escape_sql(template.prompt_template)}")
    if template.system_prompt is not None:
        updates.append(f"system_prompt = {escape_sql(template.system_prompt)}")
    if template.examples is not None:
        # Convert to array<string>
        examples_array = [json.dumps(e.model_dump()) for e in template.examples]
        examples_sql = "ARRAY(" + ", ".join([escape_sql(ex) for ex in examples_array]) + ")"
        updates.append(f"few_shot_examples = {examples_sql}")
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
async def publish_template(template_id: str, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
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
async def archive_template(template_id: str, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
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
async def create_version(template_id: str, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
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
        label_type, feature_columns, target_column,
        system_prompt, user_prompt_template, output_schema, few_shot_examples,
        parent_template_id, created_by, created_at, updated_by, updated_at
    )
    SELECT
        '{new_id}', name, description, '{new_version}', 'draft',
        label_type, feature_columns, target_column,
        system_prompt, user_prompt_template, output_schema, few_shot_examples,
        '{template_id}', '{user}', current_timestamp(), '{user}', current_timestamp()
    FROM templates WHERE id = '{template_id}'
    """
    sql_service.execute_update(sql)

    return await get_template(new_id)


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str, _auth: CurrentUser = Depends(require_permission("templates", "write"))):
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
