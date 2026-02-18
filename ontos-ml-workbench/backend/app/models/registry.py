"""Pydantic models for Registries (Tools, Agents, Endpoints)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

# ============================================================================
# Tools Registry
# ============================================================================


class ToolStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"


class ToolCreate(BaseModel):
    """Request body for creating a tool."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    uc_function_path: str | None = None  # catalog.schema.function_name
    parameters_schema: dict | None = None  # JSON Schema
    return_type: str | None = None
    documentation: str | None = None
    examples: list[dict] | None = None


class ToolUpdate(BaseModel):
    """Request body for updating a tool."""

    name: str | None = None
    description: str | None = None
    uc_function_path: str | None = None
    parameters_schema: dict | None = None
    return_type: str | None = None
    documentation: str | None = None
    examples: list[dict] | None = None
    status: ToolStatus | None = None


class ToolResponse(BaseModel):
    """Tool response model."""

    id: str
    name: str
    description: str | None = None
    uc_function_path: str | None = None
    parameters_schema: dict | None = None
    return_type: str | None = None
    documentation: str | None = None
    examples: list[dict] | None = None
    version: str
    status: ToolStatus
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ============================================================================
# Agents Registry
# ============================================================================


class AgentStatus(str, Enum):
    DRAFT = "draft"
    DEPLOYED = "deployed"
    ARCHIVED = "archived"


class AgentCreate(BaseModel):
    """Request body for creating an agent."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    model_endpoint: str | None = None
    system_prompt: str | None = None
    tools: list[str] | None = None  # Tool IDs
    template_id: str | None = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2048, ge=1, le=32000)


class AgentUpdate(BaseModel):
    """Request body for updating an agent."""

    name: str | None = None
    description: str | None = None
    model_endpoint: str | None = None
    system_prompt: str | None = None
    tools: list[str] | None = None
    template_id: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    status: AgentStatus | None = None


class AgentResponse(BaseModel):
    """Agent response model."""

    id: str
    name: str
    description: str | None = None
    model_endpoint: str | None = None
    system_prompt: str | None = None
    tools: list[str] | None = None
    template_id: str | None = None
    temperature: float
    max_tokens: int
    version: str
    status: AgentStatus
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ============================================================================
# Endpoints Registry
# ============================================================================


class EndpointStatus(str, Enum):
    CREATING = "creating"
    READY = "ready"
    UPDATING = "updating"
    FAILED = "failed"
    STOPPED = "stopped"


class EndpointType(str, Enum):
    MODEL = "model"
    AGENT = "agent"
    CHAIN = "chain"


class EndpointCreate(BaseModel):
    """Request body for creating an endpoint."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    endpoint_name: str  # Databricks serving endpoint name
    endpoint_type: EndpointType
    agent_id: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    traffic_config: dict[str, float] | None = None  # {"model_a": 0.9, "model_b": 0.1}


class EndpointUpdate(BaseModel):
    """Request body for updating an endpoint."""

    name: str | None = None
    description: str | None = None
    traffic_config: dict[str, float] | None = None
    status: EndpointStatus | None = None


class EndpointResponse(BaseModel):
    """Endpoint response model."""

    id: str
    name: str
    description: str | None = None
    endpoint_name: str
    endpoint_type: EndpointType
    agent_id: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    traffic_config: dict[str, float] | None = None
    status: EndpointStatus
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
