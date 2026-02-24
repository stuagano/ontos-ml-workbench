"""Pydantic models for Labelsets - reusable label collections.

PRD v2.3: Labelsets are reusable collections of label definitions that can be
attached to TemplateConfigs and linked to canonical labels.

Key concepts:
- Labelset: Collection of label classes and response schema definitions
- LabelClass: Individual label definition (e.g., "solder_bridge", "defect")
- Linked to canonical labels via label_type
- Status workflow: draft → published → archived
- Versioned and governed for reusability
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LabelsetStatus(str, Enum):
    """Labelset lifecycle status."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class LabelClass(BaseModel):
    """A single label class definition."""

    name: str = Field(..., description="Label name (e.g., 'solder_bridge', 'defect')")
    display_name: str | None = Field(
        None, description="Human-readable name (e.g., 'Solder Bridge')"
    )
    color: str = Field(default="#6b7280", description="Hex color for UI display")
    description: str | None = Field(None, description="Description of this label class")
    hotkey: str | None = Field(
        None, description="Keyboard shortcut (e.g., '1', 'd', 'S')"
    )
    confidence_threshold: float | None = Field(
        None, ge=0, le=1, description="Minimum confidence threshold for this class"
    )


class ResponseSchemaField(BaseModel):
    """A field in the response schema."""

    name: str
    type: str = "string"  # string, number, boolean, array, object
    description: str | None = None
    required: bool = True
    options: list[str] | None = Field(
        None, description="For enum fields, list of valid options"
    )


class ResponseSchema(BaseModel):
    """JSON schema for expected response format."""

    type: str = "object"
    properties: dict[str, Any] = Field(
        default_factory=dict, description="Schema properties"
    )
    required: list[str] | None = Field(None, description="Required fields")
    examples: list[dict[str, Any]] | None = Field(None, description="Example responses")


class Labelset(BaseModel):
    """A reusable collection of label definitions."""

    id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    # Label definitions
    label_classes: list[LabelClass] = Field(
        default_factory=list, description="Available label classes for this labelset"
    )
    response_schema: ResponseSchema | None = Field(
        None, description="JSON schema for structured responses"
    )

    # Canonical labels association
    label_type: str = Field(
        ...,
        description="Label type identifier (links to canonical_labels.label_type)",
    )
    canonical_label_count: int = Field(
        default=0, description="Number of canonical labels using this labelset"
    )

    # Status and governance
    status: LabelsetStatus = LabelsetStatus.DRAFT
    version: str = "1.0.0"

    # Usage constraints
    allowed_uses: list[str] | None = Field(
        None,
        description="Permitted usage types (training, validation, testing, few_shot, production_inference)",
    )
    prohibited_uses: list[str] | None = Field(
        None, description="Explicitly forbidden usage types"
    )

    # Metadata
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_by: str | None = None
    published_at: datetime | None = None

    # Tags for organization
    tags: list[str] | None = Field(None, description="Tags for search/filter")
    use_case: str | None = Field(None, description="Primary use case")

    class Config:
        from_attributes = True


class LabelsetCreate(BaseModel):
    """Request to create a labelset."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    label_classes: list[LabelClass] = Field(default_factory=list)
    response_schema: ResponseSchema | None = None
    label_type: str = Field(
        ...,
        description="Label type identifier (e.g., 'defect_detection', 'classification')",
    )
    allowed_uses: list[str] | None = None
    prohibited_uses: list[str] | None = None
    tags: list[str] | None = None
    use_case: str | None = None


class LabelsetUpdate(BaseModel):
    """Request to update a labelset."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    label_classes: list[LabelClass] | None = None
    response_schema: ResponseSchema | None = None
    allowed_uses: list[str] | None = None
    prohibited_uses: list[str] | None = None
    tags: list[str] | None = None
    use_case: str | None = None
    version: str | None = None


class LabelsetListResponse(BaseModel):
    """Response for listing labelsets."""

    labelsets: list[Labelset]
    total: int
    page: int
    page_size: int


class LabelsetStats(BaseModel):
    """Statistics for a labelset."""

    labelset_id: str
    labelset_name: str
    canonical_label_count: int
    total_label_classes: int
    training_sheets_using_count: int = Field(
        default=0, description="Number of training sheets using this labelset"
    )
    training_jobs_count: int = Field(
        default=0, description="Number of training jobs using this labelset"
    )
    coverage_stats: dict[str, Any] | None = Field(
        None, description="Coverage statistics across training sheets"
    )
