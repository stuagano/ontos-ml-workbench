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


# Singleton
_governance_service: GovernanceService | None = None


def get_governance_service() -> GovernanceService:
    global _governance_service
    if _governance_service is None:
        _governance_service = GovernanceService()
    return _governance_service
