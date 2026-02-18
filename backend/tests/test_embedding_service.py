"""Tests for EmbeddingService."""

import pytest
from unittest.mock import patch, MagicMock

from app.services.embedding_service import (
    EmbeddingService,
    get_embedding_service,
    compute_embedding,
    compute_embeddings_batch,
)


class TestEmbeddingService:
    """Tests for EmbeddingService class."""

    def test_model_dimensions(self):
        """Known models have correct dimensions."""
        service = EmbeddingService(model="databricks-bge-large-en")
        assert service.dimension == 1024

        service = EmbeddingService(model="text-embedding-ada-002")
        assert service.dimension == 1536

        service = EmbeddingService(model="sentence-transformers/all-MiniLM-L6-v2")
        assert service.dimension == 384

    def test_unknown_model_defaults_to_1024(self):
        """Unknown models default to 1024 dimension."""
        service = EmbeddingService(model="unknown-model")
        assert service.dimension == 1024

    def test_local_model_detection(self):
        """Local models are detected correctly."""
        service = EmbeddingService(model="BAAI/bge-large-en-v1.5")
        assert service._use_local is True

        service = EmbeddingService(model="sentence-transformers/all-MiniLM-L6-v2")
        assert service._use_local is True

        service = EmbeddingService(model="databricks-bge-large-en")
        assert service._use_local is False

    def test_dict_to_text_simple(self):
        """Dict to text conversion for simple dict."""
        service = EmbeddingService()
        result = service._dict_to_text({"name": "test", "value": 42})
        assert "name: test" in result
        assert "value: 42" in result

    def test_dict_to_text_nested(self):
        """Dict to text conversion for nested dict."""
        service = EmbeddingService()
        result = service._dict_to_text({
            "query": "test",
            "context": {"temperature": 25, "humidity": 50}
        })
        assert "query: test" in result
        assert "context.temperature: 25" in result
        assert "context.humidity: 50" in result

    def test_dict_to_text_with_list(self):
        """Dict to text conversion handles lists."""
        service = EmbeddingService()
        result = service._dict_to_text({
            "tags": ["a", "b", "c"]
        })
        assert "tags: a, b, c" in result


class TestLocalEmbeddings:
    """Tests for local embedding generation using sentence-transformers."""

    @pytest.fixture
    def local_service(self):
        """Create a service configured for local embeddings."""
        return EmbeddingService(model="sentence-transformers/all-MiniLM-L6-v2")

    def test_compute_local_embedding(self, local_service):
        """Generate embedding using local model."""
        # This test requires sentence-transformers to be installed
        try:
            embedding = local_service.compute_embedding("Hello world")
            assert isinstance(embedding, list)
            assert len(embedding) == 384  # all-MiniLM-L6-v2 dimension
            assert all(isinstance(x, float) for x in embedding)
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise

    def test_compute_local_embeddings_batch(self, local_service):
        """Generate batch embeddings using local model."""
        try:
            texts = ["Hello", "World", "Test"]
            embeddings = local_service.compute_embeddings_batch(texts)
            assert len(embeddings) == 3
            assert all(len(e) == 384 for e in embeddings)
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise

    def test_embed_example_input(self, local_service):
        """Embed an example input dict."""
        try:
            example_input = {
                "query": "What is the defect?",
                "image_description": "Front view of detector",
                "sensor_context": {"temperature": 22.5}
            }
            embedding = local_service.embed_example_input(example_input)
            assert isinstance(embedding, list)
            assert len(embedding) == 384
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise

    def test_embed_search_keys(self, local_service):
        """Embed search keys."""
        try:
            search_keys = ["defect", "crack", "critical"]
            embedding = local_service.embed_search_keys(search_keys)
            assert isinstance(embedding, list)
            assert len(embedding) == 384
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise

    def test_embed_search_keys_empty_raises(self, local_service):
        """Empty search keys raises error."""
        with pytest.raises(ValueError, match="cannot be empty"):
            local_service.embed_search_keys([])


class TestFMAPIEmbeddings:
    """Tests for Databricks FMAPI embedding generation."""

    @pytest.fixture
    def fmapi_service(self):
        """Create a service configured for FMAPI."""
        return EmbeddingService(model="databricks-bge-large-en")

    def test_fmapi_fallback_on_error(self, fmapi_service):
        """Falls back to local model on FMAPI error."""
        # Mock the workspace client to raise an error
        with patch("app.services.embedding_service.get_workspace_client") as mock_client:
            mock_client.return_value.serving_endpoints.query.side_effect = Exception("Connection failed")

            # Should fall back to local and still produce an embedding
            try:
                embedding = fmapi_service.compute_embedding("test")
                assert isinstance(embedding, list)
                assert fmapi_service._use_local is True
            except RuntimeError as e:
                if "sentence-transformers not installed" in str(e):
                    pytest.skip("sentence-transformers not installed")
                raise

    def test_fmapi_success_response(self, fmapi_service):
        """FMAPI returns embedding on success."""
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1024)]

        with patch("app.services.embedding_service.get_workspace_client") as mock_client:
            mock_client.return_value.serving_endpoints.query.return_value = mock_response

            embedding = fmapi_service.compute_embedding("test")
            assert len(embedding) == 1024


class TestSingletonAndHelpers:
    """Tests for singleton pattern and helper functions."""

    def test_get_embedding_service_singleton(self):
        """get_embedding_service returns singleton."""
        service1 = get_embedding_service()
        service2 = get_embedding_service()
        assert service1 is service2

    def test_get_embedding_service_with_model_override(self):
        """Model override creates new service."""
        service1 = get_embedding_service(model="databricks-bge-large-en")
        service2 = get_embedding_service(model="sentence-transformers/all-MiniLM-L6-v2")
        # Different models should result in different services
        assert service1.model != service2.model

    def test_compute_embedding_helper(self):
        """compute_embedding helper function works."""
        try:
            embedding = compute_embedding(
                "test",
                model="sentence-transformers/all-MiniLM-L6-v2"
            )
            assert isinstance(embedding, list)
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise

    def test_compute_embeddings_batch_helper(self):
        """compute_embeddings_batch helper function works."""
        try:
            embeddings = compute_embeddings_batch(
                ["test1", "test2"],
                model="sentence-transformers/all-MiniLM-L6-v2"
            )
            assert len(embeddings) == 2
        except RuntimeError as e:
            if "sentence-transformers not installed" in str(e):
                pytest.skip("sentence-transformers not installed")
            raise
