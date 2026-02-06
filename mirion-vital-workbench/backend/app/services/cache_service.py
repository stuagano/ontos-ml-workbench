"""In-memory cache service with TTL for expensive operations."""

import logging
import time
from typing import Any, Callable

logger = logging.getLogger(__name__)


class CacheService:
    """Simple in-memory cache with time-to-live."""

    def __init__(self):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._default_ttl = 300  # 5 minutes

    def get(self, key: str) -> Any | None:
        """Get value from cache if not expired."""
        if key in self._cache:
            value, expires_at = self._cache[key]
            if time.time() < expires_at:
                logger.debug(f"Cache HIT: {key}")
                return value
            else:
                logger.debug(f"Cache EXPIRED: {key}")
                del self._cache[key]
        else:
            logger.debug(f"Cache MISS: {key}")
        return None

    def set(self, key: str, value: Any, ttl: int | None = None):
        """Set value in cache with TTL in seconds."""
        if ttl is None:
            ttl = self._default_ttl
        expires_at = time.time() + ttl
        self._cache[key] = (value, expires_at)
        logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")

    def invalidate(self, key: str):
        """Remove value from cache."""
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Cache INVALIDATE: {key}")

    def invalidate_pattern(self, pattern: str):
        """Remove all keys matching pattern (contains)."""
        keys_to_delete = [k for k in self._cache if pattern in k]
        for key in keys_to_delete:
            del self._cache[key]
            logger.debug(f"Cache INVALIDATE: {key}")

    def clear(self):
        """Clear all cache."""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cache CLEAR: {count} entries removed")

    def cached(self, key: str, ttl: int | None = None):
        """Decorator to cache function results."""

        def decorator(func: Callable):
            def wrapper(*args, **kwargs):
                cached_value = self.get(key)
                if cached_value is not None:
                    return cached_value

                result = func(*args, **kwargs)
                self.set(key, result, ttl)
                return result

            return wrapper

        return decorator


# Singleton instance
_cache_service: CacheService | None = None


def get_cache_service() -> CacheService:
    """Get or create cache service singleton."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
