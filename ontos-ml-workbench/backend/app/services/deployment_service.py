"""
Deployment Service
==================

Manages model deployments to Databricks Model Serving.
Provides one-click deployment from trained models to serving endpoints.
"""

import logging
import uuid
from datetime import datetime
from typing import Any

from databricks.sdk.service.serving import (
    EndpointCoreConfigInput,
    Route,
    ServedEntityInput,
    TrafficConfig,
)

from app.core.databricks import get_current_user, get_workspace_client
from app.services.sql_service import get_sql_service

logger = logging.getLogger(__name__)


class DeploymentService:
    """Service for deploying models to Databricks Model Serving."""

    def __init__(self):
        self.client = get_workspace_client()
        self.sql = get_sql_service()

    def list_models(self, catalog: str | None = None) -> list[dict[str, Any]]:
        """
        List models from Unity Catalog Model Registry.

        Args:
            catalog: Optional catalog to filter by

        Returns:
            List of model info dicts
        """
        models = []
        try:
            # List registered models from UC
            for model in self.client.registered_models.list():
                if catalog and not model.full_name.startswith(f"{catalog}."):
                    continue

                models.append(
                    {
                        "name": model.name,
                        "full_name": model.full_name,
                        "description": model.comment,
                        "created_at": model.created_at,
                        "updated_at": model.updated_at,
                    }
                )
        except Exception as e:
            logger.error(f"Error listing models: {e}")

        return models

    def list_model_versions(self, model_name: str) -> list[dict[str, Any]]:
        """
        List versions of a model.

        Args:
            model_name: Full model name (catalog.schema.model)

        Returns:
            List of version info dicts
        """
        versions = []
        try:
            for version in self.client.model_versions.list(full_name=model_name):
                versions.append(
                    {
                        "version": version.version,
                        "status": version.status.value if version.status else "unknown",
                        "created_at": version.created_at,
                        "run_id": version.run_id,
                        "description": version.comment,
                    }
                )
        except Exception as e:
            logger.error(f"Error listing model versions: {e}")

        return versions

    def list_serving_endpoints(self) -> list[dict[str, Any]]:
        """
        List all serving endpoints.

        Returns:
            List of endpoint info dicts
        """
        endpoints = []
        try:
            for endpoint in self.client.serving_endpoints.list():
                state = endpoint.state
                endpoints.append(
                    {
                        "name": endpoint.name,
                        "state": state.ready.value
                        if state and state.ready
                        else "unknown",
                        "config_update": state.config_update.value
                        if state and state.config_update
                        else None,
                        "creator": endpoint.creator,
                        "created_at": endpoint.creation_timestamp,
                    }
                )
        except Exception as e:
            logger.error(f"Error listing endpoints: {e}")

        return endpoints

    def get_endpoint_status(self, endpoint_name: str) -> dict[str, Any]:
        """
        Get detailed status of a serving endpoint.

        Args:
            endpoint_name: Name of the endpoint

        Returns:
            Endpoint status info
        """
        try:
            endpoint = self.client.serving_endpoints.get(endpoint_name)
            state = endpoint.state

            return {
                "name": endpoint.name,
                "state": state.ready.value if state and state.ready else "unknown",
                "config_update": state.config_update.value
                if state and state.config_update
                else None,
                "served_entities": [
                    {
                        "name": entity.name,
                        "entity_name": entity.entity_name,
                        "entity_version": entity.entity_version,
                        "state": entity.state.deployment.value
                        if entity.state and entity.state.deployment
                        else "unknown",
                        "scale_to_zero": entity.scale_to_zero_enabled,
                    }
                    for entity in (endpoint.config.served_entities or [])
                ]
                if endpoint.config
                else [],
                "creator": endpoint.creator,
                "created_at": endpoint.creation_timestamp,
            }
        except Exception as e:
            logger.error(f"Error getting endpoint status: {e}")
            raise

    def deploy_model(
        self,
        model_name: str,
        model_version: str,
        endpoint_name: str | None = None,
        workload_size: str = "Small",
        scale_to_zero: bool = True,
        environment_vars: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Deploy a model to a serving endpoint.

        Args:
            model_name: Full model name (catalog.schema.model)
            model_version: Model version to deploy
            endpoint_name: Endpoint name (auto-generated if not provided)
            workload_size: Size of serving compute (Small, Medium, Large)
            scale_to_zero: Whether to scale to zero when idle
            environment_vars: Optional environment variables

        Returns:
            Deployment result with endpoint info
        """
        # Generate endpoint name if not provided
        if not endpoint_name:
            # Use model name but make it DNS-compatible
            base_name = model_name.split(".")[-1]  # Get just model name
            endpoint_name = f"{base_name}-v{model_version}".lower().replace("_", "-")

        user = get_current_user()
        deployment_id = str(uuid.uuid4())

        try:
            # Check if endpoint already exists
            existing = None
            try:
                existing = self.client.serving_endpoints.get(endpoint_name)
            except Exception:
                pass  # Endpoint doesn't exist, will create new

            if existing:
                # Update existing endpoint
                logger.info(f"Updating existing endpoint: {endpoint_name}")

                served_entity = ServedEntityInput(
                    entity_name=model_name,
                    entity_version=model_version,
                    workload_size=workload_size,
                    scale_to_zero_enabled=scale_to_zero,
                    environment_vars=environment_vars,
                )

                self.client.serving_endpoints.update_config(
                    name=endpoint_name,
                    served_entities=[served_entity],
                )

                action = "updated"
            else:
                # Create new endpoint
                logger.info(f"Creating new endpoint: {endpoint_name}")

                served_entity = ServedEntityInput(
                    entity_name=model_name,
                    entity_version=model_version,
                    workload_size=workload_size,
                    scale_to_zero_enabled=scale_to_zero,
                    environment_vars=environment_vars,
                )

                config = EndpointCoreConfigInput(
                    served_entities=[served_entity],
                    traffic_config=TrafficConfig(
                        routes=[
                            Route(
                                served_model_name=f"{model_name}-{model_version}",
                                traffic_percentage=100,
                            )
                        ]
                    ),
                )

                self.client.serving_endpoints.create(
                    name=endpoint_name,
                    config=config,
                )

                action = "created"

            # Record deployment in our table
            self._record_deployment(
                deployment_id=deployment_id,
                endpoint_name=endpoint_name,
                model_name=model_name,
                model_version=model_version,
                action=action,
                user=user,
            )

            return {
                "deployment_id": deployment_id,
                "endpoint_name": endpoint_name,
                "model_name": model_name,
                "model_version": model_version,
                "action": action,
                "status": "deploying",
                "message": f"Endpoint {action} successfully. Deployment in progress.",
            }

        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            raise ValueError(f"Deployment failed: {str(e)}")

    def _record_deployment(
        self,
        deployment_id: str,
        endpoint_name: str,
        model_name: str,
        model_version: str,
        action: str,
        user: str,
    ) -> None:
        """Record a deployment in the endpoints_registry table."""
        sql = f"""
        MERGE INTO endpoints_registry AS target
        USING (SELECT '{endpoint_name}' AS endpoint_name) AS source
        ON target.endpoint_name = source.endpoint_name
        WHEN MATCHED THEN UPDATE SET
            model_name = '{model_name}',
            model_version = '{model_version}',
            status = 'creating',
            updated_at = current_timestamp()
        WHEN NOT MATCHED THEN INSERT (
            id, name, endpoint_name, endpoint_type, model_name, model_version,
            status, created_at, updated_at, created_by
        ) VALUES (
            '{deployment_id}', '{endpoint_name}', '{endpoint_name}', 'model',
            '{model_name}', '{model_version}', 'creating',
            current_timestamp(), current_timestamp(), '{user}'
        )
        """
        try:
            self.sql.execute_update(sql)
        except Exception as e:
            logger.error(f"Failed to record deployment: {e}")

    def delete_endpoint(self, endpoint_name: str) -> dict[str, Any]:
        """
        Delete a serving endpoint.

        Args:
            endpoint_name: Name of the endpoint to delete

        Returns:
            Deletion result
        """
        try:
            self.client.serving_endpoints.delete(endpoint_name)

            # Update our registry
            sql = f"""
            UPDATE endpoints_registry
            SET status = 'stopped', updated_at = current_timestamp()
            WHERE endpoint_name = '{endpoint_name}'
            """
            self.sql.execute_update(sql)

            return {
                "endpoint_name": endpoint_name,
                "status": "deleted",
                "message": "Endpoint deleted successfully",
            }
        except Exception as e:
            logger.error(f"Failed to delete endpoint: {e}")
            raise ValueError(f"Failed to delete endpoint: {str(e)}")

    def query_endpoint(
        self,
        endpoint_name: str,
        inputs: dict[str, Any] | list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Query a serving endpoint (for playground functionality).

        Args:
            endpoint_name: Name of the endpoint
            inputs: Input data for the model

        Returns:
            Model predictions
        """
        try:
            # Use the query API
            response = self.client.serving_endpoints.query(
                name=endpoint_name,
                inputs=inputs if isinstance(inputs, list) else [inputs],
            )

            return {
                "predictions": response.predictions,
                "endpoint": endpoint_name,
            }
        except Exception as e:
            logger.error(f"Query failed: {e}")
            raise ValueError(f"Query failed: {str(e)}")


# Singleton
_deployment_service: DeploymentService | None = None


def get_deployment_service() -> DeploymentService:
    """Get or create deployment service singleton."""
    global _deployment_service
    if _deployment_service is None:
        _deployment_service = DeploymentService()
    return _deployment_service
