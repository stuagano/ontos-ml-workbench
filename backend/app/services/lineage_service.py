"""Lineage service - materializes implicit pipeline lineage as typed edges."""

import logging
import time
import uuid

from app.core.config import get_settings
from app.models.governance import (
    LINEAGE_INVERSE_MAP,
    LineageEdge,
    LineageGraph,
    LineageNode,
    MaterializeResult,
)
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)

SYSTEM_LINEAGE_MODEL_NAME = "_system_lineage"


def _esc(value: str) -> str:
    """Escape single quotes for SQL."""
    return value.replace("'", "''")


class LineageService:
    """Materializes implicit lineage (Sheet -> Template -> Training Sheet -> Model -> Endpoint)
    as typed edges in the semantic_links table."""

    def __init__(self):
        self.settings = get_settings()
        self.sql = get_sql_service()

    def _table(self, name: str) -> str:
        return self.settings.get_table(name)

    # ========================================================================
    # System lineage model
    # ========================================================================

    def _get_or_create_lineage_model(self) -> str:
        """Find or create the _system_lineage semantic model. Return its id."""
        rows = self.sql.execute(
            f"SELECT id FROM {self._table('semantic_models')} "
            f"WHERE name = '{SYSTEM_LINEAGE_MODEL_NAME}'"
        )
        if rows:
            return rows[0]["id"]

        model_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_models')}
            (id, name, description, domain_id, owner_email, status, version,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{model_id}', '{SYSTEM_LINEAGE_MODEL_NAME}',
                'Auto-managed lineage graph for pipeline traceability',
                NULL, NULL, 'published', '1.0.0',
                current_timestamp(), 'system',
                current_timestamp(), 'system'
            )
        """)
        logger.info("Created _system_lineage semantic model: %s", model_id)
        return model_id

    # ========================================================================
    # Edge helpers
    # ========================================================================

    def _insert_edge(
        self,
        model_id: str,
        source_type: str,
        source_id: str,
        target_type: str,
        target_id: str,
        link_type: str,
        target_name: str | None = None,
    ) -> str:
        """Insert a single lineage edge into semantic_links. Return the edge id."""
        edge_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_links')}
            (id, model_id, source_type, source_id, target_type, target_id, target_name,
             link_type, confidence, notes, created_at, created_by)
            VALUES (
                '{edge_id}', '{model_id}',
                '{_esc(source_type)}', '{_esc(source_id)}',
                '{_esc(target_type)}',
                '{_esc(target_id)}',
                {f"'{_esc(target_name)}'" if target_name else 'NULL'},
                '{_esc(link_type)}',
                1.0,
                'auto-materialized lineage',
                current_timestamp(), 'system'
            )
        """)
        return edge_id

    def _insert_edge_with_inverse(
        self,
        model_id: str,
        source_type: str,
        source_id: str,
        target_type: str,
        target_id: str,
        link_type: str,
        target_name: str | None = None,
        source_name: str | None = None,
    ) -> tuple[str, str | None]:
        """Insert a forward edge and its inverse. Return (forward_id, inverse_id)."""
        forward_id = self._insert_edge(
            model_id, source_type, source_id, target_type, target_id,
            link_type, target_name=target_name,
        )
        inverse_type = LINEAGE_INVERSE_MAP.get(link_type)
        inverse_id = None
        if inverse_type:
            inverse_id = self._insert_edge(
                model_id, target_type, target_id, source_type, source_id,
                inverse_type, target_name=source_name,
            )
        return forward_id, inverse_id

    def _delete_edges_for_model(self, model_id: str) -> int:
        """Delete all lineage edges for a given model_id. Return deleted count."""
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}'"
        )
        count = rows[0]["cnt"] if rows else 0
        if count > 0:
            self.sql.execute_update(
                f"DELETE FROM {self._table('semantic_links')} "
                f"WHERE model_id = '{_esc(model_id)}'"
            )
        return count

    def _delete_edges_for_entity(self, model_id: str, entity_type: str, entity_id: str) -> int:
        """Delete all edges involving a specific entity (as source or target)."""
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}' "
            f"AND ((source_type = '{_esc(entity_type)}' AND source_id = '{_esc(entity_id)}') "
            f"  OR (target_type = '{_esc(entity_type)}' AND target_id = '{_esc(entity_id)}'))"
        )
        count = rows[0]["cnt"] if rows else 0
        if count > 0:
            self.sql.execute_update(
                f"DELETE FROM {self._table('semantic_links')} "
                f"WHERE model_id = '{_esc(model_id)}' "
                f"AND ((source_type = '{_esc(entity_type)}' AND source_id = '{_esc(entity_id)}') "
                f"  OR (target_type = '{_esc(entity_type)}' AND target_id = '{_esc(entity_id)}'))"
            )
        return count

    # ========================================================================
    # Full refresh materialization
    # ========================================================================

    def materialize_all(self) -> MaterializeResult:
        """Full refresh: delete all lineage edges and re-scan source tables."""
        t0 = time.time()
        model_id = self._get_or_create_lineage_model()

        # Delete existing edges
        deleted = self._delete_edges_for_model(model_id)

        edges_created = 0
        edges_by_type: dict[str, int] = {}

        def _track(link_type: str, count: int = 1) -> None:
            nonlocal edges_created
            edges_created += count
            edges_by_type[link_type] = edges_by_type.get(link_type, 0) + count

        # ------------------------------------------------------------------
        # 1. training_sheets -> produces (sheet_id -> training_sheet)
        #                    -> generated_from (training_sheet -> template_id)
        # ------------------------------------------------------------------
        training_sheets = self.sql.execute(
            f"SELECT id, name, sheet_id, template_id FROM {self._table('training_sheets')}"
        )
        for ts in training_sheets:
            ts_id = ts["id"]
            ts_name = ts.get("name")
            sheet_id = ts["sheet_id"]
            template_id = ts["template_id"]

            # sheet produces training_sheet
            self._insert_edge_with_inverse(
                model_id,
                source_type="sheet",
                source_id=sheet_id,
                target_type="training_sheet",
                target_id=ts_id,
                link_type="produces",
                target_name=ts_name,
            )
            _track("produces", 2)  # forward + inverse

            # training_sheet generated_from template
            self._insert_edge_with_inverse(
                model_id,
                source_type="training_sheet",
                source_id=ts_id,
                target_type="template",
                target_id=template_id,
                link_type="generated_from",
                source_name=ts_name,
            )
            _track("generated_from", 2)  # forward + inverse

        # ------------------------------------------------------------------
        # 2. model_training_lineage -> trains_on (model -> training_sheet)
        #                           -> deployed_as (model -> endpoint)
        # ------------------------------------------------------------------
        lineage_rows = self.sql.execute(
            f"SELECT model_name, training_sheet_id, training_sheet_name, "
            f"       deployment_endpoint "
            f"FROM {self._table('model_training_lineage')}"
        )
        for row in lineage_rows:
            model_name = row["model_name"]
            ts_id = row["training_sheet_id"]

            # model trains_on training_sheet
            self._insert_edge_with_inverse(
                model_id,
                source_type="model",
                source_id=model_name,
                target_type="training_sheet",
                target_id=ts_id,
                link_type="trains_on",
                target_name=row.get("training_sheet_name"),
                source_name=model_name,
            )
            _track("trains_on", 2)

            # model deployed_as endpoint (only if deployment_endpoint is set)
            endpoint = row.get("deployment_endpoint")
            if endpoint:
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="model",
                    source_id=model_name,
                    target_type="endpoint",
                    target_id=endpoint,
                    link_type="deployed_as",
                    target_name=endpoint,
                    source_name=model_name,
                )
                _track("deployed_as", 2)

        duration_ms = (time.time() - t0) * 1000
        result = MaterializeResult(
            edges_created=edges_created,
            edges_updated=0,
            edges_deleted=deleted,
            edges_by_type=edges_by_type,
            duration_ms=duration_ms,
        )
        logger.info(
            "Lineage materialization complete: %d created, %d deleted in %.0fms",
            edges_created, deleted, duration_ms,
        )
        return result

    # ========================================================================
    # Incremental materialization
    # ========================================================================

    def materialize_for_entity(self, entity_type: str, entity_id: str) -> MaterializeResult:
        """Incremental materialization: delete edges involving this entity
        and re-scan just for this entity."""
        t0 = time.time()
        model_id = self._get_or_create_lineage_model()

        deleted = self._delete_edges_for_entity(model_id, entity_type, entity_id)

        edges_created = 0
        edges_by_type: dict[str, int] = {}

        def _track(link_type: str, count: int = 1) -> None:
            nonlocal edges_created
            edges_created += count
            edges_by_type[link_type] = edges_by_type.get(link_type, 0) + count

        if entity_type == "sheet":
            # Re-scan training_sheets that reference this sheet
            ts_rows = self.sql.execute(
                f"SELECT id, name, sheet_id, template_id "
                f"FROM {self._table('training_sheets')} "
                f"WHERE sheet_id = '{_esc(entity_id)}'"
            )
            for ts in ts_rows:
                self._insert_edge_with_inverse(
                    model_id, "sheet", entity_id,
                    "training_sheet", ts["id"], "produces",
                    target_name=ts.get("name"),
                )
                _track("produces", 2)

                self._insert_edge_with_inverse(
                    model_id, "training_sheet", ts["id"],
                    "template", ts["template_id"], "generated_from",
                    source_name=ts.get("name"),
                )
                _track("generated_from", 2)

        elif entity_type == "template":
            # Re-scan training_sheets that reference this template
            ts_rows = self.sql.execute(
                f"SELECT id, name, sheet_id, template_id "
                f"FROM {self._table('training_sheets')} "
                f"WHERE template_id = '{_esc(entity_id)}'"
            )
            for ts in ts_rows:
                self._insert_edge_with_inverse(
                    model_id, "sheet", ts["sheet_id"],
                    "training_sheet", ts["id"], "produces",
                    target_name=ts.get("name"),
                )
                _track("produces", 2)

                self._insert_edge_with_inverse(
                    model_id, "training_sheet", ts["id"],
                    "template", entity_id, "generated_from",
                    source_name=ts.get("name"),
                )
                _track("generated_from", 2)

        elif entity_type == "training_sheet":
            # Re-scan this specific training_sheet
            ts_rows = self.sql.execute(
                f"SELECT id, name, sheet_id, template_id "
                f"FROM {self._table('training_sheets')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for ts in ts_rows:
                self._insert_edge_with_inverse(
                    model_id, "sheet", ts["sheet_id"],
                    "training_sheet", ts["id"], "produces",
                    target_name=ts.get("name"),
                )
                _track("produces", 2)

                self._insert_edge_with_inverse(
                    model_id, "training_sheet", ts["id"],
                    "template", ts["template_id"], "generated_from",
                    source_name=ts.get("name"),
                )
                _track("generated_from", 2)

            # Also re-scan model lineage referencing this training_sheet
            lineage_rows = self.sql.execute(
                f"SELECT model_name, training_sheet_id, training_sheet_name, "
                f"       deployment_endpoint "
                f"FROM {self._table('model_training_lineage')} "
                f"WHERE training_sheet_id = '{_esc(entity_id)}'"
            )
            for row in lineage_rows:
                self._insert_edge_with_inverse(
                    model_id, "model", row["model_name"],
                    "training_sheet", entity_id, "trains_on",
                    target_name=row.get("training_sheet_name"),
                    source_name=row["model_name"],
                )
                _track("trains_on", 2)

                endpoint = row.get("deployment_endpoint")
                if endpoint:
                    self._insert_edge_with_inverse(
                        model_id, "model", row["model_name"],
                        "endpoint", endpoint, "deployed_as",
                        target_name=endpoint,
                        source_name=row["model_name"],
                    )
                    _track("deployed_as", 2)

        elif entity_type == "model":
            # Re-scan model_training_lineage for this model
            lineage_rows = self.sql.execute(
                f"SELECT model_name, training_sheet_id, training_sheet_name, "
                f"       deployment_endpoint "
                f"FROM {self._table('model_training_lineage')} "
                f"WHERE model_name = '{_esc(entity_id)}'"
            )
            for row in lineage_rows:
                self._insert_edge_with_inverse(
                    model_id, "model", entity_id,
                    "training_sheet", row["training_sheet_id"], "trains_on",
                    target_name=row.get("training_sheet_name"),
                    source_name=entity_id,
                )
                _track("trains_on", 2)

                endpoint = row.get("deployment_endpoint")
                if endpoint:
                    self._insert_edge_with_inverse(
                        model_id, "model", entity_id,
                        "endpoint", endpoint, "deployed_as",
                        target_name=endpoint,
                        source_name=entity_id,
                    )
                    _track("deployed_as", 2)

        elif entity_type == "endpoint":
            # Re-scan model_training_lineage for this endpoint
            lineage_rows = self.sql.execute(
                f"SELECT model_name, training_sheet_id, training_sheet_name, "
                f"       deployment_endpoint "
                f"FROM {self._table('model_training_lineage')} "
                f"WHERE deployment_endpoint = '{_esc(entity_id)}'"
            )
            for row in lineage_rows:
                self._insert_edge_with_inverse(
                    model_id, "model", row["model_name"],
                    "endpoint", entity_id, "deployed_as",
                    target_name=entity_id,
                    source_name=row["model_name"],
                )
                _track("deployed_as", 2)

        duration_ms = (time.time() - t0) * 1000
        result = MaterializeResult(
            edges_created=edges_created,
            edges_updated=0,
            edges_deleted=deleted,
            edges_by_type=edges_by_type,
            duration_ms=duration_ms,
        )
        logger.info(
            "Incremental lineage for %s/%s: %d created, %d deleted in %.0fms",
            entity_type, entity_id, edges_created, deleted, duration_ms,
        )
        return result

    # ========================================================================
    # Graph queries
    # ========================================================================

    def get_lineage_graph(self) -> LineageGraph:
        """Query all edges from the lineage model and build a LineageGraph."""
        model_id = self._get_or_create_lineage_model()
        rows = self.sql.execute(
            f"SELECT source_type, source_id, target_type, target_id, target_name, "
            f"       link_type, confidence "
            f"FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}' "
            f"ORDER BY source_type, link_type"
        )

        edges: list[LineageEdge] = []
        node_set: dict[tuple[str, str], LineageNode] = {}

        for row in rows:
            edges.append(LineageEdge(
                source_type=row["source_type"],
                source_id=row["source_id"],
                target_type=row["target_type"],
                target_id=row["target_id"],
                link_type=row["link_type"],
                confidence=row.get("confidence"),
            ))

            # Track unique nodes
            src_key = (row["source_type"], row["source_id"])
            if src_key not in node_set:
                node_set[src_key] = LineageNode(
                    entity_type=row["source_type"],
                    entity_id=row["source_id"],
                )

            tgt_key = (row["target_type"], row["target_id"])
            if tgt_key not in node_set:
                node_set[tgt_key] = LineageNode(
                    entity_type=row["target_type"],
                    entity_id=row["target_id"],
                    entity_name=row.get("target_name"),
                )

        return LineageGraph(
            nodes=list(node_set.values()),
            edges=edges,
            model_id=model_id,
        )

    def get_entity_lineage(self, entity_type: str, entity_id: str) -> LineageGraph:
        """Get all edges involving a specific entity (as source or target)."""
        model_id = self._get_or_create_lineage_model()
        rows = self.sql.execute(
            f"SELECT source_type, source_id, target_type, target_id, target_name, "
            f"       link_type, confidence "
            f"FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}' "
            f"AND ((source_type = '{_esc(entity_type)}' AND source_id = '{_esc(entity_id)}') "
            f"  OR (target_type = '{_esc(entity_type)}' AND target_id = '{_esc(entity_id)}')) "
            f"ORDER BY source_type, link_type"
        )

        edges: list[LineageEdge] = []
        node_set: dict[tuple[str, str], LineageNode] = {}

        for row in rows:
            edges.append(LineageEdge(
                source_type=row["source_type"],
                source_id=row["source_id"],
                target_type=row["target_type"],
                target_id=row["target_id"],
                link_type=row["link_type"],
                confidence=row.get("confidence"),
            ))

            src_key = (row["source_type"], row["source_id"])
            if src_key not in node_set:
                node_set[src_key] = LineageNode(
                    entity_type=row["source_type"],
                    entity_id=row["source_id"],
                )

            tgt_key = (row["target_type"], row["target_id"])
            if tgt_key not in node_set:
                node_set[tgt_key] = LineageNode(
                    entity_type=row["target_type"],
                    entity_id=row["target_id"],
                    entity_name=row.get("target_name"),
                )

        return LineageGraph(
            nodes=list(node_set.values()),
            edges=edges,
            model_id=model_id,
        )


# Singleton
_lineage_service: LineageService | None = None


def get_lineage_service() -> LineageService:
    global _lineage_service
    if _lineage_service is None:
        _lineage_service = LineageService()
    return _lineage_service
