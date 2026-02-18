"""Tests for Curation API endpoints."""

import json
from unittest.mock import MagicMock, patch

import pytest


class TestCurationItemList:
    """Tests for GET /api/v1/curation/templates/{template_id}/items."""

    def test_list_items_empty(self, client, mock_sql_service):
        """List curation items when none exist."""
        response = client.get("/api/v1/curation/templates/test-template-001/items")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_items_with_data(self, client, mock_sql_service, sample_curation_item):
        """List curation items with existing data."""
        mock_sql_service.add_curation_item(sample_curation_item)

        response = client.get("/api/v1/curation/templates/test-template-001/items")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == sample_curation_item["id"]
        assert data["total"] == 1

    def test_list_items_filter_by_status(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Filter curation items by status."""
        mock_sql_service.add_curation_item(sample_curation_item)

        # Filter by pending (should match)
        response = client.get(
            "/api/v1/curation/templates/test-template-001/items?status=pending"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

        # Filter by approved (should be empty)
        response = client.get(
            "/api/v1/curation/templates/test-template-001/items?status=approved"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0

    def test_list_items_pagination(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Test pagination parameters."""
        mock_sql_service.add_curation_item(sample_curation_item)

        response = client.get(
            "/api/v1/curation/templates/test-template-001/items?page=1&page_size=25"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 25


class TestCurationStats:
    """Tests for GET /api/v1/curation/templates/{template_id}/stats."""

    def test_stats_empty(self, client, mock_sql_service):
        """Get stats when no items exist."""
        response = client.get("/api/v1/curation/templates/test-template-001/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["pending"] == 0

    def test_stats_with_data(self, client, mock_sql_service, sample_curation_item):
        """Get stats with existing items."""
        mock_sql_service.add_curation_item(sample_curation_item)

        response = client.get("/api/v1/curation/templates/test-template-001/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["pending"] == 1
        assert data["approved"] == 0

    def test_stats_multiple_statuses(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Get stats with items in different statuses."""
        # Add pending item
        mock_sql_service.add_curation_item(sample_curation_item)

        # Add approved item
        approved_item = dict(sample_curation_item)
        approved_item["id"] = "test-item-002"
        approved_item["status"] = "approved"
        mock_sql_service.add_curation_item(approved_item)

        # Add rejected item
        rejected_item = dict(sample_curation_item)
        rejected_item["id"] = "test-item-003"
        rejected_item["status"] = "rejected"
        mock_sql_service.add_curation_item(rejected_item)

        response = client.get("/api/v1/curation/templates/test-template-001/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert data["pending"] == 1
        assert data["approved"] == 1
        assert data["rejected"] == 1


class TestCurationItemGet:
    """Tests for GET /api/v1/curation/items/{item_id}."""

    def test_get_item_exists(self, client, mock_sql_service, sample_curation_item):
        """Get an existing curation item."""
        mock_sql_service.add_curation_item(sample_curation_item)

        response = client.get(f"/api/v1/curation/items/{sample_curation_item['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_curation_item["id"]
        assert data["status"] == "pending"

    def test_get_item_not_found(self, client, mock_sql_service):
        """Get a non-existent item returns 404."""
        response = client.get("/api/v1/curation/items/nonexistent-id")
        assert response.status_code == 404


class TestCurationItemUpdate:
    """Tests for PUT /api/v1/curation/items/{item_id}."""

    def test_update_item_status(self, client, mock_sql_service, sample_curation_item):
        """Update item status to approved."""
        mock_sql_service.add_curation_item(sample_curation_item)

        payload = {"status": "approved"}

        with patch.object(mock_sql_service, "execute_update", return_value=1):

            def mock_execute(sql, *args, **kwargs):
                if "SELECT" in sql.upper():
                    updated = dict(sample_curation_item)
                    updated["status"] = "approved"
                    updated["reviewed_by"] = "test_user@example.com"
                    return [updated]
                return []

            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.put(
                    f"/api/v1/curation/items/{sample_curation_item['id']}", json=payload
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

    def test_update_item_with_human_label(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Update item with human override label."""
        mock_sql_service.add_curation_item(sample_curation_item)

        payload = {
            "status": "approved",
            "human_label": {"label": "negative"},
            "review_notes": "AI was wrong, this is actually negative",
        }

        with patch.object(mock_sql_service, "execute_update", return_value=1):

            def mock_execute(sql, *args, **kwargs):
                if "SELECT" in sql.upper():
                    updated = dict(sample_curation_item)
                    updated["status"] = "approved"
                    updated["human_label"] = json.dumps({"label": "negative"})
                    updated["review_notes"] = payload["review_notes"]
                    return [updated]
                return []

            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.put(
                    f"/api/v1/curation/items/{sample_curation_item['id']}", json=payload
                )

        assert response.status_code == 200
        data = response.json()
        assert data["human_label"]["label"] == "negative"
        assert data["review_notes"] == payload["review_notes"]

    def test_update_item_quality_score(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Update item quality score."""
        mock_sql_service.add_curation_item(sample_curation_item)

        payload = {"quality_score": 4.5}

        with patch.object(mock_sql_service, "execute_update", return_value=1):

            def mock_execute(sql, *args, **kwargs):
                if "SELECT" in sql.upper():
                    updated = dict(sample_curation_item)
                    updated["quality_score"] = 4.5
                    return [updated]
                return []

            with patch.object(mock_sql_service, "execute", side_effect=mock_execute):
                response = client.put(
                    f"/api/v1/curation/items/{sample_curation_item['id']}", json=payload
                )

        assert response.status_code == 200
        data = response.json()
        assert data["quality_score"] == 4.5


class TestBulkUpdate:
    """Tests for POST /api/v1/curation/items/bulk."""

    def test_bulk_approve(self, client, mock_sql_service, sample_curation_item):
        """Bulk approve multiple items."""
        mock_sql_service.add_curation_item(sample_curation_item)

        item2 = dict(sample_curation_item)
        item2["id"] = "test-item-002"
        mock_sql_service.add_curation_item(item2)

        payload = {
            "item_ids": [sample_curation_item["id"], "test-item-002"],
            "status": "approved",
        }

        with patch.object(mock_sql_service, "execute_update", return_value=2):
            response = client.post("/api/v1/curation/items/bulk", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["updated"] == 2
        assert data["status"] == "approved"

    def test_bulk_reject_with_notes(
        self, client, mock_sql_service, sample_curation_item
    ):
        """Bulk reject items with notes."""
        mock_sql_service.add_curation_item(sample_curation_item)

        payload = {
            "item_ids": [sample_curation_item["id"]],
            "status": "rejected",
            "review_notes": "Low quality data",
        }

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            response = client.post("/api/v1/curation/items/bulk", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["updated"] == 1
        assert data["status"] == "rejected"


class TestTriggerLabeling:
    """Tests for POST /api/v1/curation/templates/{template_id}/label."""

    def test_trigger_labeling_default_params(self, client, mock_sql_service):
        """Trigger AI labeling with default parameters."""
        mock_job_service = MagicMock()
        mock_job_service.trigger_job.return_value = {
            "run_id": "12345",
            "status": "PENDING",
        }

        with patch(
            "app.api.v1.endpoints.curation.get_job_service",
            return_value=mock_job_service,
        ):
            response = client.post("/api/v1/curation/templates/test-template-001/label")

        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == "12345"

        # Verify job service was called correctly
        mock_job_service.trigger_job.assert_called_once()
        call_args = mock_job_service.trigger_job.call_args
        assert call_args.kwargs["job_type"] == "labeling_agent"
        assert call_args.kwargs["template_id"] == "test-template-001"

    def test_trigger_labeling_custom_threshold(self, client, mock_sql_service):
        """Trigger AI labeling with custom confidence threshold."""
        mock_job_service = MagicMock()
        mock_job_service.trigger_job.return_value = {
            "run_id": "12346",
            "status": "PENDING",
        }

        with patch(
            "app.api.v1.endpoints.curation.get_job_service",
            return_value=mock_job_service,
        ):
            response = client.post(
                "/api/v1/curation/templates/test-template-001/label?confidence_threshold=0.9"
            )

        assert response.status_code == 200

        call_args = mock_job_service.trigger_job.call_args
        assert call_args.kwargs["config"]["confidence_threshold"] == "0.9"


class TestCreateCurationItems:
    """Tests for POST /api/v1/curation/templates/{template_id}/items."""

    def test_create_items_batch(self, client, mock_sql_service):
        """Create multiple curation items."""
        items = [
            {"item_ref": "row_001", "item_data": {"text": "First sample"}},
            {"item_ref": "row_002", "item_data": {"text": "Second sample"}},
        ]

        with patch.object(mock_sql_service, "execute_update", return_value=1):
            with patch.object(mock_sql_service, "execute") as mock_execute:
                mock_execute.return_value = [
                    {
                        "id": "new-item-001",
                        "template_id": "test-template-001",
                        "item_ref": "row_001",
                        "item_data": json.dumps({"text": "First sample"}),
                        "agent_label": None,
                        "agent_confidence": None,
                        "agent_model": None,
                        "agent_reasoning": None,
                        "human_label": None,
                        "status": "pending",
                        "quality_score": None,
                        "reviewed_by": None,
                        "reviewed_at": None,
                        "review_notes": None,
                        "created_at": "2025-01-20T10:00:00Z",
                        "updated_at": "2025-01-20T10:00:00Z",
                    },
                    {
                        "id": "new-item-002",
                        "template_id": "test-template-001",
                        "item_ref": "row_002",
                        "item_data": json.dumps({"text": "Second sample"}),
                        "agent_label": None,
                        "agent_confidence": None,
                        "agent_model": None,
                        "agent_reasoning": None,
                        "human_label": None,
                        "status": "pending",
                        "quality_score": None,
                        "reviewed_by": None,
                        "reviewed_at": None,
                        "review_notes": None,
                        "created_at": "2025-01-20T10:00:00Z",
                        "updated_at": "2025-01-20T10:00:00Z",
                    },
                ]

                response = client.post(
                    "/api/v1/curation/templates/test-template-001/items", json=items
                )

        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert all(item["status"] == "pending" for item in data)
