"""
Attribution Service
===================

Computes and tracks attribution of model performance to specific training data.

Supports multiple attribution methods:
1. Ablation: Remove bits and measure impact (fast, O(n))
2. Shapley: Game-theoretic fair attribution (expensive, O(2^n) or sampled)

This enables:
- Understanding which data contributes to model capabilities
- Debugging model regressions to specific data changes
- ROI analysis of data curation investments
- Targeted data improvement recommendations
"""

import logging
import math
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Callable

import numpy as np

from app.core.config import get_settings
from app.models.attribution import (
    AttributionComparisonResponse,
    AttributionMethod,
    AttributionResponse,
    BitChange,
    BitContribution,
    BitImpactEntry,
    BitImpactHistoryResponse,
    RegressionAnalysisResponse,
    RegressionCause,
)
from app.services.sql_service import execute_sql

logger = logging.getLogger(__name__)


# ============================================================================
# Ablation Attribution
# ============================================================================


class AblationAttributor:
    """
    Computes attribution by ablating (removing) bits one at a time.

    For each bit:
    1. Train/evaluate model WITHOUT that bit
    2. Compare to full model performance
    3. Difference = bit's contribution

    Simple and interpretable, but expensive (requires N+1 evaluations).
    """

    def __init__(
        self,
        model_trainer: Callable,
        model_evaluator: Callable,
        eval_dataset: Any,
        metrics: list[str] | None = None,
    ):
        """
        Initialize ablation attributor.

        Args:
            model_trainer: Callable(bits) -> model
            model_evaluator: Callable(model, dataset) -> metrics dict
            eval_dataset: Dataset for evaluation
            metrics: Which metrics to track
        """
        self.model_trainer = model_trainer
        self.model_evaluator = model_evaluator
        self.eval_dataset = eval_dataset
        self.metrics = metrics or ["accuracy", "f1_score"]

    def compute(
        self,
        bits: list[tuple[str, int]],
        baseline_metrics: dict[str, float] | None = None,
        parallel: bool = True,
        max_workers: int = 4,
    ) -> list[BitContribution]:
        """
        Compute ablation-based attribution.

        Args:
            bits: List of (bit_id, version) tuples to attribute
            baseline_metrics: Pre-computed full model metrics (optional)
            parallel: Run ablations in parallel
            max_workers: Number of parallel workers

        Returns:
            List of BitContribution with scores
        """
        # Get baseline (full model) performance
        if baseline_metrics is None:
            logger.info("Computing baseline metrics with all bits")
            baseline_model = self.model_trainer(bits)
            baseline_metrics = self.model_evaluator(baseline_model, self.eval_dataset)

        logger.info(f"Baseline metrics: {baseline_metrics}")

        def evaluate_without_bit(bit_to_remove: tuple[str, int]) -> BitContribution:
            """Train and evaluate with one bit removed."""
            remaining_bits = [b for b in bits if b != bit_to_remove]

            logger.info(f"Evaluating without {bit_to_remove[0]} v{bit_to_remove[1]}")

            model = self.model_trainer(remaining_bits)
            metrics = self.model_evaluator(model, self.eval_dataset)

            # Impact = baseline - ablated (positive = bit helps)
            return BitContribution(
                bit_id=bit_to_remove[0],
                bit_version=bit_to_remove[1],
                accuracy_impact=baseline_metrics.get("accuracy", 0)
                - metrics.get("accuracy", 0),
                precision_impact=baseline_metrics.get("precision", 0)
                - metrics.get("precision", 0),
                recall_impact=baseline_metrics.get("recall", 0)
                - metrics.get("recall", 0),
                f1_impact=baseline_metrics.get("f1_score", 0)
                - metrics.get("f1_score", 0),
            )

        contributions = []
        if parallel and len(bits) > 1:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(evaluate_without_bit, bit): bit for bit in bits
                }
                for future in as_completed(futures):
                    contributions.append(future.result())
        else:
            for bit in bits:
                contributions.append(evaluate_without_bit(bit))

        return self._rank_contributions(contributions)

    def _rank_contributions(
        self, contributions: list[BitContribution]
    ) -> list[BitContribution]:
        """Compute importance scores and sort by contribution."""
        for c in contributions:
            c.importance_score = (
                c.accuracy_impact * 0.3
                + c.f1_impact * 0.4
                + c.precision_impact * 0.15
                + c.recall_impact * 0.15
            )

        contributions = sorted(
            contributions, key=lambda x: x.importance_score, reverse=True
        )

        for i, c in enumerate(contributions):
            c.importance_rank = i + 1

        return contributions


# ============================================================================
# Shapley Attribution
# ============================================================================


class ShapleyAttributor:
    """
    Computes Shapley values for fair attribution across bits.

    Shapley values provide a theoretically principled way to distribute
    credit among bits that accounts for interactions. However, exact
    computation is exponential in the number of bits.

    Uses Monte Carlo sampling for approximation when there are many bits.
    """

    def __init__(
        self,
        model_trainer: Callable,
        model_evaluator: Callable,
        eval_dataset: Any,
        metrics: list[str] | None = None,
        n_samples: int = 100,
    ):
        self.model_trainer = model_trainer
        self.model_evaluator = model_evaluator
        self.eval_dataset = eval_dataset
        self.metrics = metrics or ["accuracy", "f1_score"]
        self.n_samples = n_samples
        self._eval_cache: dict[frozenset, dict[str, float]] = {}

    def compute(
        self,
        bits: list[tuple[str, int]],
        exact: bool = False,
    ) -> list[BitContribution]:
        """
        Compute Shapley-based attribution.

        Args:
            bits: List of (bit_id, version) tuples
            exact: Use exact computation (only feasible for <12 bits)

        Returns:
            List of BitContribution with Shapley values
        """
        n_bits = len(bits)

        if exact and n_bits <= 12:
            contributions = self._compute_exact_shapley(bits)
        else:
            contributions = self._compute_monte_carlo_shapley(bits)

        return self._rank_contributions(contributions)

    def _evaluate_coalition(
        self, coalition: set[tuple[str, int]]
    ) -> dict[str, float]:
        """Evaluate model with a specific coalition of bits."""
        cache_key = frozenset(coalition)

        if cache_key in self._eval_cache:
            return self._eval_cache[cache_key]

        if not coalition:
            return {m: 0.0 for m in self.metrics}

        model = self.model_trainer(list(coalition))
        metrics = self.model_evaluator(model, self.eval_dataset)

        self._eval_cache[cache_key] = metrics
        return metrics

    def _compute_exact_shapley(
        self, bits: list[tuple[str, int]]
    ) -> list[BitContribution]:
        """Compute exact Shapley values (exponential complexity)."""
        import itertools

        n = len(bits)
        shapley_values = {bit: {m: 0.0 for m in self.metrics} for bit in bits}

        for bit in bits:
            other_bits = [b for b in bits if b != bit]

            for size in range(n):
                weight = (math.factorial(size) * math.factorial(n - size - 1)) / math.factorial(n)

                for coalition in itertools.combinations(other_bits, size):
                    coalition_set = set(coalition)
                    coalition_with_bit = coalition_set | {bit}

                    v_with = self._evaluate_coalition(coalition_with_bit)
                    v_without = self._evaluate_coalition(coalition_set)

                    for metric in self.metrics:
                        marginal = v_with.get(metric, 0) - v_without.get(metric, 0)
                        shapley_values[bit][metric] += weight * marginal

        return self._shapley_to_contributions(bits, shapley_values)

    def _compute_monte_carlo_shapley(
        self, bits: list[tuple[str, int]]
    ) -> list[BitContribution]:
        """Approximate Shapley values using Monte Carlo sampling."""
        shapley_values = {bit: {m: 0.0 for m in self.metrics} for bit in bits}

        for _ in range(self.n_samples):
            perm = list(bits)
            np.random.shuffle(perm)

            coalition: set[tuple[str, int]] = set()
            prev_value = {m: 0.0 for m in self.metrics}

            for bit in perm:
                coalition.add(bit)
                curr_value = self._evaluate_coalition(coalition)

                for metric in self.metrics:
                    marginal = curr_value.get(metric, 0) - prev_value.get(metric, 0)
                    shapley_values[bit][metric] += marginal / self.n_samples

                prev_value = curr_value

        return self._shapley_to_contributions(bits, shapley_values)

    def _shapley_to_contributions(
        self,
        bits: list[tuple[str, int]],
        shapley_values: dict,
    ) -> list[BitContribution]:
        """Convert Shapley values dict to BitContribution list."""
        contributions = []
        for bit in bits:
            sv = shapley_values[bit]
            contributions.append(
                BitContribution(
                    bit_id=bit[0],
                    bit_version=bit[1],
                    accuracy_impact=sv.get("accuracy", 0),
                    precision_impact=sv.get("precision", 0),
                    recall_impact=sv.get("recall", 0),
                    f1_impact=sv.get("f1_score", 0),
                )
            )
        return contributions

    def _rank_contributions(
        self, contributions: list[BitContribution]
    ) -> list[BitContribution]:
        """Compute importance scores and sort."""
        for c in contributions:
            c.importance_score = (
                c.accuracy_impact * 0.3
                + c.f1_impact * 0.4
                + c.precision_impact * 0.15
                + c.recall_impact * 0.15
            )

        contributions = sorted(
            contributions, key=lambda x: x.importance_score, reverse=True
        )

        for i, c in enumerate(contributions):
            c.importance_rank = i + 1

        return contributions


# ============================================================================
# Attribution Service Functions
# ============================================================================


async def compute_attribution(
    model_name: str,
    model_version: str,
    method: AttributionMethod = AttributionMethod.ABLATION,
    metrics: list[str] | None = None,
) -> AttributionResponse:
    """
    Compute attribution for a model version.

    In production, this would:
    1. Get the bits used for training from lineage tables
    2. Set up actual model training/evaluation functions
    3. Run the attribution computation
    4. Store results in attribution tables

    For now, returns simulated attribution data.
    """
    logger.info(f"Computing {method.value} attribution for {model_name} v{model_version}")
    start_time = datetime.now()

    # Get bits used for this model (would query lineage tables)
    bits = await _get_model_bits(model_name, model_version)

    if not bits:
        # Return simulated data for demo
        return _simulate_attribution(model_name, model_version, method)

    # In production: set up real trainer/evaluator and compute
    # For now, simulate the computation
    contributions = _simulate_contributions(bits)

    compute_time = (datetime.now() - start_time).total_seconds()

    # Store attribution results
    await _store_attribution(model_name, model_version, method, contributions)

    return AttributionResponse(
        model_name=model_name,
        model_version=model_version,
        method=method.value,
        computed_at=datetime.now(),
        total_bits=len(contributions),
        positive_contributors=sum(1 for c in contributions if c.importance_score > 0.01),
        negative_contributors=sum(1 for c in contributions if c.importance_score < -0.01),
        neutral_contributors=sum(
            1 for c in contributions if abs(c.importance_score) <= 0.01
        ),
        contributions=contributions,
        top_positive_bits=[
            c.bit_id for c in contributions[:3] if c.importance_score > 0
        ],
        top_negative_bits=[
            c.bit_id
            for c in sorted(contributions, key=lambda x: x.importance_score)[:3]
            if c.importance_score < 0
        ],
        compute_time_seconds=compute_time,
    )


async def get_attribution(
    model_name: str,
    model_version: str,
    method: AttributionMethod | None = None,
) -> AttributionResponse | None:
    """Get stored attribution results for a model version."""
    settings = get_settings()

    method_clause = f"AND attribution_method = '{method.value}'" if method else ""

    query = f"""
    SELECT * FROM {settings.uc_catalog}.{settings.uc_schema}.bit_attribution
    WHERE model_name = '{model_name}'
      AND model_version = '{model_version}'
      {method_clause}
    ORDER BY importance_rank
    """

    try:
        result = await execute_sql(query)
        rows = result.get("data", [])

        if not rows:
            return None

        contributions = [
            BitContribution(
                bit_id=row.get("bit_id", ""),
                bit_version=row.get("bit_version", 1),
                accuracy_impact=row.get("accuracy_impact", 0),
                precision_impact=row.get("precision_impact", 0),
                recall_impact=row.get("recall_impact", 0),
                f1_impact=row.get("f1_impact", 0),
                importance_rank=row.get("importance_rank"),
                importance_score=row.get("importance_score", 0),
            )
            for row in rows
        ]

        return AttributionResponse(
            model_name=model_name,
            model_version=model_version,
            method=rows[0].get("attribution_method", "ablation"),
            computed_at=rows[0].get("computed_at"),
            total_bits=len(contributions),
            positive_contributors=sum(
                1 for c in contributions if c.importance_score > 0.01
            ),
            negative_contributors=sum(
                1 for c in contributions if c.importance_score < -0.01
            ),
            contributions=contributions,
            top_positive_bits=[
                c.bit_id for c in contributions[:3] if c.importance_score > 0
            ],
            top_negative_bits=[
                c.bit_id
                for c in sorted(contributions, key=lambda x: x.importance_score)[:3]
                if c.importance_score < 0
            ],
        )

    except Exception as e:
        logger.warning(f"Error getting attribution: {e}")
        return None


async def compare_attributions(
    model_name: str,
    version_a: str,
    version_b: str,
) -> AttributionComparisonResponse:
    """Compare attribution between two model versions."""
    attr_a = await get_attribution(model_name, version_a)
    attr_b = await get_attribution(model_name, version_b)

    # Handle missing data with simulated results
    if not attr_a:
        attr_a = _simulate_attribution(model_name, version_a, AttributionMethod.ABLATION)
    if not attr_b:
        attr_b = _simulate_attribution(model_name, version_b, AttributionMethod.ABLATION)

    # Index by bit
    by_bit_a = {(c.bit_id, c.bit_version): c for c in attr_a.contributions}
    by_bit_b = {(c.bit_id, c.bit_version): c for c in attr_b.contributions}

    all_bits = set(by_bit_a.keys()) | set(by_bit_b.keys())

    changes: list[BitChange] = []
    for bit in all_bits:
        a = by_bit_a.get(bit)
        b = by_bit_b.get(bit)

        if a and b:
            delta = b.importance_score - a.importance_score
            change_type = "modified" if abs(delta) > 0.01 else "unchanged"
            changes.append(
                BitChange(
                    bit_id=bit[0],
                    bit_version=bit[1],
                    change_type=change_type,
                    importance_delta=delta,
                    importance_a=a.importance_score,
                    importance_b=b.importance_score,
                )
            )
        elif a:
            changes.append(
                BitChange(
                    bit_id=bit[0],
                    bit_version=bit[1],
                    change_type="removed",
                    importance_delta=-a.importance_score,
                    importance_a=a.importance_score,
                    importance_b=0,
                )
            )
        else:
            changes.append(
                BitChange(
                    bit_id=bit[0],
                    bit_version=bit[1],
                    change_type="added",
                    importance_delta=b.importance_score if b else 0,
                    importance_a=0,
                    importance_b=b.importance_score if b else 0,
                )
            )

    changes = sorted(changes, key=lambda x: abs(x.importance_delta), reverse=True)

    return AttributionComparisonResponse(
        model_name=model_name,
        version_a=version_a,
        version_b=version_b,
        total_bits_a=len(by_bit_a),
        total_bits_b=len(by_bit_b),
        bits_added=sum(1 for c in changes if c.change_type == "added"),
        bits_removed=sum(1 for c in changes if c.change_type == "removed"),
        bits_modified=sum(1 for c in changes if c.change_type == "modified"),
        changes=changes,
        top_impact_changes=changes[:5],
    )


async def analyze_regression(
    model_name: str,
    good_version: str,
    bad_version: str,
    metrics_delta: dict[str, float] | None = None,
) -> RegressionAnalysisResponse:
    """
    Analyze what caused a model regression between versions.

    Compares good and bad versions to identify likely causes in training data.
    """
    # Get attribution comparison
    comparison = await compare_attributions(model_name, good_version, bad_version)

    likely_causes: list[RegressionCause] = []

    for change in comparison.changes:
        # Removed bits that were important
        if change.change_type == "removed" and change.importance_a > 0.05:
            likely_causes.append(
                RegressionCause(
                    cause_type="removed_important_bit",
                    bit_id=change.bit_id,
                    bit_version=change.bit_version,
                    impact=change.importance_a,
                    explanation=f"Bit {change.bit_id} was important (score {change.importance_a:.2f}) and was removed",
                    recommendation="Consider restoring this bit or finding a replacement",
                )
            )

        # New bits that hurt performance
        if change.change_type == "added" and change.importance_b < -0.02:
            likely_causes.append(
                RegressionCause(
                    cause_type="harmful_new_bit",
                    bit_id=change.bit_id,
                    bit_version=change.bit_version,
                    impact=change.importance_b,
                    explanation=f"New bit {change.bit_id} appears to hurt performance",
                    recommendation="Review this bit for quality issues or conflicts",
                )
            )

        # Bits that became less effective
        if change.change_type == "modified" and change.importance_delta < -0.03:
            likely_causes.append(
                RegressionCause(
                    cause_type="bit_became_less_effective",
                    bit_id=change.bit_id,
                    bit_version=change.bit_version,
                    impact=change.importance_delta,
                    explanation=f"Bit {change.bit_id} became less effective (delta: {change.importance_delta:.3f})",
                    recommendation="Check if bit version changed or if interactions changed",
                )
            )

    likely_causes = sorted(likely_causes, key=lambda x: abs(x.impact), reverse=True)

    return RegressionAnalysisResponse(
        model_name=model_name,
        good_version=good_version,
        bad_version=bad_version,
        metrics_delta=metrics_delta,
        bit_changes={
            "added": comparison.bits_added,
            "removed": comparison.bits_removed,
            "modified": comparison.bits_modified,
        },
        likely_causes=likely_causes,
        top_recommendation=likely_causes[0].recommendation
        if likely_causes
        else "No clear cause identified",
    )


async def get_bit_impact_history(bit_id: str) -> BitImpactHistoryResponse:
    """Get history of a bit's impact across all models."""
    settings = get_settings()

    query = f"""
    SELECT
        model_name,
        model_version,
        attribution_method,
        importance_rank,
        importance_score,
        accuracy_impact,
        f1_impact,
        computed_at
    FROM {settings.uc_catalog}.{settings.uc_schema}.bit_attribution
    WHERE bit_id = '{bit_id}'
    ORDER BY computed_at DESC
    """

    try:
        result = await execute_sql(query)
        rows = result.get("data", [])

        history = [
            BitImpactEntry(
                model_name=row.get("model_name", ""),
                model_version=row.get("model_version", ""),
                attribution_method=row.get("attribution_method", "ablation"),
                importance_rank=row.get("importance_rank"),
                importance_score=row.get("importance_score", 0),
                accuracy_impact=row.get("accuracy_impact"),
                f1_impact=row.get("f1_impact"),
                computed_at=row.get("computed_at"),
            )
            for row in rows
        ]

        # Calculate summary
        scores = [h.importance_score for h in history if h.importance_score]
        avg_importance = sum(scores) / len(scores) if scores else 0

        models_used = len(set((h.model_name, h.model_version) for h in history))

        # Determine trend
        if len(history) >= 2:
            recent = history[0].importance_score
            older = history[-1].importance_score
            trend = "increasing" if recent > older else "decreasing" if recent < older else "stable"
        else:
            trend = "insufficient_data"

        return BitImpactHistoryResponse(
            bit_id=bit_id,
            impact_history=history,
            summary={
                "models_used_in": models_used,
                "average_importance": round(avg_importance, 3),
                "trend": trend,
            },
        )

    except Exception as e:
        logger.warning(f"Error getting bit impact history: {e}")
        return BitImpactHistoryResponse(
            bit_id=bit_id,
            impact_history=[],
            summary={"models_used_in": 0, "average_importance": 0, "trend": "unknown"},
        )


# ============================================================================
# Helper Functions
# ============================================================================


async def _get_model_bits(
    model_name: str, model_version: str
) -> list[tuple[str, int]]:
    """Get bits used to train a model from lineage tables."""
    settings = get_settings()

    query = f"""
    SELECT DISTINCT bit_id, bit_version
    FROM {settings.uc_catalog}.{settings.uc_schema}.model_bits
    WHERE model_name = '{model_name}'
      AND model_version = '{model_version}'
    """

    try:
        result = await execute_sql(query)
        rows = result.get("data", [])
        return [(row["bit_id"], row["bit_version"]) for row in rows]
    except Exception:
        return []


async def _store_attribution(
    model_name: str,
    model_version: str,
    method: AttributionMethod,
    contributions: list[BitContribution],
) -> None:
    """Store attribution results in the database."""
    settings = get_settings()

    for c in contributions:
        query = f"""
        INSERT INTO {settings.uc_catalog}.{settings.uc_schema}.bit_attribution
        (model_name, model_version, bit_id, bit_version, attribution_method,
         accuracy_impact, precision_impact, recall_impact, f1_impact,
         importance_rank, importance_score, computed_at)
        VALUES (
            '{model_name}', '{model_version}',
            '{c.bit_id}', {c.bit_version}, '{method.value}',
            {c.accuracy_impact}, {c.precision_impact},
            {c.recall_impact}, {c.f1_impact},
            {c.importance_rank or 'NULL'}, {c.importance_score},
            CURRENT_TIMESTAMP()
        )
        """
        try:
            await execute_sql(query)
        except Exception as e:
            logger.warning(f"Failed to store attribution: {e}")


def _simulate_contributions(bits: list[tuple[str, int]]) -> list[BitContribution]:
    """Generate simulated contributions for demo purposes."""
    contributions = []
    for i, (bit_id, version) in enumerate(bits):
        score = 0.4 - (i * 0.08)  # Decreasing importance
        contributions.append(
            BitContribution(
                bit_id=bit_id,
                bit_version=version,
                accuracy_impact=score * 0.8,
                f1_impact=score,
                precision_impact=score * 0.7,
                recall_impact=score * 0.75,
                importance_rank=i + 1,
                importance_score=score,
            )
        )
    return contributions


def _simulate_attribution(
    model_name: str,
    model_version: str,
    method: AttributionMethod,
) -> AttributionResponse:
    """Return simulated attribution for demo purposes."""
    contributions = [
        BitContribution(
            bit_id="project.amer_qa",
            bit_version=2,
            importance_rank=1,
            importance_score=0.35,
            accuracy_impact=0.12,
            f1_impact=0.15,
            capabilities=["general_qa", "product_knowledge"],
        ),
        BitContribution(
            bit_id="project.troubleshooting",
            bit_version=3,
            importance_rank=2,
            importance_score=0.28,
            accuracy_impact=0.09,
            f1_impact=0.11,
            capabilities=["technical_support", "debugging"],
        ),
        BitContribution(
            bit_id="project.emea_qa",
            bit_version=1,
            importance_rank=3,
            importance_score=0.22,
            accuracy_impact=0.07,
            f1_impact=0.09,
            capabilities=["regional_knowledge", "compliance"],
        ),
        BitContribution(
            bit_id="project.edge_cases",
            bit_version=4,
            importance_rank=4,
            importance_score=0.10,
            accuracy_impact=0.03,
            f1_impact=0.04,
            capabilities=["edge_cases"],
        ),
        BitContribution(
            bit_id="project.pricing",
            bit_version=2,
            importance_rank=5,
            importance_score=0.05,
            accuracy_impact=0.02,
            f1_impact=0.02,
            capabilities=["pricing", "billing"],
        ),
    ]

    return AttributionResponse(
        model_name=model_name,
        model_version=model_version,
        method=method.value,
        computed_at=datetime.now(),
        total_bits=len(contributions),
        positive_contributors=5,
        negative_contributors=0,
        neutral_contributors=0,
        contributions=contributions,
        top_positive_bits=["project.amer_qa", "project.troubleshooting"],
        top_negative_bits=[],
        compute_time_seconds=2.5,
    )
