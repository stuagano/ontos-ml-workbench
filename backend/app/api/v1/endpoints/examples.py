"""Example Store API endpoints - few-shot examples for dynamic learning."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.core.databricks import get_current_user
from app.models.example_store import (
    EffectivenessDashboardStats,
    ExampleBatchCreate,
    ExampleBatchResponse,
    ExampleCreate,
    ExampleEffectivenessStats,
    ExampleListResponse,
    ExampleResponse,
    ExampleSearchQuery,
    ExampleSearchResponse,
    ExampleUpdate,
    ExampleUsageEvent,
)
from app.services.example_store_service import get_example_store_service

router = APIRouter(prefix="/examples", tags=["examples"])


# =============================================================================
# Collection endpoints (no path parameters)
# =============================================================================

@router.get("", response_model=ExampleListResponse)
async def list_examples(
    databit_id: str | None = None,
    domain: str | None = None,
    function_name: str | None = None,
    min_quality_score: float | None = Query(default=None, ge=0, le=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List examples with optional filtering.

    Filter by databit association, domain, function name, or quality score.
    Results are ordered by effectiveness score (descending), then by creation date.
    """
    # TEMPORARY: Return empty list until schema/code alignment is fixed
    from app.models.example_store import ExampleListResponse
    return ExampleListResponse(examples=[], total=0, page=page, page_size=page_size)


@router.post("", response_model=ExampleResponse, status_code=201)
async def create_example(
    example: ExampleCreate,
    generate_embedding: bool = Query(default=True),
):
    """Create a new example.

    The example will be stored with an auto-generated ID. If generate_embedding
    is True (default), an embedding vector will be computed for semantic search.
    """
    service = get_example_store_service()
    user = get_current_user()

    return service.create_example(
        example=example,
        created_by=user,
        generate_embedding=generate_embedding,
    )


# =============================================================================
# Static path endpoints - MUST come before /{example_id} routes
# =============================================================================

@router.get("/top", response_model=list[ExampleResponse])
async def get_top_examples(
    databit_id: str | None = None,
    limit: int = Query(default=10, ge=1, le=50),
):
    """Get top examples by effectiveness score.

    Returns the most effective examples, optionally filtered by databit.
    Useful for selecting high-quality examples for few-shot prompts.
    """
    # TEMPORARY: Return empty list until schema/code alignment is fixed
    return []

    # service = get_example_store_service()
    # return service.get_top_examples(databit_id=databit_id, limit=limit)


@router.post("/search", response_model=ExampleSearchResponse)
async def search_examples(query: ExampleSearchQuery):
    """Search examples by text, embedding, or metadata.

    Supports multiple search modes:
    - Text search: Matches against input, output, and explanation fields
    - Metadata filters: Domain, function, difficulty, tags, quality scores
    - Combined: Apply both text search and metadata filters

    Results include similarity scores when using embedding-based search.
    """
    service = get_example_store_service()

    return service.search_examples(query)


@router.post("/batch", response_model=ExampleBatchResponse, status_code=201)
async def batch_create_examples(batch: ExampleBatchCreate):
    """Create multiple examples in a single request.

    Useful for bulk importing examples from synthetic data files or
    migrating from external systems.

    The response includes counts of successfully created and failed examples,
    along with IDs of created examples and any error details.
    """
    service = get_example_store_service()
    user = get_current_user()

    return service.batch_create(batch=batch, created_by=user)


@router.post("/regenerate-embeddings")
async def regenerate_embeddings(
    example_ids: list[str] | None = None,
    force: bool = Query(default=False),
):
    """Regenerate embeddings for examples.

    By default, only processes examples without existing embeddings.
    Use force=True to regenerate all embeddings (e.g., after changing
    the embedding model).

    Args:
        example_ids: Specific examples to process. If None, processes all.
        force: Regenerate even if embedding already exists.

    Returns:
        Counts of processed, skipped, and errored examples.
    """
    service = get_example_store_service()

    return service.regenerate_embeddings(
        example_ids=example_ids,
        force=force,
    )


@router.get("/dashboard", response_model=EffectivenessDashboardStats)
async def get_effectiveness_dashboard(
    domain: str | None = None,
    function_name: str | None = None,
    period: str = Query(default="30d", pattern="^(7d|30d|90d)$"),
):
    """Get aggregated effectiveness dashboard statistics.

    Provides summary metrics, breakdowns by domain and function,
    time-series usage data, and top/bottom performing examples.

    Args:
        domain: Filter to specific domain.
        function_name: Filter to specific function.
        period: Time range for historical data (7d, 30d, 90d).

    Returns:
        Aggregated dashboard statistics for visualization.
    """
    service = get_example_store_service()

    return service.get_dashboard_stats(
        domain=domain,
        function_name=function_name,
        period=period,
    )


# =============================================================================
# Dynamic path endpoints - /{example_id} routes come LAST
# =============================================================================

@router.get("/{example_id}", response_model=ExampleResponse)
async def get_example(example_id: str):
    """Get an example by ID."""
    service = get_example_store_service()

    result = service.get_example(example_id)
    if not result:
        raise HTTPException(status_code=404, detail="Example not found")

    return result


@router.put("/{example_id}", response_model=ExampleResponse)
async def update_example(example_id: str, update: ExampleUpdate):
    """Update an existing example.

    Only provided fields will be updated. Embeddings are NOT automatically
    regenerated - use the regenerate-embeddings endpoint if needed.
    """
    service = get_example_store_service()

    result = service.update_example(example_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Example not found")

    return result


@router.delete("/{example_id}", status_code=204)
async def delete_example(example_id: str):
    """Delete an example.

    This permanently removes the example and its effectiveness history.
    """
    service = get_example_store_service()

    deleted = service.delete_example(example_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Example not found")


@router.post("/{example_id}/track", status_code=204)
async def track_example_usage(
    example_id: str,
    context: str | None = None,
    training_run_id: str | None = None,
    model_id: str | None = None,
    outcome: str | None = None,
):
    """Record usage of an example.

    Track when an example is used in inference or training to build
    effectiveness metrics over time.

    Args:
        context: Description of how the example was used
        training_run_id: Associated training run (if applicable)
        model_id: Model that used the example
        outcome: Result of using the example (success/failure/etc)
    """
    service = get_example_store_service()

    # Verify example exists
    existing = service.get_example(example_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Example not found")

    event = ExampleUsageEvent(
        example_id=example_id,
        used_at=datetime.utcnow(),
        context=context,
        training_run_id=training_run_id,
        model_id=model_id,
        outcome=outcome,
    )

    service.track_usage(event)


@router.get("/{example_id}/effectiveness", response_model=ExampleEffectivenessStats)
async def get_example_effectiveness(example_id: str):
    """Get effectiveness statistics for an example.

    Returns usage counts, success rates, and effectiveness trends
    based on tracked usage events.
    """
    service = get_example_store_service()

    stats = service.get_effectiveness_stats(example_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Example not found")

    return stats
