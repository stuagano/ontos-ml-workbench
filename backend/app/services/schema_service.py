"""Schema management service for Unity Catalog table health and versioning."""

import os
from typing import Dict, List, Optional
from datetime import datetime
from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound


class SchemaService:
    """Service for schema deployment status, table health, and version tracking."""

    # All 33 expected tables in the schema
    EXPECTED_TABLES = [
        "sheets", "templates", "canonical_labels", "training_sheets",
        "qa_pairs", "model_training_lineage", "example_store",
        "labeling_jobs", "labeling_tasks", "labeled_items",
        "model_evaluations", "identified_gaps", "annotation_tasks",
        "bit_attribution", "dqx_quality_results", "endpoint_metrics",
        "app_roles", "user_role_assignments", "teams", "team_members",
        "data_domains", "asset_reviews", "projects", "project_members",
        "data_contracts", "compliance_policies", "workflows",
        "data_products", "semantic_models", "naming_conventions",
        "delivery_modes", "mcp_integration", "platform_connectors"
    ]

    def __init__(self, client: WorkspaceClient):
        self.client = client
        self.catalog = os.getenv("DATABRICKS_CATALOG", "main")
        self.schema = os.getenv("DATABRICKS_SCHEMA", "ontos_ml")

    def get_schema_status(self) -> Dict:
        """Get comprehensive schema deployment status."""
        warehouse_id = self._get_warehouse_id()

        # Check connection
        connection_status = self._check_connection(warehouse_id)

        # Check table health
        table_health = self._check_table_health(warehouse_id)

        # Get schema version
        version_info = self._get_version_info()

        return {
            "connection": connection_status,
            "catalog": self.catalog,
            "schema": self.schema,
            "warehouse_id": warehouse_id,
            "table_health": table_health,
            "version": version_info,
            "timestamp": datetime.utcnow().isoformat()
        }

    def _get_warehouse_id(self) -> Optional[str]:
        """Get SQL warehouse ID from environment or list."""
        warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID")
        if warehouse_id:
            return warehouse_id

        # Fallback: Get first available warehouse
        warehouses = list(self.client.warehouses.list())
        return warehouses[0].id if warehouses else None

    def _check_connection(self, warehouse_id: Optional[str]) -> Dict:
        """Check Unity Catalog connection status."""
        try:
            if not warehouse_id:
                return {
                    "status": "error",
                    "message": "No SQL warehouse available"
                }

            # Try to query catalog
            result = self.client.statement_execution.execute_statement(
                warehouse_id=warehouse_id,
                statement=f"SHOW CATALOGS LIKE '{self.catalog}'",
                wait_timeout="10s"
            )

            if result.result and result.result.data_array:
                return {
                    "status": "connected",
                    "message": f"Connected to {self.catalog}.{self.schema}"
                }
            else:
                return {
                    "status": "warning",
                    "message": f"Catalog '{self.catalog}' not found"
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection failed: {str(e)}"
            }

    def _check_table_health(self, warehouse_id: Optional[str]) -> Dict:
        """Check which expected tables exist and get row counts."""
        if not warehouse_id:
            return {
                "total_expected": len(self.EXPECTED_TABLES),
                "total_existing": 0,
                "health_percentage": 0.0,
                "tables": []
            }

        tables_status = []
        existing_count = 0

        for table_name in self.EXPECTED_TABLES:
            try:
                # Check if table exists and get row count
                result = self.client.statement_execution.execute_statement(
                    warehouse_id=warehouse_id,
                    statement=f"SELECT COUNT(*) as cnt FROM {self.catalog}.{self.schema}.{table_name}",
                    wait_timeout="10s"
                )

                row_count = 0
                if result.result and result.result.data_array:
                    row_count = result.result.data_array[0][0]

                tables_status.append({
                    "name": table_name,
                    "exists": True,
                    "row_count": row_count,
                    "status": "healthy"
                })
                existing_count += 1
            except NotFound:
                tables_status.append({
                    "name": table_name,
                    "exists": False,
                    "row_count": 0,
                    "status": "missing"
                })
            except Exception as e:
                tables_status.append({
                    "name": table_name,
                    "exists": True,
                    "row_count": None,
                    "status": "error",
                    "error": str(e)
                })
                existing_count += 1

        health_percentage = (existing_count / len(self.EXPECTED_TABLES)) * 100

        return {
            "total_expected": len(self.EXPECTED_TABLES),
            "total_existing": existing_count,
            "health_percentage": round(health_percentage, 1),
            "tables": tables_status
        }

    def _get_version_info(self) -> Dict:
        """Get schema version from VERSION.json file."""
        version_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "schemas",
            "VERSION.json"
        )

        try:
            import json
            with open(version_file, 'r') as f:
                version_data = json.load(f)

            latest = version_data.get("changes", [{}])[0]
            return {
                "current_version": version_data.get("version", "unknown"),
                "last_updated": version_data.get("last_updated", "unknown"),
                "description": latest.get("description", "No description"),
                "tables_in_version": len(latest.get("tables_added", []))
            }
        except FileNotFoundError:
            return {
                "current_version": "1.0.0",
                "last_updated": "unknown",
                "description": "Schema version tracking not yet configured",
                "tables_in_version": 33
            }
        except Exception as e:
            return {
                "current_version": "unknown",
                "last_updated": "unknown",
                "description": f"Error reading version: {str(e)}",
                "tables_in_version": 0
            }

    def trigger_schema_deployment(self) -> Dict:
        """Trigger schema deployment job (if configured in DAB)."""
        # This would trigger the DAB job once it's configured
        # For now, return a placeholder
        return {
            "status": "not_configured",
            "message": "Schema deployment job not yet configured in DAB. Run 'python schemas/execute_all.py' manually."
        }
