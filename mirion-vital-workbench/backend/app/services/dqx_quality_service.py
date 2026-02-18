"""VITAL → Ontos DQX Quality Proxy Service.

Fetches QA pairs from Ontos, runs heuristic quality checks locally,
and pushes results back through Ontos's quality gate endpoint.
"""

import json
import logging
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.models.dqx_quality_proxy import (
    CheckCriticality,
    CheckResult,
    DQXResultImport,
    QualityProxyRunRequest,
    QualityProxyRunResponse,
)

logger = logging.getLogger("dqx_quality_proxy")


class DQXQualityService:
    """Orchestrates fetch → check → push for the VITAL quality proxy."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ontos_base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self._base_url, timeout=30.0)

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------

    async def fetch_qa_pairs(self, collection_id: str) -> list[dict]:
        """GET QA pairs from Ontos for a given collection."""
        url = f"/api/training-data/collections/{collection_id}/pairs"
        resp = await self._client.get(url, params={"limit": 1000})
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Heuristic checks
    # ------------------------------------------------------------------

    def run_heuristic_checks(
        self,
        qa_pairs: list[dict],
        request: QualityProxyRunRequest | None = None,
    ) -> list[CheckResult]:
        """Run built-in heuristic checks against fetched QA pairs."""
        req = request or QualityProxyRunRequest()
        results: list[CheckResult] = []

        results.append(self._check_message_completeness(qa_pairs))
        results.append(self._check_min_response_length(qa_pairs, req.min_response_length))
        results.append(self._check_json_valid_response(qa_pairs))
        results.append(self._check_quality_score_threshold(qa_pairs, req.quality_score_threshold))

        return results

    def _check_message_completeness(self, qa_pairs: list[dict]) -> CheckResult:
        """BLOCKING: Every QA pair must have system + user + assistant messages."""
        required_roles = {"system", "user", "assistant"}
        incomplete = 0
        for pair in qa_pairs:
            messages = pair.get("messages", [])
            roles = {m.get("role") for m in messages}
            if not required_roles.issubset(roles):
                incomplete += 1

        passed = incomplete == 0
        return CheckResult(
            check_id=uuid4(),
            check_name="message_completeness",
            passed=passed,
            criticality=CheckCriticality.BLOCKING,
            message=(
                "All QA pairs have system + user + assistant messages"
                if passed
                else f"{incomplete}/{len(qa_pairs)} pairs missing required message roles"
            ),
            details={"incomplete_count": incomplete, "total": len(qa_pairs)},
        )

    def _check_min_response_length(
        self, qa_pairs: list[dict], min_length: int
    ) -> CheckResult:
        """WARNING: Assistant response should be >= min_length chars."""
        short = 0
        for pair in qa_pairs:
            messages = pair.get("messages", [])
            assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
            if assistant_msgs:
                content = assistant_msgs[-1].get("content", "")
                if len(content) < min_length:
                    short += 1

        passed = short == 0
        return CheckResult(
            check_id=uuid4(),
            check_name="min_response_length",
            passed=passed,
            criticality=CheckCriticality.WARNING,
            message=(
                f"All assistant responses >= {min_length} chars"
                if passed
                else f"{short}/{len(qa_pairs)} pairs have short assistant responses (< {min_length} chars)"
            ),
            details={"short_count": short, "threshold": min_length, "total": len(qa_pairs)},
        )

    def _check_json_valid_response(self, qa_pairs: list[dict]) -> CheckResult:
        """WARNING: If a response looks like JSON, validate it parses."""
        invalid = 0
        checked = 0
        for pair in qa_pairs:
            messages = pair.get("messages", [])
            assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
            if not assistant_msgs:
                continue
            content = assistant_msgs[-1].get("content", "").strip()
            if content.startswith(("{", "[")):
                checked += 1
                try:
                    json.loads(content)
                except (json.JSONDecodeError, ValueError):
                    invalid += 1

        passed = invalid == 0
        return CheckResult(
            check_id=uuid4(),
            check_name="json_valid_response",
            passed=passed,
            criticality=CheckCriticality.WARNING,
            message=(
                f"All JSON-like responses are valid ({checked} checked)"
                if passed
                else f"{invalid}/{checked} JSON-like responses failed to parse"
            ),
            details={"invalid_count": invalid, "checked": checked, "total": len(qa_pairs)},
        )

    def _check_quality_score_threshold(
        self, qa_pairs: list[dict], threshold: float
    ) -> CheckResult:
        """INFO: quality_score >= threshold if the field is present."""
        below = 0
        scored = 0
        for pair in qa_pairs:
            score = pair.get("quality_score")
            if score is not None:
                scored += 1
                if score < threshold:
                    below += 1

        passed = below == 0
        return CheckResult(
            check_id=uuid4(),
            check_name="quality_score_threshold",
            passed=passed,
            criticality=CheckCriticality.INFO,
            message=(
                f"All scored pairs meet threshold >= {threshold} ({scored} scored)"
                if passed
                else f"{below}/{scored} pairs below quality_score threshold {threshold}"
            ),
            details={"below_count": below, "scored": scored, "threshold": threshold, "total": len(qa_pairs)},
        )

    # ------------------------------------------------------------------
    # Push
    # ------------------------------------------------------------------

    async def push_results_to_ontos(
        self,
        collection_id: str,
        results: list[CheckResult],
        dqx_run_id: str | None = None,
    ) -> dict:
        """POST check results to Ontos's import-dqx-results endpoint."""
        payload = DQXResultImport(
            check_results=results,
            source="vital-dqx-proxy",
            dqx_run_id=dqx_run_id,
        )
        url = f"/api/training-data/quality/collections/{collection_id}/import-dqx-results"
        resp = await self._client.post(url, json=payload.model_dump(mode="json"))
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------

    async def run_quality_proxy(
        self,
        collection_id: str,
        request: QualityProxyRunRequest | None = None,
    ) -> QualityProxyRunResponse:
        """Full proxy flow: fetch → check → push → return summary."""
        qa_pairs = await self.fetch_qa_pairs(collection_id)
        check_results = self.run_heuristic_checks(qa_pairs, request)

        passed_count = sum(1 for r in check_results if r.passed)
        pass_rate = passed_count / len(check_results) if check_results else 0.0

        # Compute average quality score from QA pairs (if available)
        scores = [p["quality_score"] for p in qa_pairs if p.get("quality_score") is not None]
        quality_score = sum(scores) / len(scores) if scores else 0.0

        # Push to Ontos
        ontos_run_id = None
        pushed = False
        try:
            ontos_resp = await self.push_results_to_ontos(collection_id, check_results)
            ontos_run_id = str(ontos_resp.get("id", ""))
            pushed = True
        except httpx.HTTPStatusError as exc:
            logger.error("Failed to push results to Ontos: %s", exc.response.text)
        except httpx.ConnectError:
            logger.error("Cannot connect to Ontos at %s", self._base_url)

        return QualityProxyRunResponse(
            collection_id=collection_id,
            ontos_run_id=ontos_run_id,
            total_pairs=len(qa_pairs),
            pass_rate=round(pass_rate, 4),
            quality_score=round(quality_score, 4),
            check_results=check_results,
            pushed_to_ontos=pushed,
        )


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_dqx_quality_service: DQXQualityService | None = None


def get_dqx_quality_service() -> DQXQualityService:
    """Get the singleton DQX quality service instance."""
    global _dqx_quality_service
    if _dqx_quality_service is None:
        _dqx_quality_service = DQXQualityService()
    return _dqx_quality_service
