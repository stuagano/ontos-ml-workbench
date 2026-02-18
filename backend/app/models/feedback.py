"""Feedback models for IMPROVE stage."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class FeedbackRating(str, Enum):
    """User feedback rating."""

    positive = "positive"
    negative = "negative"


class FeedbackCreate(BaseModel):
    """Create feedback request."""

    endpoint_id: str = Field(..., description="ID of the endpoint")
    input_text: str = Field(..., description="User input/query")
    output_text: str = Field(..., description="Model output/response")
    rating: FeedbackRating = Field(..., description="Thumbs up or down")
    feedback_text: str | None = Field(None, description="Optional user comment")
    session_id: str | None = Field(None, description="Optional session ID")
    request_id: str | None = Field(None, description="Optional request ID for tracing")


class FeedbackResponse(BaseModel):
    """Feedback response."""

    id: str
    endpoint_id: str
    input_text: str
    output_text: str
    rating: FeedbackRating
    feedback_text: str | None = None
    session_id: str | None = None
    request_id: str | None = None
    created_by: str | None = None
    created_at: datetime


class FeedbackStats(BaseModel):
    """Feedback statistics."""

    endpoint_id: str | None = None
    total_count: int = 0
    positive_count: int = 0
    negative_count: int = 0
    positive_rate: float = 0.0
    with_comments_count: int = 0
    period_days: int = 30


class FeedbackListResponse(BaseModel):
    """Paginated feedback list."""

    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int
