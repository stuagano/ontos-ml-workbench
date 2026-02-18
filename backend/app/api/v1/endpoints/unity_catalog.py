"""Unity Catalog browsing API endpoints."""

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

from app.core.databricks import get_workspace_client
from app.services.cache_service import get_cache_service

router = APIRouter(prefix="/uc", tags=["unity-catalog"])
cache = get_cache_service()


class CatalogInfo(BaseModel):
    name: str
    comment: str | None = None
    owner: str | None = None


class SchemaInfo(BaseModel):
    name: str
    catalog_name: str
    comment: str | None = None
    owner: str | None = None


class TableInfo(BaseModel):
    name: str
    catalog_name: str
    schema_name: str
    table_type: str  # MANAGED, EXTERNAL, VIEW
    comment: str | None = None
    columns: list[dict] | None = None


class VolumeInfo(BaseModel):
    name: str
    catalog_name: str
    schema_name: str
    volume_type: str  # MANAGED, EXTERNAL
    comment: str | None = None


class VolumeFile(BaseModel):
    path: str
    name: str
    is_dir: bool
    size: int | None = None


@router.get("/catalogs", response_model=list[CatalogInfo])
async def list_catalogs(response: Response):
    """List all accessible catalogs."""
    cache_key = "uc:catalogs"

    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached

    response.headers["X-Cache"] = "MISS"
    client = get_workspace_client()

    try:
        catalogs = client.catalogs.list()
        result = [
            CatalogInfo(name=c.name, comment=c.comment, owner=c.owner)
            for c in catalogs
            if c.name  # Filter out None names
        ]

        # Cache for 5 minutes
        cache.set(cache_key, result, ttl=300)

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list catalogs: {str(e)}"
        )


@router.get("/catalogs/{catalog_name}/schemas", response_model=list[SchemaInfo])
async def list_schemas(catalog_name: str, response: Response):
    """List schemas in a catalog."""
    cache_key = f"uc:schemas:{catalog_name}"

    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached

    response.headers["X-Cache"] = "MISS"
    client = get_workspace_client()

    try:
        schemas = client.schemas.list(catalog_name=catalog_name)
        result = [
            SchemaInfo(
                name=s.name,
                catalog_name=s.catalog_name,
                comment=s.comment,
                owner=s.owner,
            )
            for s in schemas
            if s.name  # Filter out None names
        ]

        # Cache for 5 minutes
        cache.set(cache_key, result, ttl=300)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list schemas: {str(e)}")


@router.get(
    "/catalogs/{catalog_name}/schemas/{schema_name}/tables",
    response_model=list[TableInfo],
)
async def list_tables(
    catalog_name: str, schema_name: str, include_columns: bool = False, response: Response = None
):
    """List tables in a schema."""
    cache_key = f"uc:tables:{catalog_name}:{schema_name}:cols={include_columns}"

    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached

    response.headers["X-Cache"] = "MISS"
    client = get_workspace_client()

    try:
        tables = client.tables.list(catalog_name=catalog_name, schema_name=schema_name)
        result = []

        for t in tables:
            if not t.name:
                continue

            table_info = TableInfo(
                name=t.name,
                catalog_name=t.catalog_name,
                schema_name=t.schema_name,
                table_type=t.table_type.value if t.table_type else "UNKNOWN",
                comment=t.comment,
            )

            if include_columns and t.columns:
                table_info.columns = [
                    {"name": c.name, "type": c.type_text, "comment": c.comment}
                    for c in t.columns
                ]

            result.append(table_info)

        # Cache for 5 minutes
        cache.set(cache_key, result, ttl=300)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tables: {str(e)}")


@router.get(
    "/catalogs/{catalog_name}/schemas/{schema_name}/volumes",
    response_model=list[VolumeInfo],
)
async def list_volumes(catalog_name: str, schema_name: str):
    """List volumes in a schema."""
    client = get_workspace_client()

    try:
        volumes = client.volumes.list(
            catalog_name=catalog_name, schema_name=schema_name
        )
        return [
            VolumeInfo(
                name=v.name,
                catalog_name=v.catalog_name,
                schema_name=v.schema_name,
                volume_type=v.volume_type.value if v.volume_type else "UNKNOWN",
                comment=v.comment,
            )
            for v in volumes
            if v.name
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list volumes: {str(e)}")


@router.get(
    "/volumes/{catalog_name}/{schema_name}/{volume_name}/files",
    response_model=list[VolumeFile],
)
async def list_volume_files(
    catalog_name: str,
    schema_name: str,
    volume_name: str,
    path: str = Query(default="/", description="Path within the volume"),
):
    """List files in a volume."""
    client = get_workspace_client()

    volume_path = f"/Volumes/{catalog_name}/{schema_name}/{volume_name}"
    full_path = (
        f"{volume_path}{path}" if path.startswith("/") else f"{volume_path}/{path}"
    )

    try:
        files = client.files.list_directory_contents(full_path)
        return [
            VolumeFile(
                path=f.path,
                name=f.name,
                is_dir=f.is_directory,
                size=f.file_size if not f.is_directory else None,
            )
            for f in files
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.get("/table/{catalog_name}/{schema_name}/{table_name}/preview")
async def preview_table(
    catalog_name: str,
    schema_name: str,
    table_name: str,
    limit: int = Query(default=10, ge=1, le=100),
):
    """Preview rows from a table."""
    from app.services.sql_service import get_sql_service

    sql = get_sql_service()
    full_name = f"`{catalog_name}`.`{schema_name}`.`{table_name}`"

    try:
        rows = sql.execute(f"SELECT * FROM {full_name} LIMIT {limit}")
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to preview table: {str(e)}"
        )
