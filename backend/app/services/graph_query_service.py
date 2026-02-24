"""Graph query service - recursive lineage traversal, impact analysis, path finding."""

import logging
from collections import defaultdict

from app.core.config import get_settings
from app.models.governance import (
    ImpactReport,
    LineageEdge,
    LineageEntityType,
    LineageGraph,
    LineageNode,
    TraversalResult,
)
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


def _esc(value: str) -> str:
    """Escape single quotes for SQL."""
    return value.replace("'", "''")


class GraphQueryService:
    """Recursive graph traversal for lineage queries, impact analysis, and path finding."""

    def __init__(self):
        self.settings = get_settings()
        self.sql = get_sql_service()

    def _table(self, name: str) -> str:
        return self.settings.get_table(name)

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _get_lineage_model_id(self) -> str | None:
        """Query semantic_models for the system lineage model, return id or None."""
        try:
            rows = self.sql.execute(
                f"SELECT id FROM {self._table('semantic_models')} "
                f"WHERE name = '_system_lineage' LIMIT 1"
            )
            return rows[0]["id"] if rows else None
        except Exception as e:
            logger.warning("Failed to look up _system_lineage model: %s", e)
            return None

    def _row_to_edge(self, row: dict) -> LineageEdge:
        """Convert a SQL row to a LineageEdge."""
        return LineageEdge(
            source_type=row["source_type"],
            source_id=row["source_id"],
            target_type=row["target_type"],
            target_id=row["target_id"],
            link_type=row["link_type"],
            confidence=row.get("confidence"),
        )

    def _row_to_node(self, entity_type: str, entity_id: str) -> LineageNode:
        """Create a LineageNode from type and id."""
        return LineageNode(entity_type=entity_type, entity_id=entity_id)

    def _collect_nodes_from_edges(
        self, edges: list[LineageEdge], root_type: str, root_id: str
    ) -> list[LineageNode]:
        """Deduplicate and collect all unique nodes from a set of edges, including root."""
        seen: set[tuple[str, str]] = set()
        nodes: list[LineageNode] = []

        # Always include the root node
        seen.add((root_type, root_id))
        nodes.append(self._row_to_node(root_type, root_id))

        for edge in edges:
            src_key = (edge.source_type, edge.source_id)
            tgt_key = (edge.target_type, edge.target_id)
            if src_key not in seen:
                seen.add(src_key)
                nodes.append(self._row_to_node(edge.source_type, edge.source_id))
            if tgt_key not in seen:
                seen.add(tgt_key)
                nodes.append(self._row_to_node(edge.target_type, edge.target_id))

        return nodes

    def _count_by_type(self, nodes: list[LineageNode]) -> dict[str, int]:
        """Count nodes grouped by entity_type."""
        counts: dict[str, int] = defaultdict(int)
        for node in nodes:
            counts[node.entity_type] += 1
        return dict(counts)

    def _bfs_traverse(
        self,
        model_id: str,
        entity_type: str,
        entity_id: str,
        direction: str,
        max_depth: int,
    ) -> tuple[list[LineageNode], list[LineageEdge]]:
        """Python BFS fallback for traversal when recursive CTE is not supported."""
        visited: set[tuple[str, str]] = set()
        queue: list[tuple[str, str, int]] = [(entity_type, entity_id, 0)]
        edges: list[LineageEdge] = []

        while queue:
            etype, eid, depth = queue.pop(0)
            if (etype, eid) in visited or depth >= max_depth:
                continue
            visited.add((etype, eid))

            if direction == "upstream":
                rows = self.sql.execute(
                    f"SELECT source_type, source_id, target_type, target_id, "
                    f"link_type, confidence "
                    f"FROM {self._table('semantic_links')} "
                    f"WHERE target_type = '{_esc(etype)}' "
                    f"AND target_id = '{_esc(eid)}' "
                    f"AND model_id = '{_esc(model_id)}'"
                )
                for r in rows:
                    edge = self._row_to_edge(r)
                    edges.append(edge)
                    queue.append((r["source_type"], r["source_id"], depth + 1))
            else:
                # downstream: follow source -> target
                rows = self.sql.execute(
                    f"SELECT source_type, source_id, target_type, target_id, "
                    f"link_type, confidence "
                    f"FROM {self._table('semantic_links')} "
                    f"WHERE source_type = '{_esc(etype)}' "
                    f"AND source_id = '{_esc(eid)}' "
                    f"AND model_id = '{_esc(model_id)}'"
                )
                for r in rows:
                    edge = self._row_to_edge(r)
                    edges.append(edge)
                    queue.append((r["target_type"], r["target_id"], depth + 1))

        nodes = self._collect_nodes_from_edges(edges, entity_type, entity_id)
        return nodes, edges

    # ========================================================================
    # Upstream traversal
    # ========================================================================

    def traverse_upstream(
        self, entity_type: str, entity_id: str, max_depth: int = 10
    ) -> TraversalResult:
        """Traverse the lineage graph upstream (toward sources) from a given entity.

        Tries a recursive CTE first for performance; falls back to Python BFS
        if the SQL warehouse does not support WITH RECURSIVE.
        """
        model_id = self._get_lineage_model_id()
        root_node = self._row_to_node(entity_type, entity_id)

        if not model_id:
            logger.info("No _system_lineage model found; returning empty traversal.")
            return TraversalResult(
                root_entity=root_node,
                direction="upstream",
                max_depth=max_depth,
                graph=LineageGraph(),
                entity_count_by_type={},
            )

        semantic_links = self._table("semantic_links")
        nodes: list[LineageNode] = []
        edges: list[LineageEdge] = []

        try:
            query = f"""
                WITH RECURSIVE upstream AS (
                    SELECT source_type, source_id, target_type, target_id,
                           link_type, confidence, 1 AS depth
                    FROM {semantic_links}
                    WHERE target_type = '{_esc(entity_type)}'
                      AND target_id = '{_esc(entity_id)}'
                      AND model_id = '{_esc(model_id)}'
                    UNION ALL
                    SELECT sl.source_type, sl.source_id, sl.target_type, sl.target_id,
                           sl.link_type, sl.confidence, u.depth + 1
                    FROM {semantic_links} sl
                    JOIN upstream u
                      ON sl.target_type = u.source_type
                     AND sl.target_id = u.source_id
                    WHERE u.depth < {int(max_depth)}
                      AND sl.model_id = '{_esc(model_id)}'
                )
                SELECT DISTINCT source_type, source_id, target_type, target_id,
                       link_type, confidence, depth
                FROM upstream
                ORDER BY depth
            """
            rows = self.sql.execute(query)
            edges = [self._row_to_edge(r) for r in rows]
            nodes = self._collect_nodes_from_edges(edges, entity_type, entity_id)
        except Exception as e:
            logger.warning(
                "Recursive CTE failed for upstream traversal, falling back to BFS: %s",
                e,
            )
            nodes, edges = self._bfs_traverse(
                model_id, entity_type, entity_id, "upstream", max_depth
            )

        return TraversalResult(
            root_entity=root_node,
            direction="upstream",
            max_depth=max_depth,
            graph=LineageGraph(
                nodes=nodes,
                edges=edges,
                model_id=model_id,
            ),
            entity_count_by_type=self._count_by_type(nodes),
        )

    # ========================================================================
    # Downstream traversal
    # ========================================================================

    def traverse_downstream(
        self, entity_type: str, entity_id: str, max_depth: int = 10
    ) -> TraversalResult:
        """Traverse the lineage graph downstream (toward consumers) from a given entity.

        Tries a recursive CTE first for performance; falls back to Python BFS
        if the SQL warehouse does not support WITH RECURSIVE.
        """
        model_id = self._get_lineage_model_id()
        root_node = self._row_to_node(entity_type, entity_id)

        if not model_id:
            logger.info("No _system_lineage model found; returning empty traversal.")
            return TraversalResult(
                root_entity=root_node,
                direction="downstream",
                max_depth=max_depth,
                graph=LineageGraph(),
                entity_count_by_type={},
            )

        semantic_links = self._table("semantic_links")
        nodes: list[LineageNode] = []
        edges: list[LineageEdge] = []

        try:
            query = f"""
                WITH RECURSIVE downstream AS (
                    SELECT source_type, source_id, target_type, target_id,
                           link_type, confidence, 1 AS depth
                    FROM {semantic_links}
                    WHERE source_type = '{_esc(entity_type)}'
                      AND source_id = '{_esc(entity_id)}'
                      AND model_id = '{_esc(model_id)}'
                    UNION ALL
                    SELECT sl.source_type, sl.source_id, sl.target_type, sl.target_id,
                           sl.link_type, sl.confidence, d.depth + 1
                    FROM {semantic_links} sl
                    JOIN downstream d
                      ON sl.source_type = d.target_type
                     AND sl.source_id = d.target_id
                    WHERE d.depth < {int(max_depth)}
                      AND sl.model_id = '{_esc(model_id)}'
                )
                SELECT DISTINCT source_type, source_id, target_type, target_id,
                       link_type, confidence, depth
                FROM downstream
                ORDER BY depth
            """
            rows = self.sql.execute(query)
            edges = [self._row_to_edge(r) for r in rows]
            nodes = self._collect_nodes_from_edges(edges, entity_type, entity_id)
        except Exception as e:
            logger.warning(
                "Recursive CTE failed for downstream traversal, falling back to BFS: %s",
                e,
            )
            nodes, edges = self._bfs_traverse(
                model_id, entity_type, entity_id, "downstream", max_depth
            )

        return TraversalResult(
            root_entity=root_node,
            direction="downstream",
            max_depth=max_depth,
            graph=LineageGraph(
                nodes=nodes,
                edges=edges,
                model_id=model_id,
            ),
            entity_count_by_type=self._count_by_type(nodes),
        )

    # ========================================================================
    # Impact analysis
    # ========================================================================

    def impact_analysis(self, entity_type: str, entity_id: str) -> ImpactReport:
        """Compute the downstream blast radius of a change to the given entity.

        Returns an ImpactReport categorising affected entities by type and
        assigning an overall risk level.
        """
        traversal = self.traverse_downstream(entity_type, entity_id)
        source_node = self._row_to_node(entity_type, entity_id)

        affected_training_sheets: list[LineageNode] = []
        affected_models: list[LineageNode] = []
        affected_endpoints: list[LineageNode] = []

        for node in traversal.graph.nodes:
            # Skip the root entity itself
            if node.entity_type == entity_type and node.entity_id == entity_id:
                continue
            if node.entity_type == LineageEntityType.TRAINING_SHEET.value:
                affected_training_sheets.append(node)
            elif node.entity_type == LineageEntityType.MODEL.value:
                affected_models.append(node)
            elif node.entity_type == LineageEntityType.ENDPOINT.value:
                affected_endpoints.append(node)

        total_affected = (
            len(affected_training_sheets)
            + len(affected_models)
            + len(affected_endpoints)
        )

        # Determine risk level based on what is affected
        if affected_endpoints:
            risk_level = "critical"
        elif affected_models:
            risk_level = "high"
        elif affected_training_sheets:
            risk_level = "medium"
        else:
            risk_level = "low"

        return ImpactReport(
            source_entity=source_node,
            affected_training_sheets=affected_training_sheets,
            affected_models=affected_models,
            affected_endpoints=affected_endpoints,
            total_affected=total_affected,
            risk_level=risk_level,
        )

    # ========================================================================
    # Path finding
    # ========================================================================

    def find_path(
        self,
        from_type: str,
        from_id: str,
        to_type: str,
        to_id: str,
    ) -> list[LineageEdge]:
        """BFS path finding through semantic_links for the lineage model.

        Returns the list of LineageEdge forming the shortest path from source
        to target, or an empty list if no path exists.
        """
        model_id = self._get_lineage_model_id()
        if not model_id:
            return []

        visited: set[tuple[str, str]] = set()
        # Each queue entry: (entity_type, entity_id, path_so_far)
        queue: list[tuple[str, str, list[LineageEdge]]] = [
            (from_type, from_id, [])
        ]

        while queue:
            etype, eid, path = queue.pop(0)
            if etype == to_type and eid == to_id:
                return path

            if (etype, eid) in visited:
                continue
            visited.add((etype, eid))

            # Follow forward edges (source -> target)
            forward_rows = self.sql.execute(
                f"SELECT source_type, source_id, target_type, target_id, "
                f"link_type, confidence "
                f"FROM {self._table('semantic_links')} "
                f"WHERE source_type = '{_esc(etype)}' "
                f"AND source_id = '{_esc(eid)}' "
                f"AND model_id = '{_esc(model_id)}'"
            )
            for r in forward_rows:
                edge = self._row_to_edge(r)
                next_key = (r["target_type"], r["target_id"])
                if next_key not in visited:
                    queue.append(
                        (r["target_type"], r["target_id"], path + [edge])
                    )

            # Follow reverse edges (target -> source)
            reverse_rows = self.sql.execute(
                f"SELECT source_type, source_id, target_type, target_id, "
                f"link_type, confidence "
                f"FROM {self._table('semantic_links')} "
                f"WHERE target_type = '{_esc(etype)}' "
                f"AND target_id = '{_esc(eid)}' "
                f"AND model_id = '{_esc(model_id)}'"
            )
            for r in reverse_rows:
                edge = self._row_to_edge(r)
                next_key = (r["source_type"], r["source_id"])
                if next_key not in visited:
                    queue.append(
                        (r["source_type"], r["source_id"], path + [edge])
                    )

        return []

    # ========================================================================
    # Entity context (local neighborhood)
    # ========================================================================

    def get_entity_context(
        self, entity_type: str, entity_id: str
    ) -> LineageGraph:
        """Get immediate neighbors (depth=1) in both directions.

        Returns a LineageGraph containing just the local neighborhood around
        the specified entity.
        """
        model_id = self._get_lineage_model_id()
        if not model_id:
            return LineageGraph()

        edges: list[LineageEdge] = []

        # Upstream neighbors (entities that feed into this one)
        upstream_rows = self.sql.execute(
            f"SELECT source_type, source_id, target_type, target_id, "
            f"link_type, confidence "
            f"FROM {self._table('semantic_links')} "
            f"WHERE target_type = '{_esc(entity_type)}' "
            f"AND target_id = '{_esc(entity_id)}' "
            f"AND model_id = '{_esc(model_id)}'"
        )
        for r in upstream_rows:
            edges.append(self._row_to_edge(r))

        # Downstream neighbors (entities that this one feeds into)
        downstream_rows = self.sql.execute(
            f"SELECT source_type, source_id, target_type, target_id, "
            f"link_type, confidence "
            f"FROM {self._table('semantic_links')} "
            f"WHERE source_type = '{_esc(entity_type)}' "
            f"AND source_id = '{_esc(entity_id)}' "
            f"AND model_id = '{_esc(model_id)}'"
        )
        for r in downstream_rows:
            edges.append(self._row_to_edge(r))

        nodes = self._collect_nodes_from_edges(edges, entity_type, entity_id)

        return LineageGraph(
            nodes=nodes,
            edges=edges,
            model_id=model_id,
        )


# ============================================================================
# Singleton
# ============================================================================

_graph_query_service: GraphQueryService | None = None


def get_graph_query_service() -> GraphQueryService:
    global _graph_query_service
    if _graph_query_service is None:
        _graph_query_service = GraphQueryService()
    return _graph_query_service
