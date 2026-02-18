"""Pydantic models for Attribution System."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AttributionMethod(str, Enum):
    """Attribution computation methods."""

    ABLATION = "ablation"  # Remove-one analysis (fast, O(n))
    SHAPLEY = "shapley"  # Game-theoretic fair attribution (expensive, O(2^n) or sampled)
    INFLUENCE = "influence"  # Influence function approximation
    GRADIENT = "gradient"  # Gradient-based importance


# ============================================================================
# Attribution Request/Response Models
# ============================================================================


class AttributionRequest(BaseModel):
    """Request to compute attribution for a model."""

    model_name: str = Field(..., description="Name of the model")
    model_version: str = Field(..., description="Version of the model")
    method: AttributionMethod = Field(
        default=AttributionMethod.ABLATION, description="Attribution method to use"
    )
    metrics: list[str] = Field(
        default=["accuracy", "f1_score"],
        description="Metrics to compute attribution for",
    )
    parallel: bool = Field(default=True, description="Run evaluations in parallel")
    max_workers: int = Field(default=4, description="Max parallel workers")


class BitContribution(BaseModel):
    """Contribution of a single data bit to model performance."""

    bit_id: str
    bit_version: int

    # Impact scores (positive = helps, negative = hurts)
    accuracy_impact: float = 0.0
    precision_impact: float = 0.0
    recall_impact: float = 0.0
    f1_impact: float = 0.0

    # Custom metrics
    custom_metrics: dict[str, float] = {}

    # Capability attribution
    capabilities: list[str] = []
    capability_scores: dict[str, float] = {}

    # Ranking
    importance_rank: int | None = None
    importance_score: float = 0.0
    confidence: float = 0.0


class AttributionResponse(BaseModel):
    """Complete attribution results for a model."""

    model_name: str
    model_version: str
    method: str
    computed_at: datetime | None = None

    # Summary stats
    total_bits: int
    positive_contributors: int
    negative_contributors: int
    neutral_contributors: int = 0

    # Full contributions
    contributions: list[BitContribution]

    # Quick access to top bits
    top_positive_bits: list[str]
    top_negative_bits: list[str]

    # Capability coverage
    capability_coverage: dict[str, list[str]] | None = None

    # Computation metadata
    compute_time_seconds: float = 0.0
    mlflow_run_id: str | None = None


# ============================================================================
# Attribution Comparison Models
# ============================================================================


class AttributionComparisonRequest(BaseModel):
    """Request to compare attribution between model versions."""

    model_name: str
    version_a: str
    version_b: str


class BitChange(BaseModel):
    """Change in a bit's attribution between versions."""

    bit_id: str
    bit_version: int
    change_type: str  # "added", "removed", "modified", "unchanged"
    importance_delta: float
    importance_a: float
    importance_b: float
    explanation: str | None = None


class AttributionComparisonResponse(BaseModel):
    """Comparison of attribution between two model versions."""

    model_name: str
    version_a: str
    version_b: str

    # Summary counts
    total_bits_a: int
    total_bits_b: int
    bits_added: int
    bits_removed: int
    bits_modified: int

    # Detailed changes
    changes: list[BitChange]
    top_impact_changes: list[BitChange]


# ============================================================================
# Regression Analysis Models
# ============================================================================


class RegressionAnalysisRequest(BaseModel):
    """Request to analyze a model regression."""

    model_name: str
    good_version: str  # Version with better performance
    bad_version: str  # Version with worse performance
    metrics_delta: dict[str, float] | None = None


class RegressionCause(BaseModel):
    """A likely cause of model regression."""

    cause_type: str  # "removed_important_bit", "harmful_new_bit", "bit_became_less_effective"
    bit_id: str
    bit_version: int
    impact: float
    explanation: str
    recommendation: str


class RegressionAnalysisResponse(BaseModel):
    """Analysis of what caused a model regression."""

    model_name: str
    good_version: str
    bad_version: str
    metrics_delta: dict[str, float] | None = None

    # Bit changes summary
    bit_changes: dict[str, int]

    # Identified causes
    likely_causes: list[RegressionCause]
    top_recommendation: str


# ============================================================================
# Bit Impact History Models
# ============================================================================


class BitImpactEntry(BaseModel):
    """A single entry in a bit's impact history."""

    model_name: str
    model_version: str
    attribution_method: str
    importance_rank: int | None
    importance_score: float
    accuracy_impact: float | None
    f1_impact: float | None
    computed_at: datetime | None


class BitImpactHistoryResponse(BaseModel):
    """History of a bit's impact across models."""

    bit_id: str
    impact_history: list[BitImpactEntry]
    summary: dict  # models_used_in, average_importance, trend
