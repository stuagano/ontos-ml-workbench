"""API v1 router - aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    agents,
    training_sheets,
    attribution,
    canonical_labels,
    curated_datasets,
    curation,
    data_quality,
    deployment,
    dspy,
    examples,
    feedback,
    gaps,
    governance,
    images,
    jobs,
    labeling,
    labelsets,
    monitoring,
    quality_proxy,
    registries,
    settings,
    sheets_v2,
    templates,
    training,
    unity_catalog,
)

router = APIRouter(prefix="/api/v1")

# Include all endpoint routers
router.include_router(sheets_v2.router, prefix="/sheets", tags=["sheets"])
router.include_router(training_sheets.router)
router.include_router(templates.router)
router.include_router(
    canonical_labels.router, prefix="/canonical-labels", tags=["canonical-labels"]
)
router.include_router(labelsets.router, prefix="/labelsets", tags=["labelsets"])
router.include_router(
    curated_datasets.router, prefix="/curated-datasets", tags=["curated-datasets"]
)
router.include_router(curation.router)
router.include_router(jobs.router)
router.include_router(registries.router)
router.include_router(unity_catalog.router)

# Phase 3-4: Gap Analysis, Attribution, and Feedback
router.include_router(gaps.router)
router.include_router(attribution.router)
router.include_router(feedback.router)

# Training - Foundation Model API fine-tuning jobs
router.include_router(training.router)

# Deployment and Model Serving
router.include_router(deployment.router)

# Monitoring - Performance metrics, alerts, drift detection
router.include_router(monitoring.router)

# Labeling Workflow System
router.include_router(labeling.router)

# Example Store - Few-shot learning examples
router.include_router(examples.router)

# DSPy Integration - Export, optimization, and feedback loop
router.include_router(dspy.router)

# Agent Framework - Example retrieval for agent prompt injection
router.include_router(agents.router)

# Global Settings - Label classes, presets, configuration
router.include_router(settings.router)

# Data Quality - DQX-powered quality checks for Sheets
router.include_router(data_quality.router)

# Quality Proxy - Ontos ML → Ontos DQX quality gate bridge
router.include_router(quality_proxy.router)

# Admin - Cache management and system health
router.include_router(admin.router)

# Governance - RBAC roles, teams, and data domains
router.include_router(governance.router)

# Images - Proxy for Unity Catalog volume images
router.include_router(images.router)
