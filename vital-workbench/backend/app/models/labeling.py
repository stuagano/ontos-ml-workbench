"""
Labeling workflow models for annotation task management.

Inspired by Roboflow's labeling workflow:
- Labeling Jobs: Projects created from sheets
- Tasks: Batches of items assigned to labelers
- Items: Individual annotations with AI assist
- Users: Labelers, reviewers, managers
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# =============================================================================
# Enums
# =============================================================================


class JobStatus(str, Enum):
    """Labeling job lifecycle status"""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TaskStatus(str, Enum):
    """Task (batch) lifecycle status"""

    PENDING = "pending"  # Not yet assigned
    ASSIGNED = "assigned"  # Assigned but not started
    IN_PROGRESS = "in_progress"  # Labeler working on it
    SUBMITTED = "submitted"  # Labeler finished, awaiting review
    REVIEW = "review"  # Under review
    APPROVED = "approved"  # Passed review
    REJECTED = "rejected"  # Failed review
    REWORK = "rework"  # Sent back for corrections


class ItemStatus(str, Enum):
    """Individual item annotation status"""

    PENDING = "pending"
    AI_LABELED = "ai_labeled"
    HUMAN_LABELED = "human_labeled"
    REVIEWED = "reviewed"
    FLAGGED = "flagged"
    SKIPPED = "skipped"


class ReviewStatus(str, Enum):
    """Item review outcome"""

    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_CORRECTION = "needs_correction"


class UserRole(str, Enum):
    """User role in the labeling workspace"""

    LABELER = "labeler"  # Can label assigned tasks
    REVIEWER = "reviewer"  # Can review submitted tasks
    MANAGER = "manager"  # Can create jobs, assign tasks
    ADMIN = "admin"  # Full access


class Priority(str, Enum):
    """Task priority levels"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AssignmentStrategy(str, Enum):
    """How to assign tasks to labelers"""

    MANUAL = "manual"  # Manager assigns manually
    ROUND_ROBIN = "round_robin"  # Rotate through available labelers
    LOAD_BALANCED = "load_balanced"  # Assign to least busy labeler


class LabelFieldType(str, Enum):
    """Types of label fields"""

    TEXT = "text"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    NUMBER = "number"
    BOOLEAN = "boolean"
    BOUNDING_BOX = "bounding_box"
    POLYGON = "polygon"


# =============================================================================
# Label Schema Models
# =============================================================================


class LabelField(BaseModel):
    """Definition of a single label field"""

    id: str
    name: str
    field_type: LabelFieldType
    required: bool = True
    options: list[str] | None = None  # For select/multi_select
    min_value: float | None = None  # For number
    max_value: float | None = None  # For number
    default_value: Any | None = None
    description: str | None = None


class LabelSchema(BaseModel):
    """Schema defining what labelers need to annotate"""

    fields: list[LabelField]


# =============================================================================
# Labeling Job Models
# =============================================================================


class LabelingJobBase(BaseModel):
    """Base labeling job fields"""

    name: str
    description: str | None = None
    sheet_id: str
    target_columns: list[str]  # Column IDs to label
    label_schema: LabelSchema
    instructions: str | None = None  # Markdown instructions
    ai_assist_enabled: bool = True
    ai_model: str | None = None
    assignment_strategy: AssignmentStrategy = AssignmentStrategy.MANUAL
    default_batch_size: int = Field(default=50, ge=1, le=500)


class LabelingJobCreate(LabelingJobBase):
    """Create a new labeling job"""

    pass


class LabelingJobUpdate(BaseModel):
    """Update labeling job (partial)"""

    name: str | None = None
    description: str | None = None
    instructions: str | None = None
    ai_assist_enabled: bool | None = None
    ai_model: str | None = None
    assignment_strategy: AssignmentStrategy | None = None
    default_batch_size: int | None = None


class LabelingJobResponse(LabelingJobBase):
    """Labeling job response with computed fields"""

    id: str
    status: JobStatus

    # Stats (computed)
    total_items: int = 0
    labeled_items: int = 0
    reviewed_items: int = 0
    approved_items: int = 0

    # Metadata
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LabelingJobStats(BaseModel):
    """Detailed statistics for a labeling job"""

    job_id: str
    total_items: int

    # Progress by status
    pending_items: int
    ai_labeled_items: int
    human_labeled_items: int
    reviewed_items: int
    approved_items: int
    rejected_items: int
    flagged_items: int
    skipped_items: int

    # Task stats
    total_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    submitted_tasks: int
    approved_tasks: int

    # Quality metrics
    ai_human_agreement_rate: float | None = None
    approval_rate: float | None = None
    rework_rate: float | None = None

    # Time metrics
    avg_time_per_item: float | None = None  # Seconds
    estimated_completion: datetime | None = None


# =============================================================================
# Labeling Task (Batch) Models
# =============================================================================


class LabelingTaskBase(BaseModel):
    """Base task fields"""

    name: str | None = None
    item_indices: list[int]  # Row indices from sheet
    priority: Priority = Priority.NORMAL
    due_date: datetime | None = None


class LabelingTaskCreate(LabelingTaskBase):
    """Create a new task/batch"""

    pass


class LabelingTaskBulkCreate(BaseModel):
    """Create multiple tasks by splitting items"""

    batch_size: int = Field(default=50, ge=1, le=500)
    priority: Priority = Priority.NORMAL


class LabelingTaskAssign(BaseModel):
    """Assign a task to a user"""

    assigned_to: str  # User email


class LabelingTaskResponse(LabelingTaskBase):
    """Task response with status and progress"""

    id: str
    job_id: str
    item_count: int

    # Assignment
    assigned_to: str | None = None
    assigned_at: datetime | None = None

    # Status
    status: TaskStatus

    # Progress
    labeled_count: int = 0
    started_at: datetime | None = None
    submitted_at: datetime | None = None

    # Review
    reviewer: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    rejection_reason: str | None = None

    # Metadata
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TaskReviewAction(BaseModel):
    """Review action for a task"""

    action: str  # approve | reject | rework
    notes: str | None = None
    rejection_reason: str | None = None


# =============================================================================
# Labeled Item Models
# =============================================================================


class LabeledItemBase(BaseModel):
    """Base labeled item fields"""

    row_index: int


class LabeledItemUpdate(BaseModel):
    """Update labels for an item"""

    human_labels: dict[str, Any]
    is_difficult: bool = False
    needs_discussion: bool = False


class LabeledItemSkip(BaseModel):
    """Skip an item"""

    skip_reason: str


class LabeledItemFlag(BaseModel):
    """Flag an item"""

    is_difficult: bool = False
    needs_discussion: bool = False
    notes: str | None = None


class LabeledItemResponse(LabeledItemBase):
    """Labeled item response"""

    id: str
    task_id: str
    job_id: str

    # AI suggestions
    ai_labels: dict[str, Any] | None = None
    ai_confidence: float | None = None

    # Human labels
    human_labels: dict[str, Any] | None = None
    labeled_by: str | None = None
    labeled_at: datetime | None = None

    # Status
    status: ItemStatus

    # Review
    review_status: ReviewStatus | None = None
    review_notes: str | None = None
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None

    # Flags
    is_difficult: bool = False
    needs_discussion: bool = False
    skip_reason: str | None = None

    # Row data from sheet (for display)
    row_data: dict[str, Any] | None = None

    # Metadata
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BulkLabelRequest(BaseModel):
    """Label multiple items at once"""

    items: list[dict[str, Any]]  # List of {item_id, human_labels}


# =============================================================================
# User Models
# =============================================================================


class WorkspaceUserBase(BaseModel):
    """Base user fields"""

    email: str
    display_name: str
    role: UserRole = UserRole.LABELER
    max_concurrent_tasks: int = Field(default=5, ge=1, le=20)


class WorkspaceUserCreate(WorkspaceUserBase):
    """Create a new user"""

    pass


class WorkspaceUserUpdate(BaseModel):
    """Update user (partial)"""

    display_name: str | None = None
    role: UserRole | None = None
    max_concurrent_tasks: int | None = None
    is_active: bool | None = None


class WorkspaceUserResponse(WorkspaceUserBase):
    """User response with stats"""

    id: str

    # Capacity
    current_task_count: int = 0

    # Stats
    total_labeled: int = 0
    total_reviewed: int = 0
    accuracy_score: float | None = None
    avg_time_per_item: float | None = None

    # Status
    is_active: bool = True
    last_active_at: datetime | None = None

    # Metadata
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserStats(BaseModel):
    """Detailed user statistics"""

    user_id: str
    email: str

    # Counts
    total_labeled: int
    total_approved: int
    total_rejected: int
    total_reviewed: int

    # Rates
    accuracy_rate: float | None = None
    approval_rate: float | None = None

    # Time
    avg_time_per_item: float | None = None
    total_time_spent: float | None = None  # Seconds

    # Current work
    active_tasks: int
    pending_review: int


# =============================================================================
# List Response Models
# =============================================================================


class LabelingJobList(BaseModel):
    """Paginated list of labeling jobs"""

    jobs: list[LabelingJobResponse]
    total: int
    page: int
    page_size: int


class LabelingTaskList(BaseModel):
    """Paginated list of tasks"""

    tasks: list[LabelingTaskResponse]
    total: int
    page: int
    page_size: int


class LabeledItemList(BaseModel):
    """Paginated list of labeled items"""

    items: list[LabeledItemResponse]
    total: int
    page: int
    page_size: int


class WorkspaceUserList(BaseModel):
    """Paginated list of users"""

    users: list[WorkspaceUserResponse]
    total: int
    page: int
    page_size: int
