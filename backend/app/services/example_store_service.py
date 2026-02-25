"""Example Store service for managing few-shot examples.

Provides CRUD operations, search, and effectiveness tracking for examples
used in dynamic few-shot learning and DSPy optimization.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.models.example_store import (
    DailyUsagePoint,
    DomainEffectiveness,
    EffectivenessDashboardStats,
    ExampleBatchCreate,
    ExampleBatchResponse,
    ExampleCreate,
    ExampleEffectivenessStats,
    ExampleListResponse,
    ExampleRankingItem,
    ExampleResponse,
    ExampleSearchQuery,
    ExampleSearchResponse,
    ExampleSearchResult,
    ExampleUpdate,
    ExampleUsageEvent,
    FunctionEffectiveness,
)
from app.services.embedding_service import get_embedding_service
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class ExampleStoreService:
    """Service for managing examples in the Example Store.

    Provides:
    - CRUD operations for examples
    - Semantic search via embeddings
    - Effectiveness tracking
    - Batch operations
    """

    def __init__(self):
        self.settings = get_settings()
        self.sql = get_sql_service()
        self.table = f"{self.settings.databricks_catalog}.{self.settings.databricks_schema}.example_store"
        self.effectiveness_table = f"{self.settings.databricks_catalog}.{self.settings.databricks_schema}.example_effectiveness_log"

    # -------------------------------------------------------------------------
    # CRUD Operations
    # -------------------------------------------------------------------------

    def create_example(
        self,
        example: ExampleCreate,
        created_by: str = "system",
        generate_embedding: bool = True,
    ) -> ExampleResponse:
        """Create a new example in the store.

        Args:
            example: Example data to create.
            created_by: User who created the example.
            generate_embedding: Whether to generate embedding for the example.

        Returns:
            Created example with ID.
        """
        example_id = str(uuid.uuid4())

        # Generate embedding if requested
        embedding = None
        embedding_model = None
        if generate_embedding:
            try:
                embedding_service = get_embedding_service()
                embedding = embedding_service.embed_example_input(example.input)
                embedding_model = embedding_service.model
            except Exception as e:
                logger.warning(f"Failed to generate embedding: {e}")

        # Prepare data for insert
        domain = example.domain.value if hasattr(example.domain, 'value') else str(example.domain)
        difficulty = example.difficulty.value if hasattr(example.difficulty, 'value') else str(example.difficulty)
        source = example.source.value if hasattr(example.source, 'value') else str(example.source)

        sql = f"""
        INSERT INTO {self.table} (
            example_id, version, input, expected_output, explanation,
            databit_id, domain, function_name, difficulty, capability_tags,
            search_keys, embedding, embedding_model, embedding_computed_at,
            quality_score, usage_count, effectiveness_score,
            source, attribution_notes, created_by, created_at, updated_at
        ) VALUES (
            '{example_id}', 1,
            '{self._escape_json(example.input)}',
            '{self._escape_json(example.expected_output)}',
            {self._sql_string(example.explanation)},
            {self._sql_string(example.databit_id)},
            '{domain}',
            {self._sql_string(example.function_name)},
            '{difficulty}',
            {self._sql_array(example.capability_tags)},
            {self._sql_array(example.search_keys)},
            {self._sql_array(embedding)},
            {self._sql_string(embedding_model)},
            {f"'{datetime.utcnow().isoformat()}'" if embedding else 'NULL'},
            NULL, 0, NULL,
            '{source}',
            {self._sql_string(example.attribution_notes)},
            '{created_by}',
            current_timestamp(),
            current_timestamp()
        )
        """

        self.sql.execute_update(sql)

        return self.get_example(example_id)

    def get_example(self, example_id: str) -> ExampleResponse | None:
        """Get an example by ID.

        Args:
            example_id: The example ID.

        Returns:
            Example if found, None otherwise.
        """
        sql = f"""
        SELECT e.*
        FROM {self.table} e
        WHERE e.example_id = '{example_id}'
        """

        results = self.sql.execute(sql)
        if not results:
            return None

        return self._row_to_response(results[0])

    def update_example(
        self,
        example_id: str,
        update: ExampleUpdate,
    ) -> ExampleResponse | None:
        """Update an existing example.

        Args:
            example_id: The example ID to update.
            update: Fields to update.

        Returns:
            Updated example if found, None otherwise.
        """
        # Build SET clause dynamically
        updates = []

        if update.input is not None:
            updates.append(f"input = '{self._escape_json(update.input)}'")
        if update.expected_output is not None:
            updates.append(f"expected_output = '{self._escape_json(update.expected_output)}'")
        if update.explanation is not None:
            updates.append(f"explanation = {self._sql_string(update.explanation)}")
        if update.databit_id is not None:
            updates.append(f"databit_id = {self._sql_string(update.databit_id)}")
        if update.domain is not None:
            domain = update.domain.value if hasattr(update.domain, 'value') else str(update.domain)
            updates.append(f"domain = '{domain}'")
        if update.function_name is not None:
            updates.append(f"function_name = {self._sql_string(update.function_name)}")
        if update.difficulty is not None:
            difficulty = update.difficulty.value if hasattr(update.difficulty, 'value') else str(update.difficulty)
            updates.append(f"difficulty = '{difficulty}'")
        if update.capability_tags is not None:
            updates.append(f"capability_tags = {self._sql_array(update.capability_tags)}")
        if update.search_keys is not None:
            updates.append(f"search_keys = {self._sql_array(update.search_keys)}")
        if update.source is not None:
            source = update.source.value if hasattr(update.source, 'value') else str(update.source)
            updates.append(f"source = '{source}'")
        if update.attribution_notes is not None:
            updates.append(f"attribution_notes = {self._sql_string(update.attribution_notes)}")
        if update.quality_score is not None:
            updates.append(f"quality_score = {update.quality_score}")

        if not updates:
            return self.get_example(example_id)

        updates.append("updated_at = current_timestamp()")

        sql = f"""
        UPDATE {self.table}
        SET {', '.join(updates)}
        WHERE example_id = '{example_id}'
        """

        rows_affected = self.sql.execute_update(sql)
        if rows_affected == 0:
            return None

        return self.get_example(example_id)

    def delete_example(self, example_id: str) -> bool:
        """Delete an example.

        Args:
            example_id: The example ID to delete.

        Returns:
            True if deleted, False if not found.
        """
        sql = f"DELETE FROM {self.table} WHERE example_id = '{example_id}'"
        rows_affected = self.sql.execute_update(sql)
        return rows_affected > 0

    def list_examples(
        self,
        databit_id: str | None = None,
        domain: str | None = None,
        function_name: str | None = None,
        min_quality_score: float | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ExampleListResponse:
        """List examples with optional filtering.

        Args:
            databit_id: Filter by associated databit/template.
            domain: Filter by domain.
            function_name: Filter by function name.
            min_quality_score: Minimum quality score threshold.
            page: Page number (1-indexed).
            page_size: Results per page.

        Returns:
            Paginated list of examples.
        """
        # Build WHERE clause
        conditions = []
        # NOTE: databit_id filtering removed - example_store schema doesn't have this column
        # if databit_id:
        #     conditions.append(f"e.databit_id = '{databit_id}'")
        if domain:
            conditions.append(f"e.domain = '{domain}'")
        if function_name:
            conditions.append(f"e.function_name = '{function_name}'")
        if min_quality_score is not None:
            conditions.append(f"e.quality_score >= {min_quality_score}")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Get total count
        count_sql = f"SELECT COUNT(*) as total FROM {self.table} e {where_clause}"
        count_result = self.sql.execute(count_sql)
        total = count_result[0]["total"] if count_result else 0

        # Get page of results
        offset = (page - 1) * page_size
        sql = f"""
        SELECT e.*
        FROM {self.table} e
        {where_clause}
        ORDER BY e.effectiveness_score DESC NULLS LAST, e.created_at DESC
        LIMIT {page_size} OFFSET {offset}
        """

        results = self.sql.execute(sql)
        examples = [self._row_to_response(row) for row in results]

        return ExampleListResponse(
            examples=examples,
            total=total,
            page=page,
            page_size=page_size,
        )

    # -------------------------------------------------------------------------
    # Search Operations
    # -------------------------------------------------------------------------

    def search_examples(self, query: ExampleSearchQuery) -> ExampleSearchResponse:
        """Search examples by text, embedding, or metadata filters.

        Args:
            query: Search parameters.

        Returns:
            Search results with similarity scores.
        """
        # Determine search type
        use_vector_search = query.query_text is not None or query.query_embedding is not None
        use_metadata_filter = any([
            query.databit_id,
            query.domain,
            query.function_name,
            query.difficulty,
            query.capability_tags,
            query.min_quality_score,
            query.min_effectiveness_score,
        ])

        if use_vector_search:
            # For now, fall back to metadata search with text matching
            # Full vector search requires Vector Search index setup
            return self._search_with_metadata(query)
        else:
            return self._search_with_metadata(query)

    def _search_with_metadata(self, query: ExampleSearchQuery) -> ExampleSearchResponse:
        """Search using metadata filters and SQL.

        TODO: Integrate with Databricks Vector Search when index is configured.
        """
        conditions = []

        # NOTE: databit_id filtering removed - example_store schema doesn't have this column
        # if query.databit_id:
        #     conditions.append(f"e.databit_id = '{query.databit_id}'")
        if query.domain:
            domain = query.domain.value if hasattr(query.domain, 'value') else str(query.domain)
            conditions.append(f"e.domain = '{domain}'")
        if query.function_name:
            conditions.append(f"e.function_name = '{query.function_name}'")
        if query.difficulty:
            difficulty = query.difficulty.value if hasattr(query.difficulty, 'value') else str(query.difficulty)
            conditions.append(f"e.difficulty = '{difficulty}'")
        if query.min_quality_score is not None:
            conditions.append(f"e.quality_score >= {query.min_quality_score}")
        if query.min_effectiveness_score is not None:
            conditions.append(f"e.effectiveness_score >= {query.min_effectiveness_score}")
        if query.capability_tags:
            # Match any of the tags
            tag_conditions = [f"array_contains(e.capability_tags, '{tag}')" for tag in query.capability_tags]
            conditions.append(f"({' OR '.join(tag_conditions)})")

        # Text search on input/output if query_text provided
        if query.query_text:
            # Simple text matching (full vector search would be better)
            escaped_text = query.query_text.replace("'", "''")
            conditions.append(
                f"(e.input LIKE '%{escaped_text}%' OR "
                f"e.expected_output LIKE '%{escaped_text}%' OR "
                f"e.explanation LIKE '%{escaped_text}%')"
            )

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Build ORDER BY
        order_field = query.sort_by
        order_dir = "DESC" if query.sort_desc else "ASC"

        sql = f"""
        SELECT e.*
        FROM {self.table} e
        {where_clause}
        ORDER BY e.{order_field} {order_dir} NULLS LAST
        LIMIT {query.k}
        """

        results = self.sql.execute(sql)

        search_results = [
            ExampleSearchResult(
                example=self._row_to_response(row),
                similarity_score=None,  # No vector similarity in metadata-only search
                match_type="metadata",
            )
            for row in results
        ]

        return ExampleSearchResponse(
            results=search_results,
            total_matches=len(search_results),
            query_embedding_generated=False,
            search_type="metadata",
        )

    # -------------------------------------------------------------------------
    # Effectiveness Tracking
    # -------------------------------------------------------------------------

    def track_usage(self, event: ExampleUsageEvent) -> None:
        """Record an example being used.

        Args:
            event: Usage event details.
        """
        # Log the usage event
        event_id = str(uuid.uuid4())
        sql = f"""
        INSERT INTO {self.effectiveness_table} (
            id, example_id, used_at, context, training_run_id, model_id, outcome
        ) VALUES (
            '{event_id}',
            '{event.example_id}',
            '{event.used_at.isoformat()}',
            {self._sql_string(event.context)},
            {self._sql_string(event.training_run_id)},
            {self._sql_string(event.model_id)},
            {self._sql_string(event.outcome)}
        )
        """
        self.sql.execute_update(sql)

        # Increment usage count
        update_sql = f"""
        UPDATE {self.table}
        SET usage_count = usage_count + 1
        WHERE example_id = '{event.example_id}'
        """
        self.sql.execute_update(update_sql)

    def update_effectiveness(
        self,
        example_id: str,
        effectiveness_score: float,
    ) -> None:
        """Update the effectiveness score for an example.

        Args:
            example_id: The example ID.
            effectiveness_score: New effectiveness score (0-1).
        """
        sql = f"""
        UPDATE {self.table}
        SET effectiveness_score = {effectiveness_score},
            updated_at = current_timestamp()
        WHERE example_id = '{example_id}'
        """
        self.sql.execute_update(sql)

    def get_effectiveness_stats(self, example_id: str) -> ExampleEffectivenessStats | None:
        """Get effectiveness statistics for an example.

        Args:
            example_id: The example ID.

        Returns:
            Effectiveness statistics if found.
        """
        # Get basic stats from example
        example = self.get_example(example_id)
        if not example:
            return None

        # Get outcome counts from log
        sql = f"""
        SELECT
            COUNT(*) as total_uses,
            SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failure_count,
            MAX(used_at) as last_used_at
        FROM {self.effectiveness_table}
        WHERE example_id = '{example_id}'
        """
        results = self.sql.execute(sql)
        stats = results[0] if results else {}

        total_uses = stats.get("total_uses", 0) or 0
        success_count = stats.get("success_count", 0) or 0
        failure_count = stats.get("failure_count", 0) or 0

        success_rate = success_count / total_uses if total_uses > 0 else None

        return ExampleEffectivenessStats(
            example_id=example_id,
            total_uses=total_uses,
            success_count=success_count,
            failure_count=failure_count,
            success_rate=success_rate,
            effectiveness_score=example.effectiveness_score,
            effectiveness_trend=None,  # Would need historical data to compute
            last_used_at=stats.get("last_used_at"),
        )

    def get_top_examples(
        self,
        databit_id: str | None = None,
        limit: int = 10,
    ) -> list[ExampleResponse]:
        """Get top examples by effectiveness score.

        Args:
            databit_id: Optional filter by databit.
            limit: Maximum number of examples to return.

        Returns:
            List of top examples.
        """
        # NOTE: databit_id filtering removed - example_store schema doesn't have this column
        where_clause = ""  # f"WHERE e.databit_id = '{databit_id}'" if databit_id else ""

        sql = f"""
        SELECT e.*
        FROM {self.table} e
        {where_clause}
        ORDER BY e.effectiveness_score DESC NULLS LAST
        LIMIT {limit}
        """

        results = self.sql.execute(sql)
        return [self._row_to_response(row) for row in results]

    def get_dashboard_stats(
        self,
        domain: str | None = None,
        function_name: str | None = None,
        period: str = "30d",
    ) -> EffectivenessDashboardStats:
        """Get aggregated dashboard statistics for effectiveness visualization.

        Args:
            domain: Optional filter by domain.
            function_name: Optional filter by function name.
            period: Time range for historical data (7d, 30d, 90d).

        Returns:
            Aggregated dashboard statistics.
        """
        period_days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)

        # Build filter conditions for example_store table
        conditions = []
        if domain:
            conditions.append(f"e.domain = '{domain}'")
        if function_name:
            conditions.append(f"e.function_name = '{function_name}'")
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # 1. Summary metrics from example_store
        summary_sql = f"""
        SELECT
            COUNT(*) as total_examples,
            SUM(CASE WHEN usage_count > 0 THEN 1 ELSE 0 END) as examples_with_usage,
            SUM(usage_count) as total_uses,
            AVG(effectiveness_score) as avg_effectiveness,
            SUM(CASE WHEN updated_at < DATE_SUB(current_date(), 30)
                AND usage_count > 0 THEN 1 ELSE 0 END) as stale_count
        FROM {self.table} e
        {where_clause}
        """
        summary_result = self.sql.execute(summary_sql)
        summary = summary_result[0] if summary_result else {}

        # 2. Success/failure from effectiveness log in period
        log_time_filter = f"used_at >= DATE_SUB(current_timestamp(), {period_days})"
        log_conditions = [log_time_filter]
        if domain or function_name:
            log_conditions.append(
                f"example_id IN (SELECT example_id FROM {self.table} e {where_clause})"
            )
        log_where = f"WHERE {' AND '.join(log_conditions)}"

        usage_sql = f"""
        SELECT
            COUNT(*) as total_events,
            SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
            SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failures
        FROM {self.effectiveness_table}
        {log_where}
        """
        usage_result = self.sql.execute(usage_sql)
        usage = usage_result[0] if usage_result else {}

        total_successes = usage.get("successes", 0) or 0
        total_failures = usage.get("failures", 0) or 0
        total_events = usage.get("total_events", 0) or 0
        overall_success_rate = (
            total_successes / total_events if total_events > 0 else None
        )

        # 3. Domain breakdown
        domain_sql = f"""
        SELECT
            e.domain,
            COUNT(*) as example_count,
            SUM(e.usage_count) as total_uses,
            AVG(e.effectiveness_score) as avg_effectiveness
        FROM {self.table} e
        {where_clause}
        GROUP BY e.domain
        ORDER BY avg_effectiveness DESC NULLS LAST
        """
        domain_results = self.sql.execute(domain_sql)
        domain_breakdown = [
            DomainEffectiveness(
                domain=row["domain"] or "unknown",
                example_count=row["example_count"] or 0,
                total_uses=row["total_uses"] or 0,
                success_rate=None,  # Would need log join for accurate rate
                avg_effectiveness=row["avg_effectiveness"],
            )
            for row in domain_results
        ]

        # 4. Function breakdown
        func_where = where_clause.replace("WHERE", "AND") if where_clause else ""
        function_sql = f"""
        SELECT
            e.function_name,
            COUNT(*) as example_count,
            SUM(e.usage_count) as total_uses,
            AVG(e.effectiveness_score) as avg_effectiveness
        FROM {self.table} e
        WHERE e.function_name IS NOT NULL
        {func_where}
        GROUP BY e.function_name
        ORDER BY avg_effectiveness DESC NULLS LAST
        LIMIT 10
        """
        function_results = self.sql.execute(function_sql)
        function_breakdown = [
            FunctionEffectiveness(
                function_name=row["function_name"],
                example_count=row["example_count"] or 0,
                total_uses=row["total_uses"] or 0,
                success_rate=None,
                avg_effectiveness=row["avg_effectiveness"],
            )
            for row in function_results
        ]

        # 5. Daily usage time series
        daily_sql = f"""
        SELECT
            DATE(used_at) as date,
            COUNT(*) as uses,
            SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
            SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failures
        FROM {self.effectiveness_table}
        {log_where}
        GROUP BY DATE(used_at)
        ORDER BY date ASC
        """
        daily_results = self.sql.execute(daily_sql)
        daily_usage = [
            DailyUsagePoint(
                date=str(row["date"]),
                uses=row["uses"] or 0,
                successes=row["successes"] or 0,
                failures=row["failures"] or 0,
            )
            for row in daily_results
        ]

        # 6. Top examples by effectiveness
        top_sql = f"""
        SELECT example_id, domain, function_name, explanation,
               effectiveness_score, usage_count
        FROM {self.table} e
        {where_clause}
        ORDER BY effectiveness_score DESC NULLS LAST, usage_count DESC
        LIMIT 5
        """
        top_results = self.sql.execute(top_sql)
        top_examples = [
            ExampleRankingItem(
                example_id=row["example_id"],
                domain=row["domain"] or "unknown",
                function_name=row.get("function_name"),
                explanation=row.get("explanation"),
                effectiveness_score=row.get("effectiveness_score"),
                usage_count=row.get("usage_count", 0) or 0,
                success_rate=None,
            )
            for row in top_results
        ]

        # 7. Bottom examples (pruning candidates)
        bottom_where = (
            f"WHERE e.usage_count > 0 {where_clause.replace('WHERE', 'AND')}"
            if where_clause
            else "WHERE e.usage_count > 0"
        )
        bottom_sql = f"""
        SELECT example_id, domain, function_name, explanation,
               effectiveness_score, usage_count
        FROM {self.table} e
        {bottom_where}
        ORDER BY effectiveness_score ASC NULLS LAST
        LIMIT 5
        """
        bottom_results = self.sql.execute(bottom_sql)
        bottom_examples = [
            ExampleRankingItem(
                example_id=row["example_id"],
                domain=row["domain"] or "unknown",
                function_name=row.get("function_name"),
                explanation=row.get("explanation"),
                effectiveness_score=row.get("effectiveness_score"),
                usage_count=row.get("usage_count", 0) or 0,
                success_rate=None,
            )
            for row in bottom_results
        ]

        return EffectivenessDashboardStats(
            total_examples=summary.get("total_examples", 0) or 0,
            examples_with_usage=summary.get("examples_with_usage", 0) or 0,
            total_uses=summary.get("total_uses", 0) or 0,
            total_successes=total_successes,
            total_failures=total_failures,
            overall_success_rate=overall_success_rate,
            avg_effectiveness_score=summary.get("avg_effectiveness"),
            period_days=period_days,
            domain_breakdown=domain_breakdown,
            function_breakdown=function_breakdown,
            daily_usage=daily_usage,
            top_examples=top_examples,
            bottom_examples=bottom_examples,
            stale_examples_count=summary.get("stale_count", 0) or 0,
        )

    # -------------------------------------------------------------------------
    # Batch Operations
    # -------------------------------------------------------------------------

    def batch_create(
        self,
        batch: ExampleBatchCreate,
        created_by: str = "system",
    ) -> ExampleBatchResponse:
        """Create multiple examples in batch.

        Args:
            batch: Batch of examples to create.
            created_by: User creating the examples.

        Returns:
            Batch operation results.
        """
        created_ids = []
        errors = []

        for i, example in enumerate(batch.examples):
            try:
                result = self.create_example(
                    example,
                    created_by=created_by,
                    generate_embedding=batch.generate_embeddings,
                )
                created_ids.append(result.id)
            except Exception as e:
                errors.append({"index": str(i), "error": str(e)})
                logger.error(f"Failed to create example {i}: {e}")

        return ExampleBatchResponse(
            created_count=len(created_ids),
            failed_count=len(errors),
            created_ids=created_ids,
            errors=errors if errors else None,
        )

    def regenerate_embeddings(
        self,
        example_ids: list[str] | None = None,
        force: bool = False,
    ) -> dict[str, int]:
        """Regenerate embeddings for examples.

        Args:
            example_ids: Specific IDs to process. If None, processes all.
            force: Regenerate even if embedding exists.

        Returns:
            Dict with processed, skipped, and error counts.
        """
        # Build query
        conditions = []
        if example_ids:
            ids_str = ", ".join(f"'{id}'" for id in example_ids)
            conditions.append(f"example_id IN ({ids_str})")
        if not force:
            conditions.append("embedding IS NULL")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Get examples to process
        sql = f"SELECT example_id, input FROM {self.table} {where_clause}"
        results = self.sql.execute(sql)

        embedding_service = get_embedding_service()
        processed = 0
        errors = 0

        for row in results:
            try:
                input_data = json.loads(row["input"]) if isinstance(row["input"], str) else row["input"]
                embedding = embedding_service.embed_example_input(input_data)

                update_sql = f"""
                UPDATE {self.table}
                SET embedding = {self._sql_array(embedding)},
                    embedding_model = '{embedding_service.model}',
                    embedding_computed_at = current_timestamp()
                WHERE example_id = '{row["example_id"]}'
                """
                self.sql.execute_update(update_sql)
                processed += 1
            except Exception as e:
                logger.error(f"Failed to generate embedding for {row['example_id']}: {e}")
                errors += 1

        return {
            "processed": processed,
            "skipped": len(results) - processed - errors if example_ids else 0,
            "errors": errors,
        }

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _row_to_response(self, row: dict[str, Any]) -> ExampleResponse:
        """Convert a database row to ExampleResponse."""
        # Parse JSON fields
        input_data = json.loads(row["input"]) if isinstance(row["input"], str) else row["input"]
        output_data = json.loads(row["expected_output"]) if isinstance(row["expected_output"], str) else row["expected_output"]

        return ExampleResponse(
            example_id=row["example_id"],
            version=row.get("version", 1),
            input=input_data,
            expected_output=output_data,
            explanation=row.get("explanation"),
            databit_id=row.get("databit_id"),
            databit_name=row.get("databit_name"),
            domain=row.get("domain", "general"),
            function_name=row.get("function_name"),
            difficulty=row.get("difficulty", "medium"),
            capability_tags=row.get("capability_tags"),
            search_keys=row.get("search_keys"),
            has_embedding=row.get("embedding") is not None,
            quality_score=row.get("quality_score"),
            usage_count=row.get("usage_count", 0),
            effectiveness_score=row.get("effectiveness_score"),
            source=row.get("source", "human_authored"),
            attribution_notes=row.get("attribution_notes"),
            created_by=row.get("created_by"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    def _escape_json(self, data: Any) -> str:
        """Escape JSON for SQL insertion."""
        json_str = json.dumps(data)
        return json_str.replace("'", "''")

    def _sql_string(self, value: str | None) -> str:
        """Format string for SQL (NULL or quoted)."""
        if value is None:
            return "NULL"
        escaped = value.replace("'", "''")
        return f"'{escaped}'"

    def _sql_array(self, values: list | None) -> str:
        """Format array for SQL (NULL or ARRAY literal)."""
        if values is None:
            return "NULL"
        if not values:
            return "ARRAY()"
        if isinstance(values[0], str):
            items = ", ".join(f"'{v}'" for v in values)
        else:
            items = ", ".join(str(v) for v in values)
        return f"ARRAY({items})"


# Singleton instance
_example_store_service: ExampleStoreService | None = None


def get_example_store_service() -> ExampleStoreService:
    """Get or create Example Store service singleton."""
    global _example_store_service
    if _example_store_service is None:
        _example_store_service = ExampleStoreService()
    return _example_store_service
