"""Ontos ML → Ontos DQX Quality Proxy endpoint.

Triggers the full proxy flow: fetch QA pairs from Ontos, run heuristic
quality checks locally, push results back to Ontos's quality gate.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.dqx_quality_proxy import QualityProxyRunRequest, QualityProxyRunResponse
from app.services.dqx_quality_service import get_dqx_quality_service

logger = logging.getLogger("quality_proxy")

router = APIRouter(prefix="/quality-proxy", tags=["quality-proxy"])


@router.post(
    "/collections/{collection_id}/run",
    response_model=QualityProxyRunResponse,
)
async def run_quality_proxy(
    collection_id: str,
    body: QualityProxyRunRequest | None = None,
):
    """Run heuristic quality checks on Ontos QA pairs and push results back."""
    service = get_dqx_quality_service()
    try:
        return await service.run_quality_proxy(collection_id, body)
    except Exception as exc:
        logger.error("Quality proxy run failed for %s: %s", collection_id, exc)
        raise HTTPException(status_code=502, detail=f"Quality proxy failed: {exc}")
