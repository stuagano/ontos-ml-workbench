"""Pydantic models for Agent Framework Integration.

These models support the REST API that agents call to retrieve
few-shot examples for prompt injection with automatic usage tracking.
"""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AgentExampleRequest(BaseModel):
    """Request for retrieving examples for agent prompt injection."""

    query: str = Field(..., description="The query/context to find relevant examples for")
    agent_id: str = Field(..., description="Unique identifier for the calling agent")
    session_id: UUID | None = Field(default=None, description="Optional session for context continuity")
    domain: str | None = Field(default=None, description="Filter to specific domain")
    function_name: str | None = Field(default=None, description="Filter to specific function")
    databit_id: str | None = Field(default=None, description="Filter to specific databit/template")
    max_examples: int = Field(default=5, ge=1, le=20, description="Maximum examples to return")
    min_effectiveness: float = Field(default=0.3, ge=0, le=1, description="Minimum effectiveness threshold")
    format_style: str = Field(default="xml", description="Output format: xml, markdown, json")

    model_config = {"json_schema_extra": {"example": {
        "query": "What is the radiation level in zone 3?",
        "agent_id": "support-agent-v1",
        "domain": "anomaly_detection",
        "max_examples": 3,
        "format_style": "xml"
    }}}


class AgentExampleResult(BaseModel):
    """A single example formatted for agent consumption."""

    example_id: str
    input: dict[str, Any]
    expected_output: dict[str, Any]
    explanation: str | None = None
    effectiveness_score: float | None = None


class AgentExampleResponse(BaseModel):
    """Response containing examples formatted for prompt injection."""

    retrieval_id: str = Field(..., description="Unique ID for tracking this retrieval")
    examples: list[AgentExampleResult] = Field(default_factory=list)
    formatted_prompt: str = Field(..., description="Pre-formatted examples ready for prompt injection")
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"json_schema_extra": {"example": {
        "retrieval_id": "ret_abc123",
        "examples": [{
            "example_id": "ex_001",
            "input": {"sensor_id": "zone3", "reading": 45.2},
            "expected_output": {"status": "normal", "action": "none"},
            "explanation": "Normal reading within expected range",
            "effectiveness_score": 0.85
        }],
        "formatted_prompt": "<examples>\n  <example>...</example>\n</examples>",
        "metadata": {"search_type": "semantic", "total_candidates": 15}
    }}}


class AgentOutcomeRequest(BaseModel):
    """Request to record the outcome of using retrieved examples."""

    retrieval_id: str = Field(..., description="The retrieval_id from the retrieve response")
    outcome: str = Field(..., description="Outcome: success, failure, partial")
    confidence: float | None = Field(default=None, ge=0, le=1, description="Agent confidence in outcome")
    feedback_notes: str | None = Field(default=None, description="Optional notes about the outcome")

    model_config = {"json_schema_extra": {"example": {
        "retrieval_id": "ret_abc123",
        "outcome": "success",
        "confidence": 0.92,
        "feedback_notes": "Examples helped with sensor interpretation"
    }}}


class AgentOutcomeResponse(BaseModel):
    """Response confirming outcome recording."""

    retrieval_id: str
    recorded: bool
    examples_updated: int = Field(..., description="Number of example effectiveness scores updated")
