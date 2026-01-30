"""API v1 router - aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    assemblies,
    attribution,
    curation,
    deployment,
    feedback,
    gaps,
    jobs,
    labeling,
    registries,
    sheets,
    templates,
    unity_catalog,
)

router = APIRouter(prefix="/api/v1")

# Include all endpoint routers
router.include_router(sheets.router)
router.include_router(assemblies.router)
router.include_router(templates.router)
router.include_router(curation.router)
router.include_router(jobs.router)
router.include_router(registries.router)
router.include_router(unity_catalog.router)

# Phase 3-4: Gap Analysis, Attribution, and Feedback
router.include_router(gaps.router)
router.include_router(attribution.router)
router.include_router(feedback.router)

# Deployment and Model Serving
router.include_router(deployment.router)

# Labeling Workflow System
router.include_router(labeling.router)
