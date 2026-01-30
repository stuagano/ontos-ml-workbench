"""Assembly API endpoints - operations on assembled datasets (materialized prompt/response pairs)."""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.core.databricks import get_current_user, get_workspace_client
from app.models.assembly import (
    AssembledDataset,
    AssembledRow,
    AssemblyExportRequest,
    AssemblyExportResponse,
    AssemblyGenerateRequest,
    AssemblyGenerateResponse,
    AssemblyPreviewResponse,
    AssemblyRowUpdate,
    AssemblyStatus,
    ResponseSource,
)
from app.models.sheet import TemplateConfig
from app.services.inference_service import FewShotExample, get_inference_service
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/assemblies", tags=["assemblies"])
logger = logging.getLogger(__name__)

# Get fully qualified table names
_settings = get_settings()
ASSEMBLIES_TABLE = _settings.get_table("assemblies")
ASSEMBLY_ROWS_TABLE = _settings.get_table("assembly_rows")


def _escape_sql(value: str | None) -> str:
    """Escape single quotes for SQL string."""
    if value is None:
        return "NULL"
    return f"'{value.replace(chr(39), chr(39) + chr(39))}'"


def _row_to_assembly(row: dict) -> AssembledDataset:
    """Convert a database row to AssembledDataset."""
    template_config_dict = (
        json.loads(row["template_config"]) if row.get("template_config") else {}
    )

    return AssembledDataset(
        id=row["id"],
        sheet_id=row["sheet_id"],
        sheet_name=row.get("sheet_name"),
        template_config=TemplateConfig(**template_config_dict),
        status=AssemblyStatus(row.get("status", "ready")),
        total_rows=row.get("total_rows", 0),
        ai_generated_count=row.get("ai_generated_count", 0),
        human_labeled_count=row.get("human_labeled_count", 0),
        human_verified_count=row.get("human_verified_count", 0),
        flagged_count=row.get("flagged_count", 0),
        created_at=row.get("created_at"),
        created_by=row.get("created_by"),
        updated_at=row.get("updated_at"),
        completed_at=row.get("completed_at"),
        error_message=row.get("error_message"),
    )


def _row_to_assembled_row(row: dict) -> AssembledRow:
    """Convert a database row to AssembledRow."""
    source_data = json.loads(row["source_data"]) if row.get("source_data") else {}

    return AssembledRow(
        row_index=row["row_index"],
        prompt=row["prompt"],
        source_data=source_data,
        response=row.get("response"),
        response_source=ResponseSource(row.get("response_source", "empty")),
        generated_at=row.get("generated_at"),
        labeled_at=row.get("labeled_at"),
        labeled_by=row.get("labeled_by"),
        verified_at=row.get("verified_at"),
        verified_by=row.get("verified_by"),
        is_flagged=row.get("is_flagged", False),
        flag_reason=row.get("flag_reason"),
        confidence_score=row.get("confidence_score"),
    )


# ============================================================================
# Assembly CRUD
# ============================================================================


@router.get("/test")
async def test_assemblies():
    """Test endpoint to verify routing."""
    return {
        "status": "ok",
        "message": "assemblies router working",
        "table": ASSEMBLIES_TABLE,
    }


@router.get("/list")
async def list_assemblies(
    status: AssemblyStatus | None = None,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[AssembledDataset]:
    """List all assemblies, optionally filtered by status."""
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM {ASSEMBLIES_TABLE} {where_clause} ORDER BY created_at DESC LIMIT {limit}"

    print(f"[ASSEMBLIES] list_assemblies called, SQL: {sql}")

    rows = sql_service.execute(sql)
    print(f"[ASSEMBLIES] Found {len(rows)} rows")

    result = [_row_to_assembly(row) for row in rows]
    return result


@router.get("/{assembly_id}", response_model=AssembledDataset)
async def get_assembly(assembly_id: str):
    """Get an assembly by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM {ASSEMBLIES_TABLE} WHERE id = '{assembly_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Assembly not found")

    return _row_to_assembly(rows[0])


@router.delete("/{assembly_id}", status_code=204)
async def delete_assembly(assembly_id: str):
    """Delete an assembly and its rows."""
    sql_service = get_sql_service()

    # Verify exists
    await get_assembly(assembly_id)

    # Delete rows first
    sql_service.execute_update(
        f"DELETE FROM {ASSEMBLY_ROWS_TABLE} WHERE assembly_id = '{assembly_id}'"
    )
    # Delete assembly
    sql_service.execute_update(
        f"DELETE FROM {ASSEMBLIES_TABLE} WHERE id = '{assembly_id}'"
    )


# ============================================================================
# Assembly Row Operations
# ============================================================================


@router.get("/{assembly_id}/preview", response_model=AssemblyPreviewResponse)
async def get_assembly_preview(
    assembly_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    response_source: ResponseSource | None = None,
    flagged_only: bool = False,
):
    """Get preview of assembled rows with optional filtering."""
    sql_service = get_sql_service()

    assembly = await get_assembly(assembly_id)

    # Build WHERE clause
    conditions = [f"assembly_id = '{assembly_id}'"]
    if response_source:
        conditions.append(f"response_source = '{response_source.value}'")
    if flagged_only:
        conditions.append("is_flagged = TRUE")

    where_clause = " AND ".join(conditions)

    # Get rows
    query_sql = f"""
    SELECT * FROM {ASSEMBLY_ROWS_TABLE}
    WHERE {where_clause}
    ORDER BY row_index
    LIMIT {limit} OFFSET {offset}
    """
    rows = sql_service.execute(query_sql)

    assembled_rows = [_row_to_assembled_row(row) for row in rows]

    return AssemblyPreviewResponse(
        assembly_id=assembly_id,
        rows=assembled_rows,
        total_rows=assembly.total_rows,
        preview_rows=len(assembled_rows),
        ai_generated_count=assembly.ai_generated_count,
        human_labeled_count=assembly.human_labeled_count,
        human_verified_count=assembly.human_verified_count,
        flagged_count=assembly.flagged_count,
    )


@router.put("/{assembly_id}/rows/{row_index}", response_model=AssembledRow)
async def update_assembly_row(
    assembly_id: str,
    row_index: int,
    update: AssemblyRowUpdate,
):
    """
    Update an assembled row (for labeling/verification).

    When a response is provided, it's treated as a human label.
    """
    sql_service = get_sql_service()
    user = get_current_user()

    # Verify assembly exists
    assembly = await get_assembly(assembly_id)

    # Get existing row
    row_sql = f"""
    SELECT * FROM {ASSEMBLY_ROWS_TABLE}
    WHERE assembly_id = '{assembly_id}' AND row_index = {row_index}
    """
    rows = sql_service.execute(row_sql)
    if not rows:
        raise HTTPException(
            status_code=404, detail=f"Row {row_index} not found in assembly"
        )

    existing = _row_to_assembled_row(rows[0])

    # Build update fields
    updates = ["updated_at = current_timestamp()"]
    stats_updates = []

    if update.response is not None:
        updates.append(f"response = {_escape_sql(update.response)}")

        # Determine response source based on previous state
        if existing.response_source == ResponseSource.AI_GENERATED:
            # Human is verifying/correcting AI response
            updates.append("response_source = 'human_verified'")
            updates.append("verified_at = current_timestamp()")
            updates.append(f"verified_by = '{user}'")
            stats_updates.append("human_verified_count = human_verified_count + 1")
        else:
            # Human is providing initial label
            updates.append("response_source = 'human_labeled'")
            updates.append("labeled_at = current_timestamp()")
            updates.append(f"labeled_by = '{user}'")
            if existing.response_source != ResponseSource.HUMAN_LABELED:
                stats_updates.append("human_labeled_count = human_labeled_count + 1")

    if update.is_flagged is not None:
        updates.append(f"is_flagged = {str(update.is_flagged).upper()}")
        if update.is_flagged and not existing.is_flagged:
            stats_updates.append("flagged_count = flagged_count + 1")
        elif not update.is_flagged and existing.is_flagged:
            stats_updates.append("flagged_count = flagged_count - 1")

    if update.flag_reason is not None:
        updates.append(f"flag_reason = {_escape_sql(update.flag_reason)}")

    # Update row
    update_sql = f"""
    UPDATE {ASSEMBLY_ROWS_TABLE}
    SET {", ".join(updates)}
    WHERE assembly_id = '{assembly_id}' AND row_index = {row_index}
    """
    sql_service.execute_update(update_sql)

    # Update assembly stats
    if stats_updates:
        stats_sql = f"""
        UPDATE {ASSEMBLIES_TABLE}
        SET {", ".join(stats_updates)}, updated_at = current_timestamp()
        WHERE id = '{assembly_id}'
        """
        sql_service.execute_update(stats_sql)

    # Return updated row
    rows = sql_service.execute(row_sql)
    return _row_to_assembled_row(rows[0])


# ============================================================================
# AI Generation
# ============================================================================


@router.post("/{assembly_id}/generate", response_model=AssemblyGenerateResponse)
async def generate_responses(
    assembly_id: str,
    request: AssemblyGenerateRequest | None = None,
):
    """
    Generate AI responses for assembled rows.

    Uses the template's model config and optionally includes
    human-labeled rows as few-shot examples.
    """
    sql_service = get_sql_service()
    inference_service = get_inference_service()

    assembly = await get_assembly(assembly_id)
    template = assembly.template_config

    # Build query for rows to generate
    conditions = [f"assembly_id = '{assembly_id}'"]

    if request and request.row_indices:
        indices_str = ", ".join(str(i) for i in request.row_indices)
        conditions.append(f"row_index IN ({indices_str})")

    if not (request and request.overwrite_existing):
        # Only generate for empty rows
        conditions.append("response_source = 'empty'")

    where_clause = " AND ".join(conditions)

    # Get rows to generate
    query_sql = f"""
    SELECT * FROM {ASSEMBLY_ROWS_TABLE}
    WHERE {where_clause}
    ORDER BY row_index
    """
    rows_to_generate = sql_service.execute(query_sql)

    if not rows_to_generate:
        return AssemblyGenerateResponse(
            assembly_id=assembly_id,
            generated_count=0,
            failed_count=0,
            errors=None,
        )

    # Collect few-shot examples from human-labeled rows
    few_shot_examples: list[FewShotExample] = []
    if request is None or request.include_examples:
        examples_sql = f"""
        SELECT prompt, response FROM {ASSEMBLY_ROWS_TABLE}
        WHERE assembly_id = '{assembly_id}'
          AND response_source IN ('human_labeled', 'human_verified')
          AND response IS NOT NULL
        ORDER BY labeled_at DESC
        LIMIT 10
        """
        example_rows = sql_service.execute(examples_sql)

        for ex in example_rows:
            # For few-shot, we use the prompt directly (already rendered)
            few_shot_examples.append(
                FewShotExample(
                    input_values={"prompt": ex["prompt"]},
                    output_value=ex["response"],
                )
            )

        logger.info(
            f"Collected {len(few_shot_examples)} few-shot examples for assembly {assembly_id}"
        )

    # Generate responses
    generated_count = 0
    failed_count = 0
    errors: list[dict[str, Any]] = []

    for row in rows_to_generate:
        try:
            # Build prompt with few-shot examples
            messages = []

            if template.system_instruction:
                messages.append(
                    {
                        "role": "system",
                        "content": template.system_instruction,
                    }
                )

            # Add few-shot examples
            for ex in few_shot_examples:
                messages.append(
                    {"role": "user", "content": ex.input_values.get("prompt", "")}
                )
                messages.append({"role": "assistant", "content": str(ex.output_value)})

            # Add current prompt
            messages.append({"role": "user", "content": row["prompt"]})

            # Call inference
            result = await inference_service.chat_completion(
                messages=messages,
                model=template.model,
                temperature=template.temperature,
                max_tokens=template.max_tokens,
            )

            response_text = result.get("content", "")

            # Update row with generated response
            update_sql = f"""
            UPDATE {ASSEMBLY_ROWS_TABLE}
            SET response = {_escape_sql(response_text)},
                response_source = 'ai_generated',
                generated_at = current_timestamp(),
                confidence_score = {result.get("confidence", "NULL")}
            WHERE assembly_id = '{assembly_id}' AND row_index = {row["row_index"]}
            """
            sql_service.execute_update(update_sql)
            generated_count += 1

        except Exception as e:
            failed_count += 1
            errors.append(
                {
                    "row_index": row["row_index"],
                    "error": str(e),
                }
            )
            logger.warning(f"Failed to generate for row {row['row_index']}: {e}")

    # Update assembly stats
    stats_sql = f"""
    UPDATE {ASSEMBLIES_TABLE}
    SET ai_generated_count = ai_generated_count + {generated_count},
        updated_at = current_timestamp()
    WHERE id = '{assembly_id}'
    """
    sql_service.execute_update(stats_sql)

    logger.info(
        f"Generated {generated_count} responses for assembly {assembly_id}, {failed_count} failed"
    )

    return AssemblyGenerateResponse(
        assembly_id=assembly_id,
        generated_count=generated_count,
        failed_count=failed_count,
        errors=errors if errors else None,
    )


# ============================================================================
# Export
# ============================================================================


@router.post("/{assembly_id}/export", response_model=AssemblyExportResponse)
async def export_assembly(
    assembly_id: str,
    request: AssemblyExportRequest,
):
    """
    Export assembly as a fine-tuning dataset in JSONL format.

    Exports human-labeled/verified rows in a format suitable for
    fine-tuning LLMs (OpenAI chat, Anthropic, or Gemini format).
    """
    sql_service = get_sql_service()

    assembly = await get_assembly(assembly_id)
    template = assembly.template_config

    # Determine which response sources to include
    include_sources = request.include_sources
    if not include_sources:
        include_sources = [ResponseSource.HUMAN_LABELED, ResponseSource.HUMAN_VERIFIED]

    sources_str = ", ".join(f"'{s.value}'" for s in include_sources)

    # Build query
    conditions = [
        f"assembly_id = '{assembly_id}'",
        f"response_source IN ({sources_str})",
        "response IS NOT NULL",
    ]

    if request.exclude_flagged:
        conditions.append("is_flagged = FALSE")

    where_clause = " AND ".join(conditions)

    query_sql = f"""
    SELECT * FROM {ASSEMBLY_ROWS_TABLE}
    WHERE {where_clause}
    ORDER BY row_index
    """
    rows = sql_service.execute(query_sql)

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No rows match the export criteria. Ensure you have human-labeled data.",
        )

    # Build JSONL content
    examples = []
    excluded_count = 0

    for row in rows:
        if request.format == "openai_chat":
            messages = []
            if request.include_system_instruction and template.system_instruction:
                messages.append(
                    {"role": "system", "content": template.system_instruction}
                )
            messages.append({"role": "user", "content": row["prompt"]})
            messages.append({"role": "assistant", "content": row["response"]})
            examples.append({"messages": messages})

        elif request.format == "anthropic":
            example = {
                "prompt": row["prompt"],
                "completion": row["response"],
            }
            if request.include_system_instruction and template.system_instruction:
                example["system"] = template.system_instruction
            examples.append(example)

        elif request.format == "gemini":
            contents = [
                {"role": "user", "parts": [{"text": row["prompt"]}]},
                {"role": "model", "parts": [{"text": row["response"]}]},
            ]
            example = {"contents": contents}
            if request.include_system_instruction and template.system_instruction:
                example["system_instruction"] = {
                    "parts": [{"text": template.system_instruction}]
                }
            examples.append(example)

        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown format: {request.format}"
            )

    # Write JSONL to Volume
    workspace_client = get_workspace_client()
    jsonl_content = "\n".join(json.dumps(ex) for ex in examples)

    try:
        workspace_client.files.upload(
            request.volume_path,
            jsonl_content.encode("utf-8"),
            overwrite=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write to volume: {str(e)}",
        )

    logger.info(
        f"Exported {len(examples)} examples from assembly {assembly_id} to {request.volume_path}"
    )

    return AssemblyExportResponse(
        assembly_id=assembly_id,
        volume_path=request.volume_path,
        examples_exported=len(examples),
        format=request.format,
        excluded_count=excluded_count,
    )
