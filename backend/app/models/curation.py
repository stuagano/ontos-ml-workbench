"""Pydantic models for Curation Items."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CurationStatus(str, Enum):
    """Curation item status."""

    PENDING = "pending"
    AUTO_APPROVED = "auto_approved"
    NEEDS_REVIEW = "needs_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class CurationItemCreate(BaseModel):
    """Request body for creating a curation item."""

    item_ref: str  # Row ID or file path
    item_data: dict  # Actual data matching template schema
    # Note: template_id comes from the URL path, not the request body


class CurationItemUpdate(BaseModel):
    """Request body for updating a curation item (human review)."""

    status: CurationStatus | None = None
    human_label: dict | None = None
    quality_score: float | None = Field(None, ge=0, le=5)
    review_notes: str | None = None


class CurationItemBulkUpdate(BaseModel):
    """Request body for bulk updating curation items."""

    item_ids: list[str]
    status: CurationStatus
    review_notes: str | None = None


class CurationItemResponse(BaseModel):
    """Curation item response model."""

    id: str
    template_id: str

    item_ref: str
    item_data: dict | None = None

    # AI labeling
    agent_label: dict | None = None
    agent_confidence: float | None = None
    agent_model: str | None = None
    agent_reasoning: str | None = None

    # Human review
    human_label: dict | None = None
    status: CurationStatus
    quality_score: float | None = None

    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CurationStatsResponse(BaseModel):
    """Statistics for a template's curation items."""

    template_id: str
    total: int
    pending: int
    auto_approved: int
    needs_review: int
    approved: int
    rejected: int
    flagged: int
    avg_confidence: float | None = None
    avg_quality_score: float | None = None


class CurationItemListResponse(BaseModel):
    """Paginated list of curation items."""

    items: list[CurationItemResponse]
    total: int
    page: int
    page_size: int
