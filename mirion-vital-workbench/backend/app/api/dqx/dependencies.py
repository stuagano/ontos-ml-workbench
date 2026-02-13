"""DQX dependency injection — OBO auth, Spark Connect, DQEngine, DQGenerator.

Adapted from databricks_labs_dqx_app/backend/dependencies.py.
These dependencies use the X-Forwarded-Access-Token header injected by
Databricks Apps to create user-scoped sessions.
"""

import logging
import os
from contextlib import contextmanager
from typing import Annotated

from databricks.connect import DatabricksSession
from databricks.labs.dqx.config import LLMModelConfig
from databricks.labs.dqx.engine import DQEngine
from databricks.labs.dqx.profiler.generator import DQGenerator
from databricks.sdk import WorkspaceClient
from fastapi import Depends, Header, HTTPException, status
from pyspark.sql import SparkSession

logger = logging.getLogger("dqx")


@contextmanager
def _without_oauth_env_vars():
    """Temporarily remove OAuth env vars to avoid conflicts with OBO token auth."""
    oauth_vars = ["DATABRICKS_CLIENT_ID", "DATABRICKS_CLIENT_SECRET"]
    saved = {}
    for var in oauth_vars:
        if var in os.environ:
            saved[var] = os.environ.pop(var)
    try:
        yield
    finally:
        os.environ.update(saved)


def get_obo_ws(
    token: Annotated[str | None, Header(alias="X-Forwarded-Access-Token")] = None,
) -> WorkspaceClient:
    """WorkspaceClient using the caller's OBO token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (X-Forwarded-Access-Token missing).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return WorkspaceClient(token=token, auth_type="pat")


def get_spark(
    token: Annotated[str | None, Header(alias="X-Forwarded-Access-Token")] = None,
) -> SparkSession:
    """Spark Connect session on serverless compute with OBO auth."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (X-Forwarded-Access-Token missing).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    host = os.environ.get("DATABRICKS_HOST")
    if not host:
        return DatabricksSession.builder.token(token).getOrCreate()

    with _without_oauth_env_vars():
        session = (
            DatabricksSession.builder.host(host)
            .token(token)
            .serverless()
            .getOrCreate()
        )
    return session


def get_engine(
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    spark: Annotated[SparkSession, Depends(get_spark)],
) -> DQEngine:
    """DQEngine wired with OBO WorkspaceClient + Spark."""
    return DQEngine(workspace_client=obo_ws, spark=spark)


def get_generator(
    obo_ws: Annotated[WorkspaceClient, Depends(get_obo_ws)],
    spark: Annotated[SparkSession, Depends(get_spark)],
    token: Annotated[str | None, Header(alias="X-Forwarded-Access-Token")] = None,
) -> DQGenerator:
    """DQGenerator with OBO auth for AI-assisted rule generation."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (X-Forwarded-Access-Token missing).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    host = os.environ.get("DATABRICKS_HOST", "")
    llm_config = LLMModelConfig(api_key=token) if host else LLMModelConfig()
    return DQGenerator(workspace_client=obo_ws, spark=spark, llm_model_config=llm_config)
