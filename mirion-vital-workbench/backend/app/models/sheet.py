"""Pydantic models for AI Sheets - spreadsheet-style datasets with imported and AI-generated columns.

Key concepts (following GCP Vertex AI pattern):
- Sheet: Raw dataset with imported columns from Unity Catalog
- TemplateConfig: Transformation blueprint attached to a sheet (defines how to create prompts)
- AssembledDataset: Materialized result of applying template to sheet (actual prompt/response pairs)
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SheetStatus(str, Enum):
    """Sheet lifecycle status."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ColumnSourceType(str, Enum):
    """How the column data is sourced."""

    IMPORTED = "imported"  # Data comes from Unity Catalog table/volume
    GENERATED = (
        "generated"  # Data is AI-generated via prompt (DEPRECATED - use TemplateConfig)
    )


class ColumnDataType(str, Enum):
    """Data type of the column values."""

    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    IMAGE = "image"  # File path to image in volume
    OBJECT = "object"  # JSON object


class ImportConfig(BaseModel):
    """Configuration for importing a column from Unity Catalog."""

    catalog: str
    schema_name: str = Field(..., alias="schema")
    table: str
    column: str

    class Config:
        populate_by_name = True


class FewShotExample(BaseModel):
    """A few-shot example from manually edited cells."""

    input: dict[str, Any]  # Values from other columns in that row
    output: Any  # The manually edited value


class GenerationConfig(BaseModel):
    """Configuration for AI-generating a column. DEPRECATED - use TemplateConfig instead."""

    prompt: str  # Uses {{column_name}} syntax to reference other columns
    system_prompt: str | None = None
    model: str = "databricks-meta-llama-3-1-70b-instruct"
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=32000)
    examples: list[FewShotExample] | None = None  # Auto-populated from manual edits


# ============================================================================
# Template Config (GCP-style - attached to Sheet)
# ============================================================================


class ResponseSourceMode(str, Enum):
    """How responses are sourced for the training dataset."""

    EXISTING_COLUMN = "existing_column"  # Use pre-labeled data from a column
    AI_GENERATED = "ai_generated"  # AI suggests labels, human reviews
    MANUAL_LABELING = "manual_labeling"  # Human annotators provide labels


class ResponseSchemaField(BaseModel):
    """A field in the expected response schema."""

    name: str
    type: str  # string, number, boolean, array, object
    description: str | None = None
    required: bool = True
    options: list[str] | None = None  # For enum/select fields


class TemplateConfig(BaseModel):
    """
    Transformation blueprint attached to a Sheet.

    Defines how to transform raw dataset columns into model-ready prompts.
    Following GCP Vertex AI pattern: dataset.attach_template_config(template_config)

    Supports three workflows:
    - existing_column: Use pre-labeled data (Workflow A - ready for training)
    - ai_generated: AI suggests labels, human reviews (Workflow B - assisted labeling)
    - manual_labeling: Human annotators provide all labels (Workflow B - full manual)
    """

    # Prompt definition
    system_instruction: str | None = Field(
        default=None,
        description="System prompt providing context and instructions to the model",
    )
    prompt_template: str = Field(
        ...,
        description="User prompt template using {{column_name}} syntax to reference data columns",
    )

    # Response source configuration
    response_source_mode: ResponseSourceMode = Field(
        default=ResponseSourceMode.EXISTING_COLUMN,
        description="How to source responses: existing_column (pre-labeled), ai_generated, or manual_labeling",
    )
    response_column: str | None = Field(
        default=None,
        description="Column containing expected responses (required for existing_column mode)",
    )
    response_schema: list[ResponseSchemaField] | None = Field(
        default=None,
        description="Optional structured schema for the expected response",
    )

    # Model configuration (used for ai_generated mode)
    model: str = Field(
        default="databricks-meta-llama-3-1-70b-instruct",
        description="Model to use for generation",
    )
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=32000)

    # Metadata
    name: str | None = Field(
        default=None,
        description="Optional name for this template configuration",
    )
    description: str | None = None
    version: str = "1.0.0"


class TemplateConfigAttach(BaseModel):
    """Request body for attaching a template config to a sheet.

    Accepts a flat structure matching the frontend request format.
    """

    # Prompt definition
    system_instruction: str | None = None
    prompt_template: str

    # Response source configuration
    response_source_mode: ResponseSourceMode = ResponseSourceMode.EXISTING_COLUMN
    response_column: str | None = None
    response_schema: list[ResponseSchemaField] | None = None

    # Model configuration
    model: str = "databricks-meta-llama-3-1-70b-instruct"
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=32000)

    # Metadata
    name: str | None = None
    description: str | None = None

    @property
    def template_config(self) -> TemplateConfig:
        """Convert to TemplateConfig for storage."""
        return TemplateConfig(
            system_instruction=self.system_instruction,
            prompt_template=self.prompt_template,
            response_source_mode=self.response_source_mode,
            response_column=self.response_column,
            response_schema=self.response_schema,
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            name=self.name,
            description=self.description,
        )


class ColumnDefinition(BaseModel):
    """Definition of a column in an AI Sheet."""

    id: str
    name: str
    data_type: ColumnDataType = ColumnDataType.STRING
    source_type: ColumnSourceType

    # For imported columns
    import_config: ImportConfig | None = None

    # For generated columns (DEPRECATED - use sheet.template_config instead)
    generation_config: GenerationConfig | None = None

    # Column order (0-indexed)
    order: int = 0


# ============================================================================
# Request/Response Models
# ============================================================================


class ColumnCreate(BaseModel):
    """Request body for adding a column to a sheet."""

    name: str = Field(..., min_length=1, max_length=255)
    data_type: ColumnDataType = ColumnDataType.STRING
    source_type: ColumnSourceType
    import_config: ImportConfig | None = None
    generation_config: GenerationConfig | None = None


class ColumnUpdate(BaseModel):
    """Request body for updating a column."""

    name: str | None = Field(None, min_length=1, max_length=255)
    data_type: ColumnDataType | None = None
    import_config: ImportConfig | None = None
    generation_config: GenerationConfig | None = None
    order: int | None = None


class SheetCreate(BaseModel):
    """Request body for creating a sheet."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    columns: list[ColumnCreate] | None = None  # Can create with initial columns


class SheetUpdate(BaseModel):
    """Request body for updating a sheet."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class ColumnResponse(BaseModel):
    """Column response model."""

    id: str
    name: str
    data_type: ColumnDataType
    source_type: ColumnSourceType
    import_config: ImportConfig | None = None
    generation_config: GenerationConfig | None = None
    order: int

    class Config:
        from_attributes = True


class SheetResponse(BaseModel):
    """Sheet response model."""

    id: str
    name: str
    description: str | None = None
    version: str
    status: SheetStatus
    columns: list[ColumnResponse]

    # Attached template config (GCP-style)
    template_config: TemplateConfig | None = Field(
        default=None,
        description="Attached template configuration for transforming data to prompts",
    )
    has_template: bool = Field(
        default=False,
        description="Whether a template config is attached",
    )

    row_count: int | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SheetListResponse(BaseModel):
    """Response for listing sheets."""

    sheets: list[SheetResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Cell and Row Models (for data operations)
# ============================================================================


class CellValue(BaseModel):
    """A single cell value with metadata."""

    column_id: str
    value: Any
    source: str  # 'imported' | 'generated' | 'manual'
    generated_at: datetime | None = None
    edited_at: datetime | None = None  # If manually edited (becomes few-shot example)


class RowData(BaseModel):
    """Data for a single row in the sheet."""

    row_index: int
    cells: dict[str, CellValue]  # column_id -> CellValue


class SheetPreviewResponse(BaseModel):
    """Response for sheet preview (first N rows)."""

    sheet_id: str
    columns: list[ColumnResponse]
    rows: list[RowData]
    total_rows: int
    preview_rows: int


class CellUpdate(BaseModel):
    """Request body for updating a cell (for few-shot examples)."""

    value: Any


class GenerateRequest(BaseModel):
    """Request body for running AI generation."""

    column_ids: list[str] | None = None  # If None, generate all AI columns
    row_indices: list[int] | None = None  # If None, generate all rows
    include_examples: bool = True  # Include few-shot examples from manual edits


class GenerateResponse(BaseModel):
    """Response from AI generation."""

    sheet_id: str
    generated_cells: int
    errors: list[dict[str, Any]] | None = None


class ExportRequest(BaseModel):
    """Request body for exporting sheet to Delta table."""

    catalog: str
    schema_name: str = Field(..., alias="schema")
    table: str
    overwrite: bool = False

    class Config:
        populate_by_name = True


class ExportResponse(BaseModel):
    """Response from export operation."""

    sheet_id: str
    destination: str  # Full path: catalog.schema.table
    rows_exported: int


class FineTuningExportRequest(BaseModel):
    """Request body for exporting sheet as fine-tuning dataset."""

    # Target column (the AI column with labels)
    target_column_id: str

    # Where to save the JSONL file
    volume_path: str  # e.g., /Volumes/catalog/schema/volume/dataset.jsonl

    # Options
    include_only_verified: bool = True  # Only rows with human edits
    include_system_prompt: bool = True

    class Config:
        populate_by_name = True


class FineTuningExportResponse(BaseModel):
    """Response from fine-tuning export operation."""

    sheet_id: str
    volume_path: str
    examples_exported: int
    format: str = "openai_chat"  # Format of the JSONL
