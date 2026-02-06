"""
Sheet Service - Manages sheets (dataset definitions) with Unity Catalog integration
Matches schema from home_stuart_gano.mirion_vital_workbench.sheets
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound, PermissionDenied

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

        # Get SQL warehouse for queries
        self.warehouse_id = self.settings.databricks_warehouse_id
        if not self.warehouse_id:
            # Try to find a warehouse
            warehouses = list(self.client.warehouses.list())
            if warehouses:
                self.warehouse_id = warehouses[0].id
                logger.info(f"Using SQL warehouse: {warehouses[0].name}")
            else:
                raise ValueError("No SQL warehouse found. Please configure DATABRICKS_WAREHOUSE_ID")

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

    def get_table_row_count(self, table_path: str) -> int:
        """
        Get row count for a Unity Catalog table

        Args:
            table_path: Full table path like "catalog.schema.table"

        Returns:
            Number of rows in the table
        """
        sql = f"SELECT COUNT(*) as count FROM {table_path}"

        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

        # Poll for result
        import time
        for _ in range(30):
            status = self.client.statement_execution.get_statement(result.statement_id)
            if status.status.state == 'SUCCEEDED':
                if status.result and status.result.data_array:
                    return int(status.result.data_array[0][0])
                return 0
            elif status.status.state in ['FAILED', 'CANCELED']:
                raise RuntimeError(f"Query failed: {status.status.error}")
            time.sleep(1)

        raise TimeoutError("Timed out waiting for row count query")

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
        sql = f"SELECT * FROM {self.table_name} WHERE id = '{sheet_id}' AND status != 'deleted'"

        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

        # Poll for result
        import time
        for _ in range(30):
            status = self.client.statement_execution.get_statement(result.statement_id)
            if status.status.state == 'SUCCEEDED':
                if status.result and status.result.data_array and len(status.result.data_array) > 0:
                    # Convert row to dict
                    row = status.result.data_array[0]
                    columns = [col.name for col in status.result.manifest.schema.columns]
                    return dict(zip(columns, row))
                return None
            elif status.status.state in ['FAILED', 'CANCELED']:
                raise RuntimeError(f"Query failed: {status.status.error}")
            time.sleep(1)

        raise TimeoutError("Timed out waiting for query")

    def list_sheets(self, status_filter: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List all sheets

        Args:
            status_filter: Optional status to filter by
            limit: Maximum number of sheets to return

        Returns:
            List of sheets
        """
        where_clause = "WHERE status != 'deleted'"
        if status_filter:
            where_clause += f" AND status = '{status_filter}'"

        sql = f"SELECT * FROM {self.table_name} {where_clause} ORDER BY created_at DESC LIMIT {limit}"

        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

        # Poll for result
        import time
        for _ in range(30):
            status = self.client.statement_execution.get_statement(result.statement_id)
            if status.status.state == 'SUCCEEDED':
                if status.result and status.result.data_array:
                    columns = [col.name for col in status.result.manifest.schema.columns]
                    return [dict(zip(columns, row)) for row in status.result.data_array]
                return []
            elif status.status.state in ['FAILED', 'CANCELED']:
                raise RuntimeError(f"Query failed: {status.status.error}")
            time.sleep(1)

        raise TimeoutError("Timed out waiting for query")

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
        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

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

        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

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

        result = self.client.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=self.warehouse_id
        )

        logger.info(f"Insert statement submitted (ID: {result.statement_id})")
