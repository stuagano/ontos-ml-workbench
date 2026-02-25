"""
Sheet Management API (PRD v2.3) - Dataset Definition Service
Sheets are lightweight pointers to Unity Catalog tables/volumes
"""
import logging
import re
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from databricks.sdk.errors import NotFound, PermissionDenied

from app.core.auth import CurrentUser, require_permission

from app.models.sheet_simple import (
    SheetCreateRequest,
    SheetUpdateRequest,
    SheetResponse,
    SheetListResponse
)
from app.models.join_config import (
    SuggestJoinKeysRequest,
    SuggestJoinKeysResponse,
    PreviewJoinRequest,
    PreviewJoinResponse,
    MatchStats,
)
from app.services.sheet_service import SheetService
from app.services.join_service import JoinService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=SheetResponse, status_code=status.HTTP_201_CREATED)
async def create_sheet(sheet: SheetCreateRequest, _auth: CurrentUser = Depends(require_permission("sheets", "write"))):
    """
    Create a new sheet (dataset definition)

    A sheet is a lightweight pointer to Unity Catalog data sources.
    The source will be validated before creation.

    **Note:** Due to SQL warehouse write issues, this may timeout.
    Use Databricks notebooks for initial seed data instead.
    """
    try:
        service = SheetService()

        # Convert Pydantic model to dict
        sheet_data = sheet.model_dump(exclude_none=True)

        # Create sheet
        created = service.create_sheet(sheet_data)

        return SheetResponse(**created)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionDenied as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create sheet: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sheet: {str(e)}"
        )


@router.get("", response_model=SheetListResponse)
async def list_sheets(
    status_filter: Optional[str] = Query(None, description="Filter by status: active, archived, deleted"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of sheets to return")
):
    """
    List all sheets

    Returns sheets ordered by creation date (newest first).
    Deleted sheets are excluded by default unless explicitly filtered.
    """
    try:
        service = SheetService()
        sheets = service.list_sheets(status_filter=status_filter, limit=limit)

        return SheetListResponse(
            sheets=[SheetResponse(**s) for s in sheets],
            total=len(sheets)
        )

    except Exception as e:
        logger.error(f"Failed to list sheets: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sheets: {str(e)}"
        )


@router.post("/suggest-join-keys", response_model=SuggestJoinKeysResponse)
async def suggest_join_keys(request: SuggestJoinKeysRequest):
    """
    Suggest join keys between two Unity Catalog tables.

    Uses layered scoring: exact name match, suffix match, fuzzy match,
    type compatibility filter, and value overlap analysis for top candidates.
    """
    try:
        service = JoinService()
        suggestions = service.suggest_join_keys(
            source_table=request.source_table,
            target_table=request.target_table,
            sample_size=request.sample_size,
        )

        return SuggestJoinKeysResponse(
            source_table=request.source_table,
            target_table=request.target_table,
            suggestions=suggestions,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to suggest join keys: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to suggest join keys: {str(e)}"
        )


@router.post("/preview-join", response_model=PreviewJoinResponse)
async def preview_join(request: PreviewJoinRequest):
    """
    Execute a JOIN between multiple tables and return preview rows + match statistics.

    Returns the first N rows of the joined result, match stats comparing
    primary row count vs joined rows, and the generated SQL for transparency.
    """
    try:
        service = JoinService()
        result = service.preview_join(
            sources=request.sources,
            join_config=request.join_config,
            limit=request.limit,
        )

        return PreviewJoinResponse(
            rows=result["rows"],
            total_rows=result["total_rows"],
            match_stats=result["match_stats"],
            generated_sql=result["generated_sql"],
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to preview join: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview join: {str(e)}"
        )


@router.get("/{sheet_id}", response_model=SheetResponse)
async def get_sheet(sheet_id: str):
    """
    Get a sheet by ID

    Returns detailed information about a specific sheet including
    Unity Catalog source information and statistics.
    """
    try:
        service = SheetService()
        sheet = service.get_sheet(sheet_id)

        if not sheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        return SheetResponse(**sheet)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sheet: {str(e)}"
        )


@router.put("/{sheet_id}", response_model=SheetResponse)
async def update_sheet(sheet_id: str, sheet_update: SheetUpdateRequest, _auth: CurrentUser = Depends(require_permission("sheets", "write"))):
    """
    Update a sheet

    Only provided fields will be updated. All fields are optional.

    **Note:** Due to SQL warehouse write issues, this may timeout.
    """
    try:
        service = SheetService()

        # Convert to dict, excluding None values
        update_data = sheet_update.model_dump(exclude_none=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Update sheet
        updated = service.update_sheet(sheet_id, update_data)

        return SheetResponse(**updated)

    except NotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sheet: {str(e)}"
        )


@router.delete("/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sheet(sheet_id: str, _auth: CurrentUser = Depends(require_permission("sheets", "write"))):
    """
    Delete a sheet (soft delete)

    Sets the sheet status to 'deleted'. The sheet will not appear in
    list results unless explicitly filtered for deleted status.

    **Note:** Due to SQL warehouse write issues, this may timeout.
    """
    try:
        service = SheetService()

        # Check if sheet exists
        existing = service.get_sheet(sheet_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        # Soft delete
        service.delete_sheet(sheet_id)

        return None  # 204 No Content

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete sheet: {str(e)}"
        )


@router.get("/{sheet_id}/validate", response_model=dict)
async def validate_sheet_source(sheet_id: str):
    """
    Validate that the sheet's Unity Catalog source is still accessible

    Checks:
    - Table/volume exists
    - User has access permissions
    - Gets current row count (for tables)
    - Gets column list (for tables)

    Returns validation results and updated metadata.
    """
    try:
        service = SheetService()

        sheet = service.get_sheet(sheet_id)
        if not sheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        validation_result = {
            "sheet_id": sheet_id,
            "source_type": sheet["source_type"],
            "valid": False,
            "errors": [],
            "metadata": {}
        }

        # Validate based on source type
        try:
            if sheet["source_type"] == "uc_table" and sheet.get("source_table"):
                service.validate_uc_table(sheet["source_table"])
                row_count = service.get_table_row_count(sheet["source_table"])
                columns = service.get_table_columns(sheet["source_table"])

                validation_result["valid"] = True
                validation_result["metadata"] = {
                    "row_count": row_count,
                    "columns": columns,
                    "column_count": len(columns)
                }

            elif sheet["source_type"] == "uc_volume" and sheet.get("source_volume"):
                service.validate_uc_volume(sheet["source_volume"])
                validation_result["valid"] = True
                validation_result["metadata"] = {
                    "volume_path": sheet["source_volume"]
                }

        except NotFound as e:
            validation_result["errors"].append(f"Source not found: {str(e)}")
        except PermissionDenied as e:
            validation_result["errors"].append(f"Access denied: {str(e)}")
        except Exception as e:
            validation_result["errors"].append(f"Validation error: {str(e)}")

        return validation_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate sheet: {str(e)}"
        )


@router.get("/{sheet_id}/preview")
async def get_sheet_preview(
    sheet_id: str,
    limit: int = Query(default=50, ge=1, le=1000, description="Maximum rows to return")
):
    """
    Get preview data from the sheet's source table

    Returns the first N rows from the Unity Catalog source table.
    Only works for sheets with source_type='uc_table' and a valid source_table.
    """
    try:
        service = SheetService()

        # Get sheet metadata
        sheet = service.get_sheet(sheet_id)
        if not sheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        # Validate source
        if sheet["source_type"] != "uc_table":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Preview only supported for uc_table sources, got: {sheet['source_type']}"
            )

        source_table = sheet.get("source_table")
        if not source_table:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sheet has no source_table configured"
            )

        # If sheet has join_config, use JOIN query for preview
        join_config_str = sheet.get("join_config")
        if join_config_str:
            import json
            from app.models.join_config import MultiDatasetConfig as MDC
            try:
                mdc = MDC.model_validate(json.loads(join_config_str))
                join_svc = JoinService()
                result = join_svc.preview_join(
                    sources=mdc.sources,
                    join_config=mdc.join_config,
                    limit=limit,
                )
                return {
                    "sheet_id": sheet_id,
                    "source_table": source_table,
                    "rows": result["rows"],
                    "count": result["total_rows"],
                    "limit": limit,
                    "join_active": True,
                }
            except Exception as e:
                logger.warning(f"Join preview failed, falling back to single-table: {e}")

        # Single-table preview (default)
        preview_data = service.get_table_preview(source_table, limit=limit)

        return {
            "sheet_id": sheet_id,
            "source_table": source_table,
            "rows": preview_data["rows"],
            "count": preview_data["count"],
            "limit": limit
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get preview for sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get preview: {str(e)}"
        )


@router.post("/{sheet_id}/attach-template", response_model=SheetResponse, status_code=status.HTTP_200_OK)
async def attach_template(sheet_id: str, template_config: dict, _auth: CurrentUser = Depends(require_permission("sheets", "write"))):
    """
    Attach template configuration to a sheet

    Stores the template configuration in the sheet metadata.
    The template will be used to generate Q&A pairs from the sheet data.

    Note: This is a simplified version for PRD v2.3 sheets with column name arrays.
    """
    try:
        service = SheetService()

        # Get sheet
        sheet = service.get_sheet(sheet_id)
        if not sheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        # Validate that template references valid columns
        import re
        prompt_template = template_config.get("prompt_template", "")
        referenced_placeholders = set(re.findall(r"\{\{([^}]+)\}\}", prompt_template))

        # Get all column names from the sheet
        all_columns = set()
        all_columns.update(sheet.get("text_columns") or [])
        all_columns.update(sheet.get("image_columns") or [])
        all_columns.update(sheet.get("metadata_columns") or [])

        # Get column_mapping if provided (enables template reusability)
        column_mapping = template_config.get("column_mapping")

        if column_mapping:
            # Validate column mapping mode:
            # 1. All placeholders must have a mapping
            missing_mappings = referenced_placeholders - set(column_mapping.keys())
            if missing_mappings:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Column mapping missing for placeholders: {', '.join(sorted(missing_mappings))}. "
                           f"Provide mappings for all template placeholders."
                )

            # 2. All mapped columns must exist in the sheet
            invalid_columns = set(column_mapping.values()) - all_columns
            if invalid_columns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mapped columns not found in sheet: {', '.join(sorted(invalid_columns))}. "
                           f"Available columns: {', '.join(sorted(all_columns))}"
                )
        else:
            # Backward compatible: direct name matching (placeholder must equal column name)
            invalid_refs = referenced_placeholders - all_columns
            if invalid_refs:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Template references unknown columns: {', '.join(sorted(invalid_refs))}. "
                           f"Available: {', '.join(sorted(all_columns))}. "
                           f"Tip: Use column_mapping to map template placeholders to sheet columns."
                )

        # Update sheet with template config
        import json
        template_json = json.dumps(template_config)

        # Escape for SQL safety: backslashes first (so we don't double-escape), then single quotes
        template_json_escaped = template_json.replace("\\", "\\\\").replace("'", "''")

        from app.services.sql_service import get_sql_service
        sql_service = get_sql_service()

        sql = f"""
        UPDATE {service.table_name}
        SET template_config = '{template_json_escaped}',
            updated_at = CURRENT_TIMESTAMP()
        WHERE id = '{sheet_id}'
        """

        sql_service.execute_update(sql)

        # Return updated sheet
        updated_sheet = service.get_sheet(sheet_id)
        return SheetResponse(**updated_sheet)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to attach template to sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to attach template: {str(e)}"
        )


@router.post("/{sheet_id}/generate-training-sheet", status_code=status.HTTP_201_CREATED)
async def generate_training_sheet(sheet_id: str, request: dict, _auth: CurrentUser = Depends(require_permission("sheets", "write"))):
    """
    Generate Q&A pairs from sheet data + template (PRD v2.3)

    Creates a Training Sheet by:
    1. Reading rows from the Unity Catalog source table
    2. Rendering the prompt template with each row's data
    3. Creating messages in OpenAI chat format
    4. Storing in training_sheets and qa_pairs tables

    Returns the training_sheet_id and row count.
    """
    try:
        import uuid
        import json
        from app.core.databricks import get_current_user
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        service = SheetService()
        sql_service = get_sql_service()
        settings = get_settings()

        # Get sheet
        sheet = service.get_sheet(sheet_id)
        if not sheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sheet not found: {sheet_id}"
            )

        # Get source table
        source_table = sheet.get("source_table")
        if not source_table:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sheet has no source_table configured"
            )

        # Get template config from sheet
        template_config = sheet.get("template_config")
        if not template_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sheet has no template attached. Call attach-template first."
            )

        # Parse template_config if it's a string
        if isinstance(template_config, str):
            try:
                template_config = json.loads(template_config)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse template_config JSON: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Invalid template config JSON: {str(e)}"
                )

        # Get preview data
        limit = request.get("row_limit", 10000)
        preview_data = service.get_table_preview(source_table, limit=limit)

        # Create training sheet record
        training_sheet_id = f"ts-{uuid.uuid4()}"
        user = get_current_user()
        name = request.get("name", f"{sheet['name']} Training Data")
        description = request.get("description", f"Generated from {sheet['name']}")
        template_id = template_config.get("template_id", "unknown")

        # Extract ML configuration from template_config
        feature_columns = template_config.get("feature_columns", [])
        target_column = template_config.get("target_column")

        # Escape values for SQL
        name_escaped = name.replace("\\", "\\\\").replace("'", "''")
        desc_escaped = (description or "").replace("\\", "\\\\").replace("'", "''")

        def escape_sql(s):
            if s is None:
                return "NULL"
            return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"

        # Build feature_columns array SQL
        if feature_columns and len(feature_columns) > 0:
            feature_cols_sql = "ARRAY(" + ", ".join([escape_sql(col) for col in feature_columns]) + ")"
        else:
            feature_cols_sql = "NULL"

        training_sheets_table = settings.get_table("training_sheets")

        sql = f"""
        INSERT INTO {training_sheets_table} (
            id, name, description, sheet_id, template_id, template_version,
            feature_columns, target_column,
            generation_mode, model_used, generation_params,
            status, generation_started_at, generation_completed_at, generation_error,
            total_items, generated_count, approved_count, rejected_count, auto_approved_count,
            reviewed_by, reviewed_at, approval_rate,
            exported_at, exported_by, export_path, export_format,
            created_by, created_at, updated_by, updated_at
        ) VALUES (
            '{training_sheet_id}',
            '{name_escaped}',
            '{desc_escaped}',
            '{sheet_id}',
            '{template_id}',
            NULL,
            {feature_cols_sql},
            {escape_sql(target_column)},
            'template_based',
            NULL,
            NULL,
            'review',
            CURRENT_TIMESTAMP(),
            NULL,
            NULL,
            {len(preview_data['rows'])},
            {len(preview_data['rows'])},
            0,
            0,
            0,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            '{user}',
            CURRENT_TIMESTAMP(),
            '{user}',
            CURRENT_TIMESTAMP()
        )
        """

        logger.info(f"Creating training sheet {training_sheet_id} for sheet {sheet_id}")
        sql_service.execute_update(sql)

        # Create Q&A pairs using OpenAI chat format (batch insert for performance)
        qa_pairs_table = settings.get_table("qa_pairs")
        prompt_template = template_config.get("prompt_template", "")
        item_id_column = sheet.get("item_id_column") or "row_index"

        # Get column_mapping for template reusability (maps placeholder → sheet column)
        column_mapping = template_config.get("column_mapping") or {}

        # Extract all placeholders from the template for mapped rendering
        template_placeholders = set(re.findall(r"\{\{([^}]+)\}\}", prompt_template))

        # Build all VALUES clauses first
        values_clauses = []
        for idx, row_data in enumerate(preview_data['rows']):
            # Render prompt template with row data, applying column mapping
            user_message = prompt_template
            for placeholder in template_placeholders:
                # Use mapping if available, otherwise assume placeholder equals column name
                actual_column = column_mapping.get(placeholder, placeholder)
                col_value = row_data.get(actual_column, "")
                user_message = user_message.replace(f"{{{{{placeholder}}}}}", str(col_value or ""))

            # Get item_ref from row data
            item_ref = str(row_data.get(item_id_column, idx))
            item_ref_escaped = item_ref.replace("\\", "\\\\").replace("'", "''")

            # Create messages in OpenAI chat format
            messages = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": ""}  # Empty response - to be filled in review
            ]
            messages_json = json.dumps(messages).replace("\\", "\\\\").replace("'", "''")

            # Store source data in generation_metadata for display in review UI
            # (source_data column doesn't exist in qa_pairs table schema)
            generation_meta = {"source_data": row_data}
            generation_meta_json = json.dumps(generation_meta).replace("\\", "\\\\").replace("'", "''")

            qa_pair_id = f"{training_sheet_id}-{idx}"

            values_clause = f"""(
                '{qa_pair_id}',
                '{training_sheet_id}',
                '{sheet_id}',
                '{item_ref_escaped}',
                '{messages_json}',
                NULL,
                false,
                'pending',
                NULL,
                NULL,
                NULL,
                NULL,
                NULL,
                NULL,
                NULL,
                '{generation_meta_json}',
                {idx},
                '{user}',
                CURRENT_TIMESTAMP(),
                '{user}',
                CURRENT_TIMESTAMP()
            )"""
            values_clauses.append(values_clause)

        # Insert all Q&A pairs in a single statement
        qa_sql = f"""
        INSERT INTO {qa_pairs_table} (
            id, training_sheet_id, sheet_id, item_ref,
            messages, canonical_label_id, was_auto_approved,
            review_status, review_action, reviewed_by, reviewed_at,
            original_messages, edit_reason, quality_flags, quality_score,
            generation_metadata, sequence_number,
            created_by, created_at, updated_by, updated_at
        ) VALUES {', '.join(values_clauses)}
        """

        logger.info(f"Inserting {len(values_clauses)} Q&A pairs in batch...")
        sql_service.execute_update(qa_sql)
        logger.info(f"✓ Created {len(preview_data['rows'])} Q&A pairs for training sheet {training_sheet_id}")

        return {
            "training_sheet_id": training_sheet_id,
            "sheet_id": sheet_id,
            "status": "review",
            "total_items": len(preview_data['rows']),
            "message": f"Generated {len(preview_data['rows'])} Q&A pairs ready for review"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate training sheet from sheet {sheet_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate training sheet: {str(e)}"
        )
