"""
Pydantic models for multi-source join configuration.

These mirror the frontend TypeScript types (MultiDatasetConfig, JoinKeyMapping, etc.)
and use alias + populate_by_name to accept both camelCase (frontend) and snake_case.
"""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Core join configuration models
# ---------------------------------------------------------------------------

class DataSourceConfig(BaseModel):
    """Configuration for a single data source in a multi-source join."""
    model_config = ConfigDict(populate_by_name=True)

    source_table: str = Field(..., alias="sourceTable", description="Fully qualified UC table path (catalog.schema.table)")
    role: Literal["primary", "secondary", "images", "labels"] = "secondary"
    alias: Optional[str] = Field(None, description="User-friendly alias, e.g. 'Sensor Readings'")
    join_keys: List[str] = Field(default_factory=list, alias="joinKeys", description="Columns to join on")
    selected_columns: Optional[List[str]] = Field(None, alias="selectedColumns", description="Subset of columns to use (null = all)")


class JoinKeyMapping(BaseModel):
    """Mapping between join keys across two data sources."""
    model_config = ConfigDict(populate_by_name=True)

    source_alias: str = Field(..., alias="sourceAlias")
    source_column: str = Field(..., alias="sourceColumn")
    target_alias: str = Field(..., alias="targetAlias")
    target_column: str = Field(..., alias="targetColumn")


class TimeWindow(BaseModel):
    """Time-window join configuration."""
    model_config = ConfigDict(populate_by_name=True)

    enabled: bool = False
    column1: str = ""
    column2: str = ""
    window_minutes: int = Field(5, alias="windowMinutes")


class JoinConfig(BaseModel):
    """How to join the sources."""
    model_config = ConfigDict(populate_by_name=True)

    key_mappings: List[JoinKeyMapping] = Field(default_factory=list, alias="keyMappings")
    join_type: Literal["inner", "left", "full"] = Field("inner", alias="joinType")
    time_window: Optional[TimeWindow] = Field(None, alias="timeWindow")


class MatchStats(BaseModel):
    """Statistics about how well sources matched."""
    model_config = ConfigDict(populate_by_name=True)

    total_primary_rows: int = Field(0, alias="totalPrimaryRows")
    matched_rows: int = Field(0, alias="matchedRows")
    unmatched_rows: int = Field(0, alias="unmatchedRows")
    match_percentage: float = Field(0.0, alias="matchPercentage")


class MultiDatasetConfig(BaseModel):
    """Complete multi-dataset join configuration (stored as JSON in sheets.join_config)."""
    model_config = ConfigDict(populate_by_name=True)

    sources: List[DataSourceConfig]
    join_config: JoinConfig = Field(default_factory=JoinConfig, alias="joinConfig")
    match_stats: Optional[MatchStats] = Field(None, alias="matchStats")


# ---------------------------------------------------------------------------
# Join key suggestion models
# ---------------------------------------------------------------------------

class JoinKeySuggestion(BaseModel):
    """A suggested join key pair with confidence score."""
    source_column: str
    target_column: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str
    value_overlap_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Request / Response models for API endpoints
# ---------------------------------------------------------------------------

class SuggestJoinKeysRequest(BaseModel):
    """Request body for POST /sheets/suggest-join-keys."""
    source_table: str = Field(..., description="Primary table (catalog.schema.table)")
    target_table: str = Field(..., description="Secondary table to join")
    sample_size: int = Field(100, ge=10, le=1000, description="Rows to sample for value overlap analysis")


class SuggestJoinKeysResponse(BaseModel):
    """Response for join key suggestions."""
    source_table: str
    target_table: str
    suggestions: List[JoinKeySuggestion]


class PreviewJoinRequest(BaseModel):
    """Request body for POST /sheets/preview-join."""
    model_config = ConfigDict(populate_by_name=True)

    sources: List[DataSourceConfig]
    join_config: JoinConfig = Field(..., alias="joinConfig")
    limit: int = Field(50, ge=1, le=1000)


class PreviewJoinResponse(BaseModel):
    """Response for join preview."""
    rows: List[dict]
    total_rows: int
    match_stats: MatchStats
    generated_sql: str
