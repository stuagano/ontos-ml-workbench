"""Tests for Example Store Pydantic models."""

import pytest
from pydantic import ValidationError

from app.models.example_store import (
    EmbeddingRequest,
    EmbeddingResponse,
    ExampleBatchCreate,
    ExampleBatchResponse,
    ExampleCreate,
    ExampleDifficulty,
    ExampleDomain,
    ExampleEffectivenessStats,
    ExampleEffectivenessUpdate,
    ExampleListResponse,
    ExampleResponse,
    ExampleSearchQuery,
    ExampleSearchResponse,
    ExampleSearchResult,
    ExampleSource,
    ExampleUpdate,
    ExampleUsageEvent,
    VectorSearchIndexConfig,
    VectorSearchSyncStatus,
)


class TestExampleCreate:
    """Tests for ExampleCreate model."""

    def test_minimal_example(self):
        """Create example with minimal required fields."""
        example = ExampleCreate(
            input={"query": "What is the defect?"},
            expected_output={"defect_type": "crack"},
        )
        assert example.input == {"query": "What is the defect?"}
        assert example.expected_output == {"defect_type": "crack"}
        assert example.domain == ExampleDomain.GENERAL
        assert example.difficulty == ExampleDifficulty.MEDIUM
        assert example.source == ExampleSource.HUMAN_AUTHORED

    def test_full_example(self):
        """Create example with all fields."""
        example = ExampleCreate(
            input={"query": "Analyze this sensor reading", "value": 42.5},
            expected_output={"status": "normal", "confidence": 0.95},
            explanation="Normal reading within expected range",
            databit_id="template-123",
            domain=ExampleDomain.PREDICTIVE_MAINTENANCE,
            function_name="analyze_sensor",
            difficulty=ExampleDifficulty.HARD,
            capability_tags=["sensor_analysis", "threshold_detection"],
            search_keys=["sensor", "normal", "maintenance"],
            source=ExampleSource.EXTRACTED_FROM_DATA,
            attribution_notes="Extracted from historical sensor data",
        )
        assert example.domain == ExampleDomain.PREDICTIVE_MAINTENANCE
        assert example.difficulty == ExampleDifficulty.HARD
        assert len(example.capability_tags) == 2

    def test_custom_domain_string(self):
        """Allow custom domain strings."""
        example = ExampleCreate(
            input={"x": 1},
            expected_output={"y": 2},
            domain="custom_domain",
        )
        assert example.domain == "custom_domain"

    def test_missing_input_fails(self):
        """Input is required."""
        with pytest.raises(ValidationError):
            ExampleCreate(expected_output={"y": 2})

    def test_missing_output_fails(self):
        """Expected output is required."""
        with pytest.raises(ValidationError):
            ExampleCreate(input={"x": 1})


class TestExampleUpdate:
    """Tests for ExampleUpdate model."""

    def test_partial_update(self):
        """Update only specific fields."""
        update = ExampleUpdate(
            explanation="Updated explanation",
            quality_score=0.95,
        )
        assert update.explanation == "Updated explanation"
        assert update.quality_score == 0.95
        assert update.input is None
        assert update.domain is None

    def test_quality_score_validation(self):
        """Quality score must be between 0 and 1."""
        with pytest.raises(ValidationError):
            ExampleUpdate(quality_score=1.5)

        with pytest.raises(ValidationError):
            ExampleUpdate(quality_score=-0.1)

        # Valid scores
        update = ExampleUpdate(quality_score=0.0)
        assert update.quality_score == 0.0

        update = ExampleUpdate(quality_score=1.0)
        assert update.quality_score == 1.0


class TestExampleResponse:
    """Tests for ExampleResponse model."""

    def test_response_with_alias(self):
        """Response handles example_id alias."""
        response = ExampleResponse(
            example_id="ex-123",
            input={"x": 1},
            expected_output={"y": 2},
            domain="general",
            difficulty="medium",
            source="human_authored",
        )
        assert response.id == "ex-123"

    def test_response_defaults(self):
        """Response has sensible defaults."""
        response = ExampleResponse(
            example_id="ex-123",
            input={"x": 1},
            expected_output={"y": 2},
            domain="general",
            difficulty="medium",
            source="human_authored",
        )
        assert response.version == 1
        assert response.usage_count == 0
        assert response.has_embedding is False
        assert response.quality_score is None


class TestExampleSearchQuery:
    """Tests for ExampleSearchQuery model."""

    def test_text_search(self):
        """Search by text query."""
        query = ExampleSearchQuery(query_text="defect detection weld")
        assert query.query_text == "defect detection weld"
        assert query.k == 10
        assert query.sort_by == "effectiveness_score"
        assert query.sort_desc is True

    def test_filtered_search(self):
        """Search with filters."""
        query = ExampleSearchQuery(
            query_text="sensor",
            domain=ExampleDomain.PREDICTIVE_MAINTENANCE,
            difficulty=ExampleDifficulty.EASY,
            min_quality_score=0.8,
            k=5,
        )
        assert query.domain == ExampleDomain.PREDICTIVE_MAINTENANCE
        assert query.min_quality_score == 0.8
        assert query.k == 5

    def test_k_validation(self):
        """K must be between 1 and 100."""
        with pytest.raises(ValidationError):
            ExampleSearchQuery(k=0)

        with pytest.raises(ValidationError):
            ExampleSearchQuery(k=101)

        # Valid k values
        query = ExampleSearchQuery(k=1)
        assert query.k == 1

        query = ExampleSearchQuery(k=100)
        assert query.k == 100

    def test_embedding_search(self):
        """Search by pre-computed embedding."""
        embedding = [0.1] * 1024
        query = ExampleSearchQuery(query_embedding=embedding, k=5)
        assert len(query.query_embedding) == 1024


class TestExampleSearchResult:
    """Tests for ExampleSearchResult model."""

    def test_result_with_score(self):
        """Search result includes similarity score."""
        example = ExampleResponse(
            example_id="ex-123",
            input={"x": 1},
            expected_output={"y": 2},
            domain="general",
            difficulty="medium",
            source="human_authored",
        )
        result = ExampleSearchResult(
            example=example,
            similarity_score=0.92,
            match_type="vector",
        )
        assert result.similarity_score == 0.92
        assert result.match_type == "vector"


class TestExampleEffectiveness:
    """Tests for effectiveness tracking models."""

    def test_usage_event(self):
        """Track example usage."""
        event = ExampleUsageEvent(
            example_id="ex-123",
            context="dspy_optimization",
            training_run_id="run-456",
            outcome="success",
        )
        assert event.example_id == "ex-123"
        assert event.outcome == "success"

    def test_effectiveness_update(self):
        """Update effectiveness metrics."""
        update = ExampleEffectivenessUpdate(
            example_id="ex-123",
            success_count=10,
            failure_count=2,
        )
        assert update.success_count == 10
        assert update.failure_count == 2

    def test_effectiveness_delta_validation(self):
        """Delta must be between -1 and 1."""
        with pytest.raises(ValidationError):
            ExampleEffectivenessUpdate(
                example_id="ex-123",
                effectiveness_delta=1.5,
            )

        # Valid deltas
        update = ExampleEffectivenessUpdate(
            example_id="ex-123",
            effectiveness_delta=-0.5,
        )
        assert update.effectiveness_delta == -0.5

    def test_effectiveness_stats(self):
        """Effectiveness statistics."""
        stats = ExampleEffectivenessStats(
            example_id="ex-123",
            total_uses=100,
            success_count=85,
            failure_count=15,
            success_rate=0.85,
            effectiveness_score=0.78,
            effectiveness_trend="improving",
        )
        assert stats.success_rate == 0.85
        assert stats.effectiveness_trend == "improving"


class TestExampleBatch:
    """Tests for batch operation models."""

    def test_batch_create(self):
        """Batch create examples."""
        examples = [
            ExampleCreate(
                input={"x": i},
                expected_output={"y": i * 2},
            )
            for i in range(3)
        ]
        batch = ExampleBatchCreate(examples=examples)
        assert len(batch.examples) == 3
        assert batch.generate_embeddings is True

    def test_batch_size_limit(self):
        """Batch limited to 100 examples."""
        examples = [
            ExampleCreate(
                input={"x": i},
                expected_output={"y": i},
            )
            for i in range(101)
        ]
        with pytest.raises(ValidationError):
            ExampleBatchCreate(examples=examples)

    def test_batch_response(self):
        """Batch operation response."""
        response = ExampleBatchResponse(
            created_count=98,
            failed_count=2,
            created_ids=["ex-1", "ex-2"],
            errors=[{"index": "5", "error": "Invalid input"}],
        )
        assert response.created_count == 98
        assert response.failed_count == 2
        assert len(response.errors) == 1


class TestEmbedding:
    """Tests for embedding models."""

    def test_embedding_request(self):
        """Request embedding generation."""
        request = EmbeddingRequest(
            example_ids=["ex-1", "ex-2"],
            model="databricks-bge-large-en",
            force_regenerate=True,
        )
        assert len(request.example_ids) == 2
        assert request.force_regenerate is True

    def test_embedding_request_defaults(self):
        """Embedding request defaults."""
        request = EmbeddingRequest()
        assert request.example_ids is None
        assert request.model == "databricks-bge-large-en"
        assert request.force_regenerate is False

    def test_embedding_response(self):
        """Embedding generation response."""
        response = EmbeddingResponse(
            processed_count=95,
            skipped_count=3,
            error_count=2,
            model_used="databricks-bge-large-en",
        )
        assert response.processed_count == 95


class TestVectorSearch:
    """Tests for Vector Search configuration models."""

    def test_index_config(self):
        """Vector Search index configuration."""
        config = VectorSearchIndexConfig(
            index_name="example_store_index",
            endpoint_name="vs-endpoint",
            embedding_dimension=1024,
        )
        assert config.index_name == "example_store_index"
        assert config.similarity_metric == "cosine"
        assert config.sync_mode == "TRIGGERED"

    def test_sync_status(self):
        """Vector Search sync status."""
        from datetime import datetime

        status = VectorSearchSyncStatus(
            index_name="example_store_index",
            last_sync_at=datetime.utcnow(),
            rows_synced=1000,
            pending_rows=50,
            sync_state="SYNCING",
        )
        assert status.sync_state == "SYNCING"
        assert status.pending_rows == 50


class TestEnums:
    """Tests for Example Store enums."""

    def test_domain_values(self):
        """Domain enum has expected values."""
        assert ExampleDomain.DEFECT_DETECTION.value == "defect_detection"
        assert ExampleDomain.PREDICTIVE_MAINTENANCE.value == "predictive_maintenance"
        assert ExampleDomain.GENERAL.value == "general"

    def test_difficulty_values(self):
        """Difficulty enum has expected values."""
        assert ExampleDifficulty.EASY.value == "easy"
        assert ExampleDifficulty.MEDIUM.value == "medium"
        assert ExampleDifficulty.HARD.value == "hard"

    def test_source_values(self):
        """Source enum has expected values."""
        assert ExampleSource.HUMAN_AUTHORED.value == "human_authored"
        assert ExampleSource.SYNTHETIC.value == "synthetic"
        assert ExampleSource.DSPY_OPTIMIZED.value == "dspy_optimized"
