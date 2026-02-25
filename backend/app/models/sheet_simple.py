"""
Simplified Pydantic models for Sheet (dataset definitions)
Matches schema in your_catalog.ontos_ml_workbench.sheets

These are the PRD v2.3 models - sheets as lightweight pointers to Unity Catalog data.
For the legacy spreadsheet-style sheets, see sheet.py
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from uuid import uuid4


class SheetBase(BaseModel):
    """Base fields shared across create/update/response"""
    name: str = Field(..., min_length=1, max_length=200, description="Sheet name")
    description: Optional[str] = Field(None, max_length=1000, description="Sheet description")
    source_type: Literal["uc_table", "uc_volume", "external"] = Field(
        default="uc_table", description="Source type: Unity Catalog table, volume, or external"
    )
    source_table: Optional[str] = Field(None, description="Unity Catalog table reference (catalog.schema.table)")
    source_volume: Optional[str] = Field(None, description="Unity Catalog volume path")
    source_path: Optional[str] = Field(None, description="Path within volume if source_type is uc_volume")

    item_id_column: Optional[str] = Field(None, description="Column name to use as item_ref in canonical labels")
    text_columns: Optional[List[str]] = Field(default_factory=list, description="Column names containing text data")
    image_columns: Optional[List[str]] = Field(default_factory=list, description="Column names with image paths")
    metadata_columns: Optional[List[str]] = Field(default_factory=list, description="Additional columns for context")

    sampling_strategy: Optional[str] = Field(default="all", description="Sampling strategy: all, random, stratified")
    sample_size: Optional[int] = Field(None, ge=1, description="Number of items to sample (null = all)")
    filter_expression: Optional[str] = Field(None, description="SQL WHERE clause to filter items")

    join_config: Optional[str] = Field(None, description="JSON: multi-source join configuration (sources, key mappings, join type)")

    status: Optional[str] = Field(default="active", description="Status: active, archived, deleted")

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        """Ensure source_type is valid"""
        if v not in ["uc_table", "uc_volume", "external"]:
            raise ValueError("source_type must be one of: uc_table, uc_volume, external")
        return v

    @field_validator("sampling_strategy", mode="before")
    @classmethod
    def validate_sampling_strategy(cls, v: Optional[str]) -> str:
        """Ensure sampling_strategy is valid, default to 'all' if None"""
        if v is None:
            return "all"
        if v not in ["all", "random", "stratified"]:
            raise ValueError("sampling_strategy must be one of: all, random, stratified")
        return v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        """Ensure status is valid, default to 'active' if None"""
        if v is None:
            return "active"
        if v not in ["active", "archived", "deleted"]:
            raise ValueError("status must be one of: active, archived, deleted")
        return v


class SheetCreateRequest(SheetBase):
    """Request model for creating a new Sheet"""
    pass


class SheetUpdateRequest(BaseModel):
    """Request model for updating a Sheet - all fields optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    source_type: Optional[Literal["uc_table", "uc_volume", "external"]] = None
    source_table: Optional[str] = None
    source_volume: Optional[str] = None
    source_path: Optional[str] = None

    item_id_column: Optional[str] = None
    text_columns: Optional[List[str]] = None
    image_columns: Optional[List[str]] = None
    metadata_columns: Optional[List[str]] = None

    sampling_strategy: Optional[str] = None
    sample_size: Optional[int] = Field(None, ge=1)
    filter_expression: Optional[str] = None

    join_config: Optional[str] = None

    status: Optional[str] = None


class SheetResponse(SheetBase):
    """Response model for Sheet with all fields including system-generated"""
    id: str = Field(..., description="Unique identifier")
    template_config: Optional[str] = Field(None, description="Attached template configuration (JSON string)")
    item_count: Optional[int] = Field(None, description="Cached count of items in dataset")
    last_validated_at: Optional[datetime] = Field(None, description="Last time source was validated")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="User who created the sheet")
    updated_at: datetime = Field(..., description="Last update timestamp")
    updated_by: str = Field(..., description="User who last updated the sheet")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "sheet-123e4567-e89b-12d3-a456-426614174000",
                "name": "PCB Defect Detection Dataset",
                "description": "Microscope images of PCBs with labeled defects",
                "source_type": "uc_volume",
                "source_volume": "/Volumes/your_catalog/ontos_ml_workbench/pcb_images",
                "source_path": "defect_images/",
                "item_id_column": "image_filename",
                "text_columns": [],
                "image_columns": ["image_path"],
                "metadata_columns": ["sensor_reading", "timestamp"],
                "sampling_strategy": "all",
                "status": "active",
                "item_count": 150,
                "created_at": "2026-02-06T10:00:00Z",
                "created_by": "user@example.com",
                "updated_at": "2026-02-06T10:00:00Z",
                "updated_by": "user@example.com"
            }
        }


class SheetListResponse(BaseModel):
    """Response for listing sheets"""
    sheets: List[SheetResponse]
    total: int
