"""MCP tool implementations wrapping existing workbench services.

Each tool reads the authenticated MCPTokenContext from the contextvar set
by MCPAuthMiddleware, enforces scope + allowed_tools, calls the relevant
service, and logs the invocation to the mcp_invocations table.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime

from mcp.server.fastmcp import Context

from app.mcp.auth import get_current_mcp_token, MCPTokenContext

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_tool_access(token: MCPTokenContext | None, tool_name: str, required_scope: str):
    """Raise PermissionError if the token lacks access to this tool."""
    if token is None:
        raise PermissionError("Not authenticated")
    if not token.has_scope(required_scope):
        raise PermissionError(
            f"Scope '{token.scope}' insufficient — '{required_scope}' required"
        )
    if not token.can_use_tool(tool_name):
        raise PermissionError(f"Token not authorized for tool '{tool_name}'")


def _log_invocation(
    token_id: str,
    tool_name: str,
    params: dict | None,
    status: str,
    duration_ms: float,
    error_message: str | None = None,
):
    """Write an invocation record to the mcp_invocations table (fire-and-forget)."""
    try:
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        settings = get_settings()
        sql_svc = get_sql_service()

        # Look up tool_id by name
        tools_table = settings.get_table("mcp_tools")
        rows = sql_svc.execute(
            f"SELECT id FROM {tools_table} WHERE name = '{tool_name}' LIMIT 1"
        )
        tool_id = rows[0]["id"] if rows else None

        inv_table = settings.get_table("mcp_invocations")
        inv_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        params_sql = "'" + json.dumps(params or {}).replace("'", "''") + "'" if params else "NULL"
        err_sql = "'" + (error_message or "").replace("'", "''") + "'" if error_message else "NULL"
        tool_id_sql = f"'{tool_id}'" if tool_id else "NULL"

        sql_svc.execute_update(
            f"INSERT INTO {inv_table} "
            f"(id, token_id, tool_id, tool_name, input_params, status, "
            f"duration_ms, error_message, invoked_at) VALUES ("
            f"'{inv_id}', '{token_id}', {tool_id_sql}, '{tool_name}', "
            f"{params_sql}, '{status}', {duration_ms:.0f}, {err_sql}, '{now}')"
        )
    except Exception as e:
        logger.warning(f"Failed to log MCP invocation: {e}")


def _error_json(msg: str) -> str:
    return json.dumps({"error": msg})


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

async def list_sheets_tool(ctx: Context, stage: str | None = None) -> str:
    """List dataset sheets in the workbench.

    Args:
        stage: Optional status filter (e.g. 'active', 'draft', 'archived')
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "list_sheets", "read")
    start = time.time()
    try:
        from app.services.sheet_service import SheetService

        svc = SheetService()
        sheets = await asyncio.to_thread(svc.list_sheets, status_filter=stage, limit=100)
        result = [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "description": s.get("description"),
                "status": s.get("status"),
                "source_type": s.get("source_type"),
                "source_table": s.get("source_table"),
                "item_count": s.get("item_count"),
                "created_at": s.get("created_at"),
            }
            for s in sheets
        ]
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_sheets", {"stage": stage}, "success", duration)
        return json.dumps(result, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_sheets", {"stage": stage}, "error", duration, str(e))
        return _error_json(str(e))


async def get_sheet_tool(ctx: Context, sheet_id: str) -> str:
    """Get detailed information about a specific dataset sheet.

    Args:
        sheet_id: The UUID of the sheet to retrieve
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "get_sheet", "read")
    start = time.time()
    try:
        from app.services.sheet_service import SheetService

        svc = SheetService()
        sheet = await asyncio.to_thread(svc.get_sheet, sheet_id)
        if sheet is None:
            duration = (time.time() - start) * 1000
            _log_invocation(token.token_id, "get_sheet", {"sheet_id": sheet_id}, "success", duration)
            return _error_json(f"Sheet '{sheet_id}' not found")
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "get_sheet", {"sheet_id": sheet_id}, "success", duration)
        return json.dumps(sheet, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "get_sheet", {"sheet_id": sheet_id}, "error", duration, str(e))
        return _error_json(str(e))


async def list_templates_tool(ctx: Context) -> str:
    """List all prompt templates in the workbench."""
    token = get_current_mcp_token()
    _check_tool_access(token, "list_templates", "read")
    start = time.time()
    try:
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        settings = get_settings()
        sql_svc = get_sql_service()
        table = settings.get_table("templates")
        rows = await asyncio.to_thread(
            sql_svc.execute,
            f"SELECT id, name, description, category, label_type, is_active, "
            f"created_at, updated_at FROM {table} ORDER BY name",
        )
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_templates", {}, "success", duration)
        return json.dumps(rows, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_templates", {}, "error", duration, str(e))
        return _error_json(str(e))


async def list_training_sheets_tool(ctx: Context) -> str:
    """List all training sheets (Q&A datasets) in the workbench."""
    token = get_current_mcp_token()
    _check_tool_access(token, "list_training_sheets", "read")
    start = time.time()
    try:
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        settings = get_settings()
        sql_svc = get_sql_service()
        table = settings.get_table("training_sheets")
        rows = await asyncio.to_thread(
            sql_svc.execute,
            f"SELECT id, name, description, status, sheet_id, template_id, "
            f"qa_pair_count, approved_count, created_at FROM {table} "
            f"ORDER BY created_at DESC LIMIT 100",
        )
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_training_sheets", {}, "success", duration)
        return json.dumps(rows, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_training_sheets", {}, "error", duration, str(e))
        return _error_json(str(e))


async def list_endpoints_tool(ctx: Context) -> str:
    """List all registered model serving endpoints."""
    token = get_current_mcp_token()
    _check_tool_access(token, "list_endpoints", "read")
    start = time.time()
    try:
        from app.services.deployment_service import get_deployment_service

        svc = get_deployment_service()
        endpoints = await asyncio.to_thread(svc.list_serving_endpoints)
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_endpoints", {}, "success", duration)
        return json.dumps(endpoints, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "list_endpoints", {}, "error", duration, str(e))
        return _error_json(str(e))


async def get_endpoint_metrics_tool(ctx: Context, endpoint_name: str) -> str:
    """Get detailed status and metrics for a model serving endpoint.

    Args:
        endpoint_name: Name of the serving endpoint
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "get_endpoint_metrics", "read")
    start = time.time()
    try:
        from app.services.deployment_service import get_deployment_service

        svc = get_deployment_service()
        status = await asyncio.to_thread(svc.get_endpoint_status, endpoint_name)
        duration = (time.time() - start) * 1000
        _log_invocation(
            token.token_id, "get_endpoint_metrics",
            {"endpoint_name": endpoint_name}, "success", duration,
        )
        return json.dumps(status, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(
            token.token_id, "get_endpoint_metrics",
            {"endpoint_name": endpoint_name}, "error", duration, str(e),
        )
        return _error_json(str(e))


async def search_marketplace_tool(
    ctx: Context,
    query: str | None = None,
    product_type: str | None = None,
    limit: int = 20,
) -> str:
    """Search the dataset marketplace for published data products.

    Args:
        query: Free-text search (matches name and description)
        product_type: Filter by product type
        limit: Maximum results to return (default 20)
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "search_marketplace", "read")
    start = time.time()
    params = {"query": query, "product_type": product_type, "limit": limit}
    try:
        from app.services.governance_service import get_governance_service

        svc = get_governance_service()
        result = await asyncio.to_thread(
            svc.search_marketplace, query=query, product_type=product_type, limit=limit
        )
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "search_marketplace", params, "success", duration)
        return json.dumps(result, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "search_marketplace", params, "error", duration, str(e))
        return _error_json(str(e))


async def validate_name_tool(ctx: Context, entity_type: str, name: str) -> str:
    """Validate a name against the workbench naming conventions.

    Args:
        entity_type: The type of entity (e.g. 'sheet', 'template', 'model')
        name: The proposed name to validate
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "validate_name", "read")
    start = time.time()
    params = {"entity_type": entity_type, "name": name}
    try:
        from app.services.governance_service import get_governance_service

        svc = get_governance_service()
        result = await asyncio.to_thread(svc.validate_name, entity_type, name)
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "validate_name", params, "success", duration)
        return json.dumps(result, default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "validate_name", params, "error", duration, str(e))
        return _error_json(str(e))


async def traverse_lineage_tool(
    ctx: Context,
    entity_type: str,
    entity_id: str,
    direction: str = "downstream",
    max_depth: int = 5,
) -> str:
    """Traverse lineage graph upstream or downstream from an entity.

    Args:
        entity_type: Entity type (sheet, template, training_sheet, model, endpoint)
        entity_id: The UUID of the entity
        direction: Traversal direction (upstream or downstream)
        max_depth: Maximum traversal depth (default 5)
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "traverse_lineage", "read")
    start = time.time()
    params = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "direction": direction,
        "max_depth": max_depth,
    }
    try:
        from app.services.graph_query_service import get_graph_query_service

        svc = get_graph_query_service()
        if direction == "upstream":
            result = await asyncio.to_thread(
                svc.traverse_upstream, entity_type, entity_id, max_depth
            )
        else:
            result = await asyncio.to_thread(
                svc.traverse_downstream, entity_type, entity_id, max_depth
            )
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "traverse_lineage", params, "success", duration)
        return json.dumps(result.model_dump(), default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "traverse_lineage", params, "error", duration, str(e))
        return _error_json(str(e))


async def impact_analysis_tool(
    ctx: Context,
    entity_type: str,
    entity_id: str,
) -> str:
    """Analyze blast radius — what downstream entities are affected if this entity changes.

    Args:
        entity_type: Entity type (sheet, template, training_sheet, model, endpoint)
        entity_id: The UUID of the entity
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "impact_analysis", "read")
    start = time.time()
    params = {"entity_type": entity_type, "entity_id": entity_id}
    try:
        from app.services.graph_query_service import get_graph_query_service

        svc = get_graph_query_service()
        result = await asyncio.to_thread(svc.impact_analysis, entity_type, entity_id)
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "impact_analysis", params, "success", duration)
        return json.dumps(result.model_dump(), default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "impact_analysis", params, "error", duration, str(e))
        return _error_json(str(e))


async def find_related_assets_tool(
    ctx: Context,
    entity_type: str,
    entity_id: str,
) -> str:
    """Find immediate neighbors (depth=1) of an entity in the lineage graph.

    Args:
        entity_type: Entity type (sheet, template, training_sheet, model, endpoint)
        entity_id: The UUID of the entity
    """
    token = get_current_mcp_token()
    _check_tool_access(token, "find_related_assets", "read")
    start = time.time()
    params = {"entity_type": entity_type, "entity_id": entity_id}
    try:
        from app.services.graph_query_service import get_graph_query_service

        svc = get_graph_query_service()
        result = await asyncio.to_thread(svc.get_entity_context, entity_type, entity_id)
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "find_related_assets", params, "success", duration)
        return json.dumps(result.model_dump(), default=str)
    except PermissionError:
        raise
    except Exception as e:
        duration = (time.time() - start) * 1000
        _log_invocation(token.token_id, "find_related_assets", params, "error", duration, str(e))
        return _error_json(str(e))
