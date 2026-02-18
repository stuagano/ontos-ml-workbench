"""Lakebase service for OLTP operations with optimized read latency.

Uses a separate Databricks schema (ontos_ml_lakebase) for operational application state.
This schema has the 'postgres' engine property for optimized OLTP workloads.
"""

import json
import logging
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class LakebaseService:
    """Service for Lakebase operations using Databricks SQL.

    Uses the ontos_ml_lakebase schema with postgres engine for optimized OLTP reads.
    Falls back to the main schema if Lakebase tables don't exist.
    """

    def __init__(self):
        self.settings = get_settings()
        self._sql_service = None
        self._initialized = False
        self._available = False

    def _ensure_initialized(self):
        """Lazily initialize the service."""
        if self._initialized:
            return

        self._sql_service = get_sql_service()

        # Check if Lakebase schema exists by querying label_classes
        try:
            result = self._sql_service.execute(
                f"SELECT 1 FROM {self._table('label_classes')} LIMIT 1"
            )
            self._available = True
            logger.info("Lakebase service initialized - using ontos_ml_lakebase schema")
        except Exception as e:
            logger.warning(f"Lakebase schema not available, using fallback: {e}")
            self._available = False

        self._initialized = True

    def _table(self, name: str) -> str:
        """Get fully qualified Lakebase table name."""
        catalog = self.settings.databricks_catalog
        return f"`{catalog}`.`ontos_ml_lakebase`.`{name}`"

    def _delta_table(self, name: str) -> str:
        """Get fully qualified Delta table name (fallback)."""
        return self.settings.get_table(name)

    @property
    def is_available(self) -> bool:
        """Check if Lakebase is available."""
        self._ensure_initialized()
        return self._available

    def _escape_sql(self, value: str | None) -> str:
        """Escape single quotes for SQL string."""
        if value is None:
            return "NULL"
        return f"'{value.replace(chr(39), chr(39) + chr(39))}'"

    def _escape_json_for_sql(self, json_str: str) -> str:
        """Escape a JSON string for SQL insertion using base64 encoding."""
        import base64
        # Encode to base64 to avoid all escaping issues
        encoded = base64.b64encode(json_str.encode('utf-8')).decode('ascii')
        return f"'base64:{encoded}'"

    def _serialize_value(self, val: Any) -> Any:
        """Serialize values for JSON compatibility."""
        if isinstance(val, datetime):
            return val.isoformat()
        if isinstance(val, (list, dict)):
            return val
        return val

    def execute(self, sql: str) -> list[dict[str, Any]]:
        """Execute a query and return results."""
        self._ensure_initialized()
        rows = self._sql_service.execute(sql)
        return [{k: self._serialize_value(v) for k, v in row.items()} for row in rows]

    def execute_one(self, sql: str) -> dict[str, Any] | None:
        """Execute a query and return a single result."""
        results = self.execute(sql)
        return results[0] if results else None

    def execute_update(self, sql: str) -> int:
        """Execute an INSERT/UPDATE/DELETE."""
        self._ensure_initialized()
        return self._sql_service.execute_update(sql)

    # =========================================================================
    # Sheet Operations
    # =========================================================================

    def get_sheet(self, sheet_id: str) -> dict[str, Any] | None:
        """Get a sheet by ID."""
        self._ensure_initialized()
        if not self._available:
            return None

        result = self.execute_one(
            f"SELECT * FROM {self._table('sheets')} WHERE sheet_id = {self._escape_sql(sheet_id)}"
        )
        return result

    def list_sheets(
        self, status: str | None = None, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        """List sheets with optional status filter."""
        self._ensure_initialized()
        if not self._available:
            return []

        conditions = []
        if status:
            conditions.append(f"status = {self._escape_sql(status)}")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        return self.execute(
            f"""
            SELECT * FROM {self._table('sheets')}
            {where_clause}
            ORDER BY updated_at DESC
            LIMIT {limit} OFFSET {offset}
            """
        )

    def upsert_sheet(self, sheet_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update a sheet."""
        self._ensure_initialized()
        columns_json = json.dumps(sheet_data.get("columns", []))
        template_json = json.dumps(sheet_data.get("template_config")) if sheet_data.get("template_config") else None

        # Use MERGE for upsert
        sql = f"""
        MERGE INTO {self._table('sheets')} AS target
        USING (SELECT {self._escape_sql(sheet_data['sheet_id'])} AS sheet_id) AS source
        ON target.sheet_id = source.sheet_id
        WHEN MATCHED THEN UPDATE SET
            name = {self._escape_sql(sheet_data['name'])},
            description = {self._escape_sql(sheet_data.get('description'))},
            version = {self._escape_sql(sheet_data.get('version', '1.0.0'))},
            status = {self._escape_sql(sheet_data.get('status', 'draft'))},
            columns = {self._escape_sql(columns_json)},
            template_config = {self._escape_sql(template_json)},
            has_template = {str(bool(template_json)).upper()},
            row_count = {sheet_data.get('row_count') or 'NULL'},
            updated_at = current_timestamp()
        WHEN NOT MATCHED THEN INSERT (
            sheet_id, name, description, version, status,
            columns, template_config, has_template,
            row_count, created_by, created_at, updated_at
        ) VALUES (
            {self._escape_sql(sheet_data['sheet_id'])},
            {self._escape_sql(sheet_data['name'])},
            {self._escape_sql(sheet_data.get('description'))},
            {self._escape_sql(sheet_data.get('version', '1.0.0'))},
            {self._escape_sql(sheet_data.get('status', 'draft'))},
            {self._escape_sql(columns_json)},
            {self._escape_sql(template_json)},
            {str(bool(template_json)).upper()},
            {sheet_data.get('row_count') or 'NULL'},
            {self._escape_sql(sheet_data.get('created_by'))},
            current_timestamp(),
            current_timestamp()
        )
        """
        self.execute_update(sql)
        return self.get_sheet(sheet_data['sheet_id'])

    def delete_sheet(self, sheet_id: str) -> bool:
        """Delete a sheet."""
        self._ensure_initialized()
        if not self._available:
            return False

        rows = self.execute_update(
            f"DELETE FROM {self._table('sheets')} WHERE sheet_id = {self._escape_sql(sheet_id)}"
        )
        return rows > 0

    # =========================================================================
    # Assembly Operations
    # =========================================================================

    def get_assembly(self, assembly_id: str) -> dict[str, Any] | None:
        """Get an assembly by ID."""
        self._ensure_initialized()
        if not self._available:
            return None

        return self.execute_one(
            f"SELECT * FROM {self._table('assemblies')} WHERE assembly_id = {self._escape_sql(assembly_id)}"
        )

    def list_assemblies(
        self, sheet_id: str | None = None, status: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        """List assemblies with optional filters."""
        self._ensure_initialized()
        if not self._available:
            return []

        conditions = []
        if sheet_id:
            conditions.append(f"sheet_id = {self._escape_sql(sheet_id)}")
        if status:
            conditions.append(f"status = {self._escape_sql(status)}")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        return self.execute(
            f"""
            SELECT * FROM {self._table('assemblies')}
            {where_clause}
            ORDER BY updated_at DESC
            LIMIT {limit}
            """
        )

    def upsert_assembly(self, assembly_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update an assembly."""
        self._ensure_initialized()
        template_json = json.dumps(assembly_data["template_config"])

        sql = f"""
        MERGE INTO {self._table('assemblies')} AS target
        USING (SELECT {self._escape_sql(assembly_data['assembly_id'])} AS assembly_id) AS source
        ON target.assembly_id = source.assembly_id
        WHEN MATCHED THEN UPDATE SET
            status = {self._escape_sql(assembly_data.get('status', 'assembling'))},
            total_rows = {assembly_data.get('total_rows', 0)},
            ai_generated_count = {assembly_data.get('ai_generated_count', 0)},
            human_labeled_count = {assembly_data.get('human_labeled_count', 0)},
            human_verified_count = {assembly_data.get('human_verified_count', 0)},
            flagged_count = {assembly_data.get('flagged_count', 0)},
            error_message = {self._escape_sql(assembly_data.get('error_message'))},
            updated_at = current_timestamp()
        WHEN NOT MATCHED THEN INSERT (
            assembly_id, sheet_id, sheet_name, template_config,
            status, total_rows,
            ai_generated_count, human_labeled_count, human_verified_count, flagged_count,
            error_message, created_by, created_at, updated_at
        ) VALUES (
            {self._escape_sql(assembly_data['assembly_id'])},
            {self._escape_sql(assembly_data['sheet_id'])},
            {self._escape_sql(assembly_data.get('sheet_name'))},
            {self._escape_sql(template_json)},
            {self._escape_sql(assembly_data.get('status', 'assembling'))},
            {assembly_data.get('total_rows', 0)},
            {assembly_data.get('ai_generated_count', 0)},
            {assembly_data.get('human_labeled_count', 0)},
            {assembly_data.get('human_verified_count', 0)},
            {assembly_data.get('flagged_count', 0)},
            {self._escape_sql(assembly_data.get('error_message'))},
            {self._escape_sql(assembly_data.get('created_by'))},
            current_timestamp(),
            current_timestamp()
        )
        """
        self.execute_update(sql)
        return self.get_assembly(assembly_data['assembly_id'])

    def update_assembly_stats(self, assembly_id: str) -> None:
        """Recalculate assembly statistics from rows."""
        self._ensure_initialized()
        if not self._available:
            return

        # Get counts from assembly_rows
        stats = self.execute_one(f"""
            SELECT
                COUNT(*) as total_rows,
                SUM(CASE WHEN response_source = 'ai_generated' THEN 1 ELSE 0 END) as ai_generated_count,
                SUM(CASE WHEN response_source = 'human_labeled' THEN 1 ELSE 0 END) as human_labeled_count,
                SUM(CASE WHEN response_source = 'human_verified' THEN 1 ELSE 0 END) as human_verified_count,
                SUM(CASE WHEN is_flagged = TRUE THEN 1 ELSE 0 END) as flagged_count
            FROM {self._table('assembly_rows')}
            WHERE assembly_id = {self._escape_sql(assembly_id)}
        """)

        if stats:
            self.execute_update(f"""
                UPDATE {self._table('assemblies')} SET
                    total_rows = {stats.get('total_rows', 0)},
                    ai_generated_count = {stats.get('ai_generated_count', 0)},
                    human_labeled_count = {stats.get('human_labeled_count', 0)},
                    human_verified_count = {stats.get('human_verified_count', 0)},
                    flagged_count = {stats.get('flagged_count', 0)},
                    updated_at = current_timestamp()
                WHERE assembly_id = {self._escape_sql(assembly_id)}
            """)

    # =========================================================================
    # Assembly Row Operations
    # =========================================================================

    def get_assembly_row(
        self, assembly_id: str, row_index: int
    ) -> dict[str, Any] | None:
        """Get a single assembly row."""
        self._ensure_initialized()
        if not self._available:
            return None

        return self.execute_one(
            f"""
            SELECT * FROM {self._table('assembly_rows')}
            WHERE assembly_id = {self._escape_sql(assembly_id)} AND row_index = {row_index}
            """
        )

    def list_assembly_rows(
        self,
        assembly_id: str,
        limit: int = 50,
        offset: int = 0,
        response_source: str | None = None,
        is_flagged: bool | None = None,
    ) -> list[dict[str, Any]]:
        """List assembly rows with optional filters."""
        self._ensure_initialized()
        if not self._available:
            return []

        conditions = [f"assembly_id = {self._escape_sql(assembly_id)}"]

        if response_source:
            conditions.append(f"response_source = {self._escape_sql(response_source)}")
        if is_flagged is not None:
            conditions.append(f"is_flagged = {str(is_flagged).upper()}")

        where_clause = "WHERE " + " AND ".join(conditions)

        return self.execute(
            f"""
            SELECT * FROM {self._table('assembly_rows')}
            {where_clause}
            ORDER BY row_index
            LIMIT {limit} OFFSET {offset}
            """
        )

    def upsert_assembly_row(self, row_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update an assembly row."""
        self._ensure_initialized()
        source_data_json = json.dumps(row_data.get("source_data", {}))

        sql = f"""
        MERGE INTO {self._table('assembly_rows')} AS target
        USING (SELECT {self._escape_sql(row_data['assembly_id'])} AS assembly_id, {row_data['row_index']} AS row_index) AS source
        ON target.assembly_id = source.assembly_id AND target.row_index = source.row_index
        WHEN MATCHED THEN UPDATE SET
            response = {self._escape_sql(row_data.get('response'))},
            response_source = {self._escape_sql(row_data.get('response_source', 'empty'))},
            labeled_at = {self._escape_sql(row_data.get('labeled_at')) if row_data.get('labeled_at') else 'labeled_at'},
            labeled_by = {self._escape_sql(row_data.get('labeled_by')) if row_data.get('labeled_by') else 'labeled_by'},
            verified_at = {self._escape_sql(row_data.get('verified_at')) if row_data.get('verified_at') else 'verified_at'},
            verified_by = {self._escape_sql(row_data.get('verified_by')) if row_data.get('verified_by') else 'verified_by'},
            is_flagged = {str(row_data.get('is_flagged', False)).upper()},
            flag_reason = {self._escape_sql(row_data.get('flag_reason'))},
            confidence_score = {row_data.get('confidence_score') or 'NULL'}
        WHEN NOT MATCHED THEN INSERT (
            row_id, assembly_id, row_index, prompt, source_data,
            response, response_source, is_flagged
        ) VALUES (
            uuid(),
            {self._escape_sql(row_data['assembly_id'])},
            {row_data['row_index']},
            {self._escape_sql(row_data['prompt'])},
            {self._escape_json_for_sql(source_data_json)},
            {self._escape_sql(row_data.get('response'))},
            {self._escape_sql(row_data.get('response_source', 'empty'))},
            {str(row_data.get('is_flagged', False)).upper()}
        )
        """
        self.execute_update(sql)
        return self.get_assembly_row(row_data['assembly_id'], row_data['row_index'])

    def update_assembly_row(
        self, assembly_id: str, row_index: int, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update specific fields on an assembly row."""
        self._ensure_initialized()
        if not self._available:
            return None

        set_clauses = []

        if "response" in updates:
            set_clauses.append(f"response = {self._escape_sql(updates['response'])}")
        if "response_source" in updates:
            set_clauses.append(f"response_source = {self._escape_sql(updates['response_source'])}")
        if "labeled_at" in updates:
            set_clauses.append(f"labeled_at = {self._escape_sql(updates['labeled_at'])}")
        if "labeled_by" in updates:
            set_clauses.append(f"labeled_by = {self._escape_sql(updates['labeled_by'])}")
        if "verified_at" in updates:
            set_clauses.append(f"verified_at = {self._escape_sql(updates['verified_at'])}")
        if "verified_by" in updates:
            set_clauses.append(f"verified_by = {self._escape_sql(updates['verified_by'])}")
        if "is_flagged" in updates:
            set_clauses.append(f"is_flagged = {str(updates['is_flagged']).upper()}")
        if "flag_reason" in updates:
            set_clauses.append(f"flag_reason = {self._escape_sql(updates['flag_reason'])}")
        if "confidence_score" in updates:
            set_clauses.append(f"confidence_score = {updates['confidence_score'] or 'NULL'}")

        if not set_clauses:
            return self.get_assembly_row(assembly_id, row_index)

        self.execute_update(
            f"""
            UPDATE {self._table('assembly_rows')}
            SET {", ".join(set_clauses)}
            WHERE assembly_id = {self._escape_sql(assembly_id)} AND row_index = {row_index}
            """
        )

        return self.get_assembly_row(assembly_id, row_index)

    # =========================================================================
    # Label Class Operations
    # =========================================================================

    def get_label_classes(self, preset_name: str | None = None) -> list[dict[str, Any]]:
        """Get label classes, optionally filtered by preset."""
        self._ensure_initialized()
        if not self._available:
            return []

        if preset_name:
            return self.execute(
                f"""
                SELECT * FROM {self._table('label_classes')}
                WHERE preset_name = {self._escape_sql(preset_name)} AND is_active = TRUE
                ORDER BY display_order
                """
            )
        return self.execute(
            f"""
            SELECT * FROM {self._table('label_classes')}
            WHERE preset_name IS NULL AND is_active = TRUE
            ORDER BY display_order
            """
        )

    def upsert_label_class(self, label_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update a label class."""
        self._ensure_initialized()

        # Generate ID if not provided
        label_id = label_data.get('label_id', 'uuid()')
        if label_id != 'uuid()':
            label_id = self._escape_sql(label_id)

        sql = f"""
        MERGE INTO {self._table('label_classes')} AS target
        USING (SELECT {self._escape_sql(label_data['name'])} AS name, {self._escape_sql(label_data.get('preset_name'))} AS preset_name) AS source
        ON target.name = source.name AND (target.preset_name = source.preset_name OR (target.preset_name IS NULL AND source.preset_name IS NULL))
        WHEN MATCHED THEN UPDATE SET
            color = {self._escape_sql(label_data.get('color', '#6b7280'))},
            description = {self._escape_sql(label_data.get('description'))},
            hotkey = {self._escape_sql(label_data.get('hotkey'))},
            display_order = {label_data.get('display_order', 0)},
            updated_at = current_timestamp()
        WHEN NOT MATCHED THEN INSERT (
            label_id, name, color, description, hotkey, preset_name, display_order, is_active, created_at, updated_at
        ) VALUES (
            {label_id},
            {self._escape_sql(label_data['name'])},
            {self._escape_sql(label_data.get('color', '#6b7280'))},
            {self._escape_sql(label_data.get('description'))},
            {self._escape_sql(label_data.get('hotkey'))},
            {self._escape_sql(label_data.get('preset_name'))},
            {label_data.get('display_order', 0)},
            TRUE,
            current_timestamp(),
            current_timestamp()
        )
        """
        self.execute_update(sql)

        # Return the upserted row
        if label_data.get('preset_name'):
            results = self.execute(
                f"SELECT * FROM {self._table('label_classes')} WHERE name = {self._escape_sql(label_data['name'])} AND preset_name = {self._escape_sql(label_data['preset_name'])}"
            )
        else:
            results = self.execute(
                f"SELECT * FROM {self._table('label_classes')} WHERE name = {self._escape_sql(label_data['name'])} AND preset_name IS NULL"
            )
        return results[0] if results else {}

    # =========================================================================
    # Template Operations
    # =========================================================================

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        """Get a template by ID."""
        self._ensure_initialized()
        if not self._available:
            return None

        return self.execute_one(
            f"SELECT * FROM {self._table('templates')} WHERE template_id = {self._escape_sql(template_id)}"
        )

    def list_templates(
        self, category: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        """List templates with optional category filter."""
        self._ensure_initialized()
        if not self._available:
            return []

        conditions = ["is_active = TRUE"]
        if category:
            conditions.append(f"category = {self._escape_sql(category)}")

        where_clause = "WHERE " + " AND ".join(conditions)

        return self.execute(
            f"""
            SELECT * FROM {self._table('templates')}
            {where_clause}
            ORDER BY usage_count DESC, updated_at DESC
            LIMIT {limit}
            """
        )

    def upsert_template(self, template_data: dict[str, Any]) -> dict[str, Any]:
        """Insert or update a template."""
        self._ensure_initialized()
        config_json = json.dumps(template_data["config"])
        tags = template_data.get("tags", [])
        tags_sql = f"ARRAY({', '.join(self._escape_sql(t) for t in tags)})" if tags else "ARRAY()"

        sql = f"""
        MERGE INTO {self._table('templates')} AS target
        USING (SELECT {self._escape_sql(template_data['template_id'])} AS template_id) AS source
        ON target.template_id = source.template_id
        WHEN MATCHED THEN UPDATE SET
            name = {self._escape_sql(template_data['name'])},
            description = {self._escape_sql(template_data.get('description'))},
            version = {self._escape_sql(template_data.get('version', '1.0.0'))},
            config = {self._escape_sql(config_json)},
            category = {self._escape_sql(template_data.get('category'))},
            tags = {tags_sql},
            updated_at = current_timestamp()
        WHEN NOT MATCHED THEN INSERT (
            template_id, name, description, version,
            config, category, tags,
            usage_count, is_active, created_by, created_at, updated_at
        ) VALUES (
            {self._escape_sql(template_data['template_id'])},
            {self._escape_sql(template_data['name'])},
            {self._escape_sql(template_data.get('description'))},
            {self._escape_sql(template_data.get('version', '1.0.0'))},
            {self._escape_sql(config_json)},
            {self._escape_sql(template_data.get('category'))},
            {tags_sql},
            0,
            TRUE,
            {self._escape_sql(template_data.get('created_by'))},
            current_timestamp(),
            current_timestamp()
        )
        """
        self.execute_update(sql)
        return self.get_template(template_data['template_id'])

    def increment_template_usage(self, template_id: str) -> None:
        """Increment template usage count."""
        self._ensure_initialized()
        if not self._available:
            return

        self.execute_update(
            f"""
            UPDATE {self._table('templates')}
            SET usage_count = usage_count + 1, last_used_at = current_timestamp()
            WHERE template_id = {self._escape_sql(template_id)}
            """
        )


# Singleton instance
_lakebase_service: LakebaseService | None = None


def get_lakebase_service() -> LakebaseService:
    """Get or create Lakebase service singleton."""
    global _lakebase_service
    if _lakebase_service is None:
        _lakebase_service = LakebaseService()
    return _lakebase_service
