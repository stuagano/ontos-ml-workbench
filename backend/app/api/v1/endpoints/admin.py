"""Admin endpoints for cache management and system health."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.cache_service import get_cache_service

router = APIRouter(prefix="/admin", tags=["admin"])
cache = get_cache_service()


class CacheStats(BaseModel):
    total_entries: int
    keys: list[str]


class ClearCacheResponse(BaseModel):
    success: bool
    entries_cleared: int


@router.get("/cache/stats", response_model=CacheStats)
async def get_cache_stats():
    """Get cache statistics."""
    return CacheStats(
        total_entries=len(cache._cache),
        keys=list(cache._cache.keys()),
    )


@router.post("/cache/clear", response_model=ClearCacheResponse)
async def clear_cache(pattern: str | None = None):
    """Clear cache entries.

    Args:
        pattern: If provided, only clear keys containing this pattern.
                 If None, clear all cache.
    """
    entries_before = len(cache._cache)

    if pattern:
        cache.invalidate_pattern(pattern)
    else:
        cache.clear()

    entries_after = len(cache._cache)
    entries_cleared = entries_before - entries_after

    return ClearCacheResponse(
        success=True,
        entries_cleared=entries_cleared,
    )
