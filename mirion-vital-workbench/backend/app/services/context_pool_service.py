"""
Context Pool Service

Manages the Lakebase-backed shared memory for multi-agent collaboration.
Provides sub-10ms reads for agent handoffs and real-time example retrieval.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID, uuid4

from app.models.dspy_models import (
    ActiveExampleCache,
    ContextPoolEntry,
    ContextPoolSession,
    EffectivenessEvent,
    HandoffContext,
)

logger = logging.getLogger(__name__)


class ContextPoolService:
    """
    Service for managing the Context Pool in Lakebase.

    The Context Pool enables:
    - Instant agent handoffs (<10ms)
    - Real-time example effectiveness tracking
    - Cached top examples for dynamic few-shot retrieval
    - Multi-agent knowledge sharing

    In production, this connects to Lakebase (Databricks OLTP).
    For development, uses in-memory storage.
    """

    def __init__(self, lakebase_connection: Optional[Any] = None):
        """
        Initialize Context Pool service.

        Args:
            lakebase_connection: Lakebase connection object (psycopg2/asyncpg)
        """
        self.conn = lakebase_connection
        self._use_memory = lakebase_connection is None

        # In-memory storage for development
        if self._use_memory:
            self._sessions: dict[UUID, ContextPoolSession] = {}
            self._entries: dict[UUID, list[ContextPoolEntry]] = {}
            self._active_examples: dict[str, ActiveExampleCache] = {}
            self._effectiveness_events: list[EffectivenessEvent] = []
            logger.info("ContextPoolService using in-memory storage")

    # =========================================================================
    # Session Management
    # =========================================================================

    async def create_session(
        self,
        customer_id: str,
        agent_id: str,
        agent_type: Optional[str] = None,
        handed_off_from: Optional[UUID] = None,
    ) -> ContextPoolSession:
        """
        Create a new agent session.

        Called when an agent starts interacting with a customer.
        """
        session = ContextPoolSession(
            session_id=uuid4(),
            customer_id=customer_id,
            agent_id=agent_id,
            agent_type=agent_type,
            status="active",
            handed_off_from=handed_off_from,
        )

        if self._use_memory:
            self._sessions[session.session_id] = session
            self._entries[session.session_id] = []
        else:
            await self._insert_session_db(session)

        logger.info(
            f"Created session {session.session_id} for customer {customer_id}"
        )
        return session

    async def get_session(self, session_id: UUID) -> Optional[ContextPoolSession]:
        """Get a session by ID."""
        if self._use_memory:
            return self._sessions.get(session_id)
        return await self._get_session_db(session_id)

    async def update_session_activity(self, session_id: UUID) -> bool:
        """Update the last activity timestamp for a session."""
        if self._use_memory:
            session = self._sessions.get(session_id)
            if session:
                session.last_activity_at = datetime.utcnow()
                return True
            return False
        return await self._update_session_activity_db(session_id)

    async def close_session(
        self,
        session_id: UUID,
        handoff_to: Optional[UUID] = None,
        handoff_reason: Optional[str] = None,
    ) -> bool:
        """
        Close a session, optionally handing off to another agent.
        """
        if self._use_memory:
            session = self._sessions.get(session_id)
            if not session:
                return False

            if handoff_to:
                session.status = "handed_off"
                session.handed_off_to = handoff_to
                session.handoff_reason = handoff_reason
            else:
                session.status = "closed"

            return True

        return await self._close_session_db(session_id, handoff_to, handoff_reason)

    # =========================================================================
    # Context Entries
    # =========================================================================

    async def add_entry(
        self,
        session_id: UUID,
        entry_type: str,
        content: dict[str, Any],
        examples_used: Optional[list[UUID]] = None,
        tool_name: Optional[str] = None,
        tool_result: Optional[dict[str, Any]] = None,
        tool_success: Optional[bool] = None,
    ) -> ContextPoolEntry:
        """
        Add an entry to a session's context.

        Entry types:
        - user_message: Customer input
        - agent_response: Agent output
        - tool_call: Tool invocation and result
        - decision: Key decision made
        - handoff_note: Note for receiving agent
        """
        # Get sequence number
        if self._use_memory:
            entries = self._entries.get(session_id, [])
            sequence_num = len(entries)
        else:
            sequence_num = await self._get_next_sequence_db(session_id)

        entry = ContextPoolEntry(
            entry_id=uuid4(),
            session_id=session_id,
            entry_type=entry_type,
            content=content,
            sequence_num=sequence_num,
            examples_used=examples_used or [],
            tool_name=tool_name,
            tool_result=tool_result,
            tool_success=tool_success,
        )

        if self._use_memory:
            if session_id not in self._entries:
                self._entries[session_id] = []
            self._entries[session_id].append(entry)
        else:
            await self._insert_entry_db(entry)

        # Update session activity
        await self.update_session_activity(session_id)

        return entry

    async def get_session_entries(
        self,
        session_id: UUID,
        limit: int = 100,
    ) -> list[ContextPoolEntry]:
        """Get entries for a session, ordered by sequence."""
        if self._use_memory:
            entries = self._entries.get(session_id, [])
            return sorted(entries, key=lambda e: e.sequence_num)[-limit:]
        return await self._get_entries_db(session_id, limit)

    # =========================================================================
    # Agent Handoff
    # =========================================================================

    async def get_handoff_context(
        self,
        customer_id: str,
        max_entries: int = 100,
    ) -> HandoffContext:
        """
        Get complete context for agent handoff.

        Retrieves all recent sessions and entries for a customer,
        designed for <10ms retrieval in Lakebase.
        """
        # Get active/recent sessions for customer
        sessions = await self._get_customer_sessions(customer_id)

        # Get entries for all sessions
        all_entries = []
        for session in sessions:
            entries = await self.get_session_entries(session.session_id)
            all_entries.extend(entries)

        # Sort by time and limit
        all_entries.sort(key=lambda e: e.created_at)
        all_entries = all_entries[-max_entries:]

        # Extract key decisions and unresolved issues
        key_decisions = []
        unresolved_issues = []
        for entry in all_entries:
            if entry.entry_type == "decision":
                key_decisions.append(entry.content.get("decision", ""))
            # Could analyze content for unresolved issues

        # Get recommended examples based on context
        # (In production, this would use semantic search on the context)
        recommended_examples = []

        return HandoffContext(
            customer_id=customer_id,
            sessions=sessions,
            entries=all_entries,
            key_decisions=key_decisions,
            unresolved_issues=unresolved_issues,
            recommended_examples=recommended_examples,
        )

    async def perform_handoff(
        self,
        from_session_id: UUID,
        to_agent_id: str,
        to_agent_type: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> ContextPoolSession:
        """
        Perform an agent handoff.

        Creates a new session for the receiving agent with full context.
        """
        # Get the source session
        from_session = await self.get_session(from_session_id)
        if not from_session:
            raise ValueError(f"Session {from_session_id} not found")

        # Create new session for receiving agent
        new_session = await self.create_session(
            customer_id=from_session.customer_id,
            agent_id=to_agent_id,
            agent_type=to_agent_type,
            handed_off_from=from_session_id,
        )

        # Close the source session with handoff
        await self.close_session(
            session_id=from_session_id,
            handoff_to=new_session.session_id,
            handoff_reason=reason,
        )

        # Add handoff note to new session
        await self.add_entry(
            session_id=new_session.session_id,
            entry_type="handoff_note",
            content={
                "from_agent_id": from_session.agent_id,
                "from_agent_type": from_session.agent_type,
                "reason": reason,
                "original_session_id": str(from_session_id),
            },
        )

        logger.info(
            f"Handoff from {from_session.agent_id} to {to_agent_id} "
            f"for customer {from_session.customer_id}"
        )

        return new_session

    # =========================================================================
    # Active Examples Cache
    # =========================================================================

    async def cache_example(
        self,
        example_id: str,
        domain: str,
        input_json: dict[str, Any],
        expected_output_json: dict[str, Any],
        explanation: Optional[str] = None,
        function_name: Optional[str] = None,
        databit_id: Optional[str] = None,
        effectiveness_score: float = 0.5,
        capability_tags: Optional[list[str]] = None,
        search_keys: Optional[list[str]] = None,
        ttl_hours: int = 24,
    ) -> ActiveExampleCache:
        """
        Cache an example in Lakebase for instant retrieval.

        Called when syncing from Delta Lake Example Store.
        """
        cache_entry = ActiveExampleCache(
            cache_id=uuid4(),
            example_id=example_id,
            domain=domain,
            function_name=function_name,
            databit_id=databit_id,
            input_json=input_json,
            expected_output_json=expected_output_json,
            explanation=explanation,
            effectiveness_score=effectiveness_score,
            capability_tags=capability_tags or [],
            search_keys=search_keys or [],
            expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        )

        if self._use_memory:
            # Use example_id + domain as key for uniqueness
            cache_key = f"{example_id}:{domain}"
            self._active_examples[cache_key] = cache_entry
        else:
            await self._upsert_active_example_db(cache_entry)

        return cache_entry

    async def get_top_examples_cached(
        self,
        domain: str,
        limit: int = 5,
        function_name: Optional[str] = None,
        databit_id: Optional[str] = None,
    ) -> list[ActiveExampleCache]:
        """
        Get top cached examples for a domain.

        Optimized for <10ms retrieval from Lakebase.
        """
        if self._use_memory:
            examples = [
                ex for ex in self._active_examples.values()
                if ex.domain == domain
                and (ex.expires_at is None or ex.expires_at > datetime.utcnow())
                and (function_name is None or ex.function_name == function_name)
                and (databit_id is None or ex.databit_id == databit_id)
            ]
            # Sort by priority and effectiveness
            examples.sort(
                key=lambda x: (x.cache_priority, x.effectiveness_score),
                reverse=True,
            )
            return examples[:limit]

        return await self._get_top_examples_db(
            domain, limit, function_name, databit_id
        )

    async def update_cached_effectiveness(
        self,
        example_id: str,
        outcome_positive: bool,
    ) -> bool:
        """
        Update effectiveness counters for a cached example.

        Called after each example usage.
        """
        if self._use_memory:
            for cache_entry in self._active_examples.values():
                if cache_entry.example_id == example_id:
                    cache_entry.usage_count += 1
                    if outcome_positive:
                        cache_entry.success_count += 1
                    cache_entry.effectiveness_score = (
                        cache_entry.success_count / cache_entry.usage_count
                    )
                    cache_entry.last_used_at = datetime.utcnow()
                    return True
            return False

        return await self._update_cached_effectiveness_db(example_id, outcome_positive)

    # =========================================================================
    # Effectiveness Tracking
    # =========================================================================

    async def record_effectiveness_event(
        self,
        example_id: str,
        agent_id: str,
        event_type: str,
        session_id: Optional[UUID] = None,
        outcome_positive: Optional[bool] = None,
        confidence_score: Optional[float] = None,
        feedback_type: Optional[str] = None,
        feedback_notes: Optional[str] = None,
        corrected_output: Optional[dict[str, Any]] = None,
    ) -> EffectivenessEvent:
        """
        Record an effectiveness event.

        Events are stored in Lakebase for real-time queries and
        periodically synced to Delta Lake for analytics.
        """
        event = EffectivenessEvent(
            event_id=uuid4(),
            example_id=example_id,
            agent_id=agent_id,
            session_id=session_id,
            event_type=event_type,
            outcome_positive=outcome_positive,
            confidence_score=confidence_score,
            feedback_type=feedback_type,
            feedback_notes=feedback_notes,
            corrected_output=corrected_output,
        )

        if self._use_memory:
            self._effectiveness_events.append(event)
        else:
            await self._insert_effectiveness_event_db(event)

        # Update cached effectiveness if outcome provided
        if outcome_positive is not None:
            await self.update_cached_effectiveness(example_id, outcome_positive)

        return event

    async def get_unsynced_events(
        self,
        limit: int = 1000,
    ) -> list[EffectivenessEvent]:
        """Get effectiveness events that haven't been synced to Delta Lake."""
        if self._use_memory:
            return [e for e in self._effectiveness_events if not e.synced_to_delta][:limit]
        return await self._get_unsynced_events_db(limit)

    async def mark_events_synced(
        self,
        event_ids: list[UUID],
    ) -> int:
        """Mark events as synced to Delta Lake."""
        if self._use_memory:
            count = 0
            for event in self._effectiveness_events:
                if event.event_id in event_ids:
                    event.synced_to_delta = True
                    event.synced_at = datetime.utcnow()
                    count += 1
            return count
        return await self._mark_events_synced_db(event_ids)

    # =========================================================================
    # Sync Operations (Delta Lake <-> Lakebase)
    # =========================================================================

    async def sync_examples_from_delta(
        self,
        examples: list[dict[str, Any]],
        domain: str,
    ) -> int:
        """
        Sync examples from Delta Lake Example Store to Lakebase cache.

        Called periodically to refresh the hot cache.
        """
        count = 0
        for ex in examples:
            await self.cache_example(
                example_id=ex["example_id"],
                domain=domain,
                input_json=ex["input"],
                expected_output_json=ex["expected_output"],
                explanation=ex.get("explanation"),
                function_name=ex.get("function_name"),
                databit_id=ex.get("databit_id"),
                effectiveness_score=ex.get("effectiveness_score", 0.5),
                capability_tags=ex.get("capability_tags", []),
                search_keys=ex.get("search_keys", []),
            )
            count += 1
        return count

    async def get_effectiveness_summary(
        self,
        example_id: str,
    ) -> dict[str, Any]:
        """Get effectiveness summary for an example from cached events."""
        if self._use_memory:
            events = [
                e for e in self._effectiveness_events
                if e.example_id == example_id
            ]
            total = len(events)
            successful = sum(1 for e in events if e.outcome_positive)
            return {
                "example_id": example_id,
                "total_events": total,
                "successful_events": successful,
                "effectiveness_rate": successful / total if total > 0 else 0,
                "feedback_count": sum(
                    1 for e in events if e.feedback_type is not None
                ),
            }
        return await self._get_effectiveness_summary_db(example_id)

    # =========================================================================
    # Private Database Methods (for Lakebase connection)
    # =========================================================================

    async def _get_customer_sessions(
        self,
        customer_id: str,
    ) -> list[ContextPoolSession]:
        """Get sessions for a customer."""
        if self._use_memory:
            return [
                s for s in self._sessions.values()
                if s.customer_id == customer_id
                and s.status in ("active", "paused", "handed_off")
            ]
        # In production: SELECT from context_pool_sessions
        return []

    async def _insert_session_db(self, session: ContextPoolSession):
        """Insert session into Lakebase."""
        # In production: INSERT INTO context_pool_sessions
        pass

    async def _get_session_db(self, session_id: UUID) -> Optional[ContextPoolSession]:
        """Get session from Lakebase."""
        # In production: SELECT from context_pool_sessions
        return None

    async def _update_session_activity_db(self, session_id: UUID) -> bool:
        """Update session activity in Lakebase."""
        # In production: UPDATE context_pool_sessions SET last_activity_at = NOW()
        return False

    async def _close_session_db(
        self,
        session_id: UUID,
        handoff_to: Optional[UUID],
        handoff_reason: Optional[str],
    ) -> bool:
        """Close session in Lakebase."""
        # In production: UPDATE context_pool_sessions SET status = ...
        return False

    async def _get_next_sequence_db(self, session_id: UUID) -> int:
        """Get next sequence number for a session."""
        # In production: SELECT MAX(sequence_num) + 1 FROM context_pool_entries
        return 0

    async def _insert_entry_db(self, entry: ContextPoolEntry):
        """Insert entry into Lakebase."""
        # In production: INSERT INTO context_pool_entries
        pass

    async def _get_entries_db(
        self,
        session_id: UUID,
        limit: int,
    ) -> list[ContextPoolEntry]:
        """Get entries from Lakebase."""
        # In production: SELECT from context_pool_entries ORDER BY sequence_num
        return []

    async def _upsert_active_example_db(self, cache_entry: ActiveExampleCache):
        """Upsert active example in Lakebase."""
        # In production: INSERT ... ON CONFLICT UPDATE
        pass

    async def _get_top_examples_db(
        self,
        domain: str,
        limit: int,
        function_name: Optional[str],
        databit_id: Optional[str],
    ) -> list[ActiveExampleCache]:
        """Get top examples from Lakebase."""
        # In production: SELECT from active_examples ORDER BY priority, effectiveness
        return []

    async def _update_cached_effectiveness_db(
        self,
        example_id: str,
        outcome_positive: bool,
    ) -> bool:
        """Update cached effectiveness in Lakebase."""
        # In production: Call record_example_usage() stored function
        return False

    async def _insert_effectiveness_event_db(self, event: EffectivenessEvent):
        """Insert effectiveness event into Lakebase."""
        # In production: INSERT INTO effectiveness_events
        pass

    async def _get_unsynced_events_db(
        self,
        limit: int,
    ) -> list[EffectivenessEvent]:
        """Get unsynced events from Lakebase."""
        # In production: SELECT from effectiveness_events WHERE synced_to_delta = FALSE
        return []

    async def _mark_events_synced_db(self, event_ids: list[UUID]) -> int:
        """Mark events as synced in Lakebase."""
        # In production: UPDATE effectiveness_events SET synced_to_delta = TRUE
        return 0

    async def _get_effectiveness_summary_db(
        self,
        example_id: str,
    ) -> dict[str, Any]:
        """Get effectiveness summary from Lakebase."""
        # In production: Aggregate query on effectiveness_events
        return {}
