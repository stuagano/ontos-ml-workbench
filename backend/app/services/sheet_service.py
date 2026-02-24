"""
Sheet Service - Manages sheets (dataset definitions) with Unity Catalog integration
Matches schema from your_catalog.ontos_ml_workbench.sheets
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound, PermissionDenied
from databricks.sdk.service.sql import StatementState

from app.core.databricks import get_workspace_client, get_current_user
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class SheetService:
    """Service for managing sheets (dataset definitions)"""

    def __init__(self):
        self.client = get_workspace_client()
        self.settings = get_settings()
        self.catalog = self.settings.databricks_catalog
        self.schema = self.settings.databricks_schema
        self.table_name = f"{self.catalog}.{self.schema}.sheets"
        self.query_timeout = self.settings.sql_query_timeout_seconds

        # Get SQL warehouse for queries (or use serverless)
        if self.settings.use_serverless_sql:
            self.warehouse_id = None
            logger.info("Using serverless SQL compute")
        else:
            self.warehouse_id = self.settings.databricks_warehouse_id
            if not self.warehouse_id:
                # Try to find a warehouse
                warehouses = list(self.client.warehouses.list())
                if warehouses:
                    self.warehouse_id = warehouses[0].id
                    logger.info(f"Using SQL warehouse: {warehouses[0].name}")
                else:
                    logger.warning("No SQL warehouse configured. Falling back to serverless SQL.")
                    self.warehouse_id = None

    def validate_uc_table(self, table_path: str) -> bool:
        """
        Validate that a Unity Catalog table exists and is accessible

        Args:
            table_path: Full table path like "catalog.schema.table"

        Returns:
            True if table exists and is accessible

        Raises:
            ValueError: If table path format is invalid
            NotFound: If table doesn't exist
        """
        parts = table_path.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid table path '{table_path}'. Expected format: catalog.schema.table")

        catalog, schema, table = parts

        try:
            table_info = self.client.tables.get(f"{catalog}.{schema}.{table}")
            logger.info(f"Validated UC table: {table_path} (type: {table_info.table_type})")
            return True
        except NotFound:
            raise NotFound(f"Unity Catalog table not found: {table_path}")
        except PermissionDenied:
            raise PermissionDenied(f"No access to Unity Catalog table: {table_path}")

    def validate_uc_volume(self, volume_path: str) -> bool:
        """
        Validate that a Unity Catalog volume exists and is accessible

        Args:
            volume_path: Volume path like "/Volumes/catalog/schema/volume"

        Returns:
            True if volume exists and is accessible

        Raises:
            ValueError: If volume path format is invalid
            NotFound: If volume doesn't exist
        """
        if not volume_path.startswith("/Volumes/"):
            raise ValueError(f"Volume path must start with /Volumes/: {volume_path}")

        # Parse: /Volumes/catalog/schema/volume/...
        parts = volume_path.strip("/").split("/")
        if len(parts) < 4:
            raise ValueError(f"Invalid volume path '{volume_path}'. Expected: /Volumes/catalog/schema/volume")

        catalog, schema, volume = parts[1], parts[2], parts[3]

        try:
            volume_info = self.client.volumes.read(f"{catalog}.{schema}.{volume}")
            logger.info(f"Validated UC volume: {volume_path} (type: {volume_info.volume_type})")
            return True
        except NotFound:
            raise NotFound(f"Unity Catalog volume not found: /Volumes/{catalog}/{schema}/{volume}")
        except PermissionDenied:
            raise PermissionDenied(f"No access to Unity Catalog volume: {volume_path}")

    def get_table_row_count(self, table_path: str, timeout_seconds: int = 30) -> int:
        """
        Get row count for a Unity Catalog table

        Args:
            table_path: Full table path like "catalog.schema.table"
            timeout_seconds: Maximum time to wait for count query

        Returns:
            Number of rows in the table
        """
        sql = f"SELECT COUNT(*) as count FROM {table_path}"

        # Build kwargs for execute_statement
        execute_kwargs = {
            "statement": sql,
            "wait_timeout": "0s"
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        # Poll for result with configurable timeout
        import time
        start_time = time.time()
        poll_interval = 0.1
        max_poll_interval = 1.0

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_seconds:
                try:
                    self.client.statement_execution.cancel_execution(result.statement_id)
                except:
                    pass
                raise TimeoutError(f"Row count query timed out after {timeout_seconds}s for table {table_path}")

            status = self.client.statement_execution.get_statement(result.statement_id)

            if status.status.state == StatementState.SUCCEEDED:
                if status.result and status.result.data_array:
                    return int(status.result.data_array[0][0])
                return 0
            elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                error_msg = status.status.error.message if status.status.error else "Unknown error"
                raise RuntimeError(f"Row count query failed: {error_msg}")

            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)

    def get_table_columns(self, table_path: str) -> List[str]:
        """
        Get column names for a Unity Catalog table

        Args:
            table_path: Full table path like "catalog.schema.table"

        Returns:
            List of column names
        """
        parts = table_path.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid table path: {table_path}")

        catalog, schema, table = parts

        try:
            table_info = self.client.tables.get(f"{catalog}.{schema}.{table}")
            if table_info.columns:
                return [col.name for col in table_info.columns]
            return []
        except Exception as e:
            logger.error(f"Failed to get columns for {table_path}: {e}")
            return []

    def get_table_columns_with_types(self, table_path: str) -> List[Dict[str, str]]:
        """
        Get column names with type information for a Unity Catalog table.

        Returns:
            List of dicts with keys: name, type_text, comment
        """
        parts = table_path.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid table path: {table_path}")

        try:
            table_info = self.client.tables.get(table_path)
            result = []
            if table_info.columns:
                for col in table_info.columns:
                    result.append({
                        "name": col.name,
                        "type_text": col.type_text or "STRING",
                        "comment": col.comment or "",
                    })
            return result
        except Exception as e:
            logger.error(f"Failed to get typed columns for {table_path}: {e}")
            return []

    def get_table_preview(self, table_path: str, limit: int = 50, timeout_seconds: int = 30) -> Dict[str, Any]:
        """
        Get preview data from a Unity Catalog table

        Args:
            table_path: Full table path like "catalog.schema.table"
            limit: Maximum number of rows to return
            timeout_seconds: Maximum time to wait for query

        Returns:
            Dict with "rows" (list of dicts) and "count" (total row count)
        """
        from databricks.sdk.service.sql import StatementState
        import time

        # Get total row count
        count = self.get_table_row_count(table_path, timeout_seconds=timeout_seconds)

        # Get preview rows
        sql = f"SELECT * FROM {table_path} LIMIT {limit}"

        execute_kwargs = {
            "statement": sql,
            "wait_timeout": "0s"
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        # Poll for result
        start_time = time.time()
        poll_interval = 0.1
        max_poll_interval = 1.0

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_seconds:
                try:
                    self.client.statement_execution.cancel_execution(result.statement_id)
                except:
                    pass
                raise TimeoutError(f"Preview query timed out after {timeout_seconds}s")

            status = self.client.statement_execution.get_statement(result.statement_id)

            if status.status.state == StatementState.SUCCEEDED:
                rows = []
                if status.result and status.result.data_array:
                    # Get column names from manifest
                    column_names = []
                    if status.manifest and status.manifest.schema and status.manifest.schema.columns:
                        column_names = [col.name for col in status.manifest.schema.columns]

                    # Convert data_array to list of dicts
                    for data_row in status.result.data_array:
                        row_dict = {}
                        for idx, value in enumerate(data_row):
                            col_name = column_names[idx] if idx < len(column_names) else f"col_{idx}"
                            row_dict[col_name] = value
                        rows.append(row_dict)

                return {
                    "rows": rows,
                    "count": count
                }

            elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                error_msg = status.status.error.message if status.status.error else "Unknown error"
                raise Exception(f"Preview query failed: {error_msg}")

            # Progressive backoff
            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)

    def create_sheet(self, sheet_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new sheet in Unity Catalog

        Args:
            sheet_data: Sheet data matching SheetCreate model

        Returns:
            Created sheet with generated fields
        """
        current_user = get_current_user()
        now = datetime.now()

        # Generate ID if not provided
        sheet_id = sheet_data.get("id", f"sheet-{uuid4()}")

        # Validate source based on type
        source_type = sheet_data["source_type"]
        if source_type == "uc_table" and sheet_data.get("source_table"):
            self.validate_uc_table(sheet_data["source_table"])
            # Get row count
            try:
                item_count = self.get_table_row_count(sheet_data["source_table"])
                sheet_data["item_count"] = item_count
            except Exception as e:
                logger.warning(f"Could not get row count: {e}")
        elif source_type == "uc_volume" and sheet_data.get("source_volume"):
            self.validate_uc_volume(sheet_data["source_volume"])

        # Add system fields
        sheet_data.update({
            "id": sheet_id,
            "created_at": now,
            "created_by": current_user,
            "updated_at": now,
            "updated_by": current_user,
        })

        # Insert into Delta table
        self._insert_sheet(sheet_data)

        return sheet_data

    def get_sheet(self, sheet_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a sheet by ID

        Args:
            sheet_id: Sheet ID

        Returns:
            Sheet data or None if not found
        """
        # Select all columns for PRD v2.3 Sheet model
        sql = f"""
        SELECT id, name, description, status, source_type, source_table, source_volume, source_path,
               item_id_column, text_columns, image_columns, metadata_columns,
               sampling_strategy, sample_size, filter_expression, template_config, join_config,
               item_count, last_validated_at, created_at, created_by, updated_at, updated_by
        FROM {self.table_name}
        WHERE id = '{sheet_id}' AND status != 'deleted'
        LIMIT 1
        """

        # Build kwargs for execute_statement
        execute_kwargs = {
            "statement": sql,
            "wait_timeout": "0s"
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        # Poll for result with timeout
        import time
        timeout_seconds = 30
        start_time = time.time()
        poll_interval = 0.1
        max_poll_interval = 1.0

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_seconds:
                try:
                    self.client.statement_execution.cancel_execution(result.statement_id)
                except:
                    pass
                raise TimeoutError(f"Query timed out after {timeout_seconds}s")

            status = self.client.statement_execution.get_statement(result.statement_id)

            if status.status.state == StatementState.SUCCEEDED:
                if status.result and status.result.data_array and len(status.result.data_array) > 0:
                    # Convert row to dict - columns match the SELECT statement
                    row = status.result.data_array[0]
                    columns = ["id", "name", "description", "status", "source_type", "source_table",
                              "source_volume", "source_path", "item_id_column", "text_columns",
                              "image_columns", "metadata_columns", "sampling_strategy", "sample_size",
                              "filter_expression", "template_config", "join_config", "item_count", "last_validated_at",
                              "created_at", "created_by", "updated_at", "updated_by"]
                    sheet_dict = dict(zip(columns, row))

                    # Parse JSON arrays
                    import json
                    for col in ["text_columns", "image_columns", "metadata_columns"]:
                        if col in sheet_dict and isinstance(sheet_dict[col], str):
                            try:
                                sheet_dict[col] = json.loads(sheet_dict[col])
                            except:
                                sheet_dict[col] = []
                    return sheet_dict
                return None
            elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                error_msg = status.status.error.message if status.status.error else "Unknown error"
                raise RuntimeError(f"Query failed: {error_msg}")

            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)

    def list_sheets(self, status_filter: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List all sheets

        Args:
            status_filter: Optional status to filter by
            limit: Maximum number of sheets to return (capped at 1000 for safety)

        Returns:
            List of sheets
        """
        # Cap limit to prevent huge result sets
        limit = min(limit, 1000)

        where_clause = "WHERE status != 'deleted'"
        if status_filter:
            where_clause += f" AND status = '{status_filter}'"

        # Select all columns needed for PRD v2.3 Sheet model
        sql = f"""
        SELECT id, name, description, status, source_type, source_table, source_volume, source_path,
               item_id_column, text_columns, image_columns, metadata_columns,
               sampling_strategy, sample_size, filter_expression, template_config, join_config,
               item_count, last_validated_at, created_at, created_by, updated_at, updated_by
        FROM {self.table_name}
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {limit}
        """

        # Build kwargs for execute_statement
        execute_kwargs = {
            "statement": sql,
            "wait_timeout": "0s"  # Don't wait, poll manually with better timeout control
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        # Poll for result with configurable timeout and adaptive backoff
        import time
        timeout_seconds = 30  # Maximum wait time
        start_time = time.time()
        poll_interval = 0.1  # Start with fast polling
        max_poll_interval = 1.0

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_seconds:
                # Try to cancel the statement
                try:
                    self.client.statement_execution.cancel_execution(result.statement_id)
                except:
                    pass
                raise TimeoutError(f"Query timed out after {timeout_seconds}s. Consider reducing limit or using status filter.")

            status = self.client.statement_execution.get_statement(result.statement_id)

            if status.status.state == StatementState.SUCCEEDED:
                if status.result and status.result.data_array:
                    # Column names match the SELECT statement
                    columns = ["id", "name", "description", "status", "source_type", "source_table",
                              "source_volume", "source_path", "item_id_column", "text_columns",
                              "image_columns", "metadata_columns", "sampling_strategy", "sample_size",
                              "filter_expression", "template_config", "join_config", "item_count", "last_validated_at",
                              "created_at", "created_by", "updated_at", "updated_by"]

                    sheets = []
                    for row in status.result.data_array:
                        sheet_dict = dict(zip(columns, row))
                        # Parse JSON arrays
                        import json
                        for col in ["text_columns", "image_columns", "metadata_columns"]:
                            if col in sheet_dict and isinstance(sheet_dict[col], str):
                                try:
                                    sheet_dict[col] = json.loads(sheet_dict[col])
                                except:
                                    sheet_dict[col] = []
                        sheets.append(sheet_dict)
                    return sheets
                return []
            elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                error_msg = status.status.error.message if status.status.error else "Unknown error"
                raise RuntimeError(f"Query failed: {error_msg}")

            # Adaptive backoff: start fast, slow down for long queries
            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, max_poll_interval)

    def update_sheet(self, sheet_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a sheet

        Args:
            sheet_id: Sheet ID
            update_data: Fields to update

        Returns:
            Updated sheet data
        """
        # Get existing sheet
        existing = self.get_sheet(sheet_id)
        if not existing:
            raise NotFound(f"Sheet not found: {sheet_id}")

        # Update fields
        existing.update(update_data)
        existing["updated_at"] = datetime.now()
        existing["updated_by"] = get_current_user()

        # Build UPDATE statement
        set_clauses = []
        for key, value in update_data.items():
            if key in ["id", "created_at", "created_by"]:
                continue  # Skip immutable fields

            if isinstance(value, str):
                set_clauses.append(f"{key} = '{value}'")
            elif isinstance(value, list):
                # Array type
                items = ", ".join([f"'{item}'" for item in value])
                set_clauses.append(f"{key} = ARRAY({items})")
            elif value is None:
                set_clauses.append(f"{key} = NULL")
            else:
                set_clauses.append(f"{key} = {value}")

        if not set_clauses:
            return existing

        set_clauses.append(f"updated_at = CURRENT_TIMESTAMP()")
        set_clauses.append(f"updated_by = '{get_current_user()}'")

        sql = f"UPDATE {self.table_name} SET {', '.join(set_clauses)} WHERE id = '{sheet_id}'"

        # Note: UPDATE might hang like INSERT, but we'll try
        execute_kwargs = {"statement": sql}
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        logger.info(f"Update statement submitted for sheet {sheet_id}")

        return existing

    def delete_sheet(self, sheet_id: str) -> bool:
        """
        Soft delete a sheet (set status to 'deleted')

        Args:
            sheet_id: Sheet ID

        Returns:
            True if deleted
        """
        sql = f"UPDATE {self.table_name} SET status = 'deleted', updated_at = CURRENT_TIMESTAMP(), updated_by = '{get_current_user()}' WHERE id = '{sheet_id}'"

        execute_kwargs = {"statement": sql}
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        logger.info(f"Delete statement submitted for sheet {sheet_id}")
        return True

    def _insert_sheet(self, sheet_data: Dict[str, Any]) -> None:
        """
        Insert sheet data into Delta table

        Note: This may hang due to SQL warehouse write issues.
        Consider using Databricks SDK direct writes instead.
        """
        # Build INSERT statement
        columns = list(sheet_data.keys())
        values = []

        for key in columns:
            value = sheet_data[key]
            if isinstance(value, str):
                values.append(f"'{value}'")
            elif isinstance(value, list):
                items = ", ".join([f"'{item}'" for item in value])
                values.append(f"ARRAY({items})")
            elif isinstance(value, datetime):
                values.append("CURRENT_TIMESTAMP()")
            elif value is None:
                values.append("NULL")
            else:
                values.append(str(value))

        sql = f"INSERT INTO {self.table_name} ({', '.join(columns)}) VALUES ({', '.join(values)})"

        logger.info(f"Inserting sheet: {sheet_data['id']}")
        logger.debug(f"SQL: {sql}")

        execute_kwargs = {"statement": sql}
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        logger.info(f"Insert statement submitted (ID: {result.statement_id})")
