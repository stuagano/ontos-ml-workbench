"""SQL execution service using Databricks SQL Warehouse."""

import json
import logging
import time
from typing import Any

from databricks.sdk.service.sql import StatementState

from app.core.config import get_settings
from app.core.databricks import get_workspace_client

# SQL query logger - separate from main app logger for filtering
sql_logger = logging.getLogger("sql_queries")
sql_logger.setLevel(logging.DEBUG)


class SQLService:
    """Execute SQL statements against Databricks SQL Warehouse."""

    def __init__(self):
        self.settings = get_settings()
        self.client = get_workspace_client()
        self.catalog = self.settings.databricks_catalog
        self.schema = self.settings.databricks_schema
        self.default_timeout = self.settings.sql_query_timeout_seconds

        # Support serverless SQL
        if self.settings.use_serverless_sql:
            self.warehouse_id = None
        else:
            self.warehouse_id = self.settings.databricks_warehouse_id

    def _full_table_name(self, table: str) -> str:
        """Get fully qualified table name."""
        return f"{self.catalog}.{self.schema}.{table}"

    def execute(
        self,
        sql: str,
        parameters: dict[str, Any] | None = None,
        timeout_seconds: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Execute SQL and return results as list of dicts.

        Args:
            sql: SQL statement to execute
            parameters: Named parameters for the query
            timeout_seconds: Maximum time to wait for results (defaults to configured timeout)

        Returns:
            List of row dictionaries
        """
        if timeout_seconds is None:
            timeout_seconds = self.default_timeout

        # Log the query
        query_start = time.time()
        sql_logger.info(f"┌─ SQL QUERY ─────────────────────────────────")
        sql_logger.info(f"│ {sql.strip()[:500]}{'...' if len(sql) > 500 else ''}")
        if parameters:
            sql_logger.info(f"│ Parameters: {parameters}")
        sql_logger.info(f"│ Catalog: {self.catalog}.{self.schema}")

        # Execute statement
        execute_kwargs = {
            "statement": sql,
            "catalog": self.catalog,
            "schema": self.schema,
            "wait_timeout": "0s",  # Don't wait, we'll poll
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        response = self.client.statement_execution.execute_statement(**execute_kwargs)

        statement_id = response.statement_id

        # Poll for completion with adaptive backoff
        start_time = time.time()
        poll_interval = 0.1  # Start with 100ms polls
        max_poll_interval = 1.0  # Max 1 second

        while True:
            status = self.client.statement_execution.get_statement(statement_id)
            state = status.status.state

            if state == StatementState.SUCCEEDED:
                break
            elif state in (
                StatementState.FAILED,
                StatementState.CANCELED,
                StatementState.CLOSED,
            ):
                error_msg = (
                    status.status.error.message
                    if status.status.error
                    else "Unknown error"
                )
                raise Exception(f"SQL execution failed: {error_msg}")

            if time.time() - start_time > timeout_seconds:
                self.client.statement_execution.cancel_execution(statement_id)
                raise TimeoutError(f"SQL execution timed out after {timeout_seconds}s")

            # Adaptive polling: start fast, slow down for long queries
            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)

        # Get results
        result = self.client.statement_execution.get_statement(statement_id)

        if not result.manifest or not result.result:
            return []

        # Convert to list of dicts
        columns = [col.name for col in result.manifest.schema.columns]
        rows = []

        if result.result.data_array:
            for row_data in result.result.data_array:
                row_dict = {}
                for i, col_name in enumerate(columns):
                    row_dict[col_name] = row_data[i] if i < len(row_data) else None
                rows.append(row_dict)

        # Log completion
        query_duration = time.time() - query_start
        sql_logger.info(f"│ Rows: {len(rows)} | Duration: {query_duration:.3f}s")
        sql_logger.info(f"└─────────────────────────────────────────────")

        return rows

    def execute_update(self, sql: str, parameters: dict[str, Any] | None = None) -> int:
        """Execute an INSERT/UPDATE/DELETE and return affected row count."""
        # Log the query
        query_start = time.time()
        sql_logger.info(f"┌─ SQL UPDATE ────────────────────────────────")
        sql_logger.info(f"│ {sql.strip()[:500]}{'...' if len(sql) > 500 else ''}")
        if parameters:
            sql_logger.info(f"│ Parameters: {parameters}")
        sql_logger.info(f"│ Catalog: {self.catalog}.{self.schema}")

        execute_kwargs = {
            "statement": sql,
            "catalog": self.catalog,
            "schema": self.schema,
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        response = self.client.statement_execution.execute_statement(**execute_kwargs)

        # Wait for completion with adaptive backoff
        statement_id = response.statement_id
        start_time = time.time()
        poll_interval = 0.1  # Start with 100ms polls
        max_poll_interval = 1.0

        while True:
            status = self.client.statement_execution.get_statement(statement_id)
            state = status.status.state

            if state == StatementState.SUCCEEDED:
                row_count = status.manifest.total_row_count if status.manifest else 0
                query_duration = time.time() - query_start
                sql_logger.info(f"│ Affected: {row_count} rows | Duration: {query_duration:.3f}s")
                sql_logger.info(f"└─────────────────────────────────────────────")
                return row_count
            elif state in (
                StatementState.FAILED,
                StatementState.CANCELED,
                StatementState.CLOSED,
            ):
                error_msg = (
                    status.status.error.message
                    if status.status.error
                    else "Unknown error"
                )
                raise Exception(f"SQL execution failed: {error_msg}")

            if time.time() - start_time > 60:
                raise TimeoutError("SQL execution timed out")

            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)


# Singleton instance
_sql_service: SQLService | None = None


def get_sql_service() -> SQLService:
    """Get or create SQL service singleton."""
    global _sql_service
    if _sql_service is None:
        _sql_service = SQLService()
    return _sql_service


async def execute_sql(
    sql: str, parameters: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    """
    Async wrapper for SQL execution.

    Args:
        sql: SQL statement to execute
        parameters: Named parameters for the query

    Returns:
        List of row dictionaries
    """
    service = get_sql_service()
    return service.execute(sql, parameters)
