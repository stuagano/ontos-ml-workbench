"""
DSPy Integration Service

Handles export of Databits to DSPy format, optimization run management,
and the feedback loop between Example Store and DSPy optimization.
"""

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID, uuid4

from app.models.dspy_models import (
    DSPyExample,
    DSPyExportRequest,
    DSPyExportResult,
    DSPyFieldSpec,
    DSPyModuleConfig,
    DSPyOptimizationRun,
    DSPyProgram,
    DSPySignature,
    ExportFormat,
    OptimizationConfig,
    OptimizationRunCreate,
    OptimizationRunResponse,
    OptimizationRunStatus,
    OptimizationTrialResult,
)
from app.models.template import TemplateResponse as Template
from app.services.example_store_service import ExampleStoreService

logger = logging.getLogger(__name__)


class DSPyIntegrationService:
    """
    Service for DSPy integration.

    Responsibilities:
    - Convert Databits to DSPy Signatures and Programs
    - Export DSPy-compatible Python code
    - Manage optimization runs (via Databricks Jobs + MLflow)
    - Sync optimization results back to Example Store
    """

    def __init__(
        self,
        example_store: ExampleStoreService,
        sql_service: Optional[Any] = None,
    ):
        self.example_store = example_store
        self.sql_service = sql_service
        self._optimization_runs: dict[UUID, DSPyOptimizationRun] = {}

    # =========================================================================
    # Signature Generation
    # =========================================================================

    def databit_to_signature(self, template: Template) -> DSPySignature:
        """
        Convert a Databit/Template to a DSPy Signature.

        Maps the template's input/output schema to DSPy field specifications.
        """
        # Generate signature name from template name
        signature_name = self._to_class_name(template.name)

        # Convert input schema (list of SchemaField objects)
        input_fields = []
        if template.input_schema:
            for field in template.input_schema:
                input_fields.append(
                    DSPyFieldSpec(
                        name=self._to_python_identifier(field.name),
                        description=field.description or f"Input: {field.name}",
                        field_type=self._map_type(field.type),
                    )
                )

        # Convert output schema (list of SchemaField objects)
        output_fields = []
        if template.output_schema:
            for field in template.output_schema:
                output_fields.append(
                    DSPyFieldSpec(
                        name=self._to_python_identifier(field.name),
                        description=field.description or f"Output: {field.name}",
                        field_type=self._map_type(field.type),
                    )
                )

        # Build docstring from template description and prompt
        docstring = template.description or f"Task: {template.name}"
        if template.system_prompt:
            docstring = f"{docstring}\n\nSystem: {template.system_prompt[:200]}"

        return DSPySignature(
            signature_name=signature_name,
            docstring=docstring,
            input_fields=input_fields,
            output_fields=output_fields,
            databit_id=template.id,
            databit_version=template.version,
        )

    def generate_signature_code(self, signature: DSPySignature) -> str:
        """Generate Python code for a DSPy Signature class."""
        lines = [
            "import dspy",
            "",
            "",
            f'class {signature.signature_name}(dspy.Signature):',
            f'    """{signature.docstring}"""',
            "",
        ]

        # Add input fields
        for field in signature.input_fields:
            desc = field.description.replace('"', '\\"')
            lines.append(
                f'    {field.name} = dspy.InputField(desc="{desc}")'
            )

        # Add output fields
        for field in signature.output_fields:
            desc = field.description.replace('"', '\\"')
            lines.append(
                f'    {field.name} = dspy.OutputField(desc="{desc}")'
            )

        return "\n".join(lines)

    # =========================================================================
    # Program Generation
    # =========================================================================

    async def create_program(
        self,
        template: Template,
        max_examples: int = 5,
        min_effectiveness: float = 0.0,
    ) -> DSPyProgram:
        """
        Create a complete DSPy Program from a Databit.

        Includes signature, module configuration, and training examples.
        """
        # Generate signature
        signature = self.databit_to_signature(template)

        # Get top examples for this template
        examples = await self.example_store.get_top_examples(
            databit_id=template.id,
            k=max_examples,
            min_effectiveness=min_effectiveness,
        )

        # Convert to DSPy format
        dspy_examples = []
        example_ids = []
        for ex in examples:
            dspy_ex = DSPyExample(
                inputs=ex.input,
                outputs=ex.expected_output,
                example_id=ex.example_id,
                effectiveness_score=ex.effectiveness_score,
            )
            dspy_examples.append(dspy_ex)
            example_ids.append(ex.example_id)

        # Create module config
        module_config = DSPyModuleConfig(
            module_type="ChainOfThought",  # Default to CoT for reasoning
            signature_name=signature.signature_name,
            num_examples=len(dspy_examples),
            temperature=template.temperature or 0.7,
            max_tokens=template.max_tokens or 1024,
        )

        return DSPyProgram(
            program_name=f"{signature.signature_name}Program",
            description=template.description or "",
            signature=signature,
            module_config=module_config,
            training_examples=dspy_examples,
            model_name=template.base_model or "databricks-meta-llama-3-1-70b-instruct",
            databit_id=template.id,
            example_ids=example_ids,
        )

    def generate_program_code(
        self,
        program: DSPyProgram,
        include_examples: bool = True,
        include_optimizer_setup: bool = False,
    ) -> str:
        """Generate complete Python code for a DSPy program."""
        lines = [
            '"""',
            f"DSPy Program: {program.program_name}",
            f"Generated from Databit: {program.databit_id}",
            f"Generated at: {datetime.utcnow().isoformat()}",
            '"""',
            "",
            "import dspy",
            "from dspy.teleprompt import BootstrapFewShot",
            "",
            "",
            "# =============================================================================",
            "# Model Configuration",
            "# =============================================================================",
            "",
            f'lm = dspy.LM("{program.model_name}")',
            "dspy.configure(lm=lm)",
            "",
            "",
        ]

        # Add signature
        lines.append("# =============================================================================")
        lines.append("# Signature Definition")
        lines.append("# =============================================================================")
        lines.append("")
        lines.append(self.generate_signature_code(program.signature))
        lines.append("")
        lines.append("")

        # Add examples if requested
        if include_examples and program.training_examples:
            lines.append("# =============================================================================")
            lines.append("# Training Examples")
            lines.append("# =============================================================================")
            lines.append("")
            lines.append("TRAINING_EXAMPLES = [")
            for ex in program.training_examples:
                ex_dict = ex.to_dspy_example()
                lines.append(f"    dspy.Example({ex_dict}).with_inputs(")
                input_keys = ", ".join(f'"{k}"' for k in ex.inputs.keys())
                lines.append(f"        {input_keys}")
                lines.append("    ),")
            lines.append("]")
            lines.append("")
            lines.append("")

        # Add program class
        lines.append("# =============================================================================")
        lines.append("# Program Definition")
        lines.append("# =============================================================================")
        lines.append("")
        lines.append(f"class {program.program_name}(dspy.Module):")
        lines.append(f'    """')
        lines.append(f"    {program.description or 'DSPy program for ' + program.signature.signature_name}")
        lines.append(f'    """')
        lines.append("")
        lines.append("    def __init__(self):")
        lines.append("        super().__init__()")
        lines.append(f"        self.predictor = dspy.{program.module_config.module_type}(")
        lines.append(f"            {program.signature.signature_name}")
        lines.append("        )")
        lines.append("")
        lines.append("    def forward(self, **kwargs):")
        lines.append("        return self.predictor(**kwargs)")
        lines.append("")
        lines.append("")

        # Add optimizer setup if requested
        if include_optimizer_setup:
            lines.append("# =============================================================================")
            lines.append("# Optimizer Setup")
            lines.append("# =============================================================================")
            lines.append("")
            lines.append("def accuracy_metric(example, pred, trace=None):")
            lines.append('    """Evaluate prediction accuracy against expected output."""')
            lines.append("    # Customize this metric for your use case")
            output_fields = [f.name for f in program.signature.output_fields]
            if output_fields:
                lines.append(f"    return getattr(pred, '{output_fields[0]}', None) == getattr(example, '{output_fields[0]}', None)")
            else:
                lines.append("    return True")
            lines.append("")
            lines.append("")
            lines.append("def optimize():")
            lines.append('    """Run DSPy optimization."""')
            lines.append("    optimizer = BootstrapFewShot(")
            lines.append("        metric=accuracy_metric,")
            lines.append("        max_bootstrapped_demos=4,")
            lines.append("        max_labeled_demos=16,")
            lines.append("    )")
            lines.append("")
            lines.append(f"    program = {program.program_name}()")
            lines.append("    optimized = optimizer.compile(")
            lines.append("        program,")
            lines.append("        trainset=TRAINING_EXAMPLES,")
            lines.append("    )")
            lines.append("    return optimized")
            lines.append("")
            lines.append("")
            lines.append('if __name__ == "__main__":')
            lines.append("    optimized_program = optimize()")
            lines.append('    print("Optimization complete!")')

        return "\n".join(lines)

    # =========================================================================
    # Export
    # =========================================================================

    async def export_to_dspy(
        self,
        template: Template,
        request: DSPyExportRequest,
    ) -> DSPyExportResult:
        """
        Export a Databit as DSPy code.

        Supports multiple output formats and example selection.
        """
        # Create program
        program = await self.create_program(
            template=template,
            max_examples=request.max_examples if request.include_examples else 0,
            min_effectiveness=request.min_effectiveness,
        )

        # Generate code
        signature_code = self.generate_signature_code(program.signature)
        program_code = self.generate_program_code(
            program,
            include_examples=request.include_examples,
            include_optimizer_setup=request.include_optimizer_setup,
        )

        # Generate examples JSON if requested
        examples_json = None
        if request.include_examples and program.training_examples:
            examples_data = [
                {
                    "example_id": ex.example_id,
                    "inputs": ex.inputs,
                    "outputs": ex.outputs,
                    "effectiveness_score": ex.effectiveness_score,
                }
                for ex in program.training_examples
            ]
            examples_json = json.dumps(examples_data, indent=2)

        # Validate the generated code (basic syntax check)
        is_valid = True
        validation_errors = []
        try:
            compile(program_code, "<string>", "exec")
        except SyntaxError as e:
            is_valid = False
            validation_errors.append(f"Syntax error: {e}")

        return DSPyExportResult(
            databit_id=template.id,
            databit_name=template.name,
            format=request.format,
            signature_code=signature_code,
            program_code=program_code,
            examples_json=examples_json,
            num_examples_included=len(program.training_examples),
            example_ids=program.example_ids,
            is_valid=is_valid,
            validation_errors=validation_errors,
        )

    # =========================================================================
    # Optimization Runs
    # =========================================================================

    async def launch_optimization_run(
        self,
        request: OptimizationRunCreate,
        template: Template,
        created_by: Optional[str] = None,
    ) -> DSPyOptimizationRun:
        """
        Launch a DSPy optimization run.

        In production, this would:
        1. Create an MLflow experiment/run
        2. Submit a Databricks job
        3. Track progress asynchronously

        For now, creates the run record and returns it.
        """
        # Create program
        program = await self.create_program(template)

        # Create run record
        run = DSPyOptimizationRun(
            run_id=uuid4(),
            program_name=program.program_name,
            databit_id=request.databit_id,
            signature_name=program.signature.signature_name,
            config=request.config,
            status=OptimizationRunStatus.PENDING,
            created_by=created_by,
        )

        # Store run (in production, would persist to Delta)
        self._optimization_runs[run.run_id] = run

        logger.info(
            f"Created optimization run {run.run_id} for databit {request.databit_id}"
        )

        return run

    async def get_run_status(self, run_id: UUID) -> Optional[DSPyOptimizationRun]:
        """Get the current status of an optimization run."""
        return self._optimization_runs.get(run_id)

    async def cancel_run(self, run_id: UUID) -> bool:
        """Cancel a running optimization."""
        run = self._optimization_runs.get(run_id)
        if not run:
            return False

        if run.status in (OptimizationRunStatus.PENDING, OptimizationRunStatus.RUNNING):
            run.status = OptimizationRunStatus.CANCELLED
            run.completed_at = datetime.utcnow()
            return True

        return False

    async def get_run_results(
        self, run_id: UUID
    ) -> Optional[list[OptimizationTrialResult]]:
        """Get trial results for a completed optimization run."""
        run = self._optimization_runs.get(run_id)
        if not run:
            return None
        return run.trial_results

    def to_response(self, run: DSPyOptimizationRun) -> OptimizationRunResponse:
        """Convert run to API response."""
        return OptimizationRunResponse(
            run_id=run.run_id,
            mlflow_run_id=run.mlflow_run_id,
            status=run.status,
            databit_id=run.databit_id,
            program_name=run.program_name,
            trials_completed=len(run.trial_results),
            trials_total=run.config.num_trials,
            current_best_score=run.best_score,
            started_at=run.started_at,
            estimated_completion=(
                run.started_at + timedelta(minutes=run.config.max_runtime_minutes)
                if run.started_at
                else None
            ),
            best_score=run.best_score,
            top_example_ids=run.top_example_ids,
        )

    # =========================================================================
    # Feedback Loop
    # =========================================================================

    async def sync_optimization_results(
        self,
        run_id: UUID,
    ) -> dict[str, Any]:
        """
        Sync optimization results back to Example Store.

        Updates effectiveness scores based on which examples
        performed well during optimization.
        """
        run = self._optimization_runs.get(run_id)
        if not run or run.status != OptimizationRunStatus.COMPLETED:
            return {"synced": False, "reason": "Run not found or not completed"}

        # Track which examples were used in successful trials
        example_success_counts: dict[str, int] = {}
        example_total_counts: dict[str, int] = {}

        for trial in run.trial_results:
            for ex_id in trial.examples_used:
                example_total_counts[ex_id] = example_total_counts.get(ex_id, 0) + 1
                if trial.score > 0.5:  # Consider it a success
                    example_success_counts[ex_id] = (
                        example_success_counts.get(ex_id, 0) + 1
                    )

        # Update effectiveness scores in Example Store
        updated_count = 0
        for ex_id, total in example_total_counts.items():
            success = example_success_counts.get(ex_id, 0)
            if total > 0:
                # Update via Example Store service
                await self.example_store.track_usage(
                    example_id=ex_id,
                    was_successful=(success / total) > 0.5,
                )
                updated_count += 1

        return {
            "synced": True,
            "run_id": str(run_id),
            "examples_updated": updated_count,
            "best_score": run.best_score,
            "top_examples": run.top_example_ids,
        }

    async def update_example_effectiveness_from_run(
        self,
        run: DSPyOptimizationRun,
    ) -> int:
        """
        Update Example Store effectiveness scores based on optimization results.

        Returns the number of examples updated.
        """
        # Group trial results by example
        example_scores: dict[str, list[float]] = {}

        for trial in run.trial_results:
            for ex_id in trial.examples_used:
                if ex_id not in example_scores:
                    example_scores[ex_id] = []
                example_scores[ex_id].append(trial.score)

        # Update each example's effectiveness
        updated = 0
        for ex_id, scores in example_scores.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                was_successful = avg_score > 0.5

                # Track usage with outcome
                await self.example_store.track_usage(
                    example_id=ex_id,
                    was_successful=was_successful,
                )
                updated += 1

        return updated

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _to_class_name(self, name: str) -> str:
        """Convert a template name to a valid Python class name."""
        # Remove special characters, capitalize words
        words = re.sub(r"[^a-zA-Z0-9\s]", "", name).split()
        return "".join(word.capitalize() for word in words)

    def _to_python_identifier(self, name: str) -> str:
        """Convert a field name to a valid Python identifier."""
        # Replace spaces and special chars with underscores
        identifier = re.sub(r"[^a-zA-Z0-9]", "_", name.lower())
        # Ensure it doesn't start with a number
        if identifier and identifier[0].isdigit():
            identifier = f"field_{identifier}"
        return identifier

    def _map_type(self, type_str: str) -> str:
        """Map schema types to Python type hints."""
        type_map = {
            "string": "str",
            "text": "str",
            "integer": "int",
            "number": "float",
            "float": "float",
            "boolean": "bool",
            "array": "list",
            "object": "dict",
            "json": "dict",
        }
        return type_map.get(type_str.lower(), "str")

    # =========================================================================
    # Example Selection for Optimization
    # =========================================================================

    async def get_examples_for_optimizer(
        self,
        databit_id: str,
        max_examples: int = 50,
        strategy: str = "balanced",
    ) -> list[DSPyExample]:
        """
        Get examples optimized for DSPy training.

        Strategies:
        - "top": Get highest effectiveness examples
        - "diverse": Get examples across difficulty levels
        - "balanced": Mix of top performers and diverse examples
        """
        examples = []

        if strategy == "top":
            # Get top performers only
            top = await self.example_store.get_top_examples(
                databit_id=databit_id,
                k=max_examples,
            )
            examples = top

        elif strategy == "diverse":
            # Get examples across difficulty levels
            for difficulty in ["easy", "medium", "hard"]:
                difficulty_examples = await self.example_store.list_examples(
                    databit_id=databit_id,
                    difficulty=difficulty,
                    page_size=max_examples // 3,
                )
                examples.extend(difficulty_examples.examples)

        else:  # balanced
            # Half top performers, half diverse
            top = await self.example_store.get_top_examples(
                databit_id=databit_id,
                k=max_examples // 2,
            )
            examples.extend(top)

            # Add diverse examples not already included
            top_ids = {ex.example_id for ex in top}
            for difficulty in ["easy", "medium", "hard"]:
                difficulty_examples = await self.example_store.list_examples(
                    databit_id=databit_id,
                    difficulty=difficulty,
                    page_size=max_examples // 6,
                )
                for ex in difficulty_examples.examples:
                    if ex.example_id not in top_ids:
                        examples.append(ex)

        # Convert to DSPy format
        return [
            DSPyExample(
                inputs=ex.input,
                outputs=ex.expected_output,
                example_id=ex.example_id,
                effectiveness_score=ex.effectiveness_score,
            )
            for ex in examples[:max_examples]
        ]
