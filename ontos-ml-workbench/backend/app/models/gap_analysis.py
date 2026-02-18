"""Pydantic models for Gap Analysis."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class GapType(str, Enum):
    """Types of training data gaps."""

    COVERAGE = "coverage"  # Missing topics/categories
    QUALITY = "quality"  # Low quality in specific areas
    DISTRIBUTION = "distribution"  # Class imbalance
    CAPABILITY = "capability"  # Missing model skills
    EDGE_CASE = "edge_case"  # Unhandled rare scenarios


class GapSeverity(str, Enum):
    """Severity level of identified gaps."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GapStatus(str, Enum):
    """Status of a gap through its lifecycle."""

    IDENTIFIED = "identified"
    TASK_CREATED = "task_created"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    WONT_FIX = "wont_fix"


class TaskStatus(str, Enum):
    """Status of an annotation task."""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================================================
# Gap Analysis Request/Response Models
# ============================================================================


class GapAnalysisRequest(BaseModel):
    """Request to run gap analysis on a model."""

    model_name: str = Field(..., description="Name of the model to analyze")
    model_version: str = Field(..., description="Version of the model")
    template_id: str | None = Field(
        None, description="Template ID (auto-detected if not provided)"
    )
    analysis_types: list[str] = Field(
        default=["errors", "coverage", "quality", "emerging"],
        description="Types of analysis to run",
    )
    auto_create_tasks: bool = Field(
        default=False,
        description="Automatically create annotation tasks for critical gaps",
    )


class ErrorCluster(BaseModel):
    """A cluster of related model errors."""

    cluster_id: str
    topic: str
    error_count: int
    error_rate: float
    sample_queries: list[str]
    common_failure_mode: str | None = None
    suggested_gap_type: GapType
    severity: GapSeverity
    suggested_action: str
    estimated_records_needed: int


class CoverageGap(BaseModel):
    """A coverage distribution gap."""

    category: str
    actual_coverage: float
    expected_coverage: float
    gap_percentage: float
    severity: GapSeverity
    estimated_records_needed: int
    suggested_action: str


class QualityGap(BaseModel):
    """A quality gap in a data segment."""

    segment: str
    record_count: int
    quality_score: float
    issues: list[str]
    severity: GapSeverity
    suggested_action: str
    estimated_effort_hours: float


class EmergingTopic(BaseModel):
    """An emerging topic not well covered in training data."""

    topic: str
    query_count: int
    trend: str  # "new", "increasing", "stable"
    week_over_week_growth: float | None = None
    sample_queries: list[str]
    current_coverage: str  # "none", "minimal", "partial", "good"
    suggested_records: int
    priority: GapSeverity


class GapResponse(BaseModel):
    """A single identified gap."""

    gap_id: str
    gap_type: GapType
    severity: GapSeverity
    description: str
    evidence_summary: str | None = None
    suggested_action: str | None = None
    suggested_bit_name: str | None = None
    estimated_records_needed: int = 0
    status: GapStatus = GapStatus.IDENTIFIED
    priority: int = 50
    created_at: datetime | None = None


class GapAnalysisResponse(BaseModel):
    """Complete gap analysis results."""

    status: str
    model_name: str
    model_version: str
    analysis_timestamp: datetime
    gaps_found: int
    critical_gaps: int
    gaps: list[GapResponse]
    error_clusters: list[ErrorCluster] | None = None
    coverage_gaps: list[CoverageGap] | None = None
    quality_gaps: list[QualityGap] | None = None
    emerging_topics: list[EmergingTopic] | None = None
    tasks_created: list[str] = []
    recommendations: list[str] = []


# ============================================================================
# Gap Management Models
# ============================================================================


class GapCreate(BaseModel):
    """Request to manually create a gap record."""

    gap_type: GapType
    severity: GapSeverity
    description: str
    model_name: str | None = None
    template_id: str | None = None
    evidence_type: str | None = None
    evidence_summary: str | None = None
    affected_queries_count: int = 0
    error_rate: float | None = None
    suggested_action: str | None = None
    suggested_bit_name: str | None = None
    estimated_records_needed: int = 0


class GapUpdate(BaseModel):
    """Request to update a gap."""

    status: GapStatus | None = None
    severity: GapSeverity | None = None
    suggested_action: str | None = None
    resolution_notes: str | None = None


# ============================================================================
# Annotation Task Models
# ============================================================================


class AnnotationTaskCreate(BaseModel):
    """Request to create an annotation task."""

    title: str
    description: str | None = None
    instructions: str | None = None
    source_gap_id: str | None = None
    target_record_count: int = 100
    assigned_team: str | None = None
    priority: str = "medium"
    due_date: datetime | None = None
    target_schema: dict | None = None
    example_records: list[dict] | None = None


class AnnotationTaskUpdate(BaseModel):
    """Request to update an annotation task."""

    status: TaskStatus | None = None
    assigned_to: str | None = None
    assigned_team: str | None = None
    records_completed: int | None = None
    priority: str | None = None


class AnnotationTaskResponse(BaseModel):
    """Annotation task response."""

    task_id: str
    task_type: str
    title: str
    description: str | None = None
    instructions: str | None = None
    source_gap_id: str | None = None
    target_record_count: int
    records_completed: int = 0
    assigned_to: str | None = None
    assigned_team: str | None = None
    priority: str
    status: TaskStatus
    due_date: datetime | None = None
    output_bit_id: str | None = None
    created_at: datetime | None = None
    created_by: str | None = None

    class Config:
        from_attributes = True


# ============================================================================
# Gap List Response
# ============================================================================


class GapListResponse(BaseModel):
    """Response for listing gaps."""

    gaps: list[GapResponse]
    total: int
    page: int
    page_size: int
