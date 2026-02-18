"""Pydantic models for Example Store.

The Example Store is a managed service for storing and dynamically retrieving
few-shot examples. Examples are versioned, searchable via vector similarity,
and track effectiveness metrics over time.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ExampleDomain(str, Enum):
    """Predefined domains for example categorization."""

    DEFECT_DETECTION = "defect_detection"
    PREDICTIVE_MAINTENANCE = "predictive_maintenance"
    ANOMALY_DETECTION = "anomaly_detection"
    CALIBRATION = "calibration"
    DOCUMENT_EXTRACTION = "document_extraction"
    REMAINING_USEFUL_LIFE = "remaining_useful_life"
    GENERAL = "general"


class ExampleDifficulty(str, Enum):
    """Difficulty level of the example."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ExampleSource(str, Enum):
    """How the example was created."""

    HUMAN_AUTHORED = "human_authored"
    EXTRACTED_FROM_DATA = "extracted_from_data"
    SYNTHETIC = "synthetic"
    DSPY_OPTIMIZED = "dspy_optimized"


# -----------------------------------------------------------------------------
# Core Example Models
# -----------------------------------------------------------------------------


class ExampleCreate(BaseModel):
    """Request body for creating an example."""

    # Core content
    input: dict[str, Any] = Field(
        ...,
        description="The input that demonstrates the scenario (user query, data, etc.)",
    )
    expected_output: dict[str, Any] = Field(
        ...,
        description="The expected model response or behavior",
    )
    explanation: str | None = Field(
        None,
        description="Optional explanation of why this is the correct output",
    )

    # Associations
    databit_id: str | None = Field(
        None,
        description="ID of the DataBit/template this example belongs to",
    )

    # Categorization
    domain: ExampleDomain | str = Field(
        default=ExampleDomain.GENERAL,
        description="Domain or use case category",
    )
    function_name: str | None = Field(
        None,
        description="Tool/function this example demonstrates (for function calling)",
    )
    difficulty: ExampleDifficulty = Field(
        default=ExampleDifficulty.MEDIUM,
        description="Difficulty level of the example",
    )
    capability_tags: list[str] | None = Field(
        default=None,
        description="Tags describing capabilities this example demonstrates",
    )

    # Search
    search_keys: list[str] | None = Field(
        default=None,
        description="Semantic keys for similarity matching",
    )

    # Metadata
    source: ExampleSource = Field(
        default=ExampleSource.HUMAN_AUTHORED,
        description="How the example was created",
    )
    attribution_notes: str | None = Field(
        None,
        description="Notes about why this example is valuable",
    )


class ExampleUpdate(BaseModel):
    """Request body for updating an example."""

    input: dict[str, Any] | None = None
    expected_output: dict[str, Any] | None = None
    explanation: str | None = None
    databit_id: str | None = None
    domain: ExampleDomain | str | None = None
    function_name: str | None = None
    difficulty: ExampleDifficulty | None = None
    capability_tags: list[str] | None = None
    search_keys: list[str] | None = None
    source: ExampleSource | None = None
    attribution_notes: str | None = None
    quality_score: float | None = Field(None, ge=0, le=1)


class ExampleResponse(BaseModel):
    """Example response model with full details."""

    # Identity
    id: str = Field(..., alias="example_id")
    version: int = 1

    # Core content
    input: dict[str, Any]
    expected_output: dict[str, Any]
    explanation: str | None = None

    # Associations
    databit_id: str | None = None
    databit_name: str | None = None  # Joined from templates table

    # Categorization
    domain: str
    function_name: str | None = None
    difficulty: str
    capability_tags: list[str] | None = None

    # Search
    search_keys: list[str] | None = None
    has_embedding: bool = False

    # Quality & Effectiveness
    quality_score: float | None = None
    usage_count: int = 0
    effectiveness_score: float | None = None

    # Metadata
    source: str
    attribution_notes: str | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
        populate_by_name = True


class ExampleListResponse(BaseModel):
    """Response for listing examples."""

    examples: list[ExampleResponse]
    total: int
    page: int
    page_size: int


# -----------------------------------------------------------------------------
# Search Models
# -----------------------------------------------------------------------------


class ExampleSearchQuery(BaseModel):
    """Query for searching examples."""

    # Text/semantic search
    query_text: str | None = Field(
        None,
        description="Text to search for (will be embedded for similarity search)",
    )
    query_embedding: list[float] | None = Field(
        None,
        description="Pre-computed embedding for similarity search",
    )

    # Filters
    databit_id: str | None = None
    domain: ExampleDomain | str | None = None
    function_name: str | None = None
    difficulty: ExampleDifficulty | None = None
    capability_tags: list[str] | None = Field(
        None,
        description="Filter to examples with ANY of these tags",
    )
    min_quality_score: float | None = Field(None, ge=0, le=1)
    min_effectiveness_score: float | None = Field(None, ge=0, le=1)

    # Search parameters
    k: int = Field(default=10, ge=1, le=100, description="Number of results to return")
    similarity_threshold: float | None = Field(
        None,
        ge=0,
        le=1,
        description="Minimum similarity score (0-1) for vector search results",
    )

    # Sorting
    sort_by: str = Field(
        default="effectiveness_score",
        description="Field to sort by: effectiveness_score, quality_score, usage_count, created_at",
    )
    sort_desc: bool = True


class ExampleSearchResult(BaseModel):
    """A single search result with similarity score."""

    example: ExampleResponse
    similarity_score: float | None = Field(
        None,
        description="Cosine similarity score (0-1) if vector search was used",
    )
    match_type: str = Field(
        default="metadata",
        description="How this result matched: 'vector', 'metadata', or 'hybrid'",
    )


class ExampleSearchResponse(BaseModel):
    """Response for example search."""

    results: list[ExampleSearchResult]
    total_matches: int
    query_embedding_generated: bool = False
    search_type: str = Field(
        description="Type of search performed: 'vector', 'metadata', or 'hybrid'"
    )


# -----------------------------------------------------------------------------
# Effectiveness Tracking Models
# -----------------------------------------------------------------------------


class ExampleUsageEvent(BaseModel):
    """Record of an example being used."""

    example_id: str
    used_at: datetime = Field(default_factory=datetime.utcnow)
    context: str | None = Field(
        None,
        description="Context where example was used (e.g., 'dspy_optimization', 'agent_prompt')",
    )
    training_run_id: str | None = None
    model_id: str | None = None
    outcome: str | None = Field(
        None,
        description="Outcome of using this example: 'success', 'failure', 'unknown'",
    )


class ExampleEffectivenessUpdate(BaseModel):
    """Update effectiveness metrics for an example."""

    example_id: str
    success_count: int | None = Field(None, ge=0)
    failure_count: int | None = Field(None, ge=0)
    effectiveness_delta: float | None = Field(
        None,
        ge=-1,
        le=1,
        description="Change to add to effectiveness score",
    )


class ExampleEffectivenessStats(BaseModel):
    """Effectiveness statistics for an example."""

    example_id: str
    total_uses: int
    success_count: int
    failure_count: int
    success_rate: float | None
    effectiveness_score: float | None
    effectiveness_trend: str | None = Field(
        None,
        description="Trend direction: 'improving', 'declining', 'stable'",
    )
    last_used_at: datetime | None = None


# -----------------------------------------------------------------------------
# Dashboard Aggregation Models
# -----------------------------------------------------------------------------


class DailyUsagePoint(BaseModel):
    """Single data point for time-series visualization."""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    uses: int
    successes: int
    failures: int


class DomainEffectiveness(BaseModel):
    """Effectiveness stats aggregated by domain."""

    domain: str
    example_count: int
    total_uses: int
    success_rate: float | None
    avg_effectiveness: float | None


class FunctionEffectiveness(BaseModel):
    """Effectiveness stats aggregated by function name."""

    function_name: str
    example_count: int
    total_uses: int
    success_rate: float | None
    avg_effectiveness: float | None


class ExampleRankingItem(BaseModel):
    """Example with ranking info for top/bottom lists."""

    example_id: str
    domain: str
    function_name: str | None = None
    explanation: str | None = None
    effectiveness_score: float | None = None
    usage_count: int = 0
    success_rate: float | None = None


class EffectivenessDashboardStats(BaseModel):
    """Aggregated statistics for the effectiveness dashboard."""

    # Summary metrics
    total_examples: int
    examples_with_usage: int
    total_uses: int
    total_successes: int
    total_failures: int
    overall_success_rate: float | None
    avg_effectiveness_score: float | None

    # Time range
    period_days: int

    # Breakdowns
    domain_breakdown: list[DomainEffectiveness]
    function_breakdown: list[FunctionEffectiveness]

    # Time series
    daily_usage: list[DailyUsagePoint]

    # Rankings
    top_examples: list[ExampleRankingItem]
    bottom_examples: list[ExampleRankingItem]

    # Health indicators
    stale_examples_count: int = Field(
        description="Examples not used in last 30 days"
    )


# -----------------------------------------------------------------------------
# Batch Operation Models
# -----------------------------------------------------------------------------


class ExampleBatchCreate(BaseModel):
    """Request for batch creating examples."""

    examples: list[ExampleCreate] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of examples to create (max 100)",
    )
    generate_embeddings: bool = Field(
        default=True,
        description="Whether to generate embeddings for all examples",
    )


class ExampleBatchResponse(BaseModel):
    """Response for batch operations."""

    created_count: int
    failed_count: int
    created_ids: list[str]
    errors: list[dict[str, str]] | None = None


class ExampleImportRequest(BaseModel):
    """Request for importing examples from a data source."""

    source_type: str = Field(
        ...,
        description="Type of source: 'delta_table', 'json_file', 'curation_items'",
    )
    source_path: str = Field(
        ...,
        description="Path to the source (table name, file path, etc.)",
    )
    databit_id: str | None = None
    domain: ExampleDomain | str = ExampleDomain.GENERAL
    input_column: str = Field(default="input", description="Column containing input data")
    output_column: str = Field(default="output", description="Column containing expected output")
    filter_condition: str | None = Field(
        None,
        description="SQL WHERE clause to filter source data",
    )
    limit: int | None = Field(None, ge=1, le=10000)


# -----------------------------------------------------------------------------
# Embedding Models
# -----------------------------------------------------------------------------


class EmbeddingRequest(BaseModel):
    """Request to generate embeddings for examples."""

    example_ids: list[str] | None = Field(
        None,
        description="Specific example IDs to embed. If None, embeds all without embeddings.",
    )
    model: str = Field(
        default="databricks-bge-large-en",
        description="Embedding model to use",
    )
    force_regenerate: bool = Field(
        default=False,
        description="Regenerate embeddings even if they already exist",
    )


class EmbeddingResponse(BaseModel):
    """Response from embedding generation."""

    processed_count: int
    skipped_count: int
    error_count: int
    model_used: str
    errors: list[dict[str, str]] | None = None


# -----------------------------------------------------------------------------
# Vector Search Configuration
# -----------------------------------------------------------------------------


class VectorSearchIndexConfig(BaseModel):
    """Configuration for Vector Search index."""

    index_name: str = "example_store_index"
    endpoint_name: str | None = None
    embedding_dimension: int = 1024
    similarity_metric: str = "cosine"
    sync_mode: str = Field(
        default="TRIGGERED",
        description="Sync mode: 'TRIGGERED' or 'CONTINUOUS'",
    )


class VectorSearchSyncStatus(BaseModel):
    """Status of Vector Search index sync."""

    index_name: str
    last_sync_at: datetime | None
    rows_synced: int
    pending_rows: int
    sync_state: str = Field(
        description="State: 'SYNCED', 'SYNCING', 'PENDING', 'ERROR'"
    )
    error_message: str | None = None
