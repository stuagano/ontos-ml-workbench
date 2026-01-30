"""Pydantic models for Databits (Templates)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TemplateStatus(str, Enum):
    """Template lifecycle status."""

    DRAFT = "draft"
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
    """Request body for creating a template."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    # Schema
    input_schema: list[SchemaField] | None = None
    output_schema: list[SchemaField] | None = None

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
    """Request body for updating a template."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
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
    """Template response model."""

    id: str
    name: str
    description: str | None = None
    version: str
    status: TemplateStatus

    input_schema: list[SchemaField] | None = None
    output_schema: list[SchemaField] | None = None

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
