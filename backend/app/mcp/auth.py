"""MCP Bearer token authentication middleware.

Validates tokens against the mcp_tokens table using SHA-256 hashing,
enforces scope/rate limits, and stores the authenticated context in a
contextvar for tool handlers to read.
"""

import contextvars
import hashlib
import json
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime

from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Scope hierarchy: read < read_write < admin
_SCOPE_LEVELS = {"read": 1, "read_write": 2, "admin": 3}


@dataclass
class MCPTokenContext:
    """Authenticated token context available to tool/resource handlers."""

    token_id: str
    name: str
    scope: str
    allowed_tools: list[str] | None  # None = all tools allowed
    allowed_resources: list[str] | None  # None = all resources allowed
    owner_email: str
    rate_limit_per_minute: int = 60

    def has_scope(self, required: str) -> bool:
        return _SCOPE_LEVELS.get(self.scope, 0) >= _SCOPE_LEVELS.get(required, 0)

    def can_use_tool(self, tool_name: str) -> bool:
        if self.allowed_tools is None:
            return True
        return tool_name in self.allowed_tools


# Contextvar storing the current request's token context
_current_mcp_token: contextvars.ContextVar[MCPTokenContext | None] = (
    contextvars.ContextVar("_current_mcp_token", default=None)
)


def get_current_mcp_token() -> MCPTokenContext | None:
    """Read the current MCP token context (set by middleware)."""
    return _current_mcp_token.get()


# ---------------------------------------------------------------------------
# In-memory sliding-window rate limiter (per token)
# ---------------------------------------------------------------------------

_rate_windows: dict[str, deque] = {}


def _check_rate_limit(token_id: str, limit: int) -> bool:
    """Return True if the request is within the rate limit (60s window)."""
    now = time.monotonic()
    window = _rate_windows.setdefault(token_id, deque())

    # Evict entries older than 60 seconds
    while window and window[0] < now - 60:
        window.popleft()

    if len(window) >= limit:
        return False

    window.append(now)
    return True


# ---------------------------------------------------------------------------
# Token validation function (used by Starlette BaseHTTPMiddleware)
# ---------------------------------------------------------------------------

async def validate_mcp_token(request: Request) -> JSONResponse | MCPTokenContext:
    """Validate MCP token from request headers.

    Returns MCPTokenContext on success, JSONResponse (error) on failure.
    Also sets the _current_mcp_token contextvar on success.
    """
    # Extract MCP token from headers.
    # Priority: X-MCP-Token header (for Databricks Apps where Authorization
    # is consumed by the proxy), then Authorization: Bearer for direct access.
    raw_token = None

    # Check X-MCP-Token first (works behind Databricks Apps proxy)
    mcp_header = request.headers.get("x-mcp-token", "").strip()
    if mcp_header:
        raw_token = mcp_header

    # Fallback to Authorization: Bearer (for direct access / local dev)
    if not raw_token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer ") and auth_header[7:].startswith("mcp_"):
            raw_token = auth_header[7:]

    if not raw_token:
        return JSONResponse(
            status_code=401,
            content={"error": "Missing MCP token. Set X-MCP-Token header or Authorization: Bearer mcp_..."},
        )

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    # Look up token in mcp_tokens table
    try:
        from app.services.sql_service import get_sql_service
        from app.core.config import get_settings

        settings = get_settings()
        sql = get_sql_service()
        table = settings.get_table("mcp_tokens")

        rows = sql.execute(
            f"SELECT id, name, scope, allowed_tools, allowed_resources, "
            f"owner_email, is_active, expires_at, rate_limit_per_minute "
            f"FROM {table} WHERE token_hash = '{token_hash}'"
        )
    except Exception as e:
        logger.error(f"MCP auth: DB lookup failed: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal auth error"})

    if not rows:
        return JSONResponse(status_code=401, content={"error": "Invalid token"})

    row = rows[0]

    # Check active
    if not row.get("is_active"):
        return JSONResponse(status_code=403, content={"error": "Token revoked"})

    # Check expiry
    expires_at = row.get("expires_at")
    if expires_at:
        try:
            exp = (
                datetime.fromisoformat(str(expires_at))
                if isinstance(expires_at, str)
                else expires_at
            )
            if exp < datetime.utcnow():
                return JSONResponse(status_code=403, content={"error": "Token expired"})
        except (ValueError, TypeError):
            pass  # Unparseable expiry — allow through

    # Rate limit
    rate_limit = int(row.get("rate_limit_per_minute") or 60)
    if not _check_rate_limit(row["id"], rate_limit):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "limit": rate_limit},
        )

    # Parse JSON list fields
    allowed_tools = row.get("allowed_tools")
    if isinstance(allowed_tools, str):
        try:
            allowed_tools = json.loads(allowed_tools)
        except (ValueError, TypeError):
            allowed_tools = None

    allowed_resources = row.get("allowed_resources")
    if isinstance(allowed_resources, str):
        try:
            allowed_resources = json.loads(allowed_resources)
        except (ValueError, TypeError):
            allowed_resources = None

    # Build context
    ctx = MCPTokenContext(
        token_id=row["id"],
        name=row.get("name", ""),
        scope=row.get("scope", "read"),
        allowed_tools=allowed_tools,
        allowed_resources=allowed_resources,
        owner_email=row.get("owner_email", ""),
        rate_limit_per_minute=rate_limit,
    )

    # Set contextvar
    _current_mcp_token.set(ctx)

    # Fire-and-forget: update last_used_at and usage_count
    try:
        now = datetime.utcnow().isoformat()
        sql.execute_update(
            f"UPDATE {table} SET last_used_at = '{now}', "
            f"usage_count = COALESCE(usage_count, 0) + 1 "
            f"WHERE id = '{row['id']}'"
        )
    except Exception:
        pass  # Non-critical

    return ctx
