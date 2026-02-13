"""Tests for Example Store API endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app
from app.models.example_store import (
    ExampleResponse,
    ExampleListResponse,
    ExampleSearchResponse,
    ExampleSearchResult,
    ExampleEffectivenessStats,
    ExampleBatchResponse,
)


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_service():
    """Mock the ExampleStoreService."""
    with patch("app.api.v1.endpoints.examples.get_example_store_service") as mock:
        service = MagicMock()
        mock.return_value = service
        yield service


@pytest.fixture
def mock_user():
    """Mock the current user."""
    with patch("app.api.v1.endpoints.examples.get_current_user") as mock:
        mock.return_value = "test_user"
        yield mock


@pytest.fixture
def sample_example():
    """Sample example response for testing."""
    return ExampleResponse(
        example_id="test-123",
        version=1,
        input={"query": "What is the defect?", "image_description": "Front view"},
        expected_output={"defect_class": "NONE", "confidence": 0.95},
        explanation="No defects visible",
        databit_id="databit-456",
        databit_name="Defect Detection Template",
        domain="defect_detection",
        function_name="classify_defect",
        difficulty="easy",
        capability_tags=["no_defect", "routine"],
        search_keys=["clean", "normal"],
        has_embedding=True,
        quality_score=0.9,
        usage_count=5,
        effectiveness_score=0.85,
        source="human_authored",
        attribution_notes="Created by domain expert",
        created_by="expert@mirion.com",
        created_at=datetime(2024, 1, 15, 10, 30),
        updated_at=datetime(2024, 1, 15, 10, 30),
    )


class TestListExamples:
    """Tests for GET /api/v1/examples."""

    def test_list_examples_default(self, client, mock_service, sample_example):
        """List examples with default parameters."""
        mock_service.list_examples.return_value = ExampleListResponse(
            examples=[sample_example],
            total=1,
            page=1,
            page_size=20,
        )

        response = client.get("/api/v1/examples")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["examples"]) == 1
        assert data["examples"][0]["example_id"] == "test-123"

        mock_service.list_examples.assert_called_once_with(
            databit_id=None,
            domain=None,
            function_name=None,
            min_quality_score=None,
            page=1,
            page_size=20,
        )

    def test_list_examples_with_filters(self, client, mock_service, sample_example):
        """List examples with filtering."""
        mock_service.list_examples.return_value = ExampleListResponse(
            examples=[sample_example],
            total=1,
            page=1,
            page_size=10,
        )

        response = client.get(
            "/api/v1/examples",
            params={
                "domain": "defect_detection",
                "min_quality_score": 0.8,
                "page": 1,
                "page_size": 10,
            },
        )

        assert response.status_code == 200
        mock_service.list_examples.assert_called_once_with(
            databit_id=None,
            domain="defect_detection",
            function_name=None,
            min_quality_score=0.8,
            page=1,
            page_size=10,
        )

    def test_list_examples_pagination(self, client, mock_service):
        """List examples with pagination."""
        mock_service.list_examples.return_value = ExampleListResponse(
            examples=[],
            total=100,
            page=5,
            page_size=10,
        )

        response = client.get("/api/v1/examples", params={"page": 5, "page_size": 10})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 5
        assert data["page_size"] == 10


class TestCreateExample:
    """Tests for POST /api/v1/examples."""

    def test_create_example(self, client, mock_service, mock_user, sample_example):
        """Create a new example."""
        mock_service.create_example.return_value = sample_example

        payload = {
            "input": {"query": "What is the defect?"},
            "expected_output": {"defect_class": "NONE"},
            "explanation": "No defects visible",
            "domain": "defect_detection",
        }

        response = client.post("/api/v1/examples", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["example_id"] == "test-123"

        mock_service.create_example.assert_called_once()
        call_kwargs = mock_service.create_example.call_args.kwargs
        assert call_kwargs["created_by"] == "test_user"
        assert call_kwargs["generate_embedding"] is True

    def test_create_example_no_embedding(self, client, mock_service, mock_user, sample_example):
        """Create example without generating embedding."""
        mock_service.create_example.return_value = sample_example

        payload = {
            "input": {"query": "Test"},
            "expected_output": {"result": "OK"},
        }

        response = client.post(
            "/api/v1/examples",
            json=payload,
            params={"generate_embedding": False},
        )

        assert response.status_code == 201
        call_kwargs = mock_service.create_example.call_args.kwargs
        assert call_kwargs["generate_embedding"] is False


class TestGetExample:
    """Tests for GET /api/v1/examples/{example_id}."""

    def test_get_example(self, client, mock_service, sample_example):
        """Get an existing example."""
        mock_service.get_example.return_value = sample_example

        response = client.get("/api/v1/examples/test-123")

        assert response.status_code == 200
        data = response.json()
        assert data["example_id"] == "test-123"
        assert data["domain"] == "defect_detection"

    def test_get_example_not_found(self, client, mock_service):
        """Get non-existent example returns 404."""
        mock_service.get_example.return_value = None

        response = client.get("/api/v1/examples/not-found")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestUpdateExample:
    """Tests for PUT /api/v1/examples/{example_id}."""

    def test_update_example(self, client, mock_service, sample_example):
        """Update an existing example."""
        updated = sample_example.model_copy()
        updated.explanation = "Updated explanation"
        mock_service.update_example.return_value = updated

        payload = {"explanation": "Updated explanation"}

        response = client.put("/api/v1/examples/test-123", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["explanation"] == "Updated explanation"

    def test_update_example_not_found(self, client, mock_service):
        """Update non-existent example returns 404."""
        mock_service.update_example.return_value = None

        payload = {"explanation": "Test"}

        response = client.put("/api/v1/examples/not-found", json=payload)

        assert response.status_code == 404


class TestDeleteExample:
    """Tests for DELETE /api/v1/examples/{example_id}."""

    def test_delete_example(self, client, mock_service):
        """Delete an existing example."""
        mock_service.delete_example.return_value = True

        response = client.delete("/api/v1/examples/test-123")

        assert response.status_code == 204

    def test_delete_example_not_found(self, client, mock_service):
        """Delete non-existent example returns 404."""
        mock_service.delete_example.return_value = False

        response = client.delete("/api/v1/examples/not-found")

        assert response.status_code == 404


class TestSearchExamples:
    """Tests for POST /api/v1/examples/search."""

    def test_search_examples(self, client, mock_service, sample_example):
        """Search examples by text."""
        mock_service.search_examples.return_value = ExampleSearchResponse(
            results=[
                ExampleSearchResult(
                    example=sample_example,
                    similarity_score=0.92,
                    match_type="text",
                )
            ],
            total_matches=1,
            query_embedding_generated=False,
            search_type="metadata",
        )

        payload = {
            "query_text": "defect crack",
            "domain": "defect_detection",
            "k": 5,
        }

        response = client.post("/api/v1/examples/search", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["total_matches"] == 1
        assert len(data["results"]) == 1
        assert data["results"][0]["similarity_score"] == 0.92

    def test_search_examples_metadata_only(self, client, mock_service, sample_example):
        """Search examples with metadata filters only."""
        mock_service.search_examples.return_value = ExampleSearchResponse(
            results=[
                ExampleSearchResult(
                    example=sample_example,
                    similarity_score=None,
                    match_type="metadata",
                )
            ],
            total_matches=1,
            query_embedding_generated=False,
            search_type="metadata",
        )

        payload = {
            "domain": "defect_detection",
            "difficulty": "easy",
            "capability_tags": ["no_defect"],
        }

        response = client.post("/api/v1/examples/search", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["search_type"] == "metadata"


class TestTrackUsage:
    """Tests for POST /api/v1/examples/{example_id}/track."""

    def test_track_usage(self, client, mock_service, sample_example):
        """Track example usage."""
        mock_service.get_example.return_value = sample_example

        response = client.post(
            "/api/v1/examples/test-123/track",
            params={
                "context": "inference",
                "model_id": "model-v1",
                "outcome": "success",
            },
        )

        assert response.status_code == 204
        mock_service.track_usage.assert_called_once()

    def test_track_usage_not_found(self, client, mock_service):
        """Track usage for non-existent example returns 404."""
        mock_service.get_example.return_value = None

        response = client.post("/api/v1/examples/not-found/track")

        assert response.status_code == 404


class TestGetEffectiveness:
    """Tests for GET /api/v1/examples/{example_id}/effectiveness."""

    def test_get_effectiveness(self, client, mock_service):
        """Get effectiveness statistics."""
        mock_service.get_effectiveness_stats.return_value = ExampleEffectivenessStats(
            example_id="test-123",
            total_uses=100,
            success_count=85,
            failure_count=10,
            success_rate=0.85,
            effectiveness_score=0.82,
            effectiveness_trend="improving",
            last_used_at=datetime(2024, 1, 20, 14, 0),
        )

        response = client.get("/api/v1/examples/test-123/effectiveness")

        assert response.status_code == 200
        data = response.json()
        assert data["total_uses"] == 100
        assert data["success_rate"] == 0.85
        assert data["effectiveness_score"] == 0.82

    def test_get_effectiveness_not_found(self, client, mock_service):
        """Get effectiveness for non-existent example returns 404."""
        mock_service.get_effectiveness_stats.return_value = None

        response = client.get("/api/v1/examples/not-found/effectiveness")

        assert response.status_code == 404


class TestBatchCreate:
    """Tests for POST /api/v1/examples/batch."""

    def test_batch_create(self, client, mock_service, mock_user):
        """Create examples in batch."""
        mock_service.batch_create.return_value = ExampleBatchResponse(
            created_count=3,
            failed_count=0,
            created_ids=["id-1", "id-2", "id-3"],
            errors=None,
        )

        payload = {
            "examples": [
                {"input": {"q": "1"}, "expected_output": {"a": "1"}},
                {"input": {"q": "2"}, "expected_output": {"a": "2"}},
                {"input": {"q": "3"}, "expected_output": {"a": "3"}},
            ],
            "generate_embeddings": True,
        }

        response = client.post("/api/v1/examples/batch", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["created_count"] == 3
        assert data["failed_count"] == 0
        assert len(data["created_ids"]) == 3

    def test_batch_create_partial_failure(self, client, mock_service, mock_user):
        """Batch create with some failures."""
        mock_service.batch_create.return_value = ExampleBatchResponse(
            created_count=2,
            failed_count=1,
            created_ids=["id-1", "id-2"],
            errors=[{"index": "2", "error": "Invalid input format"}],
        )

        payload = {
            "examples": [
                {"input": {"q": "1"}, "expected_output": {"a": "1"}},
                {"input": {"q": "2"}, "expected_output": {"a": "2"}},
                {"input": {}, "expected_output": {}},  # Invalid
            ],
        }

        response = client.post("/api/v1/examples/batch", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["created_count"] == 2
        assert data["failed_count"] == 1
        assert len(data["errors"]) == 1


class TestRegenerateEmbeddings:
    """Tests for POST /api/v1/examples/regenerate-embeddings."""

    def test_regenerate_embeddings_all(self, client, mock_service):
        """Regenerate all embeddings."""
        mock_service.regenerate_embeddings.return_value = {
            "processed": 50,
            "skipped": 0,
            "errors": 2,
        }

        response = client.post("/api/v1/examples/regenerate-embeddings")

        assert response.status_code == 200
        data = response.json()
        assert data["processed"] == 50
        assert data["errors"] == 2

        mock_service.regenerate_embeddings.assert_called_once_with(
            example_ids=None,
            force=False,
        )

    def test_regenerate_embeddings_specific(self, client, mock_service):
        """Regenerate embeddings for specific examples."""
        mock_service.regenerate_embeddings.return_value = {
            "processed": 3,
            "skipped": 0,
            "errors": 0,
        }

        response = client.post(
            "/api/v1/examples/regenerate-embeddings",
            json=["id-1", "id-2", "id-3"],
            params={"force": True},
        )

        assert response.status_code == 200
        mock_service.regenerate_embeddings.assert_called_once_with(
            example_ids=["id-1", "id-2", "id-3"],
            force=True,
        )


class TestGetTopExamples:
    """Tests for GET /api/v1/examples/top."""

    def test_get_top_examples(self, client, mock_service, sample_example):
        """Get top examples by effectiveness."""
        mock_service.get_top_examples.return_value = [sample_example]

        response = client.get("/api/v1/examples/top", params={"limit": 5})

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["example_id"] == "test-123"

        mock_service.get_top_examples.assert_called_once_with(
            databit_id=None,
            limit=5,
        )

    def test_get_top_examples_for_databit(self, client, mock_service, sample_example):
        """Get top examples filtered by databit."""
        mock_service.get_top_examples.return_value = [sample_example]

        response = client.get(
            "/api/v1/examples/top",
            params={"databit_id": "databit-456", "limit": 10},
        )

        assert response.status_code == 200
        mock_service.get_top_examples.assert_called_once_with(
            databit_id="databit-456",
            limit=10,
        )
