"""Ontos ML Workbench - FastAPI Application."""

import logging
import os
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import router as api_router
from app.api.dqx.router import router as dqx_router
from app.core.config import get_settings
from app.core.databricks import get_current_user, get_workspace_url

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("api")
sql_logger = logging.getLogger("sql_queries")

settings = get_settings()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming requests with timing and response status."""

    async def dispatch(self, request: Request, call_next):
        # Skip logging for static assets and health checks
        path = request.url.path
        if path.startswith("/assets") or path == "/api/health":
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Log request
        method = request.method
        query = f"?{request.url.query}" if request.url.query else ""
        logger.info(f"→ [{request_id}] {method} {path}{query}")

        # Process request
        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # Color-code status
            status = response.status_code
            if status < 300:
                status_str = f"✓ {status}"
            elif status < 400:
                status_str = f"↪ {status}"
            elif status < 500:
                status_str = f"✗ {status}"
            else:
                status_str = f"💥 {status}"

            logger.info(f"← [{request_id}] {status_str} ({duration:.3f}s)")
            return response

        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"← [{request_id}] 💥 ERROR ({duration:.3f}s): {str(e)[:100]}")
            raise


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Complete AI lifecycle platform for Databricks - Ontos ML Workbench enables domain experts to build, govern, and deploy AI systems.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add gzip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API routes
app.include_router(api_router)
app.include_router(dqx_router)


@app.on_event("startup")
async def startup_event():
    """Warm cache on startup with common data."""
    import asyncio
    from app.services.cache_service import get_cache_service
    from app.core.databricks import get_workspace_client

    cache = get_cache_service()

    async def warm_catalogs():
        """Preload catalogs list."""
        try:
            client = get_workspace_client()
            catalogs = list(client.catalogs.list())
            result = [
                {"name": c.name, "comment": c.comment, "owner": c.owner}
                for c in catalogs
                if c.name
            ]
            cache.set("uc:catalogs", result, ttl=300)
            print(f"✓ Cache warmed: {len(result)} catalogs")
        except Exception as e:
            print(f"✗ Failed to warm catalogs cache: {e}")

    async def warm_main_schema():
        """Preload main schema tables."""
        try:
            client = get_workspace_client()
            catalog = settings.databricks_catalog
            schema = settings.databricks_schema

            # Warm schemas for main catalog
            schemas = list(client.schemas.list(catalog_name=catalog))
            schemas_result = [
                {"name": s.name, "catalog_name": s.catalog_name}
                for s in schemas
                if s.name
            ]
            cache.set(f"uc:schemas:{catalog}", schemas_result, ttl=300)

            # Warm tables for main schema
            tables = list(client.tables.list(catalog_name=catalog, schema_name=schema))
            tables_result = [
                {
                    "name": t.name,
                    "catalog_name": t.catalog_name,
                    "schema_name": t.schema_name,
                    "table_type": t.table_type.value if t.table_type else "UNKNOWN",
                }
                for t in tables
                if t.name
            ]
            cache.set(f"uc:tables:{catalog}:{schema}:cols=False", tables_result, ttl=300)
            print(f"✓ Cache warmed: {len(tables_result)} tables in {catalog}.{schema}")
        except Exception as e:
            print(f"✗ Failed to warm schema cache: {e}")

    # Run cache warming in background
    asyncio.create_task(warm_catalogs())
    asyncio.create_task(warm_main_schema())


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
    }


@app.get("/api/debug/info")
async def debug_info():
    """Debug endpoint showing app configuration and status."""
    import sys

    try:
        workspace_url = get_workspace_url()
        user = get_current_user()
    except Exception as e:
        workspace_url = f"error: {e}"
        user = "unknown"

    return {
        "app": {
            "name": settings.app_name,
            "version": settings.app_version,
            "python": sys.version,
        },
        "databricks": {
            "catalog": settings.databricks_catalog,
            "schema": settings.databricks_schema,
            "warehouse_id": settings.databricks_warehouse_id,
            "workspace_url": workspace_url,
            "current_user": user,
        },
        "debug_endpoints": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
            "debug_info": "/api/debug/info",
        },
    }


@app.get("/api/config")
async def get_config():
    """Get client configuration."""
    try:
        workspace_url = get_workspace_url()
        user = get_current_user()
    except Exception:
        workspace_url = ""
        user = "unknown"

    return {
        "app_name": settings.app_name,
        "workspace_url": workspace_url,
        "catalog": settings.databricks_catalog,
        "schema": settings.databricks_schema,
        "current_user": user,
        "ontos_url": settings.ontos_base_url,
    }


# Find static files directory - check multiple possible locations
def find_static_dir():
    """Find the frontend dist directory."""
    # Current file is backend/app/main.py
    backend_dir = Path(__file__).parent.parent.resolve()
    root_dir = backend_dir.parent

    # Possible locations for the built frontend
    possible_paths = [
        backend_dir / "static",  # Databricks Apps: backend/static
        root_dir / "frontend" / "dist",  # Local dev: frontend/dist
        root_dir / "static",  # Alternative
        Path("/app/frontend/dist"),  # Container path
        Path("/app/static"),  # Container path
    ]

    for path in possible_paths:
        if path.exists() and (path / "index.html").exists():
            print(f"Found static dir: {path}")
            return path
        print(f"Checked path (not found): {path}")

    return None


static_dir = find_static_dir()

# Mount DQX static UI at /dqx-ui/ (before SPA catch-all)
dqx_static = Path(__file__).parent.parent / "dqx-static"
if dqx_static.exists() and (dqx_static / "index.html").exists():
    app.mount("/dqx-ui", StaticFiles(directory=str(dqx_static), html=True), name="dqx-ui")

if static_dir:
    # Mount assets directory
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve index.html for SPA routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA for all non-API routes."""
        # Don't intercept API calls or docs
        if full_path.startswith(("api/", "dqx-ui/")) or full_path in ("docs", "redoc", "openapi.json"):
            return {"error": "Not found"}

        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        return {"error": "Frontend not built"}
else:

    @app.get("/")
    async def root():
        """Root endpoint when no frontend is available."""
        return {
            "message": "Ontos ML Workbench API",
            "docs": "/docs",
            "health": "/api/health",
        }
