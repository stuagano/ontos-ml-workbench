"""
Tests for DSPy Integration Service and Models
"""

import pytest
from datetime import datetime
from uuid import uuid4

from app.models.dspy_models import (
    DSPyFieldSpec,
    DSPySignature,
    DSPyExample,
    DSPyModuleConfig,
    DSPyProgram,
    DSPyOptimizerType,
    OptimizationConfig,
    OptimizationRunStatus,
    DSPyOptimizationRun,
    DSPyExportRequest,
    DSPyExportResult,
    ExportFormat,
    ContextPoolSession,
    ContextPoolEntry,
    EffectivenessEvent,
    ActiveExampleCache,
)
from app.models.template import TemplateResponse, TemplateStatus, SchemaField
from app.services.dspy_integration_service import DSPyIntegrationService
from app.services.context_pool_service import ContextPoolService
from unittest.mock import AsyncMock, MagicMock


# =============================================================================
# Model Tests
# =============================================================================


class TestDSPySignatureModels:
    """Tests for DSPy signature-related models."""

    def test_field_spec_creation(self):
        """Test DSPyFieldSpec creation."""
        field = DSPyFieldSpec(
            name="defect_type",
            description="Type of defect detected",
            field_type="str",
        )
        assert field.name == "defect_type"
        assert field.description == "Type of defect detected"
        assert field.field_type == "str"
        assert field.required is True

    def test_signature_creation(self):
        """Test DSPySignature creation."""
        signature = DSPySignature(
            signature_name="DefectClassifier",
            docstring="Classify defects from images",
            input_fields=[
                DSPyFieldSpec(name="image_desc", description="Image description"),
            ],
            output_fields=[
                DSPyFieldSpec(name="defect_type", description="Defect classification"),
            ],
        )
        assert signature.signature_name == "DefectClassifier"
        assert len(signature.input_fields) == 1
        assert len(signature.output_fields) == 1

    def test_example_to_dspy(self):
        """Test DSPyExample.to_dspy_example()."""
        example = DSPyExample(
            inputs={"query": "test"},
            outputs={"result": "success"},
            example_id="ex-1",
            effectiveness_score=0.85,
        )
        dspy_ex = example.to_dspy_example()
        assert dspy_ex == {"query": "test", "result": "success"}


class TestDSPyProgramModels:
    """Tests for DSPy program models."""

    def test_module_config(self):
        """Test DSPyModuleConfig defaults."""
        config = DSPyModuleConfig(signature_name="TestSig")
        assert config.module_type == "Predict"
        assert config.num_examples == 3
        assert config.temperature == 0.7

    def test_program_creation(self):
        """Test DSPyProgram creation."""
        signature = DSPySignature(
            signature_name="TestSig",
            docstring="Test signature",
        )
        program = DSPyProgram(
            program_name="TestProgram",
            signature=signature,
            module_config=DSPyModuleConfig(signature_name="TestSig"),
        )
        assert program.program_name == "TestProgram"
        assert program.signature.signature_name == "TestSig"


class TestOptimizationModels:
    """Tests for optimization run models."""

    def test_optimizer_types(self):
        """Test optimizer type enum values."""
        assert DSPyOptimizerType.BOOTSTRAP_FEWSHOT == "BootstrapFewShot"
        assert DSPyOptimizerType.MIPRO == "MIPRO"

    def test_optimization_config_defaults(self):
        """Test OptimizationConfig defaults."""
        config = OptimizationConfig()
        assert config.optimizer_type == DSPyOptimizerType.BOOTSTRAP_FEWSHOT
        assert config.max_bootstrapped_demos == 4
        assert config.num_trials == 100

    def test_run_status_values(self):
        """Test optimization run status enum."""
        assert OptimizationRunStatus.PENDING == "pending"
        assert OptimizationRunStatus.COMPLETED == "completed"

    def test_optimization_run_creation(self):
        """Test DSPyOptimizationRun creation."""
        run = DSPyOptimizationRun(
            program_name="TestProgram",
            databit_id="databit-1",
            signature_name="TestSig",
            config=OptimizationConfig(),
        )
        assert run.status == OptimizationRunStatus.PENDING
        assert run.program_name == "TestProgram"
        assert run.trial_results == []


class TestExportModels:
    """Tests for export-related models."""

    def test_export_format_values(self):
        """Test export format enum."""
        assert ExportFormat.PYTHON_MODULE == "python_module"
        assert ExportFormat.JSON_CONFIG == "json_config"

    def test_export_request_defaults(self):
        """Test DSPyExportRequest defaults."""
        request = DSPyExportRequest(databit_id="test-1")
        assert request.format == ExportFormat.PYTHON_MODULE
        assert request.include_examples is True
        assert request.max_examples == 5

    def test_export_result_creation(self):
        """Test DSPyExportResult creation."""
        result = DSPyExportResult(
            databit_id="test-1",
            databit_name="Test Databit",
            format=ExportFormat.PYTHON_MODULE,
            signature_code="class TestSig(dspy.Signature): pass",
            program_code="# Full program code",
        )
        assert result.is_valid is True
        assert result.validation_errors == []


# =============================================================================
# Context Pool Model Tests
# =============================================================================


class TestContextPoolModels:
    """Tests for context pool models."""

    def test_session_creation(self):
        """Test ContextPoolSession creation."""
        session = ContextPoolSession(
            customer_id="cust-1",
            agent_id="agent-1",
            agent_type="support",
        )
        assert session.status == "active"
        assert session.customer_id == "cust-1"
        assert session.handed_off_from is None

    def test_entry_creation(self):
        """Test ContextPoolEntry creation."""
        session_id = uuid4()
        entry = ContextPoolEntry(
            session_id=session_id,
            entry_type="user_message",
            content={"text": "Hello"},
            sequence_num=0,
        )
        assert entry.entry_type == "user_message"
        assert entry.tool_name is None

    def test_effectiveness_event(self):
        """Test EffectivenessEvent creation."""
        event = EffectivenessEvent(
            example_id="ex-1",
            agent_id="agent-1",
            event_type="successful",
            outcome_positive=True,
        )
        assert event.synced_to_delta is False
        assert event.outcome_positive is True

    def test_active_example_cache(self):
        """Test ActiveExampleCache creation."""
        cache = ActiveExampleCache(
            example_id="ex-1",
            domain="defect_detection",
            input_json={"query": "test"},
            expected_output_json={"result": "crack"},
        )
        assert cache.effectiveness_score == 0.5
        assert cache.usage_count == 0


# =============================================================================
# Service Tests
# =============================================================================


class TestDSPyIntegrationService:
    """Tests for DSPyIntegrationService."""

    @pytest.fixture
    def mock_example_store(self):
        """Create a mock example store service."""
        mock = MagicMock()
        mock.get_top_examples = AsyncMock(return_value=[])
        mock.list_examples = AsyncMock(return_value=MagicMock(examples=[]))
        mock.track_usage = AsyncMock()
        return mock

    @pytest.fixture
    def service(self, mock_example_store):
        """Create DSPy integration service with mocked dependencies."""
        return DSPyIntegrationService(example_store=mock_example_store)

    @pytest.fixture
    def sample_template(self):
        """Create a sample template for testing."""
        return TemplateResponse(
            id="template-1",
            name="Defect Detector",
            description="Detect defects in images",
            version="1.0.0",
            status=TemplateStatus.DRAFT,
            input_schema=[
                SchemaField(name="image", type="string", description="Image path"),
                SchemaField(name="context", type="string", description="Context info"),
            ],
            output_schema=[
                SchemaField(name="defect_type", type="string", description="Type of defect"),
                SchemaField(name="confidence", type="number", description="Confidence score"),
            ],
            prompt_template="Analyze the image: {image}",
            system_prompt="You are a defect detection expert.",
            examples=[],
            base_model="databricks-llama-3",
            temperature=0.7,
            max_tokens=1024,
        )

    def test_to_class_name(self, service):
        """Test _to_class_name helper."""
        assert service._to_class_name("defect detector") == "DefectDetector"
        # Note: underscores are treated as separators, but the result is lowercase
        assert service._to_class_name("my-cool_template") == "Mycooltemplate"

    def test_to_python_identifier(self, service):
        """Test _to_python_identifier helper."""
        assert service._to_python_identifier("defect type") == "defect_type"
        assert service._to_python_identifier("123field") == "field_123field"

    def test_map_type(self, service):
        """Test _map_type helper."""
        assert service._map_type("string") == "str"
        assert service._map_type("integer") == "int"
        assert service._map_type("unknown") == "str"

    def test_databit_to_signature(self, service, sample_template):
        """Test converting template to DSPy signature."""
        signature = service.databit_to_signature(sample_template)

        assert signature.signature_name == "DefectDetector"
        assert "Detect defects" in signature.docstring
        assert len(signature.input_fields) == 2
        assert len(signature.output_fields) == 2
        assert signature.databit_id == "template-1"

    def test_generate_signature_code(self, service, sample_template):
        """Test generating signature code."""
        signature = service.databit_to_signature(sample_template)
        code = service.generate_signature_code(signature)

        assert "import dspy" in code
        assert "class DefectDetector(dspy.Signature):" in code
        assert "dspy.InputField" in code
        assert "dspy.OutputField" in code

    @pytest.mark.asyncio
    async def test_create_program(self, service, sample_template):
        """Test creating a DSPy program."""
        program = await service.create_program(sample_template)

        assert program.program_name == "DefectDetectorProgram"
        assert program.signature.signature_name == "DefectDetector"
        assert program.module_config.module_type == "ChainOfThought"
        assert program.databit_id == "template-1"

    def test_generate_program_code(self, service, sample_template):
        """Test generating full program code."""
        signature = service.databit_to_signature(sample_template)
        program = DSPyProgram(
            program_name="TestProgram",
            signature=signature,
            module_config=DSPyModuleConfig(signature_name=signature.signature_name),
        )
        code = service.generate_program_code(program)

        assert "import dspy" in code
        assert "class TestProgram(dspy.Module):" in code
        assert "def forward(self, **kwargs):" in code

    def test_generate_program_code_with_optimizer(self, service, sample_template):
        """Test generating program code with optimizer setup."""
        signature = service.databit_to_signature(sample_template)
        program = DSPyProgram(
            program_name="TestProgram",
            signature=signature,
            module_config=DSPyModuleConfig(signature_name=signature.signature_name),
        )
        code = service.generate_program_code(
            program, include_optimizer_setup=True
        )

        assert "BootstrapFewShot" in code
        assert "def optimize():" in code
        assert "accuracy_metric" in code


class TestContextPoolService:
    """Tests for ContextPoolService."""

    @pytest.fixture
    def service(self):
        """Create context pool service with in-memory storage."""
        return ContextPoolService(lakebase_connection=None)

    @pytest.mark.asyncio
    async def test_create_session(self, service):
        """Test creating a session."""
        session = await service.create_session(
            customer_id="cust-1",
            agent_id="agent-1",
            agent_type="support",
        )
        assert session.customer_id == "cust-1"
        assert session.status == "active"

    @pytest.mark.asyncio
    async def test_add_entry(self, service):
        """Test adding an entry to a session."""
        session = await service.create_session(
            customer_id="cust-1",
            agent_id="agent-1",
        )
        entry = await service.add_entry(
            session_id=session.session_id,
            entry_type="user_message",
            content={"text": "Hello, I need help"},
        )
        assert entry.entry_type == "user_message"
        assert entry.sequence_num == 0

    @pytest.mark.asyncio
    async def test_get_session_entries(self, service):
        """Test retrieving session entries."""
        session = await service.create_session(
            customer_id="cust-1",
            agent_id="agent-1",
        )
        await service.add_entry(
            session_id=session.session_id,
            entry_type="user_message",
            content={"text": "First message"},
        )
        await service.add_entry(
            session_id=session.session_id,
            entry_type="agent_response",
            content={"text": "Response"},
        )

        entries = await service.get_session_entries(session.session_id)
        assert len(entries) == 2
        assert entries[0].entry_type == "user_message"
        assert entries[1].entry_type == "agent_response"

    @pytest.mark.asyncio
    async def test_perform_handoff(self, service):
        """Test agent handoff."""
        session1 = await service.create_session(
            customer_id="cust-1",
            agent_id="agent-1",
            agent_type="support",
        )
        await service.add_entry(
            session_id=session1.session_id,
            entry_type="user_message",
            content={"text": "I need specialized help"},
        )

        session2 = await service.perform_handoff(
            from_session_id=session1.session_id,
            to_agent_id="agent-2",
            to_agent_type="specialist",
            reason="Escalation to specialist",
        )

        assert session2.agent_id == "agent-2"
        assert session2.handed_off_from == session1.session_id

        # Check source session status
        updated_session1 = await service.get_session(session1.session_id)
        assert updated_session1.status == "handed_off"

    @pytest.mark.asyncio
    async def test_cache_example(self, service):
        """Test caching an example."""
        cache = await service.cache_example(
            example_id="ex-1",
            domain="defect_detection",
            input_json={"image": "test.jpg"},
            expected_output_json={"defect": "crack"},
            effectiveness_score=0.8,
        )
        assert cache.example_id == "ex-1"
        assert cache.effectiveness_score == 0.8

    @pytest.mark.asyncio
    async def test_get_top_examples_cached(self, service):
        """Test retrieving top cached examples."""
        # Cache some examples
        await service.cache_example(
            example_id="ex-1",
            domain="defect_detection",
            input_json={"query": "1"},
            expected_output_json={"result": "1"},
            effectiveness_score=0.9,
        )
        await service.cache_example(
            example_id="ex-2",
            domain="defect_detection",
            input_json={"query": "2"},
            expected_output_json={"result": "2"},
            effectiveness_score=0.7,
        )

        examples = await service.get_top_examples_cached(
            domain="defect_detection",
            limit=5,
        )
        assert len(examples) == 2
        # Should be sorted by effectiveness
        assert examples[0].effectiveness_score >= examples[1].effectiveness_score

    @pytest.mark.asyncio
    async def test_record_effectiveness_event(self, service):
        """Test recording an effectiveness event."""
        event = await service.record_effectiveness_event(
            example_id="ex-1",
            agent_id="agent-1",
            event_type="successful",
            outcome_positive=True,
            confidence_score=0.95,
        )
        assert event.example_id == "ex-1"
        assert event.outcome_positive is True

    @pytest.mark.asyncio
    async def test_effectiveness_update_on_usage(self, service):
        """Test that effectiveness updates on usage."""
        await service.cache_example(
            example_id="ex-1",
            domain="test",
            input_json={},
            expected_output_json={},
            effectiveness_score=0.5,
        )

        # Record positive outcomes
        await service.record_effectiveness_event(
            example_id="ex-1",
            agent_id="agent-1",
            event_type="successful",
            outcome_positive=True,
        )
        await service.record_effectiveness_event(
            example_id="ex-1",
            agent_id="agent-1",
            event_type="successful",
            outcome_positive=True,
        )

        # Check updated effectiveness
        examples = await service.get_top_examples_cached(domain="test")
        assert len(examples) == 1
        assert examples[0].usage_count == 2
        assert examples[0].success_count == 2
        assert examples[0].effectiveness_score == 1.0
