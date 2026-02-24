"""Registries API endpoints (Tools, Agents, Endpoints)."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_permission
from app.core.databricks import get_current_user
from app.models.registry import (
    AgentCreate,
    AgentResponse,
    AgentStatus,
    AgentUpdate,
    EndpointCreate,
    EndpointResponse,
    EndpointStatus,
    EndpointType,
    EndpointUpdate,
    ToolCreate,
    ToolResponse,
    ToolStatus,
    ToolUpdate,
)
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/registries", tags=["registries"])


# ============================================================================
# Tools
# ============================================================================


def _row_to_tool(row: dict) -> ToolResponse:
    return ToolResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        uc_function_path=row.get("uc_function_path"),
        parameters_schema=json.loads(row["parameters_schema"])
        if row.get("parameters_schema")
        else None,
        return_type=row.get("return_type"),
        documentation=row.get("documentation"),
        examples=json.loads(row["examples"]) if row.get("examples") else None,
        version=row.get("version", "1.0.0"),
        status=ToolStatus(row.get("status", "draft")),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/tools", response_model=list[ToolResponse])
async def list_tools(
    status: ToolStatus | None = None,
    search: str | None = None,
):
    """List all tools."""
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if search:
        conditions.append(f"(name LIKE '%{search}%' OR description LIKE '%{search}%')")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    sql = f"SELECT * FROM tools_registry WHERE {where_clause} ORDER BY name"
    rows = sql_service.execute(sql)

    return [_row_to_tool(row) for row in rows]


@router.post("/tools", response_model=ToolResponse, status_code=201)
async def create_tool(tool: ToolCreate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Create a new tool."""
    sql_service = get_sql_service()
    user = get_current_user()
    tool_id = str(uuid.uuid4())

    params_json = (
        json.dumps(tool.parameters_schema).replace("'", "''")
        if tool.parameters_schema
        else None
    )
    examples_json = (
        json.dumps(tool.examples).replace("'", "''") if tool.examples else None
    )

    esc_tool_name = tool.name.replace("'", "''")
    esc_tool_desc = tool.description.replace("'", "''") if tool.description else None
    esc_tool_docs = tool.documentation.replace("'", "''") if tool.documentation else None

    sql = f"""
    INSERT INTO tools_registry (
        id, name, description, uc_function_path, parameters_schema, return_type,
        documentation, examples, version, status, created_by, created_at, updated_at
    ) VALUES (
        '{tool_id}',
        '{esc_tool_name}',
        {f"'{esc_tool_desc}'" if esc_tool_desc else "NULL"},
        {f"'{tool.uc_function_path}'" if tool.uc_function_path else "NULL"},
        {f"'{params_json}'" if params_json else "NULL"},
        {f"'{tool.return_type}'" if tool.return_type else "NULL"},
        {f"'{esc_tool_docs}'" if esc_tool_docs else "NULL"},
        {f"'{examples_json}'" if examples_json else "NULL"},
        '1.0.0', 'draft', '{user}',
        current_timestamp(), current_timestamp()
    )
    """
    sql_service.execute_update(sql)

    return await get_tool(tool_id)


@router.get("/tools/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: str):
    """Get a tool by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM tools_registry WHERE id = '{tool_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Tool not found")

    return _row_to_tool(rows[0])


@router.put("/tools/{tool_id}", response_model=ToolResponse)
async def update_tool(tool_id: str, tool: ToolUpdate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Update a tool."""
    sql_service = get_sql_service()

    updates = []
    if tool.name is not None:
        updates.append(f"name = '{tool.name.replace(chr(39), chr(39) + chr(39))}'")
    if tool.description is not None:
        updates.append(
            f"description = '{tool.description.replace(chr(39), chr(39) + chr(39))}'"
        )
    if tool.uc_function_path is not None:
        updates.append(f"uc_function_path = '{tool.uc_function_path}'")
    if tool.parameters_schema is not None:
        params_json = json.dumps(tool.parameters_schema).replace("'", "''")
        updates.append(f"parameters_schema = '{params_json}'")
    if tool.return_type is not None:
        updates.append(f"return_type = '{tool.return_type}'")
    if tool.documentation is not None:
        updates.append(
            f"documentation = '{tool.documentation.replace(chr(39), chr(39) + chr(39))}'"
        )
    if tool.examples is not None:
        examples_json = json.dumps(tool.examples).replace("'", "''")
        updates.append(f"examples = '{examples_json}'")
    if tool.status is not None:
        updates.append(f"status = '{tool.status.value}'")

    if updates:
        updates.append("updated_at = current_timestamp()")
        sql = f"UPDATE tools_registry SET {', '.join(updates)} WHERE id = '{tool_id}'"
        sql_service.execute_update(sql)

    return await get_tool(tool_id)


@router.delete("/tools/{tool_id}", status_code=204)
async def delete_tool(tool_id: str, _auth: CurrentUser = Depends(require_permission("registries", "admin"))):
    """Delete a tool."""
    sql_service = get_sql_service()
    sql = f"DELETE FROM tools_registry WHERE id = '{tool_id}'"
    sql_service.execute_update(sql)


# ============================================================================
# Agents
# ============================================================================


def _row_to_agent(row: dict) -> AgentResponse:
    return AgentResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        model_endpoint=row.get("model_endpoint"),
        system_prompt=row.get("system_prompt"),
        tools=json.loads(row["tools"]) if row.get("tools") else None,
        template_id=row.get("template_id"),
        temperature=float(row.get("temperature", 0.7)),
        max_tokens=int(row.get("max_tokens", 2048)),
        version=row.get("version", "1.0.0"),
        status=AgentStatus(row.get("status", "draft")),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/agents", response_model=list[AgentResponse])
async def list_agents(
    status: AgentStatus | None = None,
    search: str | None = None,
):
    """List all agents."""
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if search:
        conditions.append(f"(name LIKE '%{search}%' OR description LIKE '%{search}%')")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    sql = f"SELECT * FROM agents_registry WHERE {where_clause} ORDER BY name"
    rows = sql_service.execute(sql)

    return [_row_to_agent(row) for row in rows]


@router.post("/agents", response_model=AgentResponse, status_code=201)
async def create_agent(agent: AgentCreate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Create a new agent."""
    sql_service = get_sql_service()
    user = get_current_user()
    agent_id = str(uuid.uuid4())

    tools_json = json.dumps(agent.tools).replace("'", "''") if agent.tools else None

    esc_agent_name = agent.name.replace("'", "''")
    esc_agent_desc = agent.description.replace("'", "''") if agent.description else None
    esc_sys_prompt = agent.system_prompt.replace("'", "''") if agent.system_prompt else None

    sql = f"""
    INSERT INTO agents_registry (
        id, name, description, model_endpoint, system_prompt, tools, template_id,
        temperature, max_tokens, version, status, created_by, created_at, updated_at
    ) VALUES (
        '{agent_id}',
        '{esc_agent_name}',
        {f"'{esc_agent_desc}'" if esc_agent_desc else "NULL"},
        {f"'{agent.model_endpoint}'" if agent.model_endpoint else "NULL"},
        {f"'{esc_sys_prompt}'" if esc_sys_prompt else "NULL"},
        {f"'{tools_json}'" if tools_json else "NULL"},
        {f"'{agent.template_id}'" if agent.template_id else "NULL"},
        {agent.temperature}, {agent.max_tokens},
        '1.0.0', 'draft', '{user}',
        current_timestamp(), current_timestamp()
    )
    """
    sql_service.execute_update(sql)

    return await get_agent(agent_id)


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get an agent by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM agents_registry WHERE id = '{agent_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Agent not found")

    return _row_to_agent(rows[0])


@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent: AgentUpdate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Update an agent."""
    sql_service = get_sql_service()

    updates = []
    if agent.name is not None:
        updates.append(f"name = '{agent.name.replace(chr(39), chr(39) + chr(39))}'")
    if agent.description is not None:
        updates.append(
            f"description = '{agent.description.replace(chr(39), chr(39) + chr(39))}'"
        )
    if agent.model_endpoint is not None:
        updates.append(f"model_endpoint = '{agent.model_endpoint}'")
    if agent.system_prompt is not None:
        updates.append(
            f"system_prompt = '{agent.system_prompt.replace(chr(39), chr(39) + chr(39))}'"
        )
    if agent.tools is not None:
        tools_json = json.dumps(agent.tools).replace("'", "''")
        updates.append(f"tools = '{tools_json}'")
    if agent.template_id is not None:
        updates.append(f"template_id = '{agent.template_id}'")
    if agent.temperature is not None:
        updates.append(f"temperature = {agent.temperature}")
    if agent.max_tokens is not None:
        updates.append(f"max_tokens = {agent.max_tokens}")
    if agent.status is not None:
        updates.append(f"status = '{agent.status.value}'")

    if updates:
        updates.append("updated_at = current_timestamp()")
        sql = f"UPDATE agents_registry SET {', '.join(updates)} WHERE id = '{agent_id}'"
        sql_service.execute_update(sql)

    return await get_agent(agent_id)


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, _auth: CurrentUser = Depends(require_permission("registries", "admin"))):
    """Delete an agent."""
    sql_service = get_sql_service()
    sql = f"DELETE FROM agents_registry WHERE id = '{agent_id}'"
    sql_service.execute_update(sql)


# ============================================================================
# Endpoints
# ============================================================================


def _row_to_endpoint(row: dict) -> EndpointResponse:
    return EndpointResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        endpoint_name=row["endpoint_name"],
        endpoint_type=EndpointType(row["endpoint_type"]),
        agent_id=row.get("agent_id"),
        model_name=row.get("model_name"),
        model_version=row.get("model_version"),
        traffic_config=json.loads(row["traffic_config"])
        if row.get("traffic_config")
        else None,
        status=EndpointStatus(row.get("status", "creating")),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/endpoints", response_model=list[EndpointResponse])
async def list_endpoints(
    status: EndpointStatus | None = None,
    endpoint_type: EndpointType | None = None,
):
    """List all endpoints."""
    sql_service = get_sql_service()

    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if endpoint_type:
        conditions.append(f"endpoint_type = '{endpoint_type.value}'")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    sql = f"SELECT * FROM endpoints_registry WHERE {where_clause} ORDER BY name"
    rows = sql_service.execute(sql)

    return [_row_to_endpoint(row) for row in rows]


@router.post("/endpoints", response_model=EndpointResponse, status_code=201)
async def create_endpoint(endpoint: EndpointCreate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Create a new endpoint registration."""
    sql_service = get_sql_service()
    user = get_current_user()
    endpoint_id = str(uuid.uuid4())

    traffic_json = (
        json.dumps(endpoint.traffic_config).replace("'", "''")
        if endpoint.traffic_config
        else None
    )

    esc_ep_name = endpoint.name.replace("'", "''")
    esc_ep_desc = endpoint.description.replace("'", "''") if endpoint.description else None

    sql = f"""
    INSERT INTO endpoints_registry (
        id, name, description, endpoint_name, endpoint_type,
        agent_id, model_name, model_version, traffic_config,
        status, created_by, created_at, updated_at
    ) VALUES (
        '{endpoint_id}',
        '{esc_ep_name}',
        {f"'{esc_ep_desc}'" if esc_ep_desc else "NULL"},
        '{endpoint.endpoint_name}',
        '{endpoint.endpoint_type.value}',
        {f"'{endpoint.agent_id}'" if endpoint.agent_id else "NULL"},
        {f"'{endpoint.model_name}'" if endpoint.model_name else "NULL"},
        {f"'{endpoint.model_version}'" if endpoint.model_version else "NULL"},
        {f"'{traffic_json}'" if traffic_json else "NULL"},
        'creating', '{user}',
        current_timestamp(), current_timestamp()
    )
    """
    sql_service.execute_update(sql)

    return await get_endpoint(endpoint_id)


@router.get("/endpoints/{endpoint_id}", response_model=EndpointResponse)
async def get_endpoint(endpoint_id: str):
    """Get an endpoint by ID."""
    sql_service = get_sql_service()

    sql = f"SELECT * FROM endpoints_registry WHERE id = '{endpoint_id}'"
    rows = sql_service.execute(sql)

    if not rows:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    return _row_to_endpoint(rows[0])


@router.put("/endpoints/{endpoint_id}", response_model=EndpointResponse)
async def update_endpoint(endpoint_id: str, endpoint: EndpointUpdate, _auth: CurrentUser = Depends(require_permission("registries", "write"))):
    """Update an endpoint."""
    sql_service = get_sql_service()

    updates = []
    if endpoint.name is not None:
        updates.append(f"name = '{endpoint.name.replace(chr(39), chr(39) + chr(39))}'")
    if endpoint.description is not None:
        updates.append(
            f"description = '{endpoint.description.replace(chr(39), chr(39) + chr(39))}'"
        )
    if endpoint.traffic_config is not None:
        traffic_json = json.dumps(endpoint.traffic_config).replace("'", "''")
        updates.append(f"traffic_config = '{traffic_json}'")
    if endpoint.status is not None:
        updates.append(f"status = '{endpoint.status.value}'")

    if updates:
        updates.append("updated_at = current_timestamp()")
        sql = f"UPDATE endpoints_registry SET {', '.join(updates)} WHERE id = '{endpoint_id}'"
        sql_service.execute_update(sql)

    return await get_endpoint(endpoint_id)


@router.delete("/endpoints/{endpoint_id}", status_code=204)
async def delete_endpoint(endpoint_id: str, _auth: CurrentUser = Depends(require_permission("registries", "admin"))):
    """Delete an endpoint registration."""
    sql_service = get_sql_service()
    sql = f"DELETE FROM endpoints_registry WHERE id = '{endpoint_id}'"
    sql_service.execute_update(sql)
