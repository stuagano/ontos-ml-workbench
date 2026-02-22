"""Image proxy endpoint for serving Unity Catalog volume images."""

import logging
import mimetypes

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse, StreamingResponse

from app.core.databricks import get_workspace_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])


@router.get("/proxy")
async def proxy_image(path: str = Query(..., description="UC volume path or external URL")):
    """
    Stream an image from a Unity Catalog volume path, or redirect to an external URL.

    - Volume paths (starting with /Volumes/) are streamed through the Databricks Files API.
    - HTTP/HTTPS URLs receive a 302 redirect.
    """
    # External URLs: redirect directly
    if path.startswith(("http://", "https://")):
        return RedirectResponse(url=path, status_code=302)

    # Validate volume path to prevent traversal
    if not path.startswith("/Volumes/"):
        raise HTTPException(
            status_code=400,
            detail="Path must start with /Volumes/ or be an HTTP(S) URL",
        )

    # Block path traversal attempts
    if ".." in path:
        raise HTTPException(status_code=400, detail="Path traversal not allowed")

    try:
        workspace_client = get_workspace_client()

        # Download file from volume using Files API
        # Volume paths: /Volumes/cat/schema/vol/file -> pass directly
        response = workspace_client.files.download(path)
        image_bytes = response.read()

        # Determine content type from file extension
        content_type, _ = mimetypes.guess_type(path)
        if not content_type:
            content_type = "application/octet-stream"

        return StreamingResponse(
            iter([image_bytes]),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
            },
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except Exception as e:
        logger.error(f"Failed to proxy image from {path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load image: {str(e)}")
