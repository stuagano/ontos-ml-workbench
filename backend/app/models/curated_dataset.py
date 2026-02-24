"""Curated Dataset models for training-ready QA pairs."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DatasetStatus(str, Enum):
    """Status of a curated dataset."""

    DRAFT = "draft"
    APPROVED = "approved"
    IN_USE = "in_use"
    ARCHIVED = "archived"


class QualityMetrics(BaseModel):
    """Quality metrics for a curated dataset."""

    total_examples: int = 0
    avg_confidence: float = 0.0
    label_distribution: dict[str, int] = Field(default_factory=dict)
    response_length_avg: float = 0.0
    response_length_std: float = 0.0
    human_verified_count: int = 0
    ai_generated_count: int = 0
    pre_labeled_count: int = 0


class DatasetSplit(BaseModel):
    """Train/val/test split configuration."""

    train_pct: float = 0.8
    val_pct: float = 0.1
    test_pct: float = 0.1
    stratify_by: str | None = (
        None  # Field to stratify split by (e.g., 'label', 'sheet_id')
    )


class CuratedDataset(BaseModel):
    """A curated dataset for training."""

    id: str
    name: str
    description: str | None = None

    # Source tracking
    labelset_id: str | None = None  # Associated labelset
    training_sheet_ids: list[str] = Field(default_factory=list)  # Source training sheets

    # Configuration
    split_config: DatasetSplit | None = None
    quality_threshold: float = 0.7  # Minimum confidence/quality score

    # Metadata
    status: DatasetStatus = DatasetStatus.DRAFT
    version: str = "1.0.0"
    example_count: int = 0
    quality_metrics: QualityMetrics | None = None

    # Timestamps
    created_at: datetime | None = None
    created_by: str | None = None
    approved_at: datetime | None = None
    approved_by: str | None = None
    last_used_at: datetime | None = None

    # Governance
    tags: list[str] = Field(default_factory=list)
    use_case: str | None = None
    intended_models: list[str] = Field(default_factory=list)  # Target model types
    prohibited_uses: list[str] = Field(default_factory=list)


class CuratedDatasetCreate(BaseModel):
    """Create a new curated dataset."""

    name: str
    description: str | None = None
    labelset_id: str | None = None
    training_sheet_ids: list[str] = Field(default_factory=list)
    split_config: DatasetSplit | None = None
    quality_threshold: float = 0.7
    tags: list[str] = Field(default_factory=list)
    use_case: str | None = None
    intended_models: list[str] = Field(default_factory=list)
    prohibited_uses: list[str] = Field(default_factory=list)


class CuratedDatasetUpdate(BaseModel):
    """Update an existing curated dataset."""

    name: str | None = None
    description: str | None = None
    training_sheet_ids: list[str] | None = None
    split_config: DatasetSplit | None = None
    quality_threshold: float | None = None
    tags: list[str] | None = None
    use_case: str | None = None
    intended_models: list[str] | None = None
    prohibited_uses: list[str] | None = None


class DatasetExample(BaseModel):
    """A single QA example from the dataset."""

    example_id: str
    training_sheet_id: str
    prompt: str
    response: str
    label: str | None = None
    confidence: float | None = None
    source_mode: str  # EXISTING_COLUMN, AI_GENERATED, MANUAL_LABELING
    reviewed: bool = False
    split: str | None = None  # train, val, test


class DatasetPreview(BaseModel):
    """Preview of dataset examples."""

    dataset_id: str
    total_examples: int
    examples: list[DatasetExample]
    quality_metrics: QualityMetrics


class DatasetExport(BaseModel):
    """Export configuration for a dataset."""

    format: str = "jsonl"  # jsonl, csv, parquet
    include_metadata: bool = True
    split: str | None = None  # Export specific split or all


class ApprovalRequest(BaseModel):
    """Request to approve a dataset."""

    approved_by: str
    notes: str | None = None
