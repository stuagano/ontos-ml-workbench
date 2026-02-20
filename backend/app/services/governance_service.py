"""Governance service - RBAC roles, teams, and data domains."""

import json
import logging
import uuid

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


# Singleton
_governance_service: GovernanceService | None = None


def get_governance_service() -> GovernanceService:
    global _governance_service
    if _governance_service is None:
        _governance_service = GovernanceService()
    return _governance_service
