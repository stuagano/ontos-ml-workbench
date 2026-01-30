"""
Attribution API Endpoints
=========================

REST endpoints for computing and querying training data attribution.

Endpoints:
- POST /attribution/compute - Compute attribution for a model
- GET /attribution/{model}/{version} - Get stored attribution
- POST /attribution/compare - Compare attribution between versions
- POST /attribution/regression - Analyze model regression
- GET /attribution/bits/{bit_id}/impact - Get bit impact history
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.attribution import (
    AttributionComparisonRequest,
    AttributionComparisonResponse,
    AttributionMethod,
    AttributionRequest,
    AttributionResponse,
    BitImpactHistoryResponse,
    RegressionAnalysisRequest,
    RegressionAnalysisResponse,
)
from app.services.attribution_service import (
    analyze_regression,
    compare_attributions,
    compute_attribution,
    get_attribution,
    get_bit_impact_history,
)

router = APIRouter(prefix="/attribution", tags=["Attribution"])


# ============================================================================
# Attribution Computation Endpoints
# ============================================================================


@router.post("/compute", response_model=AttributionResponse)
async def compute_model_attribution(
    request: AttributionRequest,
) -> AttributionResponse:
    """
    Compute attribution for a model.

    Determines which training data bits contribute to model performance.
    Supports ablation (fast) and Shapley (thorough) methods.
    """
    return await compute_attribution(
        model_name=request.model_name,
        model_version=request.model_version,
        method=request.method,
        metrics=request.metrics,
    )


@router.get("/{model_name}/{model_version}", response_model=AttributionResponse)
async def get_model_attribution(
    model_name: str,
    model_version: str,
    method: AttributionMethod | None = Query(
        default=None, description="Filter by attribution method"
    ),
) -> AttributionResponse:
    """
    Get stored attribution results for a model version.

    Returns previously computed attribution if available,
    or raises 404 if not found.
    """
    result = await get_attribution(model_name, model_version, method)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No attribution found for {model_name} v{model_version}",
        )
    return result


# ============================================================================
# Attribution Comparison Endpoints
# ============================================================================


@router.post("/compare", response_model=AttributionComparisonResponse)
async def compare_model_attributions(
    request: AttributionComparisonRequest,
) -> AttributionComparisonResponse:
    """
    Compare attribution between two model versions.

    Useful for understanding what changed when model performance changes.
    Shows which bits were added, removed, or changed in importance.
    """
    return await compare_attributions(
        model_name=request.model_name,
        version_a=request.version_a,
        version_b=request.version_b,
    )


@router.post("/regression", response_model=RegressionAnalysisResponse)
async def analyze_model_regression(
    request: RegressionAnalysisRequest,
) -> RegressionAnalysisResponse:
    """
    Analyze what caused a model regression.

    Compares a good version against a bad version to identify
    which training data changes likely caused the performance drop.

    Returns prioritized list of likely causes with recommendations.
    """
    return await analyze_regression(
        model_name=request.model_name,
        good_version=request.good_version,
        bad_version=request.bad_version,
        metrics_delta=request.metrics_delta,
    )


# ============================================================================
# Bit Impact Endpoints
# ============================================================================


@router.get("/bits/{bit_id}/impact", response_model=BitImpactHistoryResponse)
async def get_bit_impact(bit_id: str) -> BitImpactHistoryResponse:
    """
    Get history of a bit's impact across all models.

    Shows how important this training data bit has been across
    different models and versions over time.

    Useful for:
    - Understanding ROI of data curation efforts
    - Identifying valuable vs. redundant training data
    - Tracking data quality improvements
    """
    return await get_bit_impact_history(bit_id)


@router.get("/bits/{bit_id}/models")
async def get_bit_models(
    bit_id: str,
    min_importance: float = Query(default=0.0, description="Minimum importance score"),
):
    """
    Get all models that use a specific bit.

    Returns models where this bit contributed to training,
    optionally filtered by minimum importance score.
    """
    history = await get_bit_impact_history(bit_id)

    models = [
        {
            "model_name": entry.model_name,
            "model_version": entry.model_version,
            "importance_score": entry.importance_score,
            "importance_rank": entry.importance_rank,
        }
        for entry in history.impact_history
        if entry.importance_score >= min_importance
    ]

    return {
        "bit_id": bit_id,
        "models": models,
        "total_models": len(models),
    }


# ============================================================================
# Capability Attribution Endpoints
# ============================================================================


@router.get("/{model_name}/{model_version}/capabilities")
async def get_capability_attribution(
    model_name: str,
    model_version: str,
):
    """
    Get capability-level attribution for a model.

    Shows which bits contribute to which model capabilities
    (e.g., "troubleshooting", "compliance knowledge", etc.)
    """
    result = await get_attribution(model_name, model_version)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No attribution found for {model_name} v{model_version}",
        )

    # Group contributions by capability
    capability_bits: dict[str, list[dict]] = {}
    for contrib in result.contributions:
        for cap in contrib.capabilities:
            if cap not in capability_bits:
                capability_bits[cap] = []
            capability_bits[cap].append({
                "bit_id": contrib.bit_id,
                "bit_version": contrib.bit_version,
                "importance_score": contrib.importance_score,
            })

    # Sort by importance within each capability
    for cap in capability_bits:
        capability_bits[cap] = sorted(
            capability_bits[cap],
            key=lambda x: x["importance_score"],
            reverse=True,
        )

    return {
        "model_name": model_name,
        "model_version": model_version,
        "capabilities": capability_bits,
        "total_capabilities": len(capability_bits),
    }
