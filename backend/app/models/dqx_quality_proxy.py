"""Pydantic models for the Ontos ML → Ontos DQX quality proxy.

Mirrors Ontos's CheckResult / DQXResultImport models so Ontos ML can construct
payloads without importing from the Ontos package (keeps the two backends
decoupled).
"""

from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CheckCriticality(str, Enum):
    BLOCKING = "blocking"
    WARNING = "warning"
    INFO = "info"


# ---------------------------------------------------------------------------
# Core result models (mirrors ontos/models/training_data_quality.py)
# ---------------------------------------------------------------------------

class CheckResult(BaseModel):
    check_id: UUID
    check_name: str
    passed: bool
    criticality: CheckCriticality
    message: str
    details: dict | None = None


class DQXResultImport(BaseModel):
    """Payload sent to Ontos import-dqx-results endpoint."""
    check_results: list[CheckResult]
    source: str = "ontos-ml-dqx-proxy"
    dqx_run_id: str | None = None


# ---------------------------------------------------------------------------
# Proxy request / response
# ---------------------------------------------------------------------------

class QualityProxyRunRequest(BaseModel):
    """Optional overrides when triggering a proxy run."""
    checks_to_run: list[str] | None = Field(
        None, description="Subset of check IDs to run (default: all)"
    )
    min_response_length: int = Field(
        50, description="Minimum assistant response length (chars)"
    )
    quality_score_threshold: float = Field(
        0.7, description="Minimum quality_score (if present)"
    )


class QualityProxyRunResponse(BaseModel):
    collection_id: str
    ontos_run_id: str | None = None
    total_pairs: int = 0
    pass_rate: float = 0.0
    quality_score: float = 0.0
    check_results: list[CheckResult] = Field(default_factory=list)
    pushed_to_ontos: bool = False
