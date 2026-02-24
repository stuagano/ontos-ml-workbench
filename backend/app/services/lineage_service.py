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

        # ------------------------------------------------------------------
        # 3. canonical_labels -> labeled_by (canonical_label -> sheet)
        # ------------------------------------------------------------------
        canonical_labels = self.sql.execute(
            f"SELECT id, sheet_id, label_type FROM {self._table('canonical_labels')}"
        )
        for cl in canonical_labels:
            cl_id = cl["id"]
            sheet_id = cl.get("sheet_id")
            if not sheet_id:
                continue
            self._insert_edge_with_inverse(
                model_id,
                source_type="canonical_label",
                source_id=cl_id,
                target_type="sheet",
                target_id=sheet_id,
                link_type="labeled_by",
                source_name=cl.get("label_type"),
            )
            _track("labeled_by", 2)

        # ------------------------------------------------------------------
        # 4. domain scoping -> in_domain (entity -> domain)
        # Scan 5 tables for non-null domain_id
        # ------------------------------------------------------------------
        domain_tables = [
            ("sheets", "sheet"),
            ("templates", "template"),
            ("training_sheets", "training_sheet"),
            ("data_products", "data_product"),
            ("data_contracts", "data_contract"),
            ("teams", "team"),
        ]
        for table_name, entity_type_val in domain_tables:
            domain_rows = self.sql.execute(
                f"SELECT id, name, domain_id FROM {self._table(table_name)} "
                f"WHERE domain_id IS NOT NULL"
            )
            for dr in domain_rows:
                self._insert_edge_with_inverse(
                    model_id,
                    source_type=entity_type_val,
                    source_id=dr["id"],
                    target_type="domain",
                    target_id=dr["domain_id"],
                    link_type="in_domain",
                    source_name=dr.get("name"),
                )
                _track("in_domain", 2)

        # ------------------------------------------------------------------
        # 5. data_product_ports -> exposes (data_product -> entity via ports)
        # ------------------------------------------------------------------
        port_rows = self.sql.execute(
            f"SELECT id, product_id, entity_type, entity_id, entity_name "
            f"FROM {self._table('data_product_ports')} "
            f"WHERE entity_id IS NOT NULL"
        )
        for port in port_rows:
            target_type = port.get("entity_type") or "sheet"
            self._insert_edge_with_inverse(
                model_id,
                source_type="data_product",
                source_id=port["product_id"],
                target_type=target_type,
                target_id=port["entity_id"],
                link_type="exposes",
                target_name=port.get("entity_name"),
            )
            _track("exposes", 2)

        # ------------------------------------------------------------------
        # 6. data_contracts -> governs (data_contract -> sheet)
        # ------------------------------------------------------------------
        contract_rows = self.sql.execute(
            f"SELECT id, name, dataset_id FROM {self._table('data_contracts')} "
            f"WHERE dataset_id IS NOT NULL"
        )
        for cr in contract_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="data_contract",
                source_id=cr["id"],
                target_type="sheet",
                target_id=cr["dataset_id"],
                link_type="governs",
                source_name=cr.get("name"),
            )
            _track("governs", 2)

        # ------------------------------------------------------------------
        # 7. labeling_jobs -> targets (labeling_job -> sheet)
        # ------------------------------------------------------------------
        labeling_rows = self.sql.execute(
            f"SELECT id, name, sheet_id FROM {self._table('labeling_jobs')} "
            f"WHERE sheet_id IS NOT NULL"
        )
        for lj in labeling_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="labeling_job",
                source_id=lj["id"],
                target_type="sheet",
                target_id=lj["sheet_id"],
                link_type="targets",
                source_name=lj.get("name"),
            )
            _track("targets", 2)

        # ------------------------------------------------------------------
        # 8. labeling_tasks -> contains_task (labeling_job -> labeling_task)
        # ------------------------------------------------------------------
        lt_rows = self.sql.execute(
            f"SELECT id, name, job_id FROM {self._table('labeling_tasks')}"
        )
        for lt in lt_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="labeling_job",
                source_id=lt["job_id"],
                target_type="labeling_task",
                target_id=lt["id"],
                link_type="contains_task",
                target_name=lt.get("name"),
            )
            _track("contains_task", 2)

        # ------------------------------------------------------------------
        # 9. labeled_items -> contains_item (labeling_task -> labeled_item)
        # ------------------------------------------------------------------
        li_rows = self.sql.execute(
            f"SELECT id, task_id FROM {self._table('labeled_items')}"
        )
        for li in li_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="labeling_task",
                source_id=li["task_id"],
                target_type="labeled_item",
                target_id=li["id"],
                link_type="contains_item",
            )
            _track("contains_item", 2)

        # ------------------------------------------------------------------
        # 10. model_evaluations -> evaluated_with + evaluates_model
        # ------------------------------------------------------------------
        eval_rows = self.sql.execute(
            f"SELECT id, model_name, eval_dataset_id "
            f"FROM {self._table('model_evaluations')}"
        )
        for ev in eval_rows:
            ev_id = ev["id"]
            if ev.get("eval_dataset_id"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="model_evaluation",
                    source_id=ev_id,
                    target_type="training_sheet",
                    target_id=ev["eval_dataset_id"],
                    link_type="evaluated_with",
                )
                _track("evaluated_with", 2)
            if ev.get("model_name"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="model_evaluation",
                    source_id=ev_id,
                    target_type="model",
                    target_id=ev["model_name"],
                    link_type="evaluates_model",
                )
                _track("evaluates_model", 2)

        # ------------------------------------------------------------------
        # 11. bit_attribution -> attributed_to (model -> training_sheet)
        # ------------------------------------------------------------------
        ba_rows = self.sql.execute(
            f"SELECT DISTINCT model_name, bit_id "
            f"FROM {self._table('bit_attribution')}"
        )
        for ba in ba_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="model",
                source_id=ba["model_name"],
                target_type="training_sheet",
                target_id=ba["bit_id"],
                link_type="attributed_to",
                source_name=ba["model_name"],
            )
            _track("attributed_to", 2)

        # ------------------------------------------------------------------
        # 12. team ownership: data_products, connectors, projects -> team
        # ------------------------------------------------------------------
        team_owned_tables = [
            ("data_products", "data_product"),
            ("platform_connectors", "connector"),
            ("projects", "project"),
        ]
        for table_name, etype in team_owned_tables:
            to_rows = self.sql.execute(
                f"SELECT id, name, team_id FROM {self._table(table_name)} "
                f"WHERE team_id IS NOT NULL"
            )
            for tr in to_rows:
                self._insert_edge_with_inverse(
                    model_id,
                    source_type=etype,
                    source_id=tr["id"],
                    target_type="team",
                    target_id=tr["team_id"],
                    link_type="owned_by_team",
                    source_name=tr.get("name"),
                )
                _track("owned_by_team", 2)

        # ------------------------------------------------------------------
        # 13. domain hierarchy: parent_of (domain -> child domain)
        # ------------------------------------------------------------------
        hierarchy_rows = self.sql.execute(
            f"SELECT id, name, parent_id FROM {self._table('data_domains')} "
            f"WHERE parent_id IS NOT NULL"
        )
        for hr in hierarchy_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="domain",
                source_id=hr["parent_id"],
                target_type="domain",
                target_id=hr["id"],
                link_type="parent_of",
                target_name=hr.get("name"),
            )
            _track("parent_of", 2)

        # ------------------------------------------------------------------
        # 14. asset_reviews -> reviews (asset_review -> polymorphic entity)
        # ------------------------------------------------------------------
        review_rows = self.sql.execute(
            f"SELECT id, asset_type, asset_id, asset_name "
            f"FROM {self._table('asset_reviews')}"
        )
        for rv in review_rows:
            target_type = rv.get("asset_type") or "sheet"
            self._insert_edge_with_inverse(
                model_id,
                source_type="asset_review",
                source_id=rv["id"],
                target_type=target_type,
                target_id=rv["asset_id"],
                link_type="reviews",
                target_name=rv.get("asset_name"),
            )
            _track("reviews", 2)

        # ------------------------------------------------------------------
        # 15. identified_gaps -> identifies_gap + gap_for_model
        # ------------------------------------------------------------------
        gap_rows = self.sql.execute(
            f"SELECT gap_id, template_id, model_name, description "
            f"FROM {self._table('identified_gaps')}"
        )
        for gap in gap_rows:
            gap_id = gap["gap_id"]
            if gap.get("template_id"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="identified_gap",
                    source_id=gap_id,
                    target_type="template",
                    target_id=gap["template_id"],
                    link_type="identifies_gap",
                )
                _track("identifies_gap", 2)
            if gap.get("model_name"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="identified_gap",
                    source_id=gap_id,
                    target_type="model",
                    target_id=gap["model_name"],
                    link_type="gap_for_model",
                )
                _track("gap_for_model", 2)

        # ------------------------------------------------------------------
        # 16. annotation_tasks -> remediates (annotation_task -> identified_gap)
        # ------------------------------------------------------------------
        at_rows = self.sql.execute(
            f"SELECT task_id, title, source_gap_id "
            f"FROM {self._table('annotation_tasks')} "
            f"WHERE source_gap_id IS NOT NULL"
        )
        for at in at_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="annotation_task",
                source_id=at["task_id"],
                target_type="identified_gap",
                target_id=at["source_gap_id"],
                link_type="remediates",
                source_name=at.get("title"),
            )
            _track("remediates", 2)

        # ------------------------------------------------------------------
        # 17. example_store -> sourced_from (example -> training_sheet/canonical_label)
        # ------------------------------------------------------------------
        ex_rows = self.sql.execute(
            f"SELECT id, source_training_sheet_id, source_canonical_label_id "
            f"FROM {self._table('example_store')} "
            f"WHERE source_training_sheet_id IS NOT NULL "
            f"   OR source_canonical_label_id IS NOT NULL"
        )
        for ex in ex_rows:
            ex_id = ex["id"]
            if ex.get("source_training_sheet_id"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="example",
                    source_id=ex_id,
                    target_type="training_sheet",
                    target_id=ex["source_training_sheet_id"],
                    link_type="sourced_from",
                )
                _track("sourced_from", 2)
            if ex.get("source_canonical_label_id"):
                self._insert_edge_with_inverse(
                    model_id,
                    source_type="example",
                    source_id=ex_id,
                    target_type="canonical_label",
                    target_id=ex["source_canonical_label_id"],
                    link_type="sourced_from",
                )
                _track("sourced_from", 2)

        # ------------------------------------------------------------------
        # 18. data_product_subscriptions -> subscribes_to (team -> data_product)
        # ------------------------------------------------------------------
        sub_rows = self.sql.execute(
            f"SELECT id, product_id, subscriber_team_id "
            f"FROM {self._table('data_product_subscriptions')} "
            f"WHERE subscriber_team_id IS NOT NULL"
        )
        for sub in sub_rows:
            self._insert_edge_with_inverse(
                model_id,
                source_type="team",
                source_id=sub["subscriber_team_id"],
                target_type="data_product",
                target_id=sub["product_id"],
                link_type="subscribes_to",
            )
            _track("subscribes_to", 2)

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

        elif entity_type == "canonical_label":
            # Re-scan this canonical label's sheet_id
            cl_rows = self.sql.execute(
                f"SELECT id, sheet_id, label_type FROM {self._table('canonical_labels')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for cl in cl_rows:
                if cl.get("sheet_id"):
                    self._insert_edge_with_inverse(
                        model_id, "canonical_label", entity_id,
                        "sheet", cl["sheet_id"], "labeled_by",
                        source_name=cl.get("label_type"),
                    )
                    _track("labeled_by", 2)

        elif entity_type == "domain":
            # Re-scan all entities with this domain_id across 6 tables
            domain_tables = [
                ("sheets", "sheet"),
                ("templates", "template"),
                ("training_sheets", "training_sheet"),
                ("data_products", "data_product"),
                ("data_contracts", "data_contract"),
                ("teams", "team"),
            ]
            for table_name, etype in domain_tables:
                d_rows = self.sql.execute(
                    f"SELECT id, name FROM {self._table(table_name)} "
                    f"WHERE domain_id = '{_esc(entity_id)}'"
                )
                for dr in d_rows:
                    self._insert_edge_with_inverse(
                        model_id, etype, dr["id"],
                        "domain", entity_id, "in_domain",
                        source_name=dr.get("name"),
                    )
                    _track("in_domain", 2)

        elif entity_type == "data_product":
            # Re-scan ports for this data product
            port_rows = self.sql.execute(
                f"SELECT id, product_id, entity_type, entity_id, entity_name "
                f"FROM {self._table('data_product_ports')} "
                f"WHERE product_id = '{_esc(entity_id)}' AND entity_id IS NOT NULL"
            )
            for port in port_rows:
                target_type = port.get("entity_type") or "sheet"
                self._insert_edge_with_inverse(
                    model_id, "data_product", entity_id,
                    target_type, port["entity_id"], "exposes",
                    target_name=port.get("entity_name"),
                )
                _track("exposes", 2)

            # Also re-scan domain_id and team_id for this product
            prod_rows = self.sql.execute(
                f"SELECT id, name, domain_id, team_id FROM {self._table('data_products')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for pr in prod_rows:
                if pr.get("domain_id"):
                    self._insert_edge_with_inverse(
                        model_id, "data_product", entity_id,
                        "domain", pr["domain_id"], "in_domain",
                        source_name=pr.get("name"),
                    )
                    _track("in_domain", 2)
                if pr.get("team_id"):
                    self._insert_edge_with_inverse(
                        model_id, "data_product", entity_id,
                        "team", pr["team_id"], "owned_by_team",
                        source_name=pr.get("name"),
                    )
                    _track("owned_by_team", 2)

        elif entity_type == "data_contract":
            # Re-scan dataset_id for this contract
            cr_rows = self.sql.execute(
                f"SELECT id, name, dataset_id, domain_id FROM {self._table('data_contracts')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for cr in cr_rows:
                if cr.get("dataset_id"):
                    self._insert_edge_with_inverse(
                        model_id, "data_contract", entity_id,
                        "sheet", cr["dataset_id"], "governs",
                        source_name=cr.get("name"),
                    )
                    _track("governs", 2)
                if cr.get("domain_id"):
                    self._insert_edge_with_inverse(
                        model_id, "data_contract", entity_id,
                        "domain", cr["domain_id"], "in_domain",
                        source_name=cr.get("name"),
                    )
                    _track("in_domain", 2)

        elif entity_type == "labeling_job":
            # Re-scan sheet_id for this labeling job
            lj_rows = self.sql.execute(
                f"SELECT id, name, sheet_id FROM {self._table('labeling_jobs')} "
                f"WHERE id = '{_esc(entity_id)}' AND sheet_id IS NOT NULL"
            )
            for lj in lj_rows:
                self._insert_edge_with_inverse(
                    model_id, "labeling_job", entity_id,
                    "sheet", lj["sheet_id"], "targets",
                    source_name=lj.get("name"),
                )
                _track("targets", 2)
            # Re-scan tasks in this job
            lt_rows = self.sql.execute(
                f"SELECT id, name FROM {self._table('labeling_tasks')} "
                f"WHERE job_id = '{_esc(entity_id)}'"
            )
            for lt in lt_rows:
                self._insert_edge_with_inverse(
                    model_id, "labeling_job", entity_id,
                    "labeling_task", lt["id"], "contains_task",
                    target_name=lt.get("name"),
                )
                _track("contains_task", 2)

        elif entity_type == "labeling_task":
            # Re-scan job_id for this task
            lt_rows = self.sql.execute(
                f"SELECT id, name, job_id FROM {self._table('labeling_tasks')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for lt in lt_rows:
                self._insert_edge_with_inverse(
                    model_id, "labeling_job", lt["job_id"],
                    "labeling_task", entity_id, "contains_task",
                    target_name=lt.get("name"),
                )
                _track("contains_task", 2)
            # Re-scan labeled_items in this task
            li_rows = self.sql.execute(
                f"SELECT id FROM {self._table('labeled_items')} "
                f"WHERE task_id = '{_esc(entity_id)}'"
            )
            for li in li_rows:
                self._insert_edge_with_inverse(
                    model_id, "labeling_task", entity_id,
                    "labeled_item", li["id"], "contains_item",
                )
                _track("contains_item", 2)

        elif entity_type == "labeled_item":
            # Re-scan task_id for this labeled item
            li_rows = self.sql.execute(
                f"SELECT id, task_id FROM {self._table('labeled_items')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for li in li_rows:
                self._insert_edge_with_inverse(
                    model_id, "labeling_task", li["task_id"],
                    "labeled_item", entity_id, "contains_item",
                )
                _track("contains_item", 2)

        elif entity_type == "model_evaluation":
            # Re-scan eval_dataset_id and model_name
            ev_rows = self.sql.execute(
                f"SELECT id, model_name, eval_dataset_id "
                f"FROM {self._table('model_evaluations')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for ev in ev_rows:
                if ev.get("eval_dataset_id"):
                    self._insert_edge_with_inverse(
                        model_id, "model_evaluation", entity_id,
                        "training_sheet", ev["eval_dataset_id"], "evaluated_with",
                    )
                    _track("evaluated_with", 2)
                if ev.get("model_name"):
                    self._insert_edge_with_inverse(
                        model_id, "model_evaluation", entity_id,
                        "model", ev["model_name"], "evaluates_model",
                    )
                    _track("evaluates_model", 2)

        elif entity_type == "team":
            # Re-scan all entities owned by this team
            team_owned_tables = [
                ("data_products", "data_product"),
                ("platform_connectors", "connector"),
                ("projects", "project"),
            ]
            for table_name, etype in team_owned_tables:
                to_rows = self.sql.execute(
                    f"SELECT id, name FROM {self._table(table_name)} "
                    f"WHERE team_id = '{_esc(entity_id)}'"
                )
                for tr in to_rows:
                    self._insert_edge_with_inverse(
                        model_id, etype, tr["id"],
                        "team", entity_id, "owned_by_team",
                        source_name=tr.get("name"),
                    )
                    _track("owned_by_team", 2)
            # Re-scan domain_id for this team
            t_rows = self.sql.execute(
                f"SELECT id, name, domain_id FROM {self._table('teams')} "
                f"WHERE id = '{_esc(entity_id)}' AND domain_id IS NOT NULL"
            )
            for t in t_rows:
                self._insert_edge_with_inverse(
                    model_id, "team", entity_id,
                    "domain", t["domain_id"], "in_domain",
                    source_name=t.get("name"),
                )
                _track("in_domain", 2)
            # Re-scan subscriptions for this team
            sub_rows = self.sql.execute(
                f"SELECT id, product_id FROM {self._table('data_product_subscriptions')} "
                f"WHERE subscriber_team_id = '{_esc(entity_id)}'"
            )
            for sub in sub_rows:
                self._insert_edge_with_inverse(
                    model_id, "team", entity_id,
                    "data_product", sub["product_id"], "subscribes_to",
                )
                _track("subscribes_to", 2)

        elif entity_type == "project":
            # Re-scan team_id for this project
            p_rows = self.sql.execute(
                f"SELECT id, name, team_id FROM {self._table('projects')} "
                f"WHERE id = '{_esc(entity_id)}' AND team_id IS NOT NULL"
            )
            for p in p_rows:
                self._insert_edge_with_inverse(
                    model_id, "project", entity_id,
                    "team", p["team_id"], "owned_by_team",
                    source_name=p.get("name"),
                )
                _track("owned_by_team", 2)

        elif entity_type == "identified_gap":
            # Re-scan template_id and model_name
            gap_rows = self.sql.execute(
                f"SELECT gap_id, template_id, model_name "
                f"FROM {self._table('identified_gaps')} "
                f"WHERE gap_id = '{_esc(entity_id)}'"
            )
            for gap in gap_rows:
                if gap.get("template_id"):
                    self._insert_edge_with_inverse(
                        model_id, "identified_gap", entity_id,
                        "template", gap["template_id"], "identifies_gap",
                    )
                    _track("identifies_gap", 2)
                if gap.get("model_name"):
                    self._insert_edge_with_inverse(
                        model_id, "identified_gap", entity_id,
                        "model", gap["model_name"], "gap_for_model",
                    )
                    _track("gap_for_model", 2)

        elif entity_type == "annotation_task":
            # Re-scan source_gap_id
            at_rows = self.sql.execute(
                f"SELECT task_id, title, source_gap_id "
                f"FROM {self._table('annotation_tasks')} "
                f"WHERE task_id = '{_esc(entity_id)}' AND source_gap_id IS NOT NULL"
            )
            for at in at_rows:
                self._insert_edge_with_inverse(
                    model_id, "annotation_task", entity_id,
                    "identified_gap", at["source_gap_id"], "remediates",
                    source_name=at.get("title"),
                )
                _track("remediates", 2)

        elif entity_type == "asset_review":
            # Re-scan asset_type/asset_id
            rv_rows = self.sql.execute(
                f"SELECT id, asset_type, asset_id, asset_name "
                f"FROM {self._table('asset_reviews')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for rv in rv_rows:
                target_type = rv.get("asset_type") or "sheet"
                self._insert_edge_with_inverse(
                    model_id, "asset_review", entity_id,
                    target_type, rv["asset_id"], "reviews",
                    target_name=rv.get("asset_name"),
                )
                _track("reviews", 2)

        elif entity_type == "example":
            # Re-scan source references
            ex_rows = self.sql.execute(
                f"SELECT id, source_training_sheet_id, source_canonical_label_id "
                f"FROM {self._table('example_store')} "
                f"WHERE id = '{_esc(entity_id)}'"
            )
            for ex in ex_rows:
                if ex.get("source_training_sheet_id"):
                    self._insert_edge_with_inverse(
                        model_id, "example", entity_id,
                        "training_sheet", ex["source_training_sheet_id"], "sourced_from",
                    )
                    _track("sourced_from", 2)
                if ex.get("source_canonical_label_id"):
                    self._insert_edge_with_inverse(
                        model_id, "example", entity_id,
                        "canonical_label", ex["source_canonical_label_id"], "sourced_from",
                    )
                    _track("sourced_from", 2)

        elif entity_type == "connector":
            # Re-scan team_id for this connector
            c_rows = self.sql.execute(
                f"SELECT id, name, team_id FROM {self._table('platform_connectors')} "
                f"WHERE id = '{_esc(entity_id)}' AND team_id IS NOT NULL"
            )
            for c in c_rows:
                self._insert_edge_with_inverse(
                    model_id, "connector", entity_id,
                    "team", c["team_id"], "owned_by_team",
                    source_name=c.get("name"),
                )
                _track("owned_by_team", 2)

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
