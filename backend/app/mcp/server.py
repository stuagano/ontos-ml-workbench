"""FastMCP server setup — registers tools, resources, and auth middleware.

The MCP SDK's ``streamable_http_app()`` returns a Starlette sub-app with its
own lifespan that initialises the session-manager task-group.  FastAPI's
``app.mount()`` does **not** forward lifespan events to sub-apps, so the
task-group never starts and every request fails with
``RuntimeError("Task group is not initialized …")``.

Solution: we call ``streamable_http_app()`` once (which lazily creates the
``StreamableHTTPSessionManager``), then expose the session-manager so that
``main.py`` can start it inside FastAPI's own lifespan context.  A thin ASGI
handler wraps the session-manager + auth middleware and is mounted at ``/mcp``.
"""

import logging
import traceback

from mcp.server.fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import Receive, Scope, Send

from app.mcp import tools, resources
from app.mcp.auth import validate_mcp_token

logger = logging.getLogger(__name__)

# Module-level singleton so main.py can access the session manager.
_mcp: FastMCP | None = None


def create_mcp_server() -> FastMCP:
    """Build the FastMCP server with all tools and resources registered."""
    mcp = FastMCP(
        "ontos-ml-workbench",
        instructions=(
            "Ontos ML Workbench — mission control for Acme Instruments' "
            "AI-powered radiation safety platform on Databricks. "
            "Use the available tools to query datasets (sheets), templates, "
            "training sheets, model endpoints, and governance data."
        ),
    )

    # -- Register tools --
    mcp.tool()(tools.list_sheets_tool)
    mcp.tool()(tools.get_sheet_tool)
    mcp.tool()(tools.list_templates_tool)
    mcp.tool()(tools.list_training_sheets_tool)
    mcp.tool()(tools.list_endpoints_tool)
    mcp.tool()(tools.get_endpoint_metrics_tool)
    mcp.tool()(tools.search_marketplace_tool)
    mcp.tool()(tools.validate_name_tool)
    mcp.tool()(tools.traverse_lineage_tool)
    mcp.tool()(tools.impact_analysis_tool)
    mcp.tool()(tools.find_related_assets_tool)

    # -- Register resources --
    mcp.resource("workbench://info")(resources.get_workbench_info)
    mcp.resource("workbench://sheets")(resources.get_sheets_resource)
    mcp.resource("workbench://templates")(resources.get_templates_resource)
    mcp.resource("workbench://semantic-models")(resources.get_semantic_models_resource)
    mcp.resource("workbench://lineage-graph")(resources.get_lineage_graph_resource)

    return mcp


def get_mcp_instance() -> FastMCP:
    """Return (and lazily create) the module-level FastMCP instance."""
    global _mcp
    if _mcp is None:
        _mcp = create_mcp_server()
        # Calling streamable_http_app() once to trigger lazy creation of
        # the StreamableHTTPSessionManager (stored on _mcp._session_manager).
        _mcp.streamable_http_app()
    return _mcp


class MCPHandler:
    """ASGI app that authenticates, then delegates to the MCP session manager.

    This is NOT a Starlette sub-app — it's a raw ASGI callable, so FastAPI's
    ``app.mount()`` won't try to run a separate lifespan for it.  The session
    manager's lifespan is driven by FastAPI's own lifespan context instead.
    """

    def __init__(self, mcp: FastMCP):
        self._session_manager = mcp.session_manager

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            return

        request = Request(scope, receive)

        # Authenticate
        result = await validate_mcp_token(request)
        if isinstance(result, JSONResponse):
            await result(scope, receive, send)
            return

        # Forward to MCP session manager
        try:
            await self._session_manager.handle_request(scope, receive, send)
        except Exception as e:
            tb = traceback.format_exception(type(e), e, e.__traceback__)
            logger.error(f"MCP handler error:\n{''.join(tb)}")
            response = JSONResponse(
                status_code=500,
                content={"error": f"MCP error: {str(e)[:200]}"},
            )
            await response(scope, receive, send)
