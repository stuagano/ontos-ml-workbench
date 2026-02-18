"""Tests for Template API endpoints."""

import json
from unittest.mock import patch

import pytest


class TestTemplateList:
    """Tests for GET /api/v1/templates."""

    def test_list_templates_empty(self, client, mock_sql_service):
        """List templates when none exist."""
        response = client.get("/api/v1/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["templates"] == []
        assert data["total"] == 0

    def test_list_templates_with_data(self, client, mock_sql_service, sample_template):
        """List templates with existing data."""
        mock_sql_service.add_template(sample_template)

        response = client.get("/api/v1/templates")
        assert response.status_code == 200
        data = response.json()
        assert len(data["templates"]) == 1
        assert data["templates"][0]["name"] == "Test Template"
        assert data["total"] == 1

    def test_list_templates_filter_by_status(
        self, client, mock_sql_service, sample_template
    ):
        """Filter templates by status."""
        mock_sql_service.add_template(sample_template)

        # Filter by draft status
        response = client.get("/api/v1/templates?status=draft")
        assert response.status_code == 200
        data = response.json()
        assert len(data["templates"]) == 1

        # Filter by published status (should be empty)
        response = client.get("/api/v1/templates?status=published")
        assert response.status_code == 200
        data = response.json()
        assert len(data["templates"]) == 0

    def test_list_templates_pagination(self, client, mock_sql_service, sample_template):
        """Test pagination parameters."""
        mock_sql_service.add_template(sample_template)

        response = client.get("/api/v1/templates?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10


class TestTemplateCreate:
    """Tests for POST /api/v1/templates."""

    def test_create_template_minimal(self, client, mock_sql_service):
        """Create template with minimal required fields."""
        # This test verifies the endpoint accepts the request
        # The mock won't fully persist, but we test the contract
        payload = {
            "name": "New Template",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
        }

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            with patch.object(mock_sql_service, "execute") as mock_execute:
                # Mock the fetch after insert
                mock_execute.return_value = [
                    {
                        "id": "new-template-id",
                        "name": "New Template",
                        "description": None,
                        "version": "1.0.0",
                        "status": "draft",
                        "input_schema": None,
                        "output_schema": None,
                        "prompt_template": None,
                        "system_prompt": None,
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
                ]

                response = client.post("/api/v1/templates", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Template"
        assert data["status"] == "draft"
        assert data["version"] == "1.0.0"

    def test_create_template_with_schema(self, client, mock_sql_service):
        """Create template with input/output schema."""
        payload = {
            "name": "Schema Template",
            "description": "Template with schema",
            "input_schema": [
                {
                    "name": "text",
                    "type": "string",
                    "description": "Input text",
                    "required": True,
                }
            ],
            "output_schema": [
                {
                    "name": "sentiment",
                    "type": "string",
                    "description": "Sentiment label",
                    "required": True,
                }
            ],
            "prompt_template": "Analyze: {{text}}",
            "system_prompt": "You are a sentiment analyzer.",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": 0.5,
            "max_tokens": 512,
        }

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            with patch.object(mock_sql_service, "execute") as mock_execute:
                mock_execute.return_value = [
                    {
                        "id": "schema-template-id",
                        "name": "Schema Template",
                        "description": "Template with schema",
                        "version": "1.0.0",
                        "status": "draft",
                        "input_schema": json.dumps(payload["input_schema"]),
                        "output_schema": json.dumps(payload["output_schema"]),
                        "prompt_template": payload["prompt_template"],
                        "system_prompt": payload["system_prompt"],
                        "examples": None,
                        "base_model": "databricks-meta-llama-3-1-70b-instruct",
                        "temperature": 0.5,
                        "max_tokens": 512,
                        "source_catalog": None,
                        "source_schema": None,
                        "source_table": None,
                        "source_volume": None,
                        "created_by": "test_user@example.com",
                        "created_at": "2025-01-20T10:00:00Z",
                        "updated_at": "2025-01-20T10:00:00Z",
                    }
                ]

                response = client.post("/api/v1/templates", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Schema Template"
        assert len(data["input_schema"]) == 1
        assert data["input_schema"][0]["name"] == "text"

    def test_create_template_missing_name(self, client, mock_sql_service):
        """Create template without required name field should fail."""
        payload = {
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
        }

        response = client.post("/api/v1/templates", json=payload)
        assert response.status_code == 422  # Validation error


class TestTemplateGet:
    """Tests for GET /api/v1/templates/{template_id}."""

    def test_get_template_exists(self, client, mock_sql_service, sample_template):
        """Get an existing template by ID."""
        mock_sql_service.add_template(sample_template)

        response = client.get(f"/api/v1/templates/{sample_template['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_template["id"]
        assert data["name"] == sample_template["name"]

    def test_get_template_not_found(self, client, mock_sql_service):
        """Get a non-existent template returns 404."""
        response = client.get("/api/v1/templates/nonexistent-id")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestTemplateUpdate:
    """Tests for PUT /api/v1/templates/{template_id}."""

    def test_update_template_name(self, client, mock_sql_service, sample_template):
        """Update template name."""
        mock_sql_service.add_template(sample_template)

        payload = {"name": "Updated Name"}

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            # After update, return updated template
            def mock_execute(sql, *args, **kwargs):
                if "SELECT" in sql.upper():
                    updated = dict(sample_template)
                    updated["name"] = "Updated Name"
                    return [updated]
                return []

            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.put(
                    f"/api/v1/templates/{sample_template['id']}", json=payload
                )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    def test_update_published_template_fails(
        self, client, mock_sql_service, sample_template
    ):
        """Cannot update a published template."""
        published_template = dict(sample_template)
        published_template["status"] = "published"
        mock_sql_service.add_template(published_template)

        payload = {"name": "New Name"}
        response = client.put(
            f"/api/v1/templates/{sample_template['id']}", json=payload
        )

        assert response.status_code == 400
        assert "published" in response.json()["detail"].lower()


class TestTemplatePublish:
    """Tests for POST /api/v1/templates/{template_id}/publish."""

    def test_publish_draft_template(self, client, mock_sql_service, sample_template):
        """Publish a draft template."""
        mock_sql_service.add_template(sample_template)

        # Track call count to return different results
        call_count = [0]

        def mock_execute(sql, *args, **kwargs):
            if "SELECT" in sql.upper():
                call_count[0] += 1
                result = dict(sample_template)
                # First call checks current status (draft), subsequent calls return published
                if call_count[0] > 1:
                    result["status"] = "published"
                return [result]
            return []

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.post(
                    f"/api/v1/templates/{sample_template['id']}/publish"
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "published"

    def test_publish_already_published(self, client, mock_sql_service, sample_template):
        """Cannot publish an already published template."""
        published = dict(sample_template)
        published["status"] = "published"
        mock_sql_service.add_template(published)

        response = client.post(f"/api/v1/templates/{sample_template['id']}/publish")
        assert response.status_code == 400


class TestTemplateDelete:
    """Tests for DELETE /api/v1/templates/{template_id}."""

    def test_delete_draft_template(self, client, mock_sql_service, sample_template):
        """Delete a draft template."""
        mock_sql_service.add_template(sample_template)

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            response = client.delete(f"/api/v1/templates/{sample_template['id']}")

        assert response.status_code == 204

    def test_delete_published_template_fails(
        self, client, mock_sql_service, sample_template
    ):
        """Cannot delete a published template."""
        published = dict(sample_template)
        published["status"] = "published"
        mock_sql_service.add_template(published)

        response = client.delete(f"/api/v1/templates/{sample_template['id']}")
        assert response.status_code == 400
        assert "published" in response.json()["detail"].lower()


class TestTemplateVersion:
    """Tests for POST /api/v1/templates/{template_id}/version."""

    def test_create_new_version(self, client, mock_sql_service, sample_template):
        """Create a new version of a template."""
        mock_sql_service.add_template(sample_template)

        with patch.object(mock_sql_service, "execute_update", return_value=1):

            def mock_execute(sql, *args, **kwargs):
                if "SELECT" in sql.upper():
                    new_version = dict(sample_template)
                    new_version["id"] = "new-version-id"
                    new_version["version"] = "1.1.0"
                    new_version["status"] = "draft"
                    return [new_version]
                return []

            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.post(
                    f"/api/v1/templates/{sample_template['id']}/version"
                )

        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "1.1.0"
        assert data["status"] == "draft"
