"""
Sheet Management API (PRD v2.3) - Dataset Definition Service
Sheets are lightweight pointers to Unity Catalog tables/volumes
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query, status
from databricks.sdk.errors import NotFound, PermissionDenied

from app.models.sheet_simple import (
    SheetCreateRequest,
    SheetUpdateRequest,
    SheetResponse,
    SheetListResponse
)
from app.services.sheet_service import SheetService

router = APIRouter(prefix="/sheets-v2", tags=["sheets-v2"])
logger = logging.getLogger(__name__)


@router.post("", response_model=SheetResponse, status_code=status.HTTP_201_CREATED)
async def create_sheet(sheet: SheetCreateRequest):
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
async def update_sheet(sheet_id: str, sheet_update: SheetUpdateRequest):
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
async def delete_sheet(sheet_id: str):
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
