"""DQX API router — proxies DQX endpoints at /api/dqx/*.

Re-exposes DQX's core endpoints (version, config, checks, AI generation)
through the Workbench FastAPI app so the DQX React UI can talk to them.
"""

import logging
from typing import Annotated, Any

import yaml
from databricks.labs.dqx.config import InstallationChecksStorageConfig, WorkspaceConfig, RunConfig
from databricks.labs.dqx.config_serializer import ConfigSerializer
from databricks.labs.dqx.engine import DQEngine
from databricks.labs.dqx.errors import InvalidCheckError, InvalidConfigError
from databricks.labs.dqx.profiler.generator import DQGenerator
from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound, ResourceDoesNotExist
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .dependencies import get_engine, get_generator, get_obo_ws

logger = logging.getLogger("dqx.router")

router = APIRouter(prefix="/api/dqx", tags=["dqx"])


# ---------------------------------------------------------------------------
# Pydantic models (mirroring DQX app models)
# ---------------------------------------------------------------------------

class VersionOut(BaseModel):
    version: str


class ConfigOut(BaseModel):
    config: WorkspaceConfig


class ConfigIn(BaseModel):
    config: WorkspaceConfig


class RunConfigOut(BaseModel):
    config: RunConfig


class RunConfigIn(BaseModel):
    config: RunConfig


class ChecksOut(BaseModel):
    checks: list[dict[str, Any]]


class ChecksIn(BaseModel):
    checks: list[dict[str, Any]]


class InstallationSettings(BaseModel):
    install_folder: str = Field(description="Path to folder containing config.yml")


class GenerateChecksIn(BaseModel):
    user_input: str = Field(description="Natural language description of quality requirements")


class GenerateChecksOut(BaseModel):
    yaml_output: str = Field(description="Generated checks in YAML format")
    checks: list[dict[str, Any]] = Field(description="Generated checks as list of dicts")


# ---------------------------------------------------------------------------
# Settings manager (simplified inline — DQX uses workspace-level settings)
# ---------------------------------------------------------------------------

_DEFAULT_INSTALL_FOLDER = "/Workspace/Users/dqx"


def _get_install_folder(ws: WorkspaceClient, path: str | None) -> str:
    if path:
        return path.strip()
    # Fall back to default
    try:
        user = ws.current_user.me()
        return f"/Workspace/Users/{user.user_name}/dqx"
    except Exception:
        return _DEFAULT_INSTALL_FOLDER


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/version", response_model=VersionOut)
async def version():
    try:
        from databricks.labs.dqx import __version__ as dqx_version
    except ImportError:
        dqx_version = "unknown"
    return VersionOut(version=dqx_version)


@router.get("/current-user")
def current_user(obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)]):
    user = obo_ws.current_user.me()
    return {"user_name": user.user_name, "display_name": user.display_name}


@router.get("/settings", response_model=InstallationSettings)
def get_settings(obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)]):
    folder = _get_install_folder(obo_ws, None)
    return InstallationSettings(install_folder=folder)


@router.post("/settings", response_model=InstallationSettings)
def save_settings(
    settings: InstallationSettings,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
):
    # Validate the path exists or can be created
    return settings


@router.get("/config", response_model=ConfigOut)
def get_config(
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    try:
        config = serializer.load_config(install_folder=install_folder)
        return ConfigOut(config=config)
    except ResourceDoesNotExist:
        raise HTTPException(status_code=404, detail=f"Configuration not found at {install_folder}")


@router.post("/config", response_model=ConfigOut)
def save_config(
    body: ConfigIn,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    serializer.save_config(body.config, install_folder=install_folder)
    return ConfigOut(config=serializer.load_config(install_folder=install_folder))


@router.get("/config/run/{name}", response_model=RunConfigOut)
def get_run_config(
    name: str,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    try:
        return RunConfigOut(config=serializer.load_run_config(run_config_name=name, install_folder=install_folder))
    except (ResourceDoesNotExist, InvalidConfigError):
        raise HTTPException(status_code=404, detail=f"Run config '{name}' not found")


@router.post("/config/run", response_model=RunConfigOut)
def save_run_config(
    body: RunConfigIn,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    serializer.save_run_config(body.config, install_folder=install_folder)
    return RunConfigOut(
        config=serializer.load_run_config(run_config_name=body.config.name, install_folder=install_folder)
    )


@router.delete("/config/run/{name}", response_model=ConfigOut)
def delete_run_config(
    name: str,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    try:
        config = serializer.load_config(install_folder=install_folder)
    except (ResourceDoesNotExist, InvalidConfigError):
        raise HTTPException(status_code=404, detail=f"Configuration not found at {install_folder}")

    original_count = len(config.run_configs)
    config.run_configs = [rc for rc in config.run_configs if rc.name != name]
    if len(config.run_configs) == original_count:
        raise HTTPException(status_code=404, detail=f"Run config '{name}' not found")

    serializer.save_config(config, install_folder=install_folder)
    return ConfigOut(config=config)


@router.get("/config/run/{name}/checks", response_model=ChecksOut)
def get_run_checks(
    name: str,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    engine: Annotated[DQEngine, Depends(get_engine)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    try:
        run_config = serializer.load_run_config(run_config_name=name, install_folder=install_folder)
    except (ResourceDoesNotExist, InvalidConfigError):
        raise HTTPException(status_code=404, detail=f"Run config '{name}' not found")

    checks_config = InstallationChecksStorageConfig(run_config_name=run_config.name, install_folder=install_folder)
    try:
        checks = engine.load_checks(checks_config)
        return ChecksOut(checks=checks)
    except (NotFound, FileNotFoundError):
        return ChecksOut(checks=[])
    except InvalidCheckError as e:
        raise HTTPException(status_code=400, detail=f"Invalid checks format: {e}")


@router.post("/config/run/{name}/checks", response_model=ChecksOut)
def save_run_checks(
    name: str,
    body: ChecksIn,
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    engine: Annotated[DQEngine, Depends(get_engine)],
    path: str | None = Query(None),
):
    install_folder = _get_install_folder(obo_ws, path)
    serializer = ConfigSerializer(obo_ws)
    try:
        run_config = serializer.load_run_config(run_config_name=name, install_folder=install_folder)
    except (ResourceDoesNotExist, InvalidConfigError):
        raise HTTPException(status_code=404, detail=f"Run config '{name}' not found")

    checks_config = InstallationChecksStorageConfig(run_config_name=run_config.name, install_folder=install_folder)
    engine.save_checks(body.checks, checks_config)
    return ChecksOut(checks=body.checks)


@router.post("/ai-generate-checks", response_model=GenerateChecksOut)
def ai_generate_checks(
    body: GenerateChecksIn,
    generator: Annotated[DQGenerator, Depends(get_generator)],
):
    """Generate data quality checks from natural language using AI."""
    try:
        checks = generator.generate_dq_rules_ai_assisted(user_input=body.user_input)
        yaml_output = yaml.dump(checks, default_flow_style=False, sort_keys=False)
        return GenerateChecksOut(yaml_output=yaml_output, checks=checks)
    except Exception as e:
        logger.error(f"Failed to generate checks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate checks: {e}")
