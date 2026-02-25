"""Pydantic models for Templates (PRD v2.3: added label_type for canonical label matching).

Templates define reusable prompt configurations that can be applied to Sheets.
The label_type field links templates to canonical labels for automatic label reuse.

IMPORTANT - FIELD MAPPING:
    API Field               Database Column
    ------------------     ---------------------
    prompt_template    →   user_prompt_template
    base_model         →   (not stored - defaults used)
    temperature        →   (not stored - defaults used)
    max_tokens         →   (not stored - defaults used)
    examples           →   few_shot_examples (ARRAY<STRING>)
    output_schema      →   output_schema (JSON STRING)

See schemas/SCHEMA_REFERENCE.md for complete mapping.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TemplateStatus(str, Enum):
    """Template lifecycle status."""

    DRAFT = "draft"
    ACTIVE = "active"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SchemaField(BaseModel):
    """A field in the input/output schema."""

    name: str
    type: str  # string, number, boolean, array, object
    description: str | None = None
    required: bool = True


class Example(BaseModel):
    """A few-shot example for the template."""

    input: dict[str, str | int | float | bool | list | dict]
    output: dict[str, str | int | float | bool | list | dict]
    explanation: str | None = None


class TemplateCreate(BaseModel):
    """Request body for creating a template (PRD v2.3: added label_type)."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    # PRD v2.3: Label type for canonical label matching
    label_type: str | None = Field(
        default=None,
        description="Label type (e.g., entity_extraction, classification, localization) for canonical label matching",
    )

    # ML column configuration (CRITICAL for supervised learning)
    feature_columns: list[str] | None = Field(
        default=None,
        description="Independent variables (input features) - columns used to make predictions",
    )
    target_column: str | None = Field(
        default=None,
        description="Dependent variable (output/target) - the column we're trying to predict",
    )

    # Schema
    input_schema: list[SchemaField] | dict | None = None
    output_schema: list[SchemaField] | dict | None = None

    # Prompts
    prompt_template: str | None = None
    system_prompt: str | None = None

    # Examples
    examples: list[Example] | None = None

    # Model config
    base_model: str = "databricks-meta-llama-3-1-70b-instruct"
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=1, le=32000)

    # Source data
    source_catalog: str | None = None
    source_schema: str | None = None
    source_table: str | None = None
    source_volume: str | None = None


class TemplateUpdate(BaseModel):
    """Request body for updating a template (PRD v2.3: added label_type)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    label_type: str | None = None  # PRD v2.3

    # ML column configuration
    feature_columns: list[str] | None = None
    target_column: str | None = None

    input_schema: list[SchemaField] | None = None
    output_schema: list[SchemaField] | None = None
    prompt_template: str | None = None
    system_prompt: str | None = None
    examples: list[Example] | None = None
    base_model: str | None = None
    temperature: float | None = Field(None, ge=0, le=2)
    max_tokens: int | None = Field(None, ge=1, le=32000)
    source_catalog: str | None = None
    source_schema: str | None = None
    source_table: str | None = None
    source_volume: str | None = None


class TemplateResponse(BaseModel):
    """Template response model (PRD v2.3: added label_type)."""

    id: str
    name: str
    description: str | None = None
    version: str
    status: TemplateStatus

    # PRD v2.3: Label type for canonical label matching
    label_type: str | None = Field(
        default=None, description="Label type for canonical label matching"
    )

    # ML column configuration
    feature_columns: list[str] | None = Field(
        default=None, description="Independent variables (input features)"
    )
    target_column: str | None = Field(
        default=None, description="Dependent variable (output/target)"
    )

    input_schema: list[SchemaField] | dict | None = None
    output_schema: list[SchemaField] | dict | None = None

    prompt_template: str | None = None
    system_prompt: str | None = None
    examples: list[Example] | None = None

    base_model: str
    temperature: float
    max_tokens: int

    source_catalog: str | None = None
    source_schema: str | None = None
    source_table: str | None = None
    source_volume: str | None = None

    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Response for listing templates."""

    templates: list[TemplateResponse]
    total: int
    page: int
    page_size: int
