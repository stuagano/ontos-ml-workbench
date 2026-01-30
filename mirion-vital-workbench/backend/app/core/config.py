"""Application configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App info
    app_name: str = "Databits Workbench"
    app_version: str = "0.1.0"
    debug: bool = False

    # Databricks configuration
    databricks_host: str = ""
    databricks_token: str = ""  # Only for local dev, use app auth in production
    databricks_config_profile: str = ""  # CLI profile for local dev
    databricks_catalog: str = "main"
    databricks_schema: str = "databits"
    databricks_warehouse_id: str = ""

    # API configuration
    api_prefix: str = "/api/v1"

    # CORS (for local development)
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

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
