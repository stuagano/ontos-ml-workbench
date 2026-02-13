"""AI Sheets API endpoints - spreadsheet-style datasets with imported and AI-generated columns."""

import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.core.databricks import get_current_user, get_workspace_client
from app.models.assembly import (
    AssembledDataset,
    AssembledRow,
    AssembleRequest,
    AssembleResponse,
    AssemblyExportRequest,
    AssemblyExportResponse,
    AssemblyGenerateRequest,
    AssemblyGenerateResponse,
    AssemblyListResponse,
    AssemblyPreviewResponse,
    AssemblyRowUpdate,
    AssemblyStatus,
    ResponseSource,
)
from app.models.sheet import (
    CellUpdate,
    CellValue,
    ColumnCreate,
    ColumnResponse,
    ColumnSourceType,
    ColumnUpdate,
    ExportRequest,
    ExportResponse,
    FineTuningExportRequest,
    FineTuningExportResponse,
    GenerateRequest,
    GenerateResponse,
    RowData,
    SheetCreate,
    SheetListResponse,
    SheetPreviewResponse,
    SheetResponse,
    SheetStatus,
    SheetUpdate,
    TemplateConfig,
    TemplateConfigAttach,
)
from app.services.inference_service import FewShotExample, get_inference_service
from app.services.lakebase_service import get_lakebase_service
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/sheets", tags=["sheets"])
logger = logging.getLogger(__name__)

# Get fully qualified table names (with backticks for special characters)
_settings = get_settings()
SHEETS_TABLE = _settings.get_table("sheets")
SHEET_DATA_TABLE = _settings.get_table("sheet_data")

# Lakebase service for fast reads
_lakebase = get_lakebase_service()


def _row_to_sheet(row: dict) -> SheetResponse:
    """Convert a database row to SheetResponse.

    Handles both Delta Lake (column: id) and Lakebase (column: sheet_id) schemas,
    and handles JSON columns as either strings or dicts.
    """
    columns_data = row.get("columns")
    if isinstance(columns_data, str):
        columns_raw = json.loads(columns_data) if columns_data else []
    elif isinstance(columns_data, list):
        columns_raw = columns_data
    else:
        columns_raw = []

    # Handle different column names between Delta and Lakebase
    sheet_id = row.get("sheet_id") or row.get("id")
    columns = [
        ColumnResponse(
            id=col["id"],
            name=col["name"],
            data_type=col.get("data_type", "string"),
            source_type=col.get("source_type", "imported"),
            import_config=col.get("import_config"),
            generation_config=col.get("generation_config"),
            order=col.get("order", idx),
        )
        for idx, col in enumerate(columns_raw)
    ]

    # Parse template_config if present
    template_config = None
    template_config_raw = row.get("template_config")
    if template_config_raw:
        try:
            template_config_dict = (
                json.loads(template_config_raw)
                if isinstance(template_config_raw, str)
                else template_config_raw
            )
            template_config = TemplateConfig(**template_config_dict)
        except Exception as e:
            logger.warning(f"Failed to parse template_config: {e}")

    return SheetResponse(
        id=sheet_id,
        name=row["name"],
        description=row.get("description"),
        version=row.get("version", "1.0.0"),
        status=SheetStatus(row.get("status", "draft")),
        columns=columns,
        template_config=template_config,
        has_template=template_config is not None,
        row_count=row.get("row_count"),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _escape_sql(value: str | None) -> str:
    """Escape single quotes for SQL string."""
    if value is None:
        return "NULL"
    return f"'{value.replace(chr(39), chr(39) + chr(39))}'"


def _escape_json_for_sql(json_str: str) -> str:
    """Escape a JSON string for SQL insertion.

    Use base64 encoding to avoid all escaping issues with nested JSON,
    backslashes, and quotes. Store as base64 string, decode when reading.
    """
    import base64
    # Encode to base64 to avoid all escaping issues
    encoded = base64.b64encode(json_str.encode('utf-8')).decode('ascii')
    return f"'base64:{encoded}'"


# ============================================================================
# Sheet CRUD
# ============================================================================


@router.get("", response_model=SheetListResponse)
async def list_sheets(
    status: SheetStatus | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all sheets with optional filtering.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    offset = (page - 1) * page_size

    # Try Lakebase first for fast reads (if no search - Lakebase doesn't support text search yet)
    if _lakebase.is_available and not search:
        rows = _lakebase.list_sheets(
            status=status.value if status else None,
            limit=page_size,
            offset=offset,
        )
        # Only use Lakebase results if we got data; otherwise fall back to Delta
        if rows:
            sheets = [_row_to_sheet(row) for row in rows]

            # For total count, we'd need another query - for now estimate from returned rows
            total = len(sheets) + offset if len(sheets) == page_size else len(sheets) + offset

            return SheetListResponse(
                sheets=sheets,
                total=total,
                page=page,
                page_size=page_size,
            )
        # Fall through to Delta Lake if Lakebase returned no results

    # Fallback to Delta Lake
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if search:
        conditions.append(f"(name LIKE '%{search}%' OR description LIKE '%{search}%')")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Get total count
    count_sql = f"SELECT COUNT(*) as cnt FROM {SHEETS_TABLE} WHERE {where_clause}"
    count_result = sql_service.execute(count_sql)
    total = int(count_result[0]["cnt"]) if count_result else 0

    # Get paginated results
    query_sql = f"""
    SELECT * FROM {SHEETS_TABLE}
    WHERE {where_clause}
    ORDER BY updated_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql_service.execute(query_sql)

    sheets = [_row_to_sheet(row) for row in rows]

    return SheetListResponse(
        sheets=sheets,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SheetResponse, status_code=201)
async def create_sheet(sheet: SheetCreate):
    """Create a new sheet."""
    sql_service = get_sql_service()
    user = get_current_user()
    sheet_id = str(uuid.uuid4())

    # Convert columns to storable format
    columns_data = []
    if sheet.columns:
        for idx, col in enumerate(sheet.columns):
            col_id = str(uuid.uuid4())
            col_data = {
                "id": col_id,
                "name": col.name,
                "data_type": col.data_type.value,
                "source_type": col.source_type.value,
                "order": idx,
            }
            if col.import_config:
                col_data["import_config"] = col.import_config.model_dump(by_alias=True)
            if col.generation_config:
                col_data["generation_config"] = col.generation_config.model_dump()
            columns_data.append(col_data)

    columns_json = json.dumps(columns_data) if columns_data else "[]"

    # Note: Delta Lake table has limited columns (id, name, description, status, columns)
    # Additional columns like version, row_count, created_by, created_at, updated_at
    # are only in Lakebase. We insert what's available.
    sql = f"""
    INSERT INTO {SHEETS_TABLE} (
        id, name, description, status, columns
    ) VALUES (
        '{sheet_id}',
        {_escape_sql(sheet.name)},
        {_escape_sql(sheet.description)},
        'draft',
        {_escape_sql(columns_json)}
    )
    """
    sql_service.execute_update(sql)

    # Sync to Lakebase for fast reads
    if _lakebase.is_available:
        try:
            _lakebase.upsert_sheet({
                "sheet_id": sheet_id,
                "name": sheet.name,
                "description": sheet.description,
                "version": "1.0.0",
                "status": "draft",
                "columns": columns_data,
                "row_count": None,
                "created_by": user,
            })
            logger.info(f"Synced sheet {sheet_id} to Lakebase")
        except Exception as e:
            logger.warning(f"Failed to sync sheet to Lakebase: {e}")

    return await get_sheet(sheet_id)


@router.get("/{sheet_id}", response_model=SheetResponse)
async def get_sheet(sheet_id: str):
    """Get a sheet by ID.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    # Try Lakebase first for fast reads
    if _lakebase.is_available:
        row = _lakebase.get_sheet(sheet_id)
        if row:
            return _row_to_sheet(row)
        # Fall through to Delta Lake if not found in Lakebase

    # Fallback to Delta Lake
    sql_service = get_sql_service()
    sql = f"SELECT * FROM {SHEETS_TABLE} WHERE id = '{sheet_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Sheet not found")

    return _row_to_sheet(rows[0])


@router.put("/{sheet_id}", response_model=SheetResponse)
async def update_sheet(sheet_id: str, sheet: SheetUpdate):
    """Update a sheet's metadata."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Cannot update published sheet. Create a new version instead.",
        )

    updates = []
    if sheet.name is not None:
        updates.append(f"name = {_escape_sql(sheet.name)}")
    if sheet.description is not None:
        updates.append(f"description = {_escape_sql(sheet.description)}")

    if updates:
        updates.append("updated_at = current_timestamp()")
        update_sql = (
            f"UPDATE {SHEETS_TABLE} SET {', '.join(updates)} WHERE id = '{sheet_id}'"
        )
        sql_service.execute_update(update_sql)

    return await get_sheet(sheet_id)


@router.delete("/{sheet_id}", status_code=204)
async def delete_sheet(sheet_id: str):
    """Delete a draft sheet."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete published sheet. Archive it instead.",
        )

    # Delete sheet data first
    sql_service.execute_update(
        f"DELETE FROM {SHEET_DATA_TABLE} WHERE sheet_id = '{sheet_id}'"
    )
    # Delete sheet
    sql_service.execute_update(f"DELETE FROM {SHEETS_TABLE} WHERE id = '{sheet_id}'")


# ============================================================================
# Column Operations
# ============================================================================


@router.post("/{sheet_id}/columns", response_model=SheetResponse)
async def add_column(sheet_id: str, column: ColumnCreate):
    """Add a column to a sheet."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    # Get current columns
    columns_data = [col.model_dump() for col in existing.columns]

    # Add new column
    col_id = str(uuid.uuid4())
    new_col = {
        "id": col_id,
        "name": column.name,
        "data_type": column.data_type.value,
        "source_type": column.source_type.value,
        "order": len(columns_data),
    }
    if column.import_config:
        new_col["import_config"] = column.import_config.model_dump(by_alias=True)
    if column.generation_config:
        new_col["generation_config"] = column.generation_config.model_dump()

    columns_data.append(new_col)
    columns_json = json.dumps(columns_data)

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET columns = {_escape_sql(columns_json)}, updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


@router.put("/{sheet_id}/columns/{column_id}", response_model=SheetResponse)
async def update_column(sheet_id: str, column_id: str, column: ColumnUpdate):
    """Update a column's configuration."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    # Find and update column
    columns_data = [col.model_dump() for col in existing.columns]
    found = False
    for col in columns_data:
        if col["id"] == column_id:
            found = True
            if column.name is not None:
                col["name"] = column.name
            if column.data_type is not None:
                col["data_type"] = column.data_type.value
            if column.import_config is not None:
                col["import_config"] = column.import_config.model_dump(by_alias=True)
            if column.generation_config is not None:
                col["generation_config"] = column.generation_config.model_dump()
            if column.order is not None:
                col["order"] = column.order
            break

    if not found:
        raise HTTPException(status_code=404, detail="Column not found")

    # Re-sort by order
    columns_data.sort(key=lambda x: x.get("order", 0))
    columns_json = json.dumps(columns_data)

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET columns = {_escape_sql(columns_json)}, updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


@router.delete("/{sheet_id}/columns/{column_id}", response_model=SheetResponse)
async def delete_column(sheet_id: str, column_id: str):
    """Remove a column from a sheet."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    # Remove column
    columns_data = [col.model_dump() for col in existing.columns if col.id != column_id]

    # Re-order remaining columns
    for idx, col in enumerate(columns_data):
        col["order"] = idx

    columns_json = json.dumps(columns_data)

    # Delete column data
    sql_service.execute_update(
        f"DELETE FROM {SHEET_DATA_TABLE} WHERE sheet_id = '{sheet_id}' AND column_id = '{column_id}'"
    )

    # Update sheet
    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET columns = {_escape_sql(columns_json)}, updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


# ============================================================================
# Template Config Operations (GCP-style)
# ============================================================================


@router.post("/{sheet_id}/attach-template", response_model=SheetResponse)
async def attach_template_config(sheet_id: str, request: TemplateConfigAttach):
    """
    Attach a template configuration to a sheet.

    Following GCP Vertex AI pattern: dataset.attach_template_config(template_config)

    The template defines how to transform the sheet's columns into prompts
    for AI generation or labeling tasks.
    """
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    # Validate that prompt_template references valid columns
    template = request.template_config
    column_names = {col.name for col in existing.columns}

    # Extract {{column_name}} references from prompt (allow spaces and special chars in names)
    import re

    referenced_columns = set(re.findall(r"\{\{([^}]+)\}\}", template.prompt_template))
    invalid_refs = referenced_columns - column_names
    if invalid_refs:
        raise HTTPException(
            status_code=400,
            detail=f"Template references unknown columns: {', '.join(invalid_refs)}. Available: {', '.join(column_names)}",
        )

    # Serialize template config to JSON
    template_json = json.dumps(template.model_dump())

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET template_config = {_escape_sql(template_json)}, updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    # Sync to Lakebase for fast reads
    if _lakebase.is_available:
        try:
            _lakebase.upsert_sheet({
                "sheet_id": sheet_id,
                "name": existing.name,
                "description": existing.description,
                "version": existing.version,
                "status": existing.status.value,
                "columns": [col.model_dump() for col in existing.columns],
                "template_config": template.model_dump(),
                "row_count": existing.row_count,
                "created_by": existing.created_by,
            })
            logger.debug(f"Synced sheet {sheet_id} template to Lakebase")
        except Exception as e:
            logger.warning(f"Failed to sync template to Lakebase: {e}")

    logger.info(
        f"Attached template config to sheet {sheet_id}: {template.name or 'unnamed'}"
    )
    return await get_sheet(sheet_id)


@router.delete("/{sheet_id}/template", response_model=SheetResponse)
async def detach_template_config(sheet_id: str):
    """Remove the attached template configuration from a sheet."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET template_config = NULL, updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


@router.get("/{sheet_id}/template", response_model=TemplateConfig)
async def get_template_config(sheet_id: str):
    """Get the attached template configuration for a sheet."""
    sheet = await get_sheet(sheet_id)

    if not sheet.template_config:
        raise HTTPException(
            status_code=404,
            detail="No template config attached to this sheet. Use POST /sheets/{id}/attach-template first.",
        )

    return sheet.template_config


# ============================================================================
# Assembly Operations (GCP-style)
# ============================================================================

# Table for storing assemblies
ASSEMBLIES_TABLE = _settings.get_table("assemblies")
ASSEMBLY_ROWS_TABLE = _settings.get_table("assembly_rows")


@router.post("/{sheet_id}/assemble", response_model=AssembleResponse)
async def assemble_sheet(sheet_id: str, request: AssembleRequest | None = None):
    """
    Assemble a sheet into a materialized dataset of prompt/response pairs.

    Following GCP Vertex AI pattern: table_id, assembly = dataset.assemble()

    This creates an AssembledDataset where:
    - Each row from the sheet becomes an AssembledRow
    - The prompt_template is rendered with actual column values
    - Responses can be AI-generated or human-labeled later
    """
    sql_service = get_sql_service()

    sheet = await get_sheet(sheet_id)

    # Get template config (from request or sheet's attached template)
    template_config = None
    if request and request.template_config:
        template_config = request.template_config
    elif sheet.template_config:
        template_config = sheet.template_config
    else:
        raise HTTPException(
            status_code=400,
            detail="No template config provided. Either attach a template to the sheet or provide one in the request.",
        )

    # Create assembly record
    assembly_id = str(uuid.uuid4())
    user = get_current_user()

    # Get row limit
    row_limit = request.row_limit if request else None

    # Get preview data to assemble
    preview = await get_preview(sheet_id, limit=row_limit or 10000)

    # Create assembly in database
    template_json = json.dumps(template_config.model_dump())
    sql = f"""
    INSERT INTO {ASSEMBLIES_TABLE} (
        id, sheet_id, sheet_name, template_config, status,
        total_rows, ai_generated_count, human_labeled_count, human_verified_count, flagged_count,
        created_by, created_at, updated_at
    ) VALUES (
        '{assembly_id}',
        '{sheet_id}',
        {_escape_sql(sheet.name)},
        {_escape_json_for_sql(template_json)},
        'assembling',
        {len(preview.rows)},
        0, 0, 0, 0,
        '{user}',
        current_timestamp(),
        current_timestamp()
    )
    """

    try:
        sql_service.execute_update(sql)
    except Exception as e:
        logger.error(f"Failed to create assembly record: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create assembly: {str(e)}"
        )

    # Render prompts and create assembly rows
    assembled_count = 0
    errors = []
    total_to_assemble = len(preview.rows)
    batch_update_interval = 10  # Update progress every 10 rows

    # Update status to 'assembling' with expected row count
    sql_service.execute_update(f"""
        UPDATE {ASSEMBLIES_TABLE}
        SET status = 'assembling', total_rows = {total_to_assemble}, updated_at = current_timestamp()
        WHERE id = '{assembly_id}'
    """)

    # Determine response source mode
    from app.models.sheet import ResponseSourceMode

    response_source_mode = getattr(
        template_config, "response_source_mode", ResponseSourceMode.EXISTING_COLUMN
    )
    response_column = getattr(template_config, "response_column", None)

    for row in preview.rows:
        try:
            # Build row data dict with column names
            row_data = {}
            for col_id, cell in row.cells.items():
                col = next((c for c in sheet.columns if c.id == col_id), None)
                if col:
                    row_data[col.name] = cell.value

            # Render prompt template
            rendered_prompt = template_config.prompt_template
            for col_name, value in row_data.items():
                placeholder = f"{{{{{col_name}}}}}"
                rendered_prompt = rendered_prompt.replace(
                    placeholder, str(value) if value is not None else ""
                )

            # Determine response based on response_source_mode
            response_value = None
            response_source = "empty"

            if (
                response_source_mode == ResponseSourceMode.EXISTING_COLUMN
                and response_column
            ):
                # Use pre-labeled data from the response column
                if (
                    response_column in row_data
                    and row_data[response_column] is not None
                ):
                    response_value = str(row_data[response_column])
                    response_source = "imported"
            elif response_source_mode == ResponseSourceMode.AI_GENERATED:
                # Generate response using Foundation Model API
                try:
                    from app.services.inference_service import get_inference_service

                    inference_service = get_inference_service()

                    generated_response = await inference_service.generate_cell(
                        prompt_template=rendered_prompt,  # Already rendered
                        system_prompt=template_config.system_instruction,
                        row_data=row_data,
                        examples=[],  # TODO: Add few-shot examples support
                        model=template_config.model,
                        temperature=template_config.temperature,
                        max_tokens=template_config.max_tokens,
                    )
                    response_value = generated_response
                    response_source = "ai_generated"
                    logger.info(f"AI generated response for row {row.row_index}")
                except Exception as gen_error:
                    logger.warning(
                        f"AI generation failed for row {row.row_index}: {gen_error}"
                    )
                    response_source = "empty"  # Fall back to empty, can retry later
            elif response_source_mode == ResponseSourceMode.MANUAL_LABELING:
                # Leave empty for human annotators
                response_source = "empty"

            # Insert assembly row
            row_id = str(uuid.uuid4())
            source_data_json = json.dumps(row_data)

            row_sql = f"""
            INSERT INTO {ASSEMBLY_ROWS_TABLE} (
                id, assembly_id, row_index, prompt, source_data,
                response, response_source, is_flagged,
                created_at
            ) VALUES (
                '{row_id}',
                '{assembly_id}',
                {row.row_index},
                {_escape_sql(rendered_prompt)},
                {_escape_json_for_sql(source_data_json)},
                {_escape_sql(response_value) if response_value else "NULL"},
                '{response_source}',
                FALSE,
                current_timestamp()
            )
            """
            sql_service.execute_update(row_sql)

            # Sync row to Lakebase for fast reads
            if _lakebase.is_available:
                try:
                    _lakebase.upsert_assembly_row({
                        "assembly_id": assembly_id,
                        "row_index": row.row_index,
                        "prompt": rendered_prompt,
                        "source_data": row_data,
                        "response": response_value,
                        "response_source": response_source,
                        "is_flagged": False,
                    })
                except Exception as lb_err:
                    logger.debug(f"Lakebase row sync failed: {lb_err}")

            assembled_count += 1

            # Update progress periodically (every N rows)
            if assembled_count % batch_update_interval == 0:
                progress_sql = f"""
                UPDATE {ASSEMBLIES_TABLE}
                SET total_rows = {total_to_assemble},
                    ai_generated_count = {assembled_count},
                    updated_at = current_timestamp()
                WHERE id = '{assembly_id}'
                """
                try:
                    sql_service.execute_update(progress_sql)
                    logger.info(f"Assembly progress: {assembled_count}/{total_to_assemble} rows")
                except Exception as progress_err:
                    logger.warning(f"Failed to update progress: {progress_err}")

        except Exception as e:
            errors.append({"row_index": row.row_index, "error": str(e)})
            logger.warning(f"Failed to assemble row {row.row_index}: {e}")

    # Update assembly status
    status = (
        "ready" if not errors else "ready"
    )  # Still mark as ready even with some errors
    sql = f"""
    UPDATE {ASSEMBLIES_TABLE}
    SET status = '{status}', total_rows = {assembled_count}, completed_at = current_timestamp(), updated_at = current_timestamp()
    WHERE id = '{assembly_id}'
    """
    sql_service.execute_update(sql)

    # Sync to Lakebase for fast reads
    if _lakebase.is_available:
        try:
            _lakebase.upsert_assembly({
                "assembly_id": assembly_id,
                "sheet_id": sheet_id,
                "sheet_name": sheet.name,
                "template_config": template_config.model_dump(),
                "status": status,
                "total_rows": assembled_count,
                "ai_generated_count": 0,
                "human_labeled_count": 0,
                "human_verified_count": 0,
                "flagged_count": 0,
                "created_by": user,
            })
            logger.info(f"Synced assembly {assembly_id} to Lakebase")
        except Exception as e:
            logger.warning(f"Failed to sync assembly to Lakebase: {e}")

    logger.info(
        f"Assembled sheet {sheet_id} into assembly {assembly_id}: {assembled_count} rows"
    )

    # Optionally generate AI responses
    if request and request.generate_responses:
        # Trigger generation (async in background ideally)
        logger.info(f"AI generation requested for assembly {assembly_id}")
        # TODO: Implement async generation

    return AssembleResponse(
        assembly_id=assembly_id,
        sheet_id=sheet_id,
        status=AssemblyStatus(status),
        total_rows=assembled_count,
        message=f"Assembled {assembled_count} rows"
        + (f" with {len(errors)} errors" if errors else ""),
    )


@router.get("/{sheet_id}/assemblies", response_model=AssemblyListResponse)
async def list_assemblies(
    sheet_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all assemblies for a sheet."""
    sql_service = get_sql_service()

    # Verify sheet exists
    await get_sheet(sheet_id)

    offset = (page - 1) * page_size

    # Count total
    count_sql = (
        f"SELECT COUNT(*) as cnt FROM {ASSEMBLIES_TABLE} WHERE sheet_id = '{sheet_id}'"
    )
    count_result = sql_service.execute(count_sql)
    total = int(count_result[0]["cnt"]) if count_result else 0

    # Get assemblies
    query_sql = f"""
    SELECT * FROM {ASSEMBLIES_TABLE}
    WHERE sheet_id = '{sheet_id}'
    ORDER BY created_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql_service.execute(query_sql)

    assemblies = []
    for row in rows:
        template_config_dict = (
            json.loads(row["template_config"]) if row.get("template_config") else {}
        )
        # Calculate empty_count from other stats
        total = row.get("total_rows", 0)
        ai_count = row.get("ai_generated_count", 0)
        human_count = row.get("human_labeled_count", 0)
        verified_count = row.get("human_verified_count", 0)
        empty_count = max(0, total - ai_count - human_count - verified_count)

        assemblies.append(
            AssembledDataset(
                id=row["id"],
                sheet_id=row["sheet_id"],
                sheet_name=row.get("sheet_name"),
                template_config=TemplateConfig(**template_config_dict),
                status=AssemblyStatus(row.get("status", "ready")),
                total_rows=total,
                ai_generated_count=ai_count,
                human_labeled_count=human_count,
                human_verified_count=verified_count,
                flagged_count=row.get("flagged_count", 0),
                empty_count=empty_count,
                created_at=row.get("created_at"),
                created_by=row.get("created_by"),
                updated_at=row.get("updated_at"),
                completed_at=row.get("completed_at"),
            )
        )

    return AssemblyListResponse(
        assemblies=assemblies,
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# Data Operations
# ============================================================================


@router.get("/{sheet_id}/preview", response_model=SheetPreviewResponse)
async def get_preview(
    sheet_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
):
    """Get preview data for a sheet (first N rows)."""
    sql_service = get_sql_service()

    sheet = await get_sheet(sheet_id)

    # Get imported columns to query source data
    imported_cols = [
        col for col in sheet.columns if col.source_type == ColumnSourceType.IMPORTED
    ]

    rows: list[RowData] = []
    total_rows = 0

    if imported_cols:
        # Build query from first imported column's table (base table)
        first_import = imported_cols[0]
        if first_import.import_config:
            # Use backticks for identifiers that may contain special characters (e.g., hyphens)
            base_table = (
                f"`{first_import.import_config.catalog}`."
                f"`{first_import.import_config.schema_name}`."
                f"`{first_import.import_config.table}`"
            )

            # Get row count
            count_sql = f"SELECT COUNT(*) as cnt FROM {base_table}"
            count_result = sql_service.execute(count_sql)
            total_rows = int(count_result[0]["cnt"]) if count_result else 0

            # Build SELECT with all imported columns from same table
            select_cols = []
            col_map: dict[str, str] = {}  # column_id -> column_name
            for col in imported_cols:
                if col.import_config:
                    col_name = col.import_config.column
                    select_cols.append(col_name)
                    col_map[col.id] = col_name

            if select_cols:
                query = (
                    f"SELECT {', '.join(select_cols)} FROM {base_table} LIMIT {limit}"
                )
                raw_rows = sql_service.execute(query)

                for row_idx, raw_row in enumerate(raw_rows):
                    cells: dict[str, CellValue] = {}
                    for col_id, col_name in col_map.items():
                        cells[col_id] = CellValue(
                            column_id=col_id,
                            value=raw_row.get(col_name),
                            source="imported",
                        )
                    rows.append(RowData(row_index=row_idx, cells=cells))

    # Add any generated/manual data from sheet_data table
    data_sql = f"""
    SELECT row_index, column_id, value, source, generated_at, edited_at
    FROM {SHEET_DATA_TABLE}
    WHERE sheet_id = '{sheet_id}'
    ORDER BY row_index, column_id
    """
    try:
        data_rows = sql_service.execute(data_sql)
        for data_row in data_rows:
            row_idx = int(data_row["row_index"])

            # Extend rows list if needed
            while len(rows) <= row_idx:
                rows.append(RowData(row_index=len(rows), cells={}))

            rows[row_idx].cells[data_row["column_id"]] = CellValue(
                column_id=data_row["column_id"],
                value=json.loads(data_row["value"]) if data_row.get("value") else None,
                source=data_row.get("source", "generated"),
                generated_at=data_row.get("generated_at"),
                edited_at=data_row.get("edited_at"),
            )
    except Exception:
        # Table might not exist yet
        pass

    return SheetPreviewResponse(
        sheet_id=sheet_id,
        columns=sheet.columns,
        rows=rows[:limit],
        total_rows=max(total_rows, len(rows)),
        preview_rows=len(rows[:limit]),
    )


@router.put("/{sheet_id}/rows/{row_index}/cells/{column_id}")
async def update_cell(
    sheet_id: str, row_index: int, column_id: str, cell: CellUpdate
) -> dict[str, Any]:
    """Update a cell value (creates few-shot example for AI columns)."""
    sql_service = get_sql_service()

    sheet = await get_sheet(sheet_id)
    if sheet.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Cannot modify published sheet.")

    # Check column exists
    col = next((c for c in sheet.columns if c.id == column_id), None)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")

    value_json = json.dumps(cell.value) if cell.value is not None else "null"
    cell_id = str(uuid.uuid4())

    # Upsert cell data
    sql = f"""
    MERGE INTO {SHEET_DATA_TABLE} AS target
    USING (
        SELECT '{sheet_id}' as sheet_id, {row_index} as row_index, '{column_id}' as column_id
    ) AS source
    ON target.sheet_id = source.sheet_id
       AND target.row_index = source.row_index
       AND target.column_id = source.column_id
    WHEN MATCHED THEN
        UPDATE SET value = {_escape_sql(value_json)}, source = 'manual', edited_at = current_timestamp()
    WHEN NOT MATCHED THEN
        INSERT (id, sheet_id, row_index, column_id, value, source, edited_at)
        VALUES ('{cell_id}', '{sheet_id}', {row_index}, '{column_id}', {_escape_sql(value_json)}, 'manual', current_timestamp())
    """
    sql_service.execute_update(sql)

    return {"status": "updated", "row_index": row_index, "column_id": column_id}


# ============================================================================
# AI Generation
# ============================================================================


@router.post("/{sheet_id}/generate", response_model=GenerateResponse)
async def generate(sheet_id: str, request: GenerateRequest):
    """
    Run AI generation on specified rows and columns.

    This endpoint:
    1. Collects manually-edited cells as few-shot examples
    2. Builds prompts with {{column}} variable substitution
    3. Calls Databricks FMAPI for generation (supports multimodal with images)
    4. Stores results back to the sheet_data table
    """
    sql_service = get_sql_service()
    inference_service = get_inference_service()

    sheet = await get_sheet(sheet_id)

    # Get AI columns to generate
    ai_columns = [
        col
        for col in sheet.columns
        if col.source_type == ColumnSourceType.GENERATED
        and (request.column_ids is None or col.id in request.column_ids)
    ]

    if not ai_columns:
        raise HTTPException(status_code=400, detail="No AI columns to generate")

    # Get preview data for context (includes all column values per row)
    preview = await get_preview(sheet_id, limit=1000)

    # Filter rows to generate
    rows_to_generate = preview.rows
    if request.row_indices is not None:
        rows_to_generate = [
            r for r in rows_to_generate if r.row_index in request.row_indices
        ]

    generated_count = 0
    errors: list[dict[str, Any]] = []

    # Process each AI column
    for col in ai_columns:
        if not col.generation_config:
            continue

        gen_config = col.generation_config
        prompt_template = gen_config.prompt
        system_prompt = gen_config.system_prompt
        model = gen_config.model if gen_config.model else None
        temperature = gen_config.temperature if gen_config.temperature else 0.1
        max_tokens = gen_config.max_tokens if gen_config.max_tokens else 1024

        # Collect few-shot examples: cells that were manually edited for this column
        few_shot_examples: list[FewShotExample] = []

        if request.include_examples:
            # Query for manually-edited cells for this column
            example_sql = f"""
            SELECT sd.row_index, sd.value
            FROM {SHEET_DATA_TABLE} sd
            WHERE sd.sheet_id = '{sheet_id}'
              AND sd.column_id = '{col.id}'
              AND sd.source = 'manual'
              AND sd.edited_at IS NOT NULL
            ORDER BY sd.edited_at DESC
            LIMIT 10
            """
            try:
                example_results = sql_service.execute_query(example_sql)

                # For each example, we need the full row data
                for ex_row in example_results:
                    ex_row_index = ex_row["row_index"]
                    ex_value = json.loads(ex_row["value"]) if ex_row["value"] else None

                    # Find the full row data from preview
                    matching_row = next(
                        (r for r in preview.rows if r.row_index == ex_row_index), None
                    )
                    if matching_row:
                        # Build input values dict from all cells in this row
                        input_values = {}
                        for cell in matching_row.cells:
                            # Find column name for this cell
                            cell_col = next(
                                (c for c in sheet.columns if c.id == cell.column_id),
                                None,
                            )
                            if cell_col:
                                input_values[cell_col.name] = cell.value

                        few_shot_examples.append(
                            FewShotExample(
                                input_values=input_values,
                                output_value=ex_value,
                            )
                        )

                logger.info(
                    f"Collected {len(few_shot_examples)} few-shot examples for column {col.name}"
                )
            except Exception as e:
                logger.warning(f"Failed to collect few-shot examples: {e}")

        # Prepare rows for generation
        rows_for_inference = []
        for row in rows_to_generate:
            # Skip rows that already have a manual edit for this column
            existing_cell = next(
                (
                    c
                    for c in row.cells
                    if c.column_id == col.id and c.source == "manual"
                ),
                None,
            )
            if existing_cell:
                logger.info(
                    f"Skipping row {row.row_index} for column {col.name} - has manual edit"
                )
                continue

            # Build row data dict with column names
            row_data = {"row_index": row.row_index}
            for cell in row.cells:
                cell_col = next(
                    (c for c in sheet.columns if c.id == cell.column_id), None
                )
                if cell_col:
                    row_data[cell_col.name] = cell.value

            rows_for_inference.append(row_data)

        if not rows_for_inference:
            logger.info(f"No rows to generate for column {col.name}")
            continue

        # Call inference service
        try:
            results = await inference_service.generate_batch(
                prompt_template=prompt_template,
                system_prompt=system_prompt,
                rows=rows_for_inference,
                examples=few_shot_examples,
                column_id=col.id,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            # Store results
            for result in results:
                if result.success and result.value is not None:
                    cell_id = str(uuid.uuid4())
                    try:
                        sql = f"""
                        MERGE INTO {SHEET_DATA_TABLE} AS target
                        USING (
                            SELECT '{sheet_id}' as sheet_id, {result.row_index} as row_index, '{col.id}' as column_id
                        ) AS source
                        ON target.sheet_id = source.sheet_id
                           AND target.row_index = source.row_index
                           AND target.column_id = source.column_id
                        WHEN MATCHED THEN
                            UPDATE SET value = {_escape_sql(json.dumps(result.value))}, source = 'generated', generated_at = current_timestamp()
                        WHEN NOT MATCHED THEN
                            INSERT (id, sheet_id, row_index, column_id, value, source, generated_at)
                            VALUES ('{cell_id}', '{sheet_id}', {result.row_index}, '{col.id}', {_escape_sql(json.dumps(result.value))}, 'generated', current_timestamp())
                        """
                        sql_service.execute_update(sql)
                        generated_count += 1
                    except Exception as e:
                        errors.append(
                            {
                                "row_index": result.row_index,
                                "column_id": col.id,
                                "error": f"Failed to store result: {str(e)}",
                            }
                        )
                else:
                    errors.append(
                        {
                            "row_index": result.row_index,
                            "column_id": col.id,
                            "error": result.error or "Generation failed",
                        }
                    )

        except Exception as e:
            logger.error(f"Batch generation failed for column {col.name}: {e}")
            for row_data in rows_for_inference:
                errors.append(
                    {
                        "row_index": row_data["row_index"],
                        "column_id": col.id,
                        "error": str(e),
                    }
                )

    return GenerateResponse(
        sheet_id=sheet_id,
        generated_cells=generated_count,
        errors=errors if errors else None,
    )


# ============================================================================
# Sheet Lifecycle
# ============================================================================


@router.post("/{sheet_id}/publish", response_model=SheetResponse)
async def publish_sheet(sheet_id: str):
    """Publish a sheet (makes it immutable)."""
    sql_service = get_sql_service()

    existing = await get_sheet(sheet_id)
    if existing.status == SheetStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Sheet is already published")

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET status = 'published', updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


@router.post("/{sheet_id}/archive", response_model=SheetResponse)
async def archive_sheet(sheet_id: str):
    """Archive a sheet."""
    sql_service = get_sql_service()

    sql = f"""
    UPDATE {SHEETS_TABLE}
    SET status = 'archived', updated_at = current_timestamp()
    WHERE id = '{sheet_id}'
    """
    sql_service.execute_update(sql)

    return await get_sheet(sheet_id)


@router.post("/{sheet_id}/export", response_model=ExportResponse)
async def export_sheet(sheet_id: str, request: ExportRequest):
    """Export sheet data to a Delta table."""
    sql_service = get_sql_service()

    sheet = await get_sheet(sheet_id)
    preview = await get_preview(sheet_id, limit=10000)  # Get all rows

    destination = f"{request.catalog}.{request.schema_name}.{request.table}"

    # Build column definitions for CREATE TABLE
    col_defs = []
    for col in sheet.columns:
        # Map our types to SQL types
        sql_type = "STRING"
        if col.data_type.value == "number":
            sql_type = "DOUBLE"
        elif col.data_type.value == "boolean":
            sql_type = "BOOLEAN"
        col_defs.append(f"`{col.name}` {sql_type}")

    # Create table
    create_mode = "OR REPLACE" if request.overwrite else ""
    create_sql = f"""
    CREATE {create_mode} TABLE {destination} (
        {", ".join(col_defs)}
    )
    """
    sql_service.execute_update(create_sql)

    # Insert data row by row
    rows_exported = 0
    for row in preview.rows:
        values = []
        for col in sheet.columns:
            cell = row.cells.get(col.id)
            if cell and cell.value is not None:
                if col.data_type.value == "string" or col.data_type.value == "image":
                    values.append(_escape_sql(str(cell.value)))
                elif col.data_type.value == "boolean":
                    values.append("TRUE" if cell.value else "FALSE")
                else:
                    values.append(str(cell.value))
            else:
                values.append("NULL")

        insert_sql = f"INSERT INTO {destination} VALUES ({', '.join(values)})"
        try:
            sql_service.execute_update(insert_sql)
            rows_exported += 1
        except Exception:
            pass  # Skip rows with errors

    return ExportResponse(
        sheet_id=sheet_id,
        destination=destination,
        rows_exported=rows_exported,
    )


@router.post("/{sheet_id}/export-finetuning", response_model=FineTuningExportResponse)
async def export_for_finetuning(sheet_id: str, request: FineTuningExportRequest):
    """
    Export sheet as a fine-tuning dataset in JSONL format.

    Creates a JSONL file suitable for fine-tuning LLMs with the OpenAI chat format:
    {"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}

    The prompt template from the AI column is used as the user message,
    and the human-verified label is used as the assistant response.
    """
    from app.services.inference_service import get_inference_service

    sql_service = get_sql_service()
    inference_service = get_inference_service()

    sheet = await get_sheet(sheet_id)
    preview = await get_preview(sheet_id, limit=10000)

    # Find the target AI column
    target_col = next(
        (c for c in sheet.columns if c.id == request.target_column_id), None
    )
    if not target_col:
        raise HTTPException(status_code=404, detail="Target column not found")

    if target_col.source_type != ColumnSourceType.GENERATED:
        raise HTTPException(
            status_code=400, detail="Target column must be an AI-generated column"
        )

    if not target_col.generation_config:
        raise HTTPException(
            status_code=400,
            detail="Target column has no generation config (prompt template)",
        )

    gen_config = target_col.generation_config
    prompt_template = gen_config.prompt
    system_prompt = gen_config.system_prompt

    # Collect rows with verified labels
    examples = []

    for row in preview.rows:
        # Get the label cell for this row
        label_cell = next(
            (c for c in row.cells if c.column_id == request.target_column_id), None
        )

        if not label_cell or label_cell.value is None:
            continue

        # If only including verified, check if it was manually edited
        if request.include_only_verified and label_cell.source != "manual":
            continue

        # Build row data dict with column names for variable substitution
        row_data = {}
        for cell in row.cells:
            col = next((c for c in sheet.columns if c.id == cell.column_id), None)
            if col:
                row_data[col.name] = cell.value

        # Substitute variables in the prompt template
        user_content = inference_service._substitute_variables(
            prompt_template, row_data
        )

        # Build the training example
        messages = []

        if request.include_system_prompt and system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": user_content})
        messages.append({"role": "assistant", "content": str(label_cell.value)})

        examples.append({"messages": messages})

    if not examples:
        raise HTTPException(
            status_code=400,
            detail="No examples found. Make sure you have human-verified labels.",
        )

    # Write JSONL to Volume
    workspace_client = get_workspace_client()

    # Build JSONL content
    jsonl_content = "\n".join(json.dumps(ex) for ex in examples)

    # Upload to Volume using Files API
    # Volume path format: /Volumes/catalog/schema/volume/path/file.jsonl
    try:
        workspace_client.files.upload(
            request.volume_path, jsonl_content.encode("utf-8"), overwrite=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to write to volume: {str(e)}"
        )

    return FineTuningExportResponse(
        sheet_id=sheet_id,
        volume_path=request.volume_path,
        examples_exported=len(examples),
        format="openai_chat",
    )
