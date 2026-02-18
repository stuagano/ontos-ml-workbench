"""
DSPy Integration Models

Pydantic models for DSPy signature export, optimization runs,
and the collaborative learning flywheel.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# =============================================================================
# Enums
# =============================================================================


class DSPyOptimizerType(str, Enum):
    """Supported DSPy optimizers."""

    BOOTSTRAP_FEWSHOT = "BootstrapFewShot"
    BOOTSTRAP_FEWSHOT_RS = "BootstrapFewShotWithRandomSearch"
    MIPRO = "MIPRO"
    COPRO = "COPRO"
    KNNFEWSHOT = "KNNFewShot"


class OptimizationRunStatus(str, Enum):
    """Status of a DSPy optimization run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExportFormat(str, Enum):
    """Output formats for DSPy export."""

    PYTHON_MODULE = "python_module"
    JSON_CONFIG = "json_config"
    NOTEBOOK = "notebook"


# =============================================================================
# DSPy Signature Models
# =============================================================================


class DSPyFieldSpec(BaseModel):
    """Specification for a DSPy input/output field."""

    name: str = Field(..., description="Field name (Python identifier)")
    description: str = Field(..., description="Field description for the prompt")
    field_type: str = Field(default="str", description="Python type hint")
    prefix: Optional[str] = Field(None, description="Custom prefix in prompt")
    required: bool = Field(default=True, description="Whether field is required")


class DSPySignature(BaseModel):
    """
    DSPy Signature definition.

    Maps a Databit template to a DSPy Signature class that can be
    used with dspy.Predict, dspy.ChainOfThought, etc.
    """

    signature_name: str = Field(..., description="Class name for the signature")
    docstring: str = Field(..., description="Signature docstring (task description)")

    # Input/output fields
    input_fields: list[DSPyFieldSpec] = Field(
        default_factory=list, description="Input field specifications"
    )
    output_fields: list[DSPyFieldSpec] = Field(
        default_factory=list, description="Output field specifications"
    )

    # Source reference
    databit_id: Optional[str] = Field(None, description="Source Databit/template ID")
    databit_version: Optional[str] = Field(None, description="Source version")

    class Config:
        json_schema_extra = {
            "example": {
                "signature_name": "DefectClassifier",
                "docstring": "Classify radiation safety defects from inspection images and sensor data.",
                "input_fields": [
                    {
                        "name": "image_description",
                        "description": "Description of the inspection image",
                        "field_type": "str",
                    },
                    {
                        "name": "sensor_readings",
                        "description": "JSON of sensor readings at time of inspection",
                        "field_type": "str",
                    },
                ],
                "output_fields": [
                    {
                        "name": "defect_type",
                        "description": "Type of defect: crack, corrosion, contamination, or none",
                        "field_type": "str",
                    },
                    {
                        "name": "severity",
                        "description": "Severity level: critical, major, minor, or cosmetic",
                        "field_type": "str",
                    },
                    {
                        "name": "confidence",
                        "description": "Confidence score between 0 and 1",
                        "field_type": "float",
                    },
                ],
            }
        }


class DSPyExample(BaseModel):
    """
    A single example for DSPy few-shot learning.

    Converted from Example Store format to DSPy-compatible format.
    """

    # The example data (field_name -> value)
    inputs: dict[str, Any] = Field(..., description="Input field values")
    outputs: dict[str, Any] = Field(..., description="Expected output values")

    # Metadata
    example_id: Optional[str] = Field(None, description="Source example ID")
    effectiveness_score: Optional[float] = Field(
        None, description="Historical effectiveness"
    )

    def to_dspy_example(self) -> dict[str, Any]:
        """Convert to format expected by dspy.Example."""
        return {**self.inputs, **self.outputs}


# =============================================================================
# DSPy Program Models
# =============================================================================


class DSPyModuleConfig(BaseModel):
    """Configuration for a DSPy module (Predict, ChainOfThought, etc.)."""

    module_type: str = Field(
        default="Predict", description="DSPy module class name"
    )  # Predict, ChainOfThought, ReAct, etc.
    signature_name: str = Field(..., description="Signature class to use")
    num_examples: int = Field(
        default=3, description="Number of few-shot examples to include"
    )
    temperature: float = Field(default=0.7, description="LLM temperature")
    max_tokens: int = Field(default=1024, description="Max output tokens")


class DSPyProgram(BaseModel):
    """
    Complete DSPy program definition.

    Includes signature, module configuration, and training examples.
    """

    program_name: str = Field(..., description="Name of the program")
    description: str = Field(default="", description="Program description")

    # Signature and module
    signature: DSPySignature
    module_config: DSPyModuleConfig

    # Training examples (from Example Store)
    training_examples: list[DSPyExample] = Field(
        default_factory=list, description="Few-shot training examples"
    )

    # Model configuration
    model_name: str = Field(
        default="databricks-meta-llama-3-1-70b-instruct",
        description="Foundation model to use",
    )

    # Source tracking
    databit_id: Optional[str] = Field(None, description="Source Databit ID")
    example_ids: list[str] = Field(
        default_factory=list, description="IDs of examples included"
    )


# =============================================================================
# Optimization Run Models
# =============================================================================


class OptimizationConfig(BaseModel):
    """Configuration for a DSPy optimization run."""

    optimizer_type: DSPyOptimizerType = Field(
        default=DSPyOptimizerType.BOOTSTRAP_FEWSHOT,
        description="Which DSPy optimizer to use",
    )

    # Optimizer-specific settings
    max_bootstrapped_demos: int = Field(
        default=4, description="Max examples to bootstrap"
    )
    max_labeled_demos: int = Field(
        default=16, description="Max labeled examples to use"
    )
    num_candidate_programs: int = Field(
        default=10, description="Number of candidate programs to evaluate"
    )

    # Evaluation settings
    num_trials: int = Field(default=100, description="Number of evaluation trials")
    metric_name: str = Field(
        default="accuracy", description="Primary metric to optimize"
    )

    # Resource limits
    max_runtime_minutes: int = Field(
        default=60, description="Maximum runtime in minutes"
    )


class OptimizationTrialResult(BaseModel):
    """Result of a single optimization trial."""

    trial_id: int
    score: float
    metrics: dict[str, float] = Field(default_factory=dict)
    examples_used: list[str] = Field(default_factory=list)
    prompt_version: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DSPyOptimizationRun(BaseModel):
    """
    A DSPy optimization run tracked in MLflow.

    Represents one execution of an optimizer on a program.
    """

    run_id: UUID = Field(default_factory=uuid4)
    mlflow_run_id: Optional[str] = Field(
        None, description="MLflow run ID for tracking"
    )

    # What we're optimizing
    program_name: str
    databit_id: str
    signature_name: str

    # Configuration
    config: OptimizationConfig

    # Status
    status: OptimizationRunStatus = Field(default=OptimizationRunStatus.PENDING)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    # Results
    best_score: Optional[float] = None
    best_trial_id: Optional[int] = None
    trial_results: list[OptimizationTrialResult] = Field(default_factory=list)

    # Examples that performed best
    top_example_ids: list[str] = Field(default_factory=list)

    # Databricks job reference
    job_run_id: Optional[str] = Field(
        None, description="Databricks job run ID if run as job"
    )

    # Metadata
    created_by: Optional[str] = None
    workspace_id: Optional[str] = None


class OptimizationRunCreate(BaseModel):
    """Request to create a new optimization run."""

    databit_id: str = Field(..., description="Databit/template to optimize")
    config: OptimizationConfig = Field(default_factory=OptimizationConfig)

    # Optional: specify which examples to use
    example_ids: Optional[list[str]] = Field(
        None, description="Specific examples to use (None = auto-select)"
    )

    # Optional: evaluation dataset
    eval_dataset_id: Optional[str] = Field(
        None, description="Dataset ID for evaluation"
    )


class OptimizationRunResponse(BaseModel):
    """Response for an optimization run."""

    run_id: UUID
    mlflow_run_id: Optional[str]
    status: OptimizationRunStatus
    databit_id: str
    program_name: str

    # Progress
    trials_completed: int = 0
    trials_total: int = 0
    current_best_score: Optional[float] = None

    # Timing
    started_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None

    # Results (when complete)
    best_score: Optional[float] = None
    top_example_ids: list[str] = Field(default_factory=list)


# =============================================================================
# Export Models
# =============================================================================


class DSPyExportRequest(BaseModel):
    """Request to export a Databit as DSPy code."""

    databit_id: str = Field(..., description="Databit to export")
    format: ExportFormat = Field(
        default=ExportFormat.PYTHON_MODULE, description="Output format"
    )

    # Example selection
    include_examples: bool = Field(
        default=True, description="Include few-shot examples"
    )
    max_examples: int = Field(default=5, description="Max examples to include")
    min_effectiveness: float = Field(
        default=0.0, description="Min effectiveness score for examples"
    )

    # Code generation options
    include_metrics: bool = Field(
        default=True, description="Include metric functions"
    )
    include_optimizer_setup: bool = Field(
        default=False, description="Include optimizer boilerplate"
    )


class DSPyExportResult(BaseModel):
    """Result of a DSPy export."""

    databit_id: str
    databit_name: str
    format: ExportFormat

    # Generated content
    signature_code: str = Field(..., description="DSPy Signature class code")
    program_code: str = Field(..., description="Complete program code")
    examples_json: Optional[str] = Field(
        None, description="Examples as JSON (if requested)"
    )

    # Metadata
    num_examples_included: int = 0
    example_ids: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    # Validation
    is_valid: bool = Field(default=True, description="Whether code validates")
    validation_errors: list[str] = Field(default_factory=list)


# =============================================================================
# Context Pool Models (for Lakebase integration)
# =============================================================================


class ContextPoolSession(BaseModel):
    """An agent session in the Context Pool."""

    session_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    agent_id: str
    agent_type: Optional[str] = None

    status: str = Field(default="active")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)

    # Handoff chain
    handed_off_from: Optional[UUID] = None
    handed_off_to: Optional[UUID] = None
    handoff_reason: Optional[str] = None


class ContextPoolEntry(BaseModel):
    """A single entry in the context pool (conversation turn, tool call, etc.)."""

    entry_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    entry_type: str  # user_message, agent_response, tool_call, decision, handoff_note
    content: dict[str, Any]
    sequence_num: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Which examples were used for this turn
    examples_used: list[UUID] = Field(default_factory=list)

    # For tool calls
    tool_name: Optional[str] = None
    tool_result: Optional[dict[str, Any]] = None
    tool_success: Optional[bool] = None


class HandoffContext(BaseModel):
    """Context package for agent handoff."""

    customer_id: str
    sessions: list[ContextPoolSession]
    entries: list[ContextPoolEntry]

    # Summary for quick context
    summary: Optional[str] = None
    key_decisions: list[str] = Field(default_factory=list)
    unresolved_issues: list[str] = Field(default_factory=list)

    # Recommended examples for the receiving agent
    recommended_examples: list[str] = Field(default_factory=list)


# =============================================================================
# Effectiveness Tracking Models
# =============================================================================


class EffectivenessEvent(BaseModel):
    """Real-time effectiveness event (stored in Lakebase, synced to Delta)."""

    event_id: UUID = Field(default_factory=uuid4)
    example_id: str
    agent_id: str
    session_id: Optional[UUID] = None

    event_type: str  # retrieved, used, successful, failed, feedback, correction
    outcome_positive: Optional[bool] = None
    confidence_score: Optional[float] = None

    # Feedback details
    feedback_type: Optional[str] = None  # thumbs_up, thumbs_down, correction, expert_review
    feedback_notes: Optional[str] = None
    corrected_output: Optional[dict[str, Any]] = None

    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    synced_to_delta: bool = False


class ActiveExampleCache(BaseModel):
    """Cached example in Lakebase for instant retrieval."""

    cache_id: UUID = Field(default_factory=uuid4)
    example_id: str
    example_version: int = 1

    domain: str
    function_name: Optional[str] = None
    databit_id: Optional[str] = None

    input_json: dict[str, Any]
    expected_output_json: dict[str, Any]
    explanation: Optional[str] = None

    # Real-time metrics
    effectiveness_score: float = 0.5
    usage_count: int = 0
    success_count: int = 0
    last_used_at: Optional[datetime] = None

    # Cache management
    cache_priority: int = 100
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    capability_tags: list[str] = Field(default_factory=list)
    search_keys: list[str] = Field(default_factory=list)
