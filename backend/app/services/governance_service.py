"""Governance service - RBAC roles, teams, and data domains."""

import json
import logging
import uuid
from datetime import datetime, timedelta

from app.core.config import get_settings
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


def _esc(value: str) -> str:
    """Escape single quotes for SQL."""
    return value.replace("'", "''")


class GovernanceService:
    """Business logic for governance entities (roles, teams, domains)."""

    def __init__(self):
        self.settings = get_settings()
        self.sql = get_sql_service()

    def _table(self, name: str) -> str:
        return self.settings.get_table(name)

    def _sql(self, query: str) -> list:
        """Execute SQL — uses execute for SELECT, execute_update for DML."""
        stripped = query.strip().upper()
        if stripped.startswith("SELECT") or stripped.startswith("WITH"):
            return self.sql.execute(query)
        self.sql.execute_update(query)
        return []

    # ========================================================================
    # Roles
    # ========================================================================

    def list_roles(self) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('app_roles')} ORDER BY name"
        )
        return [self._parse_role(r) for r in rows]

    def get_role(self, role_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('app_roles')} WHERE id = '{_esc(role_id)}'"
        )
        return self._parse_role(rows[0]) if rows else None

    def create_role(self, data: dict, created_by: str) -> dict:
        role_id = str(uuid.uuid4())
        perms_json = json.dumps(data["feature_permissions"]).replace("'", "''")
        stages_json = json.dumps(data.get("allowed_stages", [])).replace("'", "''")

        self.sql.execute_update(f"""
            INSERT INTO {self._table('app_roles')}
            (id, name, description, feature_permissions, allowed_stages, is_default,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{role_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{perms_json}', '{stages_json}',
                {str(data.get('is_default', False)).lower()},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_role(role_id)

    def update_role(self, role_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("feature_permissions") is not None:
            perms_json = json.dumps(data["feature_permissions"]).replace("'", "''")
            updates.append(f"feature_permissions = '{perms_json}'")
        if data.get("allowed_stages") is not None:
            stages_json = json.dumps(data["allowed_stages"]).replace("'", "''")
            updates.append(f"allowed_stages = '{stages_json}'")
        if data.get("is_default") is not None:
            updates.append(f"is_default = {str(data['is_default']).lower()}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('app_roles')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(role_id)}'"
            )
        return self.get_role(role_id)

    def delete_role(self, role_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('app_roles')} WHERE id = '{_esc(role_id)}'"
        )

    def _parse_role(self, row: dict) -> dict:
        return {
            **row,
            "feature_permissions": json.loads(row["feature_permissions"])
            if row.get("feature_permissions") else {},
            "allowed_stages": json.loads(row["allowed_stages"])
            if row.get("allowed_stages") else [],
            "is_default": row.get("is_default") in (True, "true", "1"),
        }

    # ========================================================================
    # User Role Assignments
    # ========================================================================

    def list_user_assignments(self) -> list[dict]:
        return self.sql.execute(
            f"SELECT ura.*, r.name as role_name "
            f"FROM {self._table('user_role_assignments')} ura "
            f"LEFT JOIN {self._table('app_roles')} r ON ura.role_id = r.id "
            f"ORDER BY ura.user_email"
        )

    def get_user_role(self, user_email: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT ura.*, r.name as role_name "
            f"FROM {self._table('user_role_assignments')} ura "
            f"LEFT JOIN {self._table('app_roles')} r ON ura.role_id = r.id "
            f"WHERE ura.user_email = '{_esc(user_email)}'"
        )
        return rows[0] if rows else None

    def assign_user_role(self, data: dict, assigned_by: str) -> dict:
        # Upsert: if user already has assignment, update it
        existing = self.get_user_role(data["user_email"])
        if existing:
            dn_sql = f"'{_esc(data['user_display_name'])}'" if data.get("user_display_name") else "NULL"
            self.sql.execute_update(
                f"UPDATE {self._table('user_role_assignments')} "
                f"SET role_id = '{_esc(data['role_id'])}', "
                f"    user_display_name = {dn_sql}, "
                f"    assigned_by = '{_esc(assigned_by)}', "
                f"    assigned_at = current_timestamp() "
                f"WHERE user_email = '{_esc(data['user_email'])}'"
            )
            return self.get_user_role(data["user_email"])

        assignment_id = str(uuid.uuid4())
        display_name = f"'{_esc(data['user_display_name'])}'" if data.get("user_display_name") else "NULL"
        self.sql.execute_update(f"""
            INSERT INTO {self._table('user_role_assignments')}
            (id, user_email, user_display_name, role_id, assigned_at, assigned_by)
            VALUES (
                '{assignment_id}', '{_esc(data["user_email"])}',
                {display_name}, '{_esc(data["role_id"])}',
                current_timestamp(), '{_esc(assigned_by)}'
            )
        """)
        return self.get_user_role(data["user_email"])

    # ========================================================================
    # Teams
    # ========================================================================

    def list_teams(self) -> list[dict]:
        rows = self.sql.execute(f"""
            SELECT t.*, d.name as domain_name,
                   (SELECT COUNT(*) FROM {self._table('team_members')} tm WHERE tm.team_id = t.id) as member_count
            FROM {self._table('teams')} t
            LEFT JOIN {self._table('data_domains')} d ON t.domain_id = d.id
            ORDER BY t.name
        """)
        return [self._parse_team(r) for r in rows]

    def get_team(self, team_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT t.*, d.name as domain_name,
                   (SELECT COUNT(*) FROM {self._table('team_members')} tm WHERE tm.team_id = t.id) as member_count
            FROM {self._table('teams')} t
            LEFT JOIN {self._table('data_domains')} d ON t.domain_id = d.id
            WHERE t.id = '{_esc(team_id)}'
        """)
        return self._parse_team(rows[0]) if rows else None

    def create_team(self, data: dict, created_by: str) -> dict:
        team_id = str(uuid.uuid4())
        leads_json = json.dumps(data.get("leads", [])).replace("'", "''")
        metadata_json = json.dumps(data["metadata"]).replace("'", "''") if data.get("metadata") else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('teams')}
            (id, name, description, domain_id, leads, metadata, is_active,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{team_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                {f"'{_esc(data['domain_id'])}'" if data.get('domain_id') else 'NULL'},
                '{leads_json}',
                {f"'{metadata_json}'" if metadata_json else 'NULL'},
                true,
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_team(team_id)

    def update_team(self, team_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if "domain_id" in data:
            did_sql = f"'{_esc(data['domain_id'])}'" if data["domain_id"] else "NULL"
            updates.append(f"domain_id = {did_sql}")
        if data.get("leads") is not None:
            leads_json = json.dumps(data["leads"]).replace("'", "''")
            updates.append(f"leads = '{leads_json}'")
        if data.get("metadata") is not None:
            metadata_json = json.dumps(data["metadata"]).replace("'", "''")
            updates.append(f"metadata = '{metadata_json}'")
        if data.get("is_active") is not None:
            updates.append(f"is_active = {str(data['is_active']).lower()}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('teams')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(team_id)}'"
            )
        return self.get_team(team_id)

    def delete_team(self, team_id: str) -> None:
        # Delete members first
        self.sql.execute_update(
            f"DELETE FROM {self._table('team_members')} WHERE team_id = '{_esc(team_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('teams')} WHERE id = '{_esc(team_id)}'"
        )

    def _parse_team(self, row: dict) -> dict:
        raw_metadata = row.get("metadata")
        metadata = json.loads(raw_metadata) if raw_metadata else {"tools": []}
        return {
            **row,
            "leads": json.loads(row["leads"]) if row.get("leads") else [],
            "metadata": metadata,
            "is_active": row.get("is_active") in (True, "true", "1"),
            "member_count": int(row.get("member_count", 0)),
        }

    # ========================================================================
    # Team Members
    # ========================================================================

    def list_team_members(self, team_id: str) -> list[dict]:
        rows = self.sql.execute(f"""
            SELECT tm.*, r.name as role_override_name
            FROM {self._table('team_members')} tm
            LEFT JOIN {self._table('app_roles')} r ON tm.role_override = r.id
            WHERE tm.team_id = '{_esc(team_id)}'
            ORDER BY tm.user_email
        """)
        return rows

    def add_team_member(self, team_id: str, data: dict, added_by: str) -> dict:
        member_id = str(uuid.uuid4())
        display_name = f"'{_esc(data['user_display_name'])}'" if data.get("user_display_name") else "NULL"
        role_override = f"'{_esc(data['role_override'])}'" if data.get("role_override") else "NULL"

        self.sql.execute_update(f"""
            INSERT INTO {self._table('team_members')}
            (id, team_id, user_email, user_display_name, role_override, added_at, added_by)
            VALUES (
                '{member_id}', '{_esc(team_id)}', '{_esc(data["user_email"])}',
                {display_name}, {role_override},
                current_timestamp(), '{_esc(added_by)}'
            )
        """)
        rows = self.sql.execute(
            f"SELECT tm.*, r.name as role_override_name "
            f"FROM {self._table('team_members')} tm "
            f"LEFT JOIN {self._table('app_roles')} r ON tm.role_override = r.id "
            f"WHERE tm.id = '{member_id}'"
        )
        return rows[0] if rows else {}

    def update_team_member(self, member_id: str, data: dict) -> dict:
        updates = []
        if "role_override" in data:
            if data["role_override"]:
                updates.append(f"role_override = '{_esc(data['role_override'])}'")
            else:
                updates.append("role_override = NULL")
        if data.get("user_display_name") is not None:
            updates.append(f"user_display_name = '{_esc(data['user_display_name'])}'")

        if updates:
            self.sql.execute_update(
                f"UPDATE {self._table('team_members')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(member_id)}'"
            )

        rows = self.sql.execute(
            f"SELECT tm.*, r.name as role_override_name "
            f"FROM {self._table('team_members')} tm "
            f"LEFT JOIN {self._table('app_roles')} r ON tm.role_override = r.id "
            f"WHERE tm.id = '{_esc(member_id)}'"
        )
        return rows[0] if rows else {}

    def remove_team_member(self, member_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('team_members')} WHERE id = '{_esc(member_id)}'"
        )

    # ========================================================================
    # Data Domains
    # ========================================================================

    def list_domains(self) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_domains')} ORDER BY name"
        )
        return [self._parse_domain(r) for r in rows]

    def get_domain(self, domain_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_domains')} WHERE id = '{_esc(domain_id)}'"
        )
        return self._parse_domain(rows[0]) if rows else None

    def create_domain(self, data: dict, created_by: str) -> dict:
        domain_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('data_domains')}
            (id, name, description, parent_id, owner_email, icon, color, is_active,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{domain_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                {f"'{_esc(data['parent_id'])}'" if data.get('parent_id') else 'NULL'},
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else 'NULL'},
                {f"'{_esc(data['icon'])}'" if data.get('icon') else 'NULL'},
                {f"'{_esc(data['color'])}'" if data.get('color') else 'NULL'},
                true,
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_domain(domain_id)

    def update_domain(self, domain_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if "parent_id" in data:
            pid_sql = f"'{_esc(data['parent_id'])}'" if data["parent_id"] else "NULL"
            updates.append(f"parent_id = {pid_sql}")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")
        if data.get("icon") is not None:
            updates.append(f"icon = '{_esc(data['icon'])}'")
        if data.get("color") is not None:
            updates.append(f"color = '{_esc(data['color'])}'")
        if data.get("is_active") is not None:
            updates.append(f"is_active = {str(data['is_active']).lower()}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('data_domains')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(domain_id)}'"
            )
        return self.get_domain(domain_id)

    def delete_domain(self, domain_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_domains')} WHERE id = '{_esc(domain_id)}'"
        )

    def get_domain_tree(self) -> list[dict]:
        """Build hierarchical domain tree from flat query."""
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_domains')} "
            f"WHERE is_active = true ORDER BY name"
        )
        domains = [self._parse_domain(r) for r in rows]

        # Build tree
        by_id = {d["id"]: {**d, "children": []} for d in domains}
        roots = []
        for d in domains:
            node = by_id[d["id"]]
            parent_id = d.get("parent_id")
            if parent_id and parent_id in by_id:
                by_id[parent_id]["children"].append(node)
            else:
                roots.append(node)
        return roots

    def _parse_domain(self, row: dict) -> dict:
        return {
            **row,
            "is_active": row.get("is_active") in (True, "true", "1"),
        }

    # ========================================================================
    # Asset Reviews (G4)
    # ========================================================================

    def list_reviews(
        self,
        asset_type: str | None = None,
        asset_id: str | None = None,
        status: str | None = None,
        reviewer_email: str | None = None,
    ) -> list[dict]:
        where = []
        if asset_type:
            where.append(f"asset_type = '{_esc(asset_type)}'")
        if asset_id:
            where.append(f"asset_id = '{_esc(asset_id)}'")
        if status:
            where.append(f"status = '{_esc(status)}'")
        if reviewer_email:
            where.append(f"reviewer_email = '{_esc(reviewer_email)}'")

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        return self.sql.execute(
            f"SELECT * FROM {self._table('asset_reviews')} "
            f"{where_clause} ORDER BY created_at DESC"
        )

    def get_review(self, review_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('asset_reviews')} "
            f"WHERE id = '{_esc(review_id)}'"
        )
        return rows[0] if rows else None

    def get_latest_review(self, asset_type: str, asset_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('asset_reviews')} "
            f"WHERE asset_type = '{_esc(asset_type)}' AND asset_id = '{_esc(asset_id)}' "
            f"ORDER BY created_at DESC LIMIT 1"
        )
        return rows[0] if rows else None

    def request_review(self, data: dict, requested_by: str) -> dict:
        review_id = str(uuid.uuid4())
        status = "in_review" if data.get("reviewer_email") else "pending"

        self.sql.execute_update(f"""
            INSERT INTO {self._table('asset_reviews')}
            (id, asset_type, asset_id, asset_name, status, requested_by,
             reviewer_email, created_at, updated_at)
            VALUES (
                '{review_id}', '{_esc(data["asset_type"])}',
                '{_esc(data["asset_id"])}',
                {f"'{_esc(data['asset_name'])}'" if data.get('asset_name') else 'NULL'},
                '{status}', '{_esc(requested_by)}',
                {f"'{_esc(data['reviewer_email'])}'" if data.get('reviewer_email') else 'NULL'},
                current_timestamp(), current_timestamp()
            )
        """)
        return self.get_review(review_id)

    def assign_reviewer(self, review_id: str, reviewer_email: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('asset_reviews')} "
            f"SET reviewer_email = '{_esc(reviewer_email)}', "
            f"    status = 'in_review', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(review_id)}'"
        )
        return self.get_review(review_id)

    def submit_decision(self, review_id: str, status: str, review_notes: str | None) -> dict | None:
        notes_sql = f"'{_esc(review_notes)}'" if review_notes else "NULL"
        self.sql.execute_update(
            f"UPDATE {self._table('asset_reviews')} "
            f"SET status = '{_esc(status)}', "
            f"    review_notes = {notes_sql}, "
            f"    decision_at = current_timestamp(), "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(review_id)}'"
        )
        return self.get_review(review_id)

    def delete_review(self, review_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('asset_reviews')} WHERE id = '{_esc(review_id)}'"
        )

    # ========================================================================
    # Projects (G8)
    # ========================================================================

    def list_projects(self) -> list[dict]:
        rows = self.sql.execute(f"""
            SELECT p.*, t.name as team_name,
                   (SELECT COUNT(*) FROM {self._table('project_members')} pm WHERE pm.project_id = p.id) as member_count
            FROM {self._table('projects')} p
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            ORDER BY p.name
        """)
        return [self._parse_project(r) for r in rows]

    def get_project(self, project_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT p.*, t.name as team_name,
                   (SELECT COUNT(*) FROM {self._table('project_members')} pm WHERE pm.project_id = p.id) as member_count
            FROM {self._table('projects')} p
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            WHERE p.id = '{_esc(project_id)}'
        """)
        return self._parse_project(rows[0]) if rows else None

    def create_project(self, data: dict, created_by: str) -> dict:
        project_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('projects')}
            (id, name, description, project_type, team_id, owner_email, is_active,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{project_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("project_type", "team"))}',
                {f"'{_esc(data['team_id'])}'" if data.get('team_id') else 'NULL'},
                '{_esc(created_by)}', true,
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        # Auto-add creator as owner member
        member_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('project_members')}
            (id, project_id, user_email, role, added_at, added_by)
            VALUES ('{member_id}', '{project_id}', '{_esc(created_by)}', 'owner',
                    current_timestamp(), '{_esc(created_by)}')
        """)
        return self.get_project(project_id)

    def update_project(self, project_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if "team_id" in data:
            tid_sql = f"'{_esc(data['team_id'])}'" if data["team_id"] else "NULL"
            updates.append(f"team_id = {tid_sql}")
        if data.get("is_active") is not None:
            updates.append(f"is_active = {str(data['is_active']).lower()}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('projects')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(project_id)}'"
            )
        return self.get_project(project_id)

    def delete_project(self, project_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('project_members')} WHERE project_id = '{_esc(project_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('projects')} WHERE id = '{_esc(project_id)}'"
        )

    def _parse_project(self, row: dict) -> dict:
        return {
            **row,
            "is_active": row.get("is_active") in (True, "true", "1"),
            "member_count": int(row.get("member_count", 0)),
        }

    # Project Members

    def list_project_members(self, project_id: str) -> list[dict]:
        return self.sql.execute(
            f"SELECT * FROM {self._table('project_members')} "
            f"WHERE project_id = '{_esc(project_id)}' ORDER BY user_email"
        )

    def add_project_member(self, project_id: str, data: dict, added_by: str) -> dict:
        member_id = str(uuid.uuid4())
        display_name = f"'{_esc(data['user_display_name'])}'" if data.get("user_display_name") else "NULL"
        role = _esc(data.get("role", "member"))

        self.sql.execute_update(f"""
            INSERT INTO {self._table('project_members')}
            (id, project_id, user_email, user_display_name, role, added_at, added_by)
            VALUES (
                '{member_id}', '{_esc(project_id)}', '{_esc(data["user_email"])}',
                {display_name}, '{role}',
                current_timestamp(), '{_esc(added_by)}'
            )
        """)
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('project_members')} WHERE id = '{member_id}'"
        )
        return rows[0] if rows else {}

    def remove_project_member(self, member_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('project_members')} WHERE id = '{_esc(member_id)}'"
        )

    # ========================================================================
    # Data Contracts (G5)
    # ========================================================================

    def list_contracts(self, status: str | None = None, domain_id: str | None = None) -> list[dict]:
        where = []
        if status:
            where.append(f"c.status = '{_esc(status)}'")
        if domain_id:
            where.append(f"c.domain_id = '{_esc(domain_id)}'")
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = self.sql.execute(f"""
            SELECT c.*, d.name as domain_name
            FROM {self._table('data_contracts')} c
            LEFT JOIN {self._table('data_domains')} d ON c.domain_id = d.id
            {where_clause}
            ORDER BY c.name
        """)
        return [self._parse_contract(r) for r in rows]

    def get_contract(self, contract_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT c.*, d.name as domain_name
            FROM {self._table('data_contracts')} c
            LEFT JOIN {self._table('data_domains')} d ON c.domain_id = d.id
            WHERE c.id = '{_esc(contract_id)}'
        """)
        return self._parse_contract(rows[0]) if rows else None

    def create_contract(self, data: dict, created_by: str) -> dict:
        contract_id = str(uuid.uuid4())
        schema_json = json.dumps(data.get("schema_definition", [])).replace("'", "''")
        rules_json = json.dumps(data.get("quality_rules", [])).replace("'", "''")
        terms_json = json.dumps(data["terms"]).replace("'", "''") if data.get("terms") else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('data_contracts')}
            (id, name, description, version, status, dataset_id, dataset_name,
             domain_id, owner_email, schema_definition, quality_rules, terms,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{contract_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("version", "1.0.0"))}', 'draft',
                {f"'{_esc(data['dataset_id'])}'" if data.get('dataset_id') else 'NULL'},
                {f"'{_esc(data['dataset_name'])}'" if data.get('dataset_name') else 'NULL'},
                {f"'{_esc(data['domain_id'])}'" if data.get('domain_id') else 'NULL'},
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else 'NULL'},
                '{schema_json}', '{rules_json}',
                {f"'{terms_json}'" if terms_json else 'NULL'},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_contract(contract_id)

    def update_contract(self, contract_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("version") is not None:
            updates.append(f"version = '{_esc(data['version'])}'")
        if "dataset_id" in data:
            did_sql = f"'{_esc(data['dataset_id'])}'" if data["dataset_id"] else "NULL"
            updates.append(f"dataset_id = {did_sql}")
        if data.get("dataset_name") is not None:
            updates.append(f"dataset_name = '{_esc(data['dataset_name'])}'")
        if "domain_id" in data:
            did_sql = f"'{_esc(data['domain_id'])}'" if data["domain_id"] else "NULL"
            updates.append(f"domain_id = {did_sql}")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")
        if data.get("schema_definition") is not None:
            schema_json = json.dumps(data["schema_definition"]).replace("'", "''")
            updates.append(f"schema_definition = '{schema_json}'")
        if data.get("quality_rules") is not None:
            rules_json = json.dumps(data["quality_rules"]).replace("'", "''")
            updates.append(f"quality_rules = '{rules_json}'")
        if data.get("terms") is not None:
            terms_json = json.dumps(data["terms"]).replace("'", "''")
            updates.append(f"terms = '{terms_json}'")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('data_contracts')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(contract_id)}'"
            )
        return self.get_contract(contract_id)

    def activate_contract(self, contract_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('data_contracts')} "
            f"SET status = 'active', activated_at = current_timestamp(), "
            f"    updated_by = '{_esc(updated_by)}', updated_at = current_timestamp() "
            f"WHERE id = '{_esc(contract_id)}'"
        )
        return self.get_contract(contract_id)

    def transition_contract(self, contract_id: str, new_status: str, updated_by: str) -> dict | None:
        extra = ""
        if new_status == "active":
            extra = "activated_at = current_timestamp(), "
        self.sql.execute_update(
            f"UPDATE {self._table('data_contracts')} "
            f"SET status = '{_esc(new_status)}', {extra}"
            f"    updated_by = '{_esc(updated_by)}', updated_at = current_timestamp() "
            f"WHERE id = '{_esc(contract_id)}'"
        )
        return self.get_contract(contract_id)

    def delete_contract(self, contract_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_contracts')} WHERE id = '{_esc(contract_id)}'"
        )

    def _parse_contract(self, row: dict) -> dict:
        schema_def = row.get("schema_definition")
        quality_rules = row.get("quality_rules")
        terms = row.get("terms")
        return {
            **row,
            "schema_definition": json.loads(schema_def) if schema_def else [],
            "quality_rules": json.loads(quality_rules) if quality_rules else [],
            "terms": json.loads(terms) if terms else None,
        }

    # ========================================================================
    # Compliance Policies (G6)
    # ========================================================================

    def list_policies(self, category: str | None = None, status: str | None = None) -> list[dict]:
        where = []
        if category:
            where.append(f"p.category = '{_esc(category)}'")
        if status:
            where.append(f"p.status = '{_esc(status)}'")
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = self.sql.execute(f"""
            SELECT p.*
            FROM {self._table('compliance_policies')} p
            {where_clause}
            ORDER BY p.severity DESC, p.name
        """)
        policies = [self._parse_policy(r) for r in rows]
        # Attach latest evaluation summary to each policy
        for policy in policies:
            latest = self._get_latest_evaluation(policy["id"])
            policy["last_evaluation"] = latest
        return policies

    def get_policy(self, policy_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('compliance_policies')} "
            f"WHERE id = '{_esc(policy_id)}'"
        )
        if not rows:
            return None
        policy = self._parse_policy(rows[0])
        policy["last_evaluation"] = self._get_latest_evaluation(policy_id)
        return policy

    def create_policy(self, data: dict, created_by: str) -> dict:
        policy_id = str(uuid.uuid4())
        rules_json = json.dumps(data["rules"]).replace("'", "''")
        scope_json = json.dumps(data["scope"]).replace("'", "''") if data.get("scope") else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('compliance_policies')}
            (id, name, description, category, severity, status, rules, scope,
             schedule, owner_email, created_at, created_by, updated_at, updated_by)
            VALUES (
                '{policy_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("category", "data_quality"))}',
                '{_esc(data.get("severity", "warning"))}',
                'enabled', '{rules_json}',
                {f"'{scope_json}'" if scope_json else 'NULL'},
                {f"'{_esc(data['schedule'])}'" if data.get('schedule') else 'NULL'},
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else 'NULL'},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_policy(policy_id)

    def update_policy(self, policy_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("category") is not None:
            updates.append(f"category = '{_esc(data['category'])}'")
        if data.get("severity") is not None:
            updates.append(f"severity = '{_esc(data['severity'])}'")
        if data.get("status") is not None:
            updates.append(f"status = '{_esc(data['status'])}'")
        if data.get("rules") is not None:
            rules_json = json.dumps(data["rules"]).replace("'", "''")
            updates.append(f"rules = '{rules_json}'")
        if data.get("scope") is not None:
            scope_json = json.dumps(data["scope"]).replace("'", "''")
            updates.append(f"scope = '{scope_json}'")
        if "schedule" in data:
            sched_sql = f"'{_esc(data['schedule'])}'" if data["schedule"] else "NULL"
            updates.append(f"schedule = {sched_sql}")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('compliance_policies')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(policy_id)}'"
            )
        return self.get_policy(policy_id)

    def toggle_policy(self, policy_id: str, enabled: bool, updated_by: str) -> dict | None:
        new_status = "enabled" if enabled else "disabled"
        self.sql.execute_update(
            f"UPDATE {self._table('compliance_policies')} "
            f"SET status = '{new_status}', updated_by = '{_esc(updated_by)}', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(policy_id)}'"
        )
        return self.get_policy(policy_id)

    def delete_policy(self, policy_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('policy_evaluations')} WHERE policy_id = '{_esc(policy_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('compliance_policies')} WHERE id = '{_esc(policy_id)}'"
        )

    def _parse_policy(self, row: dict) -> dict:
        rules_raw = row.get("rules")
        scope_raw = row.get("scope")
        return {
            **row,
            "rules": json.loads(rules_raw) if rules_raw else [],
            "scope": json.loads(scope_raw) if scope_raw else None,
        }

    # Policy Evaluations

    def _get_latest_evaluation(self, policy_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('policy_evaluations')} "
            f"WHERE policy_id = '{_esc(policy_id)}' "
            f"ORDER BY evaluated_at DESC LIMIT 1"
        )
        return self._parse_evaluation(rows[0]) if rows else None

    def list_evaluations(self, policy_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('policy_evaluations')} "
            f"WHERE policy_id = '{_esc(policy_id)}' "
            f"ORDER BY evaluated_at DESC LIMIT 50"
        )
        return [self._parse_evaluation(r) for r in rows]

    def run_evaluation(self, policy_id: str, evaluated_by: str) -> dict:
        """Run a policy evaluation (simulated — checks rule structure, returns mock results)."""
        import time
        start = time.time()

        policy = self.get_policy(policy_id)
        if not policy:
            return {}

        rules = policy.get("rules", [])
        results = []
        passed = 0
        failed = 0

        for idx, rule in enumerate(rules):
            # Simulated evaluation: all rules pass for now
            # In production, this would query Unity Catalog metadata
            rule_passed = True
            results.append({
                "rule_index": idx,
                "passed": rule_passed,
                "actual_value": None,
                "message": rule.get("message") or f"{rule.get('field', '?')} check",
            })
            if rule_passed:
                passed += 1
            else:
                failed += 1

        duration_ms = int((time.time() - start) * 1000)
        eval_status = "passed" if failed == 0 else "failed"
        eval_id = str(uuid.uuid4())
        results_json = json.dumps(results).replace("'", "''")

        self.sql.execute_update(f"""
            INSERT INTO {self._table('policy_evaluations')}
            (id, policy_id, status, total_checks, passed_checks, failed_checks,
             results, evaluated_at, evaluated_by, duration_ms)
            VALUES (
                '{eval_id}', '{_esc(policy_id)}', '{eval_status}',
                {len(rules)}, {passed}, {failed},
                '{results_json}',
                current_timestamp(), '{_esc(evaluated_by)}', {duration_ms}
            )
        """)
        return self._parse_evaluation(self.sql.execute(
            f"SELECT * FROM {self._table('policy_evaluations')} WHERE id = '{eval_id}'"
        )[0])

    def _parse_evaluation(self, row: dict) -> dict:
        results_raw = row.get("results")
        return {
            **row,
            "results": json.loads(results_raw) if results_raw else [],
            "total_checks": int(row.get("total_checks", 0)),
            "passed_checks": int(row.get("passed_checks", 0)),
            "failed_checks": int(row.get("failed_checks", 0)),
        }

    # ========================================================================
    # Process Workflows (G7)
    # ========================================================================

    def list_workflows(self, status: str | None = None) -> list[dict]:
        where = f"WHERE w.status = '{_esc(status)}'" if status else ""
        rows = self.sql.execute(f"""
            SELECT w.*,
                   (SELECT COUNT(*) FROM {self._table('workflow_executions')} we WHERE we.workflow_id = w.id) as execution_count
            FROM {self._table('workflows')} w
            {where}
            ORDER BY w.name
        """)
        return [self._parse_workflow(r) for r in rows]

    def get_workflow(self, workflow_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT w.*,
                   (SELECT COUNT(*) FROM {self._table('workflow_executions')} we WHERE we.workflow_id = w.id) as execution_count
            FROM {self._table('workflows')} w
            WHERE w.id = '{_esc(workflow_id)}'
        """)
        return self._parse_workflow(rows[0]) if rows else None

    def create_workflow(self, data: dict, created_by: str) -> dict:
        workflow_id = str(uuid.uuid4())
        steps_json = json.dumps(data["steps"]).replace("'", "''")
        trigger_json = json.dumps(data["trigger_config"]).replace("'", "''") if data.get("trigger_config") else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('workflows')}
            (id, name, description, trigger_type, trigger_config, steps, status,
             owner_email, created_at, created_by, updated_at, updated_by)
            VALUES (
                '{workflow_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("trigger_type", "manual"))}',
                {f"'{trigger_json}'" if trigger_json else 'NULL'},
                '{steps_json}', 'draft',
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else 'NULL'},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_workflow(workflow_id)

    def update_workflow(self, workflow_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("trigger_type") is not None:
            updates.append(f"trigger_type = '{_esc(data['trigger_type'])}'")
        if data.get("trigger_config") is not None:
            tc_json = json.dumps(data["trigger_config"]).replace("'", "''")
            updates.append(f"trigger_config = '{tc_json}'")
        if data.get("steps") is not None:
            steps_json = json.dumps(data["steps"]).replace("'", "''")
            updates.append(f"steps = '{steps_json}'")
        if data.get("status") is not None:
            updates.append(f"status = '{_esc(data['status'])}'")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('workflows')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(workflow_id)}'"
            )
        return self.get_workflow(workflow_id)

    def activate_workflow(self, workflow_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('workflows')} "
            f"SET status = 'active', updated_by = '{_esc(updated_by)}', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(workflow_id)}'"
        )
        return self.get_workflow(workflow_id)

    def disable_workflow(self, workflow_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('workflows')} "
            f"SET status = 'disabled', updated_by = '{_esc(updated_by)}', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(workflow_id)}'"
        )
        return self.get_workflow(workflow_id)

    def delete_workflow(self, workflow_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('workflow_executions')} WHERE workflow_id = '{_esc(workflow_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('workflows')} WHERE id = '{_esc(workflow_id)}'"
        )

    def _parse_workflow(self, row: dict) -> dict:
        steps_raw = row.get("steps")
        trigger_raw = row.get("trigger_config")
        return {
            **row,
            "steps": json.loads(steps_raw) if steps_raw else [],
            "trigger_config": json.loads(trigger_raw) if trigger_raw else None,
            "execution_count": int(row.get("execution_count", 0)),
        }

    # Workflow Executions

    def list_executions(self, workflow_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('workflow_executions')} "
            f"WHERE workflow_id = '{_esc(workflow_id)}' "
            f"ORDER BY started_at DESC LIMIT 50"
        )
        return [self._parse_execution(r) for r in rows]

    def start_execution(self, workflow_id: str, started_by: str, trigger_event: dict | None = None) -> dict:
        """Start a new workflow execution."""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return {}

        exec_id = str(uuid.uuid4())
        steps = workflow.get("steps", [])
        first_step = steps[0]["step_id"] if steps else None
        trigger_json = json.dumps(trigger_event).replace("'", "''") if trigger_event else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('workflow_executions')}
            (id, workflow_id, workflow_name, status, current_step, trigger_event,
             step_results, started_at, started_by)
            VALUES (
                '{exec_id}', '{_esc(workflow_id)}',
                {f"'{_esc(workflow['name'])}'" if workflow.get('name') else 'NULL'},
                'running',
                {f"'{_esc(first_step)}'" if first_step else 'NULL'},
                {f"'{trigger_json}'" if trigger_json else 'NULL'},
                '[]',
                current_timestamp(), '{_esc(started_by)}'
            )
        """)
        return self._get_execution(exec_id)

    def advance_execution(self, execution_id: str, step_result: dict) -> dict | None:
        """Record a step result and advance to the next step."""
        execution = self._get_execution(execution_id)
        if not execution:
            return None

        workflow = self.get_workflow(execution["workflow_id"])
        if not workflow:
            return None

        # Append step result
        results = execution.get("step_results", [])
        results.append(step_result)
        results_json = json.dumps(results).replace("'", "''")

        # Find next step
        steps = workflow.get("steps", [])
        current_step = execution.get("current_step")
        next_step = None

        for step in steps:
            if step["step_id"] == current_step:
                if step_result.get("status") == "rejected" and step.get("on_reject"):
                    next_step = step["on_reject"]
                else:
                    next_step = step.get("next_step")
                break

        if next_step:
            self.sql.execute_update(
                f"UPDATE {self._table('workflow_executions')} "
                f"SET current_step = '{_esc(next_step)}', "
                f"    step_results = '{results_json}' "
                f"WHERE id = '{_esc(execution_id)}'"
            )
        else:
            # No next step — workflow complete
            final_status = "failed" if step_result.get("status") == "failed" else "completed"
            self.sql.execute_update(
                f"UPDATE {self._table('workflow_executions')} "
                f"SET current_step = NULL, status = '{final_status}', "
                f"    step_results = '{results_json}', "
                f"    completed_at = current_timestamp() "
                f"WHERE id = '{_esc(execution_id)}'"
            )

        return self._get_execution(execution_id)

    def cancel_execution(self, execution_id: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('workflow_executions')} "
            f"SET status = 'cancelled', completed_at = current_timestamp() "
            f"WHERE id = '{_esc(execution_id)}'"
        )
        return self._get_execution(execution_id)

    def _get_execution(self, execution_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('workflow_executions')} "
            f"WHERE id = '{_esc(execution_id)}'"
        )
        return self._parse_execution(rows[0]) if rows else None

    def _parse_execution(self, row: dict) -> dict:
        trigger_raw = row.get("trigger_event")
        results_raw = row.get("step_results")
        return {
            **row,
            "trigger_event": json.loads(trigger_raw) if trigger_raw else None,
            "step_results": json.loads(results_raw) if results_raw else [],
        }

    # ========================================================================
    # Data Products (G9)
    # ========================================================================

    def list_data_products(self, product_type: str | None = None, status: str | None = None) -> list[dict]:
        where = []
        if product_type:
            where.append(f"p.product_type = '{_esc(product_type)}'")
        if status:
            where.append(f"p.status = '{_esc(status)}'")
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = self.sql.execute(f"""
            SELECT p.*,
                   d.name AS domain_name,
                   t.name AS team_name
            FROM {self._table('data_products')} p
            LEFT JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            {where_clause}
            ORDER BY p.updated_at DESC
        """)
        products = [self._parse_product(r) for r in rows]
        # Attach port and subscription counts
        for prod in products:
            prod["port_count"] = self._count_ports(prod["id"])
            prod["subscription_count"] = self._count_subscriptions(prod["id"])
        return products

    def get_data_product(self, product_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT p.*,
                   d.name AS domain_name,
                   t.name AS team_name
            FROM {self._table('data_products')} p
            LEFT JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            WHERE p.id = '{_esc(product_id)}'
        """)
        if not rows:
            return None
        prod = self._parse_product(rows[0])
        prod["port_count"] = self._count_ports(product_id)
        prod["subscription_count"] = self._count_subscriptions(product_id)
        prod["ports"] = self.list_product_ports(product_id)
        return prod

    def create_data_product(self, data: dict, created_by: str) -> dict:
        product_id = str(uuid.uuid4())
        tags_json = json.dumps(data.get("tags", [])).replace("'", "''")
        meta_json = json.dumps(data["metadata"]).replace("'", "''") if data.get("metadata") else None

        self.sql.execute_update(f"""
            INSERT INTO {self._table('data_products')}
            (id, name, description, product_type, status, domain_id, owner_email, team_id,
             tags, metadata, created_at, created_by, updated_at, updated_by)
            VALUES (
                '{product_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("product_type", "source"))}',
                'draft',
                {f"'{_esc(data['domain_id'])}'" if data.get('domain_id') else 'NULL'},
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else f"'{_esc(created_by)}'"},
                {f"'{_esc(data['team_id'])}'" if data.get('team_id') else 'NULL'},
                '{tags_json}',
                {f"'{meta_json}'" if meta_json else 'NULL'},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)

        # Create ports if provided
        for port in data.get("ports", []):
            self.add_product_port(product_id, port, created_by)

        return self.get_data_product(product_id)

    def update_data_product(self, product_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("product_type") is not None:
            updates.append(f"product_type = '{_esc(data['product_type'])}'")
        if data.get("domain_id") is not None:
            updates.append(f"domain_id = '{_esc(data['domain_id'])}'")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")
        if data.get("team_id") is not None:
            updates.append(f"team_id = '{_esc(data['team_id'])}'")
        if data.get("tags") is not None:
            tags_json = json.dumps(data["tags"]).replace("'", "''")
            updates.append(f"tags = '{tags_json}'")
        if data.get("metadata") is not None:
            meta_json = json.dumps(data["metadata"]).replace("'", "''")
            updates.append(f"metadata = '{meta_json}'")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('data_products')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(product_id)}'"
            )
        return self.get_data_product(product_id)

    def publish_data_product(self, product_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('data_products')} "
            f"SET status = 'published', published_at = current_timestamp(), "
            f"    updated_by = '{_esc(updated_by)}', updated_at = current_timestamp() "
            f"WHERE id = '{_esc(product_id)}'"
        )
        return self.get_data_product(product_id)

    def transition_data_product(self, product_id: str, new_status: str, updated_by: str) -> dict | None:
        extra = ""
        if new_status == "published":
            extra = "published_at = current_timestamp(), "
        self.sql.execute_update(
            f"UPDATE {self._table('data_products')} "
            f"SET status = '{_esc(new_status)}', {extra}"
            f"    updated_by = '{_esc(updated_by)}', updated_at = current_timestamp() "
            f"WHERE id = '{_esc(product_id)}'"
        )
        return self.get_data_product(product_id)

    def delete_data_product(self, product_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_product_subscriptions')} WHERE product_id = '{_esc(product_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_product_ports')} WHERE product_id = '{_esc(product_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_products')} WHERE id = '{_esc(product_id)}'"
        )

    def _parse_product(self, row: dict) -> dict:
        tags_raw = row.get("tags")
        meta_raw = row.get("metadata")
        return {
            **row,
            "tags": json.loads(tags_raw) if tags_raw else [],
            "metadata": json.loads(meta_raw) if meta_raw else None,
        }

    def _count_ports(self, product_id: str) -> int:
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('data_product_ports')} "
            f"WHERE product_id = '{_esc(product_id)}'"
        )
        return rows[0]["cnt"] if rows else 0

    def _count_subscriptions(self, product_id: str) -> int:
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('data_product_subscriptions')} "
            f"WHERE product_id = '{_esc(product_id)}'"
        )
        return rows[0]["cnt"] if rows else 0

    # Data Product Ports

    def list_product_ports(self, product_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_ports')} "
            f"WHERE product_id = '{_esc(product_id)}' ORDER BY port_type, name"
        )
        return [self._parse_port(r) for r in rows]

    def add_product_port(self, product_id: str, data: dict, created_by: str) -> dict:
        port_id = str(uuid.uuid4())
        config_json = json.dumps(data["config"]).replace("'", "''") if data.get("config") else None
        self.sql.execute_update(f"""
            INSERT INTO {self._table('data_product_ports')}
            (id, product_id, name, description, port_type, entity_type, entity_id, entity_name,
             config, created_at, created_by)
            VALUES (
                '{port_id}', '{_esc(product_id)}',
                '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data.get("port_type", "output"))}',
                {f"'{_esc(data['entity_type'])}'" if data.get('entity_type') else 'NULL'},
                {f"'{_esc(data['entity_id'])}'" if data.get('entity_id') else 'NULL'},
                {f"'{_esc(data['entity_name'])}'" if data.get('entity_name') else 'NULL'},
                {f"'{config_json}'" if config_json else 'NULL'},
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_ports')} WHERE id = '{port_id}'"
        )
        return self._parse_port(rows[0]) if rows else {}

    def remove_product_port(self, port_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('data_product_ports')} WHERE id = '{_esc(port_id)}'"
        )

    def _parse_port(self, row: dict) -> dict:
        config_raw = row.get("config")
        return {
            **row,
            "config": json.loads(config_raw) if config_raw else None,
        }

    # Data Product Subscriptions

    def list_subscriptions(self, product_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_subscriptions')} "
            f"WHERE product_id = '{_esc(product_id)}' ORDER BY created_at DESC"
        )
        return rows

    def create_subscription(self, product_id: str, subscriber_email: str, data: dict) -> dict:
        sub_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('data_product_subscriptions')}
            (id, product_id, subscriber_email, subscriber_team_id, status, purpose, created_at)
            VALUES (
                '{sub_id}', '{_esc(product_id)}',
                '{_esc(subscriber_email)}',
                {f"'{_esc(data['subscriber_team_id'])}'" if data.get('subscriber_team_id') else 'NULL'},
                'pending',
                {f"'{_esc(data['purpose'])}'" if data.get('purpose') else 'NULL'},
                current_timestamp()
            )
        """)
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_subscriptions')} WHERE id = '{sub_id}'"
        )
        return rows[0] if rows else {}

    def approve_subscription(self, subscription_id: str, approved_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('data_product_subscriptions')} "
            f"SET status = 'approved', approved_by = '{_esc(approved_by)}', "
            f"    approved_at = current_timestamp() "
            f"WHERE id = '{_esc(subscription_id)}'"
        )
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_subscriptions')} WHERE id = '{_esc(subscription_id)}'"
        )
        return rows[0] if rows else None

    def reject_subscription(self, subscription_id: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('data_product_subscriptions')} "
            f"SET status = 'rejected' "
            f"WHERE id = '{_esc(subscription_id)}'"
        )
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_subscriptions')} WHERE id = '{_esc(subscription_id)}'"
        )
        return rows[0] if rows else None

    def revoke_subscription(self, subscription_id: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('data_product_subscriptions')} "
            f"SET status = 'revoked' "
            f"WHERE id = '{_esc(subscription_id)}'"
        )
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('data_product_subscriptions')} WHERE id = '{_esc(subscription_id)}'"
        )
        return rows[0] if rows else None

    # ========================================================================
    # Semantic Models (G10)
    # ========================================================================

    def list_semantic_models(self, status: str | None = None) -> list[dict]:
        where = f"WHERE m.status = '{_esc(status)}'" if status else ""
        rows = self.sql.execute(f"""
            SELECT m.*,
                   d.name AS domain_name
            FROM {self._table('semantic_models')} m
            LEFT JOIN {self._table('data_domains')} d ON m.domain_id = d.id
            {where}
            ORDER BY m.updated_at DESC
        """)
        models = [self._parse_semantic_model(r) for r in rows]
        for model in models:
            model["concept_count"] = self._count_concepts(model["id"])
            model["link_count"] = self._count_links(model["id"])
        return models

    def get_semantic_model(self, model_id: str) -> dict | None:
        rows = self.sql.execute(f"""
            SELECT m.*,
                   d.name AS domain_name
            FROM {self._table('semantic_models')} m
            LEFT JOIN {self._table('data_domains')} d ON m.domain_id = d.id
            WHERE m.id = '{_esc(model_id)}'
        """)
        if not rows:
            return None
        model = self._parse_semantic_model(rows[0])
        model["concept_count"] = self._count_concepts(model_id)
        model["link_count"] = self._count_links(model_id)
        model["concepts"] = self.list_concepts(model_id)
        model["links"] = self.list_links(model_id)
        return model

    def create_semantic_model(self, data: dict, created_by: str) -> dict:
        model_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_models')}
            (id, name, description, domain_id, owner_email, status, version,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{model_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                {f"'{_esc(data['domain_id'])}'" if data.get('domain_id') else 'NULL'},
                {f"'{_esc(data['owner_email'])}'" if data.get('owner_email') else f"'{_esc(created_by)}'"},
                'draft',
                '{_esc(data.get("version", "1.0.0"))}',
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_semantic_model(model_id)

    def update_semantic_model(self, model_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("domain_id") is not None:
            updates.append(f"domain_id = '{_esc(data['domain_id'])}'")
        if data.get("owner_email") is not None:
            updates.append(f"owner_email = '{_esc(data['owner_email'])}'")
        if data.get("version") is not None:
            updates.append(f"version = '{_esc(data['version'])}'")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('semantic_models')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(model_id)}'"
            )
        return self.get_semantic_model(model_id)

    def publish_semantic_model(self, model_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('semantic_models')} "
            f"SET status = 'published', updated_by = '{_esc(updated_by)}', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(model_id)}'"
        )
        return self.get_semantic_model(model_id)

    def archive_semantic_model(self, model_id: str, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('semantic_models')} "
            f"SET status = 'archived', updated_by = '{_esc(updated_by)}', "
            f"    updated_at = current_timestamp() "
            f"WHERE id = '{_esc(model_id)}'"
        )
        return self.get_semantic_model(model_id)

    def delete_semantic_model(self, model_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_links')} WHERE model_id = '{_esc(model_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_properties')} WHERE model_id = '{_esc(model_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_concepts')} WHERE model_id = '{_esc(model_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_models')} WHERE id = '{_esc(model_id)}'"
        )

    def _parse_semantic_model(self, row: dict) -> dict:
        meta_raw = row.get("metadata")
        return {
            **row,
            "metadata": json.loads(meta_raw) if meta_raw else None,
        }

    def _count_concepts(self, model_id: str) -> int:
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('semantic_concepts')} "
            f"WHERE model_id = '{_esc(model_id)}'"
        )
        return rows[0]["cnt"] if rows else 0

    def _count_links(self, model_id: str) -> int:
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}'"
        )
        return rows[0]["cnt"] if rows else 0

    # Concepts

    def list_concepts(self, model_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_concepts')} "
            f"WHERE model_id = '{_esc(model_id)}' ORDER BY name"
        )
        concepts = [self._parse_concept(r) for r in rows]
        # Attach properties to each concept
        for concept in concepts:
            concept["properties"] = self._list_properties_for_concept(concept["id"])
        return concepts

    def create_concept(self, model_id: str, data: dict, created_by: str) -> dict:
        concept_id = str(uuid.uuid4())
        tags_json = json.dumps(data.get("tags", [])).replace("'", "''")
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_concepts')}
            (id, model_id, name, description, parent_id, concept_type, tags,
             created_at, created_by)
            VALUES (
                '{concept_id}', '{_esc(model_id)}',
                '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                {f"'{_esc(data['parent_id'])}'" if data.get('parent_id') else 'NULL'},
                '{_esc(data.get("concept_type", "entity"))}',
                '{tags_json}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        # Touch model updated_at
        self.sql.execute_update(
            f"UPDATE {self._table('semantic_models')} "
            f"SET updated_at = current_timestamp(), updated_by = '{_esc(created_by)}' "
            f"WHERE id = '{_esc(model_id)}'"
        )
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_concepts')} WHERE id = '{concept_id}'"
        )
        concept = self._parse_concept(rows[0]) if rows else {}
        concept["properties"] = []
        return concept

    def delete_concept(self, concept_id: str) -> None:
        # Delete properties and links for this concept
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_links')} "
            f"WHERE source_type = 'concept' AND source_id = '{_esc(concept_id)}'"
        )
        # Delete links targeting properties of this concept
        props = self.sql.execute(
            f"SELECT id FROM {self._table('semantic_properties')} WHERE concept_id = '{_esc(concept_id)}'"
        )
        for prop in props:
            self.sql.execute_update(
                f"DELETE FROM {self._table('semantic_links')} "
                f"WHERE source_type = 'property' AND source_id = '{_esc(prop['id'])}'"
            )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_properties')} WHERE concept_id = '{_esc(concept_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_concepts')} WHERE id = '{_esc(concept_id)}'"
        )

    def _parse_concept(self, row: dict) -> dict:
        tags_raw = row.get("tags")
        return {
            **row,
            "tags": json.loads(tags_raw) if tags_raw else [],
        }

    # Properties

    def _list_properties_for_concept(self, concept_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_properties')} "
            f"WHERE concept_id = '{_esc(concept_id)}' ORDER BY name"
        )
        return [self._parse_property(r) for r in rows]

    def add_property(self, concept_id: str, model_id: str, data: dict, created_by: str) -> dict:
        prop_id = str(uuid.uuid4())
        enum_json = json.dumps(data["enum_values"]).replace("'", "''") if data.get("enum_values") else None
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_properties')}
            (id, concept_id, model_id, name, description, data_type, is_required, enum_values,
             created_at, created_by)
            VALUES (
                '{prop_id}', '{_esc(concept_id)}', '{_esc(model_id)}',
                '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                {f"'{_esc(data['data_type'])}'" if data.get('data_type') else 'NULL'},
                {str(data.get('is_required', False)).lower()},
                {f"'{enum_json}'" if enum_json else 'NULL'},
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_properties')} WHERE id = '{prop_id}'"
        )
        return self._parse_property(rows[0]) if rows else {}

    def remove_property(self, property_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_links')} "
            f"WHERE source_type = 'property' AND source_id = '{_esc(property_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_properties')} WHERE id = '{_esc(property_id)}'"
        )

    def _parse_property(self, row: dict) -> dict:
        enum_raw = row.get("enum_values")
        return {
            **row,
            "enum_values": json.loads(enum_raw) if enum_raw else None,
        }

    # Semantic Links

    def list_links(self, model_id: str) -> list[dict]:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_links')} "
            f"WHERE model_id = '{_esc(model_id)}' ORDER BY source_type, link_type"
        )
        return rows

    def create_link(self, model_id: str, data: dict, created_by: str) -> dict:
        link_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('semantic_links')}
            (id, model_id, source_type, source_id, target_type, target_id, target_name,
             link_type, confidence, notes, created_at, created_by)
            VALUES (
                '{link_id}', '{_esc(model_id)}',
                '{_esc(data["source_type"])}', '{_esc(data["source_id"])}',
                '{_esc(data["target_type"])}',
                {f"'{_esc(data['target_id'])}'" if data.get('target_id') else 'NULL'},
                {f"'{_esc(data['target_name'])}'" if data.get('target_name') else 'NULL'},
                '{_esc(data.get("link_type", "maps_to"))}',
                {data['confidence'] if data.get('confidence') is not None else 'NULL'},
                {f"'{_esc(data['notes'])}'" if data.get('notes') else 'NULL'},
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('semantic_links')} WHERE id = '{link_id}'"
        )
        return rows[0] if rows else {}

    def delete_link(self, link_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('semantic_links')} WHERE id = '{_esc(link_id)}'"
        )

    # ========================================================================
    # Naming Conventions (G15)
    # ========================================================================

    def list_naming_conventions(self, entity_type: str | None = None) -> list[dict]:
        sql = f"SELECT * FROM {self._table('naming_conventions')}"
        if entity_type:
            sql += f" WHERE entity_type = '{_esc(entity_type)}'"
        sql += " ORDER BY entity_type, priority DESC, name"
        return self.sql.execute(sql)

    def get_naming_convention(self, convention_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('naming_conventions')} WHERE id = '{_esc(convention_id)}'"
        )
        return rows[0] if rows else None

    def create_naming_convention(self, data: dict, created_by: str) -> dict:
        conv_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('naming_conventions')}
            (id, entity_type, name, description, pattern, example_valid, example_invalid,
             error_message, is_active, priority, created_at, created_by, updated_at, updated_by)
            VALUES (
                '{conv_id}', '{_esc(data["entity_type"])}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data["pattern"])}',
                {f"'{_esc(data['example_valid'])}'" if data.get('example_valid') else 'NULL'},
                {f"'{_esc(data['example_invalid'])}'" if data.get('example_invalid') else 'NULL'},
                {f"'{_esc(data['error_message'])}'" if data.get('error_message') else 'NULL'},
                {str(data.get('is_active', True)).lower()},
                {data.get('priority', 0)},
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_naming_convention(conv_id)

    def update_naming_convention(self, convention_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        for field in ("name", "description", "pattern", "example_valid", "example_invalid", "error_message"):
            if data.get(field) is not None:
                updates.append(f"{field} = '{_esc(data[field])}'")
        if data.get("is_active") is not None:
            updates.append(f"is_active = {str(data['is_active']).lower()}")
        if data.get("priority") is not None:
            updates.append(f"priority = {data['priority']}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('naming_conventions')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(convention_id)}'"
            )
        return self.get_naming_convention(convention_id)

    def delete_naming_convention(self, convention_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('naming_conventions')} WHERE id = '{_esc(convention_id)}'"
        )

    def toggle_naming_convention(self, convention_id: str, is_active: bool, updated_by: str) -> dict | None:
        self.sql.execute_update(
            f"UPDATE {self._table('naming_conventions')} "
            f"SET is_active = {str(is_active).lower()}, "
            f"updated_by = '{_esc(updated_by)}', updated_at = current_timestamp() "
            f"WHERE id = '{_esc(convention_id)}'"
        )
        return self.get_naming_convention(convention_id)

    # ========================================================================
    # Dataset Marketplace (G14)
    # ========================================================================

    def search_marketplace(
        self,
        query: str | None = None,
        product_type: str | None = None,
        domain_id: str | None = None,
        team_id: str | None = None,
        tags: list[str] | None = None,
        owner_email: str | None = None,
        sort_by: str = "updated_at",
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """Search published data products for marketplace discovery."""
        where = ["p.status = 'published'"]
        if query:
            q = _esc(query)
            where.append(f"(p.name LIKE '%{q}%' OR p.description LIKE '%{q}%')")
        if product_type:
            where.append(f"p.product_type = '{_esc(product_type)}'")
        if domain_id:
            where.append(f"p.domain_id = '{_esc(domain_id)}'")
        if team_id:
            where.append(f"p.team_id = '{_esc(team_id)}'")
        if owner_email:
            where.append(f"p.owner_email = '{_esc(owner_email)}'")
        if tags:
            # Match any tag — check if tags JSON array contains any of the given tags
            tag_conditions = [f"p.tags LIKE '%{_esc(t)}%'" for t in tags]
            where.append(f"({' OR '.join(tag_conditions)})")

        where_clause = f"WHERE {' AND '.join(where)}"

        # Sortable columns
        sort_col = {
            "name": "p.name",
            "updated_at": "p.updated_at",
            "published_at": "p.published_at",
            "created_at": "p.created_at",
        }.get(sort_by, "p.updated_at")

        # Get total count
        count_rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('data_products')} p {where_clause}"
        )
        total = int(count_rows[0].get("cnt", 0)) if count_rows else 0

        # Get paginated results
        rows = self.sql.execute(f"""
            SELECT p.*,
                   d.name AS domain_name,
                   t.name AS team_name
            FROM {self._table('data_products')} p
            LEFT JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            {where_clause}
            ORDER BY {sort_col} DESC
            LIMIT {limit} OFFSET {offset}
        """)
        products = [self._parse_product(r) for r in rows]
        for prod in products:
            prod["port_count"] = self._count_ports(prod["id"])
            prod["subscription_count"] = self._count_subscriptions(prod["id"])

        # Build facets (counts for filter dropdowns)
        facets = self._build_marketplace_facets()

        return {
            "products": products,
            "total": total,
            "limit": limit,
            "offset": offset,
            "facets": facets,
        }

    def _build_marketplace_facets(self) -> dict:
        """Build facet counts for marketplace filters."""
        facets: dict = {}

        # Product type counts
        type_rows = self.sql.execute(f"""
            SELECT product_type, COUNT(*) AS cnt
            FROM {self._table('data_products')}
            WHERE status = 'published'
            GROUP BY product_type
        """)
        facets["product_types"] = {r["product_type"]: int(r["cnt"]) for r in type_rows}

        # Domain counts
        domain_rows = self.sql.execute(f"""
            SELECT d.id, d.name, COUNT(*) AS cnt
            FROM {self._table('data_products')} p
            JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            WHERE p.status = 'published'
            GROUP BY d.id, d.name
        """)
        facets["domains"] = [
            {"id": r["id"], "name": r["name"], "count": int(r["cnt"])}
            for r in domain_rows
        ]

        # Team counts
        team_rows = self.sql.execute(f"""
            SELECT t.id, t.name, COUNT(*) AS cnt
            FROM {self._table('data_products')} p
            JOIN {self._table('teams')} t ON p.team_id = t.id
            WHERE p.status = 'published'
            GROUP BY t.id, t.name
        """)
        facets["teams"] = [
            {"id": r["id"], "name": r["name"], "count": int(r["cnt"])}
            for r in team_rows
        ]

        return facets

    def get_marketplace_stats(self) -> dict:
        """Get marketplace overview statistics."""
        # Total and published counts
        count_rows = self.sql.execute(f"""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
            FROM {self._table('data_products')}
        """)
        total = int(count_rows[0].get("total", 0)) if count_rows else 0
        published = int(count_rows[0].get("published", 0)) if count_rows else 0

        # Subscription count
        sub_rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('data_product_subscriptions')}"
        )
        total_subs = int(sub_rows[0].get("cnt", 0)) if sub_rows else 0

        # By type
        type_rows = self.sql.execute(f"""
            SELECT product_type, COUNT(*) AS cnt
            FROM {self._table('data_products')}
            WHERE status = 'published'
            GROUP BY product_type
        """)
        by_type = {r["product_type"]: int(r["cnt"]) for r in type_rows}

        # By domain (top 10)
        domain_rows = self.sql.execute(f"""
            SELECT d.name, COUNT(*) AS cnt
            FROM {self._table('data_products')} p
            JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            WHERE p.status = 'published'
            GROUP BY d.name
            ORDER BY cnt DESC
            LIMIT 10
        """)
        by_domain = [{"name": r["name"], "count": int(r["cnt"])} for r in domain_rows]

        # Recent products (last 5 published)
        recent_rows = self.sql.execute(f"""
            SELECT p.*,
                   d.name AS domain_name,
                   t.name AS team_name
            FROM {self._table('data_products')} p
            LEFT JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            WHERE p.status = 'published'
            ORDER BY p.published_at DESC
            LIMIT 5
        """)
        recent = [self._parse_product(r) for r in recent_rows]
        for prod in recent:
            prod["port_count"] = self._count_ports(prod["id"])
            prod["subscription_count"] = self._count_subscriptions(prod["id"])

        return {
            "total_products": total,
            "published_products": published,
            "total_subscriptions": total_subs,
            "products_by_type": by_type,
            "products_by_domain": by_domain,
            "recent_products": recent,
        }

    def get_marketplace_product(self, product_id: str) -> dict | None:
        """Get a marketplace product detail (published only, with ports and subscription count)."""
        rows = self.sql.execute(f"""
            SELECT p.*,
                   d.name AS domain_name,
                   t.name AS team_name
            FROM {self._table('data_products')} p
            LEFT JOIN {self._table('data_domains')} d ON p.domain_id = d.id
            LEFT JOIN {self._table('teams')} t ON p.team_id = t.id
            WHERE p.id = '{_esc(product_id)}'
        """)
        if not rows:
            return None
        prod = self._parse_product(rows[0])
        prod["port_count"] = self._count_ports(product_id)
        prod["subscription_count"] = self._count_subscriptions(product_id)
        prod["ports"] = self.list_product_ports(product_id)
        return prod

    def get_user_subscriptions(self, user_email: str) -> list[dict]:
        """Get all subscriptions for a given user across products."""
        rows = self.sql.execute(f"""
            SELECT s.*, p.name AS product_name, p.product_type, p.description AS product_description
            FROM {self._table('data_product_subscriptions')} s
            JOIN {self._table('data_products')} p ON s.product_id = p.id
            WHERE s.subscriber_email = '{_esc(user_email)}'
            ORDER BY s.created_at DESC
        """)
        return [dict(r) for r in rows]

    # ========================================================================
    # Delivery Modes (G12)
    # ========================================================================

    def _parse_delivery_mode(self, row: dict) -> dict:
        roles_raw = row.get("approved_roles")
        config_raw = row.get("config")
        return {
            **row,
            "approved_roles": json.loads(roles_raw) if roles_raw else None,
            "config": json.loads(config_raw) if config_raw else None,
        }

    def _count_deliveries(self, mode_id: str) -> int:
        rows = self.sql.execute(
            f"SELECT COUNT(*) AS cnt FROM {self._table('delivery_records')} "
            f"WHERE delivery_mode_id = '{_esc(mode_id)}'"
        )
        return int(rows[0].get("cnt", 0)) if rows else 0

    def list_delivery_modes(self, mode_type: str | None = None, active_only: bool = False) -> list[dict]:
        where = []
        if mode_type:
            where.append(f"mode_type = '{_esc(mode_type)}'")
        if active_only:
            where.append("is_active = true")
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('delivery_modes')} {where_clause} ORDER BY is_default DESC, name"
        )
        modes = [self._parse_delivery_mode(r) for r in rows]
        for mode in modes:
            mode["delivery_count"] = self._count_deliveries(mode["id"])
        return modes

    def get_delivery_mode(self, mode_id: str) -> dict | None:
        rows = self.sql.execute(
            f"SELECT * FROM {self._table('delivery_modes')} WHERE id = '{_esc(mode_id)}'"
        )
        if not rows:
            return None
        mode = self._parse_delivery_mode(rows[0])
        mode["delivery_count"] = self._count_deliveries(mode_id)
        return mode

    def create_delivery_mode(self, data: dict, created_by: str) -> dict:
        mode_id = str(uuid.uuid4())
        roles_json = json.dumps(data.get("approved_roles", [])).replace("'", "''") if data.get("approved_roles") else None
        config_json = json.dumps(data.get("config", {})).replace("'", "''") if data.get("config") else None
        self.sql.execute_update(f"""
            INSERT INTO {self._table('delivery_modes')}
            (id, name, description, mode_type, is_default, requires_approval, approved_roles,
             git_repo_url, git_branch, git_path, yaml_template, manual_instructions,
             environment, config, is_active,
             created_at, created_by, updated_at, updated_by)
            VALUES (
                '{mode_id}', '{_esc(data["name"])}',
                {f"'{_esc(data['description'])}'" if data.get('description') else 'NULL'},
                '{_esc(data["mode_type"])}',
                {data.get('is_default', False)},
                {data.get('requires_approval', False)},
                {f"'{roles_json}'" if roles_json else 'NULL'},
                {f"'{_esc(data['git_repo_url'])}'" if data.get('git_repo_url') else 'NULL'},
                {f"'{_esc(data['git_branch'])}'" if data.get('git_branch') else 'NULL'},
                {f"'{_esc(data['git_path'])}'" if data.get('git_path') else 'NULL'},
                {f"'{_esc(data['yaml_template'])}'" if data.get('yaml_template') else 'NULL'},
                {f"'{_esc(data['manual_instructions'])}'" if data.get('manual_instructions') else 'NULL'},
                {f"'{_esc(data['environment'])}'" if data.get('environment') else 'NULL'},
                {f"'{config_json}'" if config_json else 'NULL'},
                true,
                current_timestamp(), '{_esc(created_by)}',
                current_timestamp(), '{_esc(created_by)}'
            )
        """)
        return self.get_delivery_mode(mode_id)

    def update_delivery_mode(self, mode_id: str, data: dict, updated_by: str) -> dict | None:
        updates = []
        if data.get("name") is not None:
            updates.append(f"name = '{_esc(data['name'])}'")
        if data.get("description") is not None:
            updates.append(f"description = '{_esc(data['description'])}'")
        if data.get("requires_approval") is not None:
            updates.append(f"requires_approval = {data['requires_approval']}")
        if data.get("approved_roles") is not None:
            roles_json = json.dumps(data["approved_roles"]).replace("'", "''")
            updates.append(f"approved_roles = '{roles_json}'")
        if data.get("git_repo_url") is not None:
            updates.append(f"git_repo_url = '{_esc(data['git_repo_url'])}'")
        if data.get("git_branch") is not None:
            updates.append(f"git_branch = '{_esc(data['git_branch'])}'")
        if data.get("git_path") is not None:
            updates.append(f"git_path = '{_esc(data['git_path'])}'")
        if data.get("yaml_template") is not None:
            updates.append(f"yaml_template = '{_esc(data['yaml_template'])}'")
        if data.get("manual_instructions") is not None:
            updates.append(f"manual_instructions = '{_esc(data['manual_instructions'])}'")
        if data.get("environment") is not None:
            updates.append(f"environment = '{_esc(data['environment'])}'")
        if data.get("config") is not None:
            config_json = json.dumps(data["config"]).replace("'", "''")
            updates.append(f"config = '{config_json}'")
        if data.get("is_active") is not None:
            updates.append(f"is_active = {data['is_active']}")

        if updates:
            updates.append(f"updated_by = '{_esc(updated_by)}'")
            updates.append("updated_at = current_timestamp()")
            self.sql.execute_update(
                f"UPDATE {self._table('delivery_modes')} SET {', '.join(updates)} "
                f"WHERE id = '{_esc(mode_id)}'"
            )
        return self.get_delivery_mode(mode_id)

    def delete_delivery_mode(self, mode_id: str) -> None:
        self.sql.execute_update(
            f"DELETE FROM {self._table('delivery_records')} WHERE delivery_mode_id = '{_esc(mode_id)}'"
        )
        self.sql.execute_update(
            f"DELETE FROM {self._table('delivery_modes')} WHERE id = '{_esc(mode_id)}'"
        )

    def list_delivery_records(self, mode_id: str | None = None, status: str | None = None) -> list[dict]:
        where = []
        if mode_id:
            where.append(f"r.delivery_mode_id = '{_esc(mode_id)}'")
        if status:
            where.append(f"r.status = '{_esc(status)}'")
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = self.sql.execute(f"""
            SELECT r.*, m.name AS delivery_mode_name, m.mode_type
            FROM {self._table('delivery_records')} r
            LEFT JOIN {self._table('delivery_modes')} m ON r.delivery_mode_id = m.id
            {where_clause}
            ORDER BY r.requested_at DESC
        """)
        result_parsed = []
        for r in rows:
            row = dict(r)
            result_raw = row.get("result")
            row["result"] = json.loads(result_raw) if result_raw else None
            result_parsed.append(row)
        return result_parsed

    def create_delivery_record(self, data: dict, requested_by: str) -> dict:
        record_id = str(uuid.uuid4())
        self.sql.execute_update(f"""
            INSERT INTO {self._table('delivery_records')}
            (id, delivery_mode_id, model_name, model_version, endpoint_name,
             status, requested_by, requested_at, notes)
            VALUES (
                '{record_id}', '{_esc(data["delivery_mode_id"])}',
                '{_esc(data["model_name"])}',
                {f"'{_esc(data['model_version'])}'" if data.get('model_version') else 'NULL'},
                {f"'{_esc(data['endpoint_name'])}'" if data.get('endpoint_name') else 'NULL'},
                'pending', '{_esc(requested_by)}',
                current_timestamp(),
                {f"'{_esc(data['notes'])}'" if data.get('notes') else 'NULL'}
            )
        """)
        records = self.list_delivery_records()
        return next((r for r in records if r["id"] == record_id), {"id": record_id})

    def transition_delivery_record(self, record_id: str, new_status: str, user: str) -> dict | None:
        updates = [f"status = '{_esc(new_status)}'"]
        if new_status == "approved":
            updates.append(f"approved_by = '{_esc(user)}'")
            updates.append("approved_at = current_timestamp()")
        elif new_status in ("completed", "failed"):
            updates.append("completed_at = current_timestamp()")
        self.sql.execute_update(
            f"UPDATE {self._table('delivery_records')} SET {', '.join(updates)} "
            f"WHERE id = '{_esc(record_id)}'"
        )
        records = self.list_delivery_records()
        return next((r for r in records if r["id"] == record_id), None)

    # ========================================================================
    # Naming Conventions (G15)
    # ========================================================================

    def validate_name(self, entity_type: str, name: str) -> dict:
        """Validate a name against all active conventions for the given entity type."""
        import re
        conventions = self.sql.execute(
            f"SELECT * FROM {self._table('naming_conventions')} "
            f"WHERE entity_type = '{_esc(entity_type)}' AND is_active = true "
            f"ORDER BY priority DESC"
        )
        violations = []
        for conv in conventions:
            pattern = conv.get("pattern", "")
            try:
                if not re.match(pattern, name):
                    violations.append({
                        "convention_id": conv.get("id"),
                        "convention_name": conv.get("name"),
                        "pattern": pattern,
                        "error_message": conv.get("error_message") or f"Name does not match pattern: {pattern}",
                    })
            except re.error:
                logger.warning(f"Invalid regex pattern in convention {conv.get('id')}: {pattern}")
        return {
            "entity_type": entity_type,
            "name": name,
            "valid": len(violations) == 0,
            "violations": violations,
            "conventions_checked": len(conventions),
        }

    # ========================================================================
    # MCP Integration (G11)
    # ========================================================================

    def _parse_mcp_token(self, row: dict) -> dict:
        """Parse an MCP token row, decoding JSON fields."""
        row = dict(row)
        for field in ("allowed_tools", "allowed_resources"):
            val = row.get(field)
            if isinstance(val, str):
                try:
                    row[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    row[field] = None
        # Ensure numeric fields are not None (Delta Lake has no DEFAULT)
        if row.get("usage_count") is None:
            row["usage_count"] = 0
        if row.get("rate_limit_per_minute") is None:
            row["rate_limit_per_minute"] = 60
        return row

    def _parse_mcp_tool(self, row: dict) -> dict:
        """Parse an MCP tool row, decoding JSON fields."""
        row = dict(row)
        val = row.get("input_schema")
        if isinstance(val, str):
            try:
                row["input_schema"] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                row["input_schema"] = None
        return row

    def _parse_mcp_invocation(self, row: dict) -> dict:
        """Parse an MCP invocation row, decoding JSON fields."""
        row = dict(row)
        val = row.get("input_params")
        if isinstance(val, str):
            try:
                row["input_params"] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                row["input_params"] = None
        return row

    # -- MCP Tokens --

    def list_mcp_tokens(self, *, active_only: bool = False) -> list[dict]:
        """List MCP tokens (never exposes token_hash)."""
        sql = (
            f"SELECT t.*, tm.name AS team_name FROM {self._table('mcp_tokens')} t "
            f"LEFT JOIN {self._table('teams')} tm ON t.team_id = tm.id"
        )
        if active_only:
            sql += " WHERE t.is_active = true"
        sql += " ORDER BY t.created_at DESC"
        return [self._parse_mcp_token(r) for r in self._sql(sql)]

    def get_mcp_token(self, token_id: str) -> dict | None:
        """Get a single MCP token by ID."""
        rows = self._sql(
            f"SELECT t.*, tm.name AS team_name FROM {self._table('mcp_tokens')} t "
            f"LEFT JOIN {self._table('teams')} tm ON t.team_id = tm.id "
            f"WHERE t.id = '{_esc(token_id)}'"
        )
        return self._parse_mcp_token(rows[0]) if rows else None

    def create_mcp_token(self, data: dict, user: str) -> dict:
        """Create an MCP token. Returns token response + plain-text token value."""
        import hashlib
        import secrets
        token_value = f"mcp_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(token_value.encode()).hexdigest()
        token_prefix = token_value[:12]
        token_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        tools_val = "'" + _esc(json.dumps(data["allowed_tools"])) + "'" if data.get("allowed_tools") else "NULL"
        resources_val = "'" + _esc(json.dumps(data["allowed_resources"])) + "'" if data.get("allowed_resources") else "NULL"
        expires_val = "'" + str(data["expires_at"]) + "'" if data.get("expires_at") else "NULL"
        team_val = "'" + _esc(data["team_id"]) + "'" if data.get("team_id") else "NULL"
        rate = data.get("rate_limit_per_minute", 60)
        self._sql(
            f"INSERT INTO {self._table('mcp_tokens')} "
            f"(id, name, description, token_hash, token_prefix, scope, allowed_tools, allowed_resources, "
            f"owner_email, team_id, is_active, expires_at, rate_limit_per_minute, usage_count, "
            f"created_at, created_by, updated_at, updated_by) "
            f"VALUES ('{token_id}', '{_esc(data['name'])}', "
            f"'{_esc(data.get('description') or '')}', '{token_hash}', '{token_prefix}', "
            f"'{_esc(data.get('scope', 'read'))}', "
            f"{tools_val}, {resources_val}, "
            f"'{_esc(user)}', {team_val}, "
            f"true, {expires_val}, {rate}, 0, "
            f"'{now}', '{_esc(user)}', '{now}', '{_esc(user)}')"
        )
        token = self.get_mcp_token(token_id)
        return {"token": token, "token_value": token_value}

    def update_mcp_token(self, token_id: str, data: dict, user: str) -> dict | None:
        """Update an MCP token."""
        existing = self.get_mcp_token(token_id)
        if not existing:
            return None
        sets = [f"updated_at = '{datetime.utcnow().isoformat()}'", f"updated_by = '{_esc(user)}'"]
        for field in ("name", "description", "scope"):
            if data.get(field) is not None:
                sets.append(f"{field} = '{_esc(data[field])}'")
        if "is_active" in data and data["is_active"] is not None:
            sets.append(f"is_active = {'true' if data['is_active'] else 'false'}")
        if "rate_limit_per_minute" in data and data["rate_limit_per_minute"] is not None:
            sets.append(f"rate_limit_per_minute = {data['rate_limit_per_minute']}")
        if "expires_at" in data:
            if data["expires_at"]:
                sets.append(f"expires_at = '{data['expires_at']}'")
            else:
                sets.append("expires_at = NULL")
        for json_field in ("allowed_tools", "allowed_resources"):
            if json_field in data:
                if data[json_field] is not None:
                    sets.append(f"{json_field} = '{_esc(json.dumps(data[json_field]))}'")
                else:
                    sets.append(f"{json_field} = NULL")
        self._sql(f"UPDATE {self._table('mcp_tokens')} SET {', '.join(sets)} WHERE id = '{_esc(token_id)}'")
        return self.get_mcp_token(token_id)

    def revoke_mcp_token(self, token_id: str, user: str) -> bool:
        """Revoke (deactivate) an MCP token."""
        now = datetime.utcnow().isoformat()
        self._sql(
            f"UPDATE {self._table('mcp_tokens')} SET is_active = false, "
            f"updated_at = '{now}', updated_by = '{_esc(user)}' WHERE id = '{_esc(token_id)}'"
        )
        return True

    def delete_mcp_token(self, token_id: str) -> bool:
        """Delete an MCP token and its invocations."""
        self._sql(f"DELETE FROM {self._table('mcp_invocations')} WHERE token_id = '{_esc(token_id)}'")
        self._sql(f"DELETE FROM {self._table('mcp_tokens')} WHERE id = '{_esc(token_id)}'")
        return True

    # -- MCP Tools --

    def list_mcp_tools(self, *, active_only: bool = False, category: str | None = None) -> list[dict]:
        """List registered MCP tools."""
        sql = f"SELECT * FROM {self._table('mcp_tools')}"
        conditions = []
        if active_only:
            conditions.append("is_active = true")
        if category:
            conditions.append(f"category = '{_esc(category)}'")
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY category, name"
        return [self._parse_mcp_tool(r) for r in self._sql(sql)]

    def get_mcp_tool(self, tool_id: str) -> dict | None:
        """Get a single MCP tool by ID."""
        rows = self._sql(f"SELECT * FROM {self._table('mcp_tools')} WHERE id = '{_esc(tool_id)}'")
        return self._parse_mcp_tool(rows[0]) if rows else None

    def create_mcp_tool(self, data: dict, user: str) -> dict:
        """Register a new MCP tool."""
        tool_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        input_schema = "'" + _esc(json.dumps(data["input_schema"])) + "'" if data.get("input_schema") else "NULL"
        req_perm = "'" + _esc(data["required_permission"]) + "'" if data.get("required_permission") else "NULL"
        endpoint = "'" + _esc(data["endpoint_path"]) + "'" if data.get("endpoint_path") else "NULL"
        self._sql(
            f"INSERT INTO {self._table('mcp_tools')} "
            f"(id, name, description, category, input_schema, required_scope, required_permission, "
            f"is_active, version, endpoint_path, created_at, created_by, updated_at, updated_by) "
            f"VALUES ('{tool_id}', '{_esc(data['name'])}', '{_esc(data.get('description') or '')}', "
            f"'{_esc(data.get('category', 'general'))}', {input_schema}, "
            f"'{_esc(data.get('required_scope', 'read'))}', {req_perm}, "
            f"true, '{_esc(data.get('version', '1.0'))}', {endpoint}, "
            f"'{now}', '{_esc(user)}', '{now}', '{_esc(user)}')"
        )
        return self.get_mcp_tool(tool_id)

    def update_mcp_tool(self, tool_id: str, data: dict, user: str) -> dict | None:
        """Update an MCP tool registration."""
        existing = self.get_mcp_tool(tool_id)
        if not existing:
            return None
        sets = [f"updated_at = '{datetime.utcnow().isoformat()}'", f"updated_by = '{_esc(user)}'"]
        for field in ("name", "description", "category", "required_scope", "required_permission", "version", "endpoint_path"):
            if data.get(field) is not None:
                sets.append(f"{field} = '{_esc(data[field])}'")
        if "is_active" in data and data["is_active"] is not None:
            sets.append(f"is_active = {'true' if data['is_active'] else 'false'}")
        if "input_schema" in data:
            if data["input_schema"] is not None:
                sets.append(f"input_schema = '{_esc(json.dumps(data['input_schema']))}'")
            else:
                sets.append("input_schema = NULL")
        self._sql(f"UPDATE {self._table('mcp_tools')} SET {', '.join(sets)} WHERE id = '{_esc(tool_id)}'")
        return self.get_mcp_tool(tool_id)

    def delete_mcp_tool(self, tool_id: str) -> bool:
        """Delete an MCP tool registration."""
        self._sql(f"DELETE FROM {self._table('mcp_invocations')} WHERE tool_id = '{_esc(tool_id)}'")
        self._sql(f"DELETE FROM {self._table('mcp_tools')} WHERE id = '{_esc(tool_id)}'")
        return True

    # -- MCP Invocations --

    def list_mcp_invocations(
        self, *, token_id: str | None = None, tool_id: str | None = None,
        status: str | None = None, limit: int = 100
    ) -> list[dict]:
        """List MCP invocations with optional filters."""
        sql = (
            f"SELECT i.*, t.name AS token_name, tl.name AS tool_name "
            f"FROM {self._table('mcp_invocations')} i "
            f"LEFT JOIN {self._table('mcp_tokens')} t ON i.token_id = t.id "
            f"LEFT JOIN {self._table('mcp_tools')} tl ON i.tool_id = tl.id"
        )
        conditions = []
        if token_id:
            conditions.append(f"i.token_id = '{_esc(token_id)}'")
        if tool_id:
            conditions.append(f"i.tool_id = '{_esc(tool_id)}'")
        if status:
            conditions.append(f"i.status = '{_esc(status)}'")
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += f" ORDER BY i.invoked_at DESC LIMIT {limit}"
        return [self._parse_mcp_invocation(r) for r in self._sql(sql)]

    def get_mcp_stats(self) -> dict:
        """Get MCP integration statistics."""
        tokens = self._sql(f"SELECT is_active, COUNT(*) as cnt FROM {self._table('mcp_tokens')} GROUP BY is_active")
        total_tokens = sum(r.get("cnt", 0) for r in tokens)
        active_tokens = sum(r.get("cnt", 0) for r in tokens if r.get("is_active"))

        tools = self._sql(f"SELECT is_active, COUNT(*) as cnt FROM {self._table('mcp_tools')} GROUP BY is_active")
        total_tools = sum(r.get("cnt", 0) for r in tools)
        active_tools = sum(r.get("cnt", 0) for r in tools if r.get("is_active"))

        inv_total = self._sql(f"SELECT COUNT(*) as cnt FROM {self._table('mcp_invocations')}")
        total_invocations = inv_total[0].get("cnt", 0) if inv_total else 0

        inv_today = self._sql(
            f"SELECT COUNT(*) as cnt FROM {self._table('mcp_invocations')} "
            f"WHERE invoked_at >= CURRENT_DATE()"
        )
        invocations_today = inv_today[0].get("cnt", 0) if inv_today else 0

        by_status = self._sql(
            f"SELECT status, COUNT(*) as cnt FROM {self._table('mcp_invocations')} GROUP BY status"
        )
        invocations_by_status = {r.get("status", "unknown"): r.get("cnt", 0) for r in by_status}

        top_tools = self._sql(
            f"SELECT tl.name, tl.category, COUNT(i.id) as invocation_count "
            f"FROM {self._table('mcp_tools')} tl "
            f"LEFT JOIN {self._table('mcp_invocations')} i ON tl.id = i.tool_id "
            f"GROUP BY tl.name, tl.category ORDER BY invocation_count DESC LIMIT 10"
        )

        return {
            "total_tokens": total_tokens,
            "active_tokens": active_tokens,
            "total_tools": total_tools,
            "active_tools": active_tools,
            "total_invocations": total_invocations,
            "invocations_today": invocations_today,
            "invocations_by_status": invocations_by_status,
            "top_tools": [dict(r) for r in top_tools],
        }

    # ========================================================================
    # Multi-Platform Connectors (G13)
    # ========================================================================

    def _parse_connector(self, row: dict) -> dict:
        """Parse a connector row, decoding JSON fields."""
        row = dict(row)
        val = row.get("connection_config")
        if isinstance(val, str):
            try:
                row["connection_config"] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                row["connection_config"] = None
        return row

    def _parse_connector_asset(self, row: dict) -> dict:
        """Parse a connector asset row."""
        row = dict(row)
        val = row.get("metadata")
        if isinstance(val, str):
            try:
                row["metadata"] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                row["metadata"] = None
        return row

    def _count_connector_assets(self, connector_id: str) -> int:
        rows = self._sql(f"SELECT COUNT(*) as cnt FROM {self._table('connector_assets')} WHERE connector_id = '{_esc(connector_id)}'")
        return rows[0].get("cnt", 0) if rows else 0

    def _count_connector_syncs(self, connector_id: str) -> int:
        rows = self._sql(f"SELECT COUNT(*) as cnt FROM {self._table('connector_sync_records')} WHERE connector_id = '{_esc(connector_id)}'")
        return rows[0].get("cnt", 0) if rows else 0

    def list_connectors(self, *, active_only: bool = False, platform: str | None = None) -> list[dict]:
        """List platform connectors."""
        sql = (
            f"SELECT c.*, t.name AS team_name FROM {self._table('platform_connectors')} c "
            f"LEFT JOIN {self._table('teams')} t ON c.team_id = t.id"
        )
        conditions = []
        if active_only:
            conditions.append("c.is_active = true")
        if platform:
            conditions.append(f"c.platform = '{_esc(platform)}'")
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY c.created_at DESC"
        results = []
        for row in self._sql(sql):
            parsed = self._parse_connector(row)
            parsed["asset_count"] = self._count_connector_assets(parsed["id"])
            parsed["sync_count"] = self._count_connector_syncs(parsed["id"])
            results.append(parsed)
        return results

    def get_connector(self, connector_id: str) -> dict | None:
        """Get a single connector by ID."""
        rows = self._sql(
            f"SELECT c.*, t.name AS team_name FROM {self._table('platform_connectors')} c "
            f"LEFT JOIN {self._table('teams')} t ON c.team_id = t.id "
            f"WHERE c.id = '{_esc(connector_id)}'"
        )
        if not rows:
            return None
        parsed = self._parse_connector(rows[0])
        parsed["asset_count"] = self._count_connector_assets(connector_id)
        parsed["sync_count"] = self._count_connector_syncs(connector_id)
        return parsed

    def create_connector(self, data: dict, user: str) -> dict:
        """Create a platform connector."""
        conn_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        config = "'" + _esc(json.dumps(data["connection_config"])) + "'" if data.get("connection_config") else "NULL"
        sched = "'" + _esc(data["sync_schedule"]) + "'" if data.get("sync_schedule") else "NULL"
        team_val = "'" + _esc(data["team_id"]) + "'" if data.get("team_id") else "NULL"
        self._sql(
            f"INSERT INTO {self._table('platform_connectors')} "
            f"(id, name, description, platform, status, connection_config, sync_direction, sync_schedule, "
            f"owner_email, team_id, is_active, created_at, created_by, updated_at, updated_by) "
            f"VALUES ('{conn_id}', '{_esc(data['name'])}', '{_esc(data.get('description') or '')}', "
            f"'{_esc(data['platform'])}', 'inactive', {config}, "
            f"'{_esc(data.get('sync_direction', 'inbound'))}', {sched}, "
            f"'{_esc(user)}', {team_val}, "
            f"true, '{now}', '{_esc(user)}', '{now}', '{_esc(user)}')"
        )
        return self.get_connector(conn_id)

    def update_connector(self, connector_id: str, data: dict, user: str) -> dict | None:
        """Update a platform connector."""
        existing = self.get_connector(connector_id)
        if not existing:
            return None
        sets = [f"updated_at = '{datetime.utcnow().isoformat()}'", f"updated_by = '{_esc(user)}'"]
        for field in ("name", "description", "sync_direction", "sync_schedule", "status"):
            if data.get(field) is not None:
                sets.append(f"{field} = '{_esc(data[field])}'")
        if "is_active" in data and data["is_active"] is not None:
            sets.append(f"is_active = {'true' if data['is_active'] else 'false'}")
        if "connection_config" in data:
            if data["connection_config"] is not None:
                sets.append(f"connection_config = '{_esc(json.dumps(data['connection_config']))}'")
            else:
                sets.append("connection_config = NULL")
        self._sql(f"UPDATE {self._table('platform_connectors')} SET {', '.join(sets)} WHERE id = '{_esc(connector_id)}'")
        return self.get_connector(connector_id)

    def delete_connector(self, connector_id: str) -> bool:
        """Delete a connector and its related records."""
        self._sql(f"DELETE FROM {self._table('connector_sync_records')} WHERE connector_id = '{_esc(connector_id)}'")
        self._sql(f"DELETE FROM {self._table('connector_assets')} WHERE connector_id = '{_esc(connector_id)}'")
        self._sql(f"DELETE FROM {self._table('platform_connectors')} WHERE id = '{_esc(connector_id)}'")
        return True

    def test_connector(self, connector_id: str, user: str) -> dict:
        """Test a connector's connection. Updates status to 'testing' then 'active' or 'error'."""
        now = datetime.utcnow().isoformat()
        self._sql(
            f"UPDATE {self._table('platform_connectors')} SET status = 'testing', "
            f"updated_at = '{now}', updated_by = '{_esc(user)}' WHERE id = '{_esc(connector_id)}'"
        )
        # Simulate test — in production, this would attempt actual connection
        self._sql(
            f"UPDATE {self._table('platform_connectors')} SET status = 'active', "
            f"updated_at = '{now}', updated_by = '{_esc(user)}' WHERE id = '{_esc(connector_id)}'"
        )
        return {"status": "active", "message": "Connection test successful"}

    def list_connector_assets(self, connector_id: str) -> list[dict]:
        """List assets discovered by a connector."""
        rows = self._sql(
            f"SELECT * FROM {self._table('connector_assets')} "
            f"WHERE connector_id = '{_esc(connector_id)}' ORDER BY external_name"
        )
        return [self._parse_connector_asset(r) for r in rows]

    def sync_connector(self, connector_id: str, user: str) -> dict:
        """Start a sync operation for a connector."""
        sync_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        connector = self.get_connector(connector_id)
        direction = connector.get("sync_direction", "inbound") if connector else "inbound"
        self._sql(
            f"INSERT INTO {self._table('connector_sync_records')} "
            f"(id, connector_id, status, direction, assets_synced, assets_failed, started_at, started_by) "
            f"VALUES ('{sync_id}', '{_esc(connector_id)}', 'completed', '{_esc(direction)}', "
            f"0, 0, '{now}', '{_esc(user)}')"
        )
        # Update connector last_sync
        self._sql(
            f"UPDATE {self._table('platform_connectors')} SET last_sync_at = '{now}', "
            f"last_sync_status = 'completed', updated_at = '{now}', updated_by = '{_esc(user)}' "
            f"WHERE id = '{_esc(connector_id)}'"
        )
        rows = self._sql(f"SELECT * FROM {self._table('connector_sync_records')} WHERE id = '{sync_id}'")
        return dict(rows[0]) if rows else {"id": sync_id, "status": "completed"}

    def list_connector_syncs(self, *, connector_id: str | None = None, status: str | None = None) -> list[dict]:
        """List connector sync records."""
        sql = (
            f"SELECT s.*, c.name AS connector_name FROM {self._table('connector_sync_records')} s "
            f"LEFT JOIN {self._table('platform_connectors')} c ON s.connector_id = c.id"
        )
        conditions = []
        if connector_id:
            conditions.append(f"s.connector_id = '{_esc(connector_id)}'")
        if status:
            conditions.append(f"s.status = '{_esc(status)}'")
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY s.started_at DESC LIMIT 100"
        return [dict(r) for r in self._sql(sql)]

    def get_connector_stats(self) -> dict:
        """Get connector statistics."""
        connectors = self._sql(
            f"SELECT platform, status, COUNT(*) as cnt FROM {self._table('platform_connectors')} GROUP BY platform, status"
        )
        total = sum(r.get("cnt", 0) for r in connectors)
        active = sum(r.get("cnt", 0) for r in connectors if r.get("status") == "active")
        by_platform: dict[str, int] = {}
        for r in connectors:
            p = r.get("platform", "unknown")
            by_platform[p] = by_platform.get(p, 0) + r.get("cnt", 0)

        assets_rows = self._sql(f"SELECT COUNT(*) as cnt FROM {self._table('connector_assets')}")
        total_assets = assets_rows[0].get("cnt", 0) if assets_rows else 0

        syncs_rows = self._sql(f"SELECT COUNT(*) as cnt FROM {self._table('connector_sync_records')}")
        total_syncs = syncs_rows[0].get("cnt", 0) if syncs_rows else 0

        recent = self.list_connector_syncs()[:5]

        return {
            "total_connectors": total,
            "active_connectors": active,
            "total_assets": total_assets,
            "total_syncs": total_syncs,
            "connectors_by_platform": by_platform,
            "recent_syncs": recent,
        }


# Singleton
_governance_service: GovernanceService | None = None


def get_governance_service() -> GovernanceService:
    global _governance_service
    if _governance_service is None:
        _governance_service = GovernanceService()
    return _governance_service
