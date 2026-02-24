"""MCP resource definitions for the Ontos ML Workbench.

Resources are read-only data snapshots that MCP clients can browse.
Auth is already validated by MCPAuthMiddleware before resource handlers run.
"""

import asyncio
import json
import logging

logger = logging.getLogger(__name__)


async def get_workbench_info() -> str:
    """Ontos ML Workbench configuration, workspace URL, and current user."""
    try:
        from app.core.config import get_settings
        from app.core.databricks import get_workspace_url, get_current_user

        settings = get_settings()
        workspace_url = get_workspace_url()
        user = get_current_user()

        return json.dumps(
            {
                "app_name": settings.app_name,
                "version": settings.app_version,
                "workspace_url": workspace_url,
                "catalog": settings.databricks_catalog,
                "schema": settings.databricks_schema,
                "current_user": user,
            },
            default=str,
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


async def get_sheets_resource() -> str:
    """Active dataset sheets in the workbench."""
    try:
        from app.services.sheet_service import SheetService

        svc = SheetService()
        sheets = await asyncio.to_thread(svc.list_sheets, limit=200)
        result = [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "description": s.get("description"),
                "status": s.get("status"),
                "source_type": s.get("source_type"),
                "source_table": s.get("source_table"),
                "item_count": s.get("item_count"),
            }
            for s in sheets
        ]
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


async def get_templates_resource() -> str:
    """Prompt templates registered in the workbench."""
    try:
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        settings = get_settings()
        sql_svc = get_sql_service()
        table = settings.get_table("templates")
        rows = await asyncio.to_thread(
            sql_svc.execute,
            f"SELECT id, name, description, category, label_type, is_active "
            f"FROM {table} ORDER BY name",
        )
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


async def get_semantic_models_resource() -> str:
    """Semantic models for data governance."""
    try:
        from app.services.governance_service import get_governance_service

        svc = get_governance_service()
        models = await asyncio.to_thread(svc.list_semantic_models)
        result = [
            {
                "id": m.get("id"),
                "name": m.get("name"),
                "description": m.get("description"),
                "status": m.get("status"),
                "domain_name": m.get("domain_name"),
                "concept_count": m.get("concept_count"),
                "link_count": m.get("link_count"),
            }
            for m in models
        ]
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


async def get_lineage_graph_resource() -> str:
    """Lineage graph showing data flow from sheets to endpoints."""
    try:
        from app.services.lineage_service import get_lineage_service

        svc = get_lineage_service()
        graph = await asyncio.to_thread(svc.get_lineage_graph)
        return json.dumps(graph.model_dump(), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})
