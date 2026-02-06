"""Pydantic models for Canonical Labels (PRD v2.3).

Canonical Labels are expert-validated ground truth labels stored independently
of Q&A pairs and Training Sheets. They enable "label once, reuse everywhere"
workflow across multiple training iterations.

Key features:
- Composite unique key: (sheet_id, item_ref, label_type)
- Multiple labelsets per source item
- VARIANT label_data field for flexible annotation formats
- Usage constraints for data governance (PHI, PII, proprietary)
- Automatic reuse across Training Sheets
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LabelConfidence(str, Enum):
    """Expert confidence in the label."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DataClassification(str, Enum):
    """Data classification for governance."""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class UsageType(str, Enum):
    """Usage types for data governance."""

    TRAINING = "training"  # Fine-tuning (permanent in weights)
    VALIDATION = "validation"  # Training eval (permanent)
    EVALUATION = "evaluation"  # Benchmarking (temporary)
    FEW_SHOT = "few_shot"  # Runtime examples (ephemeral)
    TESTING = "testing"  # Manual QA (temporary)


# ============================================================================
# Canonical Label Models
# ============================================================================


class CanonicalLabelBase(BaseModel):
    """Base model for canonical labels."""

    sheet_id: str = Field(..., description="Sheet ID this label belongs to")
    item_ref: str = Field(
        ..., description="Reference to source item (e.g., inspection_id, invoice_id)"
    )
    label_type: str = Field(
        ...,
        description="Label type (e.g., entity_extraction, classification, localization)",
    )

    # Expert's ground truth label (flexible JSON)
    label_data: dict[str, Any] | list[Any] = Field(
        ..., description="Label data (entities, bounding boxes, classifications, etc.)"
    )

    # Quality metadata
    confidence: LabelConfidence = Field(
        default=LabelConfidence.HIGH, description="Expert confidence in label"
    )
    notes: str | None = Field(
        default=None, description="Optional notes about the label"
    )

    # Governance constraints (PRD v2.2)
    allowed_uses: list[UsageType] = Field(
        default=[
            UsageType.TRAINING,
            UsageType.VALIDATION,
            UsageType.EVALUATION,
            UsageType.FEW_SHOT,
            UsageType.TESTING,
        ],
        description="Permitted usage types",
    )
    prohibited_uses: list[UsageType] = Field(
        default=[], description="Explicitly forbidden usage types"
    )
    usage_reason: str | None = Field(
        default=None,
        description="Reason for usage constraints (e.g., 'Contains PHI - HIPAA compliance')",
    )
    data_classification: DataClassification = Field(
        default=DataClassification.INTERNAL, description="Data classification level"
    )


class CanonicalLabelCreate(CanonicalLabelBase):
    """Request body for creating a canonical label."""

    labeled_by: str = Field(..., description="User/expert who created the label")


class CanonicalLabelUpdate(BaseModel):
    """Request body for updating a canonical label."""

    label_data: dict[str, Any] | list[Any] | None = None
    confidence: LabelConfidence | None = None
    notes: str | None = None
    allowed_uses: list[UsageType] | None = None
    prohibited_uses: list[UsageType] | None = None
    usage_reason: str | None = None
    data_classification: DataClassification | None = None
    last_modified_by: str | None = None


class CanonicalLabelResponse(CanonicalLabelBase):
    """Response model for canonical labels."""

    id: str = Field(..., description="Canonical label UUID")

    # Audit trail
    labeled_by: str
    labeled_at: datetime
    last_modified_by: str | None = None
    last_modified_at: datetime | None = None

    # Version control
    version: int = Field(default=1, description="Label version number")

    # Statistics
    reuse_count: int = Field(
        default=0, description="How many Training Sheets use this label"
    )
    last_used_at: datetime | None = Field(
        default=None, description="Last time this label was used"
    )

    created_at: datetime

    class Config:
        from_attributes = True


class CanonicalLabelListResponse(BaseModel):
    """Response for listing canonical labels."""

    labels: list[CanonicalLabelResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Lookup and Query Models
# ============================================================================


class CanonicalLabelLookup(BaseModel):
    """Request for looking up a canonical label by composite key."""

    sheet_id: str
    item_ref: str
    label_type: str


class CanonicalLabelBulkLookup(BaseModel):
    """Request for bulk canonical label lookup."""

    sheet_id: str
    items: list[dict[str, str]]  # List of {item_ref, label_type}


class CanonicalLabelBulkLookupResponse(BaseModel):
    """Response for bulk canonical label lookup."""

    found: list[CanonicalLabelResponse]
    not_found: list[dict[str, str]]  # List of {item_ref, label_type} that weren't found
    found_count: int
    not_found_count: int


class CanonicalLabelStats(BaseModel):
    """Statistics about canonical labels for a sheet."""

    sheet_id: str
    total_labels: int
    labels_by_type: dict[str, int]  # label_type -> count
    coverage_percent: float | None = None  # % of sheet items with at least one label
    avg_reuse_count: float
    most_reused_labels: list[CanonicalLabelResponse] = Field(default=[], max_length=10)


# ============================================================================
# Validation and Governance Models
# ============================================================================


class UsageConstraintCheck(BaseModel):
    """Request to check if a canonical label can be used for a specific purpose."""

    canonical_label_id: str
    requested_usage: UsageType


class UsageConstraintCheckResponse(BaseModel):
    """Response from usage constraint check."""

    allowed: bool
    reason: str | None = None  # If not allowed, why?
    canonical_label_id: str
    requested_usage: UsageType


class CanonicalLabelBulkUsageCheck(BaseModel):
    """Bulk check usage constraints for multiple labels."""

    canonical_label_ids: list[str]
    requested_usage: UsageType


class CanonicalLabelBulkUsageCheckResponse(BaseModel):
    """Response from bulk usage constraint check."""

    allowed_labels: list[str]
    prohibited_labels: list[dict[str, Any]]  # [{id, reason}, ...]
    allowed_count: int
    prohibited_count: int


# ============================================================================
# Export Models (for Training Sheet generation)
# ============================================================================


class CanonicalLabelExportRequest(BaseModel):
    """Request to export canonical labels for Training Sheet generation."""

    sheet_id: str
    label_type: str
    usage_type: UsageType = Field(
        default=UsageType.TRAINING, description="What will the labels be used for?"
    )
    include_low_confidence: bool = Field(
        default=False, description="Include labels with low confidence?"
    )


class CanonicalLabelExportResponse(BaseModel):
    """Response from canonical label export."""

    sheet_id: str
    label_type: str
    labels_exported: int
    labels_filtered: int  # How many were filtered out (governance/confidence)
    filter_reasons: dict[str, int]  # reason -> count
    labels: list[CanonicalLabelResponse]


# ============================================================================
# Versioning Models
# ============================================================================


class CanonicalLabelVersion(BaseModel):
    """Historical version of a canonical label."""

    version: int
    label_data: dict[str, Any] | list[Any]
    confidence: LabelConfidence
    notes: str | None
    modified_by: str
    modified_at: datetime


class CanonicalLabelVersionHistory(BaseModel):
    """Complete version history for a canonical label."""

    canonical_label_id: str
    current_version: int
    versions: list[CanonicalLabelVersion]


# ============================================================================
# Multiple Labelsets Models
# ============================================================================


class ItemLabelsets(BaseModel):
    """All labelsets for a single source item."""

    sheet_id: str
    item_ref: str
    labelsets: list[CanonicalLabelResponse]  # All canonical labels for this item
    label_types: list[str]  # Unique label types available


class ItemLabelsetsListResponse(BaseModel):
    """Response for listing items with their labelsets."""

    items: list[ItemLabelsets]
    total_items: int
    page: int
    page_size: int
