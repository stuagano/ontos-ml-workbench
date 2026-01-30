"""Databits Workbench - FastAPI Application."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import router as api_router
from app.core.config import get_settings
from app.core.databricks import get_current_user, get_workspace_url

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Complete AI lifecycle platform for Databricks",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


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

if static_dir:
    # Mount assets directory
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve index.html for SPA routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA for all non-API routes."""
        # Don't intercept API calls
        if full_path.startswith("api/"):
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
            "message": "Databits Workbench API",
            "docs": "/docs",
            "health": "/api/health",
        }
