"""Pytest fixtures and configuration for backend tests."""

import json
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# --- Mock SQL Service ---


class MockSQLService:
    """Mock SQL service that stores data in memory."""

    def __init__(self):
        self.tables: dict[str, list[dict[str, Any]]] = {
            "templates": [],
            "curation_items": [],
            "tools_registry": [],
            "agents_registry": [],
            "endpoints_registry": [],
            "feedback_items": [],
            "job_runs": [],
        }
        self.catalog = "test_catalog"
        self.schema = "test_schema"

    def execute(
        self,
        sql: str,
        parameters: dict[str, Any] | None = None,
        timeout_seconds: int = 60,
    ) -> list[dict[str, Any]]:
        """Execute a SELECT query and return results."""
        sql_lower = sql.lower().strip()

        # Handle aggregate queries (stats) - check BEFORE simple COUNT
        # Stats queries have SUM(CASE...) patterns
        if "sum(case" in sql_lower:
            table_name = self._extract_table_name(sql)
            where_filter = self._parse_where(sql)
            rows = self._filter_rows(table_name, where_filter)
            return [self._compute_stats(rows)]

        # Handle simple COUNT queries (only COUNT, no SUM)
        if "count(*)" in sql_lower:
            table_name = self._extract_table_name(sql)
            where_filter = self._parse_where(sql)
            filtered = self._filter_rows(table_name, where_filter)
            return [{"cnt": len(filtered), "total": len(filtered)}]

        # Handle SELECT queries
        if sql_lower.startswith("select"):
            table_name = self._extract_table_name(sql)
            where_filter = self._parse_where(sql)
            rows = self._filter_rows(table_name, where_filter)

            # Handle LIMIT
            limit = self._parse_limit(sql)
            if limit:
                rows = rows[:limit]

            return rows

        return []

    def execute_update(self, sql: str, parameters: dict[str, Any] | None = None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected rows."""
        sql_lower = sql.lower().strip()

        if sql_lower.startswith("insert"):
            return self._handle_insert(sql)
        elif sql_lower.startswith("update"):
            return self._handle_update(sql)
        elif sql_lower.startswith("delete"):
            return self._handle_delete(sql)

        return 0

    def _extract_table_name(self, sql: str) -> str:
        """Extract table name from SQL."""
        sql_lower = sql.lower()
        for table in self.tables.keys():
            if table in sql_lower:
                return table
        return "templates"

    def _parse_where(self, sql: str) -> dict[str, Any]:
        """Parse simple WHERE clauses."""
        filters = {}
        sql_lower = sql.lower()

        if "where" not in sql_lower:
            return filters

        where_part = sql.split("WHERE", 1)[-1] if "WHERE" in sql else ""
        where_part = where_part.split("ORDER")[0].split("LIMIT")[0]

        import re

        # Parse template_id = 'value' FIRST (before id to avoid false matches)
        template_matches = re.findall(
            r"template_id\s*=\s*'([^']+)'", where_part, re.IGNORECASE
        )
        if template_matches:
            filters["template_id"] = template_matches[0]

        # Parse id = 'value' patterns (use word boundary to avoid matching template_id)
        # Only match standalone 'id' not preceded by underscore or letter
        id_matches = re.findall(
            r"(?<![a-z_])id\s*=\s*'([^']+)'", where_part, re.IGNORECASE
        )
        if id_matches:
            filters["id"] = id_matches[0]

        # Parse id IN ('value1', 'value2') patterns
        in_matches = re.findall(
            r"(?<![a-z_])id\s+IN\s*\(([^)]+)\)", where_part, re.IGNORECASE
        )
        if in_matches:
            ids = re.findall(r"'([^']+)'", in_matches[0])
            filters["id_in"] = ids

        # Parse status = 'value'
        status_matches = re.findall(
            r"status\s*=\s*'([^']+)'", where_part, re.IGNORECASE
        )
        if status_matches:
            filters["status"] = status_matches[0]

        return filters

    def _parse_limit(self, sql: str) -> int | None:
        """Parse LIMIT clause."""
        import re

        match = re.search(r"LIMIT\s+(\d+)", sql, re.IGNORECASE)
        return int(match.group(1)) if match else None

    def _filter_rows(self, table_name: str, filters: dict[str, Any]) -> list[dict]:
        """Filter table rows by criteria."""
        rows = self.tables.get(table_name, [])
        if not filters:
            return list(rows)

        result = []
        for row in rows:
            match = True

            # Handle id_in filter (for IN clauses)
            if "id_in" in filters:
                if row.get("id") not in filters["id_in"]:
                    match = False

            # Handle other filters
            for key, value in filters.items():
                if key == "id_in":
                    continue
                if row.get(key) != value:
                    match = False
                    break
            if match:
                result.append(row)
        return result

    def _compute_stats(self, rows: list[dict]) -> dict:
        """Compute curation stats from rows."""
        stats = {
            "total": len(rows),
            "pending": sum(1 for r in rows if r.get("status") == "pending"),
            "auto_approved": sum(1 for r in rows if r.get("status") == "auto_approved"),
            "needs_review": sum(1 for r in rows if r.get("status") == "needs_review"),
            "approved": sum(1 for r in rows if r.get("status") == "approved"),
            "rejected": sum(1 for r in rows if r.get("status") == "rejected"),
            "flagged": sum(1 for r in rows if r.get("status") == "flagged"),
            "avg_confidence": None,
            "avg_quality_score": None,
        }

        confidences = [r["agent_confidence"] for r in rows if r.get("agent_confidence")]
        if confidences:
            stats["avg_confidence"] = sum(confidences) / len(confidences)

        return stats

    def _handle_insert(self, sql: str) -> int:
        """Handle INSERT statement."""
        return 1

    def _handle_update(self, sql: str) -> int:
        """Handle UPDATE statement."""
        table_name = self._extract_table_name(sql)
        where_filter = self._parse_where(sql)
        rows = self._filter_rows(table_name, where_filter)
        return len(rows) if rows else 1

    def _handle_delete(self, sql: str) -> int:
        """Handle DELETE statement."""
        table_name = self._extract_table_name(sql)
        where_filter = self._parse_where(sql)
        rows = self._filter_rows(table_name, where_filter)

        if rows and "id" in where_filter:
            self.tables[table_name] = [
                r for r in self.tables[table_name] if r["id"] != where_filter["id"]
            ]

        return len(rows)

    def add_template(self, template: dict[str, Any]) -> None:
        """Helper to add a template to mock storage."""
        self.tables["templates"].append(template)

    def add_curation_item(self, item: dict[str, Any]) -> None:
        """Helper to add a curation item to mock storage."""
        self.tables["curation_items"].append(item)

    def clear(self) -> None:
        """Clear all mock data."""
        for table in self.tables:
            self.tables[table] = []


# --- Fixtures ---


@pytest.fixture
def mock_sql_service():
    """Create a fresh mock SQL service for each test."""
    return MockSQLService()


@pytest.fixture
def mock_current_user():
    """Mock the current user."""
    return "test_user@example.com"


@pytest.fixture
def client(mock_sql_service, mock_current_user):
    """Create test client with mocked services."""
    from app.main import app

    # Patch all locations where get_sql_service is imported/used
    # The key is patching at the point of use, not where it's defined
    patches = [
        patch(
            "app.services.sql_service.get_sql_service", return_value=mock_sql_service
        ),
        patch("app.services.sql_service._sql_service", mock_sql_service),
        patch(
            "app.api.v1.endpoints.templates.get_sql_service",
            return_value=mock_sql_service,
        ),
        patch(
            "app.api.v1.endpoints.templates.get_current_user",
            return_value=mock_current_user,
        ),
        patch(
            "app.api.v1.endpoints.curation.get_sql_service",
            return_value=mock_sql_service,
        ),
        patch(
            "app.api.v1.endpoints.curation.get_current_user",
            return_value=mock_current_user,
        ),
        patch("app.core.databricks.get_current_user", return_value=mock_current_user),
    ]

    for p in patches:
        p.start()

    try:
        yield TestClient(app)
    finally:
        for p in patches:
            p.stop()


@pytest.fixture
def sample_template():
    """Sample template data."""
    return {
        "id": "test-template-001",
        "name": "Test Template",
        "description": "A test template for unit tests",
        "version": "1.0.0",
        "status": "draft",
        "input_schema": json.dumps(
            [{"name": "text", "type": "string", "required": True}]
        ),
        "output_schema": json.dumps(
            [{"name": "label", "type": "string", "required": True}]
        ),
        "prompt_template": "Classify this text: {{text}}",
        "system_prompt": "You are a classifier.",
        "examples": None,
        "base_model": "databricks-meta-llama-3-1-70b-instruct",
        "temperature": 0.7,
        "max_tokens": 1024,
        "source_catalog": None,
        "source_schema": None,
        "source_table": None,
        "source_volume": None,
        "created_by": "test_user@example.com",
        "created_at": "2025-01-20T10:00:00Z",
        "updated_at": "2025-01-20T10:00:00Z",
    }


@pytest.fixture
def sample_curation_item():
    """Sample curation item data."""
    return {
        "id": "test-item-001",
        "template_id": "test-template-001",
        "item_ref": "row_001",
        "item_data": json.dumps({"text": "Sample text for classification"}),
        "agent_label": json.dumps({"label": "positive"}),
        "agent_confidence": 0.92,
        "agent_model": "databricks-meta-llama-3-1-70b-instruct",
        "agent_reasoning": "The text has positive sentiment",
        "human_label": None,
        "status": "pending",
        "quality_score": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "review_notes": None,
        "created_at": "2025-01-20T10:00:00Z",
        "updated_at": "2025-01-20T10:00:00Z",
    }
