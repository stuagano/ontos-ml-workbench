"""Training Sheet API endpoints - operations on training sheets (materialized Q&A pairs)."""

import json
import logging
import uuid
from datetime import datetime
from io import BytesIO
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.core.databricks import get_current_user, get_workspace_client
from app.models.training_sheet import (
    TrainingSheet,
    QAPairRow,
    ExportRequest,
    ExportResponse,
    GenerateRequest,
    GenerateResponse,
    TrainingSheetPreviewResponse,
    QAPairUpdate,
    TrainingSheetStatus,
    ResponseSource,
)
from app.models.sheet import TemplateConfig
from app.services.inference_service import FewShotExample, get_inference_service
from app.services.lakebase_service import get_lakebase_service
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/training-sheets", tags=["training-sheets"])
logger = logging.getLogger(__name__)

# Get fully qualified table names (PRD v2.3 - training_sheets + qa_pairs)
_settings = get_settings()
TRAINING_SHEETS_TABLE = _settings.get_table("training_sheets")
QA_PAIRS_TABLE = _settings.get_table("qa_pairs")

# Lakebase service for fast reads
_lakebase = get_lakebase_service()


def _escape_sql(value: str | None) -> str:
    """Escape single quotes for SQL string."""
    if value is None:
        return "NULL"
    return f"'{value.replace(chr(39), chr(39) + chr(39))}'"


def _row_to_training_sheet(row: dict) -> TrainingSheet:
    """Convert a database row to TrainingSheet.

    Handles both old schema and new PRD v2.3 training_sheets schema.
    """
    template_config_data = row.get("template_config")
    if isinstance(template_config_data, str):
        template_config_dict = json.loads(template_config_data)
    elif isinstance(template_config_data, dict):
        template_config_dict = template_config_data
    else:
        # PRD v2.3: template_config not stored in training_sheets, create minimal
        template_config_dict = {
            "template_id": row.get("template_id", "unknown"),
            "prompt_template": ""
        }

    # PRD v2.3: Add ML columns from training_sheets if present
    if row.get("feature_columns"):
        feature_cols = row["feature_columns"]
        # Handle both string (JSON) and list formats
        if isinstance(feature_cols, str):
            try:
                template_config_dict["feature_columns"] = json.loads(feature_cols)
            except (json.JSONDecodeError, TypeError):
                template_config_dict["feature_columns"] = None
        elif isinstance(feature_cols, list):
            template_config_dict["feature_columns"] = feature_cols

    if row.get("target_column"):
        template_config_dict["target_column"] = row["target_column"]

    # Handle different column names between old and new schemas
    training_sheet_id = row.get("training_sheet_id") or row.get("id")

    # Calculate empty count (handle both int and str types from different backends)
    def to_int(value, default=0):
        if value is None:
            return default
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return default
        return default

    # Map PRD v2.3 columns to schema
    total = to_int(row.get("total_rows") or row.get("total_items"), 0)
    ai_count = to_int(row.get("ai_generated_count") or row.get("generated_count"), 0)
    human_count = to_int(row.get("human_labeled_count") or row.get("approved_count"), 0)
    verified_count = to_int(row.get("human_verified_count") or row.get("auto_approved_count"), 0)
    empty_count = max(0, total - ai_count - human_count - verified_count)

    # Map PRD v2.3 status values to TrainingSheetStatus enum
    status_value = row.get("status", "ready")
    status_mapping = {
        "generating": "assembling",
        "review": "ready",
        "approved": "ready",
        "rejected": "failed",
        "exported": "archived",
        # Direct values pass through
        "assembling": "assembling",
        "ready": "ready",
        "failed": "failed",
        "archived": "archived"
    }
    mapped_status = status_mapping.get(status_value, "ready")

    return TrainingSheet(
        id=training_sheet_id,
        sheet_id=row["sheet_id"],
        sheet_name=row.get("sheet_name") or row.get("name"),  # PRD v2.3: "name" instead of "sheet_name"
        template_config=TemplateConfig(**template_config_dict),
        status=TrainingSheetStatus(mapped_status),
        total_rows=total,
        ai_generated_count=ai_count,
        human_labeled_count=human_count,
        human_verified_count=verified_count,
        flagged_count=to_int(row.get("flagged_count") or row.get("rejected_count"), 0),
        empty_count=empty_count,
        created_at=row.get("created_at"),
        created_by=row.get("created_by"),
        updated_at=row.get("updated_at"),
        completed_at=row.get("completed_at"),
        error_message=row.get("error_message"),
    )


def _row_to_qa_pair(row: dict) -> QAPairRow:
    """Convert a database row to QAPairRow.

    Handles both old schema and new PRD v2.3 (qa_pairs with messages).
    """
    import base64

    # PRD v2.3: Extract prompt/response from messages JSON
    if "messages" in row:
        messages_raw = row.get("messages")
        if isinstance(messages_raw, str):
            try:
                messages = json.loads(messages_raw)
            except json.JSONDecodeError:
                messages = []
        elif isinstance(messages_raw, list):
            messages = messages_raw
        else:
            messages = []

        # Extract user message as prompt, assistant message as response
        prompt = ""
        response = ""
        for msg in messages:
            if isinstance(msg, dict):
                if msg.get("role") == "user":
                    prompt = msg.get("content", "")
                elif msg.get("role") == "assistant":
                    response = msg.get("content", "")

        # Map review_status to response_source
        review_status = row.get("review_status", "pending")
        if review_status == "approved":
            response_source_val = "human_labeled"
        elif review_status == "pending":
            response_source_val = "empty"
        else:
            response_source_val = "empty"

        row_index = row.get("sequence_number", 0)

        # PRD v2.3: extract source_data from generation_metadata
        source_data = {}
        generation_metadata = row.get("generation_metadata")
        if generation_metadata:
            if isinstance(generation_metadata, str):
                try:
                    meta = json.loads(generation_metadata)
                    source_data = meta.get("source_data", {})
                except json.JSONDecodeError:
                    pass
            elif isinstance(generation_metadata, dict):
                source_data = generation_metadata.get("source_data", {})

    else:
        # Old schema
        prompt = row.get("prompt", "")
        response = row.get("response", "")
        response_source_val = row.get("response_source", "empty")
        row_index = row.get("row_index", 0)

        source_data_raw = row.get("source_data")
        if isinstance(source_data_raw, str):
            try:
                if source_data_raw.startswith("base64:"):
                    encoded = source_data_raw[7:]
                    decoded = base64.b64decode(encoded).decode('utf-8')
                    source_data = json.loads(decoded)
                else:
                    source_data = json.loads(source_data_raw) if source_data_raw else {}
            except (json.JSONDecodeError, base64.binascii.Error) as e:
                logger.warning(f"Failed to parse source_data for row {row_index}: {e}")
                source_data = {}
        elif isinstance(source_data_raw, dict):
            source_data = source_data_raw
        else:
            source_data = {}

    return QAPairRow(
        row_index=row_index,
        prompt=prompt,
        source_data=source_data,
        response=response,
        response_source=ResponseSource(response_source_val),
        generated_at=row.get("generated_at") or row.get("created_at"),
        labeled_at=row.get("labeled_at") or row.get("reviewed_at"),
        labeled_by=row.get("labeled_by") or row.get("reviewed_by"),
        verified_at=row.get("verified_at"),
        verified_by=row.get("verified_by"),
        is_flagged=row.get("is_flagged") or (row.get("review_status") == "flagged"),
        flag_reason=row.get("flag_reason") or row.get("edit_reason"),
        confidence_score=row.get("confidence_score") or row.get("quality_score"),
        notes=row.get("notes"),
    )


# ============================================================================
# Training Sheet CRUD
# ============================================================================


@router.get("/list")
async def list_training_sheets(
    status: TrainingSheetStatus | None = None,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[TrainingSheet]:
    """List all training sheets, optionally filtered by status.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    # Try Lakebase first for fast reads
    if _lakebase.is_available:
        logger.debug("Using Lakebase for list_training_sheets")
        rows = _lakebase.list_training_sheets(
            status=status.value if status else None,
            limit=limit,
        )
        # Only use Lakebase results if we got data; otherwise fall back to Delta
        if rows:
            return [_row_to_training_sheet(row) for row in rows]
        # Fall through to Delta Lake if Lakebase returned no results

    # Fallback to Delta Lake
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM {TRAINING_SHEETS_TABLE} {where_clause} ORDER BY created_at DESC LIMIT {limit}"

    logger.debug(f"Using Delta Lake for list_training_sheets: {sql}")

    try:
        rows = sql_service.execute(sql)
        return [_row_to_training_sheet(row) for row in rows]
    except Exception as e:
        if "TABLE_OR_VIEW_NOT_FOUND" in str(e) or "cannot be found" in str(e):
            logger.warning(f"Training sheets table not found: {TRAINING_SHEETS_TABLE}. Returning empty list.")
            return []
        raise


@router.get("/{training_sheet_id}", response_model=TrainingSheet)
async def get_training_sheet(training_sheet_id: str):
    """Get a training sheet by ID.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    # Try Lakebase first for fast reads
    if _lakebase.is_available:
        row = _lakebase.get_training_sheet(training_sheet_id)
        if row:
            return _row_to_training_sheet(row)
        # Fall through to Delta Lake if not found in Lakebase

    # Fallback to Delta Lake
    sql_service = get_sql_service()
    sql = f"SELECT * FROM {TRAINING_SHEETS_TABLE} WHERE id = '{training_sheet_id}'"

    try:
        rows = sql_service.execute(sql)
    except Exception as e:
        if "TABLE_OR_VIEW_NOT_FOUND" in str(e) or "cannot be found" in str(e):
            raise HTTPException(status_code=404, detail="Training sheet not found (table does not exist)")
        raise

    if not rows:
        raise HTTPException(status_code=404, detail="Training sheet not found")

    return _row_to_training_sheet(rows[0])


@router.delete("/{training_sheet_id}", status_code=204)
async def delete_training_sheet(training_sheet_id: str):
    """Delete a training sheet and its Q&A pairs."""
    sql_service = get_sql_service()

    # Verify exists
    await get_training_sheet(training_sheet_id)

    # Delete Q&A pairs first
    sql_service.execute_update(
        f"DELETE FROM {QA_PAIRS_TABLE} WHERE training_sheet_id = '{training_sheet_id}'"
    )
    # Delete training sheet
    sql_service.execute_update(
        f"DELETE FROM {TRAINING_SHEETS_TABLE} WHERE id = '{training_sheet_id}'"
    )


# ============================================================================
# Q&A Pair Row Operations
# ============================================================================


@router.get("/{training_sheet_id}/preview", response_model=TrainingSheetPreviewResponse)
async def get_training_sheet_preview(
    training_sheet_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    response_source: ResponseSource | None = None,
    flagged_only: bool = False,
):
    """Get preview of Q&A pairs with optional filtering.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    training_sheet = await get_training_sheet(training_sheet_id)
    qa_pair_rows = []

    # Try Lakebase first for fast reads
    if _lakebase.is_available:
        rows = _lakebase.list_qa_pair_rows(
            training_sheet_id=training_sheet_id,
            limit=limit,
            offset=offset,
            response_source=response_source.value if response_source else None,
            is_flagged=True if flagged_only else None,
        )
        if rows:
            qa_pair_rows = [_row_to_qa_pair(row) for row in rows]
        # Fall through to Delta Lake if Lakebase returned no results

    # Fallback to Delta Lake if no results from Lakebase
    if not qa_pair_rows:
        sql_service = get_sql_service()

        # PRD v2.3: training_sheet_id, sequence_number
        conditions = [f"training_sheet_id = '{training_sheet_id}'"]
        if response_source:
            # Map old response_source to new review_status
            if response_source.value == "ai_generated":
                conditions.append("review_status = 'pending'")
            elif response_source.value == "human_labeled":
                conditions.append("review_status = 'approved'")
        if flagged_only:
            conditions.append("review_status = 'flagged'")

        where_clause = " AND ".join(conditions)

        query_sql = f"""
        SELECT * FROM {QA_PAIRS_TABLE}
        WHERE {where_clause}
        ORDER BY sequence_number
        LIMIT {limit} OFFSET {offset}
        """
        rows = sql_service.execute(query_sql)
        qa_pair_rows = [_row_to_qa_pair(row) for row in rows]

    # Calculate empty count
    empty_count = training_sheet.total_rows - (
        training_sheet.ai_generated_count
        + training_sheet.human_labeled_count
        + training_sheet.human_verified_count
    )
    if empty_count < 0:
        empty_count = 0

    return TrainingSheetPreviewResponse(
        training_sheet_id=training_sheet_id,
        rows=qa_pair_rows,
        total_rows=training_sheet.total_rows,
        preview_rows=len(qa_pair_rows),
        offset=offset,
        limit=limit,
        ai_generated_count=training_sheet.ai_generated_count,
        human_labeled_count=training_sheet.human_labeled_count,
        human_verified_count=training_sheet.human_verified_count,
        flagged_count=training_sheet.flagged_count,
        empty_count=empty_count,
    )


@router.get("/{training_sheet_id}/rows/{row_index}", response_model=QAPairRow)
async def get_qa_pair_row(
    training_sheet_id: str,
    row_index: int,
):
    """Get a single Q&A pair by index.

    Uses Lakebase for sub-10ms reads when available, falls back to Delta Lake.
    """
    # Verify training sheet exists
    await get_training_sheet(training_sheet_id)

    # Try Lakebase first for fast reads
    if _lakebase.is_available:
        row = _lakebase.get_qa_pair_row(training_sheet_id, row_index)
        if row:
            return _row_to_qa_pair(row)
        raise HTTPException(
            status_code=404, detail=f"Row {row_index} not found in training sheet"
        )

    # Fallback to Delta Lake (PRD v2.3: training_sheet_id, sequence_number)
    sql_service = get_sql_service()
    row_sql = f"""
    SELECT * FROM {QA_PAIRS_TABLE}
    WHERE training_sheet_id = '{training_sheet_id}' AND sequence_number = {row_index}
    """
    rows = sql_service.execute(row_sql)

    if not rows:
        raise HTTPException(
            status_code=404, detail=f"Row {row_index} not found in training sheet"
        )

    return _row_to_qa_pair(rows[0])


@router.put("/{training_sheet_id}/rows/{row_index}", response_model=QAPairRow)
async def update_qa_pair(
    training_sheet_id: str,
    row_index: int,
    update: QAPairUpdate,
):
    """
    Update a Q&A pair (for labeling/verification).

    When a response is provided, it's treated as a human label.
    """
    sql_service = get_sql_service()
    user = get_current_user()

    # Verify training sheet exists
    training_sheet = await get_training_sheet(training_sheet_id)

    # Get existing row (PRD v2.3: training_sheet_id, sequence_number)
    row_sql = f"""
    SELECT * FROM {QA_PAIRS_TABLE}
    WHERE training_sheet_id = '{training_sheet_id}' AND sequence_number = {row_index}
    """
    rows = sql_service.execute(row_sql)
    if not rows:
        raise HTTPException(
            status_code=404, detail=f"Row {row_index} not found in training sheet"
        )

    existing = _row_to_qa_pair(rows[0])
    existing_row_data = rows[0]

    # Build update fields for PRD v2.3 qa_pairs schema
    updates = []
    stats_updates = []

    if update.response is not None:
        # Parse existing messages JSON
        messages_raw = existing_row_data.get("messages")
        if isinstance(messages_raw, str):
            messages = json.loads(messages_raw)
        else:
            messages = messages_raw or []

        # Store original messages if not already stored
        if not existing_row_data.get("original_messages") and len(messages) > 0:
            original_json = json.dumps(messages).replace("\\", "\\\\").replace("'", "''")
            updates.append(f"original_messages = '{original_json}'")

        # Update assistant response in messages
        new_messages = []
        for msg in messages:
            if msg.get("role") == "assistant":
                new_messages.append({"role": "assistant", "content": update.response})
            else:
                new_messages.append(msg)

        messages_json = json.dumps(new_messages).replace("\\", "\\\\").replace("'", "''")
        updates.append(f"messages = '{messages_json}'")

        # Update review status based on mark_as_verified flag
        if update.mark_as_verified:
            updates.append("review_status = 'approved'")
            updates.append("review_action = 'approve'")
            if existing_row_data.get("review_status") != "approved":
                stats_updates.append("approved_count = approved_count + 1")
        else:
            updates.append("review_status = 'edited'")
            updates.append("review_action = 'edit'")

        updates.append("reviewed_at = current_timestamp()")
        updates.append(f"reviewed_by = '{user}'")

    if update.is_flagged is not None:
        if update.is_flagged:
            updates.append("review_status = 'flagged'")
            updates.append("review_action = 'flag'")
            if existing_row_data.get("review_status") != "flagged":
                stats_updates.append("rejected_count = rejected_count + 1")
        else:
            updates.append("review_status = 'pending'")
            updates.append("review_action = NULL")

    if update.flag_reason is not None:
        escaped_reason = update.flag_reason.replace("\\", "\\\\").replace("'", "''")
        updates.append(f"edit_reason = '{escaped_reason}'")

    # Add updated_at and updated_by
    updates.append("updated_at = current_timestamp()")
    updates.append(f"updated_by = '{user}'")

    # Update row (PRD v2.3: training_sheet_id, sequence_number)
    update_sql = f"""
    UPDATE {QA_PAIRS_TABLE}
    SET {", ".join(updates)}
    WHERE training_sheet_id = '{training_sheet_id}' AND sequence_number = {row_index}
    """
    try:
        sql_service.execute_update(update_sql)
    except Exception as e:
        logger.error(f"Failed to update row {row_index} in training sheet {training_sheet_id}: {e}")
        logger.error(f"SQL was: {update_sql[:500]}...")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

    # Update training sheet stats
    if stats_updates:
        stats_sql = f"""
        UPDATE {TRAINING_SHEETS_TABLE}
        SET {", ".join(stats_updates)}, updated_at = current_timestamp()
        WHERE id = '{training_sheet_id}'
        """
        sql_service.execute_update(stats_sql)

    # Sync to Lakebase for fast reads
    if _lakebase.is_available:
        try:
            # Re-fetch the updated row from Delta and sync to Lakebase
            updated_rows = sql_service.execute(row_sql)
            if updated_rows:
                row_dict = updated_rows[0]
                _lakebase.update_qa_pair_row(
                    training_sheet_id=training_sheet_id,
                    row_index=row_index,
                    updates={
                        "response": row_dict.get("response"),
                        "response_source": row_dict.get("response_source"),
                        "labeled_at": row_dict.get("labeled_at"),
                        "labeled_by": row_dict.get("labeled_by"),
                        "verified_at": row_dict.get("verified_at"),
                        "verified_by": row_dict.get("verified_by"),
                        "is_flagged": row_dict.get("is_flagged"),
                        "flag_reason": row_dict.get("flag_reason"),
                    }
                )
            # Also update training sheet stats in Lakebase
            if stats_updates:
                _lakebase.update_training_sheet_stats(training_sheet_id)
        except Exception as lb_err:
            logger.warning(f"Lakebase sync failed for row update: {lb_err}")

    # Return updated row
    rows = sql_service.execute(row_sql)
    return _row_to_qa_pair(rows[0])


# ============================================================================
# AI Generation
# ============================================================================


@router.post("/{training_sheet_id}/generate", response_model=GenerateResponse)
async def generate_responses(
    training_sheet_id: str,
    request: GenerateRequest | None = None,
):
    """
    Generate AI responses for Q&A pairs.

    Uses the template's model config and optionally includes
    human-labeled rows as few-shot examples.
    """
    sql_service = get_sql_service()
    inference_service = get_inference_service()

    training_sheet = await get_training_sheet(training_sheet_id)
    template = training_sheet.template_config

    # Build query for rows to generate (PRD v2.3: training_sheet_id, sequence_number, review_status)
    conditions = [f"training_sheet_id = '{training_sheet_id}'"]

    if request and request.row_indices:
        indices_str = ", ".join(str(i) for i in request.row_indices)
        conditions.append(f"sequence_number IN ({indices_str})")

    if not (request and request.overwrite_existing):
        # Only generate for pending/empty rows
        conditions.append("review_status = 'pending'")

    where_clause = " AND ".join(conditions)

    # Get rows to generate
    query_sql = f"""
    SELECT * FROM {QA_PAIRS_TABLE}
    WHERE {where_clause}
    ORDER BY sequence_number
    """
    rows_to_generate = sql_service.execute(query_sql)

    if not rows_to_generate:
        return GenerateResponse(
            training_sheet_id=training_sheet_id,
            generated_count=0,
            failed_count=0,
            errors=None,
        )

    # Collect few-shot examples from approved rows (PRD v2.3: training_sheet_id, review_status, messages)
    few_shot_examples: list[FewShotExample] = []
    if request is None or request.include_examples:
        examples_sql = f"""
        SELECT messages FROM {QA_PAIRS_TABLE}
        WHERE training_sheet_id = '{training_sheet_id}'
          AND review_status = 'approved'
        ORDER BY reviewed_at DESC
        LIMIT 10
        """
        example_rows = sql_service.execute(examples_sql)

        for ex in example_rows:
            # Extract prompt/response from messages JSON
            messages_raw = ex.get("messages")
            if isinstance(messages_raw, str):
                messages = json.loads(messages_raw)
            else:
                messages = messages_raw or []

            prompt = ""
            response = ""
            for msg in messages:
                if msg.get("role") == "user":
                    prompt = msg.get("content", "")
                elif msg.get("role") == "assistant":
                    response = msg.get("content", "")

            if prompt and response:
                few_shot_examples.append(
                    FewShotExample(
                        input_values={"prompt": prompt},
                        output_value=response,
                    )
                )

        logger.info(
            f"Collected {len(few_shot_examples)} few-shot examples for training sheet {training_sheet_id}"
        )

    # Generate responses
    generated_count = 0
    failed_count = 0
    errors: list[dict[str, Any]] = []

    for row in rows_to_generate:
        try:
            # Extract prompt from messages JSON (PRD v2.3)
            messages_raw = row.get("messages")
            if isinstance(messages_raw, str):
                row_messages = json.loads(messages_raw)
            else:
                row_messages = messages_raw or []

            prompt = ""
            for msg in row_messages:
                if msg.get("role") == "user":
                    prompt = msg.get("content", "")
                    break

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
            messages.append({"role": "user", "content": prompt})

            # Call inference
            result = await inference_service.chat_completion(
                messages=messages,
                model=template.model,
                temperature=template.temperature,
                max_tokens=template.max_tokens,
            )

            response_text = result.get("content", "")

            # Update messages with generated response (PRD v2.3)
            new_messages = []
            for msg in row_messages:
                if msg.get("role") == "assistant":
                    new_messages.append({"role": "assistant", "content": response_text})
                else:
                    new_messages.append(msg)

            messages_json = json.dumps(new_messages).replace("\\", "\\\\").replace("'", "''")

            update_sql = f"""
            UPDATE {QA_PAIRS_TABLE}
            SET messages = '{messages_json}',
                review_status = 'pending',
                updated_at = current_timestamp()
            WHERE training_sheet_id = '{training_sheet_id}' AND sequence_number = {row["sequence_number"]}
            """
            sql_service.execute_update(update_sql)
            generated_count += 1

        except Exception as e:
            failed_count += 1
            errors.append(
                {
                    "row_index": row.get("sequence_number", 0),
                    "error": str(e),
                }
            )
            logger.warning(f"Failed to generate for row {row.get('sequence_number')}: {e}")

    # Update training sheet stats
    stats_sql = f"""
    UPDATE {TRAINING_SHEETS_TABLE}
    SET ai_generated_count = ai_generated_count + {generated_count},
        updated_at = current_timestamp()
    WHERE id = '{training_sheet_id}'
    """
    sql_service.execute_update(stats_sql)

    logger.info(
        f"Generated {generated_count} responses for training sheet {training_sheet_id}, {failed_count} failed"
    )

    return GenerateResponse(
        training_sheet_id=training_sheet_id,
        generated_count=generated_count,
        failed_count=failed_count,
        errors=errors if errors else None,
    )


# ============================================================================
# Export
# ============================================================================


@router.post("/{training_sheet_id}/export", response_model=ExportResponse)
async def export_training_sheet(
    training_sheet_id: str,
    request: ExportRequest,
):
    """
    Export training sheet as a fine-tuning dataset in JSONL format.

    Exports human-labeled/verified rows in a format suitable for
    fine-tuning LLMs (OpenAI chat, Anthropic, or Gemini format).
    """
    sql_service = get_sql_service()

    training_sheet = await get_training_sheet(training_sheet_id)
    template = training_sheet.template_config

    # Determine which response sources to include
    include_sources = request.include_sources
    if not include_sources:
        include_sources = [ResponseSource.HUMAN_LABELED, ResponseSource.HUMAN_VERIFIED]

    sources_str = ", ".join(f"'{s.value}'" for s in include_sources)

    # Build query
    conditions = [
        f"training_sheet_id = '{training_sheet_id}'",
        f"response_source IN ({sources_str})",
        "response IS NOT NULL",
    ]

    if request.exclude_flagged:
        conditions.append("is_flagged = FALSE")

    where_clause = " AND ".join(conditions)

    query_sql = f"""
    SELECT * FROM {QA_PAIRS_TABLE}
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

    # Handle train/val split if requested
    train_path = None
    val_path = None
    train_count = None
    val_count = None

    if request.train_split:
        import random

        # Shuffle examples with seed for reproducibility
        random.seed(request.random_seed)
        shuffled = examples.copy()
        random.shuffle(shuffled)

        # Split
        split_idx = int(len(shuffled) * request.train_split)
        train_examples = shuffled[:split_idx]
        val_examples = shuffled[split_idx:]

        # Generate paths: /Volumes/.../data.jsonl -> /Volumes/.../data_train.jsonl
        base_path = request.volume_path.rsplit(".", 1)[0]  # Remove .jsonl
        train_path = f"{base_path}_train.jsonl"
        val_path = f"{base_path}_val.jsonl"

        # Write training data
        train_content = "\n".join(json.dumps(ex) for ex in train_examples)
        try:
            workspace_client.files.upload(
                train_path,
                BytesIO(train_content.encode("utf-8")),
                overwrite=True,
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to write training data: {str(e)}",
            )

        # Write validation data
        val_content = "\n".join(json.dumps(ex) for ex in val_examples)
        try:
            workspace_client.files.upload(
                val_path,
                BytesIO(val_content.encode("utf-8")),
                overwrite=True,
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to write validation data: {str(e)}",
            )

        train_count = len(train_examples)
        val_count = len(val_examples)

        logger.info(
            f"Exported training sheet {training_sheet_id} with train/val split: "
            f"{train_count} train, {val_count} val (seed={request.random_seed})"
        )
    else:
        # Write single file
        jsonl_content = "\n".join(json.dumps(ex) for ex in examples)
        try:
            workspace_client.files.upload(
                request.volume_path,
                BytesIO(jsonl_content.encode("utf-8")),
                overwrite=True,
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to write to volume: {str(e)}",
            )

        logger.info(
            f"Exported {len(examples)} examples from training sheet {training_sheet_id} to {request.volume_path}"
        )

    return ExportResponse(
        training_sheet_id=training_sheet_id,
        volume_path=request.volume_path,
        examples_exported=len(examples),
        format=request.format,
        excluded_count=excluded_count,
        train_path=train_path,
        val_path=val_path,
        train_count=train_count,
        val_count=val_count,
    )
