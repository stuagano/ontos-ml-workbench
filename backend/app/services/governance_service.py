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


# Singleton
_governance_service: GovernanceService | None = None


def get_governance_service() -> GovernanceService:
    global _governance_service
    if _governance_service is None:
        _governance_service = GovernanceService()
    return _governance_service
