"""
Join inference service for multi-source Sheets.

Provides join key suggestion (column name matching + type compatibility + value overlap)
and join preview (SQL generation + execution + match stats).
"""
import logging
import re
import time
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import get_settings
from app.core.databricks import get_workspace_client
from app.models.join_config import (
    DataSourceConfig,
    JoinConfig,
    JoinKeySuggestion,
    MatchStats,
)

logger = logging.getLogger(__name__)

# Column name patterns that suggest join key candidates
_ID_SUFFIXES = {"_id", "_key", "_code", "_ref", "_num", "_no"}
_TIMESTAMP_PATTERNS = {"timestamp", "created_at", "updated_at", "event_time", "date"}

# Type compatibility groups — types within the same group can potentially join
_TYPE_COMPAT = {
    "STRING": "string",
    "VARCHAR": "string",
    "CHAR": "string",
    "INT": "numeric",
    "BIGINT": "numeric",
    "SMALLINT": "numeric",
    "TINYINT": "numeric",
    "LONG": "numeric",
    "SHORT": "numeric",
    "FLOAT": "float",
    "DOUBLE": "float",
    "DECIMAL": "float",
    "TIMESTAMP": "temporal",
    "DATE": "temporal",
    "BOOLEAN": "boolean",
}


def _type_group(type_text: str) -> str:
    """Map a Databricks type string to a compatibility group."""
    upper = type_text.upper().split("(")[0].strip()
    return _TYPE_COMPAT.get(upper, "other")


def _types_compatible(type_a: str, type_b: str) -> bool:
    """Check if two column types are compatible for joining."""
    ga, gb = _type_group(type_a), _type_group(type_b)
    if ga == gb:
        return True
    # String can join with anything (implicit cast)
    if "string" in (ga, gb):
        return True
    # Numeric and float are close enough
    if {ga, gb} <= {"numeric", "float"}:
        return True
    return False


def _base_name(col: str) -> str:
    """Strip common suffixes to get the semantic base name."""
    lower = col.lower()
    for suffix in _ID_SUFFIXES:
        if lower.endswith(suffix):
            return lower[: -len(suffix)]
    return lower


def _has_id_suffix(col: str) -> bool:
    lower = col.lower()
    return any(lower.endswith(s) for s in _ID_SUFFIXES)


# Safe column/table name pattern
_SAFE_IDENTIFIER = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def _validate_identifier(name: str) -> str:
    """Validate and return a safe SQL identifier, or raise ValueError."""
    if not _SAFE_IDENTIFIER.match(name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return name


class JoinService:
    """Service for multi-source join inference and preview."""

    def __init__(self):
        self.client = get_workspace_client()
        self.settings = get_settings()
        if self.settings.use_serverless_sql:
            self.warehouse_id = None
        else:
            self.warehouse_id = self.settings.databricks_warehouse_id

    # ------------------------------------------------------------------
    # Column metadata
    # ------------------------------------------------------------------

    def get_table_columns_with_types(self, table_path: str) -> List[Dict[str, str]]:
        """
        Return column metadata for a UC table.

        Returns:
            List of dicts with keys: name, type_text, comment
        """
        parts = table_path.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid table path: {table_path}")

        table_info = self.client.tables.get(table_path)
        result = []
        if table_info.columns:
            for col in table_info.columns:
                result.append({
                    "name": col.name,
                    "type_text": col.type_text or "STRING",
                    "comment": col.comment or "",
                })
        return result

    # ------------------------------------------------------------------
    # Join key suggestion
    # ------------------------------------------------------------------

    def suggest_join_keys(
        self,
        source_table: str,
        target_table: str,
        sample_size: int = 100,
    ) -> List[JoinKeySuggestion]:
        """
        Suggest join keys between two tables using layered scoring.

        Layers:
          1. Exact column name match           → 0.95
          2. Suffix match (same base + _id)    → 0.85
          3. Fuzzy name match (ratio > 0.75)   → 0.60
          4. Type filter (incompatible → skip)
          5. Value overlap (top-5 candidates)   → blended
          6. Domain pattern bonus (_id, _key)   → +0.05
        """
        _validate_identifier(source_table)
        _validate_identifier(target_table)

        source_cols = self.get_table_columns_with_types(source_table)
        target_cols = self.get_table_columns_with_types(target_table)

        if not source_cols or not target_cols:
            return []

        candidates: List[Tuple[str, str, float, str]] = []  # (src, tgt, score, reason)

        for sc in source_cols:
            for tc in target_cols:
                sn, tn = sc["name"], tc["name"]
                st, tt = sc["type_text"], tc["type_text"]

                # Type filter — skip incompatible types
                if not _types_compatible(st, tt):
                    continue

                score = 0.0
                reason = ""

                # Layer 1: Exact name match
                if sn.lower() == tn.lower():
                    score = 0.95
                    reason = f"Exact column name match: {sn}"

                # Layer 2: Same base name + both have ID suffixes
                elif _has_id_suffix(sn) and _has_id_suffix(tn):
                    sb, tb = _base_name(sn), _base_name(tn)
                    if sb == tb:
                        score = 0.85
                        reason = f"Same base name '{sb}' with ID suffixes"
                    else:
                        ratio = SequenceMatcher(None, sb, tb).ratio()
                        if ratio > 0.75:
                            score = 0.70
                            reason = f"Similar base names: '{sb}' ~ '{tb}' ({ratio:.0%})"

                # Layer 3: Fuzzy name match
                else:
                    ratio = SequenceMatcher(None, sn.lower(), tn.lower()).ratio()
                    if ratio > 0.75:
                        score = 0.60
                        reason = f"Fuzzy name match ({ratio:.0%})"

                if score > 0:
                    # Layer 6: Domain pattern bonus
                    if _has_id_suffix(sn) or _has_id_suffix(tn):
                        score = min(score + 0.05, 1.0)
                        reason += " [ID pattern bonus]"

                    candidates.append((sn, tn, score, reason))

        # Sort by score descending
        candidates.sort(key=lambda c: c[2], reverse=True)

        # Layer 5: Value overlap for top-5 candidates
        top_candidates = candidates[:5]
        enriched: List[JoinKeySuggestion] = []

        for src_col, tgt_col, name_score, reason in top_candidates:
            overlap_ratio = self._compute_value_overlap(
                source_table, src_col, target_table, tgt_col, sample_size
            )

            if overlap_ratio is not None:
                # Blend: name_score * 0.6 + overlap * 0.4
                final_score = round(name_score * 0.6 + overlap_ratio * 0.4, 3)
                reason += f" | value overlap: {overlap_ratio:.0%}"
            else:
                final_score = round(name_score, 3)

            enriched.append(JoinKeySuggestion(
                source_column=src_col,
                target_column=tgt_col,
                confidence=final_score,
                reason=reason,
                value_overlap_ratio=overlap_ratio,
            ))

        # Add remaining candidates without value overlap
        for src_col, tgt_col, score, reason in candidates[5:]:
            enriched.append(JoinKeySuggestion(
                source_column=src_col,
                target_column=tgt_col,
                confidence=round(score, 3),
                reason=reason,
                value_overlap_ratio=None,
            ))

        # Final sort by confidence descending
        enriched.sort(key=lambda s: s.confidence, reverse=True)
        return enriched

    def _compute_value_overlap(
        self,
        source_table: str,
        source_col: str,
        target_table: str,
        target_col: str,
        sample_size: int,
    ) -> Optional[float]:
        """
        Compute the overlap ratio of distinct values between two columns.

        Samples N distinct values from each column, computes intersection / union.
        Returns None on failure.
        """
        _validate_identifier(source_col)
        _validate_identifier(target_col)

        sql = f"""
        WITH src AS (
            SELECT DISTINCT CAST({source_col} AS STRING) AS val
            FROM {source_table}
            WHERE {source_col} IS NOT NULL
            LIMIT {sample_size}
        ),
        tgt AS (
            SELECT DISTINCT CAST({target_col} AS STRING) AS val
            FROM {target_table}
            WHERE {target_col} IS NOT NULL
            LIMIT {sample_size}
        ),
        combined AS (
            SELECT val, 'src' AS origin FROM src
            UNION ALL
            SELECT val, 'tgt' AS origin FROM tgt
        )
        SELECT
            COUNT(DISTINCT CASE WHEN cnt > 1 THEN val END) AS overlap_count,
            COUNT(DISTINCT val) AS union_count
        FROM (
            SELECT val, COUNT(DISTINCT origin) AS cnt
            FROM combined
            GROUP BY val
        )
        """

        try:
            rows = self._execute_sql(sql, timeout_seconds=15)
            if rows:
                overlap = int(rows[0].get("overlap_count", 0))
                union = int(rows[0].get("union_count", 1))
                return round(overlap / max(union, 1), 3)
        except Exception as e:
            logger.warning(f"Value overlap query failed for {source_col}/{target_col}: {e}")

        return None

    # ------------------------------------------------------------------
    # JOIN SQL generation
    # ------------------------------------------------------------------

    def build_join_sql(
        self,
        sources: List[DataSourceConfig],
        join_config: JoinConfig,
        limit: Optional[int] = None,
        count_only: bool = False,
    ) -> str:
        """
        Generate a SELECT … JOIN … SQL statement.

        Column aliasing: {alias}__{column_name} to avoid collisions.
        """
        if len(sources) < 2:
            raise ValueError("At least 2 data sources required for a join")

        primary = sources[0]
        _validate_identifier(primary.source_table)
        p_alias = _validate_identifier(primary.alias or "t0")

        # Build column list
        select_parts: List[str] = []

        if count_only:
            select_parts.append("COUNT(*) AS total_count")
        else:
            for idx, src in enumerate(sources):
                alias = _validate_identifier(src.alias or f"t{idx}")
                cols = src.selected_columns
                if cols:
                    for c in cols:
                        _validate_identifier(c)
                        select_parts.append(f"{alias}.{c} AS {alias}__{c}")
                else:
                    select_parts.append(f"{alias}.*")

        select_clause = ", ".join(select_parts)

        # Build FROM + JOINs
        from_clause = f"{primary.source_table} AS {p_alias}"
        join_clauses: List[str] = []

        join_type_sql = {
            "inner": "INNER JOIN",
            "left": "LEFT OUTER JOIN",
            "full": "FULL OUTER JOIN",
        }.get(join_config.join_type, "INNER JOIN")

        for idx, src in enumerate(sources[1:], start=1):
            _validate_identifier(src.source_table)
            s_alias = _validate_identifier(src.alias or f"t{idx}")

            # Find key mappings for this source
            on_conditions: List[str] = []
            for km in join_config.key_mappings:
                src_a = _validate_identifier(km.source_alias)
                tgt_a = _validate_identifier(km.target_alias)
                src_c = _validate_identifier(km.source_column)
                tgt_c = _validate_identifier(km.target_column)

                if tgt_a == s_alias or src_a == s_alias:
                    on_conditions.append(f"{src_a}.{src_c} = {tgt_a}.{tgt_c}")

            # Time window condition
            tw = join_config.time_window
            if tw and tw.enabled and tw.column1 and tw.column2:
                _validate_identifier(tw.column1.split(".")[-1])
                _validate_identifier(tw.column2.split(".")[-1])
                on_conditions.append(
                    f"ABS(UNIX_TIMESTAMP({tw.column1}) - UNIX_TIMESTAMP({tw.column2})) <= {tw.window_minutes * 60}"
                )

            if not on_conditions:
                raise ValueError(f"No join conditions found for source {src.source_table}")

            join_clauses.append(
                f"{join_type_sql} {src.source_table} AS {s_alias} ON {' AND '.join(on_conditions)}"
            )

        sql = f"SELECT {select_clause}\nFROM {from_clause}\n" + "\n".join(join_clauses)

        if limit and not count_only:
            sql += f"\nLIMIT {limit}"

        return sql

    # ------------------------------------------------------------------
    # Join preview
    # ------------------------------------------------------------------

    def preview_join(
        self,
        sources: List[DataSourceConfig],
        join_config: JoinConfig,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Execute a JOIN and return preview rows + match statistics.
        """
        # Preview rows
        preview_sql = self.build_join_sql(sources, join_config, limit=limit)
        rows = self._execute_sql(preview_sql, timeout_seconds=30)

        # Match stats: count of primary rows vs joined rows
        primary = sources[0]
        _validate_identifier(primary.source_table)

        count_sql = self.build_join_sql(sources, join_config, count_only=True)
        count_rows = self._execute_sql(count_sql, timeout_seconds=30)
        joined_count = int(count_rows[0]["total_count"]) if count_rows else 0

        # Primary row count
        primary_count_sql = f"SELECT COUNT(*) AS cnt FROM {primary.source_table}"
        primary_rows = self._execute_sql(primary_count_sql, timeout_seconds=15)
        primary_count = int(primary_rows[0]["cnt"]) if primary_rows else 0

        match_stats = MatchStats(
            total_primary_rows=primary_count,
            matched_rows=joined_count,
            unmatched_rows=max(primary_count - joined_count, 0),
            match_percentage=round(joined_count / max(primary_count, 1) * 100, 1),
        )

        return {
            "rows": rows,
            "total_rows": joined_count,
            "match_stats": match_stats,
            "generated_sql": preview_sql,
        }

    # ------------------------------------------------------------------
    # SQL execution helper
    # ------------------------------------------------------------------

    def _execute_sql(self, sql: str, timeout_seconds: int = 30) -> List[Dict[str, Any]]:
        """Execute SQL and return rows as list of dicts."""
        from databricks.sdk.service.sql import StatementState

        execute_kwargs = {
            "statement": sql,
            "wait_timeout": "0s",
        }
        if self.warehouse_id:
            execute_kwargs["warehouse_id"] = self.warehouse_id

        result = self.client.statement_execution.execute_statement(**execute_kwargs)

        start = time.time()
        poll_interval = 0.1

        while True:
            elapsed = time.time() - start
            if elapsed > timeout_seconds:
                try:
                    self.client.statement_execution.cancel_execution(result.statement_id)
                except Exception:
                    pass
                raise TimeoutError(f"SQL query timed out after {timeout_seconds}s")

            status = self.client.statement_execution.get_statement(result.statement_id)

            if status.status.state == StatementState.SUCCEEDED:
                rows: List[Dict[str, Any]] = []
                if status.result and status.result.data_array:
                    col_names = []
                    if status.manifest and status.manifest.schema and status.manifest.schema.columns:
                        col_names = [c.name for c in status.manifest.schema.columns]

                    for data_row in status.result.data_array:
                        row_dict = {}
                        for idx, val in enumerate(data_row):
                            col_name = col_names[idx] if idx < len(col_names) else f"col_{idx}"
                            row_dict[col_name] = val
                        rows.append(row_dict)
                return rows

            if status.status.state in (StatementState.FAILED, StatementState.CANCELED):
                error_msg = status.status.error.message if status.status.error else "Unknown error"
                raise RuntimeError(f"SQL query failed: {error_msg}")

            time.sleep(poll_interval)
            poll_interval = min(poll_interval * 1.5, 1.0)
