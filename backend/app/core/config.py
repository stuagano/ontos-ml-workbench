"""Application configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App info
    app_name: str = "Ontos ML Workbench"
    app_version: str = "0.1.0"
    debug: bool = False
    port: int = 5000

    # Databricks configuration
    databricks_host: str = ""
    databricks_token: str = ""  # Only for local dev, use app auth in production
    databricks_config_profile: str = ""  # CLI profile for local dev
    databricks_catalog: str = "main"
    databricks_schema: str = "ontos_ml"
    databricks_warehouse_id: str = ""

    # SQL execution settings
    sql_query_timeout_seconds: int = 30  # Default query timeout
    use_serverless_sql: bool = False  # If True, don't specify warehouse_id (use serverless)

    # API configuration
    api_prefix: str = "/api/v1"

    # CORS (for local development only; in production the SPA is served same-origin)
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5000", "http://localhost:3000"]

    # Lakebase schema name (uses same SQL Warehouse as main schema)
    # The Lakebase schema has engine='postgres' for optimized OLTP workloads
    lakebase_schema: str = "ontos_ml_lakebase"

    # Ontos backend URL (for DQX quality proxy; auto-resolved from request origin in production)
    ontos_base_url: str = "http://localhost:8000"

    # Auth enforcement (False = resolve user identity but don't block requests)
    enforce_auth: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def get_table(self, table_name: str) -> str:
        """Get fully qualified table name with proper backtick quoting.

        Handles catalog/schema names with special characters like hyphens.
        """
        return f"`{self.databricks_catalog}`.`{self.databricks_schema}`.`{table_name}`"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
