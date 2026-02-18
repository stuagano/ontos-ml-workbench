"""Agent Retriever Service for few-shot example retrieval.

Provides examples to agents for dynamic prompt injection with
automatic usage tracking flowing back to the Example Store.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.models.agent_models import (
    AgentExampleRequest,
    AgentExampleResponse,
    AgentExampleResult,
    AgentOutcomeRequest,
    AgentOutcomeResponse,
)
from app.models.example_store import ExampleSearchQuery, ExampleUsageEvent
from app.services.example_store_service import get_example_store_service
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class AgentRetrieverService:
    """Service for agent example retrieval with tracking.

    Provides:
    - Example retrieval with semantic/metadata search
    - Multiple output formats (XML, markdown, JSON)
    - Automatic retrieval event logging
    - Outcome recording for effectiveness feedback
    """

    def __init__(self):
        self.settings = get_settings()
        self.sql = get_sql_service()
        self.example_service = get_example_store_service()

        # Lakebase table for real-time retrieval tracking
        self.retrieval_table = "agent_retrieval_events"

    def retrieve_examples(self, request: AgentExampleRequest) -> AgentExampleResponse:
        """Retrieve examples for agent prompt injection.

        Args:
            request: Agent retrieval request with query and filters.

        Returns:
            Response with examples and formatted prompt.
        """
        retrieval_id = f"ret_{uuid.uuid4().hex[:12]}"

        # Build search query from agent request
        search_query = ExampleSearchQuery(
            query_text=request.query,
            domain=request.domain,
            function_name=request.function_name,
            databit_id=request.databit_id,
            min_effectiveness_score=request.min_effectiveness,
            k=request.max_examples,
            sort_by="effectiveness_score",
            sort_desc=True,
        )

        # Search for relevant examples
        search_response = self.example_service.search_examples(search_query)

        # Convert to agent-friendly format
        examples = [
            AgentExampleResult(
                example_id=result.example.example_id,
                input=result.example.input,
                expected_output=result.example.expected_output,
                explanation=result.example.explanation,
                effectiveness_score=result.example.effectiveness_score,
            )
            for result in search_response.results
        ]

        # Format for prompt injection
        formatted_prompt = self._format_for_prompt(examples, request.format_style)

        # Log retrieval event
        example_ids = [ex.example_id for ex in examples]
        self._log_retrieval_event(
            retrieval_id=retrieval_id,
            agent_id=request.agent_id,
            session_id=str(request.session_id) if request.session_id else None,
            query_text=request.query,
            example_ids=example_ids,
        )

        return AgentExampleResponse(
            retrieval_id=retrieval_id,
            examples=examples,
            formatted_prompt=formatted_prompt,
            metadata={
                "search_type": search_response.search_type,
                "total_matches": search_response.total_matches,
                "format_style": request.format_style,
                "filters_applied": {
                    "domain": request.domain,
                    "function_name": request.function_name,
                    "databit_id": request.databit_id,
                    "min_effectiveness": request.min_effectiveness,
                },
            },
        )

    def _format_for_prompt(
        self,
        examples: list[AgentExampleResult],
        format_style: str,
    ) -> str:
        """Format examples for prompt injection.

        Args:
            examples: List of examples to format.
            format_style: Output format (xml, markdown, json).

        Returns:
            Formatted string ready for prompt injection.
        """
        if not examples:
            return ""

        if format_style == "xml":
            return self._format_xml(examples)
        elif format_style == "markdown":
            return self._format_markdown(examples)
        elif format_style == "json":
            return self._format_json(examples)
        else:
            # Default to XML
            return self._format_xml(examples)

    def _format_xml(self, examples: list[AgentExampleResult]) -> str:
        """Format examples as XML for prompt injection."""
        lines = ["<examples>"]

        for i, ex in enumerate(examples, 1):
            lines.append(f"  <example id=\"{i}\">")
            lines.append(f"    <input>{json.dumps(ex.input)}</input>")
            lines.append(f"    <output>{json.dumps(ex.expected_output)}</output>")
            if ex.explanation:
                lines.append(f"    <explanation>{ex.explanation}</explanation>")
            lines.append("  </example>")

        lines.append("</examples>")
        return "\n".join(lines)

    def _format_markdown(self, examples: list[AgentExampleResult]) -> str:
        """Format examples as markdown for prompt injection."""
        lines = ["## Examples", ""]

        for i, ex in enumerate(examples, 1):
            lines.append(f"### Example {i}")
            lines.append("")
            lines.append("**Input:**")
            lines.append(f"```json\n{json.dumps(ex.input, indent=2)}\n```")
            lines.append("")
            lines.append("**Expected Output:**")
            lines.append(f"```json\n{json.dumps(ex.expected_output, indent=2)}\n```")
            if ex.explanation:
                lines.append("")
                lines.append(f"**Explanation:** {ex.explanation}")
            lines.append("")

        return "\n".join(lines)

    def _format_json(self, examples: list[AgentExampleResult]) -> str:
        """Format examples as JSON for prompt injection."""
        data = {
            "examples": [
                {
                    "input": ex.input,
                    "output": ex.expected_output,
                    "explanation": ex.explanation,
                }
                for ex in examples
            ]
        }
        return json.dumps(data, indent=2)

    def _log_retrieval_event(
        self,
        retrieval_id: str,
        agent_id: str,
        session_id: str | None,
        query_text: str,
        example_ids: list[str],
    ) -> None:
        """Log a retrieval event for tracking.

        Attempts to log to Lakebase for real-time tracking.
        Falls back gracefully if Lakebase is unavailable.
        """
        try:
            # Try Lakebase first for real-time tracking
            self._log_to_lakebase(
                retrieval_id, agent_id, session_id, query_text, example_ids
            )
        except Exception as e:
            logger.warning(f"Failed to log to Lakebase, falling back to Delta: {e}")
            # Fall back to Delta Lake logging
            self._log_to_delta(
                retrieval_id, agent_id, session_id, query_text, example_ids
            )

    def _log_to_lakebase(
        self,
        retrieval_id: str,
        agent_id: str,
        session_id: str | None,
        query_text: str,
        example_ids: list[str],
    ) -> None:
        """Log retrieval event to Lakebase for real-time tracking."""
        # This would use a PostgreSQL connection to Lakebase
        # For now, log to Delta Lake as the primary store
        logger.info(f"Retrieval logged: {retrieval_id} by {agent_id}, {len(example_ids)} examples")
        self._log_to_delta(retrieval_id, agent_id, session_id, query_text, example_ids)

    def _log_to_delta(
        self,
        retrieval_id: str,
        agent_id: str,
        session_id: str | None,
        query_text: str,
        example_ids: list[str],
    ) -> None:
        """Log retrieval event to Delta Lake."""
        # Log to effectiveness table with 'retrieved' event type
        for example_id in example_ids:
            try:
                sql = f"""
                INSERT INTO {self.example_service.effectiveness_table} (
                    id, example_id, used_at, context, outcome
                ) VALUES (
                    '{uuid.uuid4()}',
                    '{example_id}',
                    '{datetime.utcnow().isoformat()}',
                    'agent_retrieval:{retrieval_id}:agent:{agent_id}',
                    'retrieved'
                )
                """
                self.sql.execute_update(sql)
            except Exception as e:
                logger.error(f"Failed to log retrieval for {example_id}: {e}")

    def record_outcome(self, request: AgentOutcomeRequest) -> AgentOutcomeResponse:
        """Record the outcome of using retrieved examples.

        Updates effectiveness tracking for the examples that were
        used in the retrieval.

        Args:
            request: Outcome request with retrieval_id and result.

        Returns:
            Response confirming recording.
        """
        # Find examples from this retrieval
        retrieval_context = f"agent_retrieval:{request.retrieval_id}:%"

        sql = f"""
        SELECT DISTINCT example_id
        FROM {self.example_service.effectiveness_table}
        WHERE context LIKE '{retrieval_context}'
        """

        try:
            results = self.sql.execute(sql)
            example_ids = [row["example_id"] for row in results]
        except Exception as e:
            logger.error(f"Failed to find retrieval {request.retrieval_id}: {e}")
            return AgentOutcomeResponse(
                retrieval_id=request.retrieval_id,
                recorded=False,
                examples_updated=0,
            )

        if not example_ids:
            logger.warning(f"No examples found for retrieval {request.retrieval_id}")
            return AgentOutcomeResponse(
                retrieval_id=request.retrieval_id,
                recorded=True,
                examples_updated=0,
            )

        # Map outcome to success/failure
        outcome_type = self._map_outcome(request.outcome)

        # Log outcome for each example
        updated_count = 0
        for example_id in example_ids:
            try:
                # Log the outcome event
                sql = f"""
                INSERT INTO {self.example_service.effectiveness_table} (
                    id, example_id, used_at, context, outcome
                ) VALUES (
                    '{uuid.uuid4()}',
                    '{example_id}',
                    '{datetime.utcnow().isoformat()}',
                    'outcome:{request.retrieval_id}:confidence:{request.confidence or "none"}',
                    '{outcome_type}'
                )
                """
                self.sql.execute_update(sql)

                # Update example usage count
                self.example_service.track_usage(
                    ExampleUsageEvent(
                        example_id=example_id,
                        used_at=datetime.utcnow(),
                        context=f"agent_outcome:{request.retrieval_id}",
                        outcome=outcome_type,
                    )
                )

                updated_count += 1
            except Exception as e:
                logger.error(f"Failed to record outcome for {example_id}: {e}")

        # Optionally update effectiveness scores based on outcomes
        self._update_effectiveness_scores(example_ids, request.outcome)

        return AgentOutcomeResponse(
            retrieval_id=request.retrieval_id,
            recorded=True,
            examples_updated=updated_count,
        )

    def _map_outcome(self, outcome: str) -> str:
        """Map agent outcome to effectiveness outcome type."""
        mapping = {
            "success": "success",
            "failure": "failure",
            "partial": "partial",
        }
        return mapping.get(outcome.lower(), "unknown")

    def _update_effectiveness_scores(
        self,
        example_ids: list[str],
        outcome: str,
    ) -> None:
        """Update effectiveness scores using ELO-style adjustments.

        ELO-style scoring adjusts based on expected vs actual performance:
        - High-rated example failing = big penalty (surprising failure)
        - Low-rated example succeeding = big boost (surprising success)
        - Results matching expectations = smaller adjustments

        K-factor controls adjustment magnitude (higher = more volatile).
        """
        # Map outcome to actual result (1.0 = success, 0.5 = partial, 0.0 = failure)
        actual_scores = {
            "success": 1.0,
            "partial": 0.5,
            "failure": 0.0,
        }
        actual = actual_scores.get(outcome.lower())

        if actual is None:
            return

        # K-factor: how much a single outcome can shift the score
        # Lower K = more stable scores, higher K = faster adaptation
        k_factor = 0.1

        for example_id in example_ids:
            try:
                example = self.example_service.get_example(example_id)
                if not example:
                    continue

                current_score = example.effectiveness_score or 0.5

                # ELO-style: adjustment = K * (actual - expected)
                # Expected performance IS the current effectiveness score
                expected = current_score
                adjustment = k_factor * (actual - expected)

                # Clamp to [0, 1]
                new_score = max(0.0, min(1.0, current_score + adjustment))

                self.example_service.update_effectiveness(example_id, new_score)

                logger.debug(
                    f"ELO update {example_id}: {current_score:.3f} -> {new_score:.3f} "
                    f"(expected={expected:.3f}, actual={actual}, adj={adjustment:+.3f})"
                )
            except Exception as e:
                logger.error(f"Failed to update effectiveness for {example_id}: {e}")


# Singleton instance
_agent_retriever_service: AgentRetrieverService | None = None


def get_agent_retriever_service() -> AgentRetrieverService:
    """Get or create Agent Retriever service singleton."""
    global _agent_retriever_service
    if _agent_retriever_service is None:
        _agent_retriever_service = AgentRetrieverService()
    return _agent_retriever_service
